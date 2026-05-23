// src/components/cardgrid.js
// ── 카드 그리드 뷰 + 라쏘 선택 ─────────────────────

import { S }                        from '../../core/state.js';
import { ce }                       from '../../core/utils.js';
import { buildEmptyState }          from '../../core/normalize.js';
import { cardPreviewText }          from '../../core/body-helpers.js';
import { parseTag }                 from '../../core/tag-parser.js';
import { subscribe }                from '../../core/store.js';
import { selectedColId, selectedTags, sbFilter, setSelectedColId } from '../../ui/custom-select.js';
import { queueRender }              from '../../core/render-queue.js';
import { cgSelected, updateBulkBar, initBulkBar, toggleSelectAll } from './bulk-select.js';
import { openCardModal }            from './card-modal.js';
import { openDocCard }              from '../shared/docview.js';
import { getCgSort, setCgSort }     from './listview.js';

export function renderCards() {
  const grid = document.getElementById('cg-grid');
  grid.innerHTML = '';
  const fg = document.getElementById('cg-fg').value;
  const fs = document.getElementById('cg-fs').value;
  const groups = [...new Set(S.cards.map(c=>c.group).filter(Boolean))];
  const fgEl = document.getElementById('cg-fg');
  const prevFg = fgEl.value;
  fgEl.innerHTML = '<option value="">모든 그룹</option>';
  groups.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; if(g===prevFg) o.selected=true; fgEl.appendChild(o); });

  let cards = [...S.cards];
  if (selectedColId != null) cards = cards.filter(c => c.colId === selectedColId);
  if (fg) cards = cards.filter(c=>c.group===fg);
  if (fs) cards = cards.filter(c=>(S.userData.status[c.id]||'wait')===fs);
  if (selectedTags.size > 0) {
    cards = cards.filter(c => (c.tags||[]).some(t => selectedTags.has(t.trim())));
  }
  if (sbFilter.prefix) {
    const { prefix: fp, value: fv } = sbFilter.prefix;
    cards = cards.filter(c => (c.tags||[]).some(tag => {
      const p = parseTag(tag);
      return p.prefix === fp && p.value === fv;
    }));
  }

  const sortEl = document.getElementById('cg-sort');
  if (sortEl) {
    sortEl.value = getCgSort();
    setCgSort(sortEl.value);
  }
  const cgSort = getCgSort();
  const PRIO_ORD = { high:0, mid:1, low:2 };
  const STAT_ORD = { doing:0, wait:1, done:2 };
  if (cgSort === 'title')    cards.sort((a,b)=>(a.title||'').localeCompare(b.title||'','ko'));
  if (cgSort === 'priority') cards.sort((a,b)=>(PRIO_ORD[a.priority]??1)-(PRIO_ORD[b.priority]??1));
  if (cgSort === 'status')   cards.sort((a,b)=>(STAT_ORD[S.userData.status[a.id]||'wait'])-(STAT_ORD[S.userData.status[b.id]||'wait']));
  if (cgSort === 'created')  cards.sort((a,b)=>(b.created||'').localeCompare(a.created||''));

  const chipEl = document.getElementById('cg-active-col-chip');
  if (chipEl) {
    if (selectedColId != null) {
      const col = S.columns.find(c => c.id === selectedColId);
      if (col) {
        chipEl.style.display = 'inline-flex';
        document.getElementById('cg-chip-dot').style.background = col.color;
        document.getElementById('cg-chip-name').textContent = col.title;
        const clearBtn = document.getElementById('cg-chip-clear');
        if (clearBtn) clearBtn.onclick = () => { setSelectedColId(null); queueRender('cards'); queueRender('sidebar'); };
      } else {
        chipEl.style.display = 'none';
      }
    } else {
      chipEl.style.display = 'none';
    }
  }

  const saBtn = document.getElementById('cg-select-all');
  if (saBtn) {
    const allSelected = cards.length > 0 && cards.every(c => cgSelected.has(c.id));
    saBtn.textContent = allSelected ? '선택 해제' : '전체 선택';
    saBtn.classList.toggle('all-selected', allSelected);
    saBtn.onclick = () => toggleSelectAll('cg', cards);
  }

  if (!cards.length) {
    const hasFilter = !!(fg || fs || selectedTags.size > 0 || selectedColId != null);
    const empty = hasFilter
      ? buildEmptyState('filter', '조건에 맞는 카드가 없습니다', '필터를 조정해보세요')
      : buildEmptyState('cards', '카드가 없습니다', '칸반 뷰에서 첫 카드를 추가해보세요');
    empty.classList.add('cg-empty');
    grid.appendChild(empty);
    updateBulkBar('cg');
    return;
  }

  cards.forEach(card => {
    const div = ce('div','cg-card');
    div.dataset.id = card.id;
    if (cgSelected.has(card.id)) div.classList.add('selected');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'bulk-checkbox';
    cb.checked = cgSelected.has(card.id);
    cb.addEventListener('click', e => {
      e.stopPropagation();
      if (cb.checked) cgSelected.add(card.id);
      else cgSelected.delete(card.id);
      div.classList.toggle('selected', cb.checked);
      updateBulkBar('cg');
      const allSel = cards.every(c => cgSelected.has(c.id));
      if (saBtn) {
        saBtn.textContent = allSel ? '선택 해제' : '전체 선택';
        saBtn.classList.toggle('all-selected', allSel);
      }
    });
    div.appendChild(cb);

    const prio = ce('div','cg-card-prio prio-' + (card.priority||'mid'));
    div.appendChild(prio);
    const dvB = document.createElement('button');
    dvB.className = 'dv-go-btn';
    dvB.title = '문서뷰로 보기';
    dvB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
    dvB.onclick = e => { e.stopPropagation(); openDocCard(card.id); };
    div.appendChild(dvB);
    if (card.group) div.appendChild(ce('div','cg-card-group',card.group));
    div.appendChild(ce('div','cg-card-title',card.title));
    const preview = cardPreviewText(card);
    if (preview) div.appendChild(ce('div','cg-card-body', preview));
    const foot = ce('div','cg-card-foot');
    (card.tags||[]).forEach(t=>foot.appendChild(ce('span','tag',t.trim())));
    const st = S.userData.status[card.id]||'wait';
    foot.appendChild(ce('span',`badge ${st}`,{wait:'학습대기',doing:'학습중',done:'학습완료'}[st]));
    div.appendChild(foot);
    div.onclick = () => openCardModal(card);
    grid.appendChild(div);
  });

  const addDiv = ce('div', 'cg-add-card');
  addDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>새 카드';
  const quickColId = selectedColId ?? (S.columns.length ? S.columns[0].id : null);
  addDiv.onclick = () => openCardModal(null, quickColId);
  grid.appendChild(addDiv);

  if (!grid._lassoInit) {
    grid._lassoInit = true;
    const viewEl = document.getElementById('view-cards') || grid;

    let isDragging   = false;
    let dragOrigin   = null;
    let lassoEl      = null;
    let preSnapshot  = null;

    function applyLasso() {
      if (!lassoEl) return;
      const lb = lassoEl.getBoundingClientRect();
      grid.querySelectorAll('.cg-card').forEach(div => {
        const rawId = div.dataset.id;
        if (!rawId) return;
        const cardId = isNaN(rawId) ? rawId : Number(rawId);
        const cb2 = div.getBoundingClientRect();
        const hit =
          lb.right  > cb2.left   &&
          lb.left   < cb2.right  &&
          lb.bottom > cb2.top    &&
          lb.top    < cb2.bottom;
        if (hit) {
          cgSelected.add(cardId);
        } else {
          if (!preSnapshot.has(cardId)) cgSelected.delete(cardId);
        }
        div.classList.toggle('selected', cgSelected.has(cardId));
        const chk = div.querySelector('.bulk-checkbox');
        if (chk) chk.checked = cgSelected.has(cardId);
      });
      updateBulkBar('cg');
    }

    function updateLassoRect(curX, curY) {
      const x = Math.min(curX, dragOrigin.clientX);
      const y = Math.min(curY, dragOrigin.clientY);
      const w = Math.abs(curX - dragOrigin.clientX);
      const h = Math.abs(curY - dragOrigin.clientY);
      Object.assign(lassoEl.style, {
        left:   x + 'px',
        top:    y + 'px',
        width:  w + 'px',
        height: h + 'px',
      });
    }

    viewEl.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('.cg-card')) return;
      if (e.target.closest('.view-bar')) return;
      if (e.target.closest('.bulk-actions-bar')) return;

      e.preventDefault();
      isDragging  = true;
      dragOrigin  = { clientX: e.clientX, clientY: e.clientY };
      preSnapshot = new Set(cgSelected);

      lassoEl = document.createElement('div');
      lassoEl.className = 'lasso-rect';
      Object.assign(lassoEl.style, {
        left:   e.clientX + 'px',
        top:    e.clientY + 'px',
        width:  '0px',
        height: '0px',
      });
      document.body.appendChild(lassoEl);
      document.body.classList.add('cg-dragging');
    });

    function onMouseMove(e) {
      if (!isDragging || !lassoEl) return;
      updateLassoRect(e.clientX, e.clientY);
      applyLasso();
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging  = false;
      preSnapshot = null;
      if (lassoEl) { lassoEl.remove(); lassoEl = null; }
      document.body.classList.remove('cg-dragging');
      const saBtn2 = document.getElementById('cg-select-all');
      if (saBtn2) {
        const visCards = grid.querySelectorAll('.cg-card');
        const allSel = visCards.length > 0 &&
          [...visCards].every(d => {
            const id = isNaN(d.dataset.id) ? d.dataset.id : Number(d.dataset.id);
            return cgSelected.has(id);
          });
        saBtn2.textContent = allSel ? '선택 해제' : '전체 선택';
        saBtn2.classList.toggle('all-selected', allSel);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }

  initBulkBar('cg');
  updateBulkBar('cg');
}

subscribe('cards', renderCards);
