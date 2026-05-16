import net from 'node:net';

const port = Number.parseInt(process.argv[2] || '', 10);

if (!Number.isFinite(port) || port <= 0) {
  console.error('Usage: node scripts/free-port.mjs <port>');
  process.exit(1);
}

function checkPortState(targetPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error) {
        resolve(error.code === 'EADDRINUSE' ? 'in-use' : 'unknown');
        return;
      }
      reject(error);
    });

    server.once('listening', () => {
      server.close(() => resolve('free'));
    });

    server.listen(targetPort, '0.0.0.0');
  });
}

async function freeWindowsPort(targetPort) {
  const state = await checkPortState(targetPort);
  if (state === 'free') {
    console.log(`PORT ${targetPort} already free`);
    return;
  }
  if (process.platform !== 'win32') {
    throw new Error(`Port ${targetPort} is in use`);
  }

  const { default: childProcess } = await import('node:child_process');
  const output = childProcess.execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$conn = Get-NetTCPConnection -LocalPort ${targetPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; ` +
      `if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Start-Sleep -Milliseconds 400; Write-Output "STOPPED $($conn.OwningProcess)" }`,
    ],
    { encoding: 'utf8' },
  );

  const nextState = await checkPortState(targetPort);
  if (nextState !== 'free') {
    throw new Error(`Failed to free port ${targetPort}`);
  }

  process.stdout.write(output || `FREED ${targetPort}\n`);
}

freeWindowsPort(port).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
