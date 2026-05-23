// src/components/color-picker.js
// ── 컬럼 색상 선택기 ─────────────────────────────────

import { dispatch }                from '../../core/action.js';
import { updateColumnColor }       from '../../actions/column-actions.js';
import { COL_COLORS }              from '../../core/constants.js';

let cpickerCol = null;
let cpickerPrevFocus = null;

export function showCPicker(e, col) {
  e.stopPropagation();
  const pk = document.getElementById('cpicker');
  pk.innerHTML = '';
  cpickerCol = col;
  cpickerPrevFocus = document.activeElement;
  COL_COLORS.forEach((c, i) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'cswatch' + (c===col.color ? ' sel' : '');
    sw.style.background = c;
    sw.dataset.colorIdx = i;
    sw.setAttribute('aria-label', `색상 ${i+1}`);
    sw.onclick = ev => {
      ev.stopPropagation();
      dispatch(updateColumnColor(col.id, c));
      closeCPicker();
    };
    pk.appendChild(sw);
  });
  const r = e.target.getBoundingClientRect();
  pk.style.top=`${r.bottom+4}px`; pk.style.left=`${r.left}px`;
  pk.classList.add('open');
  requestAnimationFrame(() => {
    const target = pk.querySelector('.cswatch.sel') || pk.querySelector('.cswatch');
    if (target) target.focus();
  });
}

export function closeCPicker() {
  const pk = document.getElementById('cpicker');
  if (!pk.classList.contains('open')) return;
  pk.classList.remove('open');
  cpickerCol = null;
  if (cpickerPrevFocus && typeof cpickerPrevFocus.focus === 'function') {
    try { cpickerPrevFocus.focus(); } catch(e) {}
  }
  cpickerPrevFocus = null;
}

document.addEventListener('click', e => {
  const pk = document.getElementById('cpicker');
  if (pk.classList.contains('open') && !pk.contains(e.target)) closeCPicker();
});

document.getElementById('cpicker').addEventListener('keydown', e => {
  const pk = e.currentTarget;
  if (!pk.classList.contains('open')) return;
  const swatches = Array.from(pk.querySelectorAll('.cswatch'));
  if (!swatches.length) return;
  const idx = swatches.indexOf(document.activeElement);
  const cols = 5;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCPicker();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    swatches[Math.min(idx+1, swatches.length-1)]?.focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    swatches[Math.max(idx-1, 0)]?.focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    swatches[Math.min(idx+cols, swatches.length-1)]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    swatches[Math.max(idx-cols, 0)]?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    swatches[0]?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    swatches[swatches.length-1]?.focus();
  }
});
