/**
 * build/build.mjs
 * OL ATLAS v0.8 — JS 빌드 스크립트 (ES modules → IIFE bundle)
 *
 * 역할:
 *   1. src/main.js 를 진입점으로 esbuild bundle API 실행
 *   2. format: 'iife' 로 단일 자기완결형 스크립트 출력
 *   3. dist/bundle.js 출력
 *   4. inline.mjs를 호출해 최종 dist/ol-atlas.html 생성
 *
 * 사용:
 *   node build/build.mjs          # 프로덕션 (minify)
 *   node build/build.mjs --dev    # 개발 (포맷 유지)
 */

import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const isDev = process.argv.includes('--dev');

async function main() {
  mkdirSync(DIST, { recursive: true });

  const result = await build({
    entryPoints: [join(SRC, 'main.js')],
    bundle:      true,
    format:      'iife',
    outfile:     join(DIST, 'bundle.js'),
    minify:      !isDev,
    target:      'es2018',
    legalComments: 'inline',
    metafile:    true,
  });

  if (result.errors.length > 0) {
    result.errors.forEach(e => console.error('[esbuild error]', e.text));
    process.exit(1);
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.warn('[esbuild warn]', w.text));
  }

  // 출력 파일 크기 확인
  const { readFileSync } = await import('fs');
  const bundleCode = readFileSync(join(DIST, 'bundle.js'), 'utf8');
  console.log(`[build] bundle.js → ${bundleCode.length} bytes (${isDev ? 'dev' : 'minified'})`);

  // inline 단계 호출
  const { inline } = await import('./inline.mjs');
  await inline({ isDev });
}

main().catch(err => {
  console.error('[build] 오류:', err);
  process.exit(1);
});
