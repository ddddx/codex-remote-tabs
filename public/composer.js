export function renderComposer(state, deps) {
  const {
    composer,
    composerControlsToggle,
    composerControlsSummary,
    promptInput,
    attachImageBtn,
    composerSubmitBtn,
    modelSelect,
    reasoningEffortSelect,
    permissionPresetSelect,
    approvalPolicySelect,
    sandboxModeSelect,
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
  } = deps;

  const disabled = state.authFailed || !state.activeThreadId;
  const attachments = getComposerAttachments();
  const uploadCount = getComposerUploadCount();
  const hasDraftContent = Boolean(promptInput.value.trim() || attachments.length);
  const prefs = getActiveComposerPrefs();
  const effectiveModelLabel = normalizeComposerModel(prefs?.model) || state.composerModelDefault || '';
  const effectiveEffortLabel = formatReasoningEffortLabel(normalizeComposerEffort(prefs?.effort) || state.composerEffortDefault || '');
  const effectiveApprovalValue = normalizeComposerApprovalPolicy(prefs?.approvalPolicy) || state.composerApprovalPolicyDefault || '';
  const effectiveSandboxValue = normalizeComposerSandboxMode(prefs?.sandboxMode) || state.composerSandboxModeDefault || '';
  const effectiveApprovalLabel = formatApprovalPolicyLabel(effectiveApprovalValue);
  const effectiveSandboxLabel = formatSandboxModeLabel(effectiveSandboxValue);
  const effectivePresetLabel = formatPermissionPresetLabel(
    inferPermissionPresetValue(effectiveApprovalValue, effectiveSandboxValue),
    { includeDescription: true }
  );

  promptInput.disabled = disabled;
  attachImageBtn.disabled = disabled || uploadCount > 0;
  composerSubmitBtn.disabled = disabled || uploadCount > 0 || !hasDraftContent;
  composerControlsToggle.disabled = state.authFailed;
  composerControlsSummary.textContent = formatMobileComposerSummary(prefs);
  composerControlsToggle.setAttribute('aria-expanded', composer.classList.contains('mobile-controls-open') ? 'true' : 'false');
  promptInput.placeholder = state.authFailed
    ? 'WebSocket 鉴权失败，请点击右上角“设置 Token”。'
    : (!state.activeThreadId ? '请先在左侧选择一个会话。' : defaultPromptPlaceholder);
  attachImageBtn.textContent = uploadCount > 0 ? `上传中 ${uploadCount}` : '图片';
  renderComposerAttachmentList(attachments);

  fillSelectOptions(modelSelect, buildModelSelectOptions(), normalizeComposerModel(prefs?.model));
  fillSelectOptions(reasoningEffortSelect, buildEffortSelectOptions(), normalizeComposerEffort(prefs?.effort));
  fillSelectOptions(
    permissionPresetSelect,
    buildPermissionPresetSelectOptions(),
    inferPermissionPresetValue(prefs?.approvalPolicy, prefs?.sandboxMode)
  );
  fillSelectOptions(approvalPolicySelect, buildApprovalPolicySelectOptions(), normalizeComposerApprovalPolicy(prefs?.approvalPolicy));
  fillSelectOptions(sandboxModeSelect, buildSandboxModeSelectOptions(), normalizeComposerSandboxMode(prefs?.sandboxMode));
  modelSelect.dataset.currentLabel = effectiveModelLabel;
  reasoningEffortSelect.dataset.currentLabel = effectiveEffortLabel;
  permissionPresetSelect.dataset.currentLabel = effectivePresetLabel;
  approvalPolicySelect.dataset.currentLabel = effectiveApprovalLabel;
  sandboxModeSelect.dataset.currentLabel = effectiveSandboxLabel;
  modelSelect.disabled = state.authFailed || state.composerOptionsLoading;
  reasoningEffortSelect.disabled = state.authFailed;
  permissionPresetSelect.disabled = state.authFailed;
  approvalPolicySelect.disabled = state.authFailed;
  sandboxModeSelect.disabled = state.authFailed;
  modelSelect.title = state.composerOptionsLoading ? '正在加载模型列表...' : '';
  reasoningEffortSelect.title = '思考等级会应用到当前及后续轮次';
  permissionPresetSelect.title = '/approvals 预设：Read Only = 只读 + 按需批准，Auto = 工作区可写 + 按需批准，Full Access = 完全权限 + 按需批准';
  approvalPolicySelect.title = '执行批准独立于权限范围；“从不询问（Never）”比 Full Access 更危险';
  sandboxModeSelect.title = '权限范围只控制沙箱；Full Access 不等于“从不询问（Never）”';
  syncCustomSelect(modelSelect);
  syncCustomSelect(reasoningEffortSelect);
  syncCustomSelect(permissionPresetSelect);
  syncCustomSelect(approvalPolicySelect);
  syncCustomSelect(sandboxModeSelect);
  autoResizePromptInput();
}

export function renderComposerAttachmentList(attachments, deps) {
  const {
    composerAttachmentList,
    state,
    buildUploadPreviewUrl,
    getAttachmentFileName,
    setComposerAttachments,
    getComposerAttachments,
    renderComposer,
  } = deps;

  composerAttachmentList.replaceChildren();
  composerAttachmentList.hidden = !attachments.length;
  if (!attachments.length) {
    return;
  }

  for (const attachment of attachments) {
    const card = document.createElement('div');
    card.className = 'composer-attachment-card';

    const image = document.createElement('img');
    image.className = 'composer-attachment-thumb';
    image.src = attachment.previewUrl || buildUploadPreviewUrl(attachment.path);
    image.alt = attachment.name || getAttachmentFileName(attachment.path) || '已选图片';
    image.loading = 'lazy';
    card.appendChild(image);

    const meta = document.createElement('div');
    meta.className = 'composer-attachment-meta';

    const name = document.createElement('div');
    name.className = 'composer-attachment-name';
    name.textContent = attachment.name || getAttachmentFileName(attachment.path) || '图片';
    meta.appendChild(name);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'composer-attachment-remove';
    action.textContent = '移除';
    action.addEventListener('click', () => {
      const threadId = state.activeThreadId;
      if (!threadId) {
        return;
      }
      setComposerAttachments(threadId, getComposerAttachments(threadId).filter((entry) => entry.path !== attachment.path));
      renderComposer();
    });
    meta.appendChild(action);

    card.appendChild(meta);
    composerAttachmentList.appendChild(card);
  }
}
