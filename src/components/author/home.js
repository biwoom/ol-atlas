// src/components/home.js
// ── Home (Landing Page) ───────────────────────────────

import { S } from '../../core/state.js';
import { ce, escapeHTML, sanitizeURL } from '../../core/utils.js';
import { ORIGIN, ICONS_X, OL_PROJECTS } from '../../core/constants.js';
import { switchView } from '../../core/router.js';
import { subscribe } from '../../core/store.js';
import { toggleTheme } from '../../core/theme.js';

const HOME_ICONS = {
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"></path><path d="M5 5.5A3.5 3.5 0 0 1 8.5 9H12"></path><path d="M12 9h3.5A3.5 3.5 0 0 1 19 5.5"></path><path d="M5 18.5A3.5 3.5 0 0 1 8.5 15H12"></path><path d="M12 15h3.5A3.5 3.5 0 0 0 19 18.5"></path></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="18" x="3" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="16" rx="1"></rect></svg>',
  fileText: ICONS_X.fileText,
  search: ICONS_X.search,
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>',
  arrow: ICONS_X.chevronRight,
};

function makeBadge(label, value) {
  if (!value) return '';
  return `<span class="home-meta-pill"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></span>`;
}

function makeFeatureCard(icon, title, desc) {
  return `
    <article class="home-feature-card">
      <div class="home-feature-icon">${icon}</div>
      <div class="home-feature-title">${escapeHTML(title)}</div>
      <div class="home-feature-desc">${escapeHTML(desc)}</div>
    </article>`;
}

function makeProjectCard(project) {
  const href = project.url ? sanitizeURL(project.url) : '#';
  return `
    <a class="home-project-card" href="${escapeHTML(href)}" ${href !== '#' ? 'target="_blank" rel="noopener"' : ''}>
      <div class="home-project-top">
        <span class="home-project-tag">${escapeHTML(project.tag || 'OL BOOK')}</span>
        <span class="home-project-arrow">${HOME_ICONS.arrow}</span>
      </div>
      <div class="home-project-title">${escapeHTML(project.name || '')}</div>
      <div class="home-project-desc">${escapeHTML(project.desc || '')}</div>
    </a>`;
}

function renderHome() {
  const wrap = document.getElementById('home-inner');
  if (!wrap) return;

  const meta = S.meta || {};
  const bi = meta.bookInfo || {};
  const bookTitle = bi.bookTitle || meta.title || 'OL ATLAS';
  const subtitle = bi.subtitle || '한 파일에 담는 불교 콘텐츠 제작 도구 ';
  const description = bi.description || 'ATLAS는 단일 HTML 파일로 동작하는 불교 콘텐츠 에디터 & 뷰어.';
  const authorLine = [bi.author, bi.translator ? `역 ${bi.translator}` : ''].filter(Boolean).join(' · ');
  const publishLine = [bi.publisher, bi.publishedAt ? `초판 ${bi.publishedAt}` : '', bi.revisedAt ? `개정 ${bi.revisedAt}` : ''].filter(Boolean).join(' · ');
  const versionLine = [bi.bookVersion ? `책 버전 ${bi.bookVersion}` : '', meta.version ? `앱 ${meta.version}` : ''].filter(Boolean).join(' · ');
  const coverColor = bi.coverColor || 'hsl(40 35% 90%)';

  wrap.innerHTML = '';
  const page = ce('div', 'home-page');

  const topbar = ce('header', 'home-topbar');
  topbar.innerHTML = `
    <div class="home-topbar-inner">
      <div class="home-brand" role="button" tabindex="0" aria-label="홈으로">
        <div class="h-brand-mark">
          <em>OL</em>
          <span class="h-brand-mark-info"></span>
        </div>
      </div>
      <nav class="home-nav" aria-label="홈 메뉴">
        <button class="home-nav-btn" id="home-doc-btn">독서</button>
        <button class="home-nav-btn" id="home-start-btn">편집</button>
        <button class="home-nav-btn" id="home-about-btn">About</button>
      </nav>
      <div class="home-actions">
        <button class="theme-toggle" id="home-theme-toggle" title="라이트/다크/독서 모드 전환" aria-label="테마 전환">
          <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
          <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
          <svg class="icon icon-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        </button>
      </div>
    </div>`;
  page.appendChild(topbar);

  const hero = ce('section', 'home-hero');
  hero.id = 'home-hero';
  hero.style.setProperty('--home-cover', coverColor);
  hero.innerHTML = `
    <div class="home-hero-copy">
      <div class="home-hero-eyebrow">${escapeHTML(ORIGIN.tool)}</div>
      <h1 class="home-hero-title">${escapeHTML(bookTitle)}</h1>
      <div class="home-hero-subtitle">${escapeHTML(subtitle)}</div>
      <p class="home-hero-desc">${escapeHTML(description)}</p>
      ${authorLine ? `<div class="home-meta-line">${escapeHTML(authorLine)}</div>` : ''}
      ${publishLine ? `<div class="home-meta-line">${escapeHTML(publishLine)}</div>` : ''}
      ${versionLine ? `<div class="home-meta-line">${escapeHTML(versionLine)}</div>` : ''}
      <div class="home-hero-actions">
        <button class="btn pri" id="home-hero-start">편집 시작</button>
        <button class="btn" id="home-hero-doc">책 펼치기</button>
      </div>
    </div>`;
  page.appendChild(hero);

  const footer = ce('footer', 'home-footer');
  footer.id = 'home-footer';
  footer.innerHTML = `
    <div class="home-footer-line">${escapeHTML(ORIGIN.tool)}</div>
    <div class="home-footer-line">License: ${escapeHTML(ORIGIN.license)} · <a href="https://${ORIGIN.site}" target="_blank" rel="noopener">${escapeHTML(ORIGIN.site)}</a></div>
    <div class="home-footer-line">Copyright ${escapeHTML(ORIGIN.copyright)}</div>`;
  page.appendChild(footer);

  wrap.appendChild(page);

  const brand = topbar.querySelector('.home-brand');
  if (brand) {
    const goHomeTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    brand.addEventListener('click', goHomeTop);
    brand.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goHomeTop();
      }
    });
  }

  document.getElementById('home-theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('home-start-btn')?.addEventListener('click', () => switchView('kanban'));
  document.getElementById('home-hero-start')?.addEventListener('click', () => switchView('kanban'));
  document.getElementById('home-doc-btn')?.addEventListener('click', () => switchView('reader'));
  document.getElementById('home-hero-doc')?.addEventListener('click', () => switchView('document'));
  document.getElementById('home-about-btn')?.addEventListener('click', () => switchView('about'));
  document.getElementById('home-about-btn-2')?.addEventListener('click', () => switchView('about'));
}

subscribe('home', renderHome);
