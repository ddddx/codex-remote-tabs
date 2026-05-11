import type { FastifyInstance } from 'fastify';
import type { CreateWorkspaceDirectoryResponse, WorkspaceListResponse, WorkspaceShortcutsResponse } from '@codex-remote/protocol';

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/workspace/shortcuts', { preHandler: app.requireAuth }, async (): Promise<WorkspaceShortcutsResponse> => {
    return app.services.workspace.getShortcuts();
  });

  app.get('/api/workspace/list', { preHandler: app.requireAuth }, async (request): Promise<WorkspaceListResponse> => {
    return app.services.workspace.listDirectory(request.query as { path?: string });
  });

  app.post('/api/workspace/create-directory', { preHandler: app.requireAuth }, async (request): Promise<CreateWorkspaceDirectoryResponse> => {
    return app.services.workspace.createDirectory(request.body as { parentPath: string; folderName: string });
  });
}
