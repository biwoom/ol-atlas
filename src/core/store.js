// src/core/store.js
// ── 중앙 상태 저장소 ─────────────────────────────────────

import { devLog, devAssert } from './dev.js';

let _storeState = null;
const _storeSubscribers = new Map(); // viewName → renderFn

export function storeInit(initialState) {
  devAssert(initialState && typeof initialState === 'object', 'storeInit: invalid state');
  _storeState = initialState;
  devLog('BOOT', 'store initialized', { cardCount: _storeState.cards ? _storeState.cards.length : 0 });
}

export function getState() {
  return _storeState;
}

export function applyState(newState) {
  devAssert(newState && typeof newState === 'object', 'applyState: invalid state');
  _storeState = newState;
}

export function subscribe(viewName, renderFn) {
  devAssert(typeof viewName === 'string', 'subscribe: viewName must be string');
  devAssert(typeof renderFn === 'function', 'subscribe: renderFn must be function');
  _storeSubscribers.set(viewName, renderFn);
  devLog('BOOT', 'subscribed view: ' + viewName);
}

export function getSubscriber(viewName) {
  return _storeSubscribers.get(viewName);
}

export function listViews() {
  return Array.from(_storeSubscribers.keys());
}
