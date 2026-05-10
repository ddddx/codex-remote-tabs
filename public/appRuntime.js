export function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return normalizeTimestampMs(Number(trimmed));
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function extractItemTimestampMs(item) {
  return normalizeTimestampMs(item?.createdAt)
    || normalizeTimestampMs(item?.startedAt)
    || normalizeTimestampMs(item?.completedAt)
    || normalizeTimestampMs(item?.updatedAt)
    || normalizeTimestampMs(item?._localCreatedAt)
    || null;
}

export function createTimestampNode(timestampMs, extraClass = '') {
  const normalized = normalizeTimestampMs(timestampMs);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const node = document.createElement('div');
  node.className = extraClass ? `entry-timestamp ${extraClass}` : 'entry-timestamp';
  node.textContent = `${hh}:${mm}:${ss}`;
  node.title = date.toLocaleString();
  return node;
}

export function getTurnStartedAtFromTurn(turn) {
  return normalizeTimestampMs(turn?.startedAt)
    || normalizeTimestampMs(turn?.createdAt)
    || normalizeTimestampMs(turn?.updatedAt)
    || null;
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

function formatShortElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function createTurnTimingHelpers(state) {
  function rememberTurnStartedAt(threadId, timestamp) {
    if (!threadId) {
      return;
    }

    const normalized = normalizeTimestampMs(timestamp) || Date.now();
    const existing = state.turnStartedAtByThread.get(threadId);
    if (!existing || normalized < existing) {
      state.turnStartedAtByThread.set(threadId, normalized);
    }
  }

  function clearTurnStartedAt(threadId) {
    state.turnStartedAtByThread.delete(threadId);
  }

  function getTurnElapsedLabel(threadId) {
    const startedAt = state.turnStartedAtByThread.get(threadId);
    if (!startedAt) {
      return '';
    }
    return `已执行 ${formatElapsed(Date.now() - startedAt)}`;
  }

  function getTurnWorkingLabel(threadId) {
    const startedAt = state.turnStartedAtByThread.get(threadId);
    if (!startedAt) {
      return '';
    }
    return `Working ${formatShortElapsed(Date.now() - startedAt)}`;
  }

  return {
    clearTurnStartedAt,
    getTurnElapsedLabel,
    getTurnWorkingLabel,
    rememberTurnStartedAt,
  };
}

export function createRenderScheduler(renderHeader, renderMessages) {
  let scheduledRenderFrame = 0;
  let scheduledRenderHeader = false;
  let scheduledRenderMessages = false;

  return function scheduleRender(options = {}) {
    if (options.header) {
      scheduledRenderHeader = true;
    }
    if (options.messages) {
      scheduledRenderMessages = true;
    }
    if (scheduledRenderFrame) {
      return;
    }
    scheduledRenderFrame = window.requestAnimationFrame(() => {
      scheduledRenderFrame = 0;
      const shouldRenderHeader = scheduledRenderHeader;
      const shouldRenderMessages = scheduledRenderMessages;
      scheduledRenderHeader = false;
      scheduledRenderMessages = false;
      if (shouldRenderHeader) {
        renderHeader();
      }
      if (shouldRenderMessages) {
        renderMessages();
      }
    });
  };
}

export function autoResizeTextarea(textarea, maxHeight = 162) {
  textarea.style.height = '0px';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${Math.max(45, nextHeight)}px`;
}

export function getDefaultWorkspacePath(shortcuts) {
  return shortcuts?.lastUsedPath || shortcuts?.projectRoot || shortcuts?.desktopPath || '';
}
