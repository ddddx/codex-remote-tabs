import { createSessionRecord, createThreadPreferenceRecord } from '@codex-remote/domain';
import type { FastifyInstance } from 'fastify';

export type RuntimeTab = {
  threadId: string;
  name: string;
  cwd: string;
  status: string;
  updatedAt: number;
  createdAt: number;
  windowStatus: string;
  approvalPolicy?: string;
  sandboxMode?: string;
};

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function normalizeTab(source: Record<string, unknown>): RuntimeTab {
  return {
    threadId: String(source.threadId || source.id || ''),
    name: typeof source.name === 'string' && source.name.trim() ? source.name : '未命名会话',
    cwd: typeof source.cwd === 'string' ? source.cwd : '',
    status: typeof source.status === 'string' && source.status.trim() ? source.status : 'idle',
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : nowUnix(),
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : nowUnix(),
    windowStatus: typeof source.windowStatus === 'string' && source.windowStatus.trim() ? source.windowStatus : 'detached',
    approvalPolicy: typeof source.approvalPolicy === 'string' ? source.approvalPolicy : '',
    sandboxMode: typeof source.sandboxMode === 'string' ? source.sandboxMode : '',
  };
}

export function upsertRuntimeTab(app: FastifyInstance, source: Record<string, unknown>): RuntimeTab {
  const normalized = normalizeTab(source);
  const existing = app.runtimeState.tabsById.get(normalized.threadId);
  const merged = existing ? { ...existing, ...normalized } : normalized;
  app.runtimeState.tabsById.set(merged.threadId, merged);
  app.repositories.sessions.upsertSession(createSessionRecord({
    threadId: merged.threadId,
    name: merged.name,
    cwd: merged.cwd,
    status: merged.status,
    windowStatus: merged.windowStatus,
    approvalPolicy: merged.approvalPolicy || '',
    sandboxMode: merged.sandboxMode || '',
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
  }));
  if (merged.approvalPolicy || merged.sandboxMode) {
    app.repositories.threadPreferences.upsertThreadPreference(createThreadPreferenceRecord({
      threadId: merged.threadId,
      approvalPolicy: merged.approvalPolicy || '',
      sandboxMode: merged.sandboxMode || '',
    }));
  }
  return merged;
}

export function listRuntimeTabs(app: FastifyInstance): RuntimeTab[] {
  return Array.from(app.runtimeState.tabsById.values()).sort((left, right) => {
    const updatedDiff = right.updatedAt - left.updatedAt;
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return left.threadId.localeCompare(right.threadId);
  });
}
