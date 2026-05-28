// src/core/router.js
// ── 뷰 라우터 ────────────────────────────────────────

import { devLog } from './dev.js';
import { queueRender } from './render-queue.js';
import { S } from './state.js';
import { customConfirm } from '../ui/confirm-modal.js';
import { toast } from './utils.js';

export let currentView = 'kanban';
export let currentDocCardId = null;
export function setCurrentDocCardId(id) { currentDocCardId = id; }
export function updateHash(v) { _updateHash(v); }

// 등록 패턴: docview-inline.js에서 편집 가드를 등록
let _docViewGuard = null;
export function registerDocViewGuard(fn) { _docViewGuard = fn; }

// 등록 패턴: bulk-select.js에서 선택 초기화 콜백을 등록
let _viewChangeCb = null;
export function registerViewChangeCb(fn) { _viewChangeCb = fn; }

// 등록 패턴: events.js에서 뷰 전환 후 훅 등록 (모바일 사이드바 닫기 등)
const _postSwitchHooks = [];
export function registerPostSwitchHook(fn) { _postSwitchHooks.push(fn); }

export function switchView(v) {
  if (currentView === 'document' && v !== 'document' && _docViewGuard && _docViewGuard()) {
    _switchViewAsync(v);
    return;
  }
  _switchViewCore(v);
}

async function _switchViewAsync(v) {
  const ok = await customConfirm({
    title: '뷰 전환',
    message: '저장되지 않은 변경사항이 있습니다.\n다른 뷰로 이동하시겠습니까?',
    confirmText: '이동',
    cancelText: '취소',
  });
  if (!ok) return;
  _switchViewCore(v);
}

function _switchViewCore(v) {
  if (_viewChangeCb) _viewChangeCb(currentView, v);

  currentView = v;
  document.body.classList.toggle('is-home', v === 'home');
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelectorAll('.h-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === v)
  );
  queueRender('sidebar');
  if (v === 'kanban')   queueRender('kanban');
  if (v === 'cards')    queueRender('cards');
  if (v === 'list')     queueRender('list');
  if (v === 'about')    queueRender('about');
  if (v === 'document') queueRender('docview');
  if (v === 'home')     queueRender('home');
  if (v === 'trash')    queueRender('trash');
  if (v === 'reader')   queueRender('reader');

  if (v !== 'home') {
    try { localStorage.setItem('ol_last_view', v); } catch(_) {}
  }

  _updateHash(v);
  _postSwitchHooks.forEach(fn => fn(v));
}

let _suppressHashUpdate = false;

function _updateHash(v) {
  if (_suppressHashUpdate) return;
  try {
    let target;
    if (v === 'document' && currentDocCardId != null) {
      const card = (S.cards || []).find(c => c.id === currentDocCardId);
      const slug = (card && card.slug) ? card.slug : String(currentDocCardId);
      target = '#document/' + slug;
    } else if (v === 'home') {
      target = location.pathname + location.search;
    } else {
      target = '#' + v;
    }
    const current = location.hash || '';
    if (current === target || location.href.endsWith(target)) return;
    history.replaceState(null, '', target);
  } catch(_) {}
}

export function getOrderedCardList() {
  const result = [];
  S.columns.forEach(col => {
    S.cards.forEach(c => {
      if (c.colId === col.id) result.push(c);
    });
  });
  S.cards.forEach(c => {
    if (!result.includes(c)) result.push(c);
  });
  return result;
}

export function getPrevNextCard(cardId) {
  const list = getOrderedCardList();
  const idx = list.findIndex(c => c.id === cardId);
  if (idx === -1) return { prev: null, next: null, idx: -1, total: list.length };
  return {
    prev:  idx > 0 ? list[idx - 1] : null,
    next:  idx < list.length - 1 ? list[idx + 1] : null,
    idx,
    total: list.length,
  };
}

export function routeFromHash() {
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)); }
  catch(_) { hash = location.hash.slice(1); }

  _suppressHashUpdate = true;
  try {
    if (!hash || hash === 'home') {
      switchView('home');
    } else if (['kanban', 'cards', 'list', 'about', 'trash'].includes(hash)) {
      switchView(hash);
    } else if (hash.startsWith('document/')) {
      const slug = hash.slice('document/'.length);
      const card = (S.cards || []).find(c => c.slug === slug)
                || (S.cards || []).find(c => String(c.id) === slug);
      if (card) {
        setCurrentDocCardId(card.id);
        switchView('document');
      } else {
        toast('해당 문서를 찾을 수 없습니다', 'warning');
        switchView('home');
      }
    } else {
      switchView('home');
    }
  } finally {
    _suppressHashUpdate = false;
  }
}

if (typeof window !== 'undefined') {
  window.switchView = switchView;
  window.routeFromHash = routeFromHash;
}
