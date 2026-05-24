// src/core/schema.js
// ── schemaVersion 마이그레이션 ───────────────────────────

import { devLog, devAssert } from './dev.js';
import { ORIGIN } from './constants.js';
import { generateBookIdFromTitle } from './state.js';

const SCHEMA_CURRENT_VERSION = 8;

function _generateBookId(s) {
  const title = (s && s.meta && s.meta.title) ? s.meta.title : '';
  return generateBookIdFromTitle(title);
}

function _makeBookManifest(s) {
  const publishedAt = new Date().toISOString().slice(0, 10);
  return {
    id: _generateBookId(s),
    title: (s.meta && s.meta.title) || '',
    subtitle: '',
    author: ORIGIN.author,
    series: '',
    version: '1.0',
    publishedAt,
    cover: {
      image: null,
      backgroundColor: 'auto',
    },
    entry: {
      view: 'cover',
      actions: ['start', 'toc'],
      startTarget: 'first-card',
    },
    ordering: {
      cards: 'array-index',
    },
    display: {
      showColumns: true,
      showTags: true,
      showProgress: true,
      showBookmarks: true,
    },
    license: ORIGIN.license,
    copyright: ORIGIN.copyright,
  };
}

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
    try {
      localStorage.setItem('ol_backup_v7', JSON.stringify(s));
      devLog('MIGRATE', 'v7 backup saved to localStorage');
    } catch(e) {
      devLog('MIGRATE', 'v7 backup FAILED: ' + e.message);
    }
    if (!s.meta) s.meta = {};
    s.meta.schemaVersion = 8;
    if (!s.book || typeof s.book !== 'object') s.book = {};
    s.book.manifest = _makeBookManifest(s);
    devLog('MIGRATE', 'migrated v7 → v8, book.manifest created');
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
