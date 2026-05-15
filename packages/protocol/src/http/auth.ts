import { z } from 'zod';

export const authSessionSchema = z.object({
  sessionId: z.string(),
  deviceName: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  expiresAt: z.number(),
  current: z.boolean().optional(),
  online: z.boolean().optional(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const authSessionCreateRequestSchema = z.object({
  token: z.string(),
  deviceName: z.string().optional(),
  deviceId: z.string().optional(),
});

export type AuthSessionCreateRequest = z.infer<typeof authSessionCreateRequestSchema>;

export const authSessionCreateResponseSchema = z.object({
  ok: z.literal(true),
  session: authSessionSchema,
});

export type AuthSessionCreateResponse = z.infer<typeof authSessionCreateResponseSchema>;

export const authSessionListResponseSchema = z.object({
  sessions: z.array(authSessionSchema),
});

export type AuthSessionListResponse = z.infer<typeof authSessionListResponseSchema>;

export const authSessionDeleteResponseSchema = z.object({
  ok: z.literal(true),
  removedSessionId: z.string().optional(),
  removedSessionIds: z.array(z.string()).optional(),
});

export type AuthSessionDeleteResponse = z.infer<typeof authSessionDeleteResponseSchema>;
