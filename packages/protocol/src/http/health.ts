import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'shutting_down']),
  tabs: z.number(),
  websocketClients: z.number(),
  uptimeSec: z.number(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
