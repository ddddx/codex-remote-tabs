import type { ServerRequestItem, ThreadRunState, TimelineEntry } from '../../store/appStore.js';

export type TimelineGroup = {
  id: string;
  turnId?: string;
  label: string;
  status: 'running' | 'completed' | 'pending';
  entries: TimelineEntry[];
  approvals: ServerRequestItem[];
  createdAt: number;
};

function getEntryTime(entry: TimelineEntry): number {
  return typeof entry.createdAt === 'number' ? entry.createdAt : 0;
}

function getApprovalTime(request: ServerRequestItem): number {
  return typeof request.createdAt === 'number' ? request.createdAt : 0;
}

function defaultGroupStatus(entries: TimelineEntry[], approvals: ServerRequestItem[]): 'running' | 'completed' | 'pending' {
  if (approvals.some((item) => item.status !== 'submitting')) {
    return 'pending';
  }
  if (entries.some((entry) => entry.status === 'running')) {
    return 'running';
  }
  return 'completed';
}

export function buildTimelineGroups(
  entries: TimelineEntry[],
  approvals: ServerRequestItem[],
  turnState?: ThreadRunState,
): TimelineGroup[] {
  const entryGroups = new Map<string, TimelineGroup>();

  const sortedEntries = [...entries].sort((left, right) => getEntryTime(left) - getEntryTime(right));
  for (const entry of sortedEntries) {
    const key = entry.turnId ? `turn:${entry.turnId}` : `entry:${entry.id}`;
    const existing = entryGroups.get(key);
    if (existing) {
      existing.entries.push(entry);
      existing.createdAt = Math.min(existing.createdAt, getEntryTime(entry));
      continue;
    }
    entryGroups.set(key, {
      id: key,
      turnId: entry.turnId,
      label: entry.turnId ? 'Turn' : 'Session Event',
      status: entry.status === 'running' ? 'running' : 'completed',
      entries: [entry],
      approvals: [],
      createdAt: getEntryTime(entry),
    });
  }

  for (const request of approvals) {
    const key = request.turnId ? `turn:${request.turnId}` : `approval:${request.requestId}`;
    const existing = entryGroups.get(key);
    if (existing) {
      existing.approvals.push(request);
      existing.createdAt = Math.min(existing.createdAt, getApprovalTime(request));
      continue;
    }
    entryGroups.set(key, {
      id: key,
      turnId: request.turnId,
      label: request.turnId ? 'Turn' : 'Pending Approval',
      status: request.status === 'submitting' ? 'running' : 'pending',
      entries: [],
      approvals: [request],
      createdAt: getApprovalTime(request),
    });
  }

  const groups = [...entryGroups.values()].sort((left, right) => left.createdAt - right.createdAt);
  const turnGroups = groups.filter((group) => group.turnId);
  const turnIndexById = new Map(turnGroups.map((group, index) => [group.turnId || '', index + 1]));

  for (const group of groups) {
    group.entries.sort((left, right) => getEntryTime(left) - getEntryTime(right));
    group.approvals.sort((left, right) => getApprovalTime(left) - getApprovalTime(right));
    group.status = defaultGroupStatus(group.entries, group.approvals);
    if (group.turnId) {
      const turnNumber = turnIndexById.get(group.turnId) || 0;
      group.label = `Turn ${turnNumber}`;
      if (turnState?.turnId === group.turnId && turnState.active) {
        group.status = 'running';
      }
    } else if (group.approvals.length) {
      group.label = 'Approval';
    }
  }

  if (turnState?.active && turnState.turnId && !entryGroups.has(`turn:${turnState.turnId}`)) {
    groups.push({
      id: `turn:${turnState.turnId}`,
      turnId: turnState.turnId,
      label: `Turn ${groups.filter((group) => group.turnId).length + 1}`,
      status: 'running',
      entries: [{
        id: `thinking:${turnState.turnId}`,
        type: 'reasoning',
        role: 'assistant',
        turnId: turnState.turnId,
        title: 'Thinking',
        text: 'Waiting for streamed reasoning or tool output…',
        status: 'running',
        createdAt: turnState.startedAt || Date.now(),
      }],
      approvals: [],
      createdAt: turnState.startedAt || Date.now(),
    });
  }

  return groups.sort((left, right) => left.createdAt - right.createdAt);
}
