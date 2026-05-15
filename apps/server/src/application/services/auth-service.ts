import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  AuthSession,
  AuthSessionCreateRequest,
} from '@codex-remote/protocol';

const AUTH_STATE_KEY = 'authSessions';
const AUTH_COOKIE_NAME = 'codex_remote_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type PersistedAuthState = {
  sessions?: Array<{
    sessionId?: string;
    secret?: string;
    deviceName?: string;
    deviceId?: string;
    createdAt?: number;
    lastSeenAt?: number;
    expiresAt?: number;
    revokedAt?: number | null;
  }>;
};

function now(): number {
  return Date.now();
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeDeviceName(value: string | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || '当前设备';
}

function normalizeDeviceId(value: string | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || '';
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) {
          return [part, ''];
        }
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function buildCookieValue(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

function buildSetCookieValue(value: string, maxAgeSeconds: number): string {
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function buildClearCookieValue(): string {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function toAuthSession(
  session: {
    sessionId: string;
    deviceName: string;
    createdAt: number;
    lastSeenAt: number;
    expiresAt: number;
  },
  currentSessionId?: string,
): AuthSession {
  return {
    sessionId: session.sessionId,
    deviceName: session.deviceName,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    current: currentSessionId === session.sessionId,
    online: true,
  };
}

function loadPersistedAuthSessions(app: FastifyInstance): void {
  if (app.runtimeState.authSessionsById.size) {
    return;
  }
  const record = app.repositories.appState.getAppState(AUTH_STATE_KEY);
  if (!record?.valueJson) {
    return;
  }
  try {
    const parsed = JSON.parse(record.valueJson) as PersistedAuthState;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    for (const session of sessions) {
      if (
        typeof session.sessionId !== 'string'
        || typeof session.secret !== 'string'
        || typeof session.deviceName !== 'string'
        || typeof session.createdAt !== 'number'
        || typeof session.lastSeenAt !== 'number'
        || typeof session.expiresAt !== 'number'
      ) {
        continue;
      }
      app.runtimeState.authSessionsById.set(session.sessionId, {
        sessionId: session.sessionId,
        secret: session.secret,
        deviceName: session.deviceName,
        deviceId: normalizeDeviceId(session.deviceId),
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        revokedAt: typeof session.revokedAt === 'number' ? session.revokedAt : null,
      });
    }
  } catch {
    // Ignore corrupt auth state and start fresh.
  }
}

function persistAuthSessions(app: FastifyInstance): void {
  const sessions = Array.from(app.runtimeState.authSessionsById.values())
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
  app.repositories.appState.setAppState({
    key: AUTH_STATE_KEY,
    valueJson: JSON.stringify({ sessions }),
    updatedAt: now(),
  });
}

function pruneExpiredAuthSessions(app: FastifyInstance): void {
  loadPersistedAuthSessions(app);
  const currentTime = now();
  let dirty = false;
  for (const [sessionId, session] of app.runtimeState.authSessionsById.entries()) {
    if ((session.revokedAt && session.revokedAt > 0) || session.expiresAt <= currentTime) {
      app.runtimeState.authSessionsById.delete(sessionId);
      dirty = true;
    }
  }
  if (dirty) {
    persistAuthSessions(app);
  }
}

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(app: FastifyInstance) {
  function touchSession(session: {
    sessionId: string;
    secret: string;
    deviceName: string;
    deviceId?: string;
    createdAt: number;
    lastSeenAt: number;
    expiresAt: number;
    revokedAt?: number | null;
  }): { cookie: string; session: AuthSession } {
    session.lastSeenAt = now();
    session.expiresAt = session.lastSeenAt + SESSION_TTL_MS;
    persistAuthSessions(app);
    return {
      cookie: buildSetCookieValue(buildCookieValue(session.sessionId, session.secret), Math.floor(SESSION_TTL_MS / 1000)),
      session: toAuthSession(session, session.sessionId),
    };
  }

  function findSessionByDeviceId(deviceId: string): {
    sessionId: string;
    secret: string;
    deviceName: string;
    deviceId?: string;
    createdAt: number;
    lastSeenAt: number;
    expiresAt: number;
    revokedAt?: number | null;
  } | null {
    if (!deviceId) {
      return null;
    }
    let matched: {
      sessionId: string;
      secret: string;
      deviceName: string;
      deviceId?: string;
      createdAt: number;
      lastSeenAt: number;
      expiresAt: number;
      revokedAt?: number | null;
    } | null = null;
    for (const session of app.runtimeState.authSessionsById.values()) {
      if (normalizeDeviceId(session.deviceId) !== deviceId) {
        continue;
      }
      if (!matched || session.lastSeenAt > matched.lastSeenAt) {
        matched = session;
      }
    }
    return matched;
  }

  function removeDuplicateSessionsForDevice(deviceId: string, keepSessionId: string): void {
    if (!deviceId) {
      return;
    }
    let dirty = false;
    for (const [sessionId, session] of app.runtimeState.authSessionsById.entries()) {
      if (sessionId === keepSessionId) {
        continue;
      }
      if (normalizeDeviceId(session.deviceId) !== deviceId) {
        continue;
      }
      app.runtimeState.authSessionsById.delete(sessionId);
      dirty = true;
      for (const client of app.runtimeState.clients) {
        if (client.authSessionId === sessionId) {
          client.close(4401, 'Session replaced');
        }
      }
    }
    if (dirty) {
      persistAuthSessions(app);
    }
  }

  function rotateServerToken(): string {
    const nextToken = generateToken();
    app.config.wsToken = nextToken;
    process.env.WS_TOKEN = nextToken;
    return nextToken;
  }

  function reuseSession(sessionId: string): { cookie: string; session: AuthSession } | null {
    pruneExpiredAuthSessions(app);
    const session = app.runtimeState.authSessionsById.get(sessionId);
    if (!session || session.revokedAt || session.expiresAt <= now()) {
      return null;
    }
    if (session.deviceId) {
      removeDuplicateSessionsForDevice(session.deviceId, session.sessionId);
    }
    return touchSession(session);
  }

  function createSession(payload: AuthSessionCreateRequest): { cookie: string; session: AuthSession } {
    pruneExpiredAuthSessions(app);
    const deviceId = normalizeDeviceId((payload as AuthSessionCreateRequest & { deviceId?: string }).deviceId);
    const existing = findSessionByDeviceId(deviceId);
    if (existing) {
      existing.deviceName = normalizeDeviceName(payload.deviceName);
      existing.deviceId = deviceId;
      removeDuplicateSessionsForDevice(deviceId, existing.sessionId);
      return touchSession(existing);
    }
    const createdAt = now();
    const sessionId = generateId();
    const secret = generateSecret();
    const expiresAt = createdAt + SESSION_TTL_MS;
    const session = {
      sessionId,
      secret,
      deviceName: normalizeDeviceName(payload.deviceName),
      deviceId,
      createdAt,
      lastSeenAt: createdAt,
      expiresAt,
      revokedAt: null,
    };
    app.runtimeState.authSessionsById.set(sessionId, session);
    removeDuplicateSessionsForDevice(deviceId, sessionId);
    persistAuthSessions(app);
    return {
      cookie: buildSetCookieValue(buildCookieValue(sessionId, secret), Math.floor(SESSION_TTL_MS / 1000)),
      session: toAuthSession(session, sessionId),
    };
  }

  function authorizeCookie(cookieHeader: string | undefined): { sessionId: string } | null {
    pruneExpiredAuthSessions(app);
    const cookies = parseCookieHeader(cookieHeader);
    const raw = cookies[AUTH_COOKIE_NAME] || '';
    const dotIndex = raw.indexOf('.');
    if (dotIndex <= 0) {
      return null;
    }
    const sessionId = raw.slice(0, dotIndex);
    const secret = raw.slice(dotIndex + 1);
    const session = app.runtimeState.authSessionsById.get(sessionId);
    if (!session || session.secret !== secret || session.expiresAt <= now() || session.revokedAt) {
      return null;
    }
    session.lastSeenAt = now();
    session.expiresAt = session.lastSeenAt + SESSION_TTL_MS;
    persistAuthSessions(app);
    return { sessionId };
  }

  function listSessions(currentSessionId?: string): AuthSession[] {
    pruneExpiredAuthSessions(app);
    const activeSessionIds = new Set<string>();
    for (const client of app.runtimeState.clients) {
      if (typeof client.authSessionId === 'string' && client.authSessionId) {
        activeSessionIds.add(client.authSessionId);
      }
    }
    return Array.from(app.runtimeState.authSessionsById.values())
      .filter((session) => activeSessionIds.has(session.sessionId))
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
      .map((session) => toAuthSession(session, currentSessionId));
  }

  function revokeSession(sessionId: string): boolean {
    pruneExpiredAuthSessions(app);
    const existing = app.runtimeState.authSessionsById.get(sessionId);
    if (!existing) {
      return false;
    }
    app.runtimeState.authSessionsById.delete(sessionId);
    persistAuthSessions(app);
    for (const client of app.runtimeState.clients) {
      if (client.authSessionId === sessionId) {
        client.close(4401, 'Session revoked');
      }
    }
    return true;
  }

  function revokeAllSessions(): string[] {
    pruneExpiredAuthSessions(app);
    const removedSessionIds = Array.from(app.runtimeState.authSessionsById.keys());
    if (!removedSessionIds.length) {
      return [];
    }
    app.runtimeState.authSessionsById.clear();
    persistAuthSessions(app);
    for (const client of app.runtimeState.clients) {
      client.close(4401, 'All sessions revoked');
    }
    return removedSessionIds;
  }

  return {
    cookieName: AUTH_COOKIE_NAME,
    buildClearCookieValue,
    createSession,
    authorizeCookie,
    listSessions,
    revokeSession,
    revokeAllSessions,
    reuseSession,
    rotateServerToken,
  };
}
