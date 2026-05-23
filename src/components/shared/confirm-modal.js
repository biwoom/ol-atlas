// src/components/shared/confirm-modal.js
// Promise 기반 div 커스텀 모달. concat 방식이므로 전역 함수로 정의.

let _modalStack = [];
let _modalPrevFocus = null;

/**
 * @param {Object} opts
 * @param {string}  opts.title
 * @param {string}  opts.message          줄바꿈 \n 지원
 * @param {string}  [opts.confirmText]    기본 '확인'
 * @param {string}  [opts.cancelText]     기본 '취소'
 * @param {boolean} [opts.danger]         true이면 확인 버튼 빨간색
 * @param {boolean} [opts.defaultCancel]  기본 true. true이면 취소 버튼에 포커스
 * @returns {Promise<boolean>}
 */
function customConfirm(opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    _showModal({
      title:         opts.title        || '확인',
      message:       opts.message      || '',
      confirmText:   opts.confirmText  || '확인',
      cancelText:    opts.cancelText   || '취소',
      danger:        !!opts.danger,
      defaultCancel: opts.defaultCancel !== false,
      onConfirm: function() { resolve(true);  },
      onCancel:  function() { resolve(false); },
    });
  });
}

/**
 * @param {Object} opts
 * @param {string}  opts.title
 * @param {string}  opts.message
 * @param {string}  [opts.confirmText]    기본 '확인'
 * @param {boolean} [opts.danger]
 * @returns {Promise<void>}
 */
function customAlert(opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    _showModal({
      title:         opts.title       || '알림',
      message:       opts.message     || '',
      confirmText:   opts.confirmText || '확인',
      cancelText:    null,
      danger:        !!opts.danger,
      defaultCancel: false,
      onConfirm: function() { resolve(); },
    });
  });
}

function _ensureModalRoot() {
  let root = document.getElementById('ol-modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ol-modal-root';
    document.body.appendChild(root);
  }
  return root;
}

function _showModal(o) {
  const root = _ensureModalRoot();
  _modalPrevFocus = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'ol-modal-overlay';

  const uid = 'olm-' + Date.now();
  const dialog = document.createElement('div');
  dialog.className = 'ol-modal-dialog' + (o.danger ? ' ol-modal-danger' : '');
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', uid);

  const titleEl = document.createElement('div');
  titleEl.className = 'ol-modal-title';
  titleEl.id = uid;
  titleEl.textContent = o.title;

  const msgEl = document.createElement('div');
  msgEl.className = 'ol-modal-message';
  String(o.message || '').split('\n').forEach(function(line, i) {
    if (i > 0) msgEl.appendChild(document.createElement('br'));
    msgEl.appendChild(document.createTextNode(line));
  });

  const actions = document.createElement('div');
  actions.className = 'ol-modal-actions';

  let cancelBtn = null;
  if (o.cancelText) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'ol-modal-btn ol-modal-cancel';
    cancelBtn.textContent = o.cancelText;
    cancelBtn.addEventListener('click', function() {
      _closeModal(overlay);
      if (o.onCancel) o.onCancel();
    });
    actions.appendChild(cancelBtn);
  }

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'ol-modal-btn ol-modal-confirm' +
    (o.danger ? ' ol-modal-confirm-danger' : '');
  confirmBtn.textContent = o.confirmText;
  confirmBtn.addEventListener('click', function() {
    _closeModal(overlay);
    if (o.onConfirm) o.onConfirm();
  });
  actions.appendChild(confirmBtn);

  dialog.appendChild(titleEl);
  dialog.appendChild(msgEl);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  root.appendChild(overlay);

  // Esc → 취소, Enter → 현재 포커스 버튼의 기본 동작
  const onKey = function(e) {
    if (!root.contains(overlay)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (cancelBtn) cancelBtn.click();
      else confirmBtn.click();
    }
  };
  document.addEventListener('keydown', onKey, true);
  overlay._cleanup = function() {
    document.removeEventListener('keydown', onKey, true);
  };

  // backdrop 클릭 → 취소
  overlay.addEventListener('mousedown', function(e) {
    if (e.target === overlay && cancelBtn) cancelBtn.click();
  });

  _modalStack.push(overlay);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(function() {
    if (o.defaultCancel && cancelBtn) cancelBtn.focus();
    else confirmBtn.focus();
  });
}

function _closeModal(overlay) {
  if (!overlay) return;
  if (overlay._cleanup) overlay._cleanup();
  const idx = _modalStack.indexOf(overlay);
  if (idx >= 0) _modalStack.splice(idx, 1);
  if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  if (_modalStack.length === 0) {
    // 카드 모달이 열려있으면 overflow 복구 안 함
    const cardModal = document.getElementById('card-modal');
    if (!cardModal || !cardModal.classList.contains('open')) {
      document.body.style.overflow = '';
    }
    if (_modalPrevFocus) {
      try { _modalPrevFocus.focus(); } catch(e) {}
      _modalPrevFocus = null;
    }
  }
}
