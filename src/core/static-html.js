// src/core/static-html.js
// ── STATIC HTML 캡처 ──────────────────────────────────
// 반드시 JS가 DOM을 전혀 건드리기 전 완전히 정적인 상태에서 실행.

export const __STATIC_HTML__ = document.documentElement.outerHTML;
