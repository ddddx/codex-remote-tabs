import type { ClientMessage } from '@codex-remote/protocol';
import type { FastifyInstance } from 'fastify';
import { broadcastMessage, ensureCodexReady } from '../../ws/bridge.js';
import { bootstrapTabs } from './thread-sync.js';
import { upsertRuntimeTab } from './session-tabs.js';

type TurnSendMessage = Extract<ClientMessage, { type: 'turn_send' }>;

export type TurnService = ReturnType<typeof createTurnService>;

export function createTurnService(app: FastifyInstance) {
  return {
    async startTurn(message: TurnSendMessage): Promise<void> {
      await ensureCodexReady(app);
      await app.codexClient.startTurn(message.threadId, message.text, {
        attachments: message.attachments,
        model: message.model || null,
        effort: message.effort || null,
        approvalPolicy: message.approvalPolicy || null,
        sandboxPolicy: message.sandboxMode ? { mode: message.sandboxMode } : null,
      });

      const current = app.runtimeState.tabsById.get(message.threadId);
      if (current) {
        const tab = upsertRuntimeTab(app, {
          ...current,
          status: 'running',
          updatedAt: Math.floor(Date.now() / 1000),
          approvalPolicy: message.approvalPolicy || current.approvalPolicy || '',
          sandboxMode: message.sandboxMode || current.sandboxMode || '',
        });
        broadcastMessage(app, { type: 'tab_updated', tab });
        return;
      }

      await bootstrapTabs(app);
    },
  };
}
