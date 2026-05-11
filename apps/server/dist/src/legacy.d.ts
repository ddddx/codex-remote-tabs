export declare function ensureLegacyLocalConfig(): void;
export declare function createLegacyWorkspaceManager(): {
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
        entries: Array<{
            name: string;
            path: string;
        }>;
    };
    createDirectory: (parentPath: string, folderName: string) => string;
    resolveWorkspacePath: (inputPath?: string) => string;
};
export declare function createLegacyCodexClient(): {
    start: () => Promise<void>;
    listModels: (options?: {
        includeHidden?: boolean;
        limit?: number;
    }) => Promise<Array<Record<string, unknown>>>;
    readConfig: (options?: {
        cwd?: string;
    }) => Promise<{
        config?: Record<string, unknown>;
    }>;
};
