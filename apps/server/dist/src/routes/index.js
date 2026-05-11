import { registerHealthRoute } from './health.js';
import { registerWorkspaceRoutes } from './workspace.js';
import { registerUploadRoutes } from './uploads.js';
import { registerCodexRoutes } from './codex.js';
export async function registerRoutes(app) {
    await registerHealthRoute(app);
    await registerWorkspaceRoutes(app);
    await registerUploadRoutes(app);
    await registerCodexRoutes(app);
}
//# sourceMappingURL=index.js.map