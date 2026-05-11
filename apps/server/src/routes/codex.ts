import type { FastifyInstance } from 'fastify';
import type { CodexOptionsResponse } from '@codex-remote/protocol';

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function registerCodexRoutes(app: FastifyInstance): Promise<void> {
  let started = false;

  app.get('/api/codex/options', { preHandler: app.requireAuth }, async (request): Promise<CodexOptionsResponse> => {
    if (!started) {
      await app.codexClient.start();
      started = true;
    }

    const query = request.query as { cwd?: string };
    const [models, configResponse] = await Promise.all([
      app.codexClient.listModels({ includeHidden: false }),
      app.codexClient.readConfig({ cwd: query.cwd || process.cwd() }),
    ]);

    const config = configResponse?.config || {};

    return {
      models: models.map((model) => ({
        id: normalizeOptionalString(model.id || model.model),
        model: normalizeOptionalString(model.model || model.id),
        displayName: normalizeOptionalString(model.displayName || model.model || model.id),
        description: normalizeOptionalString(model.description),
        isDefault: model.isDefault === true,
        defaultReasoningEffort: normalizeOptionalString(model.defaultReasoningEffort),
        supportedReasoningEfforts: Array.isArray(model.supportedReasoningEfforts)
          ? model.supportedReasoningEfforts
            .map((entry) => {
              if (typeof entry === 'string') {
                return entry;
              }
              if (entry && typeof entry === 'object') {
                const objectEntry = entry as Record<string, unknown>;
                return normalizeOptionalString(objectEntry.reasoningEffort || objectEntry.value);
              }
              return '';
            })
            .filter(Boolean)
          : [],
      })),
      defaults: {
        model: normalizeOptionalString(config.model),
        reasoningEffort: normalizeOptionalString(config.model_reasoning_effort),
        approvalPolicy: normalizeOptionalString(config.approval_policy),
        sandboxMode: normalizeOptionalString(config.sandbox_mode),
      },
    };
  });
}
