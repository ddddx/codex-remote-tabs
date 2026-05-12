import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { applyLocalConfig } from './config/local-config.js';

async function main(): Promise<void> {
  applyLocalConfig();
  const config = loadConfig();
  const app = await createApp(config);
  let windowStatusTimer: NodeJS.Timeout | null = null;

  const shutdown = async () => {
    app.runtimeState.isShuttingDown = true;
    if (windowStatusTimer) {
      clearInterval(windowStatusTimer);
      windowStatusTimer = null;
    }
    if (app.runtimeState.codexStarted) {
      await app.codexClient.stop();
    }
    await app.appServerSupervisor.stop();
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

  await app.windowAttachments.refreshAllTabsWindowStatus().catch(() => {});
  windowStatusTimer = setInterval(() => {
    void app.windowAttachments.refreshAllTabsWindowStatus().catch(() => {});
  }, 15000);
  windowStatusTimer.unref?.();
}

void main();
