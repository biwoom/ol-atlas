// build/dev.mjs
// OL ATLAS Dev Server — esbuild 내장 서버 + 자동 새로고침

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, watch } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DEV_STATE } from './fixtures/dev-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC  = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');

const PORT = 3000;
const SCHEMA_VERSION = 9;

// inline.mjs와 동일한 FOUC 방지 스크립트
const FOUC_SCRIPT =
  `<script>(function(){var t=localStorage.getItem('ol_theme')||'system';` +
  `if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))` +
  `document.documentElement.classList.add('dark');})();</script>`;

// inline.mjs와 동일한 파비콘
const FAVICON = `<link rel="icon" type="image/jpeg" href="data:image/jpeg;base64,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">`;

// replace 콜백으로 감싸 $& 같은 특수 패턴 오작동 방지 (inline.mjs 동일 패턴)
const r = s => () => s;

function buildDevHtml(pkg) {
  let html = readFileSync(resolve(SRC, 'index.html'), 'utf8');

  // FAVICON
  html = html.replace('<!--FAVICON-->', r(FAVICON));

  // FOUC 방지 스크립트
  html = html.replace('<!--FOUC_SCRIPT-->', r(FOUC_SCRIPT));

  // BUILD_INFO
  const buildMeta = {
    version: pkg.version,
    schemaVersion: SCHEMA_VERSION,
    buildAt: new Date().toISOString(),
    dev: true,
  };
  html = html.replace('<!--BUILD_INFO-->',
    r(`<script>window.__OL_BUILD__=${JSON.stringify(buildMeta)};</script>`)
  );

  // CSS — esbuild가 bundle.css로 출력하므로 <link>로 로드
  html = html.replace('<!--STYLES-->', r('<link rel="stylesheet" href="/bundle.css">'));

  // DATA_VAR — fixture 데이터를 base64로 주입
  const fixtureB64 = Buffer.from(JSON.stringify(DEV_STATE), 'utf8').toString('base64');
  html = html.replace('<!--DATA_VAR-->',
    r(`<script>const __LOADED_DATA_B64__ = '${fixtureB64}';</script>`)
  );

  // SCRIPTS — esbuild SSE 자동 새로고침 + 외부 bundle.js 로드
  const liveReload = `<script>
  new EventSource('/esbuild').addEventListener('change', () => {
    console.log('[OL Dev] 변경 감지 → 새로고침');
    location.reload();
  });
</script>`;
  html = html.replace('<!--SCRIPTS-->',
    r(`${liveReload}\n<script src="/bundle.js"></script>`)
  );

  return html;
}

async function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

  mkdirSync(DIST, { recursive: true });

  // 서버 시작 전 dev용 index.html 생성
  const devHtml = buildDevHtml(pkg);
  writeFileSync(resolve(DIST, 'index.html'), devHtml);

  // esbuild context — outdir 방식으로 JS+CSS 동시 출력
  // main.js에서 CSS를 import하므로 esbuild가 bundle.css도 watch 대상에 포함
  const ctx = await esbuild.context({
    entryPoints: [resolve(SRC, 'main.js')],
    bundle: true,
    outdir: resolve(DIST),
    entryNames: 'bundle',
    format: 'iife',
    sourcemap: true,
    minify: false,
    target: 'es2018',
    legalComments: 'inline',
    logLevel: 'info',
  });

  // esbuild 내장 서버 — dist/ 정적 서빙 + /esbuild SSE 엔드포인트 자동 제공
  await ctx.serve({
    servedir: DIST,
    port: PORT,
    onRequest: ({ method, path: reqPath, status, timeInMS }) => {
      const color = status >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(`${color}[${status}]\x1b[0m ${method} ${reqPath} (${timeInMS}ms)`);
    },
  });

  // watch 모드 — 변경 감지 → 재빌드 → SSE로 브라우저에 신호
  await ctx.watch();

  // index.html 변경 감시 — esbuild watch 범위 밖이므로 별도 처리
  let htmlTimer = null;
  watch(resolve(SRC, 'index.html'), () => {
    clearTimeout(htmlTimer);
    htmlTimer = setTimeout(() => {
      console.log('\n[OL Dev] index.html 변경됨 → dev HTML 재생성');
      writeFileSync(resolve(DIST, 'index.html'), buildDevHtml(pkg));
      console.log('  브라우저에서 수동 새로고침 필요 (Cmd+R)\n');
    }, 100);
  });

  console.log('\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log(`\x1b[1m  OL ATLAS Dev Server\x1b[0m`);
  console.log(`  v${pkg.version} · schemaVersion ${SCHEMA_VERSION}`);
  console.log(`\n  \x1b[4mhttp://localhost:${PORT}\x1b[0m`);
  console.log('\n  소스 변경 → 자동 재빌드 + 새로고침');
  console.log('  종료: Ctrl+C');
  console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  process.on('SIGINT', async () => {
    console.log('\n[OL Dev] 서버 종료 중...');
    await ctx.dispose();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[OL Dev] 오류:', err);
  process.exit(1);
});
