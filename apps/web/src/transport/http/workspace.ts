import type {
  CreateWorkspaceDirectoryRequest,
  CreateWorkspaceDirectoryResponse,
  WorkspaceListResponse,
  WorkspaceShortcutsResponse,
} from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';
import { fetchJson } from './fetchJson.js';

export function getWorkspaceShortcuts(): Promise<WorkspaceShortcutsResponse> {
  return fetchJson<WorkspaceShortcutsResponse>(buildApiUrl('/api/workspace/shortcuts'));
}

export function getWorkspaceListing(selectedPath?: string): Promise<WorkspaceListResponse> {
  const url = new URL(buildApiUrl('/api/workspace/list'));
  if (selectedPath) {
    url.searchParams.set('path', selectedPath);
  }
  return fetchJson<WorkspaceListResponse>(url.toString());
}

export function createWorkspaceDirectory(
  payload: CreateWorkspaceDirectoryRequest,
): Promise<CreateWorkspaceDirectoryResponse> {
  return fetchJson<CreateWorkspaceDirectoryResponse>(buildApiUrl('/api/workspace/create-directory'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
