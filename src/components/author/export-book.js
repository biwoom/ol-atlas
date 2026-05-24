// src/components/author/export-book.js
// ── BOOK HTML 내보내기 ───────────────────────────────

import { S } from '../../core/state.js';
import { __STATIC_HTML__ } from '../../core/static-html.js';
import { dlBlob, toast, escapeHTML } from '../../core/utils.js';
import { slugFilename } from '../../core/constants.js';
import { customConfirm, customAlert } from '../../ui/confirm-modal.js';
import { devLog } from '../../core/dev.js';

export async function exportBook() {
  devLog('EXPORT', 'exportBook start');

  const manifest = (S.book && S.book.manifest) || {};
  const validation = validateManifest(manifest);
  if (!validation.ok) {
    const proceed = await customConfirm({
      title: 'BOOK 배포 전 확인',
      message: '다음 항목을 확인해주세요:\n\n' + validation.warnings.join('\n') + '\n\n그래도 진행하시겠습니까?',
      confirmText: '진행',
      cancelText: '취소',
    });
    if (!proceed) return;
  }

  let html = __STATIC_HTML__;
  if (!html) {
    await customAlert({
      title: '오류',
      message: '__STATIC_HTML__이 캡처되지 않았습니다.',
      danger: true,
    });
    return;
  }

  const bundleStartRe = /window\.__OL_AUTHOR_BUNDLE_START__\s*=\s*['"]\/\*! AUTHOR_BUNDLE_START \*\/['"];?/;
  const bundleEndRe = /window\.__OL_AUTHOR_BUNDLE_END__\s*=\s*['"]\/\*! AUTHOR_BUNDLE_END \*\/['"];?/;
  const startMatch = html.match(bundleStartRe);
  const endMatch = html.match(bundleEndRe);
  if (startMatch && endMatch) {
    const startIdx = html.indexOf(startMatch[0]);
    const endIdx = html.indexOf(endMatch[0], startIdx + startMatch[0].length);
    if (startIdx >= 0 && endIdx > startIdx) {
      html = html.slice(0, startIdx) + '/*! [author bundle removed for BOOK] */' + html.slice(endIdx + endMatch[0].length);
    }
  }

  const bookData = buildBookData();
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(bookData))));

  const initRe = new RegExp("const __LOADED_DATA_B64__\\s*=\\s*'[^']*';");
  html = html.replace(
    initRe,
    "window.__OL_MODE__='book';\nconst __LOADED_DATA_B64__ = '" + b64 + "';"
  );

  if (manifest.title) {
    html = html.replace(
      /<title>[^<]*<\/title>/,
      '<title>' + escapeHTML(manifest.title) + '</title>'
    );
  }

  const fname = slugFilename(manifest.title || 'ol-book', 'ol-book') + '.html';
  dlBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), fname);
  toast('BOOK으로 배포되었습니다', 'success');
  devLog('EXPORT', 'exportBook done:', fname);
}

function buildBookData() {
  return {
    meta: {
      schemaVersion: 8,
      olVersion: '0.8.0-book',
      exportedAt: new Date().toISOString(),
    },
    cards: S.cards,
    columns: S.columns,
    userData: { status: {} },
    nextColId: S.nextColId,
    nextCardId: S.nextCardId,
    book: { manifest: (S.book && S.book.manifest) || null },
    settings: {
      theme: (S.settings && S.settings.theme) || 'system',
      locale: (S.settings && S.settings.locale) || 'ko',
    },
  };
}

function validateManifest(m) {
  const warnings = [];
  if (!m || !m.title) warnings.push('· 책 제목이 비어있습니다');
  if (!m || !m.id) warnings.push('· BOOK ID가 비어있습니다');
  if (!m || !m.cover || !m.cover.image) warnings.push('· 표지 이미지가 없습니다');
  return { ok: warnings.length === 0, warnings };
}

window.__OL_EXPORT_BOOK__ = exportBook;
