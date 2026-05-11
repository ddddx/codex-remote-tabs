export function buildTokenVerifier(wsToken) {
    return function verifyRequestToken(request) {
        if (!wsToken) {
            return true;
        }
        const queryToken = typeof request.query?.token === 'string'
            ? request.query.token
            : '';
        const headerToken = typeof request.headers['x-codex-remote-token'] === 'string'
            ? request.headers['x-codex-remote-token']
            : '';
        return queryToken === wsToken || headerToken === wsToken;
    };
}
export function buildRequireAuth(verifyRequestToken) {
    return async function requireAuth(request, reply) {
        if (verifyRequestToken(request)) {
            return;
        }
        reply.status(401).send({
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
        });
    };
}
//# sourceMappingURL=auth.js.map