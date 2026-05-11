import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { UploadImageResponse } from '@codex-remote/protocol';

const IMAGE_CONTENT_TYPES = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/bmp', '.bmp'],
]);

const UPLOAD_ROOT = path.join(process.cwd(), '.codex-remote-uploads');

function normalizeImageContentType(value: string | undefined): string {
  const contentType = String(value || '').trim().toLowerCase();
  if (!IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error('不支持的图片类型');
  }
  return contentType;
}

function decodeUploadFileName(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return '';
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildUploadFileName(originalName: string, contentType: string): string {
  const extension = IMAGE_CONTENT_TYPES.get(contentType) || '.bin';
  const safeBase = path.basename(originalName || 'upload', path.extname(originalName || 'upload'))
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'upload';
  return `${Date.now()}-${safeBase}${extension}`;
}

function resolveUploadedFile(fileName: string): string {
  const normalized = path.basename(fileName || '').trim();
  if (!normalized) {
    throw new Error('图片文件名无效');
  }
  return path.join(UPLOAD_ROOT, normalized);
}

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(/^image\/.*/, { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/api/uploads/image', { preHandler: app.requireAuth }, async (request): Promise<UploadImageResponse> => {
    const contentType = normalizeImageContentType(request.headers['content-type']);
    const originalName = decodeUploadFileName(request.headers['x-upload-filename']);
    const savedName = buildUploadFileName(originalName, contentType);
    const filePath = path.join(UPLOAD_ROOT, savedName);
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);

    if (!body.length) {
      throw new Error('图片内容为空');
    }

    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    await fsp.writeFile(filePath, body);

    return {
      id: savedName,
      name: originalName || savedName,
      contentType,
      filePath,
      url: `/api/uploads/${encodeURIComponent(savedName)}`,
    };
  });

  app.get('/api/uploads/:fileName', { preHandler: app.requireAuth }, async (request, reply) => {
    const params = request.params as { fileName: string };
    const resolved = resolveUploadedFile(params.fileName);
    if (!fs.existsSync(resolved)) {
      reply.status(404).send({
        code: 'NOT_FOUND',
        message: '图片不存在',
      });
      return;
    }

    return reply.send(fs.createReadStream(resolved));
  });
}
