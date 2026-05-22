// src/actions/settings-actions.js
// ── 설정 & 메타 액션 + reducer ────────────────────────

// ── Action Types ──────────────────────────────────────
const SETTINGS_UPDATE = 'SETTINGS_UPDATE';
const THEME_SET       = 'THEME_SET';
const META_UPDATE     = 'META_UPDATE';

// ── Action Creators ───────────────────────────────────

function updateSettings(patch) {
  return {
    type: SETTINGS_UPDATE,
    payload: { patch },
    meta: { affects: ['all'] },
  };
}

function setTheme(theme) {
  return {
    type: THEME_SET,
    payload: { theme },
    meta: { affects: ['all'] },
  };
}

// S.meta.title / S.meta.version 업데이트 (about 뷰에서 사용)
function updateMeta(patch) {
  return {
    type: META_UPDATE,
    payload: { patch },
    meta: { affects: ['sidebar'] },
  };
}

// ── Reducer ───────────────────────────────────────────
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
