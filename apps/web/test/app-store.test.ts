import test from 'node:test';
import assert from 'node:assert/strict';
import { mapServerMessageToStore, useAppStore } from '../src/store/appStore.js';
import { buildTimelineGroups } from '../src/features/timeline/model.js';

function resetStore() {
  useAppStore.setState({
    health: { status: 'idle', data: null, error: null },
    connection: { status: 'idle', error: null },
    auth: { token: '' },
    sessions: { items: [], activeSessionId: null },
    timeline: { entriesBySessionId: {} },
    approvals: { items: [] },
    turns: { activeBySessionId: {} },
    tokenUsage: { bySessionId: {} },
    workspace: {
      shortcuts: null,
      listing: null,
      selectedPath: '',
      status: 'idle',
      error: null,
    },
    composer: { attachmentsBySessionId: {} },
  } as any);
}

test('request_user_input requests are normalized and retained in approvals store', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'server_request_required',
    request: {
      requestId: 'req-1',
      threadId: 'thread-1',
      kind: 'user_input',
      questions: [
        {
          id: 'color',
          question: 'Choose a color',
          header: 'Color',
          options: [{ label: 'Blue' }, { label: 'Green' }],
        },
      ],
      status: 'pending',
      createdAt: 1,
    },
  } as any);

  const state = useAppStore.getState();
  assert.equal(state.approvals.items.length, 1);
  assert.equal(state.approvals.items[0]?.kind, 'user_input');
  assert.equal(state.approvals.items[0]?.questions?.[0]?.id, 'color');
});

test('plan delta builds streaming plan timeline entry', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'plan_delta',
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId: 'plan-1',
    delta: 'Step 1',
  } as any);

  mapServerMessageToStore({
    type: 'plan_delta',
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId: 'plan-1',
    delta: ' -> done',
  } as any);

  const entries = useAppStore.getState().timeline.entriesBySessionId['thread-1'] || [];
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.type, 'plan');
  assert.equal(entries[0]?.text, 'Step 1 -> done');
  assert.equal(entries[0]?.status, 'running');
});

test('mcp progress and file change delta update rich timeline entries', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'mcp_tool_progress',
    threadId: 'thread-2',
    turnId: 'turn-2',
    itemId: 'mcp-1',
    message: 'Searching docs',
  } as any);

  mapServerMessageToStore({
    type: 'item_delta',
    threadId: 'thread-2',
    turnId: 'turn-2',
    itemId: 'file-1',
    method: 'item/fileChange/patchUpdated',
    patch: '*** Begin Patch\n*** End Patch',
    changes: [{ path: 'apps/web/src/app/App.tsx', kind: 'update' }],
  } as any);

  const entries = useAppStore.getState().timeline.entriesBySessionId['thread-2'] || [];
  assert.equal(entries.length, 2);
  const mcpEntry = entries.find((entry) => entry.id === 'mcp-1');
  const fileEntry = entries.find((entry) => entry.id === 'file-1');
  assert.deepEqual(mcpEntry?.meta, ['Searching docs']);
  assert.equal(fileEntry?.patch, '*** Begin Patch\n*** End Patch');
  assert.equal(fileEntry?.changes?.[0]?.path, 'apps/web/src/app/App.tsx');
});

test('item started and completed map command entries without duplicating ids', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'item_started',
    threadId: 'thread-3',
    turnId: 'turn-3',
    item: {
      id: 'cmd-1',
      type: 'commandExecution',
      command: 'npm test',
      cwd: 'C:\\workspace',
      status: 'running',
    },
  } as any);

  mapServerMessageToStore({
    type: 'item_completed',
    threadId: 'thread-3',
    turnId: 'turn-3',
    item: {
      id: 'cmd-1',
      type: 'commandExecution',
      command: 'npm test',
      cwd: 'C:\\workspace',
      status: 'completed',
      output: 'all green',
    },
  } as any);

  const entries = useAppStore.getState().timeline.entriesBySessionId['thread-3'] || [];
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, 'cmd-1');
  assert.equal(entries[0]?.status, 'completed');
  assert.equal(entries[0]?.text, 'npm test');
});

test('thread sync restores plan diff supplemental and notice entries', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'thread_sync',
    threadId: 'thread-restore',
    turns: [],
    tokenUsage: null,
    turnPlans: [{
      turnId: 'turn-a',
      explanation: 'Why',
      plan: [{ step: 'Refactor', status: 'completed' }],
      updatedAt: 1,
    }],
    turnDiffs: [{
      turnId: 'turn-a',
      diff: '*** Begin Patch\n*** End Patch',
      updatedAt: 1,
    }],
    supplementalItems: [{
      id: 'hook-a',
      type: 'hookEvent',
      phase: 'completed',
      status: 'completed',
    }],
    globalSupplementalItems: [{
      id: 'notice-a',
      type: '_warning',
      noticeKind: 'warning',
      text: 'Recovered warning',
      createdAt: 1,
    }],
  } as any);

  const entries = useAppStore.getState().timeline.entriesBySessionId['thread-restore'] || [];
  assert.equal(entries.length, 4);
  assert.ok(entries.some((entry) => entry.type === 'turn_plan'));
  assert.ok(entries.some((entry) => entry.type === 'turn_diff'));
  assert.ok(entries.some((entry) => entry.type === 'hook'));
  assert.ok(entries.some((entry) => entry.type === 'notice'));
});

test('reasoning, turn updates and notices are normalized into timeline semantics', () => {
  resetStore();

  mapServerMessageToStore({
    type: 'item_delta',
    threadId: 'thread-live',
    turnId: 'turn-live',
    itemId: 'reasoning-1',
    method: 'item/reasoning/textDelta',
    delta: 'Thinking',
  } as any);

  mapServerMessageToStore({
    type: 'turn_plan_updated',
    threadId: 'thread-live',
    turnId: 'turn-live',
    explanation: 'Do work',
    plan: [{ step: 'Inspect', status: 'completed' }, { step: 'Patch', status: 'in_progress' }],
  } as any);

  mapServerMessageToStore({
    type: 'turn_diff_updated',
    threadId: 'thread-live',
    turnId: 'turn-live',
    diff: '*** Begin Patch\n*** End Patch',
  } as any);

  mapServerMessageToStore({
    type: 'warning',
    threadId: 'thread-live',
    noticeId: 'warn-1',
    noticeKind: 'warning',
    message: 'Watch out',
    createdAt: 10,
  } as any);

  const entries = useAppStore.getState().timeline.entriesBySessionId['thread-live'] || [];
  assert.ok(entries.some((entry) => entry.type === 'reasoning' && entry.text === 'Thinking'));
  assert.ok(entries.some((entry) => entry.type === 'turn_plan' && entry.turnId === 'turn-live'));
  assert.ok(entries.some((entry) => entry.type === 'turn_diff' && entry.patch === '*** Begin Patch\n*** End Patch'));
  assert.ok(entries.some((entry) => entry.type === 'notice' && entry.text === 'Watch out'));
});

test('timeline groups combine turn entries and inline approvals', () => {
  const groups = buildTimelineGroups([
    {
      id: 'turn-1-user',
      type: 'message',
      role: 'user',
      turnId: 'turn-1',
      text: 'hello',
      createdAt: 1,
    },
    {
      id: 'turn-1-plan',
      type: 'turn_plan',
      role: 'assistant',
      turnId: 'turn-1',
      text: 'plan',
      status: 'running',
      createdAt: 2,
    },
  ], [
    {
      requestId: 'req-1',
      threadId: 'thread-1',
      turnId: 'turn-1',
      kind: 'command_approval',
      status: 'pending',
      command: 'npm test',
      createdAt: 3,
    },
  ], {
    active: true,
    turnId: 'turn-1',
    startedAt: 1,
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.turnId, 'turn-1');
  assert.equal(groups[0]?.entries.length, 2);
  assert.equal(groups[0]?.approvals.length, 1);
  assert.equal(groups[0]?.status, 'running');
});
