function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw || fallback;
}

export const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined,
  'http://127.0.0.1:18637'
);

export function buildApiUrl(pathname: string): string {
  return new URL(pathname, apiBaseUrl).toString();
}

export function buildWsUrl(token?: string): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  const base = explicit?.trim()
    || new URL('/ws', apiBaseUrl.replace(/^http/, 'ws')).toString();
  const url = new URL(base);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}
