const WebSocket = require('ws');

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '127.0.0.1';
const GOOD_TOKEN = process.env.WS_TOKEN || 'test-token';
const BAD_TOKEN = process.env.BAD_WS_TOKEN || 'bad-token';
const TURN_TEXT = process.env.TEST_TURN_TEXT || 'Reply with exactly: SELF_TEST_OK';
const CONNECT_TIMEOUT_MS = 10000;
const STEP_TIMEOUT_MS = 120000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForOpen(ws, timeoutMs = CONNECT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('websocket open timeout'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      ws.off('open', onOpen);
      ws.off('error', onError);
    }

    function onOpen() {
      cleanup();
      resolve();
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    ws.once('open', onOpen);
    ws.once('error', onError);
  });
}

function waitForClose(ws, timeoutMs = CONNECT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('websocket close timeout'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      ws.off('close', onClose);
      ws.off('error', onError);
    }

    function onClose(code, reasonBuffer) {
      cleanup();
      resolve({
        code,
        reason: reasonBuffer.toString(),
      });
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    ws.once('close', onClose);
    ws.once('error', onError);
  });
}

function createClient(token, name) {
  const url = new URL(`ws://${HOST}:${PORT}/ws`);
  if (token) {
    url.searchParams.set('token', token);
  }

  const ws = new WebSocket(url);
  const inbox = [];
  const tabsByThread = new Map();
  const waiters = [];

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString('utf8'));
    console.log(`[${name}] <= ${message.type}`, JSON.stringify(message));
    if (message.type === 'state') {
      tabsByThread.clear();
      for (const tab of message.tabs || []) {
        if (tab?.threadId) {
          tabsByThread.set(tab.threadId, tab);
        }
      }
    }
    if (message.type === 'tab_updated' && message.tab?.threadId) {
      tabsByThread.set(message.tab.threadId, message.tab);
    }
    if (message.type === 'tab_removed' && message.threadId) {
      tabsByThread.delete(message.threadId);
    }
    inbox.push(message);
    flush();
  });

  function flush() {
    for (let index = 0; index < waiters.length; index += 1) {
      const waiter = waiters[index];
      const matchIndex = inbox.findIndex(waiter.predicate);
      if (matchIndex === -1) {
        continue;
      }
      const [message] = inbox.splice(matchIndex, 1);
      waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      index -= 1;
    }
  }

  return {
    ws,
    send(payload) {
      console.log(`[${name}] => ${payload.type}`, JSON.stringify(payload));
      ws.send(JSON.stringify(payload));
    },
    async open() {
      await waitForOpen(ws);
    },
    async close() {
      if (ws.readyState === WebSocket.CLOSED) {
        return { code: 1000, reason: '' };
      }
      const closePromise = waitForClose(ws);
      ws.close(1000, 'self-test done');
      return closePromise;
    },
    async waitFor(predicate, description, timeoutMs = STEP_TIMEOUT_MS) {
      const matchIndex = inbox.findIndex(predicate);
      if (matchIndex !== -1) {
        const [message] = inbox.splice(matchIndex, 1);
        return message;
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const pendingTypes = inbox.map((message) => message.type).join(', ');
          this.removeWaiter(waiter);
          reject(new Error(`timeout waiting for ${description}; inbox=[${pendingTypes}]`));
        }, timeoutMs);

        const waiter = { predicate, resolve, reject, timer };
        waiters.push(waiter);
      });
    },
    removeWaiter(waiter) {
      const index = waiters.indexOf(waiter);
      if (index >= 0) {
        waiters.splice(index, 1);
      }
    },
    async waitForType(type, timeoutMs = STEP_TIMEOUT_MS) {
      return this.waitFor((message) => message.type === type, `message type ${type}`, timeoutMs);
    },
    async waitForThreadSync(threadId, timeoutMs = STEP_TIMEOUT_MS) {
      return this.waitFor(
        (message) => message.type === 'thread_sync' && message.threadId === threadId,
        `thread_sync for ${threadId}`,
        timeoutMs,
      );
    },
    async waitForTabUpdated(threadId, predicate = () => true, timeoutMs = STEP_TIMEOUT_MS) {
      return this.waitFor(
        (message) => message.type === 'tab_updated'
          && message.tab?.threadId === threadId
          && predicate(message.tab),
        `tab_updated for ${threadId}`,
        timeoutMs,
      );
    },
    async waitForTurnLifecycle(threadId, timeoutMs = STEP_TIMEOUT_MS) {
      const started = await this.waitFor(
        (message) => message.type === 'turn_started' && message.threadId === threadId,
        `turn_started for ${threadId}`,
        timeoutMs,
      );
      const completed = await this.waitFor(
        (message) => message.type === 'turn_completed' && message.threadId === threadId,
        `turn_completed for ${threadId}`,
        timeoutMs,
      );
      return { started, completed };
    },
    getTab(threadId) {
      return tabsByThread.get(threadId) || null;
    },
  };
}

async function expectAuthFailure() {
  const client = createClient(BAD_TOKEN, 'auth-fail');
  await client.open();
  const errorMessage = await client.waitFor(
    (message) => message.type === 'error' && message.code === 'AUTH_FAILED',
    'AUTH_FAILED error',
  );
  const closeEvent = await waitForClose(client.ws);
  if (closeEvent.code !== 4401) {
    throw new Error(`expected close code 4401, got ${closeEvent.code}`);
  }
  console.log('[auth-fail] close ok', JSON.stringify(closeEvent));
  return errorMessage;
}

async function runMainFlow() {
  const client = createClient(GOOD_TOKEN, 'main');
  await client.open();

  const state = await client.waitForType('state');
  console.log('[main] initial tabs', state.tabs?.length || 0);

  client.send({ type: 'tab_create', name: `Self Test ${Date.now()}` });
  const created = await client.waitForType('tab_created');
  const threadId = created.threadId;
  if (!threadId) {
    throw new Error('tab_created missing threadId');
  }

  await client.waitForTabUpdated(threadId);
  client.send({ type: 'thread_sync', threadId });
  const synced = await client.waitForThreadSync(threadId);
  console.log('[main] synced turns', synced.turns?.length || 0);

  const lifecyclePromise = client.waitForTurnLifecycle(threadId);
  client.send({
    type: 'turn_send',
    threadId,
    text: TURN_TEXT,
    clientMessageId: `self-test-${Date.now()}`,
  });

  const { completed } = await lifecyclePromise;
  if (completed.status && !['completed', 'succeeded', 'success'].includes(String(completed.status).toLowerCase())) {
    throw new Error(`turn did not complete successfully: ${JSON.stringify(completed)}`);
  }
  const latestTab = client.getTab(threadId);
  if (!latestTab) {
    throw new Error(`missing tab state for ${threadId} after turn completion`);
  }
  if (latestTab.status !== 'idle') {
    throw new Error(`expected tab status idle after turn completion, got ${latestTab.status}`);
  }

  await delay(1000);
  client.send({ type: 'thread_sync', threadId });
  const finalSync = await client.waitForThreadSync(threadId);
  const allText = [];
  for (const turn of finalSync.turns || []) {
    for (const item of turn.items || []) {
      if (item.type === 'agentMessage' && item.text) {
        allText.push(item.text);
      }
    }
  }
  if (!allText.some((text) => text.includes('SELF_TEST_OK'))) {
    throw new Error(`expected SELF_TEST_OK in agent messages, got: ${JSON.stringify(allText.slice(-5))}`);
  }

  client.send({ type: 'tab_close', threadId });
  await client.waitForTabUpdated(threadId, (tab) => tab.status === 'closed');
  const closeEvent = await client.close();
  console.log('[main] close ok', JSON.stringify(closeEvent));
}

async function main() {
  console.log(`Self test target: ws://${HOST}:${PORT}/ws`);
  await expectAuthFailure();
  await runMainFlow();
  console.log('SELF_TEST_PASSED');
}

main().catch((error) => {
  console.error('SELF_TEST_FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
