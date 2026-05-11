import type { UploadImageResponse } from '@codex-remote/protocol';
import { buildApiUrl } from '../../lib/config.js';

export async function uploadImage(token: string, file: File): Promise<UploadImageResponse> {
  const response = await fetch(buildApiUrl('/api/uploads/image'), {
    method: 'POST',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-upload-filename': encodeURIComponent(file.name),
      ...(token ? { 'x-codex-remote-token': token } : {}),
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    let message = `upload failed: ${response.status}`;
    try {
      const payload = await response.json() as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Ignore upload parse failures.
    }
    throw new Error(message);
  }

  return response.json() as Promise<UploadImageResponse>;
}
