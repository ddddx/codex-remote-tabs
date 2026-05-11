import { create } from 'zustand';
import type {
  HealthResponse,
  ServerMessage,
  UploadImageResponse,
  WorkspaceListResponse,
  WorkspaceShortcutsResponse,
} from '@codex-remote/protocol';
import type { ConnectionStatus } from '../transport/ws/createSocketClient.js';

export type SessionItem = {
  threadId: string;
  name: string;
  cwd?: string;
  status?: string;
  windowStatus?: string;
};

export type TimelineEntry = {
  id: string;
  type: string;
  role?: string;
  turnId?: string;
  itemId?: string;
  title?: string;
  text?: string;
  status?: string;
  meta?: string[];
  patch?: string;
  changes?: Array<{ path?: string; kind?: string }>;
  createdAt?: number;
  details?: unknown;
};

export type ServerRequestItem = {
  requestId: string;
  threadId?: string;
  turnId?: string;
  itemId?: string;
  kind?: string;
  status?: 'pending' | 'submitting';
  reason?: string;
  message?: string;
  command?: string;
  cwd?: string;
  tool?: string;
  namespace?: string;
  serverName?: string;
  patch?: string;
  questions?: Array<{
    id?: string;
    question?: string;
    header?: string;
    isOther?: boolean;
    isSecret?: boolean;
    options?: Array<{ label?: string; description?: string }>;
  }>;
  permissions?: unknown;
  availableDecisions?: Array<string | Record<string, unknown>>;
  createdAt?: number;
  responseSchema?: unknown;
  arguments?: Record<string, unknown>;
  mode?: string;
  url?: string;
  elicitationId?: string;
  meta?: unknown;
};

export type ThreadRunState = {
  active: boolean;
  turnId?: string;
  startedAt?: number;
};

export type WorkspaceBrowserState = {
  shortcuts: WorkspaceShortcutsResponse | null;
  listing: WorkspaceListResponse | null;
  selectedPath: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

export type AttachmentItem = UploadImageResponse & {
  previewUrl: string;
};

type AppStore = {
  health: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    data: HealthResponse | null;
    error: string | null;
  };
  connection: {
    status: ConnectionStatus;
    error: string | null;
  };
  auth: {
    token: string;
  };
  sessions: {
    items: SessionItem[];
    activeSessionId: string | null;
  };
  timeline: {
    entriesBySessionId: Record<string, TimelineEntry[]>;
  };
  approvals: {
    items: ServerRequestItem[];
  };
  turns: {
    activeBySessionId: Record<string, ThreadRunState>;
  };
  tokenUsage: {
    bySessionId: Record<string, unknown>;
  };
  workspace: WorkspaceBrowserState;
  composer: {
    attachmentsBySessionId: Record<string, AttachmentItem[]>;
  };
  setHealthLoading: () => void;
  setHealthReady: (data: HealthResponse) => void;
  setHealthError: (message: string) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setToken: (token: string) => void;
  setSessions: (items: SessionItem[]) => void;
  upsertSession: (item: SessionItem) => void;
  removeSession: (threadId: string) => void;
  setActiveSession: (threadId: string | null) => void;
  replaceServerRequests: (items: unknown[]) => void;
  upsertServerRequest: (request: unknown) => void;
  removeServerRequest: (requestId: string) => void;
  resetServerRequests: () => void;
  setTurnStarted: (threadId: string, turnId?: string, startedAt?: number) => void;
  setTurnCompleted: (threadId: string, turnId?: string) => void;
  setTokenUsage: (threadId: string, usage: unknown) => void;
  setThreadSync: (threadId: string, message: Extract<ServerMessage, { type: 'thread_sync' }>) => void;
  appendTimelineEntry: (threadId: string, entry: TimelineEntry) => void;
  appendAssistantDelta: (threadId: string, itemId: string, delta: string) => void;
  upsertTimelineEntry: (threadId: string, entry: TimelineEntry) => void;
  setWorkspaceLoading: (selectedPath: string) => void;
  setWorkspaceReady: (shortcuts: WorkspaceShortcutsResponse, listing: WorkspaceListResponse) => void;
  setWorkspaceError: (message: string) => void;
  setWorkspaceListing: (listing: WorkspaceListResponse) => void;
  addAttachment: (threadId: string, attachment: AttachmentItem) => void;
  removeAttachment: (threadId: string, attachmentId: string) => void;
  clearAttachments: (threadId: string) => void;
};

function normalizeTab(tab: any): SessionItem {
  const candidates = [tab?.name, tab?.threadName, tab?.thread_name, tab?.preview];
  const resolvedName = candidates.find((value) => typeof value === 'string' && value.trim());
  return {
    threadId: String(tab?.threadId || ''),
    name: String(resolvedName || '').trim() || '未命名会话',
    cwd: typeof tab?.cwd === 'string' ? tab.cwd : '',
    status: typeof tab?.status === 'string' ? tab.status : '',
    windowStatus: typeof tab?.windowStatus === 'string' ? tab.windowStatus : '',
  };
}

function extractTurnText(turn: any): string {
  if (typeof turn?.text === 'string' && turn.text.trim()) {
    return turn.text;
  }

  const inputItems = Array.isArray(turn?.input) ? turn.input : [];
  const textParts = inputItems
    .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part: any) => part.text.trim())
    .filter(Boolean);
  if (textParts.length) {
    return textParts.join('\n');
  }

  if (typeof turn?.summary === 'string' && turn.summary.trim()) {
    return turn.summary;
  }

  return '';
}

function normalizeServerRequest(request: any): ServerRequestItem | null {
  const requestId = typeof request?.requestId === 'string' ? request.requestId : '';
  if (!requestId) {
    return null;
  }

  return {
    requestId,
    threadId: typeof request?.threadId === 'string' ? request.threadId : undefined,
    turnId: typeof request?.turnId === 'string' ? request.turnId : undefined,
    itemId: typeof request?.itemId === 'string' ? request.itemId : undefined,
    kind: typeof request?.kind === 'string' ? request.kind : undefined,
    status: request?.status === 'submitting' ? 'submitting' : 'pending',
    reason: typeof request?.reason === 'string' ? request.reason : undefined,
    message: typeof request?.message === 'string' ? request.message : undefined,
    command: typeof request?.command === 'string' ? request.command : undefined,
    cwd: typeof request?.cwd === 'string' ? request.cwd : undefined,
    tool: typeof request?.tool === 'string' ? request.tool : undefined,
    namespace: typeof request?.namespace === 'string' ? request.namespace : undefined,
    serverName: typeof request?.serverName === 'string' ? request.serverName : undefined,
    patch: typeof request?.patch === 'string' ? request.patch : undefined,
    questions: Array.isArray(request?.questions) ? request.questions : undefined,
    permissions: request?.permissions ?? undefined,
    availableDecisions: Array.isArray(request?.availableDecisions) ? request.availableDecisions : undefined,
    createdAt: typeof request?.createdAt === 'number' ? request.createdAt : undefined,
    responseSchema: request?.responseSchema ?? undefined,
    arguments: request?.arguments && typeof request.arguments === 'object' ? request.arguments : undefined,
    mode: typeof request?.mode === 'string' ? request.mode : undefined,
    url: typeof request?.url === 'string' ? request.url : undefined,
    elicitationId: typeof request?.elicitationId === 'string' ? request.elicitationId : undefined,
    meta: request?.meta ?? undefined,
  };
}

function compactText(value: unknown, max = 280): string {
  const text = typeof value === 'string' ? value : '';
  const normalized = text.trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 1))}…`;
}

function normalizeTimelineEntry(entry: TimelineEntry): TimelineEntry {
  return {
    ...entry,
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
  };
}

function extractReasoningDelta(message: Extract<ServerMessage, { type: 'item_delta' }>): string {
  if (typeof message.delta === 'string' && message.delta) {
    return message.delta;
  }

  if (!message.part || typeof message.part !== 'object') {
    return '';
  }

  const part = message.part as Record<string, unknown>;
  if (typeof part.text === 'string') {
    return part.text;
  }
  if (typeof part.summary === 'string') {
    return part.summary;
  }
  return '';
}

function createTimelineEntryFromItemEvent(
  kind: string,
  threadId: string,
  item: Record<string, unknown> | undefined,
  turnId?: string,
): TimelineEntry | null {
  if (!item) {
    return null;
  }

  const itemType = typeof item.type === 'string' ? item.type : '';
  const itemId = typeof item.id === 'string'
    ? item.id
    : `${threadId}:${turnId || 'turn'}:${kind}:${itemType || 'item'}`;
  const startedAt = typeof item.startedAt === 'number'
    ? item.startedAt
    : typeof item.createdAt === 'number'
      ? item.createdAt
      : Date.now();

  if (itemType === 'reasoning') {
    return {
      id: itemId,
      type: 'reasoning',
      role: 'assistant',
      turnId,
      itemId,
      title: 'Reasoning',
      text: compactText(item.text),
      status: kind === 'item_started' ? 'running' : 'completed',
      meta: [kind === 'item_started' ? 'streaming' : 'captured', new Date(startedAt).toLocaleTimeString()],
      createdAt: startedAt,
      details: item,
    };
  }

  if (itemType === 'plan') {
    return {
      id: itemId,
      type: 'plan',
      role: 'assistant',
      turnId,
      itemId,
      title: 'Plan Draft',
      text: compactText(item.text) || 'Planning…',
      status: kind === 'item_started' ? 'running' : 'completed',
      meta: [new Date(startedAt).toLocaleTimeString()],
      createdAt: startedAt,
      details: item,
    };
  }

  if (itemType === 'commandExecution') {
    const command = typeof item.command === 'string'
      ? item.command
      : typeof item.input === 'string'
        ? item.input
        : '';
    const output = typeof item.output === 'string'
      ? item.output
      : typeof item.aggregatedOutput === 'string'
        ? item.aggregatedOutput
        : '';
    return {
      id: itemId,
      type: 'command',
      role: 'system',
      turnId,
      itemId,
      title: 'Command',
      text: compactText(command) || 'Command execution',
      status: typeof item.status === 'string' ? item.status : (kind === 'item_started' ? 'running' : 'completed'),
      meta: [
        typeof item.cwd === 'string' && item.cwd ? item.cwd : '',
        output ? `${output.length} chars output` : '',
      ].filter(Boolean),
      createdAt: startedAt,
      details: item,
    };
  }

  if (itemType === 'fileChange') {
    return {
      id: itemId,
      type: 'file_change',
      role: 'system',
      turnId,
      itemId,
      title: 'File Change',
      text: compactText(typeof item.output === 'string' ? item.output : '') || 'Pending file changes',
      status: typeof item.status === 'string' ? item.status : (kind === 'item_started' ? 'running' : 'completed'),
      patch: typeof item.patch === 'string' ? item.patch : undefined,
      changes: Array.isArray(item.changes)
        ? item.changes.map((change) => ({
          path: typeof (change as any)?.path === 'string' ? (change as any).path : '',
          kind: typeof (change as any)?.kind === 'string' ? (change as any).kind : '',
        }))
        : undefined,
      createdAt: startedAt,
      details: item,
    };
  }

  if (itemType === 'mcpToolCall') {
    return {
      id: itemId,
      type: 'mcp_tool',
      role: 'system',
      turnId,
      itemId,
      title: 'MCP Tool',
      text: [item.server, item.tool].filter((value) => typeof value === 'string' && value).join('.'),
      status: typeof item.status === 'string' ? item.status : (kind === 'item_started' ? 'running' : 'completed'),
      meta: Array.isArray(item.progressMessages) ? item.progressMessages.filter((value): value is string => typeof value === 'string') : [],
      createdAt: startedAt,
      details: item,
    };
  }

  if (itemType === 'dynamicToolCall') {
    return {
      id: itemId,
      type: 'dynamic_tool',
      role: 'system',
      turnId,
      itemId,
      title: 'Dynamic Tool',
      text: [item.namespace, item.tool].filter((value) => typeof value === 'string' && value).join('.'),
      status: typeof item.status === 'string' ? item.status : (kind === 'item_started' ? 'running' : 'completed'),
      createdAt: startedAt,
      details: item,
    };
  }

  return {
    id: itemId,
    type: itemType || 'item',
    role: itemType === 'agentMessage' ? 'assistant' : 'system',
    turnId,
    itemId,
    title: itemType || 'Item',
    text: compactText(item.text) || compactText(item.output) || compactText(JSON.stringify(item)),
    status: kind === 'item_started' ? 'running' : 'completed',
    createdAt: startedAt,
    details: item,
  };
}

function buildSystemTimelineEntry(
  threadId: string,
  type: string,
  fields: Partial<TimelineEntry> & { id?: string; text?: string; turnId?: string },
): TimelineEntry {
  return {
    id: fields.id || `${threadId}:${type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    type,
    role: fields.role || 'system',
    turnId: fields.turnId,
    itemId: fields.itemId,
    title: fields.title,
    text: fields.text,
    status: fields.status,
    meta: fields.meta,
    patch: fields.patch,
    changes: fields.changes,
    createdAt: fields.createdAt,
    details: fields.details,
  };
}

function createTimelineEntriesFromThreadSync(message: Extract<ServerMessage, { type: 'thread_sync' }>): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const planEntry of Array.isArray(message.turnPlans) ? message.turnPlans : []) {
    const turnId = typeof (planEntry as any)?.turnId === 'string' ? (planEntry as any).turnId : '';
    const plan = Array.isArray((planEntry as any)?.plan) ? (planEntry as any).plan : [];
    if (!turnId || !plan.length) {
      continue;
    }
    entries.push({
      id: `turn-plan:${turnId}`,
      type: 'turn_plan',
      role: 'assistant',
      turnId,
      title: 'Execution Plan',
      text: typeof (planEntry as any)?.explanation === 'string' ? (planEntry as any).explanation : '',
      meta: plan.map((step: any) => [step?.status, step?.step].filter(Boolean).join(': ')),
      createdAt: typeof (planEntry as any)?.updatedAt === 'number' ? (planEntry as any).updatedAt : Date.now(),
      details: planEntry,
    });
  }

  for (const diffEntry of Array.isArray(message.turnDiffs) ? message.turnDiffs : []) {
    const turnId = typeof (diffEntry as any)?.turnId === 'string' ? (diffEntry as any).turnId : '';
    const diff = typeof (diffEntry as any)?.diff === 'string' ? (diffEntry as any).diff : '';
    if (!turnId || !diff.trim()) {
      continue;
    }
    entries.push({
      id: `turn-diff:${turnId}`,
      type: 'turn_diff',
      role: 'system',
      turnId,
      title: 'Turn Diff',
      text: 'Recovered diff snapshot',
      patch: diff,
      createdAt: typeof (diffEntry as any)?.updatedAt === 'number' ? (diffEntry as any).updatedAt : Date.now(),
      details: diffEntry,
    });
  }

  for (const supplemental of Array.isArray(message.supplementalItems) ? message.supplementalItems : []) {
    const item = supplemental as Record<string, unknown>;
    const itemId = typeof item.id === 'string' ? item.id : '';
    const itemType = typeof item.type === 'string' ? item.type : '';
    if (!itemId || !itemType) {
      continue;
    }
    if (itemType === 'hookEvent') {
      entries.push({
        id: itemId,
        type: 'hook',
        role: 'system',
        turnId: typeof item.turnId === 'string' ? item.turnId : undefined,
        title: 'Hook',
        text: typeof item.phase === 'string' ? `Hook ${item.phase}` : 'Hook',
        status: typeof item.status === 'string' ? item.status : undefined,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        details: item,
      });
      continue;
    }
    if (itemType === 'guardianReview') {
      entries.push({
        id: itemId,
        type: 'guardian_review',
        role: 'system',
        turnId: typeof item.turnId === 'string' ? item.turnId : undefined,
        title: 'Guardian Review',
        text: typeof item.phase === 'string' ? `Guardian ${item.phase}` : 'Guardian review',
        status: typeof item.status === 'string' ? item.status : undefined,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        details: item,
      });
    }
  }

  for (const notice of Array.isArray(message.globalSupplementalItems) ? message.globalSupplementalItems : []) {
    const item = notice as Record<string, unknown>;
    const itemId = typeof item.id === 'string' ? item.id : '';
    const text = typeof item.text === 'string' ? item.text : '';
    if (!itemId || !text) {
      continue;
    }
    entries.push({
      id: `notice:${itemId}`,
      type: 'notice',
      role: 'system',
      title: typeof item.noticeKind === 'string' ? item.noticeKind : 'Notice',
      text,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      details: item,
    });
  }

  return entries;
}

export const useAppStore = create<AppStore>((set) => ({
  health: {
    status: 'idle',
    data: null,
    error: null,
  },
  connection: {
    status: 'idle',
    error: null,
  },
  auth: {
    token: '',
  },
  sessions: {
    items: [],
    activeSessionId: null,
  },
  timeline: {
    entriesBySessionId: {},
  },
  approvals: {
    items: [],
  },
  turns: {
    activeBySessionId: {},
  },
  tokenUsage: {
    bySessionId: {},
  },
  workspace: {
    shortcuts: null,
    listing: null,
    selectedPath: '',
    status: 'idle',
    error: null,
  },
  composer: {
    attachmentsBySessionId: {},
  },
  setHealthLoading: () => set((state) => ({
    health: {
      ...state.health,
      status: 'loading',
      error: null,
    },
  })),
  setHealthReady: (data) => set({
    health: {
      status: 'ready',
      data,
      error: null,
    },
  }),
  setHealthError: (message) => set({
    health: {
      status: 'error',
      data: null,
      error: message,
    },
  }),
  setConnectionStatus: (status, error) => set({
    connection: {
      status,
      error: error || null,
    },
  }),
  setToken: (token) => set((state) => ({
    auth: {
      ...state.auth,
      token,
    },
  })),
  setSessions: (items) => set((state) => ({
    sessions: {
      items,
      activeSessionId: state.sessions.activeSessionId && items.some((item) => item.threadId === state.sessions.activeSessionId)
        ? state.sessions.activeSessionId
        : (items[0]?.threadId || null),
    },
  })),
  upsertSession: (item) => set((state) => {
    const nextItems = [...state.sessions.items];
    const index = nextItems.findIndex((entry) => entry.threadId === item.threadId);
    if (index >= 0) {
      nextItems[index] = {
        ...nextItems[index],
        ...item,
      };
    } else {
      nextItems.unshift(item);
    }
    return {
      sessions: {
        items: nextItems,
        activeSessionId: state.sessions.activeSessionId || item.threadId,
      },
    };
  }),
  removeSession: (threadId) => set((state) => {
    const nextTurns = { ...state.turns.activeBySessionId };
    const nextUsage = { ...state.tokenUsage.bySessionId };
    const nextEntries = { ...state.timeline.entriesBySessionId };
    delete nextTurns[threadId];
    delete nextUsage[threadId];
    delete nextEntries[threadId];

    const nextItems = state.sessions.items.filter((item) => item.threadId !== threadId);
    return {
      sessions: {
        items: nextItems,
        activeSessionId: state.sessions.activeSessionId === threadId ? (nextItems[0]?.threadId || null) : state.sessions.activeSessionId,
      },
      timeline: {
        entriesBySessionId: nextEntries,
      },
      turns: {
        activeBySessionId: nextTurns,
      },
      tokenUsage: {
        bySessionId: nextUsage,
      },
      approvals: {
        items: state.approvals.items.filter((item) => item.threadId !== threadId),
      },
    };
  }),
  setActiveSession: (threadId) => set((state) => ({
    sessions: {
      ...state.sessions,
      activeSessionId: threadId,
    },
  })),
  replaceServerRequests: (items) => set(() => ({
    approvals: {
      items: items
        .map(normalizeServerRequest)
        .filter((item): item is ServerRequestItem => item !== null)
        .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0)),
    },
  })),
  upsertServerRequest: (request) => set((state) => {
    const normalized = normalizeServerRequest(request);
    if (!normalized) {
      return state;
    }

    const nextItems = [...state.approvals.items];
    const index = nextItems.findIndex((item) => item.requestId === normalized.requestId);
    if (index >= 0) {
      nextItems[index] = {
        ...nextItems[index],
        ...normalized,
      };
    } else {
      nextItems.push(normalized);
    }
    nextItems.sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));

    return {
      approvals: {
        items: nextItems,
      },
    };
  }),
  removeServerRequest: (requestId) => set((state) => ({
    approvals: {
      items: state.approvals.items.filter((item) => item.requestId !== requestId),
    },
  })),
  resetServerRequests: () => set({
    approvals: {
      items: [],
    },
  }),
  setTurnStarted: (threadId, turnId, startedAt) => set((state) => ({
    turns: {
      activeBySessionId: {
        ...state.turns.activeBySessionId,
        [threadId]: {
          active: true,
          turnId,
          startedAt,
        },
      },
    },
  })),
  setTurnCompleted: (threadId, turnId) => set((state) => ({
    turns: {
      activeBySessionId: {
        ...state.turns.activeBySessionId,
        [threadId]: {
          active: false,
          turnId,
        },
      },
    },
  })),
  setTokenUsage: (threadId, usage) => set((state) => ({
    tokenUsage: {
      bySessionId: {
        ...state.tokenUsage.bySessionId,
        [threadId]: usage,
      },
    },
  })),
  appendTimelineEntry: (threadId, entry) => set((state) => ({
    timeline: {
      entriesBySessionId: {
        ...state.timeline.entriesBySessionId,
        [threadId]: [...(state.timeline.entriesBySessionId[threadId] || []), normalizeTimelineEntry(entry)],
      },
    },
  })),
  appendAssistantDelta: (threadId, itemId, delta) => set((state) => {
    const entries = [...(state.timeline.entriesBySessionId[threadId] || [])];
    const index = entries.findIndex((entry) => entry.id === itemId);
    if (index >= 0) {
      entries[index] = {
        ...entries[index],
        role: 'assistant',
        type: 'message',
        text: `${entries[index].text || ''}${delta}`,
        createdAt: entries[index].createdAt || Date.now(),
      };
    } else {
      entries.push({
        id: itemId,
        type: 'message',
        role: 'assistant',
        text: delta,
        createdAt: Date.now(),
      });
    }

    return {
      timeline: {
        entriesBySessionId: {
          ...state.timeline.entriesBySessionId,
          [threadId]: entries,
        },
      },
    };
  }),
  upsertTimelineEntry: (threadId, entry) => set((state) => {
    const entries = [...(state.timeline.entriesBySessionId[threadId] || [])];
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index >= 0) {
      entries[index] = {
        ...entries[index],
        ...normalizeTimelineEntry(entry),
      };
    } else {
      entries.push(normalizeTimelineEntry(entry));
    }
    return {
      timeline: {
        entriesBySessionId: {
          ...state.timeline.entriesBySessionId,
          [threadId]: entries,
        },
      },
    };
  }),
  setWorkspaceLoading: (selectedPath) => set((state) => ({
    workspace: {
      ...state.workspace,
      selectedPath,
      status: 'loading',
      error: null,
    },
  })),
  setWorkspaceReady: (shortcuts, listing) => set({
    workspace: {
      shortcuts,
      listing,
      selectedPath: listing.path,
      status: 'ready',
      error: null,
    },
  }),
  setWorkspaceError: (message) => set((state) => ({
    workspace: {
      ...state.workspace,
      status: 'error',
      error: message,
    },
  })),
  setWorkspaceListing: (listing) => set((state) => ({
    workspace: {
      ...state.workspace,
      listing,
      selectedPath: listing.path,
      status: 'ready',
      error: null,
    },
  })),
  addAttachment: (threadId, attachment) => set((state) => ({
    composer: {
      attachmentsBySessionId: {
        ...state.composer.attachmentsBySessionId,
        [threadId]: [...(state.composer.attachmentsBySessionId[threadId] || []), attachment],
      },
    },
  })),
  removeAttachment: (threadId, attachmentId) => set((state) => ({
    composer: {
      attachmentsBySessionId: {
        ...state.composer.attachmentsBySessionId,
        [threadId]: (state.composer.attachmentsBySessionId[threadId] || []).filter((item) => item.id !== attachmentId),
      },
    },
  })),
  clearAttachments: (threadId) => set((state) => ({
    composer: {
      attachmentsBySessionId: {
        ...state.composer.attachmentsBySessionId,
        [threadId]: [],
      },
    },
  })),
  setThreadSync: (threadId, message) => set((state) => ({
    timeline: {
      entriesBySessionId: {
        ...state.timeline.entriesBySessionId,
        [threadId]: [
          ...(Array.isArray(message.turns)
          ? message.turns.flatMap((turn: any, index) => {
            const turnId = String(turn?.id || `${threadId}-${index}`);
            const entries: TimelineEntry[] = [];
            const userText = extractTurnText(turn);
            if (userText) {
              entries.push({
                id: `${turnId}-user`,
                type: 'message',
                role: 'user',
                turnId,
                text: userText,
                createdAt: typeof turn?.createdAt === 'number' ? turn.createdAt : index,
              });
            }
            if (typeof turn?.output === 'string' && turn.output.trim()) {
              entries.push({
                id: `${turnId}-assistant`,
                type: 'message',
                role: 'assistant',
                turnId,
                text: turn.output.trim(),
                createdAt: typeof turn?.updatedAt === 'number' ? turn.updatedAt : index + 0.5,
              });
            }
            return entries.length ? entries : [{
              id: turnId,
              type: 'turn',
              role: 'system',
              turnId,
              text: 'Empty turn',
              createdAt: index,
            }];
          })
          : []),
          ...createTimelineEntriesFromThreadSync(message),
        ],
      },
    },
    tokenUsage: {
      bySessionId: {
        ...state.tokenUsage.bySessionId,
        [threadId]: message.tokenUsage ?? null,
      },
    },
  })),
}));

export function mapServerMessageToStore(message: ServerMessage) {
  const store = useAppStore.getState();

  if (message.type === 'state') {
    store.setSessions(Array.isArray(message.tabs) ? message.tabs.map(normalizeTab) : []);
    store.replaceServerRequests(Array.isArray(message.serverRequests) ? message.serverRequests : []);
    return;
  }

  if (message.type === 'server_request_required' || message.type === 'server_request_updated') {
    store.upsertServerRequest(message.request);
    return;
  }

  if (message.type === 'server_request_resolved') {
    store.removeServerRequest(message.requestId);
    return;
  }

  if (message.type === 'server_request_reset') {
    store.resetServerRequests();
    return;
  }

  if (message.type === 'tab_updated' && message.tab) {
    store.upsertSession(normalizeTab(message.tab));
    return;
  }

  if (message.type === 'tab_created' && message.tab) {
    store.upsertSession(normalizeTab(message.tab));
    store.setActiveSession(message.threadId);
    return;
  }

  if (message.type === 'tab_removed') {
    store.removeSession(message.threadId);
    return;
  }

  if (message.type === 'thread_sync') {
    store.setThreadSync(message.threadId, message);
    return;
  }

  if (message.type === 'turn_started') {
    store.setTurnStarted(message.threadId, message.turnId, message.startedAt);
    return;
  }

  if (message.type === 'turn_completed') {
    store.setTurnCompleted(message.threadId, message.turnId);
    return;
  }

  if (message.type === 'token_usage') {
    store.setTokenUsage(message.threadId, message.usage);
    return;
  }

  if (message.type === 'agent_delta') {
    store.appendAssistantDelta(
      message.threadId,
      message.itemId || `${message.threadId}-assistant-live`,
      message.delta || '',
    );
    return;
  }

  if (message.type === 'plan_delta') {
    const entryId = message.itemId || `${message.threadId}:${message.turnId || 'turn'}:plan-live`;
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'plan', {
      id: entryId,
      role: 'assistant',
      turnId: message.turnId,
      itemId: message.itemId,
      title: 'Plan Draft',
      text: `${(useAppStore.getState().timeline.entriesBySessionId[message.threadId] || []).find((entry) => entry.id === entryId)?.text || ''}${message.delta || ''}`,
      status: 'running',
      meta: ['streaming'],
      createdAt: message.startedAt,
    }));
    return;
  }

  if (message.type === 'turn_plan_updated') {
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'turn_plan', {
      id: `turn-plan:${message.turnId || 'turn'}`,
      role: 'assistant',
      turnId: message.turnId,
      title: 'Execution Plan',
      text: typeof message.explanation === 'string' ? message.explanation : '',
      status: 'completed',
      meta: Array.isArray(message.plan)
        ? message.plan.map((step: any) => [step?.status, step?.step].filter(Boolean).join(': ')).filter(Boolean)
        : [],
    }));
    return;
  }

  if (message.type === 'turn_diff_updated') {
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'turn_diff', {
      id: `turn-diff:${message.turnId || 'turn'}`,
      turnId: message.turnId,
      title: 'Turn Diff',
      text: 'Updated diff snapshot',
      patch: typeof message.diff === 'string' ? message.diff : currentDiffToText(message.diff),
      status: 'completed',
    }));
    return;
  }

  if (message.type === 'mcp_tool_progress') {
    const entryId = message.itemId || `${message.threadId}:${message.turnId || 'turn'}:mcp-progress`;
    const current = (useAppStore.getState().timeline.entriesBySessionId[message.threadId] || []).find((entry) => entry.id === entryId);
    const nextMeta = [...(current?.meta || []), message.message || ''].filter(Boolean);
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'mcp_tool_progress', {
      id: entryId,
      turnId: message.turnId,
      itemId: message.itemId,
      title: 'MCP Tool',
      text: current?.text || 'Tool running',
      status: 'running',
      meta: nextMeta.slice(-6),
      createdAt: message.startedAt,
    }));
    return;
  }

  if (message.type === 'hook_started' || message.type === 'hook_completed') {
    const run = ('run' in message ? message.run : undefined) as Record<string, unknown> | undefined;
    const hookId = typeof run?.id === 'string' ? run.id : `hook:${message.threadId}:${message.turnId || 'turn'}`;
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'hook', {
      id: hookId,
      turnId: message.turnId,
      title: 'Hook',
      text: typeof run?.eventName === 'string'
        ? `${run.eventName} ${message.type === 'hook_started' ? 'started' : 'completed'}`
        : (message.type === 'hook_started' ? 'Hook started' : 'Hook completed'),
      status: message.type === 'hook_started' ? 'running' : 'completed',
      meta: [
        typeof run?.handler === 'string' ? `handler: ${run.handler}` : '',
        typeof run?.scope === 'string' ? `scope: ${run.scope}` : '',
      ].filter(Boolean),
      details: run,
    }));
    return;
  }

  if (message.type === 'guardian_review_started' || message.type === 'guardian_review_completed') {
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'guardian_review', {
      id: `guardian:${message.threadId}:${message.turnId || 'turn'}`,
      turnId: message.turnId,
      title: 'Guardian Review',
      text: message.type === 'guardian_review_started' ? 'Guardian review started' : 'Guardian review completed',
      status: message.type === 'guardian_review_started' ? 'running' : 'completed',
    }));
    return;
  }

  if (message.type === 'item_started') {
    const item = message.item as Record<string, unknown> | undefined;
    const entry = createTimelineEntryFromItemEvent('item_started', message.threadId, item, message.turnId);
    if (entry) {
      store.upsertTimelineEntry(message.threadId, entry);
    }
    return;
  }

  if (message.type === 'item_completed') {
    const item = message.item as Record<string, unknown> | undefined;
    if (item?.type === 'agentMessage') {
      const itemId = typeof item.id === 'string'
        ? item.id
        : `${message.threadId}-assistant-final`;
      const text = typeof item.text === 'string'
        ? item.text
        : typeof item.output === 'string'
          ? item.output
          : '';
      if (text.trim()) {
        store.appendAssistantDelta(message.threadId, itemId, text.trim());
        store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'message', {
          id: itemId,
          role: 'assistant',
          turnId: message.turnId,
          text: text.trim(),
          status: 'completed',
        }));
      }
      return;
    }

    const entry = createTimelineEntryFromItemEvent('item_completed', message.threadId, item, message.turnId);
    if (entry) {
      store.upsertTimelineEntry(message.threadId, entry);
    }
    return;
  }

  if (message.type === 'item_delta') {
    const entryId = message.itemId || `${message.threadId}:${message.turnId || 'turn'}:${message.method || 'item_delta'}`;
    const current = (useAppStore.getState().timeline.entriesBySessionId[message.threadId] || []).find((entry) => entry.id === entryId);

    if (
      message.method === 'item/reasoning/summaryTextDelta'
      || message.method === 'item/reasoning/summaryPartAdded'
      || message.method === 'item/reasoning/textDelta'
    ) {
      const deltaText = extractReasoningDelta(message);
      store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'reasoning', {
        id: entryId,
        role: 'assistant',
        turnId: message.turnId,
        itemId: message.itemId,
        title: 'Reasoning',
        text: `${current?.text || ''}${deltaText}`,
        status: 'running',
        meta: ['streaming'],
        createdAt: message.startedAt,
      }));
      return;
    }

    if (message.method === 'item/commandExecution/outputDelta') {
      store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'command', {
        id: entryId,
        turnId: message.turnId,
        itemId: message.itemId,
        title: current?.title || 'Command',
        text: current?.text || 'Command execution',
        status: 'running',
        meta: [...(current?.meta || []), message.delta || ''].filter(Boolean).slice(-8),
        createdAt: message.startedAt,
      }));
      return;
    }

    if (message.method === 'item/fileChange/outputDelta' || message.method === 'item/fileChange/patchUpdated') {
      store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'file_change', {
        id: entryId,
        turnId: message.turnId,
        itemId: message.itemId,
        title: current?.title || 'File Change',
        text: current?.text || 'File change in progress',
        status: 'running',
        patch: typeof message.patch === 'string' ? message.patch : current?.patch,
        changes: Array.isArray(message.changes)
          ? message.changes.map((change: any) => ({
            path: typeof change?.path === 'string' ? change.path : '',
            kind: typeof change?.kind === 'string' ? change.kind : '',
          }))
          : current?.changes,
        meta: message.delta ? [...(current?.meta || []), message.delta].slice(-8) : current?.meta,
        createdAt: message.startedAt,
      }));
      return;
    }

    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'item_delta', {
      id: entryId,
      turnId: message.turnId,
      itemId: message.itemId,
      title: message.method || 'Item update',
      text: message.delta || current?.text || '',
      status: 'running',
      patch: typeof message.patch === 'string' ? message.patch : current?.patch,
      changes: Array.isArray(message.changes)
        ? message.changes.map((change: any) => ({
          path: typeof change?.path === 'string' ? change.path : '',
          kind: typeof change?.kind === 'string' ? change.kind : '',
        }))
        : current?.changes,
      createdAt: message.startedAt,
    }));
    return;
  }

  if (message.type === 'warning' || message.type === 'error_notice') {
    if (!message.threadId) {
      return;
    }
    const noticeId = message.noticeId || `${message.threadId}:${message.type}:${Date.now()}`;
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'notice', {
      id: `notice:${noticeId}`,
      role: 'system',
      title: message.noticeKind || (message.type === 'warning' ? 'Warning' : 'Error'),
      text: message.message,
      status: message.type === 'warning' ? 'warning' : 'error',
      createdAt: message.createdAt,
    }));
    return;
  }

  if (message.type === 'codex_error') {
    if (!message.threadId) {
      return;
    }
    store.upsertTimelineEntry(message.threadId, buildSystemTimelineEntry(message.threadId, 'notice', {
      id: `codex-error:${message.threadId}:${Date.now()}`,
      role: 'system',
      title: 'Codex Error',
      text: typeof message.error === 'string' ? message.error : compactText(JSON.stringify(message.error)),
      status: 'error',
    }));
  }
}

function currentDiffToText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!value) {
    return '';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
