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
  };
}
