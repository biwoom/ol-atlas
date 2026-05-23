// src/actions/view-actions.js
// ── 뷰 상태 액션 + reducer ────────────────────────────

import { devLog } from '../core/dev.js';
import { registerReducer } from '../core/action.js';

export const VIEW_CHANGE        = 'VIEW_CHANGE';
export const BOARD_WIDTH_SET    = 'BOARD_WIDTH_SET';
export const META_TOGGLE_SET    = 'META_TOGGLE_SET';
export const SIDEBAR_OPEN_SET   = 'SIDEBAR_OPEN_SET';

export function changeView(viewName) {
  return {
    type: VIEW_CHANGE,
    payload: { view: viewName },
    meta: { affects: ['all'] },
  };
}

export function setBoardWidth(width) {
  return {
    type: BOARD_WIDTH_SET,
    payload: { width },
    meta: { affects: ['kanban'] },
  };
}

export function setMetaToggle(key, value) {
  return {
    type: META_TOGGLE_SET,
    payload: { key, value },
    meta: { affects: ['kanban', 'cards'] },
  };
}

export function setSidebarOpen(open) {
  return {
    type: SIDEBAR_OPEN_SET,
    payload: { open },
    meta: { affects: ['sidebar'] },
  };
}

function viewReducer(state, action) {
  switch (action.type) {

    case BOARD_WIDTH_SET: {
      const { width } = action.payload;
      return {
        ...state,
        settings: Object.assign({}, state.settings, { boardWidth: width }),
      };
    }

    case META_TOGGLE_SET: {
      const { key, value } = action.payload;
      return {
        ...state,
        settings: Object.assign({}, state.settings, {
          metaToggles: Object.assign({}, (state.settings || {}).metaToggles, { [key]: value }),
        }),
      };
    }

    case SIDEBAR_OPEN_SET: {
      const { open } = action.payload;
      return {
        ...state,
        settings: Object.assign({}, state.settings, { sidebarOpen: !!open }),
      };
    }

    default:
      return state;
  }
}

registerReducer(viewReducer);
devLog('BOOT', 'viewReducer registered');
