// src/core/schema.js
// ── schemaVersion 마이그레이션 ───────────────────────────
// v6 → v7: meta.dirty, meta.lastSavedAt, settings 추가.

const SCHEMA_CURRENT_VERSION = 7;

const _schemaMigrators = {
  // v6 → v7
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
};

function migrate(state) {
  if (!state) return state;
  if (!state.meta) state.meta = { schemaVersion: 6 };

  let v = state.meta.schemaVersion || 6;
  devLog('MIGRATE', 'current version: ' + v + ', target: ' + SCHEMA_CURRENT_VERSION);

  if (v === SCHEMA_CURRENT_VERSION) {
    devLog('MIGRATE', 'no migration needed');
    return state;
  }

  // v6 백업 (안전망)
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

function getSchemaVersion() {
  return SCHEMA_CURRENT_VERSION;
}
