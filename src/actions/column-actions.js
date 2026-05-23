// src/actions/column-actions.js
// ── 컬럼 도메인 액션 + reducer ────────────────────────

import { devLog } from '../core/dev.js';
import { registerReducer } from '../core/action.js';
import { COL_COLORS } from '../core/constants.js';

export const COLUMN_CREATE       = 'COLUMN_CREATE';
export const COLUMN_RENAME       = 'COLUMN_RENAME';
export const COLUMN_DELETE       = 'COLUMN_DELETE';
export const COLUMN_COLOR_UPDATE = 'COLUMN_COLOR_UPDATE';

export function createColumn(col) {
  return {
    type: COLUMN_CREATE,
    payload: { col },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

export function renameColumn(id, title) {
  return {
    type: COLUMN_RENAME,
    payload: { id, title },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

export function deleteColumn(id) {
  return {
    type: COLUMN_DELETE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

export function updateColumnColor(id, color) {
  return {
    type: COLUMN_COLOR_UPDATE,
    payload: { id, color },
    meta: { affects: ['kanban', 'sidebar'] },
  };
}

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
        columns: state.columns.map(c => c.id === id ? Object.assign({}, c, { title }) : c),
      };
    }

    case COLUMN_DELETE: {
      const { id } = action.payload;
      return {
        ...state,
        columns: state.columns.filter(c => c.id !== id),
        cards: state.cards.filter(c => c.colId !== id),
      };
    }

    case COLUMN_COLOR_UPDATE: {
      const { id, color } = action.payload;
      return {
        ...state,
        columns: state.columns.map(c => c.id === id ? Object.assign({}, c, { color }) : c),
      };
    }

    default:
      return state;
  }
}

registerReducer(columnReducer);
devLog('BOOT', 'columnReducer registered');
