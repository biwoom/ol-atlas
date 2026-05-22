// src/components/kanban.js
// ── 칸반 보드 + Drag & Drop + 컬럼 관리 ──────────────

let dragCardId = null;

function renderKanban() {
  const board = document.getElementById('kb-board');
  board.innerHTML = '';
  S.columns.forEach(col => board.appendChild(buildCol(col)));
  const addBtn = document.createElement('button');
  addBtn.id = 'kb-add-col-btn'; addBtn.title = '컬럼 추가';
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  addBtn.onclick = addColumn;
  board.appendChild(addBtn);
  updateColCounts();
}

function buildCol(col) {
  const div = ce('div','kb-col'); div.dataset.colId = col.id;
  const head = ce('div','kb-col-head');
  const dot = ce('div','kb-col-dot'); dot.style.background = col.color;
  dot.onclick = e => showCPicker(e, col);
  const nameEl = document.createElement('input');
  nameEl.className='kb-col-name'; nameEl.value=col.title;
  nameEl.onchange = () => {
    dispatch(renameColumn(col.id, nameEl.value));
  };
  const cnt = ce('span','kb-col-cnt', '0'); cnt.dataset.cntFor = col.id;
  const acts = ce('div','kb-col-acts');
  const addB = document.createElement('button');
  addB.className = 'kb-col-btn'; addB.title = '카드 추가';
  addB.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  addB.onclick = () => openCardModal(null, col.id);
  const delB = document.createElement('button');
  delB.className = 'kb-col-btn'; delB.title = '컬럼 삭제';
  delB.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  delB.onclick = () => _kbDeleteColumn(col.id);
  acts.append(addB, delB);
  head.append(dot, nameEl, cnt, acts);

  const list = ce('div','kb-cards'); list.dataset.colId = col.id;
  S.cards.filter(c=>c.colId===col.id).forEach(card => list.appendChild(buildCard(card)));
  list.addEventListener('dragover',  onDragOver);
  list.addEventListener('dragleave', onDragLeave);
  list.addEventListener('drop',      onDrop);

  const addCard = document.createElement('button');
  addCard.className = 'kb-add-card';
  addCard.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:0.25rem"><path d="M5 12h14"/><path d="M12 5v14"/></svg>카드 추가';
  addCard.onclick = () => openCardModal(null, col.id);

  div.append(head, list, addCard);
  return div;
}

function buildCard(card) {
  const div = ce('div','kb-card'); div.dataset.cardId = card.id; div.draggable = true;
  const bar = ce('div','kb-card-bar prio-' + (card.priority||'mid'));
  const title = ce('div','kb-card-title', card.title||'(제목 없음)');
  const editB = document.createElement('button');
  editB.className = 'kb-card-edit';
  editB.title = '편집';
  editB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  editB.onclick = e => { e.stopPropagation(); openCardModal(card); };
  const dvB = document.createElement('button');
  dvB.className = 'dv-go-btn';
  dvB.title = '문서뷰로 보기';
  dvB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
  dvB.onclick = e => { e.stopPropagation(); openDocCard(card.id); };
  div.append(bar, title, dvB, editB);
  const preview = cardPreviewText(card);
  if (preview) div.appendChild(ce('div','kb-card-body', preview));
  const foot = ce('div','kb-card-foot');
  (card.tags||[]).forEach(t => foot.appendChild(ce('span','tag',t.trim())));
  if (card.created) foot.appendChild(ce('span','kb-card-date', card.created));
  div.appendChild(foot);
  div.addEventListener('dragstart', onDragStart);
  div.addEventListener('dragend',   onDragEnd);
  div.addEventListener('dblclick',  () => openCardModal(card));
  return div;
}

function updateColCounts() {
  S.columns.forEach(col => {
    const el = document.querySelector(`[data-cnt-for="${col.id}"]`);
    if (el) el.textContent = S.cards.filter(c=>c.colId===col.id).length;
  });
}

// ── Drag & Drop ─────────────────────────────────────────
function onDragStart(e) {
  dragCardId = parseInt(this.dataset.cardId);
  setTimeout(() => this.classList.add('dragging'), 0);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragCardId));
}
function onDragEnd() {
  document.querySelectorAll('.kb-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.kb-col').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drag-ph').forEach(p => p.remove());
}
function onDragOver(e) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const list = e.currentTarget;
  list.closest('.kb-col').classList.add('drag-over');
  let ph = list.querySelector('.drag-ph');
  if (!ph) {
    document.querySelectorAll('.drag-ph').forEach(p => p.remove());
    ph = ce('div','kb-card drag-ph'); list.appendChild(ph);
  }
  const after = dragAfterEl(list, e.clientY);
  if (!after) list.appendChild(ph); else list.insertBefore(ph, after);
}
function onDragLeave(e) {
  const list = e.currentTarget;
  if (list.contains(e.relatedTarget)) return;
  list.closest('.kb-col').classList.remove('drag-over');
  list.querySelector('.drag-ph')?.remove();
}
function onDrop(e) {
  e.preventDefault();
  if (dragCardId === null) return;
  const list = e.currentTarget;
  const colId = parseInt(list.dataset.colId);
  const ph = list.querySelector('.drag-ph');
  let insertBeforeId = null;
  if (ph) {
    let nx = ph.nextElementSibling;
    while (nx) { if (nx.dataset.cardId) { insertBeforeId = parseInt(nx.dataset.cardId); break; } nx = nx.nextElementSibling; }
  }
  document.querySelectorAll('.drag-ph').forEach(p => p.remove());
  document.querySelectorAll('.kb-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.kb-col').forEach(c => c.classList.remove('drag-over'));

  if (!S.cards.find(c => c.id === dragCardId)) { dragCardId=null; return; }

  dispatch(moveCard(dragCardId, colId, insertBeforeId));
  dragCardId = null;
}
function dragAfterEl(container, y) {
  const els = [...container.querySelectorAll('.kb-card:not(.dragging):not(.drag-ph)')];
  return els.reduce((cl,ch) => {
    const box = ch.getBoundingClientRect();
    const off = y - box.top - box.height/2;
    if (off < 0 && off > cl.offset) return { offset:off, element:ch };
    return cl;
  }, { offset: -Infinity }).element || null;
}

// ── Column management ───────────────────────────────────
function addColumn() {
  const color = COL_COLORS[Math.floor(Math.random()*COL_COLORS.length)];
  dispatch(createColumn({ title: '새 컬럼', color }));
  toast('컬럼이 추가되었습니다');
}
function _kbDeleteColumn(colId) {
  const cnt = S.cards.filter(c=>c.colId===colId).length;
  const msg = cnt ? `이 컬럼에는 ${cnt}개의 카드가 있습니다. 모두 삭제됩니다. 계속하시겠습니까?` : '이 컬럼을 삭제하시겠습니까?';
  if (!confirm(msg)) return;
  dispatch(deleteColumn(colId));
  toast('컬럼이 삭제되었습니다');
}

// Phase 1: store에 등록
subscribe('kanban', renderKanban);
