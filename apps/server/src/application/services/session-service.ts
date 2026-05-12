import type { ClientMessage, ServerMessage } from '@codex-remote/protocol';
import type { FastifyInstance } from 'fastify';
import { broadcastMessage, ensureCodexReady } from '../../ws/bridge.js';
import { buildThreadSyncMessage, bootstrapTabs } from './thread-sync.js';
import { upsertRuntimeTab, type RuntimeTab } from './session-tabs.js';

type CreateTabMessage = Extract<ClientMessage, { type: 'tab_create' }>;

export type SessionService = ReturnType<typeof createSessionService>;

export function createSessionService(app: FastifyInstance) {
  return {
    async createTab(message: CreateTabMessage): Promise<RuntimeTab> {
      await ensureCodexReady(app);
      const workspacePath = app.workspaceManager.resolveWorkspacePath(message.cwd);
      const thread = await app.codexClient.startThread({
        name: message.name || null,
        cwd: workspacePath,
        model: message.model || null,
        approvalPolicy: message.approvalPolicy || null,
        sandbox: message.sandboxMode || null,
      });
      const tab = upsertRuntimeTab(app, {
        ...thread,
        cwd: typeof thread.cwd === 'string' ? thread.cwd : workspacePath,
        approvalPolicy: message.approvalPolicy || '',
        sandboxMode: message.sandboxMode || '',
      });
      const attachedTab = await app.windowAttachments.openWindowForThread(tab.threadId) as RuntimeTab | null;
      const nextTab = attachedTab || tab;
      broadcastMessage(app, { type: 'tab_updated', tab: nextTab });
      return nextTab;
    },

    async syncThread(threadId: string): Promise<{
      tab: RuntimeTab;
      message: Extract<ServerMessage, { type: 'thread_sync' }>;
    }> {
      await ensureCodexReady(app);
      const thread = await app.codexClient.resumeThread(threadId);
      const tab = upsertRuntimeTab(app, thread);
      const refreshedTab = await app.windowAttachments.refreshTabWindowStatus(threadId, {
        allowDiscovery: true,
        allowLaunch: true,
        broadcastUpdate: false,
        touchUpdatedAt: false,
      }) as RuntimeTab | null;
      const nextTab = refreshedTab || tab;
      return {
        tab: nextTab,
        message: buildThreadSyncMessage(app, threadId, thread),
      };
    },

    async refreshTabsAfterActivity(): Promise<void> {
      await ensureCodexReady(app);
      await bootstrapTabs(app);
    },
  };
}
