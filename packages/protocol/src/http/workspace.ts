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
