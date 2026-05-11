import type { FastifyInstance } from 'fastify';
import type {
  CreateWorkspaceDirectoryRequest,
  CreateWorkspaceDirectoryResponse,
  WorkspaceListResponse,
  WorkspaceShortcutsResponse,
} from '@codex-remote/protocol';

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/workspace/shortcuts', { preHandler: app.requireAuth }, async (): Promise<WorkspaceShortcutsResponse> => {
    return app.workspaceManager.getShortcuts();
  });

  app.get('/api/workspace/list', { preHandler: app.requireAuth }, async (request): Promise<WorkspaceListResponse> => {
    const query = request.query as { path?: string };
    return app.workspaceManager.listDirectory(query.path);
  });

  app.post('/api/workspace/create-directory', { preHandler: app.requireAuth }, async (request): Promise<CreateWorkspaceDirectoryResponse> => {
    const body = request.body as CreateWorkspaceDirectoryRequest;
    return {
      path: app.workspaceManager.createDirectory(body.parentPath, body.folderName),
    };
  });
}
