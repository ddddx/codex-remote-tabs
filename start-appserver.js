const { spawn } = require('child_process');
const path = require('path');

const CODEX_CMD = process.env.CODEX_CMD || 'codex.cmd';
const CODEX_HOME = process.env.CODEX_HOME || path.join(__dirname, '.codex-home');
const APP_SERVER_WS = process.env.CODEX_APP_SERVER_WS || 'ws://127.0.0.1:4792';

const appServer = spawn(
  'cmd.exe',
  ['/c', CODEX_CMD, 'app-server', '--listen', APP_SERVER_WS],
  {
    env: { ...process.env, CODEX_HOME },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

appServer.stdout.on('data', d => process.stdout.write(d));
appServer.stderr.on('data', d => process.stderr.write(d));
appServer.on('exit', code => {
  console.log(`app-server exited with code ${code}`);
  process.exit(code || 1);
});

// Keep alive
process.on('SIGINT', () => appServer.kill());
process.on('SIGTERM', () => appServer.kill());
