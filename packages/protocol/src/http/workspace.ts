import { z } from 'zod';

export const workspaceShortcutsResponseSchema = z.object({
  projectRoot: z.string(),
  desktopPath: z.string(),
  lastUsedPath: z.string(),
  preferredPath: z.string(),
  roots: z.array(z.string()),
});

export type WorkspaceShortcutsResponse = z.infer<typeof workspaceShortcutsResponseSchema>;

export const workspaceListEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
});

export type WorkspaceListEntry = z.infer<typeof workspaceListEntrySchema>;

export const workspaceListQuerySchema = z.object({
  path: z.string().optional(),
});

export const workspaceListResponseSchema = z.object({
  path: z.string(),
  parentPath: z.string(),
  entries: z.array(workspaceListEntrySchema),
});

export type WorkspaceListResponse = z.infer<typeof workspaceListResponseSchema>;

export const createWorkspaceDirectoryRequestSchema = z.object({
  parentPath: z.string(),
  folderName: z.string(),
});

export type CreateWorkspaceDirectoryRequest = z.infer<typeof createWorkspaceDirectoryRequestSchema>;

export const createWorkspaceDirectoryResponseSchema = z.object({
  path: z.string(),
});

export type CreateWorkspaceDirectoryResponse = z.infer<typeof createWorkspaceDirectoryResponseSchema>;
