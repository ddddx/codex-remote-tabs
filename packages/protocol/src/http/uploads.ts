import { z } from 'zod';

export const uploadFileParamsSchema = z.object({
  fileName: z.string(),
});

export const uploadImageResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  filePath: z.string(),
  url: z.string(),
});

export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;
