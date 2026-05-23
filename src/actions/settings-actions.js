// src/actions/settings-actions.js
// ── 설정 & 메타 액션 + reducer ────────────────────────

import { devLog } from '../core/dev.js';
import { registerReducer } from '../core/action.js';

export const SETTINGS_UPDATE = 'SETTINGS_UPDATE';
export const THEME_SET       = 'THEME_SET';
export const META_UPDATE     = 'META_UPDATE';

export function updateSettings(patch) {
  return {
    type: SETTINGS_UPDATE,
    payload: { patch },
    meta: { affects: ['all'] },
  };
}

export function setTheme(theme) {
  return {
    type: THEME_SET,
    payload: { theme },
    meta: { affects: ['all'] },
  };
}

export function updateMeta(patch) {
  return {
    type: META_UPDATE,
    payload: { patch },
    meta: { affects: ['sidebar'] },
  };
}

function settingsReducer(state, action) {
  switch (action.type) {

    case SETTINGS_UPDATE: {
      const { patch } = action.payload;
      return {
        ...state,
        settings: Object.assign({}, state.settings, patch),
      };
    }

    case THEME_SET: {
      const { theme } = action.payload;
      return {
        ...state,
        settings: Object.assign({}, state.settings, { theme }),
      };
    }

    case META_UPDATE: {
      const { patch } = action.payload;
      return {
        ...state,
        meta: Object.assign({}, state.meta, patch),
      };
    }

    default:
      return state;
  }
}

registerReducer(settingsReducer);
devLog('BOOT', 'settingsReducer registered');
