const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const CONFIG_FILE_NAME = 'config.local.json';
const DEFAULT_CONFIG = Object.freeze({
  PORT: 18637,
  CODEX_CMD: 'codex.cmd',
  CODEX_APP_SERVER_WS: 'ws://127.0.0.1:4792',
});

function resolveConfigPath() {
  return process.env.LOCAL_CONFIG_PATH || path.join(process.cwd(), CONFIG_FILE_NAME);
}

function generateWsToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createDefaultConfig() {
  return {
    ...DEFAULT_CONFIG,
    WS_TOKEN: generateWsToken(),
  };
}

function ensureLocalConfig() {
  const configPath = resolveConfigPath();
  if (fs.existsSync(configPath)) {
    return null;
  }

  const config = createDefaultConfig();
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return { configPath, config };
}

function readLocalConfig() {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, 'utf8').trim();
  if (!raw) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`failed to parse ${configPath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`invalid config file ${configPath}: root value must be an object`);
  }

  return parsed;
}

function applyLocalConfig() {
  const created = ensureLocalConfig();
  const config = readLocalConfig();

  for (const [key, value] of Object.entries(config)) {
    if (value == null || process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = String(value);
  }

  return { config, created };
}

module.exports = {
  DEFAULT_CONFIG,
  CONFIG_FILE_NAME,
  applyLocalConfig,
  ensureLocalConfig,
  generateWsToken,
  readLocalConfig,
  resolveConfigPath,
};
