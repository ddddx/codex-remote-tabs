let reconnectTimer = null;

function connect() {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${wsProtocol}://${location.host}/ws`);

  socket.onopen = () => {
    console.log('ws connected');
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  socket.onmessage = (event) => {
    handleMessage(JSON.parse(event.data));
  };

  socket.onclose = () => {
    console.log('ws closed, reconnecting in 2s...');
    reconnectTimer = setTimeout(connect, 2000);
  };

  socket.onerror = (err) => {
    console.error('ws error', err);
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

const state = {
  tabs: [],
  activeThreadId: null,
  messagesByThread: new Map(),
  partialByThread: new Map(),
  thinkingByThread: new Map(),
};

function send(payload) {
  if (window._ws && window._ws.readyState === WebSocket.OPEN) {
    window._ws.send(JSON.stringify(payload));
  }
}

// Simple markdown renderer
function renderMarkdown(text) {
  if (!text) return '';
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
  return html;
}

function ensureMessages(threadId) {
  if (!state.messagesByThread.has(threadId)) {
    state.messagesByThread.set(threadId, []);
  }
  return state.messagesByThread.get(threadId);
}

function ensurePartials(threadId) {
  if (!state.partialByThread.has(threadId)) {
    state.partialByThread.set(threadId, new Map());
  }
  return state.partialByThread.get(threadId);
}

function upsertTab(tab) {
  const i = state.tabs.findIndex((t) => t.threadId === tab.threadId);
  if (i >= 0) {
    state.tabs[i] = tab;
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
  state.messagesByThread.delete(threadId);
  state.partialByThread.delete(threadId);
  state.thinkingByThread.delete(threadId);

  if (state.activeThreadId === threadId) {
    state.activeThreadId = state.tabs[0]?.threadId || null;
    if (state.activeThreadId) {
      send({ type: 'thread_sync', threadId: state.activeThreadId });
    }
  }
  render();
}

function setActiveTab(threadId) {
  state.activeThreadId = threadId;
  send({ type: 'thread_sync', threadId });
  render();
}

function addMessage(threadId, message) {
  const list = ensureMessages(threadId);
  list.push(message);
}

function applyAgentDelta(threadId, itemId, delta) {
  const partials = ensurePartials(threadId);
  const current = partials.get(itemId) || '';
  partials.set(itemId, current + delta);

  const list = ensureMessages(threadId);
  const existing = list.find((m) => m.type === 'agent' && m.itemId === itemId && m.partial);
  if (existing) {
    existing.text = partials.get(itemId);
  } else {
    list.push({ type: 'agent', text: partials.get(itemId), itemId, partial: true });
  }
}

function completeAgentMessage(threadId, itemId, text) {
  const partials = ensurePartials(threadId);
  partials.delete(itemId);

  const list = ensureMessages(threadId);
  const existing = list.find((m) => m.type === 'agent' && m.itemId === itemId);
  if (existing) {
    existing.text = text;
    existing.partial = false;
  } else {
    list.push({ type: 'agent', text, itemId, partial: false });
  }
}

function syncTurns(threadId, turns) {
  const list = [];
  for (const turn of turns || []) {
    for (const item of turn.items || []) {
      if (item.type === 'userMessage') {
        const text = (item.content || [])
          .filter((x) => x.type === 'text')
          .map((x) => x.text)
          .join('\n');
        if (text) {
          list.push({ type: 'user', text });
        }
      }
      if (item.type === 'agentMessage') {
        list.push({ type: 'agent', text: item.text, itemId: item.id, partial: false });
      }
    }
  }
  state.messagesByThread.set(threadId, list);
}

// Render sidebar tabs
function renderTabs() {
  tabList.innerHTML = '';
  for (const tab of state.tabs) {
    const node = tabTpl.content.firstElementChild.cloneNode(true);
    node.dataset.threadId = tab.threadId;
    node.classList.toggle('active', tab.threadId === state.activeThreadId);
    node.querySelector('.name').textContent = tab.name || 'New Tab';

    const statusStr = typeof tab.status === 'object' ? (tab.status?.type || 'idle') : (tab.status || 'idle');
    node.querySelector('.meta').textContent = statusStr;

    node.querySelector('.close').addEventListener('click', (e) => {
      e.stopPropagation();
      send({ type: 'tab_close', threadId: tab.threadId });
    });

    node.addEventListener('click', () => setActiveTab(tab.threadId));
    tabList.appendChild(node);
  }
}

// Render header
function renderHeader() {
  const tab = state.tabs.find((t) => t.threadId === state.activeThreadId);
  activeTitle.textContent = tab ? (tab.name || 'New Tab') : 'Codex Remote Control';

  const statusStr = tab ? (typeof tab.status === 'object' ? tab.status?.type || 'idle' : tab.status || 'idle') : '';
  activeStatus.textContent = statusStr;
  activeStatus.className = 'status-badge';
  if (statusStr === 'running') activeStatus.classList.add('running');
  if (statusStr === 'failed') activeStatus.classList.add('failed');
}

// Render messages
function renderMessages() {
  messagesEl.innerHTML = '';

  if (!state.activeThreadId) {
    const empty = document.createElement('div');
    empty.className = 'message';
    empty.textContent = '还没有标签，点左侧 "+ 新建标签" 开始。';
    messagesEl.appendChild(empty);
    return;
  }

  const list = ensureMessages(state.activeThreadId);
  for (const m of list) {
    const el = document.createElement('div');
    el.className = `message ${m.type}`;
    if (m.type === 'agent') {
      el.innerHTML = renderMarkdown(m.text);
      if (m.partial) {
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.textContent = ' ▌';
        el.appendChild(cursor);
      }
    } else {
      el.textContent = m.text;
    }
    messagesEl.appendChild(el);
  }

  // Thinking indicator
  if (state.thinkingByThread.get(state.activeThreadId)) {
    const thinking = document.createElement('div');
    thinking.className = 'message agent thinking';
    thinking.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messagesEl.appendChild(thinking);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function render() {
  renderTabs();
  renderHeader();
  renderMessages();
}

// Sidebar toggle
function toggleSidebar() {
  sidebar.classList.toggle('hidden');
  mainArea.classList.toggle('full');
}

sidebarClose.addEventListener('click', toggleSidebar);
menuBtn.addEventListener('click', toggleSidebar);

// Click outside sidebar to close
mainArea.addEventListener('click', () => {
  if (!sidebar.classList.contains('hidden') && window.innerWidth <= 680) {
    sidebar.classList.add('hidden');
    mainArea.classList.add('full');
  }
});

// New tab
newTabBtn.addEventListener('click', () => {
  const name = prompt('标签名称（可留空）') || '';
  send({ type: 'tab_create', name });
  // Auto-close sidebar on mobile
  if (window.innerWidth <= 680) {
    sidebar.classList.add('hidden');
    mainArea.classList.add('full');
  }
});

// Send message
composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = promptInput.value.trim();
  if (!text || !state.activeThreadId) return;

  addMessage(state.activeThreadId, { type: 'user', text });
  state.thinkingByThread.set(state.activeThreadId, true);
  send({ type: 'turn_send', threadId: state.activeThreadId, text });
  promptInput.value = '';
  renderMessages();
});

// Handle WebSocket messages
function handleMessage(msg) {
  if (msg.type === 'state') {
    state.tabs = msg.tabs || [];
    if (!state.activeThreadId && state.tabs.length) {
      state.activeThreadId = state.tabs[0].threadId;
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

  if (msg.type === 'tab_removed') {
    removeTab(msg.threadId);
    return;
  }

  if (msg.type === 'thread_sync') {
    syncTurns(msg.threadId, msg.turns || []);
    render();
    return;
  }

  if (msg.type === 'turn_started') {
    state.thinkingByThread.set(msg.threadId, true);
    if (msg.threadId === state.activeThreadId) renderMessages();
    return;
  }

  if (msg.type === 'agent_delta') {
    state.thinkingByThread.delete(msg.threadId);
    applyAgentDelta(msg.threadId, msg.itemId, msg.delta || '');
    if (msg.threadId === state.activeThreadId) renderMessages();
    return;
  }

  if (msg.type === 'agent_message') {
    state.thinkingByThread.delete(msg.threadId);
    completeAgentMessage(msg.threadId, msg.itemId, msg.text || '');
    if (msg.threadId === state.activeThreadId) renderMessages();
    return;
  }

  if (msg.type === 'turn_completed') {
    state.thinkingByThread.delete(msg.threadId);
    if (msg.threadId === state.activeThreadId) renderMessages();
    return;
  }

  if (msg.type === 'warning') {
    alert(msg.message);
    return;
  }

  if (msg.type === 'error' || msg.type === 'backend_error') {
    alert(msg.message);
  }
}
