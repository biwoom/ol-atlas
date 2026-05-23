// src/core/dev.js
// ── 개발 전용 로깅 유틸 ─────────────────────────────────

const _devMode = (function() {
  try { return localStorage.getItem('ol_dev') === '1'; }
  catch(_) { return false; }
})();

export function devLog(cat, ...args) {
  if (!_devMode) return;
  console.log('[' + cat + ']', ...args);
}

export function devAssert(condition, msg) {
  if (!condition) {
    const err = new Error('[ASSERT] ' + msg);
    console.error(err);
    if (_devMode) throw err;
  }
}

export function devTime(label) {
  if (!_devMode) return { end: function(){} };
  const t0 = performance.now();
  return {
    end: function() {
      devLog('PERF', label + ': ' + (performance.now() - t0).toFixed(2) + 'ms');
    }
  };
}

export function devGroup(cat, label, fn) {
  if (!_devMode) { fn(); return; }
  console.group('[' + cat + '] ' + label);
  try { fn(); } finally { console.groupEnd(); }
}
