// src/data/search/search.js
// ── 검색 ────────────────────────────────────────────

// ══════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════
let searchActive = false;
let searchResults = [];

function highlightText(text, query) {
  if (!query || !text) return escapeHTML(text || '');
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapeHTML(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function runSearch(q) {
  if (!q || q.length < 1) { closeSearch(); return; }
  const lower = q.toLowerCase();
  searchResults = S.cards.filter(c => {
    if (c.title && c.title.toLowerCase().includes(lower)) return true;
    if (c.group && c.group.toLowerCase().includes(lower)) return true;
    if (c.tags  && c.tags.some(t => t.toLowerCase().includes(lower))) return true;
    // 본문은 plain/markdown 양쪽 모두 검사
    const haystack = cardSearchText(c).toLowerCase();
    return haystack.includes(lower);
  });
  renderSearchDropdown(q);
}

function renderSearchDropdown(q) {
  const dd   = document.getElementById('search-dropdown');
  const list = document.getElementById('sd-list');
  const kw   = document.getElementById('sd-keyword');
  const cnt  = document.getElementById('sd-count');

  kw.innerHTML  = `"<em>${q}</em>" 검색 결과`;
  cnt.textContent = `${searchResults.length}건`;
  list.innerHTML = '';

  if (!searchResults.length) {
    list.innerHTML = `
      <div class="sd-empty">
        <svg class="sd-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <div class="sd-empty-title">결과가 없습니다</div>
        <div class="sd-empty-sub">"${q}"와(과) 일치하는 카드를 찾지 못했어요</div>
      </div>
    `;
  } else {
    searchResults.forEach((card, i) => {
      const item = document.createElement('div');
      item.className = 'sd-item';
      item.dataset.idx = i;

      const col = S.columns.find(c => c.id === card.colId);
      const bodySnippet = (() => {
        const src = cardPreviewText(card);
        if (!src) return '';
        const lower = q.toLowerCase();
        const idx = src.toLowerCase().indexOf(lower);
        if (idx === -1) return src.slice(0, 80) + (src.length > 80 ? '…' : '');
        const start = Math.max(0, idx - 30);
        const end   = Math.min(src.length, idx + q.length + 60);
        return (start > 0 ? '…' : '') + src.slice(start, end) + (end < src.length ? '…' : '');
      })();

      item.innerHTML = `
        <div class="sd-item-top">
          <span class="sd-item-title">${highlightText(card.title, q)}</span>
          ${card.group ? `<span class="sd-item-group">${escapeHTML(card.group)}</span>` : ''}
          ${col ? `<span class="sd-item-group" style="color:${col.color}">${escapeHTML(col.title)}</span>` : ''}
        </div>
        ${bodySnippet ? `<div class="sd-item-body">${highlightText(bodySnippet, q)}</div>` : ''}
      `;
      item.addEventListener('click', () => {
        closeSearch();
        openCardModal(card);
      });
      list.appendChild(item);
    });
  }

  // 드롭다운 위치: 검색 입력폼 기준
  const inputRect = document.getElementById('h-search-input').getBoundingClientRect();
  dd.style.left  = inputRect.left + 'px';
  dd.style.width = Math.max(420, inputRect.width) + 'px';
  dd.classList.add('open');
  searchActive = true;
}

function closeSearch() {
  document.getElementById('search-dropdown').classList.remove('open');
  searchActive = false;
}

// 검색 입력 이벤트
const searchInput = document.getElementById('h-search-input');
const searchClear = document.getElementById('h-search-clear');
const searchKbd   = document.getElementById('h-search-kbd');

// macOS 가 아니면 modifier 표시를 Ctrl 로 변경
(function() {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  if (isMac) return;
  if (searchKbd) searchKbd.textContent = 'Ctrl K';
  // 카드 모달 저장 버튼의 ⌘↵ → Ctrl ↵
  document.querySelectorAll('.kbd-hint').forEach(el => {
    el.textContent = el.textContent.replace('⌘', 'Ctrl ');
  });
})();

let searchDebounce;
searchInput.addEventListener('input', function() {
  const q = this.value.trim();
  searchClear.style.display = q ? 'flex' : 'none';
  clearTimeout(searchDebounce);
  if (!q) { closeSearch(); return; }
  searchDebounce = setTimeout(() => runSearch(q), 180);
});

searchInput.addEventListener('focus', function() {
  if (this.value.trim()) runSearch(this.value.trim());
});

searchInput.addEventListener('keydown', function(e) {
  // 한글 IME 합성 중 keydown 무시 (브라우저가 합성 종료 처리)
  if (e.isComposing || e.keyCode === 229) return;

  // Enter 는 form-submit / 기타 우발 default action 차단
  // (검색 결과 키보드 네비게이션은 의도적으로 제공하지 않음 — 마우스 클릭 사용)
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  closeSearch();
  searchInput.focus();
});

// 외부 클릭 시 검색 드롭다운 닫기
document.addEventListener('click', e => {
  const dd = document.getElementById('search-dropdown');
  const wrap = document.querySelector('.h-search-wrap');
  if (!dd.contains(e.target) && !wrap.contains(e.target)) closeSearch();
});
