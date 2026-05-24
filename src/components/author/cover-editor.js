// src/components/author/cover-editor.js
// ── ATLAS 표지 편집기 ─────────────────────────────────

import { S } from '../../core/state.js';
import { escapeHTML } from '../../core/utils.js';
import { subscribe } from '../../core/store.js';
import { dispatch } from '../../core/action.js';
import { updateManifest } from '../../actions/settings-actions.js';
import { switchView, currentView, registerPostSwitchHook } from '../../core/router.js';
import { customAlert } from '../../ui/confirm-modal.js';
import { ORIGIN } from '../../core/constants.js';

let _editorActive = false;

registerPostSwitchHook(v => {
  if (v !== 'cover-editor') _editorActive = false;
});

function _renderPreviewHTML(m) {
  const title = escapeHTML(m.title || '(제목 없음)');
  const subtitle = escapeHTML(m.subtitle || '');
  const author = escapeHTML(m.author || ORIGIN.author);
  const img = m.cover && m.cover.image ? m.cover.image : null;

  return `
    <div class="cover-page cover-preview-inner">
      ${img
        ? `<img class="cover-image" src="${img}" alt="${title}" style="max-height:180px;margin-bottom:1rem">`
        : '<div class="cover-image-placeholder" style="height:120px;margin-bottom:1rem"></div>'
      }
      <h1 class="cover-title" style="font-size:1.4rem;margin-bottom:0.4rem">${title}</h1>
      ${subtitle ? `<p class="cover-subtitle" style="font-size:0.85rem;margin-bottom:0.75rem">${subtitle}</p>` : ''}
      <p class="cover-author" style="font-size:0.75rem;margin-bottom:1rem">${author}</p>
      <div class="cover-actions" style="gap:0.5rem">
        <button class="btn btn-secondary" style="font-size:0.8rem;padding:0.3rem 0.75rem" disabled>목차</button>
        <button class="btn btn-primary" style="font-size:0.8rem;padding:0.3rem 0.75rem" disabled>읽기 시작</button>
      </div>
    </div>
  `;
}

function _updatePreview() {
  const frame = document.getElementById('ce-preview-frame');
  if (!frame) return;
  const m = (S.book && S.book.manifest) || {};
  frame.innerHTML = _renderPreviewHTML(m);
}

function _bindCoverEditorEvents() {
  const backBtn = document.getElementById('ce-back');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      _editorActive = false;
      switchView('kanban');
    });
  }

  const textFields = {
    'ce-title': 'title',
    'ce-subtitle': 'subtitle',
    'ce-series': 'series',
    'ce-version': 'version',
    'ce-date': 'publishedAt',
  };

  Object.entries(textFields).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      dispatch(updateManifest({ [key]: input.value }));
      _updatePreview();
    });
  });

  const imgInput = document.getElementById('ce-img-input');
  if (imgInput) {
    imgInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        customAlert({
          title: '이미지 용량 초과',
          message: '이미지가 5MB를 초과합니다.\n\n큰 이미지는 BOOK 파일 크기를 크게 늘립니다.\n500×700px 내외의 이미지를 권장합니다.',
          danger: true,
        });
      }

      const reader = new FileReader();
      reader.onload = ev => {
        const currentCover = (S.book && S.book.manifest && S.book.manifest.cover) || {};
        dispatch(updateManifest({
          cover: Object.assign({}, currentCover, { image: ev.target.result }),
        }));
        renderCoverEditor();
      };
      reader.readAsDataURL(file);
    });
  }

  const removeBtn = document.getElementById('ce-img-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const currentCover = (S.book && S.book.manifest && S.book.manifest.cover) || {};
      dispatch(updateManifest({
        cover: Object.assign({}, currentCover, { image: null }),
      }));
      renderCoverEditor();
    });
  }
}

export function renderCoverEditor() {
  const el = document.getElementById('cover-editor-inner');
  if (!el) return;
  if (!_editorActive && currentView !== 'cover-editor') return;

  const m = (S.book && S.book.manifest) || {};

  el.innerHTML = `
    <div class="cover-editor-wrap">
      <div class="cover-editor-form">
        <div class="cover-editor-header">
          <button class="btn btn-ghost cover-editor-back" id="ce-back">← 돌아가기</button>
          <h2 class="cover-editor-title">표지 편집</h2>
        </div>

        <div class="ce-field">
          <label class="ce-label" for="ce-title">제목 <span class="ce-required">*</span></label>
          <input class="ce-input" id="ce-title" type="text" value="${escapeHTML(m.title || '')}" placeholder="책 제목을 입력하세요">
        </div>

        <div class="ce-field">
          <label class="ce-label" for="ce-subtitle">부제</label>
          <input class="ce-input" id="ce-subtitle" type="text" value="${escapeHTML(m.subtitle || '')}" placeholder="부제 (선택)">
        </div>

        <div class="ce-field">
          <label class="ce-label" for="ce-series">시리즈</label>
          <input class="ce-input" id="ce-series" type="text" value="${escapeHTML(m.series || '')}" placeholder="OL BOOK · 시리즈 이름">
        </div>

        <div class="ce-field">
          <label class="ce-label">표지 이미지</label>
          <div class="ce-img-wrap">
            ${m.cover && m.cover.image
              ? `<img class="ce-img-preview" src="${m.cover.image}" alt="현재 표지">`
              : '<div class="ce-img-empty">이미지 없음</div>'
            }
            <div class="ce-img-actions">
              <label class="btn btn-secondary ce-img-upload-label" for="ce-img-input">이미지 선택</label>
              <input id="ce-img-input" type="file" accept="image/*" style="display:none">
              ${m.cover && m.cover.image ? '<button class="btn btn-ghost ce-img-remove" id="ce-img-remove">제거</button>' : ''}
            </div>
            <p class="ce-img-hint">권장: 5:7 비율 (예: 500×700px). BOOK HTML에 base64로 포함됩니다.</p>
          </div>
        </div>

        <div class="ce-field-row">
          <div class="ce-field">
            <label class="ce-label" for="ce-version">버전</label>
            <input class="ce-input" id="ce-version" type="text" value="${escapeHTML(m.version || '1.0')}" placeholder="1.0">
          </div>
          <div class="ce-field">
            <label class="ce-label" for="ce-date">발행일</label>
            <input class="ce-input" id="ce-date" type="date" value="${escapeHTML(m.publishedAt || new Date().toISOString().slice(0, 10))}">
          </div>
        </div>

        <div class="ce-field ce-readonly">
          <label class="ce-label">저자 <span class="ce-badge">자동</span></label>
          <div class="ce-static">${escapeHTML(m.author || ORIGIN.author)}</div>
        </div>

        <div class="ce-field ce-readonly">
          <label class="ce-label">라이선스 <span class="ce-badge">자동</span></label>
          <div class="ce-static">${escapeHTML(m.license || ORIGIN.license)}</div>
        </div>
      </div>

      <div class="cover-editor-preview">
        <div class="ce-preview-label">미리보기</div>
        <div class="ce-preview-frame" id="ce-preview-frame">
          ${_renderPreviewHTML(m)}
        </div>
      </div>
    </div>
  `;

  _bindCoverEditorEvents();
}

export function openCoverEditor() {
  _editorActive = true;
  switchView('cover-editor');
}

subscribe('cover-editor', renderCoverEditor);
