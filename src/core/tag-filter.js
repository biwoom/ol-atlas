// src/core/tag-filter.js
// ── 태그 필터 + 카드뷰 컬럼 필터 상태 ──────────────

import { S } from './state.js';
import { queueRender } from './render-queue.js';
import { selectedTags } from '../ui/custom-select.js';
import { closeSearch } from '../data/search/search.js';

export let sbTagQuery = '';
export function setSbTagQuery(q) { sbTagQuery = q; }
export const sbDocExpanded = {};
export let _currentEditingCard = null;

export function setCurrentEditingCard(card) { _currentEditingCard = card; }

export function getAllTags() {
  const map = {};
  S.cards.forEach(c => (c.tags || []).forEach(t => {
    const k = t.trim();
    if (k) map[k] = (map[k] || 0) + 1;
  }));
  return map;
}

export function renderTagFilterDropdown() {
  const container = document.getElementById('tfd-items');
  container.innerHTML = '';
  const tagMap = getAllTags();
  const tags = Object.keys(tagMap).sort();

  if (!tags.length) {
    container.innerHTML = '<div class="tfd-empty">태그가 없습니다</div>';
    return;
  }

  tags.forEach(tag => {
    const item = document.createElement('div');
    item.className = 'tfd-item';

    const checked = selectedTags.has(tag);

    const chk = document.createElement('div');
    chk.className = 'tfd-check' + (checked ? ' checked' : '');
    chk.textContent = checked ? '✓' : '';

    const nm = document.createElement('span');
    nm.className = 'tfd-tag-name';
    nm.textContent = tag;

    const cnt = document.createElement('span');
    cnt.className = 'tfd-tag-cnt';
    cnt.textContent = tagMap[tag];

    item.append(chk, nm, cnt);

    item.addEventListener('click', e => {
      e.stopPropagation();
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
      updateTagFilterBtn();
      renderTagFilterDropdown();
      queueRender('cards');
    });
    container.appendChild(item);
  });
}

export function updateTagFilterBtn() {
  const btn   = document.getElementById('tag-filter-btn');
  const badge = document.getElementById('tag-filter-badge');
  const label = document.getElementById('tag-filter-label');
  const cnt   = selectedTags.size;

  if (cnt === 0) {
    btn.classList.remove('has-filter');
    badge.style.display = 'none';
    label.textContent = '태그 필터';
  } else {
    btn.classList.add('has-filter');
    badge.style.display = 'inline-block';
    badge.textContent = cnt;
    label.textContent = cnt === 1 ? `#${[...selectedTags][0]}` : `${cnt}개 태그`;
  }
}

document.getElementById('tag-filter-btn').addEventListener('click', e => {
  e.stopPropagation();
  const dd = document.getElementById('tag-filter-dropdown');
  const isOpen = dd.classList.contains('open');
  closeSearch();
  if (isOpen) {
    dd.classList.remove('open');
  } else {
    renderTagFilterDropdown();
    dd.classList.add('open');
  }
});

document.getElementById('tfd-clear-btn').addEventListener('click', e => {
  e.stopPropagation();
  selectedTags.clear();
  updateTagFilterBtn();
  renderTagFilterDropdown();
  queueRender('cards');
});

document.addEventListener('click', e => {
  const wrap = document.getElementById('tag-filter-wrap');
  if (!wrap.contains(e.target)) {
    document.getElementById('tag-filter-dropdown').classList.remove('open');
  }
});
