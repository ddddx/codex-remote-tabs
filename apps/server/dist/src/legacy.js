import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { applyLocalConfig } = require('../../../src/localConfig.js');
const { WorkspaceManager } = require('../../../src/workspaceManager.js');
const { CodexAppServerClient } = require('../../../src/codexAppServerClient.js');
let localConfigApplied = false;
export function ensureLegacyLocalConfig() {
    if (localConfigApplied) {
        return;
    }
    applyLocalConfig();
    localConfigApplied = true;
}
export function createLegacyWorkspaceManager() {
    return new WorkspaceManager({
        projectRoot: process.cwd(),
        stateFile: path.join(process.cwd(), '.codex-remote-state.json'),
    });
}
export function createLegacyCodexClient() {
    return new CodexAppServerClient({
        cwd: process.cwd(),
    });
}
//# sourceMappingURL=legacy.js.map