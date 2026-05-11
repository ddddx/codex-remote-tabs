function sendMessage(socket, message) {
    socket.send(JSON.stringify(message));
}
export async function routeClientMessage(socket, message) {
    if (message.type === 'thread_sync') {
        sendMessage(socket, {
            type: 'thread_sync',
            threadId: message.threadId,
            turns: [],
            supplementalItems: [],
            globalSupplementalItems: [],
            tokenUsage: null,
            turnPlans: [],
            turnDiffs: [],
        });
        return;
    }
    sendMessage(socket, {
        type: 'error',
        message: `Unsupported message type in scaffold: ${message.type}`,
    });
}
//# sourceMappingURL=message-router.js.map