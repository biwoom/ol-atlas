// src/core/constants.js
// ── 전역 상수 및 공용 헬퍼 ────────────────────────────

'use strict';

// ══════════════════════════════════════════════════════
//  ORIGIN — 하드코딩된 원본 제작자 정보
//  ※ 이 값은 코드에 고정되어 있으며 UI를 통해 수정할 수 없습니다.
//  ※ 파일이 포크·배포되어도 이 상수는 HTML 소스에 그대로 유지됩니다.
// ══════════════════════════════════════════════════════
const ORIGIN = Object.freeze({
  author    : '비움',
  site      : 'olbit.org',
  copyright : 'Copyright © 2026 biwoom',
  license   : 'CC BY-SA 4.0',
  tool      : 'OL · ATLAS · Weaving the Wisdom',
});

// ══════════════════════════════════════════════════════
//  OL_PROJECTS — 올확장 프로젝트 카탈로그 (홈 화면 표시)
// ══════════════════════════════════════════════════════
const OL_PROJECTS = Object.freeze([
  {
    name: '붓다스토리',
    desc: '붓다의 생애를 단행본 형식으로 엮은 OL 콘텐츠 파일',
    url: 'https://olbit.org/buddhastory',
    tag: '콘텐츠',
  },
  {
    name: '중관학 번역 모음',
    desc: '나가르주나 · 짠드라끼르띠 등 중관학 핵심 논서 한글 번역',
    url: 'https://olbit.org/madhyamaka',
    tag: '콘텐츠',
  },
  {
    name: '경전 모음 (OL 형식)',
    desc: '대승·초기 경전을 OL 카드로 정리한 학습 자료',
    url: 'https://olbit.org/sutras',
    tag: '콘텐츠',
  },
]);

// ══════════════════════════════════════════════════════
//  TASK 0: 공용 헬퍼
// ══════════════════════════════════════════════════════

// 신규 SVG 아이콘 (T2/T6에서 사용)
const ICONS_X = {
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  chevronDown:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  search:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  tag:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>',
  fileText:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  home:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
};

// 안전한 파일명 슬러그 (T3에서 사용)
function slugFilename(s, fallback) {
  const t = String(s || '').trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return t || (fallback || 'untitled');
}

// 다중 .md 순차 다운로드 (JSZip 없이)
function dlBlobSequential(items, doneCb) {
  let i = 0;
  function step() {
    if (i >= items.length) { if (doneCb) doneCb(); return; }
    dlBlob(items[i].blob, items[i].filename);
    i++; setTimeout(step, 80);
  }
  step();
}

// ══════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════
// Task 1: 파스텔 15색 (5×3 그리드)
const COL_COLORS = [
  // Row 1 — 따뜻한 톤
  '#fecaca', '#fed7aa', '#fef3c7', '#fef08a', '#d9f99d',
  // Row 2 — 시원한 톤
  '#bbf7d0', '#a7f3d0', '#a5f3fc', '#bae6fd', '#bfdbfe',
  // Row 3 — 보라/뉴트럴
  '#c7d2fe', '#ddd6fe', '#f5d0fe', '#fbcfe8', '#e7e5e4',
];

// ══════════════════════════════════════════════════════
//  v1.5: URL Slug 헬퍼
// ══════════════════════════════════════════════════════
function titleToSlug(title) {
  return String(title || '').trim()
    .replace(/[\\/:*?"<>|#&=%]/g, '')   // URL 예약 문자 제거
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function ensureUniqueSlug(slug, excludeId) {
  if (!slug) slug = 'untitled';
  const others = (S.cards || []).filter(c => c.id !== excludeId).map(c => c.slug);
  if (!others.includes(slug)) return slug;
  let n = 2;
  while (others.includes(slug + '-' + n)) n++;
  return slug + '-' + n;
}

// ══════════════════════════════════════════════════════
//  v1.5: 이미지 토큰 헬퍼
// ══════════════════════════════════════════════════════
function newImgId(card) {
  card.images = card.images || {};
  const ids = Object.keys(card.images);
  let max = 0;
  ids.forEach(id => {
    const m = id.match(/^img-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'img-' + (max + 1);
}

// alt 텍스트 안전화 — `]` 문자 차단
function safeImgAlt(alt) {
  return String(alt || '').replace(/[\[\]]/g, '').slice(0, 100).trim();
}

// 본문의 표준 ![alt](src) → [img:id] 토큰으로 변환
// 1차: base64 data URL (안전한 문자만 포함)
// 2차: 일반 URL 이미지
function bodyImagesToTokens(card) {
  if (!card.body) return;
  card.images = card.images || {};
  // 1차: data URL (base64 알파벳에 ')' 없으므로 단순 패턴으로 충분)
  card.body = card.body.replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
    (m, alt, src) => {
      const id = newImgId(card);
      card.images[id] = { alt: safeImgAlt(alt), src: src.trim() };
      return '[img:' + id + ']';
    }
  );
  // 2차: 일반 URL 이미지
  card.body = card.body.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (m, alt, src) => {
      const id = newImgId(card);
      card.images[id] = { alt: safeImgAlt(alt), src: src.trim() };
      return '[img:' + id + ']';
    }
  );
}

// 토큰 → 표준 마크다운으로 복원 (.md 내보내기 시)
function bodyTokensToStandardMd(card) {
  if (!card || !card.body) return (card && card.body) || '';
  if (!card.images) return card.body;
  return card.body.replace(/\[img:([a-z0-9_-]+)(?:\s+([^\]]*))?\]/gi,
    (match, id, inlineAlt) => {
      const imgData = card.images[id];
      if (!imgData) return match;
      const alt = imgData.alt || inlineAlt || '';
      return '![' + alt + '](' + imgData.src + ')';
    }
  );
}
