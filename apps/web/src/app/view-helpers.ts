import type { ServerRequestItem, TimelineEntry } from '../store/appStore.js';

export function buildSessionNameFromPrompt(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return '新会话';
  }
  return firstLine.slice(0, 40);
}

export function formatTokenUsageValue(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (!value || typeof value !== 'object') {
    return '-';
  }

  const usage = value as Record<string, unknown>;
  const total = usage.totalTokens ?? usage.total_tokens;
  const input = usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens;
  const output = usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens;

  if (typeof total === 'number') {
    return String(total);
  }

  const parts = [
    typeof input === 'number' ? `in ${input}` : '',
    typeof output === 'number' ? `out ${output}` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' / ') : '-';
}

export function buildApprovalSummary(request: {
  kind?: string;
  reason?: string;
  command?: string;
  tool?: string;
  namespace?: string;
  serverName?: string;
  message?: string;
  patch?: string;
  questions?: Array<{ question?: string; header?: string }>;
  url?: string;
}): string {
  if (request.reason) {
    return request.reason;
  }
  if (request.command) {
    return request.command;
  }
  if (request.message) {
    return request.message;
  }
  if (request.tool) {
    return request.namespace ? `Tool: ${request.namespace}.${request.tool}` : `Tool: ${request.tool}`;
  }
  if (request.serverName) {
    return `Server: ${request.serverName}`;
  }
  if (request.url) {
    return request.url;
  }
  if (request.questions?.length) {
    return request.questions
      .map((entry) => entry.question || entry.header || '')
      .filter(Boolean)
      .join('\n');
  }
  if (request.patch) {
    return request.patch.slice(0, 240);
  }
  return request.kind || 'Pending approval';
}

export function getDecisionLabel(decision: string | Record<string, unknown>): string {
  if (typeof decision === 'string') {
    if (decision === 'accept' || decision === 'approved') {
      return 'Approve';
    }
    if (decision === 'acceptForSession' || decision === 'approved_for_session') {
      return 'Approve for session';
    }
    if (decision === 'decline' || decision === 'denied') {
      return 'Reject';
    }
    if (decision === 'cancel') {
      return 'Cancel';
    }
    return decision;
  }

  if (decision && typeof decision === 'object') {
    if ('acceptWithExecpolicyAmendment' in decision) {
      return 'Approve with policy';
    }
    if ('acceptWithNetworkPolicyAmendments' in decision) {
      return 'Approve network';
    }
  }

  return 'Respond';
}

export function summarizeTimelineEntry(entry: TimelineEntry): string {
  if (entry.text?.trim()) {
    return entry.text;
  }
  if (entry.patch?.trim()) {
    return entry.patch;
  }
  if (entry.meta?.length) {
    return entry.meta.join('\n');
  }
  return 'No details';
}

export function formatTimelineLabel(entry: TimelineEntry): string {
  if (entry.title) {
    return entry.title;
  }
  if (entry.role) {
    return entry.role;
  }
  return entry.type;
}

export function buildUserInputResponse(
  request: ServerRequestItem,
  formState: Record<string, string>,
): { answers: Record<string, { answers: string[] }> } {
  const answers: Record<string, { answers: string[] }> = {};

  for (const question of request.questions || []) {
    const questionId = question.id || '';
    if (!questionId) {
      continue;
    }
    const value = (formState[questionId] || '').trim();
    if (!value) {
      continue;
    }
    answers[questionId] = {
      answers: [value],
    };
  }

  return { answers };
}

export function normalizeSchemaFieldValue(value: string, schema: Record<string, unknown> | null): unknown {
  const type = typeof schema?.type === 'string' ? schema.type : 'string';
  const trimmed = value.trim();
  if (!trimmed) {
    if (type === 'number' || type === 'integer') {
      return null;
    }
    return '';
  }
  if (type === 'number') {
    const next = Number(trimmed);
    return Number.isFinite(next) ? next : null;
  }
  if (type === 'integer') {
    const next = Number.parseInt(trimmed, 10);
    return Number.isFinite(next) ? next : null;
  }
  if (type === 'boolean') {
    return trimmed === 'true';
  }
  return trimmed;
}
