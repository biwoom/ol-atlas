// src/components/reader/cover-page.js
// ── BOOK 커버페이지 렌더러 ───────────────────────────

import { S } from '../../core/state.js';
import { escapeHTML } from '../../core/utils.js';
import { switchView } from '../../core/router.js';
import { subscribe } from '../../core/store.js';

function renderCoverPage() {
  const el = document.getElementById('cover-page-inner');
  if (!el) return;

  const m = (S.book && S.book.manifest) || {};
  const title = m.title || '(제목 없음)';
  const subtitle = m.subtitle || '';
  const author = m.author || '';
  const coverImg = m.cover && m.cover.image ? m.cover.image : null;

  el.innerHTML = `
    <div class="cover-page">
      <div class="cover-page-card">
        ${coverImg
          ? `<img class="cover-image" src="${coverImg}" alt="${escapeHTML(title)}">`
          : '<div class="cover-image-placeholder"></div>'
        }
        <h1 class="cover-title">${escapeHTML(title)}</h1>
        ${subtitle ? `<p class="cover-subtitle">${escapeHTML(subtitle)}</p>` : ''}
        ${author ? `<p class="cover-author">${escapeHTML(author)}</p>` : ''}
        <div class="cover-actions">
          <button class="btn btn-secondary cover-btn-toc" data-action="toc">목차</button>
          <button class="btn btn-primary cover-btn-start" data-action="start">읽기 시작</button>
        </div>
      </div>
    </div>
  `;

  const root = el.querySelector('.cover-page');
  if (!root) return;

  root.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'toc') {
      switchView('kanban');
    } else if (btn.dataset.action === 'start') {
      switchView('kanban');
    }
  });
}

subscribe('cover-page', renderCoverPage);

