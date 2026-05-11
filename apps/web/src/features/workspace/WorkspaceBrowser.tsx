import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore.js';
import { createWorkspaceDirectory, getWorkspaceListing, getWorkspaceShortcuts } from '../../transport/http/workspace.js';

type WorkspaceBrowserProps = {
  token: string;
  selectedPath: string;
  onSelectPath: (path: string) => void;
};

export function WorkspaceBrowser(props: WorkspaceBrowserProps) {
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
        <strong>工作区</strong>
        <span className="muted">{workspace.status}</span>
      </div>
      {!token ? <div className="status">请先配置 WebSocket 令牌，再加载工作区。</div> : null}
      {workspace.error ? <div className="status error">{workspace.error}</div> : null}
      <div className="workspace-path">{currentPath || workspace.shortcuts?.preferredPath || '尚未选择路径'}</div>
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
          常用目录
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
          上一级
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
          placeholder="新文件夹名称"
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
          新建文件夹
        </button>
      </div>
    </div>
  );
}
