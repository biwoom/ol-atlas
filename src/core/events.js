// src/core/events.js
// ── 이벤트 연결 ──────────────────────────────────────

// ══════════════════════════════════════════════════════
//  EVENT WIRING
// ══════════════════════════════════════════════════════
document.querySelectorAll('.h-nav-btn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.getElementById('new-card-btn').addEventListener('click',()=>openCardModal(null,null));
document.getElementById('add-col-btn').addEventListener('click', addColumn);
document.querySelectorAll('.pri-btn').forEach(b=>b.addEventListener('click',()=>{curPri=b.dataset.p;updatePriBtns();}));
document.querySelectorAll('.status-btn').forEach(b=>b.addEventListener('click',()=>{curStatus=b.dataset.s;updateStatusBtns();}));
document.getElementById('cm-close').addEventListener('click',closeCardModal);
document.getElementById('cm-cancel').addEventListener('click',closeCardModal);
document.getElementById('cm-save').addEventListener('click',saveCard);
document.getElementById('cm-del').addEventListener('click',_cmDeleteCard);
document.getElementById('card-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeCardModal();});
// ── 커스텀 드롭다운 초기화 (filter-sel) ──
if (typeof initAllCustomSelects === 'function') initAllCustomSelects();

document.getElementById('cg-fg').addEventListener('change',()=>{ queueRender('cards'); queueRender('sidebar'); });
document.getElementById('cg-fs').addEventListener('change',()=>queueRender('cards'));
document.getElementById('cg-sort').addEventListener('change',()=>{
  cgSort = document.getElementById('cg-sort').value;
  try { localStorage.setItem('ol_cg_sort', cgSort); } catch(_){}
  queueRender('cards');
});
document.getElementById('lv-fg').addEventListener('change',()=>queueRender('list'));
document.getElementById('lv-fs').addEventListener('change',()=>queueRender('list'));

// ── 리스트뷰 컬럼 설정 팝오버 ─────────────────────────
(function initLvColConfig() {
  const btn = document.getElementById('lv-col-config-btn');
  if (!btn) return;
  let pop = null;

  function buildPop() {
    const el = document.createElement('div');
    el.className = 'lv-col-pop';
    el.innerHTML = '<div class="lv-col-pop-title">컬럼 설정</div>';

    // ── 마우스 드래그 상태 ──────────────────────────────
    let dragIdx  = null;   // 드래그 중인 행의 lvColConfig 인덱스
    let overIdx  = null;   // 현재 hover 중인 행 인덱스
    let insertPos = null;  // 'before' | 'after'

    function clearIndicators() {
      el.querySelectorAll('.lv-col-row').forEach(r => {
        r.classList.remove('lv-col-insert-before', 'lv-col-insert-after', 'dragging');
      });
    }

    function rebuildRows() {
      // 기존 행 모두 제거 후 재생성
      el.querySelectorAll('.lv-col-row').forEach(r => r.remove());
      lvColConfig.forEach((cfg, idx) => appendRow(cfg, idx));
    }

    function appendRow(cfg, idx) {
      const def = LV_COL_DEFS.find(d => d.key === cfg.key);
      if (!def) return;
      const row = document.createElement('div');
      row.className = 'lv-col-row' + (def.fixed ? ' fixed-col' : '');
      row.dataset.idx = String(idx);

      // 드래그 핸들
      const handle = document.createElement('span');
      handle.className = 'lv-col-drag-handle';
      handle.textContent = '⠿';
      handle.title = '드래그하여 순서 변경';
      row.appendChild(handle);

      // 체크박스
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = cfg.visible;
      chk.disabled = def.fixed;
      chk.addEventListener('mousedown', e => e.stopPropagation()); // 핸들 드래그와 분리
      chk.addEventListener('change', () => {
        lvColConfig[idx].visible = chk.checked;
        _saveLvCols();
        queueRender('list');
      });
      row.appendChild(chk);

      // 레이블
      const lbl = document.createElement('span');
      lbl.className = 'lv-col-label';
      lbl.textContent = def.label;
      row.appendChild(lbl);

      // 드래그: fixed 컬럼은 핸들 비활성
      if (!def.fixed) {
        handle.addEventListener('mousedown', e => {
          e.preventDefault();
          dragIdx = idx;
          row.classList.add('dragging');

          function onMove(e2) {
            if (dragIdx === null) return;
            clearIndicators();
            el.querySelector(`[data-idx="${dragIdx}"]`)?.classList.add('dragging');

            // 마우스 위치 기준으로 가장 가까운 행 탐색
            const rows = [...el.querySelectorAll('.lv-col-row')];
            let targetRow = null, pos = 'after';
            for (const r of rows) {
              const rect = r.getBoundingClientRect();
              const mid  = rect.top + rect.height / 2;
              if (e2.clientY < mid) {
                targetRow = r; pos = 'before'; break;
              } else {
                targetRow = r; pos = 'after';
              }
            }
            if (targetRow) {
              overIdx   = Number(targetRow.dataset.idx);
              insertPos = pos;
              if (overIdx !== dragIdx) {
                targetRow.classList.add(
                  pos === 'before' ? 'lv-col-insert-before' : 'lv-col-insert-after'
                );
              }
            }
          }

          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
            clearIndicators();

            if (dragIdx !== null && overIdx !== null && overIdx !== dragIdx) {
              // 삽입 위치 계산
              let destIdx = insertPos === 'before' ? overIdx : overIdx + 1;
              if (dragIdx < destIdx) destIdx--;   // 앞에서 뒤로 이동 시 보정
              const moved = lvColConfig.splice(dragIdx, 1)[0];
              lvColConfig.splice(destIdx, 0, moved);
              _saveLvCols();
              queueRender('list');     // 테이블 즉시 갱신
              rebuildRows();    // 팝오버 내부 행만 재생성 (팝오버는 유지)
            }
            dragIdx = overIdx = insertPos = null;
          }

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup',   onUp);
        });
      }

      el.appendChild(row);
    }

    // 초기 행 생성
    lvColConfig.forEach((cfg, idx) => appendRow(cfg, idx));

    // 외부 클릭 시 닫기
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
// ─────────────────────────────────────────────────────

// ── Phase 4: 문서뷰 ─────────────────────────────────
document.getElementById('cm-docview-btn').addEventListener('click', () => {
  if (!editCard) return;

  // closeCardModal() 호출 전에 ID 백업
  const cardId = editCard.id;

  closeCardModal();
  openDocCard(cardId);
});
document.getElementById('dv-edit-btn').addEventListener('click', () => {
  if (currentDocCardId == null) return;
  // Phase 5: 모달 대신 인라인 편집 모드 진입
  startInlineEdit();
});

// ── End card modal wiring ───────────────────────────────

// v1.5: 휴지통 핸들러 초기화
initTrashHandlers();

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') {
    if (searchActive) {
      closeSearch();
      searchInput.value = '';
      searchClear.style.display = 'none';
    } else {
      closeCardModal();
    }
    document.getElementById('tag-filter-dropdown').classList.remove('open');
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
    if(document.getElementById('card-modal').classList.contains('open')) saveCard();
  }
  // Ctrl+K / Cmd+K 로 검색 포커스
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){
    e.preventDefault();
    searchInput.focus(); searchInput.select();
  }
  // ── 문서뷰 전용 단축키 ───────────────────────────────
  // Ctrl/Cmd+E: 편집 진입 (문서뷰 + 읽기 모드일 때만)
  if ((e.ctrlKey||e.metaKey) && (e.key === 'e' || e.key === 'E')) {
    if (currentView === 'document' && !dvEditing && currentDocCardId != null) {
      // 입력 필드에 포커스 중일 땐 스킵 (브라우저 기본 동작 보존)
      const tag = (e.target && e.target.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.isContentEditable) {
        e.preventDefault();
        startInlineEdit();
      }
    }
  }
  // [ / ] : 문서뷰에서 이전/다음 카드
  if ((e.key === '[' || e.key === ']') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (currentView !== 'document' || dvEditing) return;
    // 입력 필드 포커스 중이면 스킵
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    // 모달 열려 있으면 스킵
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
  // 카드 모달의 마크다운 textarea에 에디터 부착
  const cmMd = document.getElementById('cm-b-md');
  if (cmMd) attachMarkdownEditor(cmMd);

  // ── 카드 모달 모드 토글 배지 ─────────────────────────
  // 기본 모드: 'preview' (openCardModal 시 갱신)
  const splitPane    = document.getElementById('cm-split-pane');
  const btnWrite     = document.getElementById('cm-mode-write');
  const btnPreview   = document.getElementById('cm-mode-preview');

  function setCmMode(mode) {
    if (!splitPane) return;
    splitPane.classList.remove('mode-write', 'mode-preview');
    splitPane.classList.add('mode-' + mode);
    if (btnWrite)   btnWrite.classList.toggle('active',   mode === 'write');
    if (btnPreview) btnPreview.classList.toggle('active', mode === 'preview');
    // 미리보기 모드로 전환 시 즉시 렌더
    if (mode === 'preview' && cmMd) updateMarkdownPreview(cmMd);
    // 편집 모드로 전환 시 textarea 포커스
    if (mode === 'write') requestAnimationFrame(() => cmMd && cmMd.focus());
  }

  if (btnWrite)   btnWrite.addEventListener('click',   () => setCmMode('write'));
  if (btnPreview) btnPreview.addEventListener('click', () => setCmMode('preview'));

  // openCardModal 호출 후 프리뷰 갱신 + 기본 모드 복원을 위해
  // 전역에 setCmMode를 노출 (openCardModal에서 호출)
  window._setCmMode = setCmMode;

  // ── 이미지 다이얼로그 ──────────────────────────────
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

  // ── 링크 popover ──────────────────────────────────
  document.getElementById('md-link-cancel')?.addEventListener('click', closeLinkPopover);
  document.getElementById('md-link-insert')?.addEventListener('click', insertLinkFromPopover);
  // popover 안에서 Enter는 삽입, Esc는 닫기
  ['md-link-text','md-link-url'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        insertLinkFromPopover();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLinkPopover();
      }
    });
  });
  // popover 외부 클릭 시 닫기
  document.addEventListener('click', e => {
    const pop = document.getElementById('md-link-popover');
    if (!pop || !pop.classList.contains('open')) return;
    if (pop.contains(e.target)) return;
    // 툴바의 link 버튼을 누른 경우엔 방금 열렸으므로 무시
    if (e.target.closest('.md-tb-btn[data-md="link"]')) return;
    closeLinkPopover();
  });

  // 이미지 다이얼로그/링크 popover 안에서 Esc 닫기
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const dlg = document.getElementById('md-image-dialog');
    if (dlg && dlg.classList.contains('open')) { closeImageDialog(); return; }
  });
})();

// ══════════════════════════════════════════════════════
//  PHASE 5 — 인라인 편집 키보드 단축키 + 떠나기 가드
// ══════════════════════════════════════════════════════
(function initInlineEditShortcuts() {
  // Ctrl/Cmd+S → 저장,  Esc → 취소 (단, 슬래시 메뉴/링크 popover/이미지 다이얼로그는 우선)
  document.addEventListener('keydown', e => {
    if (!dvEditing) return;

    // 다른 오버레이가 열린 상태면 그쪽 우선
    const slashOpen = document.querySelector('#dv-md-editor .md-slash-menu.open');
    if (slashOpen) return; // 슬래시 메뉴 자체 키 핸들러가 처리
    const linkPop = document.getElementById('md-link-popover');
    if (linkPop && linkPop.classList.contains('open')) return;
    const imgDlg  = document.getElementById('md-image-dialog');
    if (imgDlg && imgDlg.classList.contains('open')) return;

    // IME 합성 중 무시
    if (e.isComposing || e.keyCode === 229) return;

    // Ctrl/Cmd+S
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      saveInlineEdit();
      return;
    }
    // Esc
    if (e.key === 'Escape') {
      // textarea 안에서 발생한 Esc만 처리 (다른 곳에서의 Esc는 영향 안 줌)
      const target = e.target;
      if (target && target.id === 'dv-edit-textarea') {
        e.preventDefault();
        cancelInlineEdit();
      }
    }
  });

  // 페이지 떠나기 가드 — 변경 사항 있을 때 브라우저 표준 confirm
  window.addEventListener('beforeunload', e => {
    if (dvEditing && isDvEditDirty()) {
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
  const hamburger  = document.getElementById('h-hamburger');
  const sidebar    = document.getElementById('sidebar');
  const sbOverlay  = document.getElementById('sb-overlay');

  // ── 사이드바 열기/닫기 ──────────────────────────────
  function openSidebar() {
    sidebar.classList.add('open');
    sbOverlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    // 열릴 때 body 스크롤 막기
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

  // 모바일 사이드바 로고 클릭 → 홈으로
  const sbMobileLogo = document.getElementById('sb-mobile-logo');
  if (sbMobileLogo) {
    const goHome = () => { closeSidebar(); switchView('home'); };
    sbMobileLogo.addEventListener('click', goHome);
    sbMobileLogo.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
    });
  }

  // 사이드바 항목 클릭 시 자동으로 닫기 (모바일)
  sidebar.addEventListener('click', function(e) {
    if (window.innerWidth < 640) {
      const item = e.target.closest('.sb-item, .sb-col-row');
      if (item) closeSidebar();
    }
  });

  // 뷰 전환 시 사이드바 닫기 — switchView 후킹
  const _origSwitchView = window.switchView;
  if (typeof _origSwitchView === 'function') {
    window.switchView = function(v) {
      _origSwitchView(v);
      if (window.innerWidth < 640) closeSidebar();
    };
  }

  // 리사이즈 시 데스크탑 너비면 상태 초기화
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 640) {
      closeSidebar();
    }
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

  // 모바일 검색 입력 (180ms 디버운스)
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
      if ((c.title||'').toLowerCase().includes(kw)) return true;
      if ((c.tags||[]).some(t => t.toLowerCase().includes(kw))) return true;
      // 본문은 plain/markdown 양쪽 모두
      return cardSearchText(c).toLowerCase().includes(kw);
    }).slice(0, 20);

    if (!matches.length) {
      msoResults.innerHTML = `<div class="mso-empty">검색 결과가 없습니다</div>`;
      return;
    }

    function highlight(text, kw) {
      if (!text) return '';
      const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
      return escapeHTML(text).replace(re, '<mark>$1</mark>');
    }

    msoResults.innerHTML = matches.map(card => {
      const preview = cardPreviewText(card);
      return `
      <div class="mso-item" data-id="${card.id}">
        <div class="mso-item-title">${highlight(card.title||'(제목 없음)', q)}</div>
        ${preview ? `<div class="mso-item-body">${highlight(preview.slice(0,80), q)}</div>` : ''}
      </div>`;
    }).join('');

    msoResults.querySelectorAll('.mso-item').forEach(el => {
      el.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const card = (S.cards||[]).find(c => c.id === id);
        if (card) {
          closeMobileSearch();
          openCardModal(card);
        }
      });
    });
  }

  // 모바일 검색 키보드 처리
  msoInput.addEventListener('keydown', function(e) {
    // 한글 IME 합성 중 keydown 무시
    if (e.isComposing || e.keyCode === 229) return;
    // Enter 는 form-submit 등 default action 차단
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'Escape') closeMobileSearch();
  });

  // ── 사이드바 모바일 패널 버튼 연결 ───────────────────
  const sbMpTheme = document.getElementById('sb-mp-theme');

  // 테마 토글
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

  // 모바일 저장 항목들
  const sbMpExport = document.getElementById('sb-mp-export');
  sbMpExport && sbMpExport.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('export-btn').click();
  });
  const sbMpExportJson = document.getElementById('sb-mp-export-json');
  sbMpExportJson && sbMpExportJson.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('export-json-btn').click();
  });
  const sbMpExportMd = document.getElementById('sb-mp-export-md');
  sbMpExportMd && sbMpExportMd.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('export-md-btn').click();
  });
  const sbMpExportMdEach = document.getElementById('sb-mp-export-md-each');
  sbMpExportMdEach && sbMpExportMdEach.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('export-md-each-btn').click();
  });

  // 모바일 열기 항목들
  const sbMpImport = document.getElementById('sb-mp-import');
  sbMpImport && sbMpImport.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('import-btn').click();
  });
  const sbMpImportJson = document.getElementById('sb-mp-import-json');
  sbMpImportJson && sbMpImportJson.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('import-json-btn').click();
  });
  const sbMpImportMd = document.getElementById('sb-mp-import-md');
  sbMpImportMd && sbMpImportMd.addEventListener('click', () => {
    closeSidebar(); closeAllDropdowns();
    document.getElementById('import-md-btn').click();
  });


  // 초기 테마 라벨 동기화
  (function syncThemeLabel() {
    const label = document.getElementById('sb-mp-theme-label');
    if (label) {
      label.textContent = document.documentElement.classList.contains('dark')
        ? '라이트 모드' : '다크 모드';
    }
    // 로고 타이틀 동기화
    // const logoTitle = document.getElementById('sb-logo-title');
    // if (logoTitle) logoTitle.textContent = S?.meta?.title || '올';
  })();
})();
