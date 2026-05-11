import { isAuthorizedWsToken } from './auth.js';
import { routeClientMessage } from './message-router.js';
function sendMessage(socket, message) {
    socket.send(JSON.stringify(message));
}
function normalizeIncomingMessage(raw) {
    return JSON.parse(raw);
}
export async function registerWsGateway(app) {
    app.get('/ws', { websocket: true }, (socket, request) => {
        const token = typeof request.query?.token === 'string'
            ? request.query.token
            : undefined;
        if (!isAuthorizedWsToken(token, app.config.wsToken)) {
            sendMessage(socket, {
                type: 'error',
                code: 'AUTH_FAILED',
                message: 'WebSocket 鉴权失败，请检查 token 是否正确。',
            });
            socket.close(4401, 'Unauthorized');
            return;
        }
        app.runtimeState.websocketClientCount += 1;
        sendMessage(socket, {
            type: 'state',
            tabs: [],
            serverRequests: [],
            globalSupplementalItems: [],
        });
        socket.on('message', async (raw) => {
            try {
                const message = normalizeIncomingMessage(raw.toString());
                await routeClientMessage(socket, message);
            }
            catch (error) {
                sendMessage(socket, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Invalid WebSocket message',
                });
            }
        });
        socket.on('close', () => {
            app.runtimeState.websocketClientCount = Math.max(0, app.runtimeState.websocketClientCount - 1);
        });
    });
}
//# sourceMappingURL=gateway.js.map