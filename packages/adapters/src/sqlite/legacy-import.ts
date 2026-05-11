import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import {
  createAppStateRecord,
  createThreadPreferenceRecord,
  createWindowBindingRecord,
} from '@codex-remote/domain';

type LegacyAppState = {
  lastWorkspacePath?: string;
  threadPrefs?: Record<string, { approvalPolicy?: string; sandboxMode?: string }>;
};

function readJsonFile<T>(filePath: string): T | null {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return null;
  }
  const raw = fs.readFileSync(resolved, 'utf8').trim();
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export function importLegacyState(database: DatabaseSync, options: {
  appStatePath?: string;
  windowMapPath?: string;
} = {}): void {
  const appState = readJsonFile<LegacyAppState>(options.appStatePath || path.resolve(process.cwd(), '.codex-remote-state.json'));
  const windowMap = readJsonFile<Record<string, number>>(options.windowMapPath || path.resolve(process.cwd(), '.window-map.json'));

  if (appState?.lastWorkspacePath) {
    const record = createAppStateRecord('lastWorkspacePath', JSON.stringify(appState.lastWorkspacePath));
    database.prepare(`
      INSERT INTO app_state (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run(record.key, record.valueJson, record.updatedAt);
  }

  if (appState?.threadPrefs && typeof appState.threadPrefs === 'object') {
    const statement = database.prepare(`
      INSERT INTO thread_preferences (thread_id, approval_policy, sandbox_mode, model, reasoning_effort)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(thread_id) DO UPDATE SET
        approval_policy = excluded.approval_policy,
        sandbox_mode = excluded.sandbox_mode,
        model = excluded.model,
        reasoning_effort = excluded.reasoning_effort
    `);
    for (const [threadId, prefs] of Object.entries(appState.threadPrefs)) {
      const record = createThreadPreferenceRecord({
        threadId,
        approvalPolicy: prefs?.approvalPolicy || '',
        sandboxMode: prefs?.sandboxMode || '',
      });
      statement.run(
        record.threadId,
        record.approvalPolicy,
        record.sandboxMode,
        record.model,
        record.reasoningEffort,
      );
    }
  }

  if (windowMap && typeof windowMap === 'object') {
    const statement = database.prepare(`
      INSERT INTO window_bindings (thread_id, pid, command_line, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(thread_id) DO UPDATE SET
        pid = excluded.pid,
        command_line = excluded.command_line,
        updated_at = excluded.updated_at
    `);
    for (const [threadId, pid] of Object.entries(windowMap)) {
      const record = createWindowBindingRecord({
        threadId,
        pid: Number.isFinite(pid) ? pid : null,
      });
      statement.run(record.threadId, record.pid, record.commandLine, record.updatedAt);
    }
  }
}
