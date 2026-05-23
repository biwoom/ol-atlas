// src/core/events.js
// ── 이벤트 연결 ──────────────────────────────────────

import { S }                        from './state.js';
import { escapeHTML }               from './utils.js';
import { cardSearchText, cardPreviewText } from './body-helpers.js';
import { switchView, currentView, currentDocCardId, getPrevNextCard, registerPostSwitchHook } from './router.js';
import { queueRender }              from './render-queue.js';
import { applyTheme }               from './theme.js';
import { initAllCustomSelects }     from '../ui/custom-select.js';
import { openCardModal, closeCardModal, saveCard, editCard, setCurPri, setCurStatus, updatePriBtns, updateStatusBtns, openCardDeleteDialog } from '../components/author/card-modal.js';
import { openDocCard, isDvEditing, isDvEditDirty, startInlineEdit, saveInlineEdit, cancelInlineEdit, goToDocCard } from '../components/shared/docview.js';
import { addColumn }                from '../components/author/kanban.js';
import { lvColConfig, LV_COL_DEFS, _saveLvCols, setCgSort } from '../components/author/listview.js';
import { initTrashHandlers }        from '../components/shared/about.js';
import { attachMarkdownEditor, updateMarkdownPreview, setCmMode, closeImageDialog, insertImageFromDialog, setImgTab, checkImageFileSize, closeLinkPopover, insertLinkFromPopover } from '../components/author/md-editor.js';
import { searchActive, closeSearch, searchInput, searchClear } from '../data/search/search.js';
import { closeAllDropdowns }        from '../actions/export-import.js';

// ── Tab 포커스 트랩 ───────────────────────────────────

function trapFocus(el, e) {
  const focusable = [...el.querySelectorAll(
    'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
  )].filter(n => n.offsetParent !== null);
  if (!focusable.length) { e.preventDefault(); return; }
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

// ══════════════════════════════════════════════════════
//  EVENT WIRING
// ══════════════════════════════════════════════════════
document.querySelectorAll('.h-nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
document.getElementById('new-card-btn').addEventListener('click', () => openCardModal(null, null));
document.getElementById('add-col-btn').addEventListener('click', addColumn);
document.querySelectorAll('.pri-btn').forEach(b => b.addEventListener('click', () => { setCurPri(b.dataset.p); updatePriBtns(); }));
document.querySelectorAll('.status-btn').forEach(b => b.addEventListener('click', () => { setCurStatus(b.dataset.s); updateStatusBtns(); }));
document.getElementById('cm-close').addEventListener('click', closeCardModal);
document.getElementById('cm-cancel').addEventListener('click', closeCardModal);
document.getElementById('cm-save').addEventListener('click', saveCard);
document.getElementById('cm-del').addEventListener('click', openCardDeleteDialog);
document.getElementById('card-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCardModal(); });

initAllCustomSelects();

document.getElementById('cg-fg').addEventListener('change', () => { queueRender('cards'); queueRender('sidebar'); });
document.getElementById('cg-fs').addEventListener('change', () => queueRender('cards'));
document.getElementById('cg-sort').addEventListener('change', () => {
  setCgSort(document.getElementById('cg-sort').value);
  queueRender('cards');
});
document.getElementById('lv-fg').addEventListener('change', () => queueRender('list'));
document.getElementById('lv-fs').addEventListener('change', () => queueRender('list'));

// ── 리스트뷰 컬럼 설정 팝오버 ─────────────────────────
(function initLvColConfig() {
  const btn = document.getElementById('lv-col-config-btn');
  if (!btn) return;
  let pop = null;

  function buildPop() {
    const el = document.createElement('div');
    el.className = 'lv-col-pop';
    el.innerHTML = '<div class="lv-col-pop-title">컬럼 설정</div>';

    let dragIdx  = null;
    let overIdx  = null;
    let insertPos = null;

    function clearIndicators() {
      el.querySelectorAll('.lv-col-row').forEach(r => {
        r.classList.remove('lv-col-insert-before', 'lv-col-insert-after', 'dragging');
      });
    }

    function rebuildRows() {
      el.querySelectorAll('.lv-col-row').forEach(r => r.remove());
      lvColConfig.forEach((cfg, idx) => appendRow(cfg, idx));
    }

    function appendRow(cfg, idx) {
      const def = LV_COL_DEFS.find(d => d.key === cfg.key);
      if (!def) return;
      const row = document.createElement('div');
      row.className = 'lv-col-row' + (def.fixed ? ' fixed-col' : '');
      row.dataset.idx = String(idx);

      const handle = document.createElement('span');
      handle.className = 'lv-col-drag-handle';
      handle.textContent = '⠿';
      handle.title = '드래그하여 순서 변경';
      row.appendChild(handle);

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = cfg.visible;
      chk.disabled = def.fixed;
      chk.addEventListener('mousedown', e => e.stopPropagation());
      chk.addEventListener('change', () => {
        lvColConfig[idx].visible = chk.checked;
        _saveLvCols();
        queueRender('list');
      });
      row.appendChild(chk);

      const lbl = document.createElement('span');
      lbl.className = 'lv-col-label';
      lbl.textContent = def.label;
      row.appendChild(lbl);

      if (!def.fixed) {
        handle.addEventListener('mousedown', e => {
          e.preventDefault();
          dragIdx = idx;
          row.classList.add('dragging');

          function onMove(e2) {
            if (dragIdx === null) return;
            clearIndicators();
            el.querySelector(`[data-idx="${dragIdx}"]`)?.classList.add('dragging');
            const rows = [...el.querySelectorAll('.lv-col-row')];
            let targetRow = null, pos = 'after';
            for (const r of rows) {
              const rect = r.getBoundingClientRect();
              const mid  = rect.top + rect.height / 2;
              if (e2.clientY < mid) { targetRow = r; pos = 'before'; break; }
              else                  { targetRow = r; pos = 'after'; }
            }
            if (targetRow) {
              overIdx   = Number(targetRow.dataset.idx);
              insertPos = pos;
              if (overIdx !== dragIdx) {
                targetRow.classList.add(pos === 'before' ? 'lv-col-insert-before' : 'lv-col-insert-after');
              }
            }
          }

          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
            clearIndicators();
            if (dragIdx !== null && overIdx !== null && overIdx !== dragIdx) {
              let destIdx = insertPos === 'before' ? overIdx : overIdx + 1;
              if (dragIdx < destIdx) destIdx--;
              const moved = lvColConfig.splice(dragIdx, 1)[0];
              lvColConfig.splice(destIdx, 0, moved);
              _saveLvCols();
              queueRender('list');
              rebuildRows();
            }
            dragIdx = overIdx = insertPos = null;
          }

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup',   onUp);
        });
      }

      el.appendChild(row);
    }

    lvColConfig.forEach((cfg, idx) => appendRow(cfg, idx));

    setTimeout(() => {
      document.addEventListener('mousedown', function close(e) {
        if (!el.contains(e.target) && e.target !== btn) {
          el.remove(); pop = null;
          document.removeEventListener('mousedown', close);
        }
      });
    }, 0);

    return el;
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (pop && pop.isConnected) { pop.remove(); pop = null; return; }
    pop = buildPop();
    btn.parentElement.appendChild(pop);
  });
})();

// ── Phase 4: 문서뷰 ─────────────────────────────────
document.getElementById('cm-docview-btn').addEventListener('click', () => {
  if (!editCard) return;
  const cardId = editCard.id;
  closeCardModal();
  openDocCard(cardId);
});
document.getElementById('dv-edit-btn').addEventListener('click', () => {
  if (currentDocCardId == null) return;
  startInlineEdit();
});

// v1.5: 휴지통 핸들러 초기화
initTrashHandlers();

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (searchActive) {
      closeSearch();
      searchInput.value = '';
      searchClear.style.display = 'none';
    } else {
      closeCardModal();
    }
    document.getElementById('tag-filter-dropdown').classList.remove('open');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (document.getElementById('card-modal').classList.contains('open')) saveCard();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus(); searchInput.select();
  }
  // Ctrl/Cmd+E: 편집 진입 (문서뷰 + 읽기 모드일 때만)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
    if (currentView === 'document' && !isDvEditing() && currentDocCardId != null) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.isContentEditable) {
        e.preventDefault();
        startInlineEdit();
      }
    }
  }
  // [ / ] : 문서뷰에서 이전/다음 카드
  if ((e.key === '[' || e.key === ']') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (currentView !== 'document' || isDvEditing()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (document.querySelector('.overlay.open')) return;
    if (currentDocCardId == null) return;
    const { prev, next } = getPrevNextCard(currentDocCardId);
    if (e.key === '[' && prev) { e.preventDefault(); goToDocCard(prev.id); }
    if (e.key === ']' && next) { e.preventDefault(); goToDocCard(next.id); }
  }
  // Tab 포커스 트랩: 모달 열려 있으면 그 안에서만 순환
  if (e.key === 'Tab') {
    const cardModal = document.getElementById('card-modal');
    if (cardModal.classList.contains('open')) {
      trapFocus(cardModal.querySelector('.modal'), e);
    }
  }
});

// ══════════════════════════════════════════════════════
//  PHASE 3 — 마크다운 에디터 이벤트 와이어링
// ══════════════════════════════════════════════════════
(function initMarkdownEditor() {
  const cmMd = document.getElementById('cm-b-md');
  if (cmMd) attachMarkdownEditor(cmMd);

  const btnWrite   = document.getElementById('cm-mode-write');
  const btnPreview = document.getElementById('cm-mode-preview');
  if (btnWrite)   btnWrite.addEventListener('click',   () => setCmMode('write'));
  if (btnPreview) btnPreview.addEventListener('click', () => setCmMode('preview'));

  const dlg = document.getElementById('md-image-dialog');
  if (dlg) {
    dlg.addEventListener('click', e => { if (e.target === e.currentTarget) closeImageDialog(); });
  }
  document.getElementById('md-img-close')?.addEventListener('click', closeImageDialog);
  document.getElementById('md-img-cancel')?.addEventListener('click', closeImageDialog);
  document.getElementById('md-img-insert')?.addEventListener('click', insertImageFromDialog);
  document.querySelectorAll('.md-img-tab').forEach(t => {
    t.addEventListener('click', () => setImgTab(t.dataset.tab));
  });
  document.getElementById('md-img-file')?.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    checkImageFileSize(file);
  });

  document.getElementById('md-link-cancel')?.addEventListener('click', closeLinkPopover);
  document.getElementById('md-link-insert')?.addEventListener('click', insertLinkFromPopover);
  ['md-link-text', 'md-link-url'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); insertLinkFromPopover(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeLinkPopover(); }
    });
  });
  document.addEventListener('click', e => {
    const pop = document.getElementById('md-link-popover');
    if (!pop || !pop.classList.contains('open')) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest('.md-tb-btn[data-md="link"]')) return;
    closeLinkPopover();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const d = document.getElementById('md-image-dialog');
    if (d && d.classList.contains('open')) { closeImageDialog(); return; }
  });
})();

// ══════════════════════════════════════════════════════
//  PHASE 5 — 인라인 편집 키보드 단축키 + 떠나기 가드
// ══════════════════════════════════════════════════════
(function initInlineEditShortcuts() {
  document.addEventListener('keydown', e => {
    if (!isDvEditing()) return;
    const slashOpen = document.querySelector('#dv-md-editor .md-slash-menu.open');
    if (slashOpen) return;
    const linkPop = document.getElementById('md-link-popover');
    if (linkPop && linkPop.classList.contains('open')) return;
    const imgDlg = document.getElementById('md-image-dialog');
    if (imgDlg && imgDlg.classList.contains('open')) return;
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      saveInlineEdit();
      return;
    }
    if (e.key === 'Escape') {
      const target = e.target;
      if (target && target.id === 'dv-edit-textarea') {
        e.preventDefault();
        cancelInlineEdit();
      }
    }
  });

  window.addEventListener('beforeunload', e => {
    if (isDvEditing() && isDvEditDirty()) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
})();

// ══════════════════════════════════════════════════════
//  MOBILE UI — 햄버거 사이드바 + 모바일 검색 오버레이
// ══════════════════════════════════════════════════════

(function initMobileUI() {
  const hamburger = document.getElementById('h-hamburger');
  const sidebar   = document.getElementById('sidebar');
  const sbOverlay = document.getElementById('sb-overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    sbOverlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sbOverlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleSidebar() {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  hamburger.addEventListener('click', toggleSidebar);
  sbOverlay.addEventListener('click', closeSidebar);

  const sbMobileLogo = document.getElementById('sb-mobile-logo');
  if (sbMobileLogo) {
    const goHome = () => { closeSidebar(); switchView('home'); };
    sbMobileLogo.addEventListener('click', goHome);
    sbMobileLogo.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
    });
  }

  sidebar.addEventListener('click', function(e) {
    if (window.innerWidth < 640) {
      const item = e.target.closest('.sb-item, .sb-col-row');
      if (item) closeSidebar();
    }
  });

  // 뷰 전환 시 사이드바 닫기 — registerPostSwitchHook 사용
  registerPostSwitchHook(v => {
    if (window.innerWidth < 640) closeSidebar();
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth >= 640) closeSidebar();
  });

  // ── 모바일 검색 오버레이 ─────────────────────────────
  const mobileSearchBtn = document.getElementById('h-search-mobile-btn');
  const msoOverlay      = document.getElementById('mobile-search-overlay');
  const msoInput        = document.getElementById('mso-input');
  const msoCancel       = document.getElementById('mso-cancel');
  const msoResults      = document.getElementById('mso-results');

  function openMobileSearch() {
    msoOverlay.classList.add('open');
    msoInput.value = '';
    msoResults.innerHTML = '';
    document.body.style.overflow = 'hidden';
    setTimeout(() => msoInput.focus(), 50);
  }
  function closeMobileSearch() {
    msoOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  mobileSearchBtn.addEventListener('click', openMobileSearch);
  msoCancel.addEventListener('click', closeMobileSearch);

  let msoDebounce;
  msoInput.addEventListener('input', function() {
    const q = this.value.trim();
    clearTimeout(msoDebounce);
    if (!q) { msoResults.innerHTML = ''; return; }
    msoDebounce = setTimeout(() => runMobileSearch(q), 180);
  });

  function runMobileSearch(q) {
    const kw = q.toLowerCase();
    const matches = (S.cards || []).filter(c => {
      if ((c.title || '').toLowerCase().includes(kw)) return true;
      if ((c.tags  || []).some(t => t.toLowerCase().includes(kw))) return true;
      return cardSearchText(c).toLowerCase().includes(kw);
    }).slice(0, 20);

    if (!matches.length) {
      msoResults.innerHTML = `<div class="mso-empty">검색 결과가 없습니다</div>`;
      return;
    }

    function highlight(text, kw) {
      if (!text) return '';
      const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return escapeHTML(text).replace(re, '<mark>$1</mark>');
    }

    msoResults.innerHTML = matches.map(card => {
      const preview = cardPreviewText(card);
      return `
      <div class="mso-item" data-id="${card.id}">
        <div class="mso-item-title">${highlight(card.title || '(제목 없음)', q)}</div>
        ${preview ? `<div class="mso-item-body">${highlight(preview.slice(0, 80), q)}</div>` : ''}
      </div>`;
    }).join('');

    msoResults.querySelectorAll('.mso-item').forEach(el => {
      el.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const card = (S.cards || []).find(c => c.id === id);
        if (card) { closeMobileSearch(); openCardModal(card); }
      });
    });
  }

  msoInput.addEventListener('keydown', function(e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'Escape') closeMobileSearch();
  });

  // ── 사이드바 모바일 패널 버튼 연결 ───────────────────
  const sbMpTheme = document.getElementById('sb-mp-theme');
  sbMpTheme && sbMpTheme.addEventListener('click', function() {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
    const label = document.getElementById('sb-mp-theme-label');
    if (label) label.textContent = isDark ? '다크 모드' : '라이트 모드';
  });

  // ── 모바일 저장 드롭다운 ─────────────────────────────
  ['sb-save-dropdown', 'sb-open-dropdown'].forEach(id => {
    const wrap    = document.getElementById(id);
    const trigger = id === 'sb-save-dropdown'
      ? document.getElementById('sb-save-trigger')
      : document.getElementById('sb-open-trigger');
    if (!wrap || !trigger) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.sb-mp-dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    });
  });

  const sbMpExport = document.getElementById('sb-mp-export');
  sbMpExport && sbMpExport.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('export-btn').click(); });
  const sbMpExportJson = document.getElementById('sb-mp-export-json');
  sbMpExportJson && sbMpExportJson.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('export-json-btn').click(); });
  const sbMpExportMd = document.getElementById('sb-mp-export-md');
  sbMpExportMd && sbMpExportMd.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('export-md-btn').click(); });
  const sbMpExportMdEach = document.getElementById('sb-mp-export-md-each');
  sbMpExportMdEach && sbMpExportMdEach.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('export-md-each-btn').click(); });

  const sbMpImport = document.getElementById('sb-mp-import');
  sbMpImport && sbMpImport.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('import-btn').click(); });
  const sbMpImportJson = document.getElementById('sb-mp-import-json');
  sbMpImportJson && sbMpImportJson.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('import-json-btn').click(); });
  const sbMpImportMd = document.getElementById('sb-mp-import-md');
  sbMpImportMd && sbMpImportMd.addEventListener('click', () => { closeSidebar(); closeAllDropdowns(); document.getElementById('import-md-btn').click(); });

  (function syncThemeLabel() {
    const label = document.getElementById('sb-mp-theme-label');
    if (label) {
      label.textContent = document.documentElement.classList.contains('dark')
        ? '라이트 모드' : '다크 모드';
    }
  })();
})();
