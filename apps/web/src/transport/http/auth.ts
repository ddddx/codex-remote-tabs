import type {
  AuthSessionCreateResponse,
  AuthSessionDeleteResponse,
  AuthSessionListResponse,
} from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';
import { fetchJson } from './fetchJson.js';

function buildAuthHeaders(token: string): HeadersInit {
  return token ? { 'x-codex-remote-token': token } : {};
}

export function createAuthSession(token: string, deviceName: string, deviceId: string): Promise<AuthSessionCreateResponse> {
  return fetchJson<AuthSessionCreateResponse>(buildApiUrl('/api/auth/session'), {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({
      token,
      deviceName,
      deviceId,
    }),
  });
}

export function listAuthSessions(): Promise<AuthSessionListResponse> {
  return fetchJson<AuthSessionListResponse>(buildApiUrl('/api/auth/sessions'));
}

export function revokeAuthSession(): Promise<AuthSessionDeleteResponse> {
  return fetchJson<AuthSessionDeleteResponse>(buildApiUrl('/api/auth/sessions'), {
    method: 'DELETE',
  });
}
