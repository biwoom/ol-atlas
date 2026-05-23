// src/core/render-queue.js
// ── rAF 기반 렌더 큐 ─────────────────────────────────────

import { devLog, devGroup } from './dev.js';
import { listViews, getSubscriber } from './store.js';

const _renderQueue = new Set();
let _renderScheduled = false;

export function queueRender(viewName) {
  _renderQueue.add(viewName);
  devLog('QUEUE', viewName, '(queue size: ' + _renderQueue.size + ')');
  if (!_renderScheduled) {
    _renderScheduled = true;
    requestAnimationFrame(_renderFlush);
  }
}

function _renderFlush() {
  _renderScheduled = false;
  if (_renderQueue.size === 0) return;

  const targets = _renderQueue.has('__all__') ? listViews() : Array.from(_renderQueue);
  _renderQueue.clear();

  devGroup('FLUSH', 'flush ' + targets.length + ' view(s)', function() {
    for (let i = 0; i < targets.length; i++) {
      const v = targets[i];
      const fn = getSubscriber(v);
      if (!fn) {
        devLog('FLUSH', 'no subscriber for view: ' + v);
        continue;
      }
      devLog('RENDER', v);
      try {
        fn();
      } catch(err) {
        console.error('[RENDER FAIL] ' + v + ':', err);
      }
    }
  });
}

export function flushNow() {
  _renderScheduled = false;
  _renderFlush();
}
