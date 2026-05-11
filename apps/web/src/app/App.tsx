import { useEffect, useMemo, useState } from 'react';
import { readStoredToken } from '../lib/storage.js';
import { mapServerMessageToStore, useAppStore, type ServerRequestItem } from '../store/appStore.js';
import { getHealth } from '../transport/http/health.js';
import { createSocketClient } from '../transport/ws/createSocketClient.js';
import { buildSessionNameFromPrompt } from './view-helpers.js';
import { ComposerDock } from '../features/composer/ComposerDock.js';
import { InspectorPanel } from '../features/inspector/InspectorPanel.js';
import { SessionRail } from '../features/sessions/SessionRail.js';
import { TimelineWorkspace } from '../features/timeline/TimelineWorkspace.js';
import { WorkspaceBrowser } from '../features/workspace/WorkspaceBrowser.js';

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
        createdAt: Date.now(),
      });
      setQueuedPrompt('');
      setComposerError('');
      setDraft('');
      clearAttachments(activeSessionId);
    } else {
      setComposerError('Failed to send the queued prompt.');
    }
  }, [activeSessionId, appendTimelineEntry, clearAttachments, connectionStatus, queuedPrompt, socketClient]);

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
      createdAt: Date.now(),
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
          <h1>Codex 远程控制台</h1>
        </div>
        <div className="topbar-meta">会话时间线、内联审批和工作区操作</div>
      </header>
      <main className="workspace-grid">
        <SessionRail />
        <TimelineWorkspace />
        <InspectorPanel onRespond={respondApproval} />
      </main>
      <section className="panel workspace-panel">
        <div className="panel-title">工作区浏览器</div>
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
