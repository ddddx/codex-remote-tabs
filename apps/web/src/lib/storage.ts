const TOKEN_STORAGE_KEY = 'codex-remote-ws-token';

export function readStoredToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function writeStoredToken(token: string): string {
  const normalized = typeof token === 'string' ? token.trim() : '';
  try {
    if (normalized) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
  return normalized;
}
