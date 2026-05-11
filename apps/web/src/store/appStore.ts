import { create } from 'zustand';
import type { HealthResponse, ServerMessage } from '@codex-remote/protocol';
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
  text?: string;
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
  setHealthLoading: () => void;
  setHealthReady: (data: HealthResponse) => void;
  setHealthError: (message: string) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setToken: (token: string) => void;
  setSessions: (items: SessionItem[]) => void;
  upsertSession: (item: SessionItem) => void;
  removeSession: (threadId: string) => void;
  setActiveSession: (threadId: string | null) => void;
  setThreadSync: (threadId: string, message: Extract<ServerMessage, { type: 'thread_sync' }>) => void;
};

function normalizeTab(tab: any): SessionItem {
  return {
    threadId: String(tab?.threadId || ''),
    name: String(tab?.name || '').trim() || '未命名会话',
    cwd: typeof tab?.cwd === 'string' ? tab.cwd : '',
    status: typeof tab?.status === 'string' ? tab.status : '',
    windowStatus: typeof tab?.windowStatus === 'string' ? tab.windowStatus : '',
  };
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
    const nextItems = state.sessions.items.filter((item) => item.threadId !== threadId);
    return {
      sessions: {
        items: nextItems,
        activeSessionId: state.sessions.activeSessionId === threadId ? (nextItems[0]?.threadId || null) : state.sessions.activeSessionId,
      },
    };
  }),
  setActiveSession: (threadId) => set((state) => ({
    sessions: {
      ...state.sessions,
      activeSessionId: threadId,
    },
  })),
  setThreadSync: (threadId, message) => set((state) => ({
    timeline: {
      entriesBySessionId: {
        ...state.timeline.entriesBySessionId,
        [threadId]: Array.isArray(message.turns)
          ? message.turns.map((turn: any, index) => ({
            id: String(turn?.id || `${threadId}-${index}`),
            type: 'turn',
            text: typeof turn?.summary === 'string'
              ? turn.summary
              : (typeof turn?.text === 'string' ? turn.text : JSON.stringify(turn)),
          }))
          : [],
      },
    },
  })),
}));

export function mapServerMessageToStore(message: ServerMessage) {
  const store = useAppStore.getState();

  if (message.type === 'state') {
    store.setSessions(Array.isArray(message.tabs) ? message.tabs.map(normalizeTab) : []);
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
  }
}
