import { useEffect, useMemo } from 'react';
import { writeStoredToken, readStoredToken } from '../lib/storage.js';
import { useAppStore, mapServerMessageToStore } from '../store/appStore.js';
import { getHealth } from '../transport/http/health.js';
import { createSocketClient } from '../transport/ws/createSocketClient.js';

function SessionRail() {
  const sessions = useAppStore((state) => state.sessions.items);
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const setActiveSession = useAppStore((state) => state.setActiveSession);

  return (
    <aside className="panel session-rail">
      <div className="panel-title">Sessions</div>
      <div className="panel-body">
        {sessions.length ? (
          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.threadId}
                type="button"
                className={`session-item${session.threadId === activeSessionId ? ' active' : ''}`}
                onClick={() => setActiveSession(session.threadId)}
              >
                <strong>{session.name}</strong>
                <span>{session.cwd || 'No workspace'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="muted">No sessions yet</div>
        )}
      </div>
    </aside>
  );
}

function TimelineWorkspace() {
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const entries = useAppStore((state) => activeSessionId ? (state.timeline.entriesBySessionId[activeSessionId] || []) : []);
  const health = useAppStore((state) => state.health.data);
  const error = useAppStore((state) => state.health.error || state.connection.error || '');

  return (
    <section className="panel timeline-workspace">
      <div className="panel-title">Timeline</div>
      <div className="panel-body">
        {error ? <div className="status error">{error}</div> : null}
        {!error && !health ? <div className="status">Loading health…</div> : null}
        {activeSessionId && entries.length ? (
          <div className="timeline-list">
            {entries.map((entry) => (
              <article key={entry.id} className="timeline-entry">
                <div className="label">{entry.type}</div>
                <div>{entry.text || 'No text'}</div>
              </article>
            ))}
          </div>
        ) : null}
        {!activeSessionId && health ? (
          <div className="health-grid">
            <div className="health-card">
              <span className="label">Status</span>
              <strong>{health.status}</strong>
            </div>
            <div className="health-card">
              <span className="label">Tabs</span>
              <strong>{health.tabs}</strong>
            </div>
            <div className="health-card">
              <span className="label">WebSocket</span>
              <strong>{health.websocketClients}</strong>
            </div>
            <div className="health-card">
              <span className="label">Uptime</span>
              <strong>{health.uptimeSec}s</strong>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function InspectorPanel() {
  const health = useAppStore((state) => state.health.data);
  const connection = useAppStore((state) => state.connection);
  const token = useAppStore((state) => state.auth.token);

  return (
    <aside className="panel inspector-panel">
      <div className="panel-title">Inspector</div>
      <div className="panel-body">
        <div className="inspector-card">
          <span className="label">HTTP</span>
          <strong>{health?.status || 'unknown'}</strong>
        </div>
        <div className="inspector-card">
          <span className="label">WS</span>
          <strong>{connection.status}</strong>
        </div>
        <div className="inspector-card">
          <span className="label">Token</span>
          <strong>{token ? 'configured' : 'missing'}</strong>
        </div>
      </div>
    </aside>
  );
}

function ComposerDock() {
  const token = useAppStore((state) => state.auth.token);
  const setToken = useAppStore((state) => state.setToken);

  return (
    <footer className="panel composer-dock">
      <div className="panel-title">Composer</div>
      <div className="panel-body">
        <input
          className="token-input"
          placeholder="WebSocket token"
          value={token}
          onChange={(event) => {
            const nextToken = writeStoredToken(event.target.value);
            setToken(nextToken);
          }}
        />
        <textarea className="composer-input" placeholder="Prompt scaffold" />
      </div>
    </footer>
  );
}

export function App() {
  const setHealthLoading = useAppStore((state) => state.setHealthLoading);
  const setHealthReady = useAppStore((state) => state.setHealthReady);
  const setHealthError = useAppStore((state) => state.setHealthError);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const token = useAppStore((state) => state.auth.token);
  const setToken = useAppStore((state) => state.setToken);
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);

  const socketClient = useMemo(() => createSocketClient({
    onMessage: (message) => {
      mapServerMessageToStore(message);
    },
    onStatusChange: (status, error) => {
      setConnectionStatus(status, error);
    },
  }), [setConnectionStatus]);

  useEffect(() => {
    setToken(readStoredToken());
  }, [setToken]);

  useEffect(() => {
    let cancelled = false;
    setHealthLoading();
    getHealth()
      .then((result) => {
        if (!cancelled) {
          setHealthReady(result);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setHealthError(loadError.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setHealthError, setHealthLoading, setHealthReady]);

  useEffect(() => {
    if (!token) {
      socketClient.disconnect();
      return;
    }
    void socketClient.connect(token);
    return () => {
      socketClient.disconnect();
    };
  }, [socketClient, token]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    socketClient.send({
      type: 'thread_sync',
      threadId: activeSessionId,
    });
  }, [activeSessionId, socketClient]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Rebuild</div>
          <h1>Codex Remote Console</h1>
        </div>
        <div className="topbar-meta">React + Vite scaffold</div>
      </header>
      <main className="workspace-grid">
        <SessionRail />
        <TimelineWorkspace />
        <InspectorPanel />
      </main>
      <ComposerDock />
    </div>
  );
}
