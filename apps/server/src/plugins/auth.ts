import type { FastifyReply, FastifyRequest } from 'fastify';

export function buildTokenVerifier(wsToken: string) {
  return function verifyRequestToken(request: FastifyRequest): boolean {
    if (!wsToken) {
      return true;
    }

    const queryToken = typeof (request.query as Record<string, unknown> | undefined)?.token === 'string'
      ? (request.query as Record<string, string>).token
      : '';
    const headerToken = typeof request.headers['x-codex-remote-token'] === 'string'
      ? request.headers['x-codex-remote-token']
      : '';

    return queryToken === wsToken || headerToken === wsToken;
  };
}

export function buildRequireAuth(verifyRequestToken: (request: FastifyRequest) => boolean) {
  return async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (verifyRequestToken(request)) {
      return;
    }

    reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  };
}
