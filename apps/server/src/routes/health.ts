import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@codex-remote/protocol';

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => ({
    status: app.runtimeState.isShuttingDown ? 'shutting_down' : 'ok',
    tabs: 0,
    websocketClients: app.runtimeState.websocketClientCount,
    uptimeSec: Math.floor((Date.now() - app.runtimeState.startedAt) / 1000),
  }));
}
