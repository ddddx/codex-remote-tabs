import type { FastifyInstance } from 'fastify';
import type { CodexOptionsResponse } from '@codex-remote/protocol';

export async function registerCodexRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/codex/options', { preHandler: app.requireAuth }, async (request): Promise<CodexOptionsResponse> => {
    return app.services.codexOptions.listOptions(request.query as { cwd?: string });
  });
}
