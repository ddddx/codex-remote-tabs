import {
  closeContextUsagePopover,
  renderContextUsage,
  renderHeaderStatus,
} from './header.js';
import { renderComposer as renderComposerView, renderComposerAttachmentList as renderComposerAttachmentListView } from './composer.js';
import { getSessionName, renderTabs as renderTabsView } from './tabs.js';

export function createAppShell(options) {
  const {
    state,
    elements,
    emptyThreadTitle = 'Codex Remote Control',
    defaultPromptPlaceholder,
    themeOptions,
    fillSelectOptions,
    syncCustomSelect,
    hasUnreadInInactiveTabs,
    hasPendingServerRequest,
    normalizeTabStatus,
    setActiveTab,
    send,
    autoResizePromptInput,
    getComposerAttachments,
    getComposerUploadCount,
    getActiveComposerPrefs,
    normalizeComposerModel,
    normalizeComposerEffort,
    normalizeComposerApprovalPolicy,
    normalizeComposerSandboxMode,
    formatMobileComposerSummary,
    buildModelSelectOptions,
    buildEffortSelectOptions,
    buildPermissionPresetSelectOptions,
    buildApprovalPolicySelectOptions,
    buildSandboxModeSelectOptions,
    inferPermissionPresetValue,
    formatPermissionPresetLabel,
    formatApprovalPolicyLabel,
    formatSandboxModeLabel,
    formatReasoningEffortLabel,
    buildUploadPreviewUrl,
    getAttachmentFileName,
    setComposerAttachments,
  } = options;

  let renderComposer = () => {};

  function renderTabs() {
    renderTabsView(elements.tabList, elements.menuBtn, elements.tabTpl, state, {
      hasUnreadInInactiveTabs,
      hasPendingServerRequest,
      normalizeTabStatus,
      requestRenderTabs: renderTabs,
      setActiveTab,
      send,
    });
  }

  function renderHeader() {
    const tab = state.tabs.find((entry) => entry.threadId === state.activeThreadId);
    elements.activeTitle.textContent = tab ? getSessionName(tab) : emptyThreadTitle;
    fillSelectOptions(elements.themeSelect, themeOptions, state.currentTheme);
    elements.themeSelect.disabled = false;
    syncCustomSelect(elements.themeSelect);
    renderContextUsage(elements.contextUsage, state);
    elements.tokenBtn.textContent = state.authFailed ? '设置 Token' : 'Token';
    elements.tokenBtn.classList.toggle('btn-alert', state.authFailed);
    renderHeaderStatus(elements.activeStatus, tab, state, {
      hasPendingServerRequest,
      normalizeTabStatus,
    });
  }

  function renderComposerAttachmentList(attachments = getComposerAttachments()) {
    renderComposerAttachmentListView(attachments, {
      composerAttachmentList: elements.composerAttachmentList,
      state,
      buildUploadPreviewUrl,
      getAttachmentFileName,
      setComposerAttachments,
      getComposerAttachments,
      renderComposer,
    });
  }

  renderComposer = function renderComposerImpl() {
    renderComposerView(state, {
      composer: elements.composer,
      composerControlsToggle: elements.composerControlsToggle,
      composerControlsSummary: elements.composerControlsSummary,
      promptInput: elements.promptInput,
      attachImageBtn: elements.attachImageBtn,
      composerSubmitBtn: elements.composerSubmitBtn,
      modelSelect: elements.modelSelect,
      reasoningEffortSelect: elements.reasoningEffortSelect,
      permissionPresetSelect: elements.permissionPresetSelect,
      approvalPolicySelect: elements.approvalPolicySelect,
      sandboxModeSelect: elements.sandboxModeSelect,
      fillSelectOptions,
      syncCustomSelect,
      autoResizePromptInput,
      getComposerAttachments,
      getComposerUploadCount,
      getActiveComposerPrefs,
      normalizeComposerModel,
      normalizeComposerEffort,
      normalizeComposerApprovalPolicy,
      normalizeComposerSandboxMode,
      formatMobileComposerSummary,
      buildModelSelectOptions,
      buildEffortSelectOptions,
      buildPermissionPresetSelectOptions,
      buildApprovalPolicySelectOptions,
      buildSandboxModeSelectOptions,
      inferPermissionPresetValue,
      formatPermissionPresetLabel,
      formatApprovalPolicyLabel,
      formatSandboxModeLabel,
      formatReasoningEffortLabel,
      renderComposerAttachmentList,
      defaultPromptPlaceholder,
    });
  };

  function renderCreatingOverlay() {
    elements.sessionCreatingOverlay.classList.toggle('visible', state.creatingTab);
    elements.sessionCreatingOverlay.setAttribute('aria-hidden', state.creatingTab ? 'false' : 'true');
  }

  function renderNewTabButton() {
    elements.newTabBtn.disabled = state.creatingTab || state.authFailed;
    elements.newTabBtn.classList.toggle('is-loading', state.creatingTab);
    elements.newTabBtn.textContent = state.creatingTab ? '正在创建会话...' : '+ 新建会话';
  }

  function render(renderMessages) {
    renderTabs();
    renderHeader();
    renderNewTabButton();
    renderComposer();
    renderMessages();
    renderCreatingOverlay();
  }

  return {
    closeContextUsagePopover: () => closeContextUsagePopover(elements.contextUsage),
    render,
    renderComposer,
    renderComposerAttachmentList,
    renderHeader,
    renderNewTabButton,
    renderTabs,
  };
}
