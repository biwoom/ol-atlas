// src/ui/custom-select.js
// ── 공통 커스텀 드롭다운 — Proxy 패턴 + Portal 렌더링 ──
// 기존 <select>를 숨기고 div 기반 UI로 대체.
// .value / change 이벤트 / innerHTML 옵션 교체 모두 그대로 작동.
// 패널은 body에 portal로 붙어 부모 overflow에 잘리지 않음.

(function() {

// 현재 열린 드롭다운 (전역 1개)
let _openDrop = null;

function closeOpenDrop() {
  if (_openDrop) { _openDrop._close(); _openDrop = null; }
}

// 외부 클릭 / Esc / 스크롤 / 리사이즈 시 닫기
document.addEventListener('pointerdown', e => {
  if (!_openDrop) return;
  if (_openDrop._trigger.contains(e.target)) return;
  if (_openDrop._panel.contains(e.target))   return;
  closeOpenDrop();
}, true);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _openDrop) closeOpenDrop();
});

// 스크롤/리사이즈 시 자동 닫힘 (위치 계산 부담 회피)
window.addEventListener('scroll', () => { if (_openDrop) closeOpenDrop(); }, true);
window.addEventListener('resize', () => { if (_openDrop) closeOpenDrop(); });

/**
 * initCustomSelect(selectEl)
 * 기존 <select>를 커스텀 UI로 대체.
 */
window.initCustomSelect = function(selectEl) {
  if (!selectEl || selectEl._csInit) return;
  selectEl._csInit = true;
  selectEl.style.display = 'none';

  // ── 1. 클래스 추출 (스타일 매핑용) ──
  const cls = selectEl.classList;
  let variant = '';
  if (cls.contains('sb-select'))    variant = 'sb';
  else if (cls.contains('filter-sel'))   variant = 'filter';
  else if (cls.contains('dv-me-select')) variant = 'dv';
  else if (cls.contains('cm-select'))    variant = 'cm';

  // ── 2. 트리거 버튼 ──
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cs-trigger' + (variant ? ' cs-' + variant : '');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const labelEl = document.createElement('span');
  labelEl.className = 'cs-label';
  const arrowEl = document.createElement('span');
  arrowEl.className = 'cs-arrow';
  arrowEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" '
    + 'fill="none" stroke="currentColor" stroke-width="2.5" '
    + 'stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="m6 9 6 6 6-6"/></svg>';
  trigger.appendChild(labelEl);
  trigger.appendChild(arrowEl);

  // ── 3. 래퍼 (트리거만 감쌈, 패널은 body에 portal) ──
  const wrap = document.createElement('div');
  wrap.className = 'cs-wrap' + (variant ? ' cs-wrap-' + variant : '');
  selectEl.parentNode.insertBefore(wrap, selectEl);
  wrap.appendChild(selectEl);    // hidden select를 wrap 안으로
  wrap.appendChild(trigger);

  // ── 4. 패널 (body에 portal) ──
  const panel = document.createElement('div');
  panel.className = 'cs-panel' + (variant ? ' cs-panel-' + variant : '');
  panel.setAttribute('role', 'listbox');
  panel.hidden = true;
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.appendChild(panel);    // ← 핵심: body에 직접 추가

  // ── 5. 옵션 동기화 ──
  function syncPanel() {
    panel.innerHTML = '';
    const curVal = selectEl.value;
    Array.from(selectEl.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = 'cs-item' + (opt.value === curVal ? ' cs-selected' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', opt.value === curVal);
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      item.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        selectEl.value = opt.value;
        syncLabel();
        // 순서 중요: close 먼저, dispatch 나중
        // (dispatch가 sidebar 등을 재렌더하면서 DOM 교체할 수 있음)
        closeOpenDrop();
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      });
      panel.appendChild(item);
    });
  }

  function syncLabel() {
    const cur = selectEl.options[selectEl.selectedIndex];
    labelEl.textContent = cur ? cur.textContent : '';
    if (!panel.hidden) {
      panel.querySelectorAll('.cs-item').forEach(item => {
        const sel = item.dataset.value === selectEl.value;
        item.classList.toggle('cs-selected', sel);
        item.setAttribute('aria-selected', sel);
      });
    }
  }

  // ── 6. 패널 위치 계산 (fixed + 트리거 좌표) ──
  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 가로: 트리거 좌측 정렬, 화면 우측 초과 시 보정
    let left = rect.left;
    const panelW = Math.max(panel.offsetWidth, rect.width);
    if (left + panelW > vw - 8) left = vw - panelW - 8;
    if (left < 8) left = 8;

    panel.style.left  = left + 'px';
    panel.style.width = Math.max(rect.width, panel.offsetWidth) + 'px';

    // 세로: 아래 공간 부족하면 위로
    const panelH = panel.offsetHeight;
    if (rect.bottom + panelH + 8 > vh) {
      // 위로
      panel.style.top = Math.max(rect.top - panelH - 2, 8) + 'px';
    } else {
      // 아래
      panel.style.top = (rect.bottom + 2) + 'px';
    }
  }

  // ── 7. 열기 / 닫기 ──
  function openPanel() {
    syncPanel();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrap.classList.add('cs-open');
    // 패널을 보이게 한 뒤 offsetWidth/Height를 측정해야 함
    requestAnimationFrame(positionPanel);
  }

  function closePanel() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('cs-open');
  }

  const dropObj = {
    _trigger: trigger,
    _panel:   panel,
    _close:   closePanel
  };

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    if (!panel.hidden) { closeOpenDrop(); return; }
    if (_openDrop) closeOpenDrop();
    openPanel();
    _openDrop = dropObj;
  });

  // ── 8. selectEl 옵션 변경 감지 (innerHTML 교체 대응) ──
  const mo = new MutationObserver(() => {
    syncLabel();
    if (!panel.hidden) syncPanel();
  });
  mo.observe(selectEl, { childList: true, subtree: false });

  // ── 9. selectEl 제거 시 패널도 함께 정리 ──
  // (사이드바 재렌더 등으로 wrap이 DOM에서 떨어질 때)
  const cleanupObserver = new MutationObserver(() => {
    if (!wrap.isConnected && panel.isConnected) {
      panel.remove();
      mo.disconnect();
      cleanupObserver.disconnect();
      if (_openDrop && _openDrop._panel === panel) _openDrop = null;
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  // 초기 레이블
  syncLabel();
};

/**
 * initAllCustomSelects(root?)
 * filter-sel, sb-select, dv-me-select, cm-select 클래스를 한 번에 교체.
 */
window.initAllCustomSelects = function(root) {
  const ctx = root || document;
  ctx.querySelectorAll(
    'select.filter-sel, select.sb-select, select.dv-me-select, select.cm-select'
  ).forEach(sel => initCustomSelect(sel));
};

})();


let selectedTags = new Set();
let selectedColId = null;  // null = 전체 컬럼

// ── v0.6 prefix 필터 상태 ──
const sbFilter = {
  freeTag: '',
  prefix:  null   // { prefix: "인물", value: "붓다" } | null
};

function setPrefixFilter(prefix, value) {
  sbFilter.prefix = value ? { prefix, value } : null;

  // 모바일: 사이드바를 먼저 닫은 후 뷰 전환
  // (sb-overlay/sb-mobile-logo에 이벤트 전파되어 home으로 이동하는 버그 방지)
  const sidebar = document.getElementById('sidebar');
  const sbOverlay = document.getElementById('sb-overlay');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (sbOverlay) sbOverlay.classList.remove('open');
    document.body.style.overflow = '';
    const hamburger = document.getElementById('h-hamburger');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  if (value && currentView !== 'cards') {
    switchView('cards');
    return;
  }
  queueRender('sidebar');
  queueRender('cards');
  queueRender('kanban');
  queueRender('list');
}

function clearPrefixFilter() {
  sbFilter.prefix = null;
  queueRender('sidebar');
  queueRender('cards');
}
