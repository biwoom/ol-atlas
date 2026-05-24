// src/components/sidebar.js
// ── 사이드바 ──────────────────────────────────────────

import { S }                        from '../../core/state.js';
import { ce, escapeHTML }           from '../../core/utils.js';
import { ICONS_X }                  from '../../core/constants.js';
import { currentView, currentDocCardId } from '../../core/router.js';
import { switchView }               from '../../core/router.js';
import { selectedColId, setSelectedColId, selectedTags, sbFilter, setPrefixFilter, initCustomSelect } from '../../ui/custom-select.js';
import { sbTagQuery, setSbTagQuery, sbDocExpanded, getAllTags } from '../../core/tag-filter.js';
import { updateTagFilterBtn }       from '../../core/tag-filter.js';
import { parseTag, buildPrefixIndex, getFreeTags } from '../../core/tag-parser.js';
import { queueRender }              from '../../core/render-queue.js';
import { subscribe }                from '../../core/store.js';
import { SB_ICONS, buildAboutTrashSection } from './about.js';
import { highlightText }            from '../../data/search/search.js';
import { goToDocCard }              from './docview.js';
import { openCoverEditor }          from '../author/cover-editor.js';

function renderSidebar() {
  const el = document.getElementById('sb-inner');
  el.innerHTML = '';

  if (currentView === 'document') {
    renderSidebarForDocView(el);
    return;
  }

  const activeColId = (currentView === 'cards') ? selectedColId : null;
  const sec2 = ce('div','sb-section');
  sec2.appendChild(ce('div','sb-label','컬럼'));

  const allColRow = ce('div', 'sb-col-row' + (activeColId === null && currentView === 'cards' ? ' active' : ''));
  const dotAll = ce('div','sb-col-dot sb-col-dot-all');
  const nmAll  = ce('span','sb-col-name','모든 컬럼');
  const cntAll = ce('span','sb-col-cnt', String(S.cards.length));
  allColRow.append(dotAll, nmAll, cntAll);
  allColRow.onclick = () => { setSelectedColId(null); switchView('cards'); };
  sec2.appendChild(allColRow);

  S.columns.forEach(col => {
    const row = ce('div', 'sb-col-row' + (activeColId === col.id ? ' active' : ''));
    const dot = ce('div','sb-col-dot'); dot.style.background = col.color;
    const nm  = ce('span','sb-col-name', col.title);
    const cnt = ce('span','sb-col-cnt', String(S.cards.filter(c=>c.colId===col.id).length));
    row.append(dot, nm, cnt);
    row.onclick = () => { setSelectedColId(col.id); switchView('cards'); };
    sec2.appendChild(row);
  });
  el.appendChild(sec2);

  el.appendChild(ce('div','sb-divider'));

  const sec3 = ce('div','sb-section');
  sec3.appendChild(ce('div','sb-label','그룹'));
  const fgEl = document.getElementById('cg-fg');
  const activeGroup = (currentView === 'cards' && fgEl) ? (fgEl.value || '') : null;
  const totalCount = S.cards.length;
  const allItem = ce('div', 'sb-item' + (activeGroup === '' && currentView === 'cards' ? ' active' : ''));
  allItem.innerHTML = `<span class="sb-item-icon">${SB_ICONS.layers}</span><span style="flex:1">모든 그룹</span><span class="sb-item-count">${totalCount}</span>`;
  allItem.onclick = () => { if (fgEl) fgEl.value = ''; switchView('cards'); };
  sec3.appendChild(allItem);

  const groups = [...new Set(S.cards.map(c=>c.group).filter(Boolean))];
  groups.forEach(g => {
    const cnt = S.cards.filter(c=>c.group===g).length;
    const item = ce('div', 'sb-item' + (activeGroup === g ? ' active' : ''));
    item.innerHTML = `<span class="sb-item-icon">${SB_ICONS.hash}</span><span style="flex:1">${escapeHTML(g)}</span><span class="sb-item-count">${cnt}</span>`;
    item.onclick = () => { if (fgEl) fgEl.value = g; switchView('cards'); };
    sec3.appendChild(item);
  });
  el.appendChild(sec3);

  el.appendChild(ce('div','sb-divider'));

  const prefixIndex = buildPrefixIndex(S.cards);
  const hasPrefixTags = Object.keys(prefixIndex).length > 0;

  if (hasPrefixTags) {
    const prefixSection = document.createElement('div');
    prefixSection.id = 'sb-prefix-section';

    const tsSection = ce('div', 'sb-section');
    const tsWrap = document.createElement('div');
    tsWrap.className = 'sb-tag-search';
    const clearHtml = sbTagQuery
      ? `<button class="sb-tag-search-clear" id="sb-tag-search-clear" aria-label="지우기">×</button>` : '';
    tsWrap.innerHTML = `
      <span class="sb-tag-search-icon">${ICONS_X.search}</span>
      <input type="text" class="sb-tag-search-input" id="sb-tag-search-input"
             placeholder="태그 검색…" value="${escapeHTML(sbTagQuery)}">${clearHtml}`;
    tsSection.appendChild(tsWrap);
    prefixSection.appendChild(tsSection);

    const tsi = tsWrap.querySelector('#sb-tag-search-input');
    if (tsi) {
      let _composing = false;
      tsi.addEventListener('compositionstart', () => { _composing = true; });
      tsi.addEventListener('compositionend', e => {
        _composing = false;
        setSbTagQuery(e.target.value);
        setTimeout(() => { if (!_composing) queueRender('sidebar'); }, 0);
      });
      tsi.addEventListener('input', e => {
        setSbTagQuery(e.target.value);
        if (_composing) return;
        setTimeout(() => { if (!_composing) queueRender('sidebar'); }, 0);
      });
      if (sbTagQuery) {
        requestAnimationFrame(() => {
          const inp = document.getElementById('sb-tag-search-input');
          if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        });
      }
    }
    const tsc = tsWrap.querySelector('#sb-tag-search-clear');
    if (tsc) tsc.onclick = () => { setSbTagQuery(''); queueRender('sidebar'); };

    const freeTags = getFreeTags(S.cards);
    if (freeTags.length > 0) {
      const selectedFree = [...selectedTags].find(t => freeTags.includes(t)) || '';
      const freeDropdown = buildSbDropdown(
        '태그', '__free', freeTags, selectedFree,
        v => {
          selectedTags.clear();
          if (v) selectedTags.add(v);
          if (currentView !== 'cards') switchView('cards');
          else { queueRender('cards'); updateTagFilterBtn(); queueRender('sidebar'); }
        }
      );
      if (freeDropdown) prefixSection.appendChild(freeDropdown);
    }

    Object.keys(prefixIndex).forEach(prefix => {
      const selectedVal = (sbFilter.prefix && sbFilter.prefix.prefix === prefix)
        ? sbFilter.prefix.value : '';
      const pd = buildSbDropdown(
        prefix, prefix, prefixIndex[prefix],
        selectedVal,
        v => setPrefixFilter(prefix, v)
      );
      if (pd) prefixSection.appendChild(pd);
    });

    el.appendChild(prefixSection);
  } else {
    const sec4 = ce('div','sb-section sb-tag-section');
    const tagHead = ce('div','sb-tag-head');
    const tagHeadLabel = ce('span','sb-label','태그');
    tagHeadLabel.style.padding = '0';
    const tagCount = ce('span','sb-tag-count','');
    tagHead.append(tagHeadLabel, tagCount);
    sec4.appendChild(tagHead);

    const tagSearchWrap = ce('div','sb-tag-search');
    const clearBtnHtml = sbTagQuery ? `<button class="sb-tag-search-clear" id="sb-tag-search-clear" aria-label="지우기">×</button>` : '';
    tagSearchWrap.innerHTML = `
      <span class="sb-tag-search-icon">${ICONS_X.search}</span>
      <input type="text" class="sb-tag-search-input" id="sb-tag-search-input"
             placeholder="태그 검색…" value="${escapeHTML(sbTagQuery)}">${clearBtnHtml}`;
    sec4.appendChild(tagSearchWrap);

    const tagListEl = ce('div','sb-tag-list');
    const tagMap = getAllTags();
    const allTags = Object.keys(tagMap).sort();
    const q = sbTagQuery.trim().toLowerCase();
    const filteredTags = q ? allTags.filter(t => t.toLowerCase().includes(q)) : allTags;

    if (!filteredTags.length) {
      tagListEl.appendChild(ce('div','sb-tag-empty', q ? '검색 결과 없음' : '태그 없음'));
    } else {
      filteredTags.forEach(tag => {
        const item = ce('div','sb-tag-item' + (selectedTags.has(tag) ? ' selected' : ''));
        const markHtml = selectedTags.has(tag) ? '✓' : ICONS_X.tag;
        const displayName = q ? highlightText(tag, q) : escapeHTML(tag);
        item.innerHTML = `
          <span class="sb-tag-mark">${markHtml}</span>
          <span class="sb-tag-name">${displayName}</span>
          <span class="sb-tag-cnt">${tagMap[tag]}</span>`;
        item.onclick = () => {
          if (selectedTags.has(tag)) selectedTags.delete(tag);
          else selectedTags.add(tag);
          if (currentView !== 'cards') switchView('cards');
          else { queueRender('cards'); updateTagFilterBtn(); queueRender('sidebar'); }
        };
        tagListEl.appendChild(item);
      });
    }
    sec4.appendChild(tagListEl);

    if (selectedTags.size > 0) {
      tagCount.textContent = selectedTags.size + ' 선택됨';
      const clearAll = ce('button','sb-tag-clear-all','선택 해제');
      clearAll.onclick = () => {
        selectedTags.clear(); setSbTagQuery('');
        queueRender('sidebar');
        if (currentView === 'cards') { queueRender('cards'); updateTagFilterBtn(); }
      };
      sec4.appendChild(clearAll);
    }
    el.appendChild(sec4);

    const tsi = document.getElementById('sb-tag-search-input');
    if (tsi) {
      let _composing = false;
      tsi.addEventListener('compositionstart', () => { _composing = true; });
      tsi.addEventListener('compositionend', e => {
        _composing = false; setSbTagQuery(e.target.value);
        refreshSbTagList(tagListEl, sec4); refreshSbTagClearBtn(sec4);
      });
      tsi.addEventListener('input', e => {
        setSbTagQuery(e.target.value);
        refreshSbTagList(tagListEl, sec4);
        if (!_composing) refreshSbTagClearBtn(sec4);
      });
    }
    const tsc = document.getElementById('sb-tag-search-clear');
    if (tsc) tsc.onclick = () => { setSbTagQuery(''); queueRender('sidebar'); };
  }

  el.appendChild(ce('div','sb-divider'));
  buildCoverEditorSection(el);

  el.appendChild(ce('div','sb-divider'));
  buildAboutTrashSection(el);

  el.appendChild(ce('div','sb-divider'));
  const meta = ce('div','sb-meta');
  meta.innerHTML = `
    <span class="sb-meta-line"><strong style="color:hsl(var(--foreground));font-weight:500">${escapeHTML(S.meta.title)}</strong></span>
    <span class="sb-meta-line">v${escapeHTML(S.meta.version)}</span>
  `;
  el.appendChild(meta);
}

function buildSbDropdown(label, key, values, selected, onChange) {
  const q = (typeof sbTagQuery === 'string') ? sbTagQuery.trim().toLowerCase() : '';
  const filtered = q ? values.filter(v => v.toLowerCase().includes(q)) : values;

  if (q && filtered.length === 0) return null;

  const wrap = document.createElement('div');
  wrap.className = 'sb-section';

  const title = document.createElement('div');
  title.className = 'sb-section-title';
  title.textContent = label;

  const sel = document.createElement('select');
  sel.className = 'sb-select';
  sel.dataset.key = key;

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '전체';
  sel.appendChild(defaultOpt);

  filtered.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (v === selected) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', e => onChange(e.target.value));

  wrap.appendChild(title);
  wrap.appendChild(sel);

  requestAnimationFrame(() => {
    if (sel.isConnected) initCustomSelect(sel);
  });

  return wrap;
}

function refreshSbTagList(tagListEl, sec4) {
  if (!tagListEl) return;
  const tagMap = getAllTags();
  const allTags = Object.keys(tagMap).sort();
  const q = sbTagQuery.trim().toLowerCase();
  const filteredTags = q ? allTags.filter(t => t.toLowerCase().includes(q)) : allTags;

  tagListEl.innerHTML = '';
  if (!filteredTags.length) {
    tagListEl.appendChild(ce('div','sb-tag-empty', q ? '검색 결과 없음' : '태그 없음'));
  } else {
    filteredTags.forEach(tag => {
      const item = ce('div','sb-tag-item' + (selectedTags.has(tag) ? ' selected' : ''));
      const markHtml = selectedTags.has(tag) ? '✓' : ICONS_X.tag;
      const displayName = q ? highlightText(tag, q) : escapeHTML(tag);
      item.innerHTML = `
        <span class="sb-tag-mark">${markHtml}</span>
        <span class="sb-tag-name">${displayName}</span>
        <span class="sb-tag-cnt">${tagMap[tag]}</span>`;
      item.onclick = () => {
        if (selectedTags.has(tag)) selectedTags.delete(tag);
        else selectedTags.add(tag);
        if (currentView !== 'cards') switchView('cards');
        else { queueRender('cards'); updateTagFilterBtn(); queueRender('sidebar'); }
      };
      tagListEl.appendChild(item);
    });
  }
  const countEl = sec4 && sec4.querySelector('.sb-tag-count');
  if (countEl) countEl.textContent = selectedTags.size > 0 ? selectedTags.size + ' 선택됨' : '';
}

function refreshSbTagClearBtn(sec4) {
  if (!sec4) return;
  const wrap = sec4.querySelector('.sb-tag-search');
  if (!wrap) return;
  const existing = wrap.querySelector('.sb-tag-search-clear');
  if (sbTagQuery && !existing) {
    const btn = document.createElement('button');
    btn.className = 'sb-tag-search-clear';
    btn.id = 'sb-tag-search-clear';
    btn.setAttribute('aria-label', '지우기');
    btn.textContent = '×';
    btn.onclick = () => { setSbTagQuery(''); queueRender('sidebar'); };
    wrap.appendChild(btn);
  } else if (!sbTagQuery && existing) {
    existing.remove();
  }
}

function renderSidebarForDocView(rootEl) {
  const sec = ce('div','sb-section');
  sec.appendChild(ce('div','sb-label','문서 목록'));

  if (!S.cards.length) {
    sec.appendChild(ce('div','sb-doc-tree-empty','카드가 없습니다'));
    rootEl.appendChild(sec);
    return;
  }

  S.columns.forEach(col => {
    const cardsInCol = S.cards.filter(c => c.colId === col.id);
    if (!cardsInCol.length) return;

    const byGroup = {};
    const NO_GROUP = '__no_group__';
    cardsInCol.forEach(c => {
      const g = c.group || NO_GROUP;
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(c);
    });
    const groupNames = Object.keys(byGroup);

    const colNode = ce('div','sb-tree-col');
    const colKey = 'col_' + col.id;
    const expanded = sbDocExpanded[colKey] !== false;

    const colHead = ce('div','sb-tree-col-head');
    const chevBtn = ce('button','sb-tree-chevron');
    chevBtn.setAttribute('aria-expanded', String(expanded));
    chevBtn.innerHTML = expanded ? ICONS_X.chevronDown : ICONS_X.chevronRight;
    const colDot = ce('span','sb-tree-col-dot');
    colDot.style.background = col.color;
    const colName = ce('span','sb-tree-col-name', col.title);
    const colCnt  = ce('span','sb-tree-col-cnt', String(cardsInCol.length));
    colHead.append(chevBtn, colDot, colName, colCnt);
    colNode.appendChild(colHead);

    const colBody = ce('div','sb-tree-col-body');
    if (!expanded) colBody.style.display = 'none';

    groupNames.forEach(gn => {
      const groupCards = byGroup[gn];
      const isNoGroup  = gn === NO_GROUP;

      if (groupNames.length === 1 && isNoGroup) {
        groupCards.forEach(card => colBody.appendChild(buildDocTreeCard(card)));
        return;
      }

      const gNode = ce('div','sb-tree-grp');
      const gKey  = 'grp_' + col.id + '_' + gn;
      const gExp  = sbDocExpanded[gKey] !== false;
      const gHead = ce('div','sb-tree-grp-head');
      const gChev = ce('button','sb-tree-chevron sb-tree-chevron-sm');
      gChev.innerHTML = gExp ? ICONS_X.chevronDown : ICONS_X.chevronRight;
      const gName = ce('span','sb-tree-grp-name', isNoGroup ? '(그룹 없음)' : escapeHTML(gn));
      const gCnt  = ce('span','sb-tree-grp-cnt', String(groupCards.length));
      gHead.append(gChev, gName, gCnt);
      gNode.appendChild(gHead);

      const gBody = ce('div','sb-tree-grp-body');
      if (!gExp) gBody.style.display = 'none';
      groupCards.forEach(card => gBody.appendChild(buildDocTreeCard(card)));
      gNode.appendChild(gBody);

      gHead.onclick = () => { sbDocExpanded[gKey] = !gExp; queueRender('sidebar'); };
      colBody.appendChild(gNode);
    });

    colNode.appendChild(colBody);
    colHead.onclick = (e) => {
      if (e.target === chevBtn || chevBtn.contains(e.target) || e.target === colHead) {
        sbDocExpanded[colKey] = !expanded;
        queueRender('sidebar');
      }
    };
    sec.appendChild(colNode);
  });

  rootEl.appendChild(sec);

  rootEl.appendChild(ce('div','sb-divider'));
  buildCoverEditorSection(rootEl);

  rootEl.appendChild(ce('div','sb-divider'));
  buildAboutTrashSection(rootEl);

  rootEl.appendChild(ce('div','sb-divider'));
  const meta = ce('div','sb-meta');
  meta.innerHTML = `
    <span class="sb-meta-line"><strong style="color:hsl(var(--foreground));font-weight:500">${escapeHTML(S.meta.title)}</strong></span>
    <span class="sb-meta-line">v${escapeHTML(S.meta.version)}</span>
  `;
  rootEl.appendChild(meta);

  requestAnimationFrame(() => {
    const active = rootEl.querySelector('.sb-tree-card.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  });
}

function buildDocTreeCard(card) {
  const item = ce('div', 'sb-tree-card' + (card.id === currentDocCardId ? ' active' : ''));
  item.innerHTML = `<span class="sb-tree-card-title">${escapeHTML(card.title || '(제목 없음)')}</span>`;
  item.onclick = () => {
    if (currentView !== 'document') switchView('document');
    goToDocCard(card.id);
  };
  return item;
}

function buildCoverEditorSection(rootEl) {
  const sec = ce('div', 'sb-section');
  const item = ce('div', 'sb-item' + (currentView === 'cover-editor' ? ' active' : ''));
  item.innerHTML = `
    <span class="sb-item-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <path d="M14 2v6h6"></path>
        <path d="M16 13H8"></path>
        <path d="M16 17H8"></path>
      </svg>
    </span>
    <span>표지 편집</span>`;
  item.onclick = () => {
    openCoverEditor();
  };
  sec.appendChild(item);

  const bookItem = ce('div', 'sb-item');
  bookItem.innerHTML = `
    <span class="sb-item-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </span>
    <span>BOOK으로 배포</span>`;
  bookItem.onclick = () => {
    const fn = window.__OL_EXPORT_BOOK__;
    if (typeof fn === 'function') fn();
  };
  sec.appendChild(bookItem);
  rootEl.appendChild(sec);
}

subscribe('sidebar', renderSidebar);
