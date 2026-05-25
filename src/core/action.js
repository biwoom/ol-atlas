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

const _CARD_ACT_TYPES = { CARD_CREATE: 'create', CARD_UPDATE: 'update', CARD_DELETE: 'delete', CARD_BULK_DELETE: 'delete', CARD_RESTORE: 'restore' };

function _withCardActs(prevState, nextState, action) {
  const actType = _CARD_ACT_TYPES[action.type];
  if (!actType) return nextState;
  const editorId = nextState.meta.currentEditorId;
  if (!editorId) return nextState;

  const now = new Date().toISOString();
  const addAct = card => {
    const acts = [...(card.acts || []), { at: now, editorId, type: actType }].slice(-50);
    return { ...card, acts };
  };

  if (action.type === 'CARD_CREATE') {
    const newId = prevState.nextCardId;
    return { ...nextState, cards: nextState.cards.map(c => c.id === newId ? addAct(c) : c) };
  }
  if (action.type === 'CARD_UPDATE') {
    const { id } = action.payload;
    return { ...nextState, cards: nextState.cards.map(c => c.id === id ? addAct(c) : c) };
  }
  if (action.type === 'CARD_DELETE') {
    const { id } = action.payload;
    return { ...nextState, trash: (nextState.trash || []).map(c => c.id === id ? addAct(c) : c) };
  }
  if (action.type === 'CARD_BULK_DELETE') {
    const idSet = new Set(action.payload.ids || []);
    return { ...nextState, trash: (nextState.trash || []).map(c => idSet.has(c.id) ? addAct(c) : c) };
  }
  if (action.type === 'CARD_RESTORE') {
    const { id } = action.payload;
    const restored = nextState.cards.find(c => c.id === id)
      ?? nextState.cards.find(c => c.id === nextState.nextCardId - 1);
    if (!restored) return nextState;
    return { ...nextState, cards: nextState.cards.map(c => c.id === restored.id ? addAct(c) : c) };
  }
  return nextState;
}

export function dispatch(action) {
  devAssert(action && typeof action === 'object', 'dispatch: action must be object');
  devAssert(typeof action.type === 'string', 'dispatch: action.type required');

  devLog('ACTION', action.type, action.payload || {});

  const t = devTime('reduce ' + action.type);
  const prevState = getState();
  let state = prevState;
  for (let i = 0; i < _reducers.length; i++) {
    state = _reducers[i](state, action);
  }
  state = _withCardActs(prevState, state, action);
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
