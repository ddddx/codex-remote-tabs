import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import path from 'node:path';
import { createSqliteDatabase, createSqliteRepositories, importLegacyState } from '@codex-remote/adapters';
import type { ServerConfig } from './config/env.js';
import { createLegacyCodexClient, createLegacyWorkspaceManager } from './legacy.js';
import { buildRequireAuth, buildTokenVerifier } from './plugins/auth.js';
import { registerRoutes } from './routes/index.js';
import { createRuntimeState } from './state/runtime-state.js';
import { registerWsGateway } from './ws/gateway.js';

export async function createApp(config: ServerConfig) {
  const app = Fastify({
    logger: true,
  });
  const sqlite = createSqliteDatabase({
    filePath: path.resolve(process.cwd(), config.sqliteFile),
  });
  importLegacyState(sqlite);
  const repositories = createSqliteRepositories(sqlite);

  app.decorate('config', config);
  app.decorate('runtimeState', createRuntimeState());
  app.decorate('sqlite', sqlite);
  app.decorate('repositories', repositories);
  app.decorate('workspaceManager', createLegacyWorkspaceManager());
  app.decorate('codexClient', createLegacyCodexClient());
  app.runtimeState.repositories = repositories as any;

  await app.register(websocket);

  const verifyRequestToken = buildTokenVerifier(config.wsToken);
  const requireAuth = buildRequireAuth(verifyRequestToken);

  app.decorate('verifyRequestToken', verifyRequestToken);
  app.decorate('requireAuth', requireAuth);

  await registerRoutes(app);
  await registerWsGateway(app);

  return app;
}
