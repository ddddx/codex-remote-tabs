import type { ServerConfig } from '../config/env.js';
import type { RuntimeState } from '../state/runtime-state.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

type WorkspaceManagerLike = {
  getShortcuts: () => {
    projectRoot: string;
    desktopPath: string;
    lastUsedPath: string;
    preferredPath: string;
    roots: string[];
  };
  listDirectory: (path?: string) => {
    path: string;
    parentPath: string;
    entries: Array<{ name: string; path: string }>;
  };
  createDirectory: (parentPath: string, folderName: string) => string;
  resolveWorkspacePath: (inputPath?: string) => string;
};

type CodexClientLike = {
  start: () => Promise<void>;
  listModels: (options?: { includeHidden?: boolean; limit?: number }) => Promise<Array<Record<string, unknown>>>;
  readConfig: (options?: { cwd?: string }) => Promise<{ config?: Record<string, unknown> }>;
};

declare module 'fastify' {
  interface FastifyInstance {
    config: ServerConfig;
    runtimeState: RuntimeState;
    verifyRequestToken: (request: FastifyRequest) => boolean;
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    workspaceManager: WorkspaceManagerLike;
    codexClient: CodexClientLike;
  }
}
