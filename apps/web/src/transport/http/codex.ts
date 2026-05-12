import type { CodexOptionsResponse } from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';
import { fetchJson } from './fetchJson.js';

function buildAuthHeaders(token: string): HeadersInit {
  return token ? { 'x-codex-remote-token': token } : {};
}

export function getCodexOptions(token: string, cwd?: string): Promise<CodexOptionsResponse> {
  const url = new URL(buildApiUrl('/api/codex/options'));
  if (cwd) {
    url.searchParams.set('cwd', cwd);
  }
  return fetchJson<CodexOptionsResponse>(url.toString(), {
    headers: buildAuthHeaders(token),
  });
}
