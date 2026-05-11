import type {
  AppStateRecord,
  PendingRequestRecord,
  SessionRecord,
  ThreadPreferenceRecord,
  UploadRecord,
  WindowBindingRecord,
} from './entities.js';

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function createSessionRecord(input: Partial<SessionRecord> & Pick<SessionRecord, 'threadId'>): SessionRecord {
  const timestamp = input.updatedAt ?? nowUnix();
  return {
    threadId: input.threadId,
    name: input.name || '未命名会话',
    cwd: input.cwd || '',
    status: input.status || 'idle',
    windowStatus: input.windowStatus || 'detached',
    approvalPolicy: input.approvalPolicy || '',
    sandboxMode: input.sandboxMode || '',
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function createPendingRequestRecord(
  input: Partial<PendingRequestRecord> & Pick<PendingRequestRecord, 'requestId' | 'kind' | 'method' | 'payloadJson'>,
): PendingRequestRecord {
  return {
    requestId: input.requestId,
    threadId: input.threadId ?? null,
    turnId: input.turnId ?? null,
    itemId: input.itemId ?? null,
    kind: input.kind,
    method: input.method,
    status: input.status || 'pending',
    payloadJson: input.payloadJson,
    createdAt: input.createdAt ?? Date.now(),
    submittedAt: input.submittedAt ?? null,
  };
}

export function createThreadPreferenceRecord(
  input: Partial<ThreadPreferenceRecord> & Pick<ThreadPreferenceRecord, 'threadId'>,
): ThreadPreferenceRecord {
  return {
    threadId: input.threadId,
    approvalPolicy: input.approvalPolicy || '',
    sandboxMode: input.sandboxMode || '',
    model: input.model || '',
    reasoningEffort: input.reasoningEffort || '',
  };
}

export function createUploadRecord(input: UploadRecord): UploadRecord {
  return {
    ...input,
    createdAt: input.createdAt || Date.now(),
  };
}

export function createWindowBindingRecord(input: Partial<WindowBindingRecord> & Pick<WindowBindingRecord, 'threadId'>): WindowBindingRecord {
  return {
    threadId: input.threadId,
    pid: input.pid ?? null,
    commandLine: input.commandLine || '',
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

export function createAppStateRecord(key: string, valueJson: string): AppStateRecord {
  return {
    key,
    valueJson,
    updatedAt: Date.now(),
  };
}
