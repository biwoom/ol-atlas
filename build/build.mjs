/**
 * build/build.mjs
 * OL ATLAS v0.7 — JS 빌드 스크립트
 *
 * 역할:
 *   1. JS 소스 파일을 정해진 순서대로 읽어 단일 문자열로 연결
 *   2. esbuild transform API로 변환 (minify 또는 dev 모드)
 *   3. dist/bundle.js 출력
 *   4. inline.mjs를 호출해 최종 dist/ol-atlas.html 생성
 *
 * 사용:
 *   node build/build.mjs          # 프로덕션 (minify)
 *   node build/build.mjs --dev    # 개발 (포맷 유지)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transform } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const isDev = process.argv.includes('--dev');

// ── JS 파일 연결 순서 ─────────────────────────────────
// 이 순서는 v0.6 소스의 섹션 순서와 정확히 일치해야 합니다.
// static-html.js 는 __STATIC_HTML__ 캡처를 위해 반드시 첫 번째.
const JS_FILES = [
  // Phase 1: 신규 코어 런타임 모듈 (DOM 조작 없음, 순서 중요)
  'core/dev.js',           //  0. devLog, devAssert, devTime, devGroup
  'core/store.js',         //  1. storeInit, getState, applyState, subscribe, listViews
  'core/render-queue.js',  //  2. queueRender, flushNow (store 의존)
  'core/schema.js',        //  3. migrate, getSchemaVersion (dev 의존)
  'core/storage.js',       //  4. storageSave, storageLoad, save, load (store+dev 의존)
  'core/dirty.js',         //  5. markDirty, markClean, isDirty, installBeforeUnloadGuard
  'components/shared/confirm-modal.js',   //  5a. customConfirm, customAlert (다른 컴포넌트보다 먼저)
  'components/shared/dirty-indicator.js', //  5b. renderDirtyIndicator (dirty.js 뒤)
  'core/action.js',        //  6. dispatch, registerReducer (store+dirty+render-queue 의존)

  // core (순서 중요)
  'core/static-html.js',       //  7. __STATIC_HTML__ 캡처 (DOM 조작 전)
  'core/tag-parser.js',        //  8. prefix 태그 파싱 유틸
  'ui/custom-select.js',       //  9. 커스텀 드롭다운 (Portal)
  'core/constants.js',         // 10. ORIGIN, OL_PROJECTS, COL_COLORS, 헬퍼
  'core/state.js',             // 11. S Proxy 어댑터, makeDefault, bootState
  'core/utils.js',             // 12. 공통 유틸 (genId, escHtml, fmtDate 등)
  'core/markdown.js',          // 13. 마크다운 파서
  'core/body-helpers.js',      // 14. cardPreviewText, stripMarkdown
  'core/normalize.js',         // 15. 상태 정규화
  // Phase 2: 도메인 액션 + reducer (normalize.js 다음, history.js 전에 등록)
  'actions/card-actions.js',       // 16. 카드 액션 + cardReducer
  'actions/column-actions.js',     // 17. 컬럼 액션 + columnReducer
  'actions/view-actions.js',       // 18. 뷰 상태 액션 + viewReducer
  'actions/settings-actions.js',   // 19. 설정 액션 + settingsReducer
  'core/history.js',           // 20. Undo/Redo
  'core/router.js',            // 21. 뷰 라우터 + URL hash
  // components (각 파일 말미에 subscribe 호출 추가됨)
  'components/docview.js',     // 18. 문서뷰
  'components/toc.js',         // 19. TOC + 트리 사이드바
  'components/docview-inline.js', // 20. 문서뷰 인라인 편집
  'components/about.js',       // 21. About + 휴지통 뷰
  'components/home.js',        // 22. 홈 화면
  'components/sidebar.js',     // 23. 사이드바
  'components/kanban.js',      // 24. 칸반 보드
  'components/bulk-select.js', // 25. 다중 선택 + 일괄 작업
  'components/cardgrid.js',    // 26. 카드 그리드 뷰
  'components/listview.js',    // 27. 리스트 뷰
  'components/card-modal.js',  // 28. 카드 모달
  'components/md-editor.js',   // 29. 마크다운 에디터
  'components/color-picker.js',// 30. 컬러 피커
  // actions
  'actions/export-import.js',  // 31. 내보내기/가져오기
  // data/search
  'data/search/search.js',     // 32. 전문 검색
  // core (후미)
  'core/tag-filter.js',        // 33. 태그 필터
  'core/theme.js',             // 34. 테마 토글
  'core/events.js',            // 35. 이벤트 와이어링 + 모바일 UI
  // data
  'data/init.js',              // 36. 앱 부팅 시퀀스 (마지막)
];

async function main() {
  // dist 디렉토리 확보
  mkdirSync(DIST, { recursive: true });

  // JS 파일 연결
  const parts = JS_FILES.map(rel => {
    const absPath = join(SRC, rel);
    try {
      return readFileSync(absPath, 'utf8');
    } catch (err) {
      console.error(`[build] 파일 없음: ${absPath}`);
      return `/* MISSING: ${rel} */\n`;
    }
  });

  const combined = parts.join('\n\n');

  // esbuild transform (번들링 없이 변환만)
  const result = await transform(combined, {
    loader:    'js',
    minify:    !isDev,
    target:    'es2018',
    // sourcemap: isDev ? 'inline' : false,
  });

  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.warn('[esbuild warn]', w.text));
  }

  const bundlePath = join(DIST, 'bundle.js');
  writeFileSync(bundlePath, result.code, 'utf8');
  console.log(`[build] bundle.js → ${result.code.length} bytes (${isDev ? 'dev' : 'minified'})`);

  // inline 단계 호출
  const { inline } = await import('./inline.mjs');
  await inline({ isDev });
}

main().catch(err => {
  console.error('[build] 오류:', err);
  process.exit(1);
});
