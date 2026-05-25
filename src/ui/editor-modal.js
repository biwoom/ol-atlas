// src/ui/editor-modal.js
// ── 편집자 정보 입력 모달 ────────────────────────────────

import { dispatch } from '../core/action.js';
import { generateFingerprint } from '../core/fingerprint.js';
import { updateEditors } from '../actions/settings-actions.js';

const LS_EDITOR_ID    = 'ol_editor_id';
const LS_EDITOR_NAME  = 'ol_editor_name';
const LS_EDITOR_EMAIL = 'ol_editor_email';

// ── 현재 세션 편집자 복원 ──────────────────────────────

export function getCurrentEditor() {
  const id    = localStorage.getItem(LS_EDITOR_ID);
  const name  = localStorage.getItem(LS_EDITOR_NAME);
  if (!id || !name) return null;
  return {
    id,
    name,
    email: localStorage.getItem(LS_EDITOR_EMAIL) || '',
  };
}

export function clearCurrentEditor() {
  localStorage.removeItem(LS_EDITOR_ID);
  localStorage.removeItem(LS_EDITOR_NAME);
  localStorage.removeItem(LS_EDITOR_EMAIL);
}

function _editorFromState(state) {
  const id = state?.meta?.currentEditorId;
  if (!id) return null;
  const editor = (state?.meta?.editors || []).find(e => e.id === id);
  if (!editor) return null;
  return {
    id: editor.id,
    name: editor.name || '비움',
    email: editor.email || '',
  };
}

function _persistEditorSession(state, editor) {
  if (!editor || !editor.id) return editor;
  const editors = Array.isArray(state?.meta?.editors) ? state.meta.editors : [];
  const existing = editors.find(e => e.id === editor.id);
  const nextEditors = existing
    ? editors.map(e => e.id === editor.id ? { ...e, name: editor.name, email: editor.email } : e)
    : [...editors, { id: editor.id, name: editor.name, email: editor.email }];

  dispatch(updateEditors({
    editors: nextEditors,
    saveLog: Array.isArray(state?.meta?.saveLog) ? state.meta.saveLog : [],
    currentEditorId: editor.id,
  }));

  return editor;
}

export function getActiveEditor(state) {
  const fromState = _editorFromState(state);
  if (fromState) return fromState;

  const stored = getCurrentEditor();
  if (stored) return stored;

  if (state?.meta?.currentEditorId) {
    return {
      id: state.meta.currentEditorId,
      name: '비움',
      email: '',
    };
  }

  return null;
}

export function ensureEditorSession(state) {
  const fromState = _editorFromState(state);
  if (fromState) return Promise.resolve(fromState);

  const stored = getCurrentEditor();
  if (stored) {
    return Promise.resolve(_persistEditorSession(state, stored));
  }

  if (state?.meta?.currentEditorId) {
    return Promise.resolve({
      id: state.meta.currentEditorId,
      name: '비움',
      email: '',
    });
  }

  return new Promise(resolve => {
    showEditorModal(
      state,
      editor => resolve(_persistEditorSession(state, editor)),
      () => resolve(null)
    );
  });
}

// ── 편집자 모달 표시 ──────────────────────────────────

export function showEditorModal(state, onConfirm, onCancel) {
  let overlay = document.getElementById('editor-modal-overlay');
  if (overlay) overlay.remove();

  const fp = generateFingerprint();

  // 같은 핑거프린트가 이미 editors에 있는지 확인
  const existing = (state.meta.editors || []).find(e => e.id === fp);

  overlay = document.createElement('div');
  overlay.id = 'editor-modal-overlay';
  overlay.className = 'em-overlay';

  const sameNameWarning = !existing && (state.meta.editors || []).some(e =>
    e.name === localStorage.getItem(LS_EDITOR_NAME)
  );

  overlay.innerHTML = `
    <div class="em-modal" role="dialog" aria-modal="true" aria-labelledby="em-title">
      <div class="em-title" id="em-title">편집자 정보 입력</div>
      <div class="em-desc">저장하기 전에 편집자 정보를 입력해주세요.</div>
      ${sameNameWarning ? `<div class="em-warning">같은 이름의 편집자가 있습니다. 다른 기기에서 접근 중이면 계속하세요.</div>` : ''}
      <div class="em-field">
        <label class="em-label" for="em-name">이름 <span class="em-req">*</span></label>
        <input class="em-input" id="em-name" type="text" placeholder="이름을 입력하세요"
               value="${_esc(existing?.name || localStorage.getItem(LS_EDITOR_NAME) || '')}" autocomplete="name">
      </div>
      <div class="em-field">
        <label class="em-label" for="em-email">이메일 <span class="em-hint">(선택)</span></label>
        <input class="em-input" id="em-email" type="email" placeholder="이메일 주소"
               value="${_esc(existing?.email || localStorage.getItem(LS_EDITOR_EMAIL) || '')}" autocomplete="email">
      </div>
      <label class="em-remember">
        <input type="checkbox" id="em-remember" checked>
        <span>이 기기에서 기억하기</span>
      </label>
      <div class="em-foot">
        <button class="btn sm" id="em-cancel">취소</button>
        <button class="btn pri sm" id="em-confirm">저장하기</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = document.getElementById('em-name');
  nameInput.focus();
  nameInput.select();

  const close = () => {
    document.removeEventListener('keydown', _keydown);
    if (overlay && overlay.isConnected) overlay.remove();
    overlay = null;
  };

  function _keydown(e) {
    if (e.key === 'Escape') {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
    if (e.key === 'Enter' && document.activeElement !== document.getElementById('em-cancel')) {
      document.getElementById('em-confirm')?.click();
    }
  }

  document.getElementById('em-cancel').addEventListener('click', () => {
    close();
    if (typeof onCancel === 'function') onCancel();
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
  });

  document.getElementById('em-confirm').addEventListener('click', () => {
    const name  = document.getElementById('em-name').value.trim();
    const email = document.getElementById('em-email').value.trim();
    const remember = document.getElementById('em-remember').checked;

    if (!name) {
      nameInput.focus();
      nameInput.classList.add('em-input-error');
      return;
    }

    const editor = { id: fp, name, email };

    if (remember) {
      localStorage.setItem(LS_EDITOR_ID,    fp);
      localStorage.setItem(LS_EDITOR_NAME,  name);
      localStorage.setItem(LS_EDITOR_EMAIL, email);
    }

    close();
    onConfirm(editor);
  });

  document.addEventListener('keydown', _keydown);
}

function _esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
