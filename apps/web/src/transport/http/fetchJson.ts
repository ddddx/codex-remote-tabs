export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `request failed: ${response.status}`;
    try {
      const payload = await response.json() as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Ignore body parse failures.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
