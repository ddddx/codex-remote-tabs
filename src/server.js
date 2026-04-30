const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { CodexAppServerClient } = require('./codexAppServerClient');
const { CodexWindowManager } = require('./windowManager');

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const codex = new CodexAppServerClient({
  cwd: process.cwd(),
  codexHome: process.env.CODEX_HOME || path.join(process.cwd(), '.codex-home'),
});
const windows = new CodexWindowManager({});

const tabs = new Map();

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function ensureTab(thread) {
  const existing = tabs.get(thread.id);
  const tab = {
    threadId: thread.id,
    name: thread.name || existing?.name || (thread.preview ? thread.preview.substring(0, 20) + (thread.preview.length > 20 ? '...' : '') : 'New Tab'),
    status: (typeof thread.status === 'object' ? thread.status?.type : thread.status) || existing?.status || 'idle',
    createdAt: thread.createdAt || existing?.createdAt || nowUnix(),
    updatedAt: thread.updatedAt || existing?.updatedAt || nowUnix(),
    windowPid: windows.getPid(thread.id),
  };
  tabs.set(thread.id, tab);
  return tab;
}

function removeTab(threadId) {
  tabs.delete(threadId);
}

function tabsList() {
  return Array.from(tabs.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(payload) {
  for (const client of wss.clients) {
    send(client, payload);
  }
}

codex.on('notification', (msg) => {
  const method = msg.method;
  const params = msg.params || {};
  console.log(`[notification] ${method}`, JSON.stringify(params).substring(0, 200));

  if (method === 'thread/started' && params.thread) {
    const tab = ensureTab(params.thread);
    broadcast({ type: 'tab_updated', tab });
    return;
  }

  if (method === 'thread/status/changed') {
    const tab = tabs.get(params.threadId);
    if (tab) {
      tab.status = (typeof params.status === 'object' ? params.status?.type : params.status) || tab.status;
      tab.updatedAt = nowUnix();
      broadcast({ type: 'tab_updated', tab });
    }
    return;
  }

  if (method === 'thread/name/updated') {
    const tab = tabs.get(params.threadId);
    if (tab) {
      tab.name = params.threadName || tab.name;
      tab.updatedAt = nowUnix();
      broadcast({ type: 'tab_updated', tab });
    }
    return;
  }

  if (method === 'thread/closed') {
    const tab = tabs.get(params.threadId);
    if (tab) {
      tab.status = 'closed';
      tab.updatedAt = nowUnix();
      broadcast({ type: 'tab_updated', tab });
    }
    return;
  }

  if (method === 'turn/started') {
    const tab = tabs.get(params.threadId);
    if (tab) {
      tab.status = 'running';
      tab.updatedAt = nowUnix();
      broadcast({ type: 'tab_updated', tab });
    }
    broadcast({ type: 'turn_started', threadId: params.threadId, turnId: params.turn?.id || null });
    return;
  }

  if (method === 'item/agentMessage/delta') {
    broadcast({
      type: 'agent_delta',
      threadId: params.threadId,
      turnId: params.turnId,
      itemId: params.itemId,
      delta: params.delta,
    });
    return;
  }

  if (method === 'item/completed' && params.item?.type === 'agentMessage') {
    broadcast({
      type: 'agent_message',
      threadId: params.threadId,
      turnId: params.turnId,
      itemId: params.item.id,
      text: params.item.text,
      phase: params.item.phase,
    });
    return;
  }

  if (method === 'turn/completed') {
    const tab = tabs.get(params.threadId);
    if (tab) {
      tab.status = (typeof params.turn?.status === 'object' ? params.turn?.status?.type : params.turn?.status) || 'idle';
      tab.updatedAt = nowUnix();
      broadcast({ type: 'tab_updated', tab });
    }

    broadcast({
      type: 'turn_completed',
      threadId: params.threadId,
      turnId: params.turn?.id || null,
      status: params.turn?.status || 'unknown',
      error: params.turn?.error || null,
    });
  }
});

codex.on('log', (line) => {
  if (!line) {
    return;
  }
  console.log(`[codex] ${line}`);
});

codex.on('exit', ({ code, signal }) => {
  broadcast({ type: 'backend_error', message: `codex app-server exited (code=${code}, signal=${signal})` });
});

wss.on('connection', (ws) => {
  send(ws, { type: 'state', tabs: tabsList() });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: 'error', message: 'invalid json' });
      return;
    }

    try {
      if (msg.type === 'tab_create') {
        const thread = await codex.startThread({ name: msg.name || null });
        const tab = ensureTab(thread);

        try {
          const pid = await windows.openWindow(thread.id);
          tab.windowPid = pid;
        } catch (error) {
          send(ws, {
            type: 'warning',
            message: `thread created but local codex window failed: ${error.message}`,
            threadId: thread.id,
          });
        }

        broadcast({ type: 'tab_updated', tab });
        return;
      }

      if (msg.type === 'tab_close') {
        if (!msg.threadId) {
          throw new Error('threadId required');
        }

        await windows.closeWindow(msg.threadId);
        await codex.archiveThread(msg.threadId);
        removeTab(msg.threadId);
        broadcast({ type: 'tab_removed', threadId: msg.threadId });
        return;
      }

      if (msg.type === 'turn_send') {
        if (!msg.threadId || !msg.text) {
          throw new Error('threadId and text required');
        }

        try {
          await codex.startTurn(msg.threadId, msg.text);
        } catch (err) {
          send(ws, { type: 'error', message: `发送失败: ${err.message}` });
        }
        return;
      }

      if (msg.type === 'thread_sync') {
        const thread = await codex.readThread(msg.threadId);
        send(ws, { type: 'thread_sync', threadId: msg.threadId, turns: thread.turns || [] });
        return;
      }

      send(ws, { type: 'error', message: `unknown message type: ${msg.type}` });
    } catch (error) {
      send(ws, { type: 'error', message: error.message });
    }
  });
});

async function bootstrap() {
  await codex.start();
  const threadList = await codex.listThreads(10);
  for (const thread of threadList) {
    // Skip closed/archived threads
    const st = typeof thread.status === 'object' ? thread.status?.type : thread.status;
    if (st === 'closed' || st === 'archived' || st === 'failed') continue;
    // Validate thread exists by trying to read it
    try {
      await codex.readThread(thread.id);
      ensureTab(thread);
    } catch (err) {
      // Thread not accessible, skip it
      console.log(`Skipping inaccessible thread: ${thread.id}`);
    }
  }

  server.listen(PORT, () => {
    console.log(`Web control ready: http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
