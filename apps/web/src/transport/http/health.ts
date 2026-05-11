import type { HealthResponse } from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';
import { fetchJson } from './fetchJson.js';

export function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>(buildApiUrl('/health'));
}
