import type { ClientMessage, ServerMessage } from '@codex-remote/protocol';

type WsLike = {
  send: (payload: string) => void;
};

function sendMessage(socket: WsLike, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

export async function routeClientMessage(socket: WsLike, message: ClientMessage): Promise<void> {
  if (message.type === 'thread_sync') {
    sendMessage(socket, {
      type: 'thread_sync',
      threadId: message.threadId,
      turns: [],
      supplementalItems: [],
      globalSupplementalItems: [],
      tokenUsage: null,
      turnPlans: [],
      turnDiffs: [],
    });
    return;
  }

  sendMessage(socket, {
    type: 'error',
    message: `Unsupported message type in scaffold: ${message.type}`,
  });
}
