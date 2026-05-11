export type HealthResponse = {
  status: 'ok' | 'shutting_down';
  tabs: number;
  websocketClients: number;
  uptimeSec: number;
};

export type WorkspaceShortcutsResponse = {
  projectRoot: string;
  desktopPath: string;
  lastUsedPath: string;
  preferredPath: string;
  roots: string[];
};

export type WorkspaceListEntry = {
  name: string;
  path: string;
};

export type WorkspaceListResponse = {
  path: string;
  parentPath: string;
  entries: WorkspaceListEntry[];
};

export type CreateWorkspaceDirectoryRequest = {
  parentPath: string;
  folderName: string;
};

export type CreateWorkspaceDirectoryResponse = {
  path: string;
};

export type UploadImageResponse = {
  id: string;
  name: string;
  contentType: string;
  filePath: string;
  url: string;
};

export type CodexOptionModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: string[];
};

export type CodexOptionsResponse = {
  models: CodexOptionModel[];
  defaults: {
    model: string;
    reasoningEffort: string;
    approvalPolicy: string;
    sandboxMode: string;
  };
};
