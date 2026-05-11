import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const { applyLocalConfig } = require('../../../src/localConfig.js') as {
  applyLocalConfig: () => { config: Record<string, unknown>; created: unknown };
};
const { WorkspaceManager } = require('../../../src/workspaceManager.js') as {
  WorkspaceManager: new (options?: Record<string, unknown>) => {
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
};
const { CodexAppServerClient } = require('../../../src/codexAppServerClient.js') as {
  CodexAppServerClient: new (options?: Record<string, unknown>) => {
    start: () => Promise<void>;
    listModels: (options?: { includeHidden?: boolean; limit?: number }) => Promise<Array<Record<string, unknown>>>;
    readConfig: (options?: { cwd?: string }) => Promise<{ config?: Record<string, unknown> }>;
  };
};

let localConfigApplied = false;

export function ensureLegacyLocalConfig(): void {
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
