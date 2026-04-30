const { execFile } = require('node:child_process');

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
    this.map = new Map();
  }

  async openWindow(threadId) {
    const escapedCmd = this.codexCmd.replace(/'/g, "''");
    const escapedThread = threadId.replace(/'/g, "''");

    const script = [
      "$ErrorActionPreference = 'Stop'",
      `$proc = Start-Process -FilePath '${escapedCmd}' -ArgumentList @('resume', '${escapedThread}') -PassThru`,
      'Write-Output $proc.Id',
    ].join('; ');

    const output = await runPowerShell(script);
    const pid = Number.parseInt(output, 10);
    if (!Number.isFinite(pid)) {
      throw new Error(`failed to parse codex window pid from output: ${output}`);
    }

    this.map.set(threadId, pid);
    return pid;
  }

  async closeWindow(threadId) {
    const pid = this.map.get(threadId);
    if (!pid) {
      return;
    }

    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      `Stop-Process -Id ${pid} -Force`,
    ].join('; ');

    await runPowerShell(script);
    this.map.delete(threadId);
  }

  getPid(threadId) {
    return this.map.get(threadId) || null;
  }
}

module.exports = { CodexWindowManager };
