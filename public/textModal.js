export function createTextModalController(deps) {
  const {
    textModal,
    modalTitle,
    modalLabel,
    modalInput,
    modalConfirmBtn,
  } = deps;

  const modalState = {
    resolve: null,
    previousFocus: null,
  };

  function openTextModal(options = {}) {
    if (modalState.resolve) {
      closeTextModal(null);
    }

    modalState.previousFocus = document.activeElement;
    modalTitle.textContent = options.title || '输入';
    modalLabel.textContent = options.label || '输入内容';
    modalInput.value = options.defaultValue || '';
    modalInput.placeholder = options.placeholder || '';
    modalInput.type = options.inputType || 'text';
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

  function handleFormSubmit(event) {
    event.preventDefault();
    closeTextModal(modalInput.value.trim());
  }

  function handleBackdropClick(event) {
    if (event.target instanceof HTMLElement && event.target.dataset.modalClose === 'true') {
      closeTextModal(null);
    }
  }

  function handleEscapeKey(event) {
    if (event.key === 'Escape' && modalState.resolve) {
      closeTextModal(null);
      return true;
    }
    return false;
  }

  return {
    closeTextModal,
    handleBackdropClick,
    handleEscapeKey,
    handleFormSubmit,
    isOpen: () => !!modalState.resolve,
    openTextModal,
  };
}
