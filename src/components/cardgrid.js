// src/components/cardgrid.js
// ── 카드 그리드 뷰 + 라쏘 선택 ─────────────────────

function renderCards() {
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
  if (typeof sbFilter !== 'undefined' && sbFilter.prefix) {
    const { prefix: fp, value: fv } = sbFilter.prefix;
    cards = cards.filter(c => (c.tags||[]).some(tag => {
      const p = parseTag(tag);
      return p.prefix === fp && p.value === fv;
    }));
  }

  // ── 정렬 ──────────────────────────────────────────────
  const sortEl = document.getElementById('cg-sort');
  if (sortEl) {
    sortEl.value = cgSort;  // 초기값 복원
    cgSort = sortEl.value;
  }
  const PRIO_ORD = { high:0, mid:1, low:2 };
  const STAT_ORD = { doing:0, wait:1, done:2 };
  if (cgSort === 'title')    cards.sort((a,b)=>(a.title||'').localeCompare(b.title||'','ko'));
  if (cgSort === 'priority') cards.sort((a,b)=>(PRIO_ORD[a.priority]??1)-(PRIO_ORD[b.priority]??1));
  if (cgSort === 'status')   cards.sort((a,b)=>(STAT_ORD[S.userData.status[a.id]||'wait'])-(STAT_ORD[S.userData.status[b.id]||'wait']));
  if (cgSort === 'created')  cards.sort((a,b)=>(b.created||'').localeCompare(a.created||''));
  // ────────────────────────────────────────────────────────
  const chipEl = document.getElementById('cg-active-col-chip');
  if (chipEl) {
    if (selectedColId != null) {
      const col = S.columns.find(c => c.id === selectedColId);
      if (col) {
        chipEl.style.display = 'inline-flex';
        document.getElementById('cg-chip-dot').style.background = col.color;
        document.getElementById('cg-chip-name').textContent = col.title;
        const clearBtn = document.getElementById('cg-chip-clear');
        if (clearBtn) clearBtn.onclick = () => { selectedColId = null; queueRender('cards'); queueRender('sidebar'); };
      } else {
        chipEl.style.display = 'none';
      }
    } else {
      chipEl.style.display = 'none';
    }
  }

  // 전체 선택 버튼 상태 갱신
  const saBtn = document.getElementById('cg-select-all');
  if (saBtn) {
    const allSelected = cards.length > 0 && cards.every(c => cgSelected.has(c.id));
    saBtn.textContent = allSelected ? '선택 해제' : '전체 선택';
    saBtn.classList.toggle('all-selected', allSelected);
    // 매번 새로 연결 (클로저가 최신 cards를 참조하도록)
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
    div.dataset.id = card.id;  // 라쏘 선택 교차 판정용
    if (cgSelected.has(card.id)) div.classList.add('selected');

    // 체크박스
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
      // 전체선택 버튼 상태 갱신
      const allSel = cards.every(c => cgSelected.has(c.id));
      if (saBtn) {
        saBtn.textContent = allSel ? '선택 해제' : '전체 선택';
        saBtn.classList.toggle('all-selected', allSel);
      }
    });
    div.appendChild(cb);

    const prio = ce('div','cg-card-prio prio-' + (card.priority||'mid'));
    div.appendChild(prio);
    // 문서뷰 진입 버튼
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

  // ── 빠른 카드 생성 버튼 (그리드 마지막) ──────────────
  const addDiv = ce('div', 'cg-add-card');
  addDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>새 카드';
  const quickColId = selectedColId ?? (S.columns.length ? S.columns[0].id : null);
  addDiv.onclick = () => openCardModal(null, quickColId);
  grid.appendChild(addDiv);
  // ────────────────────────────────────────────────────────
  // 이전에 등록한 리스너를 제거하기 위해 grid에 플래그로 관리
  if (!grid._lassoInit) {
    grid._lassoInit = true;

    // mousedown은 뷰 전체 컨테이너에서 감지 — 카드 아래 빈 공간 포함
    const viewEl = document.getElementById('view-cards') || grid;

    let isDragging   = false;
    let dragOrigin   = null;
    let lassoEl      = null;
    let preSnapshot  = null;

    // 드래그 사각형과 교차하는 카드 갱신
    // lasso rect는 position:fixed(viewport 기준), card도 getBoundingClientRect()(viewport 기준)
    // → 스크롤과 무관하게 일관성 유지
    function applyLasso() {
      if (!lassoEl) return;
      const lb = lassoEl.getBoundingClientRect();
      grid.querySelectorAll('.cg-card').forEach(div => {
        const rawId = div.dataset.id;
        if (!rawId) return;
        // card.id는 number 타입 — dataset은 항상 string이므로 변환
        const cardId = isNaN(rawId) ? rawId : Number(rawId);
        const cb = div.getBoundingClientRect();
        // 두 사각형의 AABB 교차 판정
        const hit =
          lb.right  > cb.left   &&
          lb.left   < cb.right  &&
          lb.bottom > cb.top    &&
          lb.top    < cb.bottom;
        if (hit) {
          cgSelected.add(cardId);
        } else {
          // 스냅샷에 없던 것만 해제 (체크박스로 이미 선택한 항목 보호)
          if (!preSnapshot.has(cardId)) cgSelected.delete(cardId);
        }
        div.classList.toggle('selected', cgSelected.has(cardId));
        const chk = div.querySelector('.bulk-checkbox');
        if (chk) chk.checked = cgSelected.has(cardId);
      });
      updateBulkBar('cg');
    }

    // lasso rect의 position:fixed 좌표를 clientX/Y로 정확히 계산
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

    // 뷰 전체에서 mousedown 감지 (카드 아래 빈 공간 포함)
    viewEl.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      // 카드·버튼·체크박스·뷰바 위는 기존 동작 유지
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

    function onMouseUp(e) {
      if (!isDragging) return;
      isDragging  = false;
      preSnapshot = null;
      if (lassoEl) { lassoEl.remove(); lassoEl = null; }
      document.body.classList.remove('cg-dragging');
      // 전체선택 버튼 상태 최종 동기화
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

    // document 레벨로 등록 (그리드 바깥으로 나가도 추적)
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }
  // ────────────────────────────────────────────────────────

  // 액션바 초기화 (최초 1회만)
  initBulkBar('cg');
  updateBulkBar('cg');
}

// Phase 1: store에 등록
subscribe('cards', renderCards);
