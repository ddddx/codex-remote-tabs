let reconnectTimer = null;
let reconnectAttempt = 0;

const WEBSOCKET_TOKEN_STORAGE_KEY = 'codex-remote-ws-token';
const EMPTY_THREAD_KEY = '__empty__';

function getWebSocketToken() {
  const queryToken = new URLSearchParams(window.location.search).get('token');
  try {
    if (queryToken) {
      window.localStorage.setItem(WEBSOCKET_TOKEN_STORAGE_KEY, queryToken);
      return queryToken;
    }
    return window.localStorage.getItem(WEBSOCKET_TOKEN_STORAGE_KEY) || '';
  } catch (_error) {
    return queryToken || '';
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  const delay = Math.min(30000, 1000 * (2 ** reconnectAttempt));
  reconnectAttempt += 1;
  console.log(`ws closed, reconnecting in ${Math.round(delay / 1000)}s...`);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function connect() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = new URL(`${wsProtocol}://${window.location.host}/ws`);
  const token = getWebSocketToken();
  if (token) {
    wsUrl.searchParams.set('token', token);
  }

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('ws connected');
    reconnectAttempt = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (state.activeThreadId) {
      send({ type: 'thread_sync', threadId: state.activeThreadId });
    }
  };

  socket.onmessage = (event) => {
    try {
      handleMessage(JSON.parse(event.data));
    } catch (error) {
      console.error('ws parse error', error);
    }
  };

  socket.onclose = () => {
    scheduleReconnect();
  };

  socket.onerror = (error) => {
    console.error('ws error', error);
    socket.close();
  };

  window._ws = socket;
}

connect();

// DOM
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const tabList = document.getElementById('tabList');
const newTabBtn = document.getElementById('newTabBtn');
const messagesEl = document.getElementById('messages');
const composer = document.getElementById('composer');
const promptInput = document.getElementById('promptInput');
const activeTitle = document.getElementById('activeTitle');
const activeStatus = document.getElementById('activeStatus');
const mainArea = document.querySelector('.main-area');
const tabTpl = document.getElementById('tabTpl');
const textModal = document.getElementById('textModal');
const textModalForm = document.getElementById('textModalForm');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

const state = {
  tabs: [],
  activeThreadId: null,
  itemsByThread: new Map(),
  partialByThread: new Map(),
  turnActiveByThread: new Map(),
  unreadThreadIds: new Set(),
};

const messageDomByThread = new Map();
const modalState = {
  resolve: null,
  previousFocus: null,
};

function send(payload) {
  if (window._ws && window._ws.readyState === WebSocket.OPEN) {
    window._ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  if (!text) {
    return '';
  }

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/\n/g, '<br>');

  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html);
  }
  return html;
}

function ensureItems(threadId) {
  if (!state.itemsByThread.has(threadId)) {
    state.itemsByThread.set(threadId, []);
  }
  return state.itemsByThread.get(threadId);
}

function ensurePartials(threadId) {
  if (!state.partialByThread.has(threadId)) {
    state.partialByThread.set(threadId, new Map());
  }
  return state.partialByThread.get(threadId);
}

function ensureMessageDomMap(threadKey) {
  if (!messageDomByThread.has(threadKey)) {
    messageDomByThread.set(threadKey, new Map());
  }
  return messageDomByThread.get(threadKey);
}

function pruneUnreadThreads() {
  const validThreadIds = new Set(state.tabs.map((tab) => tab.threadId));
  for (const threadId of state.unreadThreadIds) {
    if (!validThreadIds.has(threadId)) {
      state.unreadThreadIds.delete(threadId);
    }
  }
}

function markThreadUnread(threadId) {
  if (!threadId || threadId === state.activeThreadId) {
    return false;
  }
  if (!state.tabs.some((tab) => tab.threadId === threadId)) {
    return false;
  }
  const sizeBefore = state.unreadThreadIds.size;
  state.unreadThreadIds.add(threadId);
  return state.unreadThreadIds.size !== sizeBefore;
}

function upsertTab(tab) {
  const index = state.tabs.findIndex((entry) => entry.threadId === tab.threadId);
  if (index >= 0) {
    state.tabs[index] = tab;
  } else {
    state.tabs.push(tab);
  }

  state.tabs.sort((a, b) => b.updatedAt - a.updatedAt);
  if (!state.activeThreadId) {
    setActiveTab(tab.threadId);
  }
}

function removeTab(threadId) {
  state.tabs = state.tabs.filter((tab) => tab.threadId !== threadId);
  state.itemsByThread.delete(threadId);
  state.partialByThread.delete(threadId);
  state.turnActiveByThread.delete(threadId);
  state.unreadThreadIds.delete(threadId);
  messageDomByThread.delete(threadId);

  if (state.activeThreadId === threadId) {
    state.activeThreadId = state.tabs[0]?.threadId || null;
    if (state.activeThreadId) {
      send({ type: 'thread_sync', threadId: state.activeThreadId });
    }
  }

  render();
}

function markTabClosedLocally(threadId) {
  if (!threadId) {
    return false;
  }
  const tab = state.tabs.find((entry) => entry.threadId === threadId);
  if (!tab) {
    return false;
  }

  tab.status = 'closed';
  tab.updatedAt = Math.floor(Date.now() / 1000);
  state.turnActiveByThread.set(threadId, false);
  return true;
}

function setActiveTab(threadId) {
  if (!threadId) {
    return;
  }

  if (!state.tabs.some((entry) => entry.threadId === threadId)) {
    upsertTab({
      threadId,
      name: 'New Tab',
      status: 'idle',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      windowPid: null,
    });
  }

  state.activeThreadId = threadId;
  state.unreadThreadIds.delete(threadId);
  if (!send({ type: 'thread_sync', threadId })) {
    const items = ensureItems(threadId);
    items.push({
      type: '_warning',
      id: createLocalId('ws'),
      text: '连接尚未建立，已自动重连。连接恢复后会同步消息。',
    });
  }
  render();
}

function syncTurns(threadId, turns) {
  const syncedItems = [];
  for (const turn of turns || []) {
    for (const item of turn.items || []) {
      syncedItems.push(item);
    }
  }

  const existing = state.itemsByThread.get(threadId) || [];
  const syncedIds = new Set(syncedItems.map((item) => item.id));
  const partials = state.partialByThread.get(threadId) || new Map();
  const merged = [...syncedItems];

  for (const item of existing) {
    const isTransient = item.type !== '_error' && item.type !== '_warning';
    const isPartial = item._partial || partials.has(item.id);
    if (!isTransient && !syncedIds.has(item.id)) {
      merged.push(item);
      continue;
    }
    if (isPartial && !syncedIds.has(item.id)) {
      merged.push(item);
    }
  }

  state.itemsByThread.set(threadId, dedupeItems(merged));

  const lastTurn = turns?.[turns.length - 1];
  const lastTurnStatus = normalizeTurnStatus(lastTurn?.status);
  if (lastTurnStatus === 'completed' || lastTurnStatus === 'failed') {
    state.partialByThread.delete(threadId);
    state.turnActiveByThread.set(threadId, false);
  } else if (lastTurnStatus === 'inProgress') {
    state.turnActiveByThread.set(threadId, true);
  }
}

function dedupeItems(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = `${item.type}:${item.id || ''}:${item.text || ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function normalizeTurnStatus(status) {
  const raw = typeof status === 'object' && status ? status.type : status;
  if (typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const compact = trimmed.replace(/[\s_-]/g, '').toLowerCase();
  if (compact === 'inprogress' || compact === 'active' || compact === 'running') {
    return 'inProgress';
  }
  if (compact === 'completed' || compact === 'succeeded') {
    return 'completed';
  }
  if (compact === 'failed' || compact === 'systemerror') {
    return 'failed';
  }
  if (compact === 'cancelled' || compact === 'aborted' || compact === 'idle') {
    return compact;
  }
  return trimmed;
}

function upsertStreamingItem(threadId, itemId, delta) {
  if (!itemId) {
    return;
  }

  const items = ensureItems(threadId);
  const partials = ensurePartials(threadId);
  const current = partials.get(itemId) || '';
  partials.set(itemId, current + delta);

  let existing = items.find((entry) => entry.type === 'agentMessage' && entry.id === itemId);
  if (existing) {
    existing.text = partials.get(itemId);
    existing._partial = true;
    return;
  }

  existing = { type: 'agentMessage', id: itemId, text: partials.get(itemId), _partial: true };
  items.push(existing);
}

function finalizeItem(threadId, item) {
  if (!item || !item.id) {
    return;
  }

  const items = ensureItems(threadId);
  const partials = ensurePartials(threadId);
  partials.delete(item.id);

  const index = items.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    items[index] = { ...item, _partial: false };
    return;
  }

  items.push({ ...item, _partial: false });
}

function renderTabs() {
  tabList.innerHTML = '';
  for (const tab of state.tabs) {
    const status = normalizeTabStatus(tab.status);
    const isClosed = status === 'closed';
    const hasUnread = state.unreadThreadIds.has(tab.threadId) && tab.threadId !== state.activeThreadId;
    const node = tabTpl.content.firstElementChild.cloneNode(true);
    node.dataset.threadId = tab.threadId;
    node.classList.toggle('active', tab.threadId === state.activeThreadId);
    node.classList.toggle('closed', isClosed);
    node.classList.toggle('has-unread', hasUnread);
    node.querySelector('.name').textContent = tab.name || 'New Tab';
    const meta = node.querySelector('.meta');
    meta.replaceChildren();
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot ${isClosed ? 'closed' : 'open'}`;
    const statusText = document.createElement('span');
    statusText.className = 'status-text';
    statusText.textContent = isClosed ? '已关闭' : '在线';
    meta.append(statusDot, statusText);

    node.querySelector('.close').addEventListener('click', (event) => {
      event.stopPropagation();
      send({ type: 'tab_close', threadId: tab.threadId });
    });

    node.addEventListener('click', () => setActiveTab(tab.threadId));
    tabList.appendChild(node);
  }
}

function normalizeTabStatus(status) {
  const raw = typeof status === 'object' && status ? status.type : status;
  if (typeof raw !== 'string') {
    return 'idle';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return 'idle';
  }

  const compact = trimmed.replace(/[\s_-]/g, '').toLowerCase();
  if (compact === 'notloaded' || compact === 'unloaded') {
    return 'idle';
  }
  if (compact === 'inprogress') {
    return 'active';
  }
  if (compact === 'systemerror') {
    return 'systemError';
  }
  return trimmed;
}

function renderHeader() {
  const tab = state.tabs.find((entry) => entry.threadId === state.activeThreadId);
  activeTitle.textContent = tab ? (tab.name || 'New Tab') : 'Codex Remote Control';

  const status = tab ? normalizeTabStatus(tab.status) : '';
  activeStatus.textContent = status === 'closed' ? '已关闭' : status;
  activeStatus.className = 'status-badge';
  if (status === 'running' || status === 'active') {
    activeStatus.classList.add('running');
  }
  if (status === 'failed' || status === 'systemError') {
    activeStatus.classList.add('failed');
  }
  if (status === 'closed') {
    activeStatus.classList.add('closed');
  }
}

function renderMessages() {
  const threadKey = state.activeThreadId || EMPTY_THREAD_KEY;
  const entries = buildMessageEntries(state.activeThreadId);
  const domMap = ensureMessageDomMap(threadKey);
  const nextKeys = new Set(entries.map((entry) => entry.key));
  const shouldStickToBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 24;

  for (const [key] of domMap) {
    if (!nextKeys.has(key)) {
      domMap.delete(key);
    }
  }

  const orderedNodes = [];
  for (const entry of entries) {
    let record = domMap.get(entry.key);
    if (!record) {
      record = { node: document.createElement('div'), signature: '' };
      domMap.set(entry.key, record);
    }

    if (record.signature !== entry.signature) {
      populateMessageNode(record.node, entry);
      record.signature = entry.signature;
    }

    orderedNodes.push(record.node);
  }

  orderedNodes.forEach((node, index) => {
    const current = messagesEl.childNodes[index];
    if (current !== node) {
      messagesEl.insertBefore(node, current || null);
    }
  });

  while (messagesEl.childNodes.length > orderedNodes.length) {
    messagesEl.removeChild(messagesEl.lastChild);
  }

  if (shouldStickToBottom || entries.some((entry) => entry.kind === 'thinking' || entry.partial)) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function buildMessageEntries(threadId) {
  if (!threadId) {
    return [{
      key: 'empty',
      kind: 'empty',
      text: '还没有标签，点左侧 "+ 新建标签" 开始。',
      signature: 'empty',
    }];
  }

  const items = ensureItems(threadId);
  const partials = state.partialByThread.get(threadId) || new Map();
  const entries = items.map((item, index) => buildEntryFromItem(item, partials, index));

  const hasPartialAgent = items.some((item) => item.type === 'agentMessage' && (item._partial || partials.has(item.id)));
  if (state.turnActiveByThread.get(threadId) && !hasPartialAgent) {
    entries.push({
      key: '__thinking__',
      kind: 'thinking',
      signature: 'thinking',
    });
  }

  return entries;
}

function buildEntryFromItem(item, partials, index) {
  const key = `${item.type}:${item.id || index}`;

  if (item.type === 'userMessage') {
    const text = (item.content || [])
      .filter((entry) => entry.type === 'text')
      .map((entry) => entry.text)
      .join('\n');
    return {
      key,
      kind: 'user',
      text,
      signature: JSON.stringify(['user', key, text]),
    };
  }

  if (item.type === 'agentMessage') {
    const partial = item._partial || partials.has(item.id);
    const text = partial ? (partials.get(item.id) || item.text || '') : (item.text || '');
    return {
      key,
      kind: 'agent',
      text,
      partial,
      phase: item.phase || '',
      signature: JSON.stringify(['agent', key, text, partial, item.phase || '']),
    };
  }

  if (item.type === 'reasoning') {
    const summary = (item.summary || []).map((entry) => entry.text || entry).join('\n');
    return {
      key,
      kind: 'reasoning',
      text: summary,
      signature: JSON.stringify(['reasoning', key, summary]),
    };
  }

  if (item.type === 'webSearch') {
    const desc = describeWebSearch(item);
    return {
      key,
      kind: 'tool',
      label: desc,
      signature: JSON.stringify(['tool', key, desc]),
    };
  }

  if (item.type === 'commandExecution') {
    const command = item.command || item.input || '';
    const status = item.status || '';
    const output = item.aggregatedOutput || item.output || '';
    return {
      key,
      kind: 'command',
      command: typeof command === 'string' ? command : JSON.stringify(command),
      status,
      output,
      signature: JSON.stringify(['command', key, command, status, output]),
    };
  }

  if (item.type === '_error' || item.type === '_warning') {
    return {
      key,
      kind: item.type,
      text: item.text || '',
      signature: JSON.stringify([item.type, key, item.text || '']),
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

function describeWebSearch(item) {
  const action = item.action || {};
  if (action.type === 'search') {
    return `🔍 搜索 "${action.query || item.query || ''}"`;
  }
  if (action.type === 'openPage') {
    return `🌐 打开 ${action.url || ''}`;
  }
  return `🔍 ${item.query || JSON.stringify(action)}`;
}

function populateMessageNode(node, entry) {
  node.className = 'message';
  node.replaceChildren();

  if (entry.kind === 'empty') {
    node.classList.add('empty-state');
    node.textContent = entry.text;
    return;
  }

  if (entry.kind === 'thinking') {
    node.classList.add('agent', 'thinking');
    node.appendChild(createDot());
    node.appendChild(createDot());
    node.appendChild(createDot());
    return;
  }

  if (entry.kind === 'user') {
    node.classList.add('user');
    node.textContent = entry.text;
    return;
  }

  if (entry.kind === 'agent') {
    node.classList.add('agent');
    if (entry.phase && entry.phase !== 'final_answer') {
      const phase = document.createElement('div');
      phase.className = 'item-phase';
      phase.textContent = entry.phase;
      node.appendChild(phase);
    }

    const body = createMessageBody(renderMarkdown(entry.text));
    node.appendChild(body);
    if (entry.partial) {
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.textContent = ' ▌';
      body.appendChild(cursor);
    }
    return;
  }

  if (entry.kind === 'reasoning') {
    node.classList.add('reasoning');
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = entry.text ? '思考' : '思考中...';
    node.appendChild(label);
    if (entry.text) {
      node.appendChild(createMessageBody(renderMarkdown(entry.text)));
    }
    return;
  }

  if (entry.kind === 'tool') {
    node.classList.add('tool-call');
    node.textContent = entry.label;
    return;
  }

  if (entry.kind === 'command') {
    node.classList.add('tool-call');
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = `${commandStatusIcon(entry.status)} 命令执行`;
    node.appendChild(label);

    const code = document.createElement('code');
    code.textContent = entry.command;
    node.appendChild(code);

    if (entry.output) {
      const output = document.createElement('pre');
      output.className = 'cmd-output';
      output.textContent = entry.output;
      node.appendChild(output);
    }
    return;
  }

  if (entry.kind === '_error' || entry.kind === '_warning') {
    node.classList.add(entry.kind);
    node.textContent = entry.text;
    return;
  }

  node.classList.add('tool-call');
  const label = document.createElement('div');
  label.className = 'item-label';
  label.textContent = `⚙ ${entry.label}`;
  node.appendChild(label);

  const preview = document.createElement('pre');
  preview.textContent = entry.preview;
  node.appendChild(preview);
}

function createMessageBody(html) {
  const body = document.createElement('div');
  body.className = 'message-body';
  body.innerHTML = html;
  return body;
}

function createDot() {
  const dot = document.createElement('span');
  dot.className = 'dot';
  return dot;
}

function commandStatusIcon(status) {
  if (status === 'completed') {
    return '✅';
  }
  if (status === 'failed') {
    return '❌';
  }
  if (status === 'pendingApproval') {
    return '⏳';
  }
  return '⚡';
}

function render() {
  renderTabs();
  renderHeader();
  renderMessages();
}

function openTextModal(options = {}) {
  if (modalState.resolve) {
    closeTextModal(null);
  }

  modalState.previousFocus = document.activeElement;
  modalTitle.textContent = options.title || '输入';
  modalInput.value = options.defaultValue || '';
  modalInput.placeholder = options.placeholder || '';
  modalConfirmBtn.textContent = options.confirmText || '确定';
  textModal.classList.add('open');
  textModal.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    modalState.resolve = resolve;
    window.setTimeout(() => {
      modalInput.focus();
      modalInput.select();
    }, 0);
  });
}

function closeTextModal(value) {
  if (!modalState.resolve) {
    return;
  }

  const resolve = modalState.resolve;
  modalState.resolve = null;
  textModal.classList.remove('open');
  textModal.setAttribute('aria-hidden', 'true');
  resolve(value);

  if (modalState.previousFocus && typeof modalState.previousFocus.focus === 'function') {
    modalState.previousFocus.focus();
  }
}

function toggleSidebar(event) {
  if (event) {
    event.stopPropagation();
  }
  sidebar.classList.toggle('hidden');
  mainArea.classList.toggle('full');
}

sidebarClose.addEventListener('click', toggleSidebar);
menuBtn.addEventListener('click', toggleSidebar);

mainArea.addEventListener('click', (event) => {
  if (event.target === menuBtn || menuBtn.contains(event.target)) {
    return;
  }
  if (!sidebar.classList.contains('hidden') && window.innerWidth <= 680) {
    sidebar.classList.add('hidden');
    mainArea.classList.add('full');
  }
});

newTabBtn.addEventListener('click', async () => {
  const name = await openTextModal({
    title: '新建标签',
    placeholder: '可留空',
    confirmText: '创建',
  });

  if (name === null) {
    return;
  }

  send({ type: 'tab_create', name });
  if (window.innerWidth <= 680) {
    sidebar.classList.add('hidden');
    mainArea.classList.add('full');
  }
});

textModalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  closeTextModal(modalInput.value.trim());
});

modalCancelBtn.addEventListener('click', () => {
  closeTextModal(null);
});

textModal.addEventListener('click', (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.modalClose === 'true') {
    closeTextModal(null);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalState.resolve) {
    closeTextModal(null);
  }
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = promptInput.value.trim();
  if (!text || !state.activeThreadId) {
    return;
  }

  const items = ensureItems(state.activeThreadId);
  items.push({
    type: 'userMessage',
    id: createLocalId('local'),
    content: [{ type: 'text', text }],
  });

  state.turnActiveByThread.set(state.activeThreadId, true);
  if (!send({ type: 'turn_send', threadId: state.activeThreadId, text })) {
    state.turnActiveByThread.set(state.activeThreadId, false);
    items.push({
      type: '_error',
      id: createLocalId('send'),
      text: '消息发送失败：WebSocket 未连接，请稍后重试。',
    });
  }
  promptInput.value = '';
  renderMessages();
});

function handleMessage(msg) {
  if (msg.type === 'state') {
    state.tabs = msg.tabs || [];
    pruneUnreadThreads();
    if (!state.activeThreadId && state.tabs.length) {
      state.activeThreadId = state.tabs[0].threadId;
    }
    if (state.activeThreadId && !state.tabs.some((tab) => tab.threadId === state.activeThreadId)) {
      state.activeThreadId = state.tabs[0]?.threadId || null;
    }
    if (state.activeThreadId) {
      state.unreadThreadIds.delete(state.activeThreadId);
    }
    if (state.activeThreadId) {
      send({ type: 'thread_sync', threadId: state.activeThreadId });
    }
    render();
    return;
  }

  if (msg.type === 'tab_updated') {
    upsertTab(msg.tab);
    render();
    return;
  }

  if (msg.type === 'tab_created') {
    if (msg.tab) {
      upsertTab(msg.tab);
    }
    setActiveTab(msg.threadId || msg.tab?.threadId || null);
    return;
  }

  if (msg.type === 'tab_removed') {
    removeTab(msg.threadId);
    return;
  }

  if (msg.type === 'unread') {
    if (markThreadUnread(msg.threadId)) {
      renderTabs();
    }
    return;
  }

  if (msg.type === 'thread_sync') {
    syncTurns(msg.threadId, msg.turns || []);
    render();
    return;
  }

  if (msg.type === 'turn_started') {
    state.turnActiveByThread.set(msg.threadId, true);
    if (msg.threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'turn_completed') {
    state.turnActiveByThread.set(msg.threadId, false);
    if (msg.threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'agent_delta') {
    state.turnActiveByThread.set(msg.threadId, true);
    upsertStreamingItem(msg.threadId, msg.itemId, msg.delta || '');
    if (msg.threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'item_started') {
    const items = ensureItems(msg.threadId);
    const item = msg.item;
    if (item && item.id && !items.find((entry) => entry.id === item.id)) {
      items.push({ ...item, _partial: true });
    }
    if (msg.threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'item_completed') {
    finalizeItem(msg.threadId, msg.item);
    if (msg.threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'codex_error') {
    const threadId = msg.threadId || state.activeThreadId;
    const items = ensureItems(threadId);
    const error = msg.error || {};
    items.push({
      type: '_error',
      id: createLocalId('err'),
      text: error.message || JSON.stringify(error),
    });
    if (threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'backend_error') {
    if (!state.activeThreadId) {
      return;
    }
    const items = ensureItems(state.activeThreadId);
    items.push({
      type: '_error',
      id: createLocalId('backend'),
      text: msg.message,
    });
    renderMessages();
    return;
  }

  if (msg.type === 'error') {
    const threadId = msg.threadId || state.activeThreadId;
    if (!threadId) {
      return;
    }

    if (msg.code === 'THREAD_NOT_FOUND' && msg.op === 'turn_start') {
      const marked = markTabClosedLocally(threadId);
      const items = ensureItems(threadId);
      items.push({
        type: '_error',
        id: createLocalId('thread-missing'),
        text: msg.message || '该标签对应的会话不存在，已标记为关闭。',
      });
      if (threadId === state.activeThreadId) {
        render();
      } else if (marked) {
        renderTabs();
      }
      return;
    }

    const items = ensureItems(threadId);
    items.push({
      type: '_error',
      id: createLocalId('api'),
      text: msg.message || '服务端请求失败',
    });
    if (threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  if (msg.type === 'token_usage') {
    return;
  }

  if (msg.type === 'warning') {
    const threadId = msg.threadId || state.activeThreadId;
    const items = ensureItems(threadId);
    items.push({
      type: '_warning',
      id: createLocalId('warn'),
      text: msg.message,
    });
    if (threadId === state.activeThreadId) {
      renderMessages();
    }
    return;
  }

  console.log('Unhandled message:', msg.type, msg);
}
