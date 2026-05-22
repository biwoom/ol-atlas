// src/core/router.js
// ── 뷰 라우터 ────────────────────────────────────────

// ══════════════════════════════════════════════════════
//  ROUTER
// ══════════════════════════════════════════════════════
let currentView = 'kanban';
let currentDocCardId = null;  // Phase 4: 문서뷰에서 현재 보고 있는 카드 ID

function switchView(v) {
  // 문서뷰 인라인 편집 중에 다른 뷰로 떠나려 하면 가드
  if (currentView === 'document' && v !== 'document' && dvEditing && isDvEditDirty()) {
    if (!confirm('변경 사항이 저장되지 않았습니다. 다른 뷰로 이동하시겠습니까?')) return;
  }
  if (v !== 'document') {
    dvEditing = false;
    dvEditOriginal = '';
  }
  // 뷰 전환 시 이전 뷰의 선택 상태 초기화
  if (currentView === 'cards')    { clearBulkSelection('cg'); closeBulkPopovers(); }
  if (currentView === 'list')     { clearBulkSelection('lv'); closeBulkPopovers(); }

  currentView = v;
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

  // 마지막 뷰 저장 (home은 저장 안 함)
  if (v !== 'home') {
    try { localStorage.setItem('ol_last_view', v); } catch(_) {}
  }

  // v1.5: URL hash 업데이트
  updateHash(v);
}

// ── v1.5: URL hash 동기화 ──────────────────────────────
// _suppressHashUpdate: routeFromHash → switchView 시 무한루프 방지 가드
let _suppressHashUpdate = false;

function updateHash(v) {
  if (_suppressHashUpdate) return;
  try {
    let target;
    if (v === 'document' && currentDocCardId != null) {
      const card = (S.cards || []).find(c => c.id === currentDocCardId);
      const slug = (card && card.slug) ? card.slug : String(currentDocCardId);
      target = '#document/' + slug;
    } else if (v === 'home') {
      target = location.pathname + location.search;   // # 없는 깨끗한 URL
    } else {
      target = '#' + v;
    }
    // 같은 hash면 replaceState 안 함 (popstate 방지)
    const current = location.hash || '';
    if (current === target || location.href.endsWith(target)) return;
    history.replaceState(null, '', target);
  } catch(_) {}
}

// ══════════════════════════════════════════════════════
//  ④ DOCUMENT VIEW (Phase 4)
// ══════════════════════════════════════════════════════

// 1차원 카드 순서: 컬럼 순서 → 컬럼 내 카드 순서
function getOrderedCardList() {
  const result = [];
  S.columns.forEach(col => {
    S.cards.forEach(c => {
      if (c.colId === col.id) result.push(c);
    });
  });
  // 컬럼 매칭 안 된 카드도 마지막에 부착 (방어적)
  S.cards.forEach(c => {
    if (!result.includes(c)) result.push(c);
  });
  return result;
}

function getPrevNextCard(cardId) {
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

// ── v1.5: Hash 라우터 ──────────────────────────────────
function routeFromHash() {
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)); }
  catch(_) { hash = location.hash.slice(1); }

  _suppressHashUpdate = true;
  try {
    if (!hash || hash === 'home') {
      switchView('home');
    } else if (['kanban','cards','list','about','trash'].includes(hash)) {
      switchView(hash);
    } else if (hash.startsWith('document/')) {
      const slug = hash.slice('document/'.length);
      const card = (S.cards || []).find(c => c.slug === slug)
                || (S.cards || []).find(c => String(c.id) === slug);
      if (card) {
        currentDocCardId = card.id;
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
