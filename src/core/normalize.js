// src/core/normalize.js
// ── 상태 정규화 ──────────────────────────────────────

import { today, ce } from './utils.js';
import { makeDefault } from './state.js';
import { bodyImagesToTokens, titleToSlug } from './constants.js';

const VALID_PRIORITIES = ['high', 'mid', 'low'];

export function normalizeCard(card) {
  if (card.bodyMd) {
    if (!card.body) card.body = card.bodyMd;
    delete card.bodyMd;
  }
  delete card.bodyMode;
  if ('history' in card) delete card.history;

  if (card.body   === undefined) card.body   = '';
  if (!VALID_PRIORITIES.includes(card.priority)) card.priority = 'mid';
  if (!Array.isArray(card.tags)) card.tags = [];

  if (!card.images || typeof card.images !== 'object') card.images = {};
  if (card.body && /!\[[^\]]*\]\(/.test(card.body)) {
    bodyImagesToTokens(card);
  }

  if (!card.slug || typeof card.slug !== 'string') {
    card.slug = titleToSlug(card.title) || String(card.id || 'card');
  }

  if (!Array.isArray(card.acts)) card.acts = [];

  return card;
}

export function normalizeState(s) {
  if (!s || typeof s !== 'object') return makeDefault();

  if (!s.meta || typeof s.meta !== 'object') s.meta = {};
  if (!s.meta.fileId)  s.meta.fileId  = 'ol-' + Math.random().toString(36).slice(2, 10);
  if (!s.meta.title)   s.meta.title   = 'OL Weaving the Wisdom';
  if (!s.meta.created) s.meta.created = today();
  if (!s.meta.version) s.meta.version = '0.0.1';
  if (!Array.isArray(s.meta.editors)) s.meta.editors = [];
  if (!Array.isArray(s.meta.saveLog)) s.meta.saveLog = [];
  if (!Array.isArray(s.meta.actLog))  s.meta.actLog  = [];
  if (s.meta.currentEditorId === undefined) s.meta.currentEditorId = null;

  if (!Array.isArray(s.columns)) s.columns = [];
  if (!Array.isArray(s.cards)) s.cards = [];
  if (!Array.isArray(s.trash)) s.trash = [];

  s.cards.forEach(normalizeCard);

  if (!s.userData || typeof s.userData !== 'object') s.userData = { status: {} };
  if (!s.userData.status || typeof s.userData.status !== 'object') s.userData.status = {};

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

const EMPTY_ICONS = {
  cards:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  search:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  filter:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
};

export function buildEmptyState(iconKey, title, sub) {
  const wrap = ce('div', 'empty-state');
  const ico  = ce('div', 'empty-state-icon');
  ico.innerHTML = EMPTY_ICONS[iconKey] || EMPTY_ICONS.cards;
  wrap.appendChild(ico);
  wrap.appendChild(ce('div', 'empty-state-title', title));
  if (sub) wrap.appendChild(ce('div', 'empty-state-sub', sub));
  return wrap;
}
