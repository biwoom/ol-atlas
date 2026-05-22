// src/actions/card-actions.js
// ── 카드 도메인 액션 + reducer ────────────────────────

// ── Action Types ──────────────────────────────────────
const CARD_CREATE      = 'CARD_CREATE';
const CARD_UPDATE      = 'CARD_UPDATE';
const CARD_DELETE      = 'CARD_DELETE';     // 휴지통으로
const CARD_RESTORE     = 'CARD_RESTORE';    // 휴지통에서 복원
const CARD_MOVE        = 'CARD_MOVE';       // 드래그&드롭 (colId + 위치 변경)
const CARD_PURGE       = 'CARD_PURGE';      // 휴지통에서 영구 삭제
const CARD_PURGE_ALL   = 'CARD_PURGE_ALL';  // 휴지통 전체 비우기
const STATUS_SET       = 'STATUS_SET';
const STATUS_CLEAR     = 'STATUS_CLEAR';
const STATUS_BULK      = 'STATUS_BULK';
const CARD_BULK_DELETE = 'CARD_BULK_DELETE';
const CARD_BULK_GROUP  = 'CARD_BULK_GROUP';
const CARD_BULK_COLUMN = 'CARD_BULK_COLUMN';
const IMPORT_MERGE     = 'IMPORT_MERGE';

// ── Action Creators ───────────────────────────────────

function createCard(card, status) {
  return {
    type: CARD_CREATE,
    payload: { card, status: status || 'wait' },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

function updateCard(id, patch) {
  return {
    type: CARD_UPDATE,
    payload: { id, patch },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

function deleteCard(id) {
  return {
    type: CARD_DELETE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

function restoreCard(id) {
  return {
    type: CARD_RESTORE,
    payload: { id },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar', 'trash'] },
  };
}

// insertBeforeId: 이 카드 앞에 삽입. null이면 컬럼 마지막에 추가.
function moveCard(id, toColId, insertBeforeId) {
  return {
    type: CARD_MOVE,
    payload: { id, toColId, insertBeforeId: insertBeforeId == null ? null : insertBeforeId },
    meta: { affects: ['kanban', 'sidebar'] },
  };
}

function purgeCard(id) {
  return {
    type: CARD_PURGE,
    payload: { id },
    meta: { affects: ['trash', 'sidebar'] },
  };
}

function purgeAllCards() {
  return {
    type: CARD_PURGE_ALL,
    payload: {},
    meta: { affects: ['trash', 'sidebar'] },
  };
}

function setStatus(cardId, status) {
  return {
    type: STATUS_SET,
    payload: { cardId, status },
    meta: { affects: ['cards', 'list', 'docview', 'sidebar'] },
  };
}

function clearStatus(cardId) {
  return {
    type: STATUS_CLEAR,
    payload: { cardId },
    meta: { affects: ['cards', 'list'] },
  };
}

function setBulkStatus(ids, status) {
  return {
    type: STATUS_BULK,
    payload: { ids, status },
    meta: { affects: ['cards', 'list'] },
  };
}

function bulkDeleteCards(ids) {
  return {
    type: CARD_BULK_DELETE,
    payload: { ids },
    meta: { affects: ['kanban', 'cards', 'list', 'docview', 'sidebar'] },
  };
}

function bulkSetGroup(ids, group) {
  return {
    type: CARD_BULK_GROUP,
    payload: { ids, group },
    meta: { affects: ['cards', 'list', 'sidebar'] },
  };
}

function bulkSetColumn(ids, colId) {
  return {
    type: CARD_BULK_COLUMN,
    payload: { ids, colId },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

function importMerge(incoming, strategy) {
  return {
    type: IMPORT_MERGE,
    payload: { incoming, strategy },
    meta: { affects: ['kanban', 'cards', 'list', 'sidebar'] },
  };
}

// ── Slug 유일성 헬퍼 (reducer 내부용, S 접근 금지) ────
function _ensureUniqueSlugInState(state, slug, excludeId) {
  if (!slug) slug = 'untitled';
  const used = new Set(
    (state.cards || []).filter(function(c) { return c.id !== excludeId; }).map(function(c) { return c.slug; })
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
      // status는 userData로 분리
      const statusVal = patch.status;
      const cardPatch = Object.assign({}, patch);
      delete cardPatch.status;

      const newCards = state.cards.map(function(c) {
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
      const card = state.cards.find(function(c) { return c.id === id; });
      if (!card) return state;
      const newStatus = Object.assign({}, state.userData.status);
      delete newStatus[id];
      return {
        ...state,
        cards: state.cards.filter(function(c) { return c.id !== id; }),
        trash: [Object.assign({}, card, { _trashedAt: new Date().toISOString() }), ...(state.trash || [])],
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case CARD_RESTORE: {
      const { id } = action.payload;
      const trash = state.trash || [];
      const idx = trash.findIndex(function(c) { return c.id === id; });
      if (idx < 0) return state;
      const trashCard = Object.assign({}, trash[idx]);
      delete trashCard._trashedAt;
      // ID 충돌 방지
      let restoreId = trashCard.id;
      if (state.cards.find(function(c) { return c.id === restoreId; })) {
        restoreId = state.nextCardId;
      }
      trashCard.id = restoreId;
      normalizeCard(trashCard);
      trashCard.slug = _ensureUniqueSlugInState(state, trashCard.slug || titleToSlug(trashCard.title) || ('card-' + trashCard.id), trashCard.id);
      const newNextCardId = restoreId >= state.nextCardId ? restoreId + 1 : state.nextCardId;
      return {
        ...state,
        cards: [...state.cards, trashCard],
        trash: trash.filter(function(_, i) { return i !== idx; }),
        nextCardId: newNextCardId,
      };
    }

    case CARD_MOVE: {
      // v0.6 onDrop 로직과 1:1 대응
      const { id, toColId, insertBeforeId } = action.payload;
      const card = state.cards.find(function(c) { return c.id === id; });
      if (!card) return state;
      const movedCard = Object.assign({}, card, { colId: toColId });
      let newCards = state.cards.filter(function(c) { return c.id !== id; });
      if (insertBeforeId === null || insertBeforeId === undefined) {
        // 컬럼 마지막에 추가 (v0.6: 해당 컬럼 마지막 카드 다음)
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
        const idx = newCards.findIndex(function(c) { return c.id === insertBeforeId; });
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
      return {
        ...state,
        trash: (state.trash || []).filter(function(c) { return c.id !== id; }),
      };
    }

    case CARD_PURGE_ALL: {
      return { ...state, trash: [] };
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
      ids.forEach(function(id) { newStatus[id] = status; });
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
        .filter(function(c) { return idSet.has(c.id); })
        .map(function(c) { return Object.assign({}, c, { _trashedAt: now }); });
      const newStatus = {};
      Object.keys(state.userData.status || {}).forEach(function(k) {
        if (!idSet.has(Number(k))) newStatus[k] = state.userData.status[k];
      });
      return {
        ...state,
        cards: state.cards.filter(function(c) { return !idSet.has(c.id); }),
        trash: [...toTrash, ...(state.trash || [])],
        userData: Object.assign({}, state.userData, { status: newStatus }),
      };
    }

    case CARD_BULK_GROUP: {
      const { ids, group } = action.payload;
      const idSet = new Set(ids.map(Number));
      return {
        ...state,
        cards: state.cards.map(function(c) {
          return idSet.has(c.id) ? Object.assign({}, c, { group }) : c;
        }),
      };
    }

    case CARD_BULK_COLUMN: {
      const { ids, colId } = action.payload;
      const idSet = new Set(ids.map(Number));
      return {
        ...state,
        cards: state.cards.map(function(c) {
          return idSet.has(c.id) ? Object.assign({}, c, { colId }) : c;
        }),
      };
    }

    case IMPORT_MERGE: {
      const { incoming, strategy } = action.payload;
      let ns = { ...state };
      const nameToId = {};
      (ns.columns || []).forEach(function(col) { nameToId[col.title] = col.id; });

      const existingIds = new Set((ns.cards || []).map(function(c) { return c.id; }));
      const existingTitleCol = new Set(
        (ns.cards || []).map(function(c) { return c.title + '\x00' + (c.colId || ''); })
      );

      incoming.forEach(function(card) {
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

        const makeCard = function(id) {
          return normalizeCard({
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
        };

        const _setLearnStatus = function(id, ls) {
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
            const idx = ns.cards.findIndex(function(c) { return c.id === card.id; });
            if (idx >= 0) {
              const newCards = ns.cards.slice();
              newCards[idx] = makeCard(card.id);
              ns = Object.assign({}, ns, { cards: newCards });
              _setLearnStatus(card.id, card.learnStatus);
            }
          } else {
            const idx = ns.cards.findIndex(function(c) {
              return c.title + '\x00' + (c.colId || '') === titleKey;
            });
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
