// src/core/storage.js
// ── localStorage 추상화 ─────────────────────────────────
// save(): store.getState() → JSON → localStorage
// load(): localStorage → JSON parse → raw state 반환 (normalize/migrate는 boot에서)

const STORAGE_KEY = 'ol_state';
const STORAGE_KEY_LEGACY = 'ol_v1'; // Phase 0 레거시 키

function storageSave() {
  const t0 = performance.now();
  const state = getState();
  if (!state) {
    devLog('STORAGE', 'save skipped: no state');
    return;
  }
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    devLog('STORAGE', 'save: ' + (json.length / 1024).toFixed(1) + ' KB in ' + (performance.now() - t0).toFixed(1) + 'ms');
  } catch(err) {
    console.error('[STORAGE] save failed:', err);
    customAlert({
      title: '저장 실패',
      message: '저장 중 오류가 발생했습니다:\n' + (err.message || String(err)),
      danger: true,
    });
    // await 불필요 — 오류 알림 후 흐름 계속
  }
}

function storageLoad() {
  const t0 = performance.now();
  try {
    // 새 키 우선, 없으면 레거시 키 시도
    let json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      json = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (json) devLog('STORAGE', 'loaded from legacy key ol_v1');
    }
    if (!json) {
      devLog('STORAGE', 'load: no existing state, returning null');
      return null;
    }
    const raw = JSON.parse(json);
    devLog('STORAGE', 'load: ' + (json.length / 1024).toFixed(1) + ' KB in ' + (performance.now() - t0).toFixed(1) + 'ms');
    return raw;
  } catch(err) {
    console.error('[STORAGE] load failed:', err);
    return null;
  }
}

// 레거시 호환: 기존 코드의 save() 호출을 그대로 지원
// Phase 1에서는 즉시 저장. Phase 2에서 dispatch 기반으로 전환 예정.
function save() {
  storageSave();
}

// 레거시 호환: 기존 코드의 load() 호출 (부팅 외 경로에서 사용 시)
function load() {
  return storageLoad();
}
