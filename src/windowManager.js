const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const THREAD_ID_REGEX = /^[0-9a-f]{8,12}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${error.message}\n${stderr || ''}`));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

class CodexWindowManager {
  constructor(options = {}) {
    this.codexCmd = options.codexCmd || process.env.CODEX_CMD || 'codex.cmd';
    this.appServerWs = options.appServerWs || process.env.CODEX_APP_SERVER_WS || 'ws://127.0.0.1:4792';
    this.map = new Map();
    this.mapFile = options.mapFile
      || process.env.WINDOW_MAP_FILE
      || path.join(process.cwd(), '.window-map.json');
    this.load();
  }

  async openWindow(threadId) {
    assertThreadId(threadId);
    const escapedCmd = this.codexCmd.replace(/'/g, "''");
    const escapedWs = this.appServerWs.replace(/'/g, "''");
    const escapedThread = threadId.replace(/'/g, "''");
    const commandLine = `""${escapedCmd}" --remote ${escapedWs} resume ${escapedThread}"`;

    const script = [
      "$ErrorActionPreference = 'Stop'",
      `$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/c', '${commandLine}') -PassThru`,
      'Write-Output $proc.Id',
    ].join('; ');

    const output = await runPowerShell(script);
    const pid = Number.parseInt(output, 10);
    if (!Number.isFinite(pid)) {
      throw new Error(`failed to parse codex window pid from output: ${output}`);
    }

    this.map.set(threadId, pid);
    this.save();
    return pid;
  }

  async closeWindow(threadId) {
    assertThreadId(threadId);
    const pid = this.map.get(threadId);
    if (!pid) {
      return;
    }

    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      `taskkill /PID ${pid} /T /F | Out-Null`,
    ].join('; ');

    await runPowerShell(script);
    this.map.delete(threadId);
    this.save();
  }

  async isPidAlive(pid) {
    const numericPid = Number.parseInt(pid, 10);
    if (!Number.isFinite(numericPid) || numericPid <= 0) {
      return false;
    }

    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      `$proc = Get-Process -Id ${numericPid}`,
      "if ($null -ne $proc) { Write-Output '1' } else { Write-Output '0' }",
    ].join('; ');

    const output = await runPowerShell(script);
    return output.trim() === '1';
  }

  getPid(threadId) {
    return this.map.get(threadId) || null;
  }

  clearPid(threadId) {
    this.map.delete(threadId);
    this.save();
  }

  entries() {
    return Array.from(this.map.entries());
  }

  save() {
    const payload = {};
    for (const [threadId, pid] of this.map.entries()) {
      const numericPid = Number.parseInt(pid, 10);
      if (Number.isFinite(numericPid) && numericPid > 0) {
        payload[threadId] = numericPid;
      }
    }

    try {
      writeJsonFileAtomic(this.mapFile, payload);
    } catch (error) {
      console.log(`[window] failed to save map: ${error.message}`);
    }
  }

  load() {
    try {
      if (!fs.existsSync(this.mapFile)) {
        this.map.clear();
        return;
      }

      const raw = fs.readFileSync(this.mapFile, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      const nextMap = new Map();
      for (const [threadId, pid] of Object.entries(parsed || {})) {
        if (!THREAD_ID_REGEX.test(threadId || '')) {
          continue;
        }
        const numericPid = Number.parseInt(pid, 10);
        if (Number.isFinite(numericPid) && numericPid > 0) {
          nextMap.set(threadId, numericPid);
        }
      }

      this.map = nextMap;
    } catch (error) {
      backupCorruptedJsonFile(this.mapFile, error, 'window');
      console.log(`[window] failed to load map: ${error.message}`);
      this.map = new Map();
    }
  }
}

function assertThreadId(threadId) {
  if (!THREAD_ID_REGEX.test(threadId || '')) {
    throw new Error('invalid threadId: expected UUID');
  }
}

function writeJsonFileAtomic(targetPath, value) {
  const directory = path.dirname(targetPath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = `${targetPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, targetPath);
}

function backupCorruptedJsonFile(filePath, error, scope) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.broken-${stamp}`;
    fs.renameSync(filePath, backupPath);
    console.log(`[${scope}] corrupted state file moved to ${backupPath}: ${error.message}`);
  } catch (backupError) {
    console.log(`[${scope}] failed to back up corrupted state file: ${backupError.message}`);
  }
}

module.exports = { CodexWindowManager };
