import type {
  CreateWorkspaceDirectoryRequest,
  CreateWorkspaceDirectoryResponse,
  WorkspaceListResponse,
  WorkspaceShortcutsResponse,
} from '@codex-remote/protocol';
import {
  createWorkspaceDirectoryRequestSchema,
  workspaceListQuerySchema,
} from '@codex-remote/protocol';
import type { FastifyInstance } from 'fastify';

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;

export function createWorkspaceService(app: FastifyInstance) {
  return {
    getShortcuts(): WorkspaceShortcutsResponse {
      return app.workspaceManager.getShortcuts();
    },

    listDirectory(input: { path?: string }): WorkspaceListResponse {
      const query = workspaceListQuerySchema.parse(input);
      return app.workspaceManager.listDirectory(query.path);
    },

    createDirectory(input: CreateWorkspaceDirectoryRequest): CreateWorkspaceDirectoryResponse {
      const body = createWorkspaceDirectoryRequestSchema.parse(input);
      return {
        path: app.workspaceManager.createDirectory(body.parentPath, body.folderName),
      };
    },
  };
}
