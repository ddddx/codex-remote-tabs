import type { ClientMessage, ServerMessage } from '@codex-remote/protocol';
import type { FastifyInstance } from 'fastify';
import { resetServerRequestPending, setServerRequestSubmitting } from '../../ws/bridge.js';

type ServerRequestRespondMessage = Extract<ClientMessage, { type: 'server_request_respond' }>;

export type ApprovalService = ReturnType<typeof createApprovalService>;

export function createApprovalService(app: FastifyInstance) {
  return {
    respond(message: ServerRequestRespondMessage): Extract<ServerMessage, { type: 'error' }> | null {
      const request = app.runtimeState.serverRequestsById.get(message.requestId);
      if (!request) {
        return {
          type: 'error',
          code: 'REQUEST_NOT_FOUND',
          message: '待处理请求不存在或已失效。',
        };
      }

      setServerRequestSubmitting(app, message.requestId);
      try {
        app.codexClient.respond(request.rawRequestId, message.response);
        return null;
      } catch (error) {
        resetServerRequestPending(app, message.requestId);
        return {
          type: 'error',
          threadId: request.threadId || undefined,
          message: error instanceof Error ? error.message : '批准响应发送失败',
        };
      }
    },
  };
}
