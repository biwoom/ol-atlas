// src/core/action.js
// ── 모든 state 변경의 단일 진입점 ───────────────────────

import { devLog, devAssert, devTime } from './dev.js';
import { getState, applyState } from './store.js';
import { markDirty } from './dirty.js';
import { queueRender } from './render-queue.js';

const _reducers = [];

export function registerReducer(reducerFn) {
  devAssert(typeof reducerFn === 'function', 'registerReducer: must be function');
  _reducers.push(reducerFn);
  devLog('BOOT', 'reducer registered (total: ' + _reducers.length + ')');
}

export function dispatch(action) {
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

  const affects = (action.meta && action.meta.affects) || ['all'];
  if (affects.includes('all')) {
    queueRender('__all__');
  } else {
    for (let i = 0; i < affects.length; i++) {
      queueRender(affects[i]);
    }
  }
}
