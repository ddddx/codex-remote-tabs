const path = require('path');
process.env.CODEX_APP_SERVER_WS = process.env.CODEX_APP_SERVER_WS || 'ws://127.0.0.1:4792';
process.env.PORT = process.env.PORT || '8787';
process.env.CODEX_HOME = process.env.CODEX_HOME || path.join(__dirname, '.codex-home');
require('./src/server.js');
