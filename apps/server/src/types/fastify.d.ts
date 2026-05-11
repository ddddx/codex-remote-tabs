import type { ServerConfig } from '../config/env.js';
import type { RuntimeState } from '../state/runtime-state.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: ServerConfig;
    runtimeState: RuntimeState;
  }
}
