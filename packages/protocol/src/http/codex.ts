import { z } from 'zod';

export const codexOptionsQuerySchema = z.object({
  cwd: z.string().optional(),
});

export const codexOptionModelSchema = z.object({
  id: z.string(),
  model: z.string(),
  displayName: z.string(),
  description: z.string(),
  isDefault: z.boolean(),
  defaultReasoningEffort: z.string(),
  supportedReasoningEfforts: z.array(z.string()),
});

export type CodexOptionModel = z.infer<typeof codexOptionModelSchema>;

export const codexOptionsResponseSchema = z.object({
  models: z.array(codexOptionModelSchema),
  defaults: z.object({
    model: z.string(),
    reasoningEffort: z.string(),
    approvalPolicy: z.string(),
    sandboxMode: z.string(),
  }),
});

export type CodexOptionsResponse = z.infer<typeof codexOptionsResponseSchema>;
