export function isAuthorizedWsToken(token, expectedToken) {
    if (!expectedToken) {
        return true;
    }
    return token === expectedToken;
}
//# sourceMappingURL=auth.js.map