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
    stop: () => Promise<void>;
    listThreads: (limit?: number) => Promise<Array<Record<string, unknown>>>;
    startThread: (options?: {
      name?: string | null;
      cwd?: string | null;
      model?: string | null;
      approvalPolicy?: string | null;
      sandbox?: string | null;
    }) => Promise<Record<string, unknown>>;
    resumeThread: (threadId: string, options?: { excludeTurns?: boolean }) => Promise<Record<string, unknown>>;
    startTurn: (threadId: string, text: string, options?: {
      attachments?: Array<{ path: string; name?: string }>;
      model?: string | null;
      effort?: string | null;
      approvalPolicy?: string | null;
      sandboxPolicy?: { mode: string } | null;
    }) => Promise<Record<string, unknown>>;
    listModels: (options?: { includeHidden?: boolean; limit?: number }) => Promise<Array<Record<string, unknown>>>;
    readConfig: (options?: { cwd?: string }) => Promise<{ config?: Record<string, unknown> }>;
    respond: (id: string | number, result?: unknown) => void;
    respondError: (id: string | number, error: unknown) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
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
