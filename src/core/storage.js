// src/core/storage.js
// ── localStorage 추상화 ─────────────────────────────────

import { devLog } from './dev.js';
import { getState } from './store.js';
import { customAlert } from '../ui/confirm-modal.js';

export const STORAGE_KEY = 'ol_state';
const STORAGE_KEY_LEGACY = 'ol_v1';

export function storageSave() {
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
  }
}

export function storageLoad() {
  const t0 = performance.now();
  try {
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

export function save() { storageSave(); }
export function load() { return storageLoad(); }
