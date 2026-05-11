import { useAppStore } from '../../store/appStore.js';

export function SessionRail() {
  const sessions = useAppStore((state) => state.sessions.items);
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const approvals = useAppStore((state) => state.approvals.items);
  const setActiveSession = useAppStore((state) => state.setActiveSession);

  return (
    <aside className="panel session-rail">
      <div className="panel-title">Sessions</div>
      <div className="panel-body">
        {sessions.length ? (
          <div className="session-list">
            {sessions.map((session) => {
              const pendingCount = approvals.filter((request) => request.threadId === session.threadId).length;
              return (
                <button
                  key={session.threadId}
                  type="button"
                  className={`session-item${session.threadId === activeSessionId ? ' active' : ''}`}
                  onClick={() => setActiveSession(session.threadId)}
                >
                  <div className="session-item-row">
                    <strong>{session.name}</strong>
                    {pendingCount ? <span className="badge warning">{pendingCount}</span> : null}
                  </div>
                  <span>{session.cwd || 'No workspace'}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No sessions yet</strong>
            <span>Send a prompt from Composer to create the first session.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
