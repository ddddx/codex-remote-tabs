type RuntimeTab = {
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

type ServerRequestRecord = {
  requestId: string;
  rawRequestId: string | number;
  method: string;
  kind: string;
  status: 'pending' | 'submitting';
  createdAt: number;
  submittedAt?: number | null;
  threadId?: string | null;
  turnId?: string | null;
  itemId?: string | null;
  reason?: string;
  command?: string;
  cwd?: string;
  patch?: string;
  changes?: unknown[];
  permissions?: unknown;
  questions?: unknown[];
  responseSchema?: unknown;
  raw?: Record<string, unknown>;
};

type RuntimeRepositories = {
  sessions: {
    listSessions: () => RuntimeTab[];
    getSession: (threadId: string) => RuntimeTab | null;
    upsertSession: (record: RuntimeTab) => void;
    removeSession: (threadId: string) => void;
  };
  pendingRequests: {
    listPendingRequests: () => ServerRequestRecord[];
    getPendingRequest: (requestId: string) => ServerRequestRecord | null;
    upsertPendingRequest: (record: ServerRequestRecord & { payloadJson?: string }) => void;
    removePendingRequest: (requestId: string) => void;
  };
  threadPreferences: {
    getThreadPreference: (threadId: string) => {
      threadId: string;
      approvalPolicy: string;
      sandboxMode: string;
      model: string;
      reasoningEffort: string;
    } | null;
    upsertThreadPreference: (record: {
      threadId: string;
      approvalPolicy: string;
      sandboxMode: string;
      model: string;
      reasoningEffort: string;
    }) => void;
  };
  uploads: {
    listUploads: () => Array<{
      id: string;
      savedName: string;
      originalName: string;
      contentType: string;
      filePath: string;
      createdAt: number;
    }>;
    upsertUpload: (record: {
      id: string;
      savedName: string;
      originalName: string;
      contentType: string;
      filePath: string;
      createdAt: number;
    }) => void;
  };
  windowBindings: {
    listWindowBindings: () => Array<{
      threadId: string;
      pid: number | null;
      commandLine: string;
      updatedAt: number;
    }>;
    upsertWindowBinding: (record: {
      threadId: string;
      pid: number | null;
      commandLine: string;
      updatedAt: number;
    }) => void;
  };
  appState: {
    getAppState: (key: string) => {
      key: string;
      valueJson: string;
      updatedAt: number;
    } | null;
    setAppState: (record: {
      key: string;
      valueJson: string;
      updatedAt: number;
    }) => void;
  };
};

export type RuntimeWsClient = {
  send: (payload: string) => void;
  close: (code?: number, reason?: string) => void;
};

export type RuntimeState = {
  startedAt: number;
  websocketClientCount: number;
  isShuttingDown: boolean;
  codexStarted: boolean;
  codexBridgeRegistered: boolean;
  clients: Set<RuntimeWsClient>;
  tabsById: Map<string, RuntimeTab>;
  serverRequestsById: Map<string, ServerRequestRecord>;
  repositories: RuntimeRepositories | null;
};

export function createRuntimeState(): RuntimeState {
  return {
    startedAt: Date.now(),
    websocketClientCount: 0,
    isShuttingDown: false,
    codexStarted: false,
    codexBridgeRegistered: false,
    clients: new Set(),
    tabsById: new Map(),
    serverRequestsById: new Map(),
    repositories: null,
  };
}
