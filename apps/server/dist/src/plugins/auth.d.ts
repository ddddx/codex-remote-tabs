import type { FastifyReply, FastifyRequest } from 'fastify';
export declare function buildTokenVerifier(wsToken: string): (request: FastifyRequest) => boolean;
export declare function buildRequireAuth(verifyRequestToken: (request: FastifyRequest) => boolean): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
