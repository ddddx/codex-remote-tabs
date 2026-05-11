export async function registerHealthRoute(app) {
    app.get('/health', async () => ({
        status: app.runtimeState.isShuttingDown ? 'shutting_down' : 'ok',
        tabs: 0,
        websocketClients: app.runtimeState.websocketClientCount,
        uptimeSec: Math.floor((Date.now() - app.runtimeState.startedAt) / 1000),
    }));
}
//# sourceMappingURL=health.js.map