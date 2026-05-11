const TOKEN_STORAGE_KEY = 'codex-remote-ws-token';

function readTokenFromUrl(): string {
  try {
    const url = new URL(window.location.href);
    const token = (url.searchParams.get('token') || '').trim();
    if (!token) {
      return '';
    }
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
    return token;
  } catch {
    return '';
  }
}

export function readStoredToken(): string {
  const urlToken = readTokenFromUrl();
  if (urlToken) {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
    } catch {
      // Ignore storage failures.
    }
    return urlToken;
  }

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
