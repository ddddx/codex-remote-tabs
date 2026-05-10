function requireElementById(documentRef, id) {
  const element = documentRef.getElementById(id);
  if (!element) {
    throw new Error(`missing required element: #${id}`);
  }
  return element;
}

function requireElementBySelector(documentRef, selector) {
  const element = documentRef.querySelector(selector);
  if (!element) {
    throw new Error(`missing required element: ${selector}`);
  }
  return element;
}

export function getAppDom(documentRef = document) {
  const composer = requireElementById(documentRef, 'composer');
  const composerSubmitBtn = composer.querySelector('button[type="submit"]');
  if (!(composerSubmitBtn instanceof HTMLButtonElement)) {
    throw new Error('missing required composer submit button');
  }

  return {
    sidebar: requireElementById(documentRef, 'sidebar'),
    sidebarClose: requireElementById(documentRef, 'sidebarClose'),
    menuBtn: requireElementById(documentRef, 'menuBtn'),
    tabList: requireElementById(documentRef, 'tabList'),
    newTabBtn: requireElementById(documentRef, 'newTabBtn'),
    messagesEl: requireElementById(documentRef, 'messages'),
    jumpToBottomBtn: requireElementById(documentRef, 'jumpToBottomBtn'),
    sessionCreatingOverlay: requireElementById(documentRef, 'sessionCreatingOverlay'),
    composer,
    composerControlsToggle: requireElementById(documentRef, 'composerControlsToggle'),
    composerControlsSummary: requireElementById(documentRef, 'composerControlsSummary'),
    modelSelect: requireElementById(documentRef, 'modelSelect'),
    reasoningEffortSelect: requireElementById(documentRef, 'reasoningEffortSelect'),
    permissionPresetSelect: requireElementById(documentRef, 'permissionPresetSelect'),
    approvalPolicySelect: requireElementById(documentRef, 'approvalPolicySelect'),
    sandboxModeSelect: requireElementById(documentRef, 'sandboxModeSelect'),
    promptInput: requireElementById(documentRef, 'promptInput'),
    attachImageBtn: requireElementById(documentRef, 'attachImageBtn'),
    imageInput: requireElementById(documentRef, 'imageInput'),
    composerAttachmentList: requireElementById(documentRef, 'composerAttachmentList'),
    slashMenu: requireElementById(documentRef, 'slashMenu'),
    composerSubmitBtn,
    activeTitle: requireElementById(documentRef, 'activeTitle'),
    themeSelect: requireElementById(documentRef, 'themeSelect'),
    contextUsage: requireElementById(documentRef, 'contextUsage'),
    tokenBtn: requireElementById(documentRef, 'tokenBtn'),
    activeStatus: requireElementById(documentRef, 'activeStatus'),
    mainArea: requireElementBySelector(documentRef, '.main-area'),
    tabTpl: requireElementById(documentRef, 'tabTpl'),
    textModal: requireElementById(documentRef, 'textModal'),
    textModalForm: requireElementById(documentRef, 'textModalForm'),
    modalTitle: requireElementById(documentRef, 'modalTitle'),
    modalLabel: requireElementById(documentRef, 'modalLabel'),
    modalInput: requireElementById(documentRef, 'modalInput'),
    modalCancelBtn: requireElementById(documentRef, 'modalCancelBtn'),
    modalConfirmBtn: requireElementById(documentRef, 'modalConfirmBtn'),
    sessionModal: requireElementById(documentRef, 'sessionModal'),
    sessionModalForm: requireElementById(documentRef, 'sessionModalForm'),
    sessionNameInput: requireElementById(documentRef, 'sessionNameInput'),
    sessionWorkspaceInput: requireElementById(documentRef, 'sessionWorkspaceInput'),
    browseWorkspaceBtn: requireElementById(documentRef, 'browseWorkspaceBtn'),
    workspaceUpBtn: requireElementById(documentRef, 'workspaceUpBtn'),
    workspaceRefreshBtn: requireElementById(documentRef, 'workspaceRefreshBtn'),
    createWorkspaceBtn: requireElementById(documentRef, 'createWorkspaceBtn'),
    useCurrentWorkspaceBtn: requireElementById(documentRef, 'useCurrentWorkspaceBtn'),
    workspaceShortcutSelect: requireElementById(documentRef, 'workspaceShortcutSelect'),
    workspaceBrowserPath: requireElementById(documentRef, 'workspaceBrowserPath'),
    workspaceBrowserList: requireElementById(documentRef, 'workspaceBrowserList'),
    sessionModalHint: requireElementById(documentRef, 'sessionModalHint'),
    sessionModalTopCloseBtn: requireElementById(documentRef, 'sessionModalTopCloseBtn'),
    sessionModalCancelBtn: requireElementById(documentRef, 'sessionModalCancelBtn'),
    sessionModalConfirmBtn: requireElementById(documentRef, 'sessionModalConfirmBtn'),
  };
}
