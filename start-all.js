const { execFile, spawn, fork } = require('child_process');
const path = require('path');

const CODEX_CMD = process.env.CODEX_CMD || 'codex.cmd';

// Start app-server via cmd.exe (required for .cmd files under pm2)
const appServer = spawn(
  'cmd.exe',
  ['/c', CODEX_CMD, 'app-server', '--listen', 'ws://127.0.0.1:4792'],
  {
    env: {
      ...process.env,
      CODEX_HOME: path.join(__dirname, '.codex-home'),
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

appServer.stdout.on('data', d => process.stdout.write(`[appserver] ${d}`));
appServer.stderr.on('data', d => process.stderr.write(`[appserver] ${d}`));
appServer.on('exit', code => {
  console.log(`[appserver] exited with code ${code}`);
  process.exit(code || 1);
});

// Wait for app-server to be ready, then start web server
const net = require('net');

function waitForPort(port, retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function tryConnect() {
      const sock = new net.Socket();
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (++attempts >= retries) reject(new Error('timeout'));
        else setTimeout(tryConnect, 1000);
      });
      sock.connect(port, '127.0.0.1');
    }
    tryConnect();
  });
}

waitForPort(4792, 30).then(() => {
  console.log('[appserver] ready on 4792');
  
  // Start web server
  const webServer = fork(
    path.join(__dirname, 'src', 'server.js'),
    [],
    {
      env: {
        ...process.env,
        CODEX_APP_SERVER_WS: 'ws://127.0.0.1:4792',
        PORT: '8787',
        CODEX_HOME: path.join(__dirname, '.codex-home'),
      },
    }
  );

  webServer.on('exit', code => {
    console.log(`[web] exited with code ${code}`);
    process.exit(code || 1);
  });
}).catch(err => {
  console.error('[appserver] failed to start:', err.message);
  process.exit(1);
});
