// src/core/normalize.js
// ── 상태 정규화 — 로드/임포트 양쪽에서 공통 사용 ──────
// 누락 필드 보강 + 잘못된 값 정규화 + ID 충돌 방지.
// 모든 진입점(load/init/import)에서 한 번씩 통과시킴.

// ══════════════════════════════════════════════════════
//  STATE NORMALIZATION — 로드/임포트 양쪽에서 공통 사용
//  · 누락 필드 보강 + 잘못된 값 정규화 + ID 충돌 방지
//  · 모든 진입점(load/init/import)에서 한 번씩 통과시킴
// ══════════════════════════════════════════════════════
const VALID_PRIORITIES = ['high', 'mid', 'low'];

function normalizeCard(card) {
  // ── 레거시 마이그레이션 ────────────────────────────
  if (card.bodyMd) {
    if (!card.body) card.body = card.bodyMd;
    delete card.bodyMd;
  }
  delete card.bodyMode;
  if ('history' in card) delete card.history;

  if (card.body   === undefined) card.body   = '';
  if (!VALID_PRIORITIES.includes(card.priority)) card.priority = 'mid';
  if (!Array.isArray(card.tags)) card.tags = [];

  // ── v1.5: images 저장소 + 마이그레이션 ──────────────
  if (!card.images || typeof card.images !== 'object') card.images = {};
  // 본문에 남은 표준 ![alt](src) 패턴을 토큰화
  if (card.body && /!\[[^\]]*\]\(/.test(card.body)) {
    bodyImagesToTokens(card);
  }

  // ── v1.5: slug 자동 생성 ────────────────────────────
  if (!card.slug || typeof card.slug !== 'string') {
    card.slug = titleToSlug(card.title) || String(card.id || 'card');
  }

  return card;
}

function normalizeState(s) {
  if (!s || typeof s !== 'object') return makeDefault();

  // meta
  if (!s.meta || typeof s.meta !== 'object') s.meta = {};
  if (!s.meta.fileId)  s.meta.fileId  = 'ol-' + Math.random().toString(36).slice(2,10);
  if (!s.meta.title)   s.meta.title   = 'OL Weaving the Wisdom';
  if (!s.meta.created) s.meta.created = today();
  if (!s.meta.version) s.meta.version = '1.0.0';

  // columns
  if (!Array.isArray(s.columns)) s.columns = [];

  // cards
  if (!Array.isArray(s.cards)) s.cards = [];
  if (!Array.isArray(s.trash)) s.trash = [];  // v1.5: 휴지통

  s.cards.forEach(normalizeCard);

  // userData
  if (!s.userData || typeof s.userData !== 'object') s.userData = { status: {} };
  if (!s.userData.status || typeof s.userData.status !== 'object') s.userData.status = {};

  // nextColId / nextCardId — 기존 ID 최댓값 기반으로 안전하게 부여
  const maxColId = s.columns.reduce((m, c) => {
    const n = typeof c.id === 'number' ? c.id : parseInt(c.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  if (typeof s.nextColId !== 'number' || s.nextColId <= maxColId) {
    s.nextColId = maxColId + 1;
  }
  const maxCardId = s.cards.reduce((m, c) => {
    const n = typeof c.id === 'number' ? c.id : parseInt(c.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  if (typeof s.nextCardId !== 'number' || s.nextCardId <= maxCardId) {
    s.nextCardId = maxCardId + 1;
  }

  // v1.5: slug 중복 해결
  const usedSlugs = new Set();
  s.cards.forEach(card => {
    if (!card.slug) card.slug = titleToSlug(card.title) || String(card.id || 'card');
    if (usedSlugs.has(card.slug)) {
      let n = 2;
      while (usedSlugs.has(card.slug + '-' + n)) n++;
      card.slug = card.slug + '-' + n;
    }
    usedSlugs.add(card.slug);
  });

  return s;
}

// 공통 EmptyState (아이콘 + 제목 + 부제)
const EMPTY_ICONS = {
  cards:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  search:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  filter:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
};
function buildEmptyState(iconKey, title, sub) {
  const wrap = ce('div', 'empty-state');
  const ico  = ce('div', 'empty-state-icon');
  ico.innerHTML = EMPTY_ICONS[iconKey] || EMPTY_ICONS.cards;
  wrap.appendChild(ico);
  wrap.appendChild(ce('div', 'empty-state-title', title));
  if (sub) wrap.appendChild(ce('div', 'empty-state-sub', sub));
  return wrap;
}
