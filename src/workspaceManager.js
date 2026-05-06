const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

class WorkspaceManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.stateFile = options.stateFile || path.join(this.projectRoot, '.codex-remote-state.json');
    this.state = this.loadState();
  }

  getShortcuts() {
    return {
      projectRoot: this.projectRoot,
      desktopPath: this.normalizeExistingDirectory(path.join(os.homedir(), 'Desktop')),
      lastUsedPath: this.getLastUsedPath(),
      preferredPath: this.getPreferredPath(),
    };
  }

  getLastUsedPath() {
    return this.normalizeExistingDirectory(this.state.lastWorkspacePath || '');
  }

  getPreferredPath() {
    return this.getLastUsedPath() || this.projectRoot;
  }

  resolveWorkspacePath(inputPath) {
    const raw = typeof inputPath === 'string' ? inputPath.trim() : '';
    if (!raw) {
      return this.projectRoot;
    }

    const resolved = path.resolve(this.projectRoot, raw);
    if (!fs.existsSync(resolved)) {
      throw new Error(`工作区目录不存在：${resolved}`);
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`工作区不是目录：${resolved}`);
    }

    return resolved;
  }

  rememberPath(workspacePath) {
    const normalized = this.resolveWorkspacePath(workspacePath);
    this.state.lastWorkspacePath = normalized;
    this.saveState();
    return normalized;
  }

  async pickDirectory(initialPath) {
    const normalizedInitialPath = this.normalizeExistingDirectory(initialPath) || this.getPreferredPath();
    const output = await runPowerShellSta(buildFolderPickerScript(normalizedInitialPath));
    const selectedPath = String(output || '').trim();
    if (!selectedPath) {
      return null;
    }
    return this.resolveWorkspacePath(selectedPath);
  }

  createDirectory(parentPath, folderName) {
    const parent = this.resolveWorkspacePath(parentPath || this.getPreferredPath());
    const sanitizedFolderName = sanitizeFolderName(folderName);
    const nextPath = path.join(parent, sanitizedFolderName);

    if (fs.existsSync(nextPath)) {
      throw new Error(`目录已存在：${nextPath}`);
    }

    fs.mkdirSync(nextPath, { recursive: false });
    this.rememberPath(nextPath);
    return nextPath;
  }

  normalizeExistingDirectory(inputPath) {
    const raw = typeof inputPath === 'string' ? inputPath.trim() : '';
    if (!raw) {
      return '';
    }

    const resolved = path.resolve(raw);
    if (!fs.existsSync(resolved)) {
      return '';
    }

    try {
      if (!fs.statSync(resolved).isDirectory()) {
        return '';
      }
    } catch (_error) {
      return '';
    }

    return resolved;
  }

  loadState() {
    try {
      if (!fs.existsSync(this.stateFile)) {
        return {};
      }

      const raw = fs.readFileSync(this.stateFile, 'utf8').trim();
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return parsed;
    } catch (_error) {
      return {};
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.log(`[workspace] failed to save state: ${error.message}`);
    }
  }
}

function sanitizeFolderName(folderName) {
  const normalized = typeof folderName === 'string' ? folderName.trim() : '';
  if (!normalized) {
    throw new Error('文件夹名称不能为空');
  }
  if (/[<>:"/\\|?*\u0000-\u001F]/.test(normalized)) {
    throw new Error('文件夹名称包含非法字符');
  }
  if (normalized === '.' || normalized === '..') {
    throw new Error('文件夹名称非法');
  }
  return normalized;
}

function buildFolderPickerScript(initialPath) {
  const escapedInitialPath = String(initialPath || '').replace(/'/g, "''");
  return [
    "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = '选择会话工作区'",
    "$dialog.ShowNewFolderButton = $true",
    `if ('${escapedInitialPath}' -and [System.IO.Directory]::Exists('${escapedInitialPath}')) { $dialog.SelectedPath = '${escapedInitialPath}' }`,
    "$result = $dialog.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }",
  ].join('; ');
}

function runPowerShellSta(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-Command', script],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

module.exports = { WorkspaceManager };
