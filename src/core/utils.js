// src/core/utils.js
// ── 공통 유틸리티 함수 ────────────────────────────────

// ══════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════
function today() { return new Date().toISOString().slice(0,10); }
function ce(tag, cls, txt) {
  const el = document.createElement(tag||'div');
  if (cls) el.className = cls;
  if (txt !== undefined) el.textContent = txt;
  return el;
}

// ══════════════════════════════════════════════════════
//  MARKDOWN PARSER  (Phase 1)
//  외부 의존성 없이 자체 구현. 단일 패스 라인 스캐너.
//  지원: 제목(#~###), 인용(>), 코드블록(```), 구분선(---),
//        순서/비순서/체크박스 리스트, 단락, 인라인 스타일
//  XSS 방어: <script>, on* 속성, javascript: URL 차단
// ══════════════════════════════════════════════════════
function escapeHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function sanitizeURL(url) {
  const u = url.trim();
  if (/^javascript:/i.test(u)) return '#';
  return u;
}
