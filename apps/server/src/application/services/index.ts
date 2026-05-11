import type { FastifyInstance } from 'fastify';
import { createApprovalService, type ApprovalService } from './approval-service.js';
import { createCodexOptionsService, type CodexOptionsService } from './codex-options-service.js';
import { createSessionService, type SessionService } from './session-service.js';
import { createTurnService, type TurnService } from './turn-service.js';
import { createUploadService, type UploadService } from './upload-service.js';
import { createWorkspaceService, type WorkspaceService } from './workspace-service.js';

export type AppServices = {
  approvals: ApprovalService;
  codexOptions: CodexOptionsService;
  sessions: SessionService;
  turns: TurnService;
  uploads: UploadService;
  workspace: WorkspaceService;
};

export function createAppServices(app: FastifyInstance): AppServices {
  return {
    approvals: createApprovalService(app),
    codexOptions: createCodexOptionsService(app),
    sessions: createSessionService(app),
    turns: createTurnService(app),
    uploads: createUploadService(app),
    workspace: createWorkspaceService(app),
  };
}
