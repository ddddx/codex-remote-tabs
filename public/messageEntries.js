export function createMessageEntryBuilder(deps) {
  const {
    state,
    ensureItems,
    getServerRequestsForThread,
    createLocalId,
    normalizeUserMessageContent,
    extractItemTimestampMs,
    createUserMessageFingerprint,
    ensureItemRenderVersion,
    getReasoningText,
    findPendingRequestForItem,
    getCommandOutput,
    isItemInActiveTurn,
    getFileChangeOutput,
    getFileChangePatch,
    normalizeFileChanges,
    getEffectiveComposerSelection,
    inferPermissionPresetValue,
    normalizeTimestampMs,
  } = deps;

  function buildMessageEntries(threadId) {
    const connectionEntries = state.connectionError
      ? [{
        key: '__connection_error__',
        kind: '_error',
        text: state.connectionError,
        signature: JSON.stringify(['connection_error', state.connectionError]),
      }]
      : [];

    if (!threadId) {
      if (connectionEntries.length) {
        return connectionEntries;
      }
      if (state.creatingTab) {
        return [{
          key: 'creating',
          kind: 'empty',
          text: '正在新建会话并拉起本地 Codex 窗口...',
          signature: 'creating',
        }];
      }
      if (state.tabs.length) {
        return [{
          key: 'unselected',
          kind: 'empty',
          text: '请选择左侧一个会话开始查看和对话。',
          signature: 'unselected',
        }];
      }
      return [{
        key: 'empty',
        kind: 'empty',
        text: '还没有会话，点左侧 "+ 新建会话" 开始。',
        signature: 'empty',
      }];
    }

    const entries = buildSemanticTimelineEntries(threadId);
    if (!entries.length) {
      entries.push({
        key: 'thread-empty',
        kind: 'empty',
        text: '还没有消息，发送第一条指令开始。',
        signature: 'thread-empty',
      });
    }

    return connectionEntries.concat(entries);
  }

  function buildSemanticTimelineEntries(threadId) {
    const items = ensureItems(threadId);
    const partials = state.partialByThread.get(threadId) || new Map();
    const requests = getServerRequestsForThread(threadId);
    const groups = [];
    const groupsByKey = new Map();
    const groupsByTurnId = new Map();
    const itemToGroupKey = new Map();
    const looseEntries = [];

    function registerGroup(group) {
      groups.push(group);
      groupsByKey.set(group.key, group);
      if (group.turnId) {
        groupsByTurnId.set(group.turnId, group);
      }
      return group;
    }

    function ensureGroupForTurn(turnId) {
      if (!turnId) {
        return null;
      }
      const existing = groupsByTurnId.get(turnId);
      if (existing) {
        return existing;
      }
      return registerGroup({
        key: `turn:${turnId}`,
        turnId,
        userEntry: null,
        assistantEntries: [],
        isActive: false,
        isPendingLocal: false,
      });
    }

    function createPendingGroup(item) {
      const key = `pending:${item.id || createLocalId('pending')}`;
      const existing = groupsByKey.get(key);
      if (existing) {
        return existing;
      }
      return registerGroup({
        key,
        turnId: null,
        userEntry: null,
        assistantEntries: [],
        isActive: false,
        isPendingLocal: true,
      });
    }

    function getMostRecentGroup() {
      return groups[groups.length - 1] || null;
    }

    function attachItemToGroup(group, item, entry) {
      if (!group) {
        looseEntries.push(entry);
        return;
      }

      if (item?.type === 'userMessage' && !group.userEntry) {
        group.userEntry = entry;
      } else {
        group.assistantEntries.push(entry);
      }

      if (item?.id) {
        itemToGroupKey.set(item.id, group.key);
      }
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const entry = buildEntryFromItem(threadId, item, partials, index);
      if (!entry) {
        continue;
      }
      let group = null;

      if (item.type === 'userMessage') {
        group = item._turnId ? ensureGroupForTurn(item._turnId) : createPendingGroup(item);
        attachItemToGroup(group, item, entry);
        continue;
      }

      if (item._turnId) {
        group = ensureGroupForTurn(item._turnId);
      } else if (item.type !== '_error' && item.type !== '_warning') {
        group = getMostRecentGroup();
      } else if (getMostRecentGroup()) {
        group = getMostRecentGroup();
      }

      attachItemToGroup(group, item, entry);
    }

    for (const request of requests) {
      const entry = buildEntryFromServerRequest(request);
      let group = null;

      if (request.turnId) {
        group = ensureGroupForTurn(request.turnId);
      } else if (request.itemId && itemToGroupKey.has(request.itemId)) {
        group = groupsByKey.get(itemToGroupKey.get(request.itemId)) || null;
      } else {
        group = getMostRecentGroup();
      }

      if (group) {
        group.assistantEntries.push(entry);
        continue;
      }

      looseEntries.push(entry);
    }

    if (state.turnActiveByThread.get(threadId)) {
      const activeTurnId = state.currentTurnIdByThread.get(threadId) || null;
      let activeGroup = activeTurnId ? ensureGroupForTurn(activeTurnId) : getMostRecentGroup();
      if (!activeGroup) {
        activeGroup = registerGroup({
          key: activeTurnId ? `turn:${activeTurnId}` : `active:${threadId}`,
          turnId: activeTurnId,
          userEntry: null,
          assistantEntries: [],
          isActive: true,
          isPendingLocal: false,
        });
      }
      activeGroup.isActive = true;
    }

    const groupEntries = groups.map((group, index) => ({
      key: `timeline:${group.key}`,
      kind: 'turn',
      threadId,
      index: index + 1,
      userEntry: group.userEntry,
      assistantEntries: group.assistantEntries,
      isActive: group.isActive,
      isPendingLocal: group.isPendingLocal,
      signature: JSON.stringify([
        'turn',
        group.key,
        group.userEntry?.signature || '',
        group.assistantEntries.map((entry) => entry.signature),
        group.isActive,
        group.isPendingLocal,
      ]),
    }));

    return looseEntries.concat(groupEntries);
  }

  function hasLiveEntryActivity(entry) {
    if (!entry) {
      return false;
    }

    if (entry.kind === 'thinking') {
      return true;
    }

    if (entry.partial) {
      return true;
    }

    if (entry.kind === 'turn') {
      return entry.isActive
        || entry.assistantEntries.some((assistantEntry) => hasLiveEntryActivity(assistantEntry));
    }

    return false;
  }

  function createThinkingEntry(key = '__thinking__', threadId = '') {
    return {
      key,
      kind: 'thinking',
      threadId,
      signature: JSON.stringify(['thinking', key, threadId]),
    };
  }

  function buildEntryFromItem(threadId, item, partials, index) {
    const key = `${item.type}:${item.id || index}:${item._turnId || ''}`;

    if (item.type === 'userMessage') {
      const content = normalizeUserMessageContent(item);
      const text = content
        .filter((entry) => entry.type === 'text')
        .map((entry) => entry.text)
        .join('\n');
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'user',
        content,
        text,
        timestampMs,
        signature: JSON.stringify(['user', key, createUserMessageFingerprint(content), timestampMs || 0]),
      };
    }

    if (item.type === 'agentMessage') {
      const renderVersion = ensureItemRenderVersion(item);
      const partial = item._partial || partials.has(item.id);
      const text = partial ? (partials.get(item.id) || item.text || '') : (item.text || '');
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'agent',
        text,
        partial,
        phase: item.phase || '',
        timestampMs,
        signature: JSON.stringify(['agent', key, renderVersion, partial, item.phase || '', timestampMs || 0]),
      };
    }

    if (item.type === 'reasoning') {
      const renderVersion = ensureItemRenderVersion(item);
      const summary = getReasoningText(item);
      if (!summary) {
        return null;
      }
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'reasoning',
        text: summary,
        timestampMs,
        signature: JSON.stringify(['reasoning', key, renderVersion, timestampMs || 0]),
      };
    }

    if (item.type === 'webSearch') {
      const desc = describeWebSearch(item);
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'tool',
        label: desc,
        timestampMs,
        signature: JSON.stringify(['tool', key, desc, timestampMs || 0]),
      };
    }

    if (item.type === 'commandExecution') {
      const renderVersion = ensureItemRenderVersion(item);
      const command = item.command || item.input || '';
      const pendingRequest = findPendingRequestForItem(threadId, item.id);
      const status = pendingRequest ? 'pendingApproval' : (item.status || '');
      const output = getCommandOutput(item);
      const activeThreadId = isItemInActiveTurn(threadId, item) && (status === 'running' || status === 'in_progress' || status === 'pendingApproval')
        ? threadId
        : '';
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'command',
        command: typeof command === 'string' ? command : JSON.stringify(command),
        status,
        output,
        timestampMs,
        threadId: activeThreadId,
        signature: JSON.stringify(['command', key, renderVersion, status, activeThreadId, timestampMs || 0]),
      };
    }

    if (item.type === 'fileChange') {
      const renderVersion = ensureItemRenderVersion(item);
      const pendingRequest = findPendingRequestForItem(threadId, item.id);
      const status = pendingRequest ? 'pendingApproval' : (item.status || '');
      const output = getFileChangeOutput(item);
      const patch = getFileChangePatch(item);
      const changes = normalizeFileChanges(item.changes, patch);
      const activeThreadId = isItemInActiveTurn(threadId, item) && (status === 'running' || status === 'in_progress' || status === 'pendingApproval')
        ? threadId
        : '';
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'fileChange',
        status,
        changes,
        output,
        patch,
        timestampMs,
        threadId: activeThreadId,
        signature: JSON.stringify(['fileChange', key, renderVersion, status, activeThreadId, timestampMs || 0]),
      };
    }

    if (item.type === '_error' || item.type === '_warning') {
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: item.type,
        text: item.text || '',
        timestampMs,
        signature: JSON.stringify([item.type, key, item.text || '', timestampMs || 0]),
      };
    }

    if (item.type === '_permission_prompt') {
      const composerSelection = getEffectiveComposerSelection(threadId);
      const presetValue = inferPermissionPresetValue(composerSelection.approvalPolicy, composerSelection.sandboxMode);
      const timestampMs = extractItemTimestampMs(item);
      return {
        key,
        kind: 'permissionPrompt',
        text: item.text || '',
        threadId,
        presetValue,
        timestampMs,
        signature: JSON.stringify(['permissionPrompt', key, presetValue, item.text || '', timestampMs || 0]),
      };
    }

    return {
      key,
      kind: 'generic',
      label: item.type || 'unknown',
      preview: JSON.stringify(item, null, 2).substring(0, 500),
      signature: JSON.stringify(['generic', key, item.type || 'unknown', JSON.stringify(item)]),
    };
  }

  function buildEntryFromServerRequest(request) {
    const summary = JSON.stringify([
      request.kind,
      request.status,
      request.reason || '',
      request.command || '',
      request.cwd || '',
      request.grantRoot || '',
      JSON.stringify(request.permissions || {}),
      JSON.stringify(request.questions || []),
      JSON.stringify(request.fileChanges || {}),
    ]);

    return {
      key: `server_request:${request.requestId}`,
      kind: 'serverRequest',
      request,
      timestampMs: normalizeTimestampMs(request.createdAt) || null,
      signature: JSON.stringify([summary, normalizeTimestampMs(request.createdAt) || 0]),
    };
  }

  function describeWebSearch(item) {
    const action = item.action || {};
    if (action.type === 'search') {
      return `搜索 "${action.query || item.query || ''}"`;
    }
    if (action.type === 'openPage') {
      return `打开 ${action.url || ''}`;
    }
    return item.query || JSON.stringify(action);
  }

  return {
    basenamePath,
    buildMessageEntries,
    buildSemanticTimelineEntries,
    compactText,
    createThinkingEntry,
    formatAgentPhaseLabel,
    hasLiveEntryActivity,
  };
}

function compactText(text, maxLength = 120) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function basenamePath(filePath) {
  const normalized = String(filePath || '').replace(/[\\/]+$/, '');
  if (!normalized) {
    return '';
  }
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

function formatAgentPhaseLabel(phase) {
  if (phase === 'commentary') {
    return '处理中';
  }
  if (phase === 'final_answer') {
    return '最终答复';
  }
  return phase || '';
}
