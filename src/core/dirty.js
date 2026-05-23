// src/core/dirty.js
// ── Dirty State + autosave + beforeunload 경고 ──────────

let _autosaveTimer = null;
const AUTOSAVE_DEBOUNCE_MS = 1000;

function markDirty() {
  const s = getState();
  if (!s) return;
  if (!s.meta) s.meta = {};
  if (!s.meta.dirty) {
    s.meta.dirty = true;
    devLog('DIRTY', 'state marked dirty');
  }
  _scheduleAutosave();
  queueRender('dirty-indicator');
}

function markClean() {
  const s = getState();
  if (!s) return;
  if (!s.meta) s.meta = {};
  s.meta.dirty = false;
  s.meta.lastSavedAt = new Date().toISOString();
  devLog('DIRTY', 'state marked clean', s.meta.lastSavedAt);
  queueRender('dirty-indicator');
}

function _scheduleAutosave() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(function() {
    devLog('DIRTY', 'autosave triggered');
    storageSave();
    markClean();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function isDirty() {
  const s = getState();
  return !!(s && s.meta && s.meta.dirty);
}

function installBeforeUnloadGuard() {
  window.addEventListener('beforeunload', function(e) {
    if (isDirty()) {
      const msg = '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    }
  });
  devLog('BOOT', 'beforeunload guard installed');
}
