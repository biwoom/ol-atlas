// src/core/constants.js
// ── 전역 상수 및 공용 헬퍼 ────────────────────────────

import { S } from './state.js';
import { dlBlob } from './utils.js';

export const ORIGIN = Object.freeze({
  author    : '비움',
  site      : 'olbit.org',
  copyright : 'Copyright © 2026 biwoom',
  license   : 'CC BY-SA 4.0',
  tool      : 'OL · ATLAS · Weaving the Wisdom',
});

export const OL_PROJECTS = Object.freeze([
  {
    name: '붓다스토리',
    desc: '붓다의 생애를 단행본 형식으로 엮은 OL 콘텐츠 파일',
    url: 'https://olbit.org/buddhastory',
    tag: '콘텐츠',
  },
  {
    name: '중관학 번역 모음',
    desc: '나가르주나 · 짠드라끼르띠 등 중관학 핵심 논서 한글 번역',
    url: 'https://olbit.org/madhyamaka',
    tag: '콘텐츠',
  },
  {
    name: '경전 모음 (OL 형식)',
    desc: '대승·초기 경전을 OL 카드로 정리한 학습 자료',
    url: 'https://olbit.org/sutras',
    tag: '콘텐츠',
  },
]);

export const ICONS_X = {
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  chevronDown:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  search:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  tag:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>',
  fileText:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  home:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
};

export function slugFilename(s, fallback) {
  const t = String(s || '').trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return t || (fallback || 'untitled');
}

export function dlBlobSequential(items, doneCb) {
  let i = 0;
  function step() {
    if (i >= items.length) { if (doneCb) doneCb(); return; }
    dlBlob(items[i].blob, items[i].filename);
    i++; setTimeout(step, 80);
  }
  step();
}

export const COL_COLORS = [
  '#fecaca', '#fed7aa', '#fef3c7', '#fef08a', '#d9f99d',
  '#bbf7d0', '#a7f3d0', '#a5f3fc', '#bae6fd', '#bfdbfe',
  '#c7d2fe', '#ddd6fe', '#f5d0fe', '#fbcfe8', '#e7e5e4',
];

export function titleToSlug(title) {
  return String(title || '').trim()
    .replace(/[\\/:*?"<>|#&=%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function ensureUniqueSlug(slug, excludeId) {
  if (!slug) slug = 'untitled';
  const others = (S.cards || []).filter(c => c.id !== excludeId).map(c => c.slug);
  if (!others.includes(slug)) return slug;
  let n = 2;
  while (others.includes(slug + '-' + n)) n++;
  return slug + '-' + n;
}

export function newImgId(card) {
  card.images = card.images || {};
  const ids = Object.keys(card.images);
  let max = 0;
  ids.forEach(id => {
    const m = id.match(/^img-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'img-' + (max + 1);
}

export function safeImgAlt(alt) {
  return String(alt || '').replace(/[\[\]]/g, '').slice(0, 100).trim();
}

export function bodyImagesToTokens(card) {
  if (!card.body) return;
  card.images = card.images || {};
  card.body = card.body.replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
    (m, alt, src) => {
      const id = newImgId(card);
      card.images[id] = { alt: safeImgAlt(alt), src: src.trim() };
      return '[img:' + id + ']';
    }
  );
  card.body = card.body.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (m, alt, src) => {
      const id = newImgId(card);
      card.images[id] = { alt: safeImgAlt(alt), src: src.trim() };
      return '[img:' + id + ']';
    }
  );
}

export function bodyTokensToStandardMd(card) {
  if (!card || !card.body) return (card && card.body) || '';
  if (!card.images) return card.body;
  return card.body.replace(/\[img:([a-z0-9_-]+)(?:\s+([^\]]*))?\]/gi,
    (match, id, inlineAlt) => {
      const imgData = card.images[id];
      if (!imgData) return match;
      const alt = imgData.alt || inlineAlt || '';
      return '![' + alt + '](' + imgData.src + ')';
    }
  );
}
