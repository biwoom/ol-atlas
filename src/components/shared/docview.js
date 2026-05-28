// src/components/docview.js
// ── Document View + 인라인 편집 (merged) ─────────────

import { S }                        from '../../core/state.js';
import { dispatch }                 from '../../core/action.js';
import { updateCard }               from '../../actions/card-actions.js';
import { ce, escapeHTML, toast, dlBlob } from '../../core/utils.js';
import { parseMarkdown }            from '../../core/markdown.js';
import { titleToSlug, slugFilename } from '../../core/constants.js';
import { buildEmptyState }          from '../../core/normalize.js';
import { customConfirm }            from '../../ui/confirm-modal.js';
import { initCustomSelect }         from '../../ui/custom-select.js';
import { currentView, currentDocCardId, setCurrentDocCardId, getOrderedCardList, getPrevNextCard, updateHash, switchView, registerDocViewGuard } from '../../core/router.js';
import { _currentEditingCard, setCurrentEditingCard } from '../../core/tag-filter.js';
import { queueRender }              from '../../core/render-queue.js';
import { subscribe }                from '../../core/store.js';
import { attachMarkdownEditor, renderDvImgPanel } from '../author/md-editor.js';
import { openCardModal, setEditCard, openCardDeleteDialog } from '../author/card-modal.js';
import { cardToMarkdownText }       from '../../actions/export-import.js';
import { ensureEditorSession }      from '../../ui/editor-modal.js';

// ── TOC ──────────────────────────────────────────────

function extractToc(md) {
  if (!md) return [];
  const items = [];
  const usedIds = new Set();
  let inFence = false;

  function makeId(rawText) {
    const plain = rawText.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '');
    const base = 'h-' + (plain.toLowerCase()
      .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
      .trim().replace(/\s+/g, '-') || 'heading');
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  }

  md.split('\n').forEach(line => {
    if (/^```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (!hm) return;
    const lvl  = hm[1].length;
    const text = hm[2].trim();
    const id   = makeId(text);
    items.push({ lvl, text, id });
  });
  return items;
}

function renderDocToc(tocItems) {
  const toc = document.getElementById('dv-toc');
  if (!toc) return;

  if (!tocItems || tocItems.length < 2) {
    toc.style.display = 'none';
    toc.innerHTML = '';
    return;
  }

  toc.style.display = '';
  toc.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'dv-toc-label';
  label.textContent = '목차';
  toc.appendChild(label);

  const list = document.createElement('nav');
  list.className = 'dv-toc-list';

  tocItems.forEach(({ lvl, text, id }) => {
    const a = document.createElement('a');
    a.className = `dv-toc-item dv-toc-h${lvl}`;
    a.textContent = text;
    a.href = '#';
    a.dataset.headingId = id;
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toc.querySelectorAll('.dv-toc-item').forEach(el => el.classList.remove('active'));
        a.classList.add('active');
      }
    });
    list.appendChild(a);
  });

  toc.appendChild(list);
}

let _tocObserver = null;

function setupTocObserver() {
  if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }

  const toc = document.getElementById('dv-toc');
  if (!toc || toc.style.display === 'none') return;

  const body = document.getElementById('dv-body');
  if (!body) return;
  const headings = Array.from(body.querySelectorAll('.md-h1[id],.md-h2[id],.md-h3[id]'));
  if (!headings.length) return;

  const scrollRoot = document.getElementById('main');

  _tocObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = toc.querySelector(`[data-heading-id="${e.target.id}"]`);
      if (!link) return;
      if (e.isIntersecting) {
        toc.querySelectorAll('.dv-toc-item').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        link.scrollIntoView({ block: 'nearest' });
      }
    });
  }, {
    root: scrollRoot,
    rootMargin: '-120px 0px -55% 0px',
    threshold: 0
  });

  headings.forEach(h => _tocObserver.observe(h));

  if (headings.length) {
    const firstLink = toc.querySelector(`[data-heading-id="${headings[0].id}"]`);
    if (firstLink) firstLink.classList.add('active');
  }
}

function renderDocBody(card) {
  if (!card) return '';
  const src = (card.body || '').trim();
  if (!src) return '<div class="dv-body-empty">(본문이 비어 있습니다)</div>';
  return '<div class="md-body">' + parseMarkdown(src, { card }) + '</div>';
}

// ── 인라인 편집 상태 ─────────────────────────────────

let dvEditing      = false;
let dvEditOriginal = '';
let dvEditPri      = 'mid';
let dvEditStatus   = 'wait';

function getDvEditValue() {
  if (!dvEditing) return '';
  const ta = document.getElementById('dv-edit-textarea');
  return ta ? ta.value : '';
}

export function isDvEditing() { return dvEditing; }

export function isDvEditDirty() {
  if (!dvEditing) return false;
  if (getDvEditValue() !== dvEditOriginal) return true;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) return false;
  const titleEl = document.getElementById('dv-me-title');
  const groupEl = document.getElementById('dv-me-group');
  const tagsEl  = document.getElementById('dv-me-tags');
  const colEl   = document.getElementById('dv-me-col');
  if (titleEl && titleEl.value.trim()  !== (card.title  || '')) return true;
  if (groupEl && groupEl.value.trim()  !== (card.group  || '')) return true;
  if (tagsEl  && tagsEl.value.trim()   !== (card.tags   || []).join(', ')) return true;
  if (colEl   && parseInt(colEl.value) !== card.colId)           return true;
  if (dvEditPri    !== (card.priority || 'mid'))                  return true;
  if (dvEditStatus !== (S.userData.status[card.id] || 'wait'))   return true;
  return false;
}

function buildDvMetaEditHTML(card) {
  const colOptions = S.columns.map(col =>
    `<option value="${col.id}" ${col.id === card.colId ? 'selected' : ''}>${escapeHTML(col.title)}</option>`
  ).join('');

  const priMap = [['high','높음'],['mid','보통'],['low','낮음']];
  const priHTML = priMap.map(([v,l]) => {
    const sel = dvEditPri === v ? ` sel-${v[0]}` : '';
    return `<button type="button" class="dv-me-btn${sel}" data-dv-pri="${v}">${l}</button>`;
  }).join('');

  const stMap = [['wait','학습대기'],['doing','학습중'],['done','학습완료']];
  const stHTML = stMap.map(([v,l]) => {
    const sel = dvEditStatus === v ? ` sel-${v}` : '';
    return `<button type="button" class="dv-me-btn${sel}" data-dv-st="${v}">${l}</button>`;
  }).join('');

  return `
    <div class="dv-meta-edit" id="dv-meta-edit">
      <div class="dv-me-row">
        <span class="dv-me-label">그룹</span>
        <input class="dv-me-input" id="dv-me-group" type="text" placeholder="예: 불교철학, 번역"
               value="${escapeHTML(card.group || '')}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">태그</span>
        <input class="dv-me-input" id="dv-me-tags" type="text" placeholder="예: 화엄, 연기 (쉼표 구분)"
               value="${escapeHTML((card.tags || []).join(', '))}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">슬러그</span>
        <input class="dv-me-input" id="dv-me-slug" type="text" maxlength="60"
               placeholder="URL 식별자 (비워두면 제목에서 자동 생성)"
               value="${escapeHTML(card.slug || '')}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">컬럼</span>
        <select class="dv-me-select" id="dv-me-col">${colOptions}</select>
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">우선순위</span>
        <div class="dv-me-toggle-row" id="dv-me-pri-row">${priHTML}</div>
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">학습상태</span>
        <div class="dv-me-toggle-row" id="dv-me-st-row">${stHTML}</div>
      </div>
    </div>`;
}

function attachDvMetaBtnHandlers() {
  document.querySelectorAll('#dv-me-pri-row [data-dv-pri]').forEach(btn => {
    btn.addEventListener('click', () => {
      dvEditPri = btn.dataset.dvPri;
      document.querySelectorAll('#dv-me-pri-row [data-dv-pri]').forEach(b => {
        b.className = 'dv-me-btn' + (b.dataset.dvPri === dvEditPri ? ` sel-${dvEditPri[0]}` : '');
      });
    });
  });
  document.querySelectorAll('#dv-me-st-row [data-dv-st]').forEach(btn => {
    btn.addEventListener('click', () => {
      dvEditStatus = btn.dataset.dvSt;
      document.querySelectorAll('#dv-me-st-row [data-dv-st]').forEach(b => {
        b.className = 'dv-me-btn' + (b.dataset.dvSt === dvEditStatus ? ` sel-${dvEditStatus}` : '');
      });
    });
  });
}

function applyDvEditArea(initialValue) {
  const existing = document.getElementById('dv-body') || document.querySelector('.dv-edit-area');
  if (!existing) return;

  existing.outerHTML = `
    <div class="dv-edit-area">
      <div class="md-editor" id="dv-md-editor">
        <div class="md-toolbar" role="toolbar" aria-label="마크다운 서식 도구">
          <button type="button" class="md-tb-btn" data-md="h1"     title="제목 1"><span class="md-tb-text">H1</span></button>
          <button type="button" class="md-tb-btn" data-md="h2"     title="제목 2"><span class="md-tb-text">H2</span></button>
          <button type="button" class="md-tb-btn" data-md="h3"     title="제목 3"><span class="md-tb-text">H3</span></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="bold"   title="굵게 (Ctrl+B)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="italic" title="기울임 (Ctrl+I)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="strike" title="취소선"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="code"   title="인라인 코드"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="quote"  title="인용"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="ul"     title="불릿 목록"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="ol"     title="번호 목록"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="check"  title="체크박스"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="link"   title="링크"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="image"  title="이미지"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="hr"     title="구분선"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg></button>
        </div>
        <div class="md-split-pane">
          <div class="md-editor-pane">
            <textarea id="dv-edit-textarea" class="dv-edit-md"
              placeholder="마크다운으로 입력하세요...&#10;&#10;빈 줄에서 / 를 입력하면 블록 메뉴가 열립니다."></textarea>
          </div>
          <div class="md-preview-pane">
            <div class="md-preview-body">
              <div class="md-preview-empty">미리보기가 여기에 표시됩니다</div>
            </div>
          </div>
        </div>
        <div class="md-slash-menu" role="listbox" aria-label="블록 메뉴"></div>
      </div>
      <div class="dv-img-panel" id="dv-img-panel-row" style="display:none">
        <div class="dv-img-panel-header">
          <span class="dv-img-panel-label">이미지 목록</span>
          <span class="field-hint">alt·주소 수정 가능</span>
        </div>
        <div class="cm-img-list" id="dv-img-list"></div>
      </div>
    </div>`;

  const ta = document.getElementById('dv-edit-textarea');
  if (ta) {
    ta.value = initialValue;
    attachMarkdownEditor(ta);
    requestAnimationFrame(() => {
      ta.focus({ preventScroll: true });
      try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch(e) {}
    });
  }
}

export function startInlineEdit() {
  if (currentDocCardId == null) return;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) return;

  setCurrentEditingCard(card);

  const mainEl = document.getElementById('main');
  const savedScroll = mainEl ? mainEl.scrollTop : 0;

  const tocEl = document.getElementById('dv-toc');
  if (tocEl) tocEl.style.display = 'none';
  if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }

  dvEditing    = true;
  dvEditPri    = card.priority || 'mid';
  dvEditStatus = S.userData.status[card.id] || 'wait';
  const initial = card.body || '';
  dvEditOriginal = initial;

  const wrap = document.getElementById('dv-wrap');
  if (!wrap) return;

  const metaEl = wrap.querySelector('.dv-meta');
  if (metaEl) metaEl.outerHTML = buildDvMetaEditHTML(card);

  const titleEl = wrap.querySelector('.dv-title');
  if (titleEl) {
    titleEl.outerHTML = `<input class="dv-me-title-input" id="dv-me-title"
      type="text" placeholder="제목을 입력하세요" value="${escapeHTML(card.title || '')}">`;
  }

  applyDvEditArea(initial);
  attachDvMetaBtnHandlers();

  requestAnimationFrame(() => {
    const dvCol = document.getElementById('dv-me-col');
    if (dvCol && !dvCol._csInit) initCustomSelect(dvCol);
  });

  renderDvImgPanel();
  swapDvBarToEditMode();

  requestAnimationFrame(() => {
    if (mainEl) mainEl.scrollTop = savedScroll;
    const ti = document.getElementById('dv-me-title');
    if (ti) ti.focus({ preventScroll: true });
  });
}

function swapDvBarToEditMode() {
  const bar = document.querySelector('#view-document .view-bar');
  if (!bar) return;
  const editBtn = document.getElementById('dv-edit-btn');
  if (editBtn) editBtn.style.display = 'none';

  let actions = document.getElementById('dv-edit-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.id = 'dv-edit-actions';
    actions.className = 'dv-edit-actions';
    actions.innerHTML = `
      <button class="btn sm danger" id="dv-edit-delete" title="카드 삭제 (휴지통)">삭제</button>
      <button class="btn sm" id="dv-edit-export-md" title=".md 파일 내보내기">↓ md</button>
      <span class="dv-edit-actions-sep"></span>
      <button class="btn sm" id="dv-edit-cancel" title="취소 (Esc)">취소</button>
      <button class="btn pri sm" id="dv-edit-save" title="저장 (Ctrl+S)">저장</button>
    `;
    bar.appendChild(actions);
    document.getElementById('dv-edit-cancel').addEventListener('click', cancelInlineEdit);
    document.getElementById('dv-edit-save').addEventListener('click', saveInlineEdit);
    document.getElementById('dv-edit-delete').addEventListener('click', () => {
      if (!currentDocCardId) return;
      const card = S.cards.find(c => c.id === currentDocCardId) || null;
      setEditCard(card);
      if (card) openCardDeleteDialog();
    });
    document.getElementById('dv-edit-export-md').addEventListener('click', () => {
      const card = _currentEditingCard || S.cards.find(c => c.id === currentDocCardId);
      if (!card) return;
      const mdText = cardToMarkdownText(card);
      const filename = slugFilename(card.title || 'card', 'card-' + card.id) + '.md';
      dlBlob(new Blob([mdText], { type: 'text/markdown; charset=utf-8' }), filename);
      toast('마크다운 파일을 내보냈습니다');
    });
  } else {
    actions.style.display = '';
  }
}

function swapDvBarToReadMode() {
  const editBtn = document.getElementById('dv-edit-btn');
  if (editBtn) editBtn.style.display = '';
  const actions = document.getElementById('dv-edit-actions');
  if (actions) actions.style.display = 'none';
}

export async function saveInlineEdit() {
  if (!dvEditing) return;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) { cancelInlineEdit(); return; }

  const titleEl = document.getElementById('dv-me-title');
  const newTitle = titleEl ? titleEl.value.trim() : card.title;
  if (!newTitle) { toast('제목을 입력해주세요'); if (titleEl) titleEl.focus(); return; }

  const groupEl  = document.getElementById('dv-me-group');
  const tagsEl   = document.getElementById('dv-me-tags');
  const colEl    = document.getElementById('dv-me-col');
  const slugEl   = document.getElementById('dv-me-slug');
  const newGroup = groupEl ? groupEl.value.trim() : (card.group || '');
  const newTags  = tagsEl  ? tagsEl.value.split(',').map(t => t.trim()).filter(Boolean) : (card.tags || []);
  const colRaw   = colEl   ? parseInt(colEl.value, 10) : card.colId;
  const newColId = Number.isFinite(colRaw) ? colRaw : card.colId;

  let newSlug = slugEl ? slugEl.value.trim() : (card.slug || '');
  if (!newSlug) newSlug = titleToSlug(newTitle);
  if (!newSlug) newSlug = 'card-' + card.id;
  newSlug = titleToSlug(newSlug) || ('card-' + card.id);

  if (!(await ensureEditorSession(S))) return;

  const newBody = getDvEditValue();
  dispatch(updateCard(card.id, {
    title:    newTitle,
    group:    newGroup,
    tags:     newTags,
    colId:    newColId,
    priority: dvEditPri,
    slug:     newSlug,
    body:     newBody,
    status:   dvEditStatus,
  }));

  dvEditing = false;
  dvEditOriginal = '';
  setCurrentEditingCard(null);

  updateHash('document');
  const mainEl = document.getElementById('main');
  if (mainEl) mainEl.scrollTop = 0;
  toast('저장되었습니다');
}

export async function cancelInlineEdit() {
  if (!dvEditing) return;
  if (isDvEditDirty()) {
    const ok = await customConfirm({
      title: '편집 취소',
      message: '변경사항을 버리시겠습니까?',
      confirmText: '버리기',
      cancelText: '계속 편집',
    });
    if (!ok) return;
  }
  dvEditing = false;
  dvEditOriginal = '';
  setCurrentEditingCard(null);
  queueRender('docview');
  const mainEl = document.getElementById('main');
  if (mainEl) mainEl.scrollTop = 0;
}

// ── 네비게이션 ───────────────────────────────────────

export async function goToDocCard(cardId) {
  if (dvEditing && isDvEditDirty()) {
    const ok = await customConfirm({
      title: '카드 이동',
      message: '저장되지 않은 변경사항이 있습니다.\n다른 카드로 이동하시겠습니까?',
      confirmText: '이동',
      cancelText: '취소',
    });
    if (!ok) return;
  }
  dvEditing = false;
  dvEditOriginal = '';

  setCurrentDocCardId(cardId);
  queueRender('docview');
  queueRender('sidebar');
  const main = document.getElementById('main');
  if (main) main.scrollTop = 0;
  updateHash('document');
}

export function openDocCard(cardId) {
  dvEditing = false;
  dvEditOriginal = '';

  setCurrentDocCardId(cardId);
  switchView('document');
}

// ── 문서뷰 렌더링 ────────────────────────────────────

function renderDocumentView() {
  if (dvEditing) {
    dvEditing = false;
    dvEditOriginal = '';
  }
  swapDvBarToReadMode();

  const wrap = document.getElementById('dv-wrap');
  const editBtn = document.getElementById('dv-edit-btn');
  const barTitle = document.getElementById('dv-bar-title');
  const barPos = document.getElementById('dv-bar-pos');
  if (!wrap) return;

  wrap.innerHTML = '';

  if (!S.cards.length) {
    barTitle.textContent = '문서뷰';
    barPos.textContent = '';
    if (editBtn) editBtn.style.display = 'none';
    const emptyEl = buildEmptyState('doc', '문서가 없습니다',
      '카드를 추가하면 이곳에서 문서처럼 읽고 편집할 수 있습니다.');
    const addBtn = ce('button', 'btn pri sm');
    addBtn.textContent = '+ 첫 카드 추가';
    addBtn.style.marginTop = '1rem';
    addBtn.addEventListener('click', () => openCardModal(null, null));
    emptyEl.appendChild(addBtn);
    wrap.appendChild(emptyEl);
    setCurrentDocCardId(null);
    return;
  }

  let card = currentDocCardId != null ? S.cards.find(c => c.id === currentDocCardId) : null;
  if (!card) {
    const list = getOrderedCardList();
    card = list[0] || null;
    if (card) setCurrentDocCardId(card.id);
  }
  if (!card) {
    barTitle.textContent = '문서뷰';
    barPos.textContent = '';
    if (editBtn) editBtn.style.display = 'none';
    wrap.appendChild(buildEmptyState('doc', '카드를 찾을 수 없습니다', '다른 카드를 선택해주세요.'));
    return;
  }

  if (editBtn) editBtn.style.display = '';

  const { prev, next, idx, total } = getPrevNextCard(card.id);
  const col = S.columns.find(c => c.id === card.colId);
  const learnStatus = S.userData.status[card.id] || 'wait';
  const priLabel    = { high:'높음', mid:'보통', low:'낮음' }[card.priority] || '보통';
  const stLabel     = { wait:'학습대기', doing:'학습중', done:'학습완료' }[learnStatus] || '학습대기';

  barTitle.textContent = '문서뷰';
  barPos.textContent = `${idx + 1} / ${total}`;

  const metaParts = [];
  if (col) {
    metaParts.push(
      `<span class="dv-meta-col"><span class="dv-meta-col-dot" style="background:${col.color || '#888'}"></span>${escapeHTML(col.title || '')}</span>`
    );
  }
  if (card.group) {
    metaParts.push(`<span class="dv-meta-group">${escapeHTML(card.group)}</span>`);
  }
  metaParts.push(`<span class="dv-meta-prio ${card.priority || 'mid'}">${priLabel}</span>`);
  metaParts.push(`<span class="dv-meta-status ${learnStatus}">${stLabel}</span>`);
  if (card.tags && card.tags.length) {
    const tagsHtml = card.tags.map(t => `<span class="dv-meta-tag">${escapeHTML(t)}</span>`).join('');
    metaParts.push(`<span class="dv-meta-tags">${tagsHtml}</span>`);
  }

  const bodyHtml = renderDocBody(card);

  const prevHtml = `
    <button class="dv-nav-btn prev" id="dv-prev" title="이전 카드 ([)" ${prev ? '' : 'disabled'}>
      <span class="dv-nav-label">← 이전</span>
      <span class="dv-nav-title">${prev ? escapeHTML(prev.title || '(제목 없음)') : '—'}</span>
    </button>`;
  const nextHtml = `
    <button class="dv-nav-btn next" id="dv-next" title="다음 카드 (])" ${next ? '' : 'disabled'}>
      <span class="dv-nav-label">다음 →</span>
      <span class="dv-nav-title">${next ? escapeHTML(next.title || '(제목 없음)') : '—'}</span>
    </button>`;

  wrap.innerHTML = `
    <div class="dv-meta">${metaParts.join('')}</div>
    <h1 class="dv-title">${escapeHTML(card.title || '(제목 없음)')}</h1>
    <div class="dv-body" id="dv-body">${bodyHtml}</div>
    <div class="dv-foot">${prevHtml}${nextHtml}</div>
  `;

  if (prev) document.getElementById('dv-prev').addEventListener('click', () => goToDocCard(prev.id));
  if (next) document.getElementById('dv-next').addEventListener('click', () => goToDocCard(next.id));

  const tocItems = extractToc(card.body || '');
  renderDocToc(tocItems);
  requestAnimationFrame(() => setupTocObserver());
}

registerDocViewGuard(() => dvEditing && isDvEditDirty());
subscribe('docview', renderDocumentView);
