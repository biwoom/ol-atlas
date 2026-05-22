// src/core/static-html.js
// ── STATIC HTML 캡처 ──────────────────────────────────
// 반드시 JS가 DOM을 전혀 건드리기 전 완전히 정적인 상태에서 실행.
// 저장 시 이 원본 소스에서 데이터만 교체함.
// __STATIC_HTML__ : document.documentElement.outerHTML 스냅샷
const __STATIC_HTML__ = document.documentElement.outerHTML;
