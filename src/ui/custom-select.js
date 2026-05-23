// src/ui/custom-select.js
// ── 공통 커스텀 드롭다운 — Proxy 패턴 + Portal 렌더링 ──

import { queueRender } from '../core/render-queue.js';
import { currentView, switchView } from '../core/router.js';

let _openDrop = null;

function closeOpenDrop() {
  if (_openDrop) { _openDrop._close(); _openDrop = null; }
}

document.addEventListener('pointerdown', e => {
  if (!_openDrop) return;
  if (_openDrop._trigger.contains(e.target)) return;
  if (_openDrop._panel.contains(e.target))   return;
  closeOpenDrop();
}, true);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _openDrop) closeOpenDrop();
});

window.addEventListener('scroll', () => { if (_openDrop) closeOpenDrop(); }, true);
window.addEventListener('resize', () => { if (_openDrop) closeOpenDrop(); });

export function initCustomSelect(selectEl) {
  if (!selectEl || selectEl._csInit) return;
  selectEl._csInit = true;
  selectEl.style.display = 'none';

  const cls = selectEl.classList;
  let variant = '';
  if (cls.contains('sb-select'))    variant = 'sb';
  else if (cls.contains('filter-sel'))   variant = 'filter';
  else if (cls.contains('dv-me-select')) variant = 'dv';
  else if (cls.contains('cm-select'))    variant = 'cm';

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

  const wrap = document.createElement('div');
  wrap.className = 'cs-wrap' + (variant ? ' cs-wrap-' + variant : '');
  selectEl.parentNode.insertBefore(wrap, selectEl);
  wrap.appendChild(selectEl);
  wrap.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'cs-panel' + (variant ? ' cs-panel-' + variant : '');
  panel.setAttribute('role', 'listbox');
  panel.hidden = true;
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.appendChild(panel);

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

  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    const panelW = Math.max(panel.offsetWidth, rect.width);
    if (left + panelW > vw - 8) left = vw - panelW - 8;
    if (left < 8) left = 8;

    panel.style.left  = left + 'px';
    panel.style.width = Math.max(rect.width, panel.offsetWidth) + 'px';

    const panelH = panel.offsetHeight;
    if (rect.bottom + panelH + 8 > vh) {
      panel.style.top = Math.max(rect.top - panelH - 2, 8) + 'px';
    } else {
      panel.style.top = (rect.bottom + 2) + 'px';
    }
  }

  function openPanel() {
    syncPanel();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrap.classList.add('cs-open');
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
    _close:   closePanel,
  };

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    if (!panel.hidden) { closeOpenDrop(); return; }
    if (_openDrop) closeOpenDrop();
    openPanel();
    _openDrop = dropObj;
  });

  const mo = new MutationObserver(() => {
    syncLabel();
    if (!panel.hidden) syncPanel();
  });
  mo.observe(selectEl, { childList: true, subtree: false });

  const cleanupObserver = new MutationObserver(() => {
    if (!wrap.isConnected && panel.isConnected) {
      panel.remove();
      mo.disconnect();
      cleanupObserver.disconnect();
      if (_openDrop && _openDrop._panel === panel) _openDrop = null;
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  syncLabel();
}

export function initAllCustomSelects(root) {
  const ctx = root || document;
  ctx.querySelectorAll(
    'select.filter-sel, select.sb-select, select.dv-me-select, select.cm-select'
  ).forEach(sel => initCustomSelect(sel));
}

export const selectedTags = new Set();
export let selectedColId = null;
export function setSelectedColId(id) { selectedColId = id; }

export const sbFilter = {
  freeTag: '',
  prefix:  null,
};

export function setPrefixFilter(prefix, value) {
  sbFilter.prefix = value ? { prefix, value } : null;

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

export function clearPrefixFilter() {
  sbFilter.prefix = null;
  queueRender('sidebar');
  queueRender('cards');
}
