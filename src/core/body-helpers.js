// src/core/body-helpers.js
// ── 본문 헬퍼 — 마크다운 단일 모드 ──────────────────

function cardPreviewText(card) {
  return stripMarkdown(card && card.body || '');
}

function cardSearchText(card) {
  return card ? (card.body || '') : '';
}
