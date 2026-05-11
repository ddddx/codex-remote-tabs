import type { FastifyInstance } from 'fastify';
import type { ClientMessage, ServerMessage } from '@codex-remote/protocol';
import { ensureCodexReady } from './bridge.js';

type WsLike = {
  send: (payload: string) => void;
};

function sendMessage(socket: WsLike, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

export async function routeClientMessage(app: FastifyInstance, socket: WsLike, message: ClientMessage): Promise<void> {
  await ensureCodexReady(app);

  if (message.type === 'tab_create') {
    const tab = await app.services.sessions.createTab(message);
    sendMessage(socket, { type: 'tab_created', threadId: tab.threadId, tab });
    return;
  }

  if (message.type === 'turn_send') {
    await app.services.turns.startTurn(message);
    return;
  }

  if (message.type === 'thread_sync') {
    const { tab, message: snapshot } = await app.services.sessions.syncThread(message.threadId);
    sendMessage(socket, { type: 'tab_updated', tab });
    sendMessage(socket, snapshot);
    return;
  }

  if (message.type === 'server_request_respond') {
    const errorMessage = app.services.approvals.respond(message);
    if (errorMessage) {
      sendMessage(socket, errorMessage);
    }
    return;
  }

  sendMessage(socket, {
    type: 'error',
    message: `Unsupported message type in scaffold: ${message.type}`,
  });
}
