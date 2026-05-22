// src/actions/view-actions.js
// ── 뷰 상태 액션 + reducer ────────────────────────────
// Phase 2: currentView/prefixFilter 등은 모듈 전역 변수로 S 외부에 있음.
// S 안의 settings(sidebarOpen, boardWidth 등)는 Phase 3+ UI에서 활성화.
// Phase 2에서는 reducer stub만 등록.

// ── Action Types ──────────────────────────────────────
const VIEW_CHANGE        = 'VIEW_CHANGE';
const BOARD_WIDTH_SET    = 'BOARD_WIDTH_SET';
const META_TOGGLE_SET    = 'META_TOGGLE_SET';
const SIDEBAR_OPEN_SET   = 'SIDEBAR_OPEN_SET';

// ── Action Creators ───────────────────────────────────

function changeView(viewName) {
  return {
    type: VIEW_CHANGE,
    payload: { view: viewName },
    meta: { affects: ['all'] },
  };
}

function setBoardWidth(width) {
  return {
    type: BOARD_WIDTH_SET,
    payload: { width },
    meta: { affects: ['kanban'] },
  };
}

function setMetaToggle(key, value) {
  return {
    type: META_TOGGLE_SET,
    payload: { key, value },
    meta: { affects: ['kanban', 'cards'] },
  };
}

function setSidebarOpen(open) {
  return {
    type: SIDEBAR_OPEN_SET,
    payload: { open },
    meta: { affects: ['sidebar'] },
  };
}

// ── Reducer ───────────────────────────────────────────
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
