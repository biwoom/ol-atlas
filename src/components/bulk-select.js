// src/components/bulk-select.js
// ── 다중 선택 + 일괄 작업 (BULK SELECT) ───────────────

let cgSelected = new Set(); // 카드 뷰 선택된 카드 ID
let lvSelected = new Set(); // 리스트 뷰 선택된 카드 ID

function clearBulkSelection(view) {
  if (view === 'cg' || !view) cgSelected.clear();
  if (view === 'lv' || !view) lvSelected.clear();
}

function getBulkSet(view) {
  return view === 'cg' ? cgSelected : lvSelected;
}

function updateBulkBar(view) {
  const sel  = getBulkSet(view);
  const bar  = document.getElementById(view + '-bulk-bar');
  const cnt  = document.getElementById(view + '-bulk-count');
  if (!bar || !cnt) return;
  cnt.textContent = sel.size + '개 선택';
  bar.classList.toggle('show', sel.size > 0);
}

function toggleSelectAll(view, cardList) {
  const sel = getBulkSet(view);
  const allIds = cardList.map(c => c.id);
  const allSelected = allIds.every(id => sel.has(id));
  if (allSelected) {
    allIds.forEach(id => sel.delete(id));
  } else {
    allIds.forEach(id => sel.add(id));
  }
  if (view === 'cg') queueRender('cards');
  else               queueRender('list');
}

function rerenderAfterBulk() {
  // dispatch가 markDirty + autosave + queueRender(affects)를 자동 처리
  // 현재 뷰에 따라 추가 렌더 보장
  if (currentView === 'kanban')   queueRender('kanban');
  if (currentView === 'cards')    queueRender('cards');
  if (currentView === 'list')     queueRender('list');
  if (currentView === 'document') queueRender('docview');
  queueRender('sidebar');
}

function _bsDeleteCards(view) {
  const sel = getBulkSet(view);
  if (!sel.size) return;
  if (!confirm('선택한 ' + sel.size + '개 카드를 휴지통으로 이동하시겠습니까?')) return;
  const ids = [...sel];
  // 문서뷰에서 삭제된 카드 보고 있으면 초기화 (모듈 전역 변수)
  if (ids.includes(currentDocCardId)) currentDocCardId = null;
  dispatch(bulkDeleteCards(ids));
  clearBulkSelection(view);
  rerenderAfterBulk();
  toast(sel.size + '개 카드를 휴지통으로 이동했습니다');
}

function _bsSetGroup(view, newGroup) {
  const sel = getBulkSet(view);
  if (!sel.size) return;
  dispatch(bulkSetGroup([...sel], newGroup));
  rerenderAfterBulk();
  toast(sel.size + '개 카드 그룹을 변경했습니다');
}

function _bsSetColumn(view, newColId) {
  const sel = getBulkSet(view);
  if (!sel.size) return;
  dispatch(bulkSetColumn([...sel], newColId));
  rerenderAfterBulk();
  toast(sel.size + '개 카드를 이동했습니다');
}

function bulkSetStatus(view, newStatus) {
  const sel = getBulkSet(view);
  if (!sel.size) return;
  dispatch(setBulkStatus([...sel], newStatus));
  rerenderAfterBulk();
  toast(sel.size + '개 카드 상태를 변경했습니다');
}

// ── Bulk Popover 관리 ──────────────────────────────────
let activeBulkPopover = null;

function closeBulkPopovers() {
  document.querySelectorAll('.bulk-popover.open').forEach(p => p.classList.remove('open'));
  activeBulkPopover = null;
}

function openBulkPopover(popEl) {
  if (activeBulkPopover === popEl) { closeBulkPopovers(); return; }
  closeBulkPopovers();
  popEl.classList.add('open');
  activeBulkPopover = popEl;
  requestAnimationFrame(() => {
    document.addEventListener('click', closeBulkPopoversOnOutside, { once: true });
  });
}

function closeBulkPopoversOnOutside(e) {
  if (!e.target.closest('.bulk-popover') && !e.target.closest('.bulk-action-btn')) {
    closeBulkPopovers();
  }
}

function buildGroupPopover(view, anchorBtn) {
  const pop = document.createElement('div');
  pop.className = 'bulk-popover';
  pop.innerHTML = '<div class="bulk-pop-title">그룹 변경</div>';

  const existingGroups = [...new Set(S.cards.map(c => c.group).filter(Boolean))];
  if (existingGroups.length) {
    const list = document.createElement('div');
    list.className = 'bulk-pop-list';
    existingGroups.forEach(g => {
      const item = document.createElement('button');
      item.className = 'bulk-popover-item';
      item.textContent = g;
      item.addEventListener('click', () => {
        _bsSetGroup(view, g);
        closeBulkPopovers();
      });
      list.appendChild(item);
    });
    pop.appendChild(list);
    const sep = document.createElement('div');
    sep.className = 'bulk-pop-sep';
    pop.appendChild(sep);
  }

  const row = document.createElement('div');
  row.className = 'bulk-pop-input-row';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'bulk-popover-input';
  inp.placeholder = '새 그룹명...';
  inp.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) {
      _bsSetGroup(view, inp.value.trim());
      closeBulkPopovers();
    }
  });
  const applyBtn = document.createElement('button');
  applyBtn.className = 'bulk-pop-apply';
  applyBtn.textContent = '적용';
  applyBtn.addEventListener('click', () => {
    if (inp.value.trim()) { _bsSetGroup(view, inp.value.trim()); closeBulkPopovers(); }
  });
  row.appendChild(inp);
  row.appendChild(applyBtn);
  pop.appendChild(row);

  const sep2 = document.createElement('div');
  sep2.className = 'bulk-pop-sep';
  pop.appendChild(sep2);
  const clearBtn = document.createElement('button');
  clearBtn.className = 'bulk-popover-item danger';
  clearBtn.textContent = '그룹 비우기';
  clearBtn.addEventListener('click', () => {
    _bsSetGroup(view, '');
    closeBulkPopovers();
  });
  pop.appendChild(clearBtn);

  anchorBtn.parentElement.style.position = 'relative';
  anchorBtn.parentElement.appendChild(pop);
  return pop;
}

function buildColumnPopover(view, anchorBtn) {
  const pop = document.createElement('div');
  pop.className = 'bulk-popover';
  pop.innerHTML = '<div class="bulk-pop-title">컬럼 이동</div>';
  const list = document.createElement('div');
  list.className = 'bulk-pop-list';
  S.columns.forEach(col => {
    const item = document.createElement('button');
    item.className = 'bulk-popover-item';
    item.textContent = col.title;
    item.addEventListener('click', () => {
      _bsSetColumn(view, col.id);
      closeBulkPopovers();
    });
    list.appendChild(item);
  });
  pop.appendChild(list);
  anchorBtn.parentElement.style.position = 'relative';
  anchorBtn.parentElement.appendChild(pop);
  return pop;
}

function buildStatusPopover(view, anchorBtn) {
  const pop = document.createElement('div');
  pop.className = 'bulk-popover';
  pop.innerHTML = '<div class="bulk-pop-title">학습 상태</div>';
  const list = document.createElement('div');
  list.className = 'bulk-pop-list';
  [['wait','학습대기'],['doing','학습중'],['done','학습완료']].forEach(([v,l]) => {
    const item = document.createElement('button');
    item.className = 'bulk-popover-item';
    item.textContent = l;
    item.addEventListener('click', () => {
      bulkSetStatus(view, v);
      closeBulkPopovers();
    });
    list.appendChild(item);
  });
  pop.appendChild(list);
  anchorBtn.parentElement.style.position = 'relative';
  anchorBtn.parentElement.appendChild(pop);
  return pop;
}

function initBulkBar(view) {
  const bar      = document.getElementById(view + '-bulk-bar');
  if (!bar || bar._bulkInit) return;
  bar._bulkInit  = true;

  document.getElementById(view + '-bulk-close').addEventListener('click', () => {
    clearBulkSelection(view);
    if (view === 'cg') queueRender('cards'); else queueRender('list');
  });

  document.getElementById(view + '-bulk-del').addEventListener('click', () => {
    _bsDeleteCards(view);
  });

  const mdBtn = document.getElementById(view + '-bulk-md');
  if (mdBtn) {
    mdBtn.addEventListener('click', () => {
      const set = view === 'cg' ? cgSelected : lvSelected;
      const ids = [...set];
      const cards = S.cards.filter(c => ids.includes(c.id));
      exportCardsAsIndividualMd(cards);
    });
  }

  const groupBtn = document.getElementById(view + '-bulk-group');
  let groupPop = null;
  groupBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!groupPop || !groupPop.isConnected) {
      groupPop = buildGroupPopover(view, groupBtn);
    }
    openBulkPopover(groupPop);
    requestAnimationFrame(() => groupPop.querySelector('.bulk-popover-input')?.focus());
  });

  const colBtn = document.getElementById(view + '-bulk-col');
  let colPop = null;
  colBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!colPop || !colPop.isConnected) {
      colPop = buildColumnPopover(view, colBtn);
    }
    openBulkPopover(colPop);
  });

  const stBtn = document.getElementById(view + '-bulk-status');
  let stPop = null;
  stBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!stPop || !stPop.isConnected) {
      stPop = buildStatusPopover(view, stBtn);
    }
    openBulkPopover(stPop);
  });
}
