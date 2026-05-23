// src/core/body-helpers.js
// ── 본문 헬퍼 ────────────────────────────────────────

import { stripMarkdown } from './markdown.js';

export function cardPreviewText(card) {
  return stripMarkdown(card && card.body || '');
}

export function cardSearchText(card) {
  return card ? (card.body || '') : '';
}
