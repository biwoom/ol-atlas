// src/core/utils.js
// ── 공통 유틸리티 함수 ────────────────────────────────

export function today() { return new Date().toISOString().slice(0, 10); }

export function ce(tag, cls, txt) {
  const el = document.createElement(tag || 'div');
  if (cls) el.className = cls;
  if (txt !== undefined) el.textContent = txt;
  return el;
}

export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeURL(url) {
  const u = url.trim();
  if (/^javascript:/i.test(u)) return '#';
  return u;
}

export function dlBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

let _toastTm;
const _TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
};

function _inferToastVariant(msg) {
  const m = String(msg);
  if (/실패|오류|불가|읽을 수 없|에러/.test(m)) return 'error';
  if (/입력해주세요|확인해주세요|필요|주의/.test(m)) return 'warning';
  if (/환영|시작/.test(m)) return 'info';
  return 'success';
}

export function toast(msg, variant) {
  const t = document.getElementById('toast');
  if (!t) return;
  const v = variant || _inferToastVariant(msg);
  t.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info');
  t.classList.add('toast-' + v);
  t.innerHTML =
    '<span class="toast-ico">' + (_TOAST_ICONS[v] || _TOAST_ICONS.success) + '</span>' +
    '<span class="toast-msg"></span>';
  t.querySelector('.toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTm);
  _toastTm = setTimeout(() => t.classList.remove('show'), 2400);
}
