// src/data/init.js
// ── 앱 부팅 시퀀스 ──────────────────────────────────────

import { devLog }                   from '../core/dev.js';
import { storageLoad, STORAGE_KEY } from '../core/storage.js';
import { makeDefault, bootState }   from '../core/state.js';
import { migrate }                  from '../core/schema.js';
import { normalizeState }           from '../core/normalize.js';
import { listViews }                from '../core/store.js';
import { installBeforeUnloadGuard } from '../core/dirty.js';
import { queueRender, flushNow }    from '../core/render-queue.js';
import { routeFromHash, switchView } from '../core/router.js';

export function boot() {
  devLog('BOOT', 'boot start');

  // 1. state 로드 + 마이그레이션 + 정규화
  let raw = storageLoad();
  if (!raw) {
    devLog('BOOT', 'no saved state, using default');
    raw = makeDefault();
  } else {
    raw = migrate(raw);
    raw = normalizeState(raw);
  }

  // 2. 내보낸 파일에 Base64 데이터가 삽입되어 있으면 우선 사용
  try {
    if (typeof __LOADED_DATA_B64__ !== 'undefined' &&
        __LOADED_DATA_B64__ &&
        __LOADED_DATA_B64__ !== '__INIT_DATA_B64__') {
      const json = decodeURIComponent(escape(atob(__LOADED_DATA_B64__)));
      const embedded = normalizeState(migrate(JSON.parse(json)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(embedded));
      raw = embedded;
      devLog('BOOT', 'loaded from embedded __LOADED_DATA_B64__');
    }
  } catch(e) {
    devLog('BOOT', 'embedded data load failed: ' + e.message);
  }

  // 3. store 초기화
  bootState(raw);
  devLog('BOOT', 'registered views: ' + listViews().join(', '));

  // 4. beforeunload 가드
  installBeforeUnloadGuard();

  // 5. hash 라우팅
  window.addEventListener('hashchange', routeFromHash);

  if (location.hash && location.hash.length > 1) {
    queueRender('__all__');
    flushNow();
    routeFromHash();
    devLog('BOOT', 'boot complete (hash route)');
    return;
  }

  // 6. 첫 렌더 (즉시 flush)
  queueRender('__all__');
  flushNow();

  // 7. 마지막 뷰 복원 or kanban
  let startView = 'kanban';
  try {
    const last = localStorage.getItem('ol_last_view');
    if (last && ['kanban','cards','list','document','about','cover-editor','cover-page'].includes(last)) {
      startView = last;
    }
  } catch(_) {}

  switchView(startView);
  devLog('BOOT', 'boot complete');
}
