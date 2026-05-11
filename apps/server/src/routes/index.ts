import type { FastifyInstance } from 'fastify';
import { registerHealthRoute } from './health.js';
import { registerWorkspaceRoutes } from './workspace.js';
import { registerUploadRoutes } from './uploads.js';
import { registerCodexRoutes } from './codex.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerHealthRoute(app);
  await registerWorkspaceRoutes(app);
  await registerUploadRoutes(app);
  await registerCodexRoutes(app);
}
