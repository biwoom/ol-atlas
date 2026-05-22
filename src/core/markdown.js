// src/core/markdown.js
// ── 마크다운 파서 (Phase 1) ───────────────────────────

function parseInline(text, ctx) {
  // 입력 이스케이프
  let s = escapeHTML(text);
  // 인라인 코드 (이스케이프 이후, 다른 규칙보다 먼저)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 굵게 + 기울임
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // 굵게
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g,     '<strong>$1</strong>');
  // 기울임
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g,   '<em>$1</em>');
  // 취소선
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // v1.5: 이미지 토큰 → img 태그 (escapeHTML 이후에 처리)
  // escapeHTML이 토큰 [img:...] 안의 특수문자를 바꾸지 않으므로 안전
  if (ctx && ctx.card && ctx.card.images) {
    s = s.replace(/\[img:([a-z0-9_-]+)(?:\s+([^\]]*))?\]/gi, (m, id, inlineAlt) => {
      const data = ctx.card.images[id];
      if (!data) {
        return '<span class="md-img-missing">⚠ 이미지 없음: ' + escapeHTML(id) + '</span>';
      }
      const alt = data.alt || inlineAlt || '';
      const safeSrc = /^data:image\//.test(data.src) ? data.src : sanitizeURL(data.src);
      return '<img src="' + escapeHTML(safeSrc) + '" alt="' + escapeHTML(alt) + '" class="md-img" data-img-id="' + escapeHTML(id) + '">';
    });
  }
  // 이미지 (링크보다 먼저)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const safeSrc = /^data:image\//.test(src.trim()) ? src.trim() : sanitizeURL(src);
    return `<img src="${escapeHTML(safeSrc)}" alt="${escapeHTML(alt)}" class="md-img">`;
  });
  // 링크
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, href) =>
    `<a href="${escapeHTML(sanitizeURL(href))}" target="_blank" rel="noopener">${txt}</a>`
  );
  return s;
}

function parseMarkdown(md, ctx) {
  ctx = ctx || {};
  const _ctxCard = ctx.card || null;

  if (!md) return '';

  const lines  = md.split('\n');
  const out    = [];
  let i        = 0;
  let inPara   = false;
  // TOC용 헤더 ID 중복 방지
  const _usedHeadingIds = new Set();

  function closePara() {
    if (inPara) { out.push('</p>'); inPara = false; }
  }

  // 헤더 텍스트 → slug ID (한국어 포함)
  function makeHeadingId(rawText) {
    // parseInline 태그 제거 후 plain text
    const plain = rawText.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '');
    const base = 'h-' + (plain.toLowerCase()
      .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
      .trim().replace(/\s+/g, '-') || 'heading');
    let id = base;
    let n = 2;
    while (_usedHeadingIds.has(id)) id = `${base}-${n++}`;
    _usedHeadingIds.add(id);
    return id;
  }

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw;

    // ── 펜스 코드 블록 ────────────────────────────────
    if (/^```/.test(line)) {
      closePara();
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(escapeHTML(lines[i]));
        i++;
      }
      out.push(`<pre class="md-pre"><code${lang ? ` class="lang-${escapeHTML(lang)}"` : ''}>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // ── 구분선 ────────────────────────────────────────
    if (/^(\s*[-*_]){3,}\s*$/.test(line) && /^[\s\-*_]+$/.test(line)) {
      closePara();
      out.push('<hr class="md-hr">');
      i++; continue;
    }

    // ── 제목 ──────────────────────────────────────────
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      closePara();
      const lvl = Math.min(hm[1].length, 6);
      const headingHtml = parseInline(hm[2], ctx);
      const hId = makeHeadingId(headingHtml);
      out.push(`<h${lvl} id="${hId}" class="md-h${lvl}">${headingHtml}</h${lvl}>`);
      i++; continue;
    }

    // ── 인용 블록 ────────────────────────────────────
    if (/^>\s?/.test(line)) {
      closePara();
      const bqLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote class="md-bq">${parseMarkdown(bqLines.join('\n'), ctx)}</blockquote>`);
      continue;
    }

    // ── 순서 있는 리스트 ──────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      closePara();
      out.push('<ol class="md-ol">');
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        out.push(`<li>${parseInline(lines[i].replace(/^\d+\.\s/,''), ctx)}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }

    // ── 체크박스 리스트 ───────────────────────────────
    if (/^-\s\[[ xX]\]/.test(line)) {
      closePara();
      out.push('<ul class="md-ul md-checklist">');
      while (i < lines.length && /^-\s\[[ xX]\]/.test(lines[i])) {
        const checked = /^-\s\[[xX]\]/.test(lines[i]);
        const txt = lines[i].replace(/^-\s\[[ xX]\]\s?/,'');
        out.push(`<li class="md-check-item"><input type="checkbox"${checked?' checked':''} disabled><span>${parseInline(txt, ctx)}</span></li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    // ── 비순서 리스트 ────────────────────────────────
    if (/^[-*+]\s/.test(line)) {
      closePara();
      out.push('<ul class="md-ul">');
      while (i < lines.length && /^[-*+]\s/.test(lines[i]) && !/^-\s\[[ xX]\]/.test(lines[i])) {
        out.push(`<li>${parseInline(lines[i].replace(/^[-*+]\s/,''), ctx)}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    // ── 빈 줄 → 단락 닫기 ───────────────────────────
    if (line.trim() === '') {
      closePara();
      i++; continue;
    }

    // ── 일반 단락 ────────────────────────────────────
    if (!inPara) { out.push('<p class="md-p">'); inPara = true; }
    else out.push('<br>');
    out.push(parseInline(line, ctx));
    i++;
  }

  closePara();
  return out.join('');
}

// ══════════════════════════════════════════════════════
//  BODY HELPERS — 마크다운 단일 모드
//  · cardPreviewText : 카드 미리보기/리스트용 (마크다운 기호 제거)
//  · cardSearchText  : 검색 매칭용
//  · stripMarkdown   : 가벼운 plain 변환 (파싱 X, 정규식만)
// ══════════════════════════════════════════════════════
function stripMarkdown(md) {
  if (!md) return '';
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[img:[a-z0-9_-]+(?:\s+[^\]]*)?\]/gi, '')   // v1.5: 이미지 토큰 제거
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^[\s-*_]{3,}\s*$/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
