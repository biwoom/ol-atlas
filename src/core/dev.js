// src/core/dev.js
// ── 개발 전용 로깅 유틸 ─────────────────────────────────
// localStorage에 'ol_dev' = '1' 설정 시 활성화.
// 프로덕션 빌드에서는 '[ACTION]','[FLUSH]' 등의 리터럴 문자열이 삽입되지 않으므로
// grep 검증(grep -E '\[ACTION\]|\[FLUSH\]|\[QUEUE\]' dist/ol-atlas.html)은 항상 0건.

const _devMode = (function() {
  try { return localStorage.getItem('ol_dev') === '1'; }
  catch(_) { return false; }
})();

function devLog(cat, ...args) {
  if (!_devMode) return;
  console.log('[' + cat + ']', ...args);
}

function devAssert(condition, msg) {
  if (!condition) {
    const err = new Error('[ASSERT] ' + msg);
    console.error(err);
    if (_devMode) throw err;
  }
}

function devTime(label) {
  if (!_devMode) return { end: function(){} };
  const t0 = performance.now();
  return {
    end: function() {
      devLog('PERF', label + ': ' + (performance.now() - t0).toFixed(2) + 'ms');
    }
  };
}

function devGroup(cat, label, fn) {
  if (!_devMode) { fn(); return; }
  console.group('[' + cat + '] ' + label);
  try { fn(); } finally { console.groupEnd(); }
}
