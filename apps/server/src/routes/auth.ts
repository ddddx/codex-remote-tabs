import type { FastifyInstance } from 'fastify';
import type {
  AuthSessionCreateResponse,
  AuthSessionDeleteResponse,
  AuthSessionListResponse,
} from '@codex-remote/protocol';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/session', async (request, reply): Promise<AuthSessionCreateResponse | void> => {
    if (!app.verifyRequestToken(request)) {
      reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
      return;
    }
    const payload = (request.body || {}) as { token?: string; deviceName?: string; deviceId?: string };
    const existingSession = app.services.auth.authorizeCookie(typeof request.headers.cookie === 'string' ? request.headers.cookie : undefined);
    const reused = existingSession ? app.services.auth.reuseSession(existingSession.sessionId) : null;
    const created = reused || app.services.auth.createSession({
      token: payload.token || '',
      deviceName: payload.deviceName,
      deviceId: payload.deviceId,
    });
    reply.header('set-cookie', created.cookie);
    return {
      ok: true,
      session: created.session,
    };
  });

  app.get('/api/auth/sessions', { preHandler: app.requireAuth }, async (request): Promise<AuthSessionListResponse> => ({
    sessions: app.services.auth.listSessions(request.authSessionId),
  }));

  app.delete('/api/auth/sessions', { preHandler: app.requireAuth }, async (_request, reply): Promise<AuthSessionDeleteResponse> => {
    const removedSessionIds = app.services.auth.revokeAllSessions();
    reply.header('set-cookie', app.services.auth.buildClearCookieValue());
    app.services.auth.rotateServerToken();
    return {
      ok: true,
      removedSessionIds,
    };
  });
}
