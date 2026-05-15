export function isAuthorizedWsSession(sessionId: string | undefined): boolean {
  return typeof sessionId === 'string' && sessionId.trim().length > 0;
}
