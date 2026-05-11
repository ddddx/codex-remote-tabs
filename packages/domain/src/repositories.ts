import type {
  AppStateRecord,
  PendingRequestRecord,
  SessionRecord,
  ThreadPreferenceRecord,
  UploadRecord,
  WindowBindingRecord,
} from './entities.js';

export interface SessionRepository {
  listSessions(): SessionRecord[];
  getSession(threadId: string): SessionRecord | null;
  upsertSession(record: SessionRecord): void;
  removeSession(threadId: string): void;
}

export interface PendingRequestRepository {
  listPendingRequests(): PendingRequestRecord[];
  getPendingRequest(requestId: string): PendingRequestRecord | null;
  upsertPendingRequest(record: PendingRequestRecord): void;
  removePendingRequest(requestId: string): void;
}

export interface ThreadPreferenceRepository {
  getThreadPreference(threadId: string): ThreadPreferenceRecord | null;
  upsertThreadPreference(record: ThreadPreferenceRecord): void;
}

export interface UploadRepository {
  listUploads(): UploadRecord[];
  upsertUpload(record: UploadRecord): void;
}

export interface WindowBindingRepository {
  listWindowBindings(): WindowBindingRecord[];
  upsertWindowBinding(record: WindowBindingRecord): void;
}

export interface AppStateRepository {
  getAppState(key: string): AppStateRecord | null;
  setAppState(record: AppStateRecord): void;
}
