// src/actions/column-actions.js
// ── 컬럼 도메인 액션 + reducer ────────────────────────

// ── Action Types ──────────────────────────────────────
const COLUMN_CREATE       = 'COLUMN_CREATE';
const COLUMN_RENAME       = 'COLUMN_RENAME';
const COLUMN_DELETE       = 'COLUMN_DELETE';
const COLUMN_COLOR_UPDATE = 'COLUMN_COLOR_UPDATE';

// ── Action Creators ───────────────────────────────────

function createColumn(col) {
  return {
    type: COLUMN_CREATE,
    payload: { col },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

function renameColumn(id, title) {
  return {
    type: COLUMN_RENAME,
    payload: { id, title },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

// v0.6: 컬럼 삭제 시 해당 컬럼의 카드도 모두 삭제 (휴지통 이동 아님)
function deleteColumn(id) {
  return {
    type: COLUMN_DELETE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

function updateColumnColor(id, color) {
  return {
    type: COLUMN_COLOR_UPDATE,
    payload: { id, color },
    meta: { affects: ['kanban', 'sidebar'] },
  };
}

// ── Reducer ───────────────────────────────────────────
function columnReducer(state, action) {
  switch (action.type) {

    case COLUMN_CREATE: {
      const { col } = action.payload;
      const newId = state.nextColId;
      const newCol = Object.assign({ id: newId, title: '새 컬럼', color: COL_COLORS[0] }, col, { id: newId });
      return {
        ...state,
        columns: [...state.columns, newCol],
        nextColId: newId + 1,
      };
    }

    case COLUMN_RENAME: {
      const { id, title } = action.payload;
      return {
        ...state,
        columns: state.columns.map(function(c) {
          return c.id === id ? Object.assign({}, c, { title }) : c;
        }),
      };
    }

    case COLUMN_DELETE: {
      const { id } = action.payload;
      // v0.6: 해당 컬럼의 카드 즉시 삭제 (휴지통 이동 아님)
      return {
        ...state,
        columns: state.columns.filter(function(c) { return c.id !== id; }),
        cards: state.cards.filter(function(c) { return c.colId !== id; }),
      };
    }

    case COLUMN_COLOR_UPDATE: {
      const { id, color } = action.payload;
      return {
        ...state,
        columns: state.columns.map(function(c) {
          return c.id === id ? Object.assign({}, c, { color }) : c;
        }),
      };
    }

    default:
      return state;
  }
}

registerReducer(columnReducer);
devLog('BOOT', 'columnReducer registered');
