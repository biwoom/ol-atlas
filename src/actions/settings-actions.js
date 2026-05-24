// src/actions/settings-actions.js
// ── 설정 & 메타 액션 + reducer ────────────────────────

import { devLog } from '../core/dev.js';
import { registerReducer } from '../core/action.js';

export const SETTINGS_UPDATE = 'SETTINGS_UPDATE';
export const THEME_SET       = 'THEME_SET';
export const META_UPDATE     = 'META_UPDATE';
export const MANIFEST_UPDATE  = 'MANIFEST_UPDATE';

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

export function updateManifest(patch) {
  return {
    type: MANIFEST_UPDATE,
    payload: { patch },
    meta: { affects: ['cover-page'] },
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

    case MANIFEST_UPDATE: {
      const { patch } = action.payload;
      const currentManifest = (state.book && state.book.manifest) || {};
      return {
        ...state,
        book: Object.assign({}, state.book, {
          manifest: Object.assign({}, currentManifest, patch),
        }),
      };
    }

    default:
      return state;
  }
}

registerReducer(settingsReducer);
devLog('BOOT', 'settingsReducer registered');
