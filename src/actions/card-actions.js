// src/actions/card-actions.js
// ── 카드 도메인 액션 + reducer ────────────────────────

import { devLog } from '../core/dev.js';
import { registerReducer } from '../core/action.js';
import { normalizeCard } from '../core/normalize.js';
import { titleToSlug, COL_COLORS } from '../core/constants.js';
import { today } from '../core/utils.js';

export const VALID_PRIORITIES = ['high', 'mid', 'low'];

// ── Action Types ──────────────────────────────────────
export const CARD_CREATE      = 'CARD_CREATE';
export const CARD_UPDATE      = 'CARD_UPDATE';
export const CARD_DELETE      = 'CARD_DELETE';
export const CARD_RESTORE     = 'CARD_RESTORE';
export const CARD_MOVE        = 'CARD_MOVE';
export const CARD_PURGE       = 'CARD_PURGE';
export const CARD_PURGE_ALL   = 'CARD_PURGE_ALL';
export const STATUS_SET       = 'STATUS_SET';
export const STATUS_CLEAR     = 'STATUS_CLEAR';
export const STATUS_BULK      = 'STATUS_BULK';
export const CARD_BULK_DELETE = 'CARD_BULK_DELETE';
export const CARD_BULK_GROUP  = 'CARD_BULK_GROUP';
export const CARD_BULK_COLUMN = 'CARD_BULK_COLUMN';
export const IMPORT_MERGE     = 'IMPORT_MERGE';

// ── Action Creators ───────────────────────────────────

export function createCard(card, status) {
  return {
    type: CARD_CREATE,
    payload: { card, status: status || 'wait' },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

export function updateCard(id, patch) {
  return {
    type: CARD_UPDATE,
    payload: { id, patch },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

export function deleteCard(id) {
  return {
    type: CARD_DELETE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

export function restoreCard(id) {
  return {
    type: CARD_RESTORE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar', 'trash'] },
  };
}

export function moveCard(id, toColId, insertBeforeId) {
  return {
    type: CARD_MOVE,
    payload: { id, toColId, insertBeforeId: insertBeforeId == null ? null : insertBeforeId },
    meta: { affects: ['kanban', 'sidebar'] },
  };
}

export function purgeCard(id) {
  return {
    type: CARD_PURGE,
    payload: { id },
    meta: { affects: ['trash', 'sidebar'] },
  };
}

export function purgeAllCards() {
  return {
    type: CARD_PURGE_ALL,
    payload: {},
    meta: { affects: ['trash', 'sidebar'] },
  };
}

export function setStatus(cardId, status) {
  return {
    type: STATUS_SET,
    payload: { cardId, status },
    meta: { affects: ['cards', 'list', 'docview', 'sidebar'] },
  };
}

export function clearStatus(cardId) {
  return {
    type: STATUS_CLEAR,
    payload: { cardId },
    meta: { affects: ['cards', 'list'] },
  };
}

export function setBulkStatus(ids, status) {
  return {
    type: STATUS_BULK,
    payload: { ids, status },
    meta: { affects: ['cards', 'list'] },
  };
}

export function bulkDeleteCards(ids) {
  return {
    type: CARD_BULK_DELETE,
    payload: { ids },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

export function bulkSetGroup(ids, group) {
  return {
    type: CARD_BULK_GROUP,
    payload: { ids, group },
    meta: { affects: ['cards', 'list', 'sidebar'] },
  };
}

export function bulkSetColumn(ids, colId) {
  return {
    type: CARD_BULK_COLUMN,
    payload: { ids, colId },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

export function importMerge(incoming, strategy) {
  return {
    type: IMPORT_MERGE,
    payload: { incoming, strategy },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

// ── Slug 유일성 헬퍼 (reducer 내부용) ────────────────
function _ensureUniqueSlugInState(state, slug, excludeId) {
  if (!slug) slug = 'untitled';
  const used = new Set(
    (state.cards || []).filter(c => c.id !== excludeId).map(c => c.slug)
  );
  if (!used.has(slug)) return slug;
  let n = 2;
  while (used.has(slug + '-' + n)) n++;
  return slug + '-' + n;
}

// ── Reducer ───────────────────────────────────────────
function cardReducer(state, action) {
  switch (action.type) {

    case CARD_CREATE: {
      const { card, status } = action.payload;
      const newId = state.nextCardId;
      const newCard = normalizeCard(Object.assign({}, card, { id: newId }));
      newCard.slug = _ensureUniqueSlugInState(state, newCard.slug || titleToSlug(newCard.title) || 'card', newId);
      return {
        ...state,
        cards: [...state.cards, newCard],
        nextCardId: newId + 1,
        userData: {
          ...state.userData,
          status: Object.assign({}, state.userData.status, { [newId]: status || 'wait' }),
        },
      };
    }

    case CARD_UPDATE: {
      const { id, patch } = action.payload;
      const statusVal = patch.status;
      const cardPatch = Object.assign({}, patch);
      delete cardPatch.status;

      const newCards = state.cards.map(c => {
        if (c.id !== id) return c;
        const merged = Object.assign({}, c, cardPatch);
        if (cardPatch.slug !== undefined) {
          merged.slug = _ensureUniqueSlugInState(state, cardPatch.slug || titleToSlug(merged.title) || 'card', id);
        }
        return normalizeCard(merged);
      });

      const newUserData = statusVal !== undefined
        ? Object.assign({}, state.userData, { status: Object.assign({}, state.userData.status, { [id]: statusVal }) })
        : state.userData;

      return { ...state, cards: newCards, userData: newUserData };
    }

    case CARD_DELETE: {
      const { id } = action.payload;
      const card = state.cards.find(c => c.id === id);
      if (!card) return state;
      const newStatus = Object.assign({}, state.userData.status);
      delete newStatus[id];
      return {
        ...state,
        cards: state.cards.filter(c => c.id !== id),
        trash: [Object.assign({}, card, { _trashedAt: new Date().toISOString() }), ...(state.trash || [])],
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case CARD_RESTORE: {
      const { id } = action.payload;
      const trash = state.trash || [];
      const idx = trash.findIndex(c => c.id === id);
      if (idx < 0) return state;
      const trashCard = Object.assign({}, trash[idx]);
      delete trashCard._trashedAt;
      let restoreId = trashCard.id;
      if (state.cards.find(c => c.id === restoreId)) {
        restoreId = state.nextCardId;
      }
      trashCard.id = restoreId;
      normalizeCard(trashCard);
      trashCard.slug = _ensureUniqueSlugInState(state, trashCard.slug || titleToSlug(trashCard.title) || ('card-' + trashCard.id), trashCard.id);
      const newNextCardId = restoreId >= state.nextCardId ? restoreId + 1 : state.nextCardId;
      return {
        ...state,
        cards: [...state.cards, trashCard],
        trash: trash.filter((_, i) => i !== idx),
        nextCardId: newNextCardId,
      };
    }

    case CARD_MOVE: {
      const { id, toColId, insertBeforeId } = action.payload;
      const card = state.cards.find(c => c.id === id);
      if (!card) return state;
      const movedCard = Object.assign({}, card, { colId: toColId });
      let newCards = state.cards.filter(c => c.id !== id);
      if (insertBeforeId === null || insertBeforeId === undefined) {
        let lastIdx = -1;
        for (let i = newCards.length - 1; i >= 0; i--) {
          if (newCards[i].colId === toColId) { lastIdx = i; break; }
        }
        if (lastIdx === -1) {
          newCards = [...newCards, movedCard];
        } else {
          newCards = [...newCards.slice(0, lastIdx + 1), movedCard, ...newCards.slice(lastIdx + 1)];
        }
      } else {
        const idx = newCards.findIndex(c => c.id === insertBeforeId);
        if (idx === -1) {
          newCards = [...newCards, movedCard];
        } else {
          newCards = [...newCards.slice(0, idx), movedCard, ...newCards.slice(idx)];
        }
      }
      return { ...state, cards: newCards };
    }

    case CARD_PURGE: {
      const { id } = action.payload;
      const target = (state.trash || []).find(c => c.id === id);
      const archivedAt = new Date().toISOString();
      const newActLogEntries = (target?.acts || []).map(act => ({
        ...act,
        cardId: target.id,
        cardTitle: target.title || '(제목 없음)',
        archivedAt,
      }));
      const actLog = [...(state.meta.actLog || []), ...newActLogEntries].slice(-1000);
      return {
        ...state,
        meta: { ...state.meta, actLog },
        trash: (state.trash || []).filter(c => c.id !== id),
      };
    }

    case CARD_PURGE_ALL: {
      const archivedAt = new Date().toISOString();
      const newActLogEntries = (state.trash || []).flatMap(card =>
        (card.acts || []).map(act => ({
          ...act,
          cardId: card.id,
          cardTitle: card.title || '(제목 없음)',
          archivedAt,
        }))
      );
      const actLog = [...(state.meta.actLog || []), ...newActLogEntries].slice(-1000);
      return {
        ...state,
        meta: { ...state.meta, actLog },
        trash: [],
      };
    }

    case STATUS_SET: {
      const { cardId, status } = action.payload;
      return {
        ...state,
        userData: {
          ...state.userData,
          status: Object.assign({}, state.userData.status, { [cardId]: status }),
        },
      };
    }

    case STATUS_CLEAR: {
      const { cardId } = action.payload;
      const newStatus = Object.assign({}, state.userData.status);
      delete newStatus[cardId];
      return {
        ...state,
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case STATUS_BULK: {
      const { ids, status } = action.payload;
      const newStatus = Object.assign({}, state.userData.status);
      ids.forEach(id => { newStatus[id] = status; });
      return {
        ...state,
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case CARD_BULK_DELETE: {
      const { ids } = action.payload;
      const idSet = new Set(ids.map(Number));
      const now = new Date().toISOString();
      const toTrash = state.cards
        .filter(c => idSet.has(c.id))
        .map(c => Object.assign({}, c, { _trashedAt: now }));
      const newStatus = {};
      Object.keys(state.userData.status || {}).forEach(k => {
        if (!idSet.has(Number(k))) newStatus[k] = state.userData.status[k];
      });
      return {
        ...state,
        cards: state.cards.filter(c => !idSet.has(c.id)),
        trash: [...toTrash, ...(state.trash || [])],
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case CARD_BULK_GROUP: {
      const { ids, group } = action.payload;
      const idSet = new Set(ids.map(Number));
      return {
        ...state,
        cards: state.cards.map(c => idSet.has(c.id) ? Object.assign({}, c, { group }) : c),
      };
    }

    case CARD_BULK_COLUMN: {
      const { ids, colId } = action.payload;
      const idSet = new Set(ids.map(Number));
      return {
        ...state,
        cards: state.cards.map(c => idSet.has(c.id) ? Object.assign({}, c, { colId }) : c),
      };
    }

    case IMPORT_MERGE: {
      const { incoming, strategy } = action.payload;
      let ns = { ...state };
      const nameToId = {};
      (ns.columns || []).forEach(col => { nameToId[col.title] = col.id; });

      const existingIds = new Set((ns.cards || []).map(c => c.id));
      const existingTitleCol = new Set(
        (ns.cards || []).map(c => c.title + '\x00' + (c.colId || ''))
      );

      incoming.forEach(card => {
        const colName = card.column || card.status || '';
        let colId = nameToId[colName];
        if (!colId && colName) {
          colId = ns.nextColId;
          const newCol = { id: colId, title: colName, color: COL_COLORS[Math.floor(Math.random() * COL_COLORS.length)] };
          ns = Object.assign({}, ns, {
            columns: [...(ns.columns || []), newCol],
            nextColId: ns.nextColId + 1,
          });
          nameToId[colName] = colId;
        }
        if (!colId) colId = (ns.columns[0] || {}).id || null;

        const idDup    = card.id && existingIds.has(card.id);
        const titleKey = (card.title || '') + '\x00' + (colId || '');
        const titleDup = !idDup && existingTitleCol.has(titleKey);
        const isDup    = idDup || titleDup;

        const makeCard = id => normalizeCard({
          id,
          colId,
          title:    card.title    || '',
          body:     card.bodyMd   || card.body || '',
          group:    card.group    || '',
          tags:     Array.isArray(card.tags) ? card.tags : [],
          priority: VALID_PRIORITIES.includes(card.priority) ? card.priority : 'mid',
          created:  card.created  || card.createdAt || today(),
          images:   (card.images && typeof card.images === 'object') ? card.images : {},
          slug:     card.slug     || '',
        });

        const _setLearnStatus = (id, ls) => {
          if (ls && ['wait', 'doing', 'done'].includes(ls)) {
            ns = Object.assign({}, ns, {
              userData: Object.assign({}, ns.userData, {
                status: Object.assign({}, ns.userData.status, { [id]: ls }),
              }),
            });
          }
        };

        if (!isDup) {
          const incomingIdNum = typeof card.id === 'number' ? card.id
            : (Number.isFinite(parseInt(card.id, 10)) ? parseInt(card.id, 10) : null);
          const newId = (incomingIdNum && !existingIds.has(incomingIdNum)) ? incomingIdNum : ns.nextCardId;
          const newNextId = Math.max(ns.nextCardId, newId + 1);
          const newCard = makeCard(newId);
          ns = Object.assign({}, ns, {
            cards: [...ns.cards, newCard],
            nextCardId: newNextId,
          });
          _setLearnStatus(newId, card.learnStatus);
          existingIds.add(newId);
          existingTitleCol.add(titleKey);
        } else if (strategy === 'skip') {
          // 아무것도 안 함
        } else if (strategy === 'overwrite') {
          if (idDup) {
            const idx = ns.cards.findIndex(c => c.id === card.id);
            if (idx >= 0) {
              const newCards = ns.cards.slice();
              newCards[idx] = makeCard(card.id);
              ns = Object.assign({}, ns, { cards: newCards });
              _setLearnStatus(card.id, card.learnStatus);
            }
          } else {
            const idx = ns.cards.findIndex(c => c.title + '\x00' + (c.colId || '') === titleKey);
            if (idx >= 0) {
              const targetId = ns.cards[idx].id;
              const newCards = ns.cards.slice();
              newCards[idx] = makeCard(targetId);
              ns = Object.assign({}, ns, { cards: newCards });
              _setLearnStatus(targetId, card.learnStatus);
            }
          }
        } else if (strategy === 'keepboth') {
          const newId = ns.nextCardId;
          const newCard = makeCard(newId);
          ns = Object.assign({}, ns, {
            cards: [...ns.cards, newCard],
            nextCardId: newId + 1,
          });
          _setLearnStatus(newId, card.learnStatus);
          existingIds.add(newId);
        }
      });

      return ns;
    }

    default:
      return state;
  }
}

registerReducer(cardReducer);
devLog('BOOT', 'cardReducer registered');
