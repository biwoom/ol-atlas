// src/components/shared/reader.js
// ── 독서뷰 (Reader View) ─────────────────────────────

import { S }                    from '../../core/state.js';
import { escapeHTML }           from '../../core/utils.js';
import { parseMarkdown }        from '../../core/markdown.js';
import {
  currentDocCardId, setCurrentDocCardId,
  getOrderedCardList, getPrevNextCard,
  switchView, registerPostSwitchHook,
} from '../../core/router.js';
import { subscribe }            from '../../core/store.js';
import { getResolvedTheme, getStoredTheme, toggleTheme, registerThemeChangeHook } from '../../core/theme.js';
import { openDocCard }          from './docview.js';

// ── 독서뷰 진입 ──────────────────────────────────────

export function openReaderView(id) {
  setCurrentDocCardId(id);
  switchView('reader');
}

// ── 상태 변수 ─────────────────────────────────────────

let rvFontSize = (function() {
  try { return parseFloat(localStorage.getItem('ol_rv_fontsize')) || 1; } catch(e) { return 1; }
})();
let rvPanelLeftPinned  = false;
let rvPanelRightPinned = false;
let rvPanelLeftHover   = false;
let rvPanelRightHover  = false;
let rvTocObserver      = null;
let rvLastScrollY      = 0;

// ── 글자크기 ──────────────────────────────────────────

function rvSetFont(delta) {
  rvFontSize = Math.min(1.25, Math.max(0.75, rvFontSize + delta));
  try { localStorage.setItem('ol_rv_fontsize', rvFontSize); } catch(e) {}
  const wrap = document.getElementById('rv-body-wrap');
  if (wrap) wrap.style.setProperty('--rv-font-size', rvFontSize + 'rem');
}

// ── 패널 상태 관리 ────────────────────────────────────

function rvUpdatePanel(side) {
  const panelId  = side === 'left' ? 'rv-panel-left'  : 'rv-panel-right';
  const toggleId = side === 'left' ? 'rv-toggle-list' : 'rv-toggle-toc';
  const panel    = document.getElementById(panelId);
  const toggle   = document.getElementById(toggleId);
  if (!panel) return;
  const pinned = side === 'left' ? rvPanelLeftPinned  : rvPanelRightPinned;
  const hover  = side === 'left' ? rvPanelLeftHover   : rvPanelRightHover;
  const show   = pinned || hover;
  panel.classList.toggle('rv-panel-visible', show);
  panel.setAttribute('aria-hidden', String(!show));
  if (toggle) toggle.classList.toggle('pinned', pinned);
}

function rvBindToggle(btnId, side) {
  const btn = document.getElementById(btnId);
  if (!btn || btn._rvBound) return;
  btn._rvBound = true;
  btn.addEventListener('mouseenter', function() {
    if (side === 'left') rvPanelLeftHover = true;
    else rvPanelRightHover = true;
    rvUpdatePanel(side);
  });
  btn.addEventListener('mouseleave', function() {
    if (side === 'left') rvPanelLeftHover = false;
    else rvPanelRightHover = false;
    rvUpdatePanel(side);
  });
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (side === 'left') rvPanelLeftPinned = !rvPanelLeftPinned;
    else rvPanelRightPinned = !rvPanelRightPinned;
    rvUpdatePanel(side);
    btn.setAttribute('aria-expanded',
      String(side === 'left' ? rvPanelLeftPinned : rvPanelRightPinned));
  });
}

function rvBindPanelHover(panelId, side) {
  const panel = document.getElementById(panelId);
  if (!panel || panel._rvPanelBound) return;
  panel._rvPanelBound = true;
  panel.addEventListener('mouseenter', function() {
    if (side === 'left') rvPanelLeftHover = true;
    else rvPanelRightHover = true;
    rvUpdatePanel(side);
  });
  panel.addEventListener('mouseleave', function() {
    if (side === 'left') rvPanelLeftHover = false;
    else rvPanelRightHover = false;
    rvUpdatePanel(side);
  });
}

// ── 문서 목록 렌더링 ──────────────────────────────────

function rvRenderDocList(currentId) {
  const list = document.getElementById('rv-doc-list');
  if (!list) return;
  list.innerHTML = '';
  S.columns.forEach(function(col) {
    const cards = S.cards.filter(function(c) { return c.colId === col.id; });
    if (!cards.length) return;
    const label = document.createElement('div');
    label.className = 'rv-doc-section-label';
    label.textContent = col.title;
    list.appendChild(label);
    cards.forEach(function(card) {
      const btn = document.createElement('button');
      btn.className = 'rv-doc-item' + (card.id === currentId ? ' active' : '');
      btn.textContent = card.title || '(제목 없음)';
      btn.title = card.title || '';
      btn.addEventListener('click', function() {
        openReaderView(card.id);
        rvPanelLeftPinned = false;
        rvUpdatePanel('left');
      });
      list.appendChild(btn);
    });
  });
}

// ── TOC 렌더링 및 스크롤 하이라이트 ──────────────────

function rvRenderToc(bodyHtml) {

  const inner = document.getElementById('rv-toc-inner');
  if (!inner) return;
  inner.innerHTML = '';

  const content = document.getElementById('rv-content');   // ← 추가

  const tmp = document.createElement('div');
  tmp.innerHTML = bodyHtml;

  const headings = tmp.querySelectorAll('h1[id], h2[id], h3[id]');
  headings.forEach(function(hEl) {

    const a = document.createElement('a');
    a.className = 'rv-toc-item rv-toc-' + hEl.tagName.toLowerCase();
    a.textContent = hEl.textContent;
    a.href = '#' + hEl.id;
    a.addEventListener('click', function(e) {
      e.preventDefault();
      if (!content) return;
      const target = content.querySelector('#' + CSS.escape(hEl.id));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    inner.appendChild(a);

  });

}

function rvInitTocObserver() {
  if (rvTocObserver) { rvTocObserver.disconnect(); rvTocObserver = null; }
  const content = document.getElementById('rv-content');
  if (!content) return;
  const headings = content.querySelectorAll('h1[id], h2[id], h3[id]');
  if (!headings.length) return;
  rvTocObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.rv-toc-item').forEach(function(item) {
        item.classList.toggle('active',
          item.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  headings.forEach(function(hEl) { rvTocObserver.observe(hEl); });
}

// ── 헤더 버튼 초기화 ──────────────────────────────────

function rvInitNav() {
  const editBtn  = document.getElementById('rv-edit-btn');
  const homeBtn  = document.getElementById('rv-home-btn');
  const themeBtn = document.getElementById('rv-theme-btn');
  const brand    = document.getElementById('rv-brand');
  if (editBtn  && !editBtn._rvInit)  { editBtn._rvInit  = true; editBtn.onclick  = function() { switchView('kanban'); }; }
  if (homeBtn  && !homeBtn._rvInit)  { homeBtn._rvInit  = true; homeBtn.onclick  = function() { switchView('document'); }; }
  if (themeBtn && !themeBtn._rvInit) { themeBtn._rvInit = true; themeBtn.onclick = toggleTheme; }
  if (brand    && !brand._rvInit)    { brand._rvInit    = true; brand.onclick    = function() { switchView('home'); }; }
}

export function rvSyncThemeIcon() {
  const btn = document.getElementById('rv-theme-btn');
  if (!btn) return;
  const cur  = getResolvedTheme(getStoredTheme());
  const sun  = btn.querySelector('.icon-sun');
  const moon = btn.querySelector('.icon-moon');
  const book = btn.querySelector('.icon-book');
  if (sun)  sun.style.display  = cur === 'light'   ? '' : 'none';
  if (moon) moon.style.display = cur === 'dark'    ? '' : 'none';
  if (book) book.style.display = cur === 'reading' ? '' : 'none';
}

// ── scroll-hide 헤더 ──────────────────────────────────

function rvInitScrollHide() {
  if (window._rvScrollBound) return;
  window._rvScrollBound = true;
  window.addEventListener('scroll', function() {
    const topbar = document.getElementById('rv-topbar');
    if (!topbar) return;
    const currentY = window.scrollY;
    if (currentY < 60) {
      topbar.classList.remove('rv-topbar-hidden');
    } else if (currentY > rvLastScrollY) {
      topbar.classList.add('rv-topbar-hidden');
    } else {
      topbar.classList.remove('rv-topbar-hidden');
    }
    rvLastScrollY = currentY;
  }, { passive: true });
}

// ── 카드 본문 렌더링 ──────────────────────────────────

function rvRenderCardBody(card) {
  if (!card) return '';
  const src = (card.body || '').trim();
  if (!src) return '<p style="color:hsl(var(--muted-foreground))">(본문이 비어 있습니다)</p>';
  return parseMarkdown(src, { card });
}

// ── renderReader() 메인 함수 ──────────────────────────

function renderReader() {
  const contentEl = document.getElementById('rv-content');
  const titleEl   = document.getElementById('rv-title');
  const metaEl    = document.getElementById('rv-meta');
  const footEl    = document.getElementById('rv-foot');
  const wrapEl    = document.getElementById('rv-body-wrap');
  if (!contentEl) return;

  if (!S.cards.length) {
    titleEl.textContent = '문서 없음';
    contentEl.innerHTML = '<p style="color:hsl(var(--muted-foreground))">카드를 추가하면 이곳에서 읽을 수 있습니다.</p>';
    metaEl.innerHTML = '';
    footEl.innerHTML = '';
    return;
  }

  let card = currentDocCardId != null ? S.cards.find(function(c) { return c.id === currentDocCardId; }) : null;
  if (!card) {
    const list = getOrderedCardList();
    card = list[0] || S.cards[0] || null;
    if (card) setCurrentDocCardId(card.id);
  }
  if (!card) return;

  if (wrapEl) wrapEl.style.setProperty('--rv-font-size', rvFontSize + 'rem');

  titleEl.textContent = card.title || '(제목 없음)';

  const col    = S.columns.find(function(c) { return c.id === card.colId; });
  const status = S.userData.status[card.id] || 'wait';
  const pLabel = { high: '높음', mid: '보통', low: '낮음' }[card.priority] || '보통';
  const sLabel = { wait: '학습대기', doing: '학습중', done: '학습완료' }[status];
  let mHtml = '';
  if (col) mHtml += '<span class="dv-meta-col"><span class="dv-meta-col-dot" style="background:' + (col.color || '#888') + '"></span>' + escapeHTML(col.title) + '</span>';
  mHtml += '<span class="dv-meta-prio ' + (card.priority || 'mid') + '">' + pLabel + '</span>';
  mHtml += '<span class="dv-meta-status ' + status + '">' + sLabel + '</span>';
  if (card.tags && card.tags.length) {
    mHtml += '<span class="dv-meta-tags">' + card.tags.map(function(t) {
      return '<span class="dv-meta-tag">' + escapeHTML(t) + '</span>';
    }).join('') + '</span>';
  }
  mHtml += '<span class="rv-meta-right">'
    + '<button class="rv-font-btn" id="rv-font-minus" title="글자 작게">A-</button>'
    + '<button class="rv-font-btn" id="rv-font-plus"  title="글자 크게">A+</button>'
    + '</span>';
  metaEl.innerHTML = mHtml;
  const fm = document.getElementById('rv-font-minus');
  const fp = document.getElementById('rv-font-plus');
  if (fm) fm.onclick = function() { rvSetFont(-0.0625); };
  if (fp) fp.onclick = function() { rvSetFont(+0.0625); };

  const bodyHtml = rvRenderCardBody(card);
  contentEl.innerHTML = bodyHtml;

  rvRenderToc(bodyHtml);
  requestAnimationFrame(rvInitTocObserver);

  const nav  = getPrevNextCard(card.id);
  const prev = nav.prev, next = nav.next;
  footEl.innerHTML =
    '<button class="rv-nav-btn-page prev-page" id="rv-prev"' + (prev ? '' : ' disabled') + '>'
    + '<span class="rv-nav-label">← 이전</span>'
    + '<span class="rv-nav-title">' + (prev ? escapeHTML(prev.title || '(제목 없음)') : '—') + '</span>'
    + '</button>'
    + '<button class="rv-nav-btn-page next-page" id="rv-next"' + (next ? '' : ' disabled') + '>'
    + '<span class="rv-nav-label">다음 →</span>'
    + '<span class="rv-nav-title">' + (next ? escapeHTML(next.title || '(제목 없음)') : '—') + '</span>'
    + '</button>';
  if (prev) document.getElementById('rv-prev').onclick = function() { openReaderView(prev.id); };
  if (next) document.getElementById('rv-next').onclick = function() { openReaderView(next.id); };

  rvRenderDocList(card.id);

  rvBindToggle('rv-toggle-list', 'left');
  rvBindToggle('rv-toggle-toc',  'right');
  rvBindPanelHover('rv-panel-left',  'left');
  rvBindPanelHover('rv-panel-right', 'right');

  rvInitNav();
  rvSyncThemeIcon();
  rvInitScrollHide();

  rvLastScrollY = 0;
  window.scrollTo(0, 0);
}

subscribe('reader', renderReader);

// ── 뷰 전환 훅: header/sidebar 숨김, is-reader 클래스 ─

registerPostSwitchHook(function(v) {
  const appHeader  = document.getElementById('header');
  const appSidebar = document.getElementById('sidebar');
  const isReader = v === 'reader';
  document.body.classList.toggle('is-reader', isReader);
  if (appHeader)  appHeader.style.display  = isReader ? 'none' : '';
  if (appSidebar) appSidebar.style.display = isReader ? 'none' : '';
  if (!isReader) {
    const topbar = document.getElementById('rv-topbar');
    if (topbar) topbar.classList.remove('rv-topbar-hidden');
    rvLastScrollY = 0;
  }
});

// ── 테마 변경 시 아이콘 동기화 ────────────────────────

registerThemeChangeHook(function() { rvSyncThemeIcon(); });
