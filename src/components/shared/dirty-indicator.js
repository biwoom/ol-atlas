// src/components/shared/dirty-indicator.js

let _dirtyEl = null;
let _fadeTimer = null;
const DIRTY_FADE_DELAY = 5000;

function _ensureDirtyEl() {
  if (_dirtyEl && _dirtyEl.isConnected) return _dirtyEl;
  // 헤더에 삽입 시도
  const header = document.querySelector(
    '.h-header, #h-header, .app-header, header'
  );
  _dirtyEl = document.createElement('div');
  _dirtyEl.id = 'ol-dirty-indicator';
  _dirtyEl.className = 'dirty-ind';
  _dirtyEl.setAttribute('aria-live', 'polite');
  _dirtyEl.setAttribute('aria-atomic', 'true');
  if (header) {
    header.appendChild(_dirtyEl);
  } else {
    _dirtyEl.classList.add('dirty-ind-floating');
    document.body.appendChild(_dirtyEl);
  }
  return _dirtyEl;
}

function renderDirtyIndicator() {
  const el = _ensureDirtyEl();
  const dirty = isDirty();
  clearTimeout(_fadeTimer);
  el.classList.remove('dirty-ind-dirty', 'dirty-ind-clean', 'dirty-ind-hidden');
  if (dirty) {
    el.classList.add('dirty-ind-dirty');
    el.textContent = '● 변경됨';
  } else {
    el.classList.add('dirty-ind-clean');
    el.textContent = '✓ 저장됨';
    _fadeTimer = setTimeout(function() {
      if (_dirtyEl) {
        _dirtyEl.classList.remove('dirty-ind-clean');
        _dirtyEl.classList.add('dirty-ind-hidden');
      }
    }, DIRTY_FADE_DELAY);
  }
}

subscribe('dirty-indicator', renderDirtyIndicator);
