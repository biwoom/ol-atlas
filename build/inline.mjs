/**
 * build/inline.mjs
 * OL ATLAS v0.7 — HTML 인라인 스크립트
 *
 * 역할:
 *   src/index.html 셸을 읽어 플레이스홀더를 실제 콘텐츠로 교체하고
 *   dist/ol-atlas.html (자기완결형 단일 HTML 파일) 을 출력합니다.
 *
 *   플레이스홀더 치환 순서:
 *     <!--FAVICON-->      → base64 JPEG 파비콘 <link> 태그
 *     <!--FOUC_SCRIPT-->  → 다크모드 FOUC 차단 인라인 스크립트
 *     <!--BUILD_INFO-->   → window.__OL_BUILD__ 인라인 스크립트
 *     <!--STYLES-->       → 모든 CSS 파일 내용을 합친 <style> 블록
 *     <!--DATA_VAR-->     → __LOADED_DATA_B64__ 초기값 ('') 인라인 스크립트
 *     <!--SCRIPTS-->      → dist/bundle.js 내용을 담은 <script> 블록
 *
 * 사용:
 *   node build/inline.mjs             # 단독 실행
 *   (build.mjs 에서 inline({ isDev }) 로 호출됨)
 *
 * 주의:
 *   - FOUC 방지 스크립트는 반드시 <style> 블록보다 먼저 위치해야 합니다.
 *     (src/index.html 구조에서 이미 보장됨)
 *   - __STATIC_HTML__ 캡처는 JS 실행 첫 줄에서 outerHTML 을 잡으므로
 *     DATA_VAR 가 비어있는 상태로 인라인된 HTML 이 정적 소스가 됩니다.
 *   - buildExportHTML() 은 저장 시 __LOADED_DATA_B64__ 값만 교체합니다.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// ── 빌드 메타정보 — 버전은 package.json에서 자동 주입 ─────
const _pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const SCHEMA_VERSION = 10;
const BUILD_META = {
  version:       _pkg.version,
  schemaVersion: SCHEMA_VERSION,
  buildAt:       new Date().toISOString(),
};

// ── FOUC 방지 인라인 스크립트 (v0.6 에서 그대로 유지) ──
const FOUC_SCRIPT =
  `<script>(function(){var t=localStorage.getItem('ol_theme')||'system';` +
  `var d=t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches;` +
  `if(t==='dark'||d)document.documentElement.classList.add('dark');` +
  `else if(t==='reading')document.documentElement.classList.add('reading');})();</script>`;

// ── 파비콘 (v0.6 line 4, base64 JPEG) ───────────────
const FAVICON = `<link rel="icon" type="image/jpeg" href="data:image/jpeg;base64,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">`;

// ── CSS 파일 인라인 순서 ─────────────────────────────
const CSS_FILES = [
  'styles/tokens.css',
  'styles/base.css',
  'styles/components.css',
  'styles/sidebar.css',
  'styles/kanban.css',
  'styles/cardgrid.css',
  'styles/listview.css',
  'styles/docview.css',
  'styles/reader.css',
  'styles/modal.css',
  'ui/confirm-modal.css',                  // Phase 7.x: 커스텀 모달
  'components/shared/dirty-indicator.css', // Phase 7.x: dirty 인디케이터
  'ui/editor-modal.css',                   // v0.0.2: 편집자 입력 모달
];

export async function inline({ isDev = false } = {}) {
  mkdirSync(DIST, { recursive: true });

  // 셸 HTML 읽기
  const shell = readFileSync(join(SRC, 'index.html'), 'utf8');

  // CSS 합치기
  const cssContent = CSS_FILES.map(rel => {
    const absPath = join(SRC, rel);
    try {
      return `/* ${rel} */\n` + readFileSync(absPath, 'utf8');
    } catch {
      console.error(`[inline] CSS 파일 없음: ${absPath}`);
      return `/* MISSING: ${rel} */\n`;
    }
  }).join('\n\n');

  // 번들 JS 읽기
  let bundleJs;
  try {
    bundleJs = readFileSync(join(DIST, 'bundle.js'), 'utf8');
  } catch {
    console.error('[inline] dist/bundle.js 없음. 먼저 build.mjs를 실행하세요.');
    bundleJs = '/* bundle.js missing */';
  }

  // BUILD_INFO 스크립트
  const buildInfoScript =
    `<script>window.__OL_BUILD__=${JSON.stringify(BUILD_META)};</script>`;

  // DATA_VAR 스크립트 — 초기값은 빈 문자열
  // 저장 시 buildExportHTML() 이 이 값을 실제 데이터(Base64)로 교체함
  const dataVarScript =
    `<script>const __LOADED_DATA_B64__ = '__INIT_DATA_B64__';</script>`;

  // 플레이스홀더 치환
  // 주의: replacement 인자를 함수로 감싸야 $& 같은 특수 패턴이 해석되지 않음.
  // minified JS 안의 $&& (논리 AND) 가 $& → <!--SCRIPTS--> 로 치환되는 버그 방지.
  const r = s => () => s;
  let html = shell
    .replace('<!--FAVICON-->',     r(FAVICON))
    .replace('<!--FOUC_SCRIPT-->', r(FOUC_SCRIPT))
    .replace('<!--BUILD_INFO-->',  r(buildInfoScript))
    .replace('<!--STYLES-->',      r(`<style>\n${cssContent}\n</style>`))
    .replace('<!--DATA_VAR-->',    r(dataVarScript))
    .replace('<!--SCRIPTS-->',     r(`<script>\n${bundleJs}\n</script>`));

  const outFilename = `ol-atlas_v${_pkg.version}.html`;
  const outPath = join(DIST, outFilename);
  writeFileSync(outPath, html, 'utf8');

  const kb = Math.round(html.length / 1024);
  console.log(`[inline] ${outFilename} → ${kb} KB`);
}

// 단독 실행 지원
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  inline().catch(err => {
    console.error('[inline] 오류:', err);
    process.exit(1);
  });
}
