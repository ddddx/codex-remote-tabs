import type { FastifyInstance } from 'fastify';
import { registerHealthRoute } from './health.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerHealthRoute(app);
}
