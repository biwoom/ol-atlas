// src/core/schema.js
// ── schemaVersion 마이그레이션 ───────────────────────────

import { devLog, devAssert } from './dev.js';

const SCHEMA_CURRENT_VERSION = 10;

const _schemaMigrators = {
  6: function(s) {
    devLog('MIGRATE', 'v6 → v7');
    if (!s.meta) s.meta = {};
    s.meta.schemaVersion = 7;
    s.meta.dirty = false;
    s.meta.lastSavedAt = null;

    s.settings = s.settings || {
      theme: (function(){ try { return localStorage.getItem('ol_theme') || 'system'; } catch(_){ return 'system'; } })(),
      locale: 'ko',
      sidebarOpen: false,
      boardWidth: 'NORMAL',
      metaToggles: { title: true, body: true, tags: true },
      activeTabId: 'board',
    };
    return s;
  },

  7: function(s) {
    devLog('MIGRATE', 'v7 → v8');
    if (!s.meta) s.meta = {};
    s.meta.schemaVersion = 8;

    if (!Array.isArray(s.meta.editors))   s.meta.editors  = [];
    if (!Array.isArray(s.meta.saveLog))   s.meta.saveLog  = [];
    if (s.meta.currentEditorId === undefined) s.meta.currentEditorId = null;

    (s.cards || []).forEach(card => {
      if (!Array.isArray(card.acts)) card.acts = [];
    });

    return s;
  },

  8: function(s) {
    devLog('MIGRATE', 'v8 → v9');
    if (!s.meta) s.meta = {};
    s.meta.schemaVersion = 9;
    if (!Array.isArray(s.meta.actLog)) s.meta.actLog = [];
    return s;
  },

  9: function(s) {
    devLog('MIGRATE', 'v9 → v10');
    if (!s.meta) s.meta = {};
    s.meta.schemaVersion = 10;
    if (!s.meta.bookInfo || typeof s.meta.bookInfo !== 'object') s.meta.bookInfo = {};
    const bi = s.meta.bookInfo;
    const biDefaults = {
      bookTitle: '', subtitle: '', author: '', translator: '',
      publisher: '', publishedAt: '', revisedAt: '', bookVersion: '',
      description: '', coverColor: '', language: 'ko', isbn: '',
    };
    Object.keys(biDefaults).forEach(k => {
      if (typeof bi[k] === 'undefined') bi[k] = biDefaults[k];
    });
    return s;
  },
};

export function migrate(state) {
  if (!state) return state;
  if (!state.meta) state.meta = { schemaVersion: 6 };

  let v = state.meta.schemaVersion || 6;
  devLog('MIGRATE', 'current version: ' + v + ', target: ' + SCHEMA_CURRENT_VERSION);

  if (v === SCHEMA_CURRENT_VERSION) {
    devLog('MIGRATE', 'no migration needed');
    return state;
  }

  if (v === 6) {
    try {
      localStorage.setItem('ol_backup_v6', JSON.stringify(state));
      devLog('MIGRATE', 'v6 backup saved to localStorage');
    } catch(e) {
      devLog('MIGRATE', 'v6 backup FAILED: ' + e.message);
    }
  }

  while (v < SCHEMA_CURRENT_VERSION) {
    const fn = _schemaMigrators[v];
    devAssert(!!fn, 'no migrator for v' + v);
    state = fn(state);
    v++;
  }

  devLog('MIGRATE', 'migration complete: v' + v);
  return state;
}

export function getSchemaVersion() {
  return SCHEMA_CURRENT_VERSION;
}
