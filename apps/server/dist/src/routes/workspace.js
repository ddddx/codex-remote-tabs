export async function registerWorkspaceRoutes(app) {
    app.get('/api/workspace/shortcuts', { preHandler: app.requireAuth }, async () => {
        return app.workspaceManager.getShortcuts();
    });
    app.get('/api/workspace/list', { preHandler: app.requireAuth }, async (request) => {
        const query = request.query;
        return app.workspaceManager.listDirectory(query.path);
    });
    app.post('/api/workspace/create-directory', { preHandler: app.requireAuth }, async (request) => {
        const body = request.body;
        return {
            path: app.workspaceManager.createDirectory(body.parentPath, body.folderName),
        };
    });
}
//# sourceMappingURL=workspace.js.map