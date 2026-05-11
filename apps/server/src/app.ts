import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { ServerConfig } from './config/env.js';
import { buildRequireAuth, buildTokenVerifier } from './plugins/auth.js';
import { registerRoutes } from './routes/index.js';
import { createRuntimeState } from './state/runtime-state.js';
import { registerWsGateway } from './ws/gateway.js';

export async function createApp(config: ServerConfig) {
  const app = Fastify({
    logger: true,
  });

  app.decorate('config', config);
  app.decorate('runtimeState', createRuntimeState());

  await app.register(websocket);

  const verifyRequestToken = buildTokenVerifier(config.wsToken);
  const requireAuth = buildRequireAuth(verifyRequestToken);

  app.decorate('verifyRequestToken', verifyRequestToken);
  app.decorate('requireAuth', requireAuth);

  await registerRoutes(app);
  await registerWsGateway(app);

  return app;
}
