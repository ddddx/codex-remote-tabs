export function getSessionName(tab) {
  const name = typeof tab?.name === 'string' ? tab.name.trim() : '';
  if (!name || name === 'New Tab') {
    return '未命名会话';
  }
  return name;
}

export function getWorkspacePath(tab) {
  return typeof tab?.cwd === 'string' ? tab.cwd.trim() : '';
}

export function getWorkspaceFolder(cwd) {
  const normalized = String(cwd || '').replace(/[\\/]+$/, '');
  if (!normalized) {
    return '';
  }
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

export function compareTabs(a, b) {
  const rankWindowStatus = (value) => {
    if (value === 'attached') {
      return 0;
    }
    if (value === 'detached') {
      return 1;
    }
    return 2;
  };

  const statusDiff = rankWindowStatus(a?.windowStatus) - rankWindowStatus(b?.windowStatus);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const updatedDiff = (b?.updatedAt || 0) - (a?.updatedAt || 0);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = (b?.createdAt || 0) - (a?.createdAt || 0);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return String(a?.threadId || '').localeCompare(String(b?.threadId || ''));
}

let inactiveTabsCollapsed = true;

function createStatusMeta(tab, state, helpers) {
  const {
    hasPendingServerRequest,
    normalizeTabStatus,
  } = helpers;
  const status = normalizeTabStatus(tab.status);
  const isWindowAttached = tab.windowStatus === 'attached';
  const isWindowDetached = tab.windowStatus === 'detached';
  const isWindowClosed = tab.windowStatus === 'closed';
  const isWaitingApproval = isWindowAttached && hasPendingServerRequest(tab.threadId);
  const statusDot = document.createElement('span');
  statusDot.className = `status-dot ${isWindowClosed ? 'closed' : (isWaitingApproval ? 'waiting' : (isWindowAttached ? 'open' : 'closed'))}`;
  const statusText = document.createElement('span');
  statusText.className = 'status-text';
  if (isWindowClosed) {
    statusText.textContent = '窗口已关闭';
  } else if (isWindowDetached) {
    statusText.textContent = '窗口未打开';
  } else if (status === 'running' || status === 'active') {
    statusText.textContent = '进行中';
  } else {
    statusText.textContent = isWaitingApproval ? '待批准' : '在线';
  }
  return { isWindowClosed, statusDot, statusText };
}

function renderTabItem(tabListEl, tabTpl, tab, state, helpers) {
  const {
    setActiveTab,
    send,
  } = helpers;
  const hasUnread = state.unreadThreadIds.has(tab.threadId) && tab.threadId !== state.activeThreadId;
  const node = tabTpl.content.firstElementChild.cloneNode(true);
  const { isWindowClosed, statusDot, statusText } = createStatusMeta(tab, state, helpers);
  node.dataset.threadId = tab.threadId;
  node.classList.toggle('active', tab.threadId === state.activeThreadId);
  node.classList.toggle('closed', isWindowClosed);
  node.classList.toggle('has-unread', hasUnread);
  node.querySelector('.name').textContent = getSessionName(tab);
  const cwd = getWorkspacePath(tab);
  const workspace = node.querySelector('.workspace');
  workspace.textContent = cwd ? `工作区 · ${getWorkspaceFolder(cwd)}` : '工作区未提供';
  workspace.title = cwd || '工作区未提供';
  node.title = cwd ? `${getSessionName(tab)}\n${cwd}` : getSessionName(tab);
  const meta = node.querySelector('.meta');
  meta.replaceChildren(statusDot, statusText);

  node.querySelector('.close').addEventListener('click', (event) => {
    event.stopPropagation();
    send({ type: 'tab_close', threadId: tab.threadId });
  });

  node.addEventListener('click', () => setActiveTab(tab.threadId));
  tabListEl.appendChild(node);
}

export function renderTabs(tabListEl, menuBtnEl, tabTpl, state, helpers) {
  const {
    hasUnreadInInactiveTabs,
    requestRenderTabs,
  } = helpers;

  tabListEl.innerHTML = '';
  menuBtnEl.classList.toggle('has-unread', hasUnreadInInactiveTabs());

  const activeTabs = [];
  const inactiveTabs = [];
  for (const tab of state.tabs) {
    if (tab.windowStatus === 'attached') {
      activeTabs.push(tab);
    } else {
      inactiveTabs.push(tab);
    }
  }

  for (const tab of activeTabs) {
    renderTabItem(tabListEl, tabTpl, tab, state, helpers);
  }

  if (!inactiveTabs.length) {
    return;
  }

  const hasActiveInactiveTab = inactiveTabs.some((tab) => tab.threadId === state.activeThreadId);
  const showInactiveTabs = hasActiveInactiveTab || !inactiveTabsCollapsed;
  const section = document.createElement('section');
  section.className = `tab-section tab-section-inactive${showInactiveTabs ? ' expanded' : ' collapsed'}`;

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'tab-section-toggle';
  toggleBtn.setAttribute('aria-expanded', showInactiveTabs ? 'true' : 'false');
  toggleBtn.innerHTML = `
    <span class="tab-section-title-group">
      <span class="tab-section-title">已关闭 / 未打开</span>
      <span class="tab-section-count">${inactiveTabs.length}</span>
    </span>
    <span class="tab-section-chevron" aria-hidden="true">${showInactiveTabs ? '▾' : '▸'}</span>
  `;
  toggleBtn.addEventListener('click', () => {
    inactiveTabsCollapsed = !inactiveTabsCollapsed;
    requestRenderTabs?.();
  });
  section.appendChild(toggleBtn);

  if (showInactiveTabs) {
    const sectionList = document.createElement('div');
    sectionList.className = 'tab-section-list';
    for (const tab of inactiveTabs) {
      renderTabItem(sectionList, tabTpl, tab, state, helpers);
    }
    section.appendChild(sectionList);
  }

  tabListEl.appendChild(section);
}
