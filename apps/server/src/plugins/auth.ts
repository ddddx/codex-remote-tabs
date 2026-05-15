import type { FastifyReply, FastifyRequest } from 'fastify';

export function buildTokenVerifier(readToken: () => string) {
  return function verifyRequestToken(request: FastifyRequest): boolean {
    const wsToken = readToken();
    if (!wsToken) {
      return true;
    }

    const headerToken = typeof request.headers['x-codex-remote-token'] === 'string'
      ? request.headers['x-codex-remote-token']
      : '';

    return headerToken === wsToken;
  };
}

export function buildRequireAuth(
  authorizeCookie: (cookieHeader: string | undefined) => { sessionId: string } | null,
) {
  return async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const session = authorizeCookie(typeof request.headers.cookie === 'string' ? request.headers.cookie : undefined);
    if (session) {
      (request as FastifyRequest & { authSessionId?: string }).authSessionId = session.sessionId;
      return;
    }

    reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  };
}
