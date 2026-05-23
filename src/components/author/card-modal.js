// src/components/card-modal.js
// ── 카드 모달 ────────────────────────────────────────

import { S }                        from '../../core/state.js';
import { dispatch }                 from '../../core/action.js';
import { createCard, updateCard, deleteCard } from '../../actions/card-actions.js';
import { customConfirm }            from '../../ui/confirm-modal.js';
import { toast, today, dlBlob }     from '../../core/utils.js';
import { titleToSlug, slugFilename } from '../../core/constants.js';
import { currentView, currentDocCardId, setCurrentDocCardId, updateHash, getOrderedCardList } from '../../core/router.js';
import { initCustomSelect }         from '../../ui/custom-select.js';
import { _currentEditingCard, setCurrentEditingCard } from '../../core/tag-filter.js';
import { updateMarkdownPreview, setCmMode, renderCmImgPanel } from './md-editor.js';
import { cardToMarkdownText }       from '../../actions/export-import.js';

export let editCard   = null;
export let curPri     = 'mid';
export let curStatus  = 'wait';

export function setEditCard(card)   { editCard   = card; }
export function setCurPri(p)        { curPri     = p; }
export function setCurStatus(s)     { curStatus  = s; }

let cardModalPrevFocus = null;

function trapFocus(modalEl, e) {
  if (e.key !== 'Tab') return;
  const focusables = modalEl.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const visible = Array.from(focusables).filter(el => el.offsetParent !== null);
  if (!visible.length) return;
  const first = visible[0];
  const last  = visible[visible.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

export function openCardModal(card, colId) {
  editCard  = card || null;
  curPri    = card ? (card.priority||'mid') : 'mid';
  curStatus = card ? (S.userData.status[card.id]||'wait') : 'wait';

  setCurrentEditingCard(card ? card : { images: {}, _isNew: true });

  document.getElementById('cm-title').textContent = card ? '카드 편집' : '새 카드';
  document.getElementById('cm-t').value    = card ? card.title : '';
  document.getElementById('cm-b-md').value = card ? (card.body || '') : '';
  document.getElementById('cm-g').value    = card ? (card.group||'') : '';
  document.getElementById('cm-tags').value = card ? (card.tags||[]).join(', ') : '';
  const slugEl = document.getElementById('cm-slug');
  if (slugEl) slugEl.value = card ? (card.slug || '') : '';

  const sel = document.getElementById('cm-col');
  sel.innerHTML = '';
  S.columns.forEach(col => {
    const o=document.createElement('option'); o.value=col.id; o.textContent=col.title;
    if ((card&&card.colId===col.id)||(!card&&col.id===colId)) o.selected=true;
    sel.appendChild(o);
  });
  if (!sel._csInit) initCustomSelect(sel);
  updatePriBtns();
  updateStatusBtns();
  document.getElementById('cm-del').style.display = card ? 'inline-flex' : 'none';
  const docBtn = document.getElementById('cm-docview-btn');
  if (docBtn) docBtn.style.display = card ? '' : 'none';

  const mdExportBtn = document.getElementById('cm-md-export');
  if (mdExportBtn) {
    mdExportBtn.style.display = card ? 'inline-flex' : 'none';
    mdExportBtn.onclick = () => {
      const tempCard = {
        ...card,
        title: document.getElementById('cm-t').value || card.title,
        body:  document.getElementById('cm-b-md').value,
        group: document.getElementById('cm-g').value,
        images: card.images || {},
      };
      const filename = slugFilename(tempCard.title, 'card-' + card.id) + '.md';
      dlBlob(new Blob([cardToMarkdownText(tempCard)], { type: 'text/markdown; charset=utf-8' }), filename);
      toast('마크다운 파일을 내보냈습니다', 'success');
    };
  }

  cardModalPrevFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  document.getElementById('card-modal').classList.add('open');

  const cmMdEl = document.getElementById('cm-b-md');
  if (cmMdEl) updateMarkdownPreview(cmMdEl);
  setCmMode('preview');

  renderCmImgPanel();

  requestAnimationFrame(() => document.getElementById('cm-t').focus());
}

export function updatePriBtns() {
  document.querySelectorAll('.pri-btn').forEach(b => {
    b.className = 'pri-btn';
    if (b.dataset.p === curPri) b.classList.add(`sel-${curPri[0]}`);
  });
}

export function updateStatusBtns() {
  document.querySelectorAll('.status-btn').forEach(b => {
    b.className = 'status-btn';
    if (b.dataset.s === curStatus) b.classList.add(`sel-${curStatus}`);
  });
}

export function closeCardModal() {
  document.getElementById('card-modal').classList.remove('open');
  document.body.style.overflow = '';
  editCard = null;
  setCurrentEditingCard(null);
  if (cardModalPrevFocus && typeof cardModalPrevFocus.focus === 'function') {
    try { cardModalPrevFocus.focus(); } catch(e) {}
  }
  cardModalPrevFocus = null;
}

export function saveCard() {
  const title = document.getElementById('cm-t').value.trim();
  if (!title) { toast('제목을 입력해주세요'); return; }
  const body   = document.getElementById('cm-b-md').value.trim();
  const group  = document.getElementById('cm-g').value.trim();
  const tags   = document.getElementById('cm-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const colIdRaw = document.getElementById('cm-col').value;
  const colIdNum = parseInt(colIdRaw, 10);
  const colId = Number.isFinite(colIdNum) ? colIdNum : (S.columns[0]?.id || null);

  const slugEl = document.getElementById('cm-slug');
  let slug = slugEl ? slugEl.value.trim() : '';
  if (!slug) slug = titleToSlug(title);
  if (!slug) slug = 'card';
  slug = titleToSlug(slug) || 'card';

  if (editCard) {
    const savedCardId = editCard.id;
    dispatch(updateCard(savedCardId, { title, body, group, tags, colId, priority: curPri, slug, status: curStatus }));
    toast('카드가 저장되었습니다');
    if (currentView === 'document' && currentDocCardId === savedCardId) {
      updateHash('document');
    }
  } else {
    const newCard = {
      colId, title, body, group, tags,
      priority: curPri, created: today(),
      images: (_currentEditingCard && _currentEditingCard.images) || {},
      slug,
    };
    dispatch(createCard(newCard, curStatus));
    toast('카드가 추가되었습니다');
  }

  closeCardModal();
}

export async function openCardDeleteDialog() {
  if (!editCard) return;
  const ok = await customConfirm({
    title: '카드 삭제',
    message: '이 카드를 휴지통으로 이동하시겠습니까?\n\n휴지통에서 복원할 수 있습니다.',
    confirmText: '휴지통으로',
    cancelText: '취소',
  });
  if (!ok) return;
  const deletedId = editCard.id;

  dispatch(deleteCard(deletedId));

  if (currentDocCardId === deletedId) {
    const list = getOrderedCardList();
    setCurrentDocCardId(list.length ? list[0].id : null);
    if (currentView === 'document') updateHash('document');
  }

  closeCardModal();
  toast('휴지통으로 이동했습니다');
}
