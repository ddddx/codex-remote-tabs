import type {
  CreateWorkspaceDirectoryRequest,
  CreateWorkspaceDirectoryResponse,
  WorkspaceListResponse,
  WorkspaceShortcutsResponse,
} from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';
import { fetchJson } from './fetchJson.js';

function buildAuthHeaders(token: string): HeadersInit {
  return token ? { 'x-codex-remote-token': token } : {};
}

export function getWorkspaceShortcuts(token: string): Promise<WorkspaceShortcutsResponse> {
  return fetchJson<WorkspaceShortcutsResponse>(buildApiUrl('/api/workspace/shortcuts'), {
    headers: buildAuthHeaders(token),
  });
}

export function getWorkspaceListing(token: string, selectedPath?: string): Promise<WorkspaceListResponse> {
  const url = new URL(buildApiUrl('/api/workspace/list'));
  if (selectedPath) {
    url.searchParams.set('path', selectedPath);
  }
  return fetchJson<WorkspaceListResponse>(url.toString(), {
    headers: buildAuthHeaders(token),
  });
}

export function createWorkspaceDirectory(
  token: string,
  payload: CreateWorkspaceDirectoryRequest,
): Promise<CreateWorkspaceDirectoryResponse> {
  return fetchJson<CreateWorkspaceDirectoryResponse>(buildApiUrl('/api/workspace/create-directory'), {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });
}
