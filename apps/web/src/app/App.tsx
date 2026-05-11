import { useEffect, useMemo, useState } from 'react';
import { writeStoredToken, readStoredToken } from '../lib/storage.js';
import { useAppStore, mapServerMessageToStore, type ServerRequestItem, type TimelineEntry } from '../store/appStore.js';
import { getHealth } from '../transport/http/health.js';
import {
  createWorkspaceDirectory,
  getWorkspaceListing,
  getWorkspaceShortcuts,
} from '../transport/http/workspace.js';
import { uploadImage } from '../transport/http/uploads.js';
import { createSocketClient } from '../transport/ws/createSocketClient.js';

function buildSessionNameFromPrompt(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return '新会话';
  }
  return firstLine.slice(0, 40);
}

function formatTokenUsageValue(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (!value || typeof value !== 'object') {
    return '-';
  }

  const usage = value as Record<string, unknown>;
  const total = usage.totalTokens ?? usage.total_tokens;
  const input = usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens;
  const output = usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens;

  if (typeof total === 'number') {
    return String(total);
  }

  const parts = [
    typeof input === 'number' ? `in ${input}` : '',
    typeof output === 'number' ? `out ${output}` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' / ') : '-';
}

function buildApprovalSummary(request: {
  kind?: string;
  reason?: string;
  command?: string;
  tool?: string;
  serverName?: string;
  message?: string;
  patch?: string;
  questions?: Array<{ question?: string; header?: string }>;
}): string {
  if (request.reason) {
    return request.reason;
  }
  if (request.command) {
    return request.command;
  }
  if (request.message) {
    return request.message;
  }
  if (request.tool) {
    return `Tool: ${request.tool}`;
  }
  if (request.serverName) {
    return `Server: ${request.serverName}`;
  }
  if (request.questions?.length) {
    return request.questions
      .map((entry) => entry.question || entry.header || '')
      .filter(Boolean)
      .join('\n');
  }
  if (request.patch) {
    return request.patch.slice(0, 240);
  }
  return request.kind || 'Pending approval';
}

function getDecisionLabel(decision: string | Record<string, unknown>): string {
  if (typeof decision === 'string') {
    if (decision === 'accept' || decision === 'approved') {
      return 'Approve';
    }
    if (decision === 'acceptForSession' || decision === 'approved_for_session') {
      return 'Approve for session';
    }
    if (decision === 'decline' || decision === 'denied') {
      return 'Reject';
    }
    if (decision === 'cancel') {
      return 'Cancel';
    }
    return decision;
  }

  if (decision && typeof decision === 'object') {
    if ('acceptWithExecpolicyAmendment' in decision) {
      return 'Approve with policy';
    }
    if ('acceptWithNetworkPolicyAmendments' in decision) {
      return 'Approve network';
    }
  }

  return 'Respond';
}

function summarizeTimelineEntry(entry: TimelineEntry): string {
  if (entry.text?.trim()) {
    return entry.text;
  }
  if (entry.patch?.trim()) {
    return entry.patch;
  }
  if (entry.meta?.length) {
    return entry.meta.join('\n');
  }
  return 'No details';
}

function formatTimelineLabel(entry: TimelineEntry): string {
  if (entry.title) {
    return entry.title;
  }
  if (entry.role) {
    return entry.role;
  }
  return entry.type;
}

function buildUserInputResponse(request: ServerRequestItem, formState: Record<string, string>): { answers: Record<string, { answers: string[] }> } {
  const answers: Record<string, { answers: string[] }> = {};

  for (const question of request.questions || []) {
    const questionId = question.id || '';
    if (!questionId) {
      continue;
    }
    const value = (formState[questionId] || '').trim();
    if (!value) {
      continue;
    }
    answers[questionId] = {
      answers: [value],
    };
  }

  return { answers };
}

function WorkspaceBrowser(props: {
  token: string;
  selectedPath: string;
  onSelectPath: (path: string) => void;
}) {
  const { token, selectedPath, onSelectPath } = props;
  const workspace = useAppStore((state) => state.workspace);
  const setWorkspaceLoading = useAppStore((state) => state.setWorkspaceLoading);
  const setWorkspaceReady = useAppStore((state) => state.setWorkspaceReady);
  const setWorkspaceError = useAppStore((state) => state.setWorkspaceError);
  const setWorkspaceListing = useAppStore((state) => state.setWorkspaceListing);
  const [nextFolderName, setNextFolderName] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    setWorkspaceLoading(selectedPath);
    Promise.all([
      getWorkspaceShortcuts(token),
      getWorkspaceListing(token, selectedPath),
    ])
      .then(([shortcuts, listing]) => {
        if (!cancelled) {
          setWorkspaceReady(shortcuts, listing);
          if (!selectedPath) {
            onSelectPath(listing.path);
          }
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setWorkspaceError(error.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onSelectPath, selectedPath, setWorkspaceError, setWorkspaceLoading, setWorkspaceReady, token]);

  const currentPath = workspace.listing?.path || selectedPath;

  return (
    <div className="workspace-browser">
      <div className="section-head">
        <strong>Workspace</strong>
        <span className="muted">{workspace.status}</span>
      </div>
      {workspace.error ? <div className="status error">{workspace.error}</div> : null}
      <div className="workspace-path">{currentPath || workspace.shortcuts?.preferredPath || 'No path selected'}</div>
      <div className="workspace-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={!workspace.shortcuts?.preferredPath}
          onClick={() => {
            const nextPath = workspace.shortcuts?.preferredPath || '';
            onSelectPath(nextPath);
            setWorkspaceLoading(nextPath);
            void getWorkspaceListing(token, nextPath)
              .then((listing) => setWorkspaceListing(listing))
              .catch((error: Error) => setWorkspaceError(error.message));
          }}
        >
          Preferred
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!workspace.listing?.parentPath}
          onClick={() => {
            const nextPath = workspace.listing?.parentPath || '';
            onSelectPath(nextPath);
            setWorkspaceLoading(nextPath);
            void getWorkspaceListing(token, nextPath)
              .then((listing) => setWorkspaceListing(listing))
              .catch((error: Error) => setWorkspaceError(error.message));
          }}
        >
          Up
        </button>
      </div>
      <div className="workspace-list">
        {(workspace.listing?.entries || []).map((entry) => (
          <button
            key={entry.path}
            type="button"
            className="workspace-entry"
            onClick={() => {
              onSelectPath(entry.path);
              setWorkspaceLoading(entry.path);
              void getWorkspaceListing(token, entry.path)
                .then((listing) => setWorkspaceListing(listing))
                .catch((error: Error) => setWorkspaceError(error.message));
            }}
          >
            <strong>{entry.name}</strong>
            <span>{entry.path}</span>
          </button>
        ))}
      </div>
      <div className="workspace-create">
        <input
          className="token-input"
          placeholder="New folder name"
          value={nextFolderName}
          onChange={(event) => setNextFolderName(event.target.value)}
        />
        <button
          type="button"
          className="secondary-button"
          disabled={!currentPath || !nextFolderName.trim()}
          onClick={() => {
            void createWorkspaceDirectory(token, {
              parentPath: currentPath,
              folderName: nextFolderName.trim(),
            })
              .then((result) => {
                setNextFolderName('');
                onSelectPath(result.path);
                return getWorkspaceListing(token, currentPath);
              })
              .then((listing) => setWorkspaceListing(listing))
              .catch((error: Error) => setWorkspaceError(error.message));
          }}
        >
          Create folder
        </button>
      </div>
    </div>
  );
}

function SessionRail() {
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

function TimelineWorkspace() {
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const entries = useAppStore((state) => activeSessionId ? (state.timeline.entriesBySessionId[activeSessionId] || []) : []);
  const health = useAppStore((state) => state.health.data);
  const error = useAppStore((state) => state.health.error || state.connection.error || '');
  const turnState = useAppStore((state) => activeSessionId ? state.turns.activeBySessionId[activeSessionId] : undefined);
  const usage = useAppStore((state) => activeSessionId ? state.tokenUsage.bySessionId[activeSessionId] : null);

  return (
    <section className="panel timeline-workspace">
      <div className="panel-title">Timeline</div>
      <div className="panel-body timeline-body">
        {activeSessionId ? (
          <div className="timeline-toolbar">
            <div className={`status-chip${turnState?.active ? ' running' : ''}`}>
              {turnState?.active ? 'Running' : 'Idle'}
            </div>
            <div className="token-usage">
              <span className="label">Tokens</span>
              <strong>{formatTokenUsageValue(usage)}</strong>
            </div>
          </div>
        ) : null}
        {error ? <div className="status error">{error}</div> : null}
        {!error && !health ? <div className="status">Loading health…</div> : null}
        {activeSessionId && entries.length ? (
          <div className="timeline-list">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className={`timeline-entry${entry.role ? ` ${entry.role}` : ''}${entry.type ? ` type-${entry.type}` : ''}`}
              >
                <div className="timeline-entry-head">
                  <div className="label">{formatTimelineLabel(entry)}</div>
                  {entry.status ? <div className={`badge${entry.status === 'running' ? ' warning' : ''}`}>{entry.status}</div> : null}
                </div>
                <div className="timeline-entry-text">{summarizeTimelineEntry(entry)}</div>
                {entry.meta?.length ? (
                  <div className="timeline-entry-meta">
                    {entry.meta.map((line, index) => <span key={`${entry.id}-meta-${index}`}>{line}</span>)}
                  </div>
                ) : null}
                {entry.changes?.length ? (
                  <div className="timeline-entry-changes">
                    {entry.changes.map((change, index) => (
                      <span key={`${entry.id}-change-${index}`} className="timeline-chip">
                        {[change.kind, change.path].filter(Boolean).join(': ')}
                      </span>
                    ))}
                  </div>
                ) : null}
                {entry.patch ? <pre className="timeline-entry-pre">{entry.patch}</pre> : null}
              </article>
            ))}
          </div>
        ) : null}
        {activeSessionId && !entries.length ? (
          <div className="empty-state">
            <strong>No timeline yet</strong>
            <span>Submit a prompt to start the first turn in this session.</span>
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

type InspectorPanelProps = {
  onRespond: (request: ServerRequestItem, response: unknown) => void;
};

function InspectorPanel({ onRespond }: InspectorPanelProps) {
  const health = useAppStore((state) => state.health.data);
  const connection = useAppStore((state) => state.connection);
  const token = useAppStore((state) => state.auth.token);
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const approvals = useAppStore((state) => state.approvals.items);

  const visibleApprovals = useMemo(
    () => activeSessionId
      ? approvals.filter((item) => item.threadId === activeSessionId)
      : approvals,
    [activeSessionId, approvals],
  );
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  return (
    <aside className="panel inspector-panel">
      <div className="panel-title">Inspector</div>
      <div className="panel-body inspector-body">
        <div className="inspector-card-grid">
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
          <div className="inspector-card">
            <span className="label">Approvals</span>
            <strong>{visibleApprovals.length}</strong>
          </div>
        </div>
        <div className="approval-section">
          <div className="section-head">
            <strong>Pending approvals</strong>
            <span className="muted">{activeSessionId ? 'Current session' : 'All sessions'}</span>
          </div>
          {visibleApprovals.length ? (
            <div className="approval-list">
              {visibleApprovals.map((request) => (
                <article key={request.requestId} className="approval-item">
                  <div className="approval-item-row">
                    <strong>{request.kind || 'request'}</strong>
                    <span className={`badge${request.status === 'submitting' ? '' : ' warning'}`}>
                      {request.status || 'pending'}
                    </span>
                  </div>
                  <div className="approval-summary">{buildApprovalSummary(request)}</div>
                  <div className="approval-meta">
                    <span>{request.threadId || 'global'}</span>
                    <span>{request.requestId}</span>
                  </div>
                  {request.kind === 'user_input' && request.questions?.length ? (
                    <div className="approval-question-list">
                      {request.questions.map((question) => {
                        const questionId = question.id || '';
                        const options = Array.isArray(question.options) ? question.options : [];
                        const currentValue = questionAnswers[`${request.requestId}:${questionId}`] || '';
                        return (
                          <div key={`${request.requestId}:${questionId}`} className="approval-question-card">
                            <strong>{question.header || question.question || questionId}</strong>
                            {question.question && question.header !== question.question ? <span className="muted">{question.question}</span> : null}
                            {options.length ? (
                              <div className="approval-option-list">
                                {options.map((option) => {
                                  const label = option.label || '';
                                  return (
                                    <label key={`${request.requestId}:${questionId}:${label}`} className="approval-option-row">
                                      <input
                                        type="radio"
                                        name={`${request.requestId}:${questionId}`}
                                        value={label}
                                        checked={currentValue === label}
                                        disabled={request.status === 'submitting'}
                                        onChange={(event) => setQuestionAnswers((state) => ({
                                          ...state,
                                          [`${request.requestId}:${questionId}`]: event.target.value,
                                        }))}
                                      />
                                      <span>{label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : null}
                            {(question.isOther || question.isSecret || !options.length) ? (
                              question.isSecret ? (
                                <input
                                  type="password"
                                  className="token-input"
                                  placeholder="填写回答"
                                  value={currentValue}
                                  disabled={request.status === 'submitting'}
                                  onChange={(event) => setQuestionAnswers((state) => ({
                                    ...state,
                                    [`${request.requestId}:${questionId}`]: event.target.value,
                                  }))}
                                />
                              ) : (
                                <textarea
                                  className="composer-input approval-textarea"
                                  placeholder="填写回答"
                                  value={currentValue}
                                  disabled={request.status === 'submitting'}
                                  onChange={(event) => setQuestionAnswers((state) => ({
                                    ...state,
                                    [`${request.requestId}:${questionId}`]: event.target.value,
                                  }))}
                                />
                              )
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="approval-actions">
                    {request.kind === 'user_input' && request.questions?.length ? (
                      <button
                        type="button"
                        className="primary-button small"
                        disabled={request.status === 'submitting'}
                        onClick={() => {
                          const stateForRequest = Object.fromEntries(
                            Object.entries(questionAnswers)
                              .filter(([key]) => key.startsWith(`${request.requestId}:`))
                              .map(([key, value]) => [key.slice(request.requestId.length + 1), value]),
                          );
                          onRespond(request, buildUserInputResponse(request, stateForRequest));
                        }}
                      >
                        Submit answers
                      </button>
                    ) : null}
                    {request.kind !== 'user_input' ? (request.availableDecisions?.length
                      ? request.availableDecisions
                      : ['accept', 'decline']).map((decision, index) => {
                        const key = typeof decision === 'string' ? decision : JSON.stringify(decision);
                        const isPrimary = index === 0;
                        const response = typeof decision === 'string' ? { decision } : decision;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={isPrimary ? 'primary-button small' : 'secondary-button'}
                            disabled={request.status === 'submitting'}
                            onClick={() => onRespond(request, response)}
                          >
                            {getDecisionLabel(decision)}
                          </button>
                        );
                    }) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <strong>No pending approvals</strong>
              <span>Requests from the server will appear here.</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

type ComposerDockProps = {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  busy: boolean;
  composerError: string;
  workspacePath: string;
  setWorkspacePath: (value: string) => void;
};

function ComposerDock({ draft, setDraft, submit, busy, composerError, workspacePath, setWorkspacePath }: ComposerDockProps) {
  const token = useAppStore((state) => state.auth.token);
  const setToken = useAppStore((state) => state.setToken);
  const activeSessionId = useAppStore((state) => state.sessions.activeSessionId);
  const connectionStatus = useAppStore((state) => state.connection.status);
  const attachments = useAppStore((state) => {
    const key = activeSessionId || '__new__';
    return state.composer.attachmentsBySessionId[key] || [];
  });
  const addAttachment = useAppStore((state) => state.addAttachment);
  const removeAttachment = useAppStore((state) => state.removeAttachment);

  return (
    <footer className="panel composer-dock">
      <div className="panel-title">Composer</div>
      <div className="panel-body composer-body">
        <div className="composer-topline">
          <input
            className="token-input"
            placeholder="WebSocket token"
            value={token}
            onChange={(event) => {
              const nextToken = writeStoredToken(event.target.value);
              setToken(nextToken);
            }}
          />
          <div className={`status-chip small${connectionStatus === 'connected' ? '' : ' warning'}`}>
            {connectionStatus}
          </div>
        </div>
        <textarea
          className="composer-input"
          placeholder={activeSessionId ? 'Type a prompt…' : 'Type a prompt to create a new session…'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
        />
        {!activeSessionId ? (
          <input
            className="token-input"
            placeholder="Workspace path for new session"
            value={workspacePath}
            onChange={(event) => setWorkspacePath(event.target.value)}
          />
        ) : null}
        <div className="attachment-toolbar">
          <label className="secondary-button file-button">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || !token) {
                  return;
                }
                const targetThreadId = activeSessionId || '__new__';
                void uploadImage(token, file)
                  .then((result) => {
                    addAttachment(targetThreadId, {
                      ...result,
                      previewUrl: URL.createObjectURL(file),
                    });
                  });
                event.currentTarget.value = '';
              }}
            />
            Upload image
          </label>
        </div>
        {attachments.length ? (
          <div className="attachment-list">
            {attachments.map((attachment) => (
              <article key={attachment.id} className="attachment-card">
                <img src={attachment.previewUrl} alt={attachment.name} className="attachment-preview" />
                <div className="attachment-meta">
                  <strong>{attachment.name}</strong>
                  <span>{attachment.contentType}</span>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeAttachment(activeSessionId || '__new__', attachment.id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        ) : null}
        <div className="composer-actions">
          <div className="composer-hint">
            <span className="muted">
              {activeSessionId ? 'Send to active session' : 'Will create a new session first'}
            </span>
            {composerError ? <span className="composer-error">{composerError}</span> : null}
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={busy || !draft.trim()}
          >
            {busy ? 'Sending…' : activeSessionId ? 'Send' : 'Create & send'}
          </button>
        </div>
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
  const connectionStatus = useAppStore((state) => state.connection.status);
  const appendTimelineEntry = useAppStore((state) => state.appendTimelineEntry);
  const clearAttachments = useAppStore((state) => state.clearAttachments);
  const workspaceSelectedPath = useAppStore((state) => state.workspace.selectedPath);

  const [draft, setDraft] = useState('');
  const [queuedPrompt, setQueuedPrompt] = useState('');
  const [composerError, setComposerError] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');

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

  useEffect(() => {
    if (!queuedPrompt.trim() || !activeSessionId || connectionStatus !== 'connected') {
      return;
    }
    const sent = socketClient.send({
      type: 'turn_send',
      threadId: activeSessionId,
      text: queuedPrompt,
      attachments: (useAppStore.getState().composer.attachmentsBySessionId[activeSessionId] || []).map((item) => ({
        path: item.filePath,
        name: item.name,
      })),
    });
    if (sent) {
      appendTimelineEntry(activeSessionId, {
        id: `local-user-${Date.now()}`,
        type: 'message',
        role: 'user',
        text: queuedPrompt,
      });
      setQueuedPrompt('');
      setComposerError('');
      setDraft('');
      clearAttachments(activeSessionId);
    } else {
      setComposerError('Failed to send the queued prompt.');
    }
  }, [activeSessionId, clearAttachments, connectionStatus, queuedPrompt, socketClient, appendTimelineEntry]);

  function submitComposer() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    if (!token) {
      setComposerError('Configure a WebSocket token first.');
      return;
    }
    if (connectionStatus !== 'connected') {
      setComposerError('WebSocket is not connected yet.');
      return;
    }

    setComposerError('');

    if (!activeSessionId) {
      const created = socketClient.send({
        type: 'tab_create',
        name: buildSessionNameFromPrompt(text),
        cwd: workspacePath || workspaceSelectedPath || '',
      });
      if (!created) {
        setComposerError('Failed to create session.');
        return;
      }
      setQueuedPrompt(text);
      return;
    }

    const sent = socketClient.send({
      type: 'turn_send',
      threadId: activeSessionId,
      text,
      attachments: (useAppStore.getState().composer.attachmentsBySessionId[activeSessionId] || []).map((item) => ({
        path: item.filePath,
        name: item.name,
      })),
    });

    if (!sent) {
      setComposerError('Failed to send prompt.');
      return;
    }

    appendTimelineEntry(activeSessionId, {
      id: `local-user-${Date.now()}`,
      type: 'message',
      role: 'user',
      text,
    });
    setDraft('');
    clearAttachments(activeSessionId);
  }

  function respondApproval(request: ServerRequestItem, response: unknown) {
    const sent = socketClient.send({
      type: 'server_request_respond',
      requestId: request.requestId,
      response,
    });

    if (!sent) {
      setComposerError('Failed to respond to approval request.');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Rebuild</div>
          <h1>Codex Remote Console</h1>
        </div>
        <div className="topbar-meta">Minimal interactive loop on new web shell</div>
      </header>
      <main className="workspace-grid">
        <SessionRail />
        <TimelineWorkspace />
        <InspectorPanel onRespond={respondApproval} />
      </main>
      <section className="panel workspace-panel">
        <div className="panel-title">Workspace Browser</div>
        <div className="panel-body">
          <WorkspaceBrowser
            token={token}
            selectedPath={workspacePath || workspaceSelectedPath}
            onSelectPath={setWorkspacePath}
          />
        </div>
      </section>
      <ComposerDock
        draft={draft}
        setDraft={setDraft}
        submit={submitComposer}
        busy={Boolean(queuedPrompt)}
        composerError={composerError}
        workspacePath={workspacePath}
        setWorkspacePath={setWorkspacePath}
      />
    </div>
  );
}
