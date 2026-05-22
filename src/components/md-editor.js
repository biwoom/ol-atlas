// src/components/md-editor.js
// ── 마크다운 에디터 ──────────────────────────────────

// ══════════════════════════════════════════════════════
//  PHASE 3 — 마크다운 에디터
//  · attachMarkdownEditor(textarea, options) : 툴바 + 슬래시 메뉴 부착
//  · Phase 5(인라인 편집)에서도 재사용 가능하도록 분리
// ══════════════════════════════════════════════════════

// 슬래시 커맨드 항목 정의
const MD_SLASH_COMMANDS = [
  { id:'h1',     label:'제목 1',     desc:'큰 제목 (#)',            keywords:['h1','heading','제목','title'],    icon:'<span class="md-tb-text">H1</span>' },
  { id:'h2',     label:'제목 2',     desc:'중간 제목 (##)',         keywords:['h2','heading','제목'],            icon:'<span class="md-tb-text">H2</span>' },
  { id:'h3',     label:'제목 3',     desc:'작은 제목 (###)',        keywords:['h3','heading','제목'],            icon:'<span class="md-tb-text">H3</span>' },
  { id:'quote',  label:'인용',       desc:'블록 인용 (>)',          keywords:['quote','인용','blockquote'],      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>' },
  { id:'ul',     label:'불릿 목록',  desc:'순서 없는 목록 (-)',     keywords:['ul','list','목록','bullet'],      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>' },
  { id:'ol',     label:'번호 목록',  desc:'순서 있는 목록 (1.)',    keywords:['ol','list','목록','번호','number'], icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>' },
  { id:'check',  label:'체크박스',   desc:'할 일 목록 (- [ ])',     keywords:['check','todo','체크','할일','task'], icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
  { id:'codeblock', label:'코드 블록', desc:'코드 블록 (```)',       keywords:['code','코드','codeblock'],         icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
  { id:'image',  label:'이미지',     desc:'이미지 삽입 (URL/업로드)', keywords:['image','이미지','img','사진'],     icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' },
  { id:'hr',     label:'구분선',     desc:'수평 구분선 (---)',       keywords:['hr','divider','구분선','line'],   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>' },
];

// ─────────────────────────────
// Markdown Live Preview
// ─────────────────────────────
function updateMarkdownPreview(textarea) {
  if (!textarea) return;

  const wrap = textarea.closest('.md-editor');
  if (!wrap) return;

  const preview = wrap.querySelector('.md-preview-body');
  if (!preview) return;

  const value = textarea.value || '';

  if (!value.trim()) {
    preview.innerHTML =
      '<div class="md-preview-empty">미리보기가 여기에 표시됩니다</div>';
    return;
  }

  // v1.5: 카드 컨텍스트 전달 — 이미지 토큰 렌더링
  let ctxCard = _currentEditingCard;
  if (!ctxCard && currentDocCardId != null) {
    ctxCard = (S.cards || []).find(c => c.id === currentDocCardId) || null;
  }
  preview.innerHTML = parseMarkdown(value, { card: ctxCard });
}

// 마크다운 에디터를 textarea에 부착. wrapper 안의 .md-toolbar / .md-slash-menu를 자동 감지.
function attachMarkdownEditor(textarea, options) {
  if (!textarea || textarea._mdAttached) return;
  textarea._mdAttached = true;
  options = options || {};

  const wrap    = textarea.closest('.md-editor');
  if (!wrap) return;
  const toolbar = wrap.querySelector('.md-toolbar');
  const slash   = wrap.querySelector('.md-slash-menu');

  // ── 툴바 클릭 → 마크다운 액션 적용 ─────────────────
  if (toolbar) {
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.md-tb-btn');
      if (!btn) return;
      e.preventDefault();
      applyMdAction(textarea, btn.dataset.md);
    });
    // 툴바 버튼 클릭 시 textarea 포커스 유지를 위해 mousedown 차단
    toolbar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.md-tb-btn')) e.preventDefault();
    });
  }

  // ── 키보드 단축키 (Ctrl/Cmd+B/I) + 슬래시 트리거 ───
  textarea.addEventListener('keydown', (e) => {
    // 슬래시 메뉴가 열린 상태라면 우선 처리
    if (slash && slash.classList.contains('open')) {
      if (slashKeyHandler(e, textarea, slash)) return;
    }

    // IME 합성 중에는 단축키/슬래시 무시
    if (e.isComposing || e.keyCode === 229) return;

    // Ctrl/Cmd + B / I
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyMdAction(textarea, 'bold'); return; }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); applyMdAction(textarea, 'italic'); return; }
    }

    // 슬래시 트리거: 빈 줄에서 '/' 입력 시
    if (e.key === '/' && slash) {
      const ctx = getLineContext(textarea);
      if (ctx.lineText === '') {
        // '/' 입력 직후 (input 이벤트에서) 메뉴를 띄우도록 큐잉
        // 여기서 e.preventDefault() 안 함 — '/' 문자가 textarea에 들어가게 함
        requestAnimationFrame(() => openSlashMenu(textarea, slash));
      }
    }
  });

let previewTimer;
  // ── 입력 변화 감지: 슬래시 메뉴 필터링 / 자동 닫기 ──
  textarea.addEventListener('input', () => {
    
  clearTimeout(previewTimer);

  previewTimer = setTimeout(() => {
    updateMarkdownPreview(textarea);
  }, 60);

    if (!slash || !slash.classList.contains('open')) return;
    const ctx = getLineContext(textarea);
    // 현재 줄이 '/'로 시작하지 않거나, 줄이 비면 메뉴 닫음
    if (!ctx.lineText.startsWith('/')) {
      closeSlashMenu(slash);
      return;
    }
    const query = ctx.lineText.slice(1).toLowerCase();
    renderSlashMenu(slash, query);
  });

  // ── textarea 외부 클릭 시 슬래시 메뉴 닫음 ─────────
  textarea.addEventListener('blur', () => {
    // popover 안 클릭은 살리려고 setTimeout
    setTimeout(() => {
      if (slash && document.activeElement !== textarea && !slash.contains(document.activeElement)) {
        closeSlashMenu(slash);
      }
    }, 100);
  });

  updateMarkdownPreview(textarea);
}

// 현재 캐럿이 위치한 줄의 컨텍스트를 반환
function getLineContext(textarea) {
  const value = textarea.value;
  const caret = textarea.selectionStart;
  const before = value.slice(0, caret);
  const lineStart = before.lastIndexOf('\n') + 1;
  const after = value.slice(caret);
  const nlAfter = after.indexOf('\n');
  const lineEnd = nlAfter === -1 ? value.length : caret + nlAfter;
  const lineText = value.slice(lineStart, lineEnd);
  return { value, caret, lineStart, lineEnd, lineText, before, after };
}

// 텍스트 일부를 다른 텍스트로 교체 후 캐럿/선택 영역을 새로 지정
function replaceRange(textarea, start, end, replacement, caretOffsetFromStart) {
  const value = textarea.value;
  textarea.value = value.slice(0, start) + replacement + value.slice(end);
  const newCaret = (caretOffsetFromStart != null)
    ? start + caretOffsetFromStart
    : start + replacement.length;
  textarea.setSelectionRange(newCaret, newCaret);
  textarea.focus();
  // input 이벤트 디스패치 — 외부 리스너가 있으면 받아갈 수 있게
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// 선택 영역을 prefix/suffix로 감싸기 (인라인 마크업)
function wrapSelection(textarea, prefix, suffix, placeholder) {
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const sel   = textarea.value.slice(start, end);
  const text  = sel || (placeholder || '');
  const replacement = prefix + text + suffix;
  textarea.value = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  // 선택 영역이 비어 있었으면 placeholder를 선택 상태로
  if (!sel) {
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + text.length);
  } else {
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + text.length);
  }
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// 현재 줄 앞에 prefix 삽입 (블록 마크업: #, >, - 등)
function prefixCurrentLine(textarea, prefix, replaceExisting) {
  const ctx = getLineContext(textarea);
  // 기존 동일 prefix 토글
  let newLine = ctx.lineText;
  if (replaceExisting && replaceExisting.length) {
    for (const re of replaceExisting) {
      if (re.test(newLine)) newLine = newLine.replace(re, '');
    }
  }
  newLine = prefix + newLine;
  const newCaretInLine = newLine.length;
  textarea.value = textarea.value.slice(0, ctx.lineStart) + newLine + textarea.value.slice(ctx.lineEnd);
  textarea.setSelectionRange(ctx.lineStart + newCaretInLine, ctx.lineStart + newCaretInLine);
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// 마크다운 액션 적용 (toolbar / slash 양쪽에서 호출)
function applyMdAction(textarea, action) {
  // 블록 prefix 패턴들
  const HEADING_RE = [/^#{1,6}\s+/];
  const QUOTE_RE   = [/^>\s?/];
  const UL_RE      = [/^[-*+]\s+\[[ xX]\]\s?/, /^[-*+]\s+/];
  const OL_RE      = [/^\d+\.\s+/];

  switch (action) {
    case 'h1': prefixCurrentLine(textarea, '# ',   [...HEADING_RE]); break;
    case 'h2': prefixCurrentLine(textarea, '## ',  [...HEADING_RE]); break;
    case 'h3': prefixCurrentLine(textarea, '### ', [...HEADING_RE]); break;
    case 'quote': prefixCurrentLine(textarea, '> ', [...QUOTE_RE]);   break;
    case 'ul':    prefixCurrentLine(textarea, '- ', [...UL_RE, ...OL_RE]); break;
    case 'ol':    prefixCurrentLine(textarea, '1. ', [...OL_RE, ...UL_RE]); break;
    case 'check': prefixCurrentLine(textarea, '- [ ] ', [...UL_RE, ...OL_RE]); break;
    case 'bold':   wrapSelection(textarea, '**', '**', '굵게'); break;
    case 'italic': wrapSelection(textarea, '*',  '*',  '기울임'); break;
    case 'strike': wrapSelection(textarea, '~~', '~~', '취소선'); break;
    case 'code':   wrapSelection(textarea, '`',  '`',  '코드'); break;
    case 'codeblock': {
      const ctx = getLineContext(textarea);
      const insertion = (ctx.lineText ? '\n' : '') + '```\n코드\n```\n';
      const insertAt  = ctx.lineEnd;
      replaceRange(textarea, insertAt, insertAt, insertion);
      break;
    }
    case 'hr': {
      const ctx = getLineContext(textarea);
      const insertion = (ctx.lineText ? '\n' : '') + '---\n';
      replaceRange(textarea, ctx.lineEnd, ctx.lineEnd, insertion);
      break;
    }
    case 'link':  openLinkPopover(textarea); break;
    case 'image': openImageDialog(textarea); break;
  }
}

// ─── 슬래시 메뉴 ─────────────────────────────────────
let slashContext = null;  // 메뉴 열려있는 동안의 컨텍스트
let slashFocusIdx = 0;
let slashFiltered = [];

function openSlashMenu(textarea, slash) {
  slashContext = { textarea, slash };
  slashFocusIdx = 0;
  renderSlashMenu(slash, '');
  positionSlashMenu(textarea, slash);
  slash.classList.add('open');
}

function closeSlashMenu(slash) {
  if (!slash) return;
  slash.classList.remove('open');
  slashContext = null;
}

function positionSlashMenu(textarea, slash) {
  // textarea 좌측 하단(현재 캐럿 근방)에 단순히 배치 — 정확한 caret 좌표 계산은 Phase 6에서
  const wrap = textarea.closest('.md-editor');
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const taRect   = textarea.getBoundingClientRect();
  // wrap 기준 상대 좌표
  slash.style.left = '0.5rem';
  slash.style.top  = (taRect.top - wrapRect.top + 28) + 'px';
}

function renderSlashMenu(slash, query) {
  const q = (query || '').trim().toLowerCase();
  slashFiltered = MD_SLASH_COMMANDS.filter(cmd => {
    if (!q) return true;
    if (cmd.label.toLowerCase().includes(q)) return true;
    return cmd.keywords.some(k => k.includes(q));
  });
  if (slashFocusIdx >= slashFiltered.length) slashFocusIdx = 0;

  if (!slashFiltered.length) {
    slash.innerHTML = '<div class="md-slash-empty">검색 결과 없음</div>';
    return;
  }
  slash.innerHTML = slashFiltered.map((cmd, i) => `
    <div class="md-slash-item${i === slashFocusIdx ? ' focused' : ''}" data-id="${cmd.id}" role="option">
      <span class="md-slash-item-icon">${cmd.icon}</span>
      <div class="md-slash-item-body">
        <div class="md-slash-item-label">${escapeHTML(cmd.label)}</div>
        <div class="md-slash-item-desc">${escapeHTML(cmd.desc)}</div>
      </div>
    </div>
  `).join('');
  // 클릭 핸들러
  slash.querySelectorAll('.md-slash-item').forEach((el, i) => {
    el.addEventListener('mousedown', (e) => {
      // textarea blur 방지를 위해 mousedown 사용
      e.preventDefault();
      slashFocusIdx = i;
      executeSlashCommand();
    });
  });
}

function slashKeyHandler(e, textarea, slash) {
  // 메뉴가 열린 상태에서의 키 처리. 처리하면 true 반환 → 호출자가 다른 핸들러 스킵
  if (e.isComposing || e.keyCode === 229) return false;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    slashFocusIdx = Math.min(slashFocusIdx + 1, slashFiltered.length - 1);
    updateSlashFocus(slash);
    return true;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    slashFocusIdx = Math.max(slashFocusIdx - 1, 0);
    updateSlashFocus(slash);
    return true;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    executeSlashCommand();
    return true;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSlashMenu(slash);
    return true;
  }
  return false;
}

function updateSlashFocus(slash) {
  slash.querySelectorAll('.md-slash-item').forEach((el, i) => {
    el.classList.toggle('focused', i === slashFocusIdx);
  });
  // 포커스 항목으로 스크롤
  const focused = slash.querySelector('.md-slash-item.focused');
  if (focused) focused.scrollIntoView({ block: 'nearest' });
}

function executeSlashCommand() {
  if (!slashContext) return;
  const { textarea, slash } = slashContext;
  const cmd = slashFiltered[slashFocusIdx];
  if (!cmd) { closeSlashMenu(slash); return; }

  // 현재 줄에서 '/' 검색어 부분 제거
  const ctx = getLineContext(textarea);
  // ctx.lineText 가 '/...' 로 시작 — 줄 전체를 비움
  const newLine = '';
  textarea.value = textarea.value.slice(0, ctx.lineStart) + newLine + textarea.value.slice(ctx.lineEnd);
  textarea.setSelectionRange(ctx.lineStart, ctx.lineStart);

  closeSlashMenu(slash);
  applyMdAction(textarea, cmd.id);
}

// ─── 링크 popover ────────────────────────────────────
let linkPopoverContext = null;

function openLinkPopover(textarea) {
  const pop = document.getElementById('md-link-popover');
  if (!pop) return;
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const sel   = textarea.value.slice(start, end);
  linkPopoverContext = { textarea, start, end };

  document.getElementById('md-link-text').value = sel || '';
  document.getElementById('md-link-url').value  = '';

  // 위치: textarea 안 wrapper 기준
  const wrap = textarea.closest('.md-editor');
  if (wrap) {
    const wrapRect = wrap.getBoundingClientRect();
    const taRect   = textarea.getBoundingClientRect();
    pop.style.left = '0.5rem';
    pop.style.top  = (taRect.top - wrapRect.top + 28) + 'px';
    wrap.appendChild(pop);  // 같은 wrapper 안에 두어 absolute 기준이 일치하도록
  }
  pop.classList.add('open');

  // 표시 텍스트가 비어있으면 텍스트 input에, 아니면 URL input에 포커스
  setTimeout(() => {
    const target = sel ? document.getElementById('md-link-url') : document.getElementById('md-link-text');
    if (target) target.focus();
  }, 50);
}

function closeLinkPopover() {
  const pop = document.getElementById('md-link-popover');
  if (pop) pop.classList.remove('open');
  linkPopoverContext = null;
}

function insertLinkFromPopover() {
  if (!linkPopoverContext) return;
  const text = document.getElementById('md-link-text').value.trim();
  const url  = document.getElementById('md-link-url').value.trim();
  if (!url) { toast('URL을 입력해주세요'); return; }
  // javascript: 스킴 차단
  if (/^\s*javascript\s*:/i.test(url)) { toast('javascript: URL은 사용할 수 없습니다'); return; }
  const display = text || url;
  const md = `[${display}](${url})`;
  const { textarea, start, end } = linkPopoverContext;
  replaceRange(textarea, start, end, md);
  closeLinkPopover();
}

// ─── 이미지 다이얼로그 ────────────────────────────────
let imgDialogContext = null;
const IMG_WARN_BYTES   = 500 * 1024;        // 500KB
const IMG_DANGER_BYTES = 2 * 1024 * 1024;   // 2MB

function openImageDialog(textarea) {
  const dlg = document.getElementById('md-image-dialog');
  if (!dlg) return;
  imgDialogContext = { textarea, start: textarea.selectionStart, end: textarea.selectionEnd };

  // 초기화
  document.getElementById('md-img-url').value = '';
  document.getElementById('md-img-url-alt').value = '';
  document.getElementById('md-img-file').value = '';
  document.getElementById('md-img-file-alt').value = '';
  const warn = document.getElementById('md-img-warn');
  warn.style.display = 'none';
  warn.className = 'md-img-warn';
  warn.textContent = '';
  // URL 탭으로 시작
  setImgTab('url');

  dlg.classList.add('open');
  setTimeout(() => document.getElementById('md-img-url').focus(), 50);
}

function closeImageDialog() {
  const dlg = document.getElementById('md-image-dialog');
  if (dlg) dlg.classList.remove('open');
  imgDialogContext = null;
}

function setImgTab(tab) {
  document.querySelectorAll('.md-img-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.md-img-pane').forEach(p => p.style.display = (p.dataset.pane === tab) ? '' : 'none');
}

// v1.5: 카드 모달 이미지 편집 패널 렌더링
function renderCmImgPanel() {
  const card  = _currentEditingCard;
  const panel = document.getElementById('cm-img-panel');
  const list  = document.getElementById('cm-img-list');
  if (!panel || !list || !card) return;
  const images = card.images || {};
  const ids    = Object.keys(images);
  panel.style.display = ids.length ? '' : 'none';
  if (!ids.length) return;
  list.innerHTML = '';
  ids.forEach(id => {
    const img = images[id];
    const row = document.createElement('div');
    row.className = 'cm-img-row';
    // 썸네일
    let thumb;
    if (img.src) {
      thumb = document.createElement('img');
      thumb.className = 'cm-img-thumb';
      thumb.src = img.src; thumb.alt = img.alt || id;
      thumb.onerror = () => {
        const ph = document.createElement('div');
        ph.className = 'cm-img-thumb-placeholder'; ph.textContent = '?';
        thumb.replaceWith(ph);
      };
    } else {
      thumb = document.createElement('div');
      thumb.className = 'cm-img-thumb-placeholder'; thumb.textContent = '?';
    }
    // 정보 컬럼
    const info = document.createElement('div'); info.className = 'cm-img-info';
    const idLabel = document.createElement('div'); idLabel.className = 'cm-img-id'; idLabel.textContent = id;
    const altInput = document.createElement('input');
    altInput.className = 'cm-img-alt-input'; altInput.type = 'text';
    altInput.value = img.alt || ''; altInput.placeholder = 'alt 텍스트';
    altInput.addEventListener('change', () => { images[id].alt = altInput.value.trim(); });
    const srcInput = document.createElement('input');
    srcInput.className = 'cm-img-src-input'; srcInput.type = 'text';
    const isB64 = img.src && img.src.startsWith('data:image/');
    srcInput.value = img.src || ''; srcInput.placeholder = '이미지 URL 또는 data URL';
    srcInput.title = isB64 ? '(base64 인라인 이미지)' : (img.src || '');
    if (isB64) { srcInput.style.opacity = '0.7'; srcInput.style.fontSize = '0.625rem'; }
    srcInput.addEventListener('change', () => {
      images[id].src = srcInput.value.trim();
      const t = row.querySelector('.cm-img-thumb');
      if (t && t.tagName === 'IMG') t.src = srcInput.value.trim();
      updateMarkdownPreview(document.getElementById('cm-b-md'));
    });
    info.appendChild(idLabel); info.appendChild(altInput); info.appendChild(srcInput);
    // 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'cm-img-del';
    delBtn.title = '이미지 삭제 (본문 토큰도 제거)';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
    delBtn.addEventListener('click', () => {
      delete images[id];
      const ta = document.getElementById('cm-b-md');
      if (ta) {
        ta.value = ta.value.replace(new RegExp('\\[img:' + id.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&') + '(?:\\s+[^\\]]*)?\\]', 'gi'), '');
        updateMarkdownPreview(ta);
      }
      renderCmImgPanel();
    });
    row.appendChild(thumb); row.appendChild(info); row.appendChild(delBtn);
    list.appendChild(row);
  });
}

// v1.5: 문서뷰 이미지 편집 패널 렌더링
function renderDvImgPanel() {
  const card    = _currentEditingCard;
  const panelRow = document.getElementById('dv-img-panel-row');
  const listEl  = document.getElementById('dv-img-list');
  if (!panelRow || !listEl || !card) return;

  const images = card.images || {};
  const ids    = Object.keys(images);
  panelRow.style.display = ids.length ? '' : 'none';
  if (!ids.length) return;

  listEl.innerHTML = '';
  ids.forEach(id => {
    const img = images[id];
    const row = document.createElement('div');
    row.className = 'cm-img-row';

    // 썸네일
    let thumb;
    if (img.src) {
      thumb = document.createElement('img');
      thumb.className = 'cm-img-thumb';
      thumb.src = img.src; thumb.alt = img.alt || id;
      thumb.onerror = () => {
        const ph = document.createElement('div');
        ph.className = 'cm-img-thumb-placeholder'; ph.textContent = '?';
        thumb.replaceWith(ph);
      };
    } else {
      thumb = document.createElement('div');
      thumb.className = 'cm-img-thumb-placeholder'; thumb.textContent = '?';
    }

    // 정보 컬럼
    const info = document.createElement('div'); info.className = 'cm-img-info';
    const idLabel = document.createElement('div'); idLabel.className = 'cm-img-id'; idLabel.textContent = id;

    const altInput = document.createElement('input');
    altInput.className = 'cm-img-alt-input'; altInput.type = 'text';
    altInput.value = img.alt || ''; altInput.placeholder = 'alt 텍스트';
    altInput.addEventListener('change', () => { images[id].alt = altInput.value.trim(); });

    const srcInput = document.createElement('input');
    srcInput.className = 'cm-img-src-input'; srcInput.type = 'text';
    const isB64 = img.src && img.src.startsWith('data:image/');
    srcInput.value = img.src || ''; srcInput.placeholder = '이미지 URL 또는 data URL';
    srcInput.title = isB64 ? '(base64 인라인 이미지)' : (img.src || '');
    if (isB64) { srcInput.style.opacity = '0.7'; srcInput.style.fontSize = '0.625rem'; }
    srcInput.addEventListener('change', () => {
      images[id].src = srcInput.value.trim();
      const t = row.querySelector('.cm-img-thumb');
      if (t && t.tagName === 'IMG') t.src = srcInput.value.trim();
      updateMarkdownPreview(document.getElementById('dv-edit-textarea'));
    });

    info.appendChild(idLabel); info.appendChild(altInput); info.appendChild(srcInput);

    // 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'cm-img-del';
    delBtn.title = '이미지 삭제 (본문 토큰도 제거)';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
    delBtn.addEventListener('click', () => {
      delete images[id];
      const ta = document.getElementById('dv-edit-textarea');
      if (ta) {
        ta.value = ta.value.replace(new RegExp('\\[img:' + id.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&') + '(?:\\s+[^\\]]*)?\\]', 'gi'), '');
        updateMarkdownPreview(ta);
      }
      renderDvImgPanel();
    });

    row.appendChild(thumb); row.appendChild(info); row.appendChild(delBtn);
    listEl.appendChild(row);
  });

  // .md 내보내기 버튼
  const exportBtn = document.getElementById('dv-img-export-md-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const mdText = cardToMarkdownText(card);
      const filename = slugFilename(card.title || 'card', 'card-' + card.id) + '.md';
      dlBlob(new Blob([mdText], { type: 'text/markdown; charset=utf-8' }), filename);
      toast('마크다운 파일을 내보냈습니다');
    };
  }
}

function insertImageFromDialog() {
  if (!imgDialogContext) return;
  const activeTab = document.querySelector('.md-img-tab.active')?.dataset.tab || 'url';

  // v1.5: 현재 편집 중인 카드 컨텍스트 (이미지 저장소)
  const card = _currentEditingCard;
  if (!card) {
    toast('카드 편집 모드에서만 이미지를 삽입할 수 있습니다');
    return;
  }
  card.images = card.images || {};

  if (activeTab === 'url') {
    const url = document.getElementById('md-img-url').value.trim();
    const alt = document.getElementById('md-img-url-alt').value.trim();
    if (!url) { toast('이미지 URL을 입력해주세요'); return; }
    if (/^\s*javascript\s*:/i.test(url)) { toast('javascript: URL은 사용할 수 없습니다'); return; }

    const id = newImgId(card);
    card.images[id] = { alt: safeImgAlt(alt), src: url };
    const token = '[img:' + id + ']';
    const { textarea, start, end } = imgDialogContext;
    replaceRange(textarea, start, end, token);
    closeImageDialog();
    updateMarkdownPreview(textarea);
    renderCmImgPanel();   // v1.5: 카드모달 패널 갱신
    renderDvImgPanel();   // v1.5: 문서뷰 패널 갱신
    return;
  }

  // 파일 업로드 (base64)
  const fileEl = document.getElementById('md-img-file');
  const file = fileEl.files && fileEl.files[0];
  if (!file) { toast('이미지 파일을 선택해주세요'); return; }
  if (!file.type.startsWith('image/')) { toast('이미지 파일만 가능합니다'); return; }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const alt = document.getElementById('md-img-file-alt').value.trim() || file.name.replace(/\.[^.]+$/, '');

    const id = newImgId(card);
    card.images[id] = { alt: safeImgAlt(alt), src: dataUrl };
    const token = '[img:' + id + ']';
    const { textarea, start, end } = imgDialogContext;
    replaceRange(textarea, start, end, token);
    closeImageDialog();
    updateMarkdownPreview(textarea);
    renderCmImgPanel();   // v1.5: 패널 갱신
    renderDvImgPanel();   // v1.5: 문서뷰 패널 갱신
  };
  reader.onerror = () => toast('파일을 읽는 중 오류가 발생했습니다');
  reader.readAsDataURL(file);
}

// 파일 선택 시 크기 경고 표시 (실제 삽입은 사용자가 "삽입" 버튼을 누를 때)
function checkImageFileSize(file) {
  const warn = document.getElementById('md-img-warn');
  if (!warn) return;
  if (!file) { warn.style.display = 'none'; return; }
  warn.style.display = '';
  const sizeKB = Math.round(file.size / 1024);
  if (file.size > IMG_DANGER_BYTES) {
    warn.className = 'md-img-warn danger';
    warn.textContent = `⚠ 매우 큰 파일입니다 (${(file.size/1024/1024).toFixed(1)}MB). HTML 파일이 크게 비대해집니다. 삽입을 권장하지 않습니다.`;
  } else if (file.size > IMG_WARN_BYTES) {
    warn.className = 'md-img-warn warn';
    warn.textContent = `주의: 파일 크기가 큽니다 (${sizeKB}KB). 단일 HTML 파일이 비대해질 수 있습니다.`;
  } else {
    warn.style.display = 'none';
  }
}
