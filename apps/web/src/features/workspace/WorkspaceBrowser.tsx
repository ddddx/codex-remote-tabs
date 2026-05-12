import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore.js';
import { createWorkspaceDirectory, getWorkspaceListing, getWorkspaceShortcuts } from '../../transport/http/workspace.js';

type WorkspaceBrowserProps = {
  token: string;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  embedded?: boolean;
};

export function WorkspaceBrowser(props: WorkspaceBrowserProps) {
  const { token, selectedPath, onSelectPath, embedded = false } = props;
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
        if (cancelled) {
          return;
        }
        setWorkspaceReady(shortcuts, listing);
        if (!selectedPath) {
          onSelectPath(listing.path);
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

  function refreshListing(nextPath: string) {
    onSelectPath(nextPath);
    setWorkspaceLoading(nextPath);
    void getWorkspaceListing(token, nextPath)
      .then((listing) => setWorkspaceListing(listing))
      .catch((error: Error) => setWorkspaceError(error.message));
  }

  const browserNode = (
    <>
      <div className="workspace-browser-path">{currentPath || workspace.shortcuts?.preferredPath || '尚未选择路径'}</div>
      <div className="workspace-browser-list">
        {(workspace.listing?.entries || []).length ? (workspace.listing?.entries || []).map((entry) => (
          <button
            key={entry.path}
            className="workspace-browser-item"
            type="button"
            onClick={() => refreshListing(entry.path)}
          >
            <span className="workspace-browser-item-icon">📁</span>
            <span className="workspace-browser-item-label">{entry.name}</span>
          </button>
        )) : (
          <div className="workspace-browser-item empty">当前目录为空</div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <>
        {workspace.error ? <div className="status error">{workspace.error}</div> : null}
        <div className="workspace-shortcut-panel">
          <label className="modal-label workspace-shortcut-label-block" htmlFor="workspaceShortcutSelect">快捷路径</label>
          <select
            id="workspaceShortcutSelect"
            className="modal-input workspace-shortcut-select"
            value=""
            onChange={(event) => {
              const value = event.target.value.trim();
              if (value) {
                refreshListing(value);
              }
            }}
          >
            <option value="">请选择快捷路径</option>
            {[
              workspace.shortcuts?.preferredPath,
              workspace.shortcuts?.projectRoot,
              workspace.shortcuts?.desktopPath,
              workspace.shortcuts?.lastUsedPath,
              ...(workspace.shortcuts?.roots || []),
            ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="workspace-browser">{browserNode}</div>
        <div className="session-workspace-actions" style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!workspace.listing?.parentPath}
            onClick={() => refreshListing(workspace.listing?.parentPath || '')}
          >
            上级目录
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!currentPath}
            onClick={() => refreshListing(currentPath || '')}
          >
            刷新
          </button>
          <input
            className="modal-input"
            style={{ minWidth: 0, flex: 1 }}
            placeholder="新文件夹名称"
            value={nextFolderName}
            onChange={(event) => setNextFolderName(event.target.value)}
          />
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!currentPath || !nextFolderName.trim()}
            onClick={() => {
              void createWorkspaceDirectory(token, {
                parentPath: currentPath,
                folderName: nextFolderName.trim(),
              })
                .then((result) => {
                  setNextFolderName('');
                  refreshListing(result.path);
                })
                .catch((error: Error) => setWorkspaceError(error.message));
            }}
          >
            新建文件夹
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="workspace-browser-panel">
      {workspace.error ? <div className="status error">{workspace.error}</div> : null}
      <div className="session-workspace-actions" style={{ marginTop: 0, marginBottom: 12 }}>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!workspace.shortcuts?.preferredPath}
          onClick={() => refreshListing(workspace.shortcuts?.preferredPath || '')}
        >
          常用目录
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!workspace.listing?.parentPath}
          onClick={() => refreshListing(workspace.listing?.parentPath || '')}
        >
          上级目录
        </button>
      </div>
      <div className="workspace-browser">{browserNode}</div>
    </div>
  );
}
