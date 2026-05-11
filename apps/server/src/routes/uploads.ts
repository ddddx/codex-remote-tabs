import fs from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { UploadImageResponse } from '@codex-remote/protocol';

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(/^image\/.*/, { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/api/uploads/image', { preHandler: app.requireAuth }, async (request): Promise<UploadImageResponse> => {
    return app.services.uploads.saveImage({
      contentTypeHeader: request.headers['content-type'],
      originalNameHeader: request.headers['x-upload-filename'],
      body: request.body,
    });
  });

  app.get('/api/uploads/:fileName', { preHandler: app.requireAuth }, async (request, reply) => {
    const params = request.params as { fileName: string };
    const resolved = app.services.uploads.resolveFilePath(params.fileName);
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
