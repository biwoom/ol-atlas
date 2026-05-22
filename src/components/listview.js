// src/components/listview.js
// ── 리스트 뷰 ────────────────────────────────────────

let lvSort = { col:'title', dir:1 };
let cgSort = (function(){ try { return localStorage.getItem('ol_cg_sort')||'default'; } catch(_){ return 'default'; } })();

// ── 리스트뷰 컬럼 설정 ────────────────────────────────
const LV_COL_DEFS = [
  { key:'group',    label:'그룹',    sortable:true,  fixed:false },
  { key:'title',    label:'제목',    sortable:true,  fixed:false },
  { key:'body',     label:'내용',    sortable:true,  fixed:false },
  { key:'tags',     label:'태그',    sortable:true,  fixed:false },
  { key:'priority', label:'우선순위', sortable:true, fixed:false },
  { key:'status',   label:'학습',    sortable:true,  fixed:false },
  { key:'docview',  label:'열기',    sortable:false, fixed:true  },
];
function _loadLvCols() {
  try {
    const raw = localStorage.getItem('ol_lv_cols');
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // 저장된 key 목록이 유효한지 검증 후 병합
    const validKeys = LV_COL_DEFS.map(d=>d.key);
    const out = saved.filter(r => validKeys.includes(r.key));
    // 저장에 없는 new key는 끝에 추가
    validKeys.forEach(k => { if (!out.find(r=>r.key===k)) out.push({key:k,visible:true}); });
    return out;
  } catch(_) { return null; }
}
function _saveLvCols() {
  try { localStorage.setItem('ol_lv_cols', JSON.stringify(lvColConfig)); } catch(_){}
}
let lvColConfig = _loadLvCols() || LV_COL_DEFS.map(d=>({key:d.key, visible:true}));
// ────────────────────────────────────────────────────────

// ── 리스트뷰 인라인 편집 ─────────────────────────────
function startListCellEdit(td, card, field) {
  if (td.querySelector('.lv-inline-input,.lv-inline-select')) return;
  const originalHTML = td.innerHTML;
  let originalVal;
  if (field === 'status') originalVal = S.userData.status[card.id] || 'wait';
  else if (field === 'tags') originalVal = (card.tags || []).join(', ');
  else originalVal = card[field] || '';

  const isSelect = field === 'priority' || field === 'status';
  const el = document.createElement(isSelect ? 'select' : 'input');
  el.className = isSelect ? 'lv-inline-select' : 'lv-inline-input';

  if (isSelect) {
    const opts = field === 'priority'
      ? [['high','높음'],['mid','보통'],['low','낮음']]
      : [['wait','학습대기'],['doing','학습중'],['done','학습완료']];

    // 커스텀 인라인 팝업 (body portal, fixed 위치)
    const pop = document.createElement('div');
    pop.className = 'cs-inline-pop';

    let closeHandler;
    function closePopup() {
      pop.remove();
      td.innerHTML = originalHTML;
      td.classList.remove('lv-editing');
      if (closeHandler) {
        document.removeEventListener('pointerdown', closeHandler, true);
        window.removeEventListener('scroll', closePopup, true);
        window.removeEventListener('resize', closePopup);
      }
    }

    opts.forEach(([v, l]) => {
      const item = document.createElement('div');
      item.className = 'cs-item' + (v === originalVal ? ' cs-selected' : '');
      item.textContent = l;
      item.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (field === 'status') dispatch(setStatus(card.id, v));
        else dispatch(updateCard(card.id, { [field]: v }));
        closePopup();
      });
      pop.appendChild(item);
    });

    td.innerHTML = '';
    td.classList.add('lv-editing');
    document.body.appendChild(pop);

    // 위치 계산 (셀 좌표 기준, 화면 경계 보정)
    requestAnimationFrame(() => {
      const rect = td.getBoundingClientRect();
      const ph = pop.offsetHeight;
      const pw = Math.max(pop.offsetWidth, rect.width);
      let left = rect.left;
      let top  = rect.bottom + 2;
      if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
      if (left < 8) left = 8;
      if (top + ph > window.innerHeight - 8) top = Math.max(rect.top - ph - 2, 8);
      pop.style.left  = left + 'px';
      pop.style.top   = top + 'px';
      pop.style.width = Math.max(rect.width, pw) + 'px';
    });

    // 외부 클릭 / 스크롤 / 리사이즈 → 닫힘
    closeHandler = e => {
      if (!pop.contains(e.target) && !td.contains(e.target)) closePopup();
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', closeHandler, true);
      window.addEventListener('scroll', closePopup, true);
      window.addEventListener('resize', closePopup);
    }, 0);

    return;
  } else {
    el.type = 'text';
    el.value = originalVal;
    if (field === 'tags') el.placeholder = '예: 화엄, 연기, 중관';
  }

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const newVal = el.value.trim();
    if (field === 'status') {
      dispatch(setStatus(card.id, newVal));
    } else if (field === 'tags') {
      dispatch(updateCard(card.id, { tags: newVal.split(',').map(t => t.trim()).filter(Boolean) }));
    } else {
      dispatch(updateCard(card.id, { [field]: newVal }));
    }
  }
  function cancel() {
    if (committed) return;
    committed = true;
    td.innerHTML = originalHTML;
    td.classList.remove('lv-editing');
  }

  el.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    e.stopPropagation();
  });
  el.addEventListener('blur', () => { if (!committed) commit(); });
  if (isSelect) el.addEventListener('change', () => { if (!committed) commit(); });

  td.innerHTML = '';
  td.classList.add('lv-editing');
  td.appendChild(el);
  el.focus();
  if (!isSelect && el.select) el.select();
}
// ────────────────────────────────────────────────────────

function renderList() {
  const fg = document.getElementById('lv-fg').value;
  const fs = document.getElementById('lv-fs').value;
  const groups = [...new Set(S.cards.map(c=>c.group).filter(Boolean))];
  const fgEl = document.getElementById('lv-fg');
  const prev = fgEl.value;
  fgEl.innerHTML = '<option value="">모든 그룹</option>';
  groups.forEach(g=>{ const o=document.createElement('option'); o.value=g; o.textContent=g; if(g===prev) o.selected=true; fgEl.appendChild(o); });

  // 활성 컬럼 계산 (lvColConfig 순서 기준, visible인 것만)
  const activeCols = lvColConfig
    .filter(r => r.visible)
    .map(r => LV_COL_DEFS.find(d => d.key === r.key))
    .filter(Boolean);

  const thead = document.getElementById('lv-head');
  thead.innerHTML = '';
  const tr = document.createElement('tr');

  const ICO_UP   = '<svg class="lv-sort-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
  const ICO_DOWN = '<svg class="lv-sort-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
  const ICO_BOTH = '<svg class="lv-sort-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

  // tbody 먼저 필터/정렬
  let cards = [...S.cards];
  if (fg) cards = cards.filter(c=>c.group===fg);
  if (fs) cards = cards.filter(c=>(S.userData.status[c.id]||'wait')===fs);
  cards.sort((a,b)=>{
    let va=a[lvSort.col]??'', vb=b[lvSort.col]??'';
    if (lvSort.col==='status') { va=S.userData.status[a.id]||'wait'; vb=S.userData.status[b.id]||'wait'; }
    if (lvSort.col==='tags')   { va=(a.tags||[]).join(','); vb=(b.tags||[]).join(','); }
    if (lvSort.col==='body')   { va=cardPreviewText(a); vb=cardPreviewText(b); }
    return va<vb?-lvSort.dir:va>vb?lvSort.dir:0;
  });

  // 마스터 체크박스 th
  const masterTh = document.createElement('th');
  masterTh.className = 'lv-master-th';
  const masterCb = document.createElement('input');
  masterCb.type = 'checkbox';
  masterCb.className = 'bulk-checkbox';
  const selectedCount = cards.filter(c => lvSelected.has(c.id)).length;
  masterCb.checked = cards.length > 0 && selectedCount === cards.length;
  masterCb.indeterminate = selectedCount > 0 && selectedCount < cards.length;
  masterCb.title = masterCb.checked ? '전체 해제' : '전체 선택';
  masterCb.addEventListener('change', () => {
    if (masterCb.checked) cards.forEach(c => lvSelected.add(c.id));
    else cards.forEach(c => lvSelected.delete(c.id));
    queueRender('list');
  });
  masterCb.addEventListener('click', e => e.stopPropagation());
  masterTh.appendChild(masterCb);
  tr.appendChild(masterTh);

  // 동적 컬럼 헤더
  activeCols.forEach(({ key, label, sortable }) => {
    const th = document.createElement('th');
    if (sortable) {
      const ico = lvSort.col===key ? (lvSort.dir===1 ? ICO_UP : ICO_DOWN) : ICO_BOTH;
      th.innerHTML = `<span class="lv-th-inner"><span>${label}</span>${ico}</span>`;
      if (lvSort.col===key) th.classList.add('sorted');
      th.onclick = () => { lvSort.col===key ? lvSort.dir*=-1 : (lvSort.col=key,lvSort.dir=1); queueRender('list'); };
    } else {
      th.innerHTML = `<span class="lv-th-inner"><span>${label}</span></span>`;
    }
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  // tbody
  const tbody = document.getElementById('lv-body');
  tbody.innerHTML = '';
  if (!cards.length) {
    const hasFilter = !!(fg || fs);
    const tr2 = document.createElement('tr');
    const td  = document.createElement('td');
    td.colSpan = 1 + activeCols.length;
    td.className = 'lv-empty';
    const empty = hasFilter
      ? buildEmptyState('filter', '조건에 맞는 카드가 없습니다', '필터를 조정해보세요')
      : buildEmptyState('cards', '카드가 없습니다', '칸반 뷰에서 첫 카드를 추가해보세요');
    td.appendChild(empty);
    tr2.appendChild(td);
    tbody.appendChild(tr2);
    updateBulkBar('lv');
    return;
  }

  const PL = { high:'높음', mid:'보통', low:'낮음' };
  const SL = { wait:'학습대기', doing:'학습중', done:'학습완료' };

  cards.forEach(card => {
    const tr2 = document.createElement('tr');
    if (lvSelected.has(card.id)) tr2.classList.add('selected');

    // 체크박스 td
    const cbTd = document.createElement('td');
    cbTd.className = 'lv-cb-td';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'bulk-checkbox';
    cb.checked = lvSelected.has(card.id);
    cb.addEventListener('click', e => {
      e.stopPropagation();
      if (cb.checked) lvSelected.add(card.id);
      else lvSelected.delete(card.id);
      tr2.classList.toggle('selected', cb.checked);
      updateBulkBar('lv');
      const selCnt = cards.filter(c => lvSelected.has(c.id)).length;
      masterCb.checked = selCnt === cards.length;
      masterCb.indeterminate = selCnt > 0 && selCnt < cards.length;
    });
    cbTd.appendChild(cb);
    tr2.appendChild(cbTd);

    // 동적 컬럼 td — key별 렌더
    const previewText = cardPreviewText(card);

    activeCols.forEach(({ key }) => {
      const td = document.createElement('td');
      td.dataset.col = key; // 컬럼 키 마킹
      switch (key) {
        case 'group':
          td.className = 'td-group lv-editable';
          td.textContent = card.group || '—';
          td.title = '클릭하여 편집';
          td.onclick = e => { e.stopPropagation(); startListCellEdit(td, card, 'group'); };
          break;
        case 'title':
          td.className = 'td-title lv-editable';
          td.textContent = card.title;
          td.title = '클릭하여 편집';
          td.onclick = e => { e.stopPropagation(); startListCellEdit(td, card, 'title'); };
          break;
        case 'body':
          td.className = 'td-body';
          td.textContent = previewText ? (previewText.slice(0,55)+(previewText.length>55?'…':'')) : '—';
          td.style.cursor = 'default';
          break;
        case 'tags':
          td.className = 'lv-editable';
          (card.tags||[]).forEach(t => td.appendChild(ce('span','tag',t.trim())));
          if (!(card.tags||[]).length) td.textContent = '—';
          td.title = '클릭하여 편집 (쉼표로 구분)';
          td.onclick = e => { e.stopPropagation(); startListCellEdit(td, card, 'tags'); };
          break;
        case 'priority':
          td.className = 'lv-editable';
          if (card.priority && PL[card.priority]) {
            td.innerHTML = `<span class="td-prio"><span class="td-prio-dot prio-${card.priority}"></span>${PL[card.priority]}</span>`;
          } else { td.innerHTML = '<span class="td-prio">—</span>'; }
          td.title = '클릭하여 편집';
          td.onclick = e => { e.stopPropagation(); startListCellEdit(td, card, 'priority'); };
          break;
        case 'status': {
          td.className = 'lv-editable';
          const st = S.userData.status[card.id]||'wait';
          td.appendChild(ce('span',`badge ${st}`,SL[st]));
          td.title = '클릭하여 편집';
          td.onclick = e => { e.stopPropagation(); startListCellEdit(td, card, 'status'); };
          break;
        }
        case 'docview': {
          td.className = 'lv-action-td';
          // 문서뷰 버튼
          const dvB = document.createElement('button');
          dvB.className = 'dv-go-btn';
          dvB.title = '문서뷰로 보기';
          dvB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
          dvB.onclick = e => { e.stopPropagation(); openDocCard(card.id); };
          // 모달 편집 버튼
          const editB = document.createElement('button');
          editB.className = 'lv-edit-btn';
          editB.title = '카드 모달 편집';
          editB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
          editB.onclick = e => { e.stopPropagation(); openCardModal(card); };
          td.appendChild(dvB);
          td.appendChild(editB);
          break;
        }
      }
      tr2.appendChild(td);
    });

    // 행 클릭 모달 제거 — 편집은 각 셀 클릭, 모달은 열기 열의 버튼으로만
    tbody.appendChild(tr2);
  });

  // 액션바 초기화 (최초 1회만)
  initBulkBar('lv');
  updateBulkBar('lv');
}

// Phase 1: store에 등록
subscribe('list', renderList);
