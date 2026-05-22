// src/core/action.js
// ── 모든 state 변경의 단일 진입점 ───────────────────────
// dispatch(action) → reducer 실행 → markDirty → queueRender

const _reducers = [];

// reducer 등록 (Phase 2에서 각 도메인 reducer가 등록됨)
function registerReducer(reducerFn) {
  devAssert(typeof reducerFn === 'function', 'registerReducer: must be function');
  _reducers.push(reducerFn);
  devLog('BOOT', 'reducer registered (total: ' + _reducers.length + ')');
}

// action에 영향받는 view 목록은 action.meta.affects로 명시.
// 미명시 시 '__all__' (전체 flush).
function dispatch(action) {
  devAssert(action && typeof action === 'object', 'dispatch: action must be object');
  devAssert(typeof action.type === 'string', 'dispatch: action.type required');

  devLog('ACTION', action.type, action.payload || {});

  const t = devTime('reduce ' + action.type);
  let state = getState();
  for (let i = 0; i < _reducers.length; i++) {
    state = _reducers[i](state, action);
  }
  applyState(state);
  t.end();

  markDirty();

  // 영향받는 view 자동 queue
  const affects = (action.meta && action.meta.affects) || ['all'];
  if (affects.includes('all')) {
    queueRender('__all__');
  } else {
    for (let i = 0; i < affects.length; i++) {
      queueRender(affects[i]);
    }
  }
}
