import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { ensureLegacyLocalConfig } from './legacy.js';

async function main(): Promise<void> {
  ensureLegacyLocalConfig();
  const config = loadConfig();
  const app = await createApp(config);

  const shutdown = async () => {
    app.runtimeState.isShuttingDown = true;
    if (app.runtimeState.codexStarted) {
      await app.codexClient.stop();
    }
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await app.listen({
    host: config.host,
    port: config.port,
  });
}

void main();
