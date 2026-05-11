import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiErrorSchema,
  codexOptionsResponseSchema,
  createWorkspaceDirectoryRequestSchema,
  healthResponseSchema,
  uploadFileParamsSchema,
  uploadImageResponseSchema,
  workspaceListResponseSchema,
  workspaceShortcutsResponseSchema,
} from '../src/index.js';

test('workspace and upload schemas accept valid payloads', () => {
  const shortcuts = workspaceShortcutsResponseSchema.parse({
    projectRoot: 'C:\\workspace',
    desktopPath: 'C:\\Users\\Administrator\\Desktop',
    lastUsedPath: 'C:\\workspace',
    preferredPath: 'C:\\workspace',
    roots: ['C:\\workspace'],
  });
  const list = workspaceListResponseSchema.parse({
    path: 'C:\\workspace',
    parentPath: 'C:\\',
    entries: [{ name: 'demo', path: 'C:\\workspace\\demo' }],
  });
  const createDirectory = createWorkspaceDirectoryRequestSchema.parse({
    parentPath: 'C:\\workspace',
    folderName: 'demo',
  });
  const uploadParams = uploadFileParamsSchema.parse({
    fileName: 'demo.png',
  });
  const upload = uploadImageResponseSchema.parse({
    id: 'file-1',
    name: 'demo.png',
    contentType: 'image/png',
    filePath: 'C:\\uploads\\demo.png',
    url: '/api/uploads/demo.png',
  });

  assert.equal(shortcuts.projectRoot, 'C:\\workspace');
  assert.equal(list.entries[0]?.name, 'demo');
  assert.equal(createDirectory.folderName, 'demo');
  assert.equal(uploadParams.fileName, 'demo.png');
  assert.equal(upload.contentType, 'image/png');
});

test('health, codex and error schemas reject malformed payloads', () => {
  assert.throws(() => healthResponseSchema.parse({
    status: 'bad',
    tabs: 1,
    websocketClients: 0,
    uptimeSec: 10,
  }));

  assert.throws(() => codexOptionsResponseSchema.parse({
    models: [{ id: 'gpt', model: 'gpt', displayName: 'GPT', description: '', isDefault: true, supportedReasoningEfforts: [] }],
    defaults: {
      model: 'gpt',
      reasoningEffort: 'medium',
      approvalPolicy: 'never',
      sandboxMode: 'workspace-write',
    },
  }));

  assert.throws(() => apiErrorSchema.parse({
    code: 404,
    message: 'nope',
  }));
});
