export function isAuthorizedWsToken(token: string | undefined, expectedToken: string): boolean {
  if (!expectedToken) {
    return true;
  }

  return token === expectedToken;
}
