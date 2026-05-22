// src/core/store.js
// ── 중앙 상태 저장소 ─────────────────────────────────────
// S는 store 내부 변수로 관리됨. 외부에서는 getState() 사용.

let _storeState = null;
const _storeSubscribers = new Map(); // viewName → renderFn

function storeInit(initialState) {
  devAssert(initialState && typeof initialState === 'object', 'storeInit: invalid state');
  _storeState = initialState;
  devLog('BOOT', 'store initialized', { cardCount: _storeState.cards ? _storeState.cards.length : 0 });
}

function getState() {
  return _storeState;
}

// reducer 결과 적용 (action.js에서만 호출)
function applyState(newState) {
  devAssert(newState && typeof newState === 'object', 'applyState: invalid state');
  _storeState = newState;
}

// view 등록
function subscribe(viewName, renderFn) {
  devAssert(typeof viewName === 'string', 'subscribe: viewName must be string');
  devAssert(typeof renderFn === 'function', 'subscribe: renderFn must be function');
  _storeSubscribers.set(viewName, renderFn);
  devLog('BOOT', 'subscribed view: ' + viewName);
}

function getSubscriber(viewName) {
  return _storeSubscribers.get(viewName);
}

function listViews() {
  return Array.from(_storeSubscribers.keys());
}
