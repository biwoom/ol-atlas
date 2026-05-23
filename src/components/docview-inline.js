// src/components/docview-inline.js
// ── 문서뷰 인라인 편집 (Phase 5) ─────────────────────

// 문서뷰에서 다른 카드로 이동
async function goToDocCard(cardId) {
  // Phase 5: 인라인 편집 중이고 변경이 있으면 confirm
  if (dvEditing && isDvEditDirty()) {
    const ok = await customConfirm({
      title: '카드 이동',
      message: '저장되지 않은 변경사항이 있습니다.\n다른 카드로 이동하시겠습니까?',
      confirmText: '이동',
      cancelText: '취소',
    });
    if (!ok) return;
  }
  // 편집 모드 강제 종료 (저장 안 됨)
  dvEditing = false;
  dvEditOriginal = '';

  currentDocCardId = cardId;
  queueRender('docview');
  queueRender('sidebar');  // 문서뷰 트리 active 카드 갱신
  // 페이지 상단으로 스크롤
  const main = document.getElementById('main');
  if (main) main.scrollTop = 0;
  // v1.5: hash 갱신
  updateHash('document');
}

// 외부 진입점: 어떤 카드든 문서뷰로 열기
function openDocCard(cardId) {
  // Phase 5: 다른 곳에서 진입할 때도 편집 상태 초기화
  dvEditing = false;
  dvEditOriginal = '';

  currentDocCardId = cardId;
  switchView('document');
}

// ══════════════════════════════════════════════════════
//  문서뷰 인라인 편집 (마크다운 단일 모드 + 메타 편집)
// ══════════════════════════════════════════════════════

let dvEditing      = false;  // 현재 인라인 편집 중인가
let dvEditOriginal = '';     // 본문 편집 시작 시점 원본 (dirty 체크용)
let dvEditPri      = 'mid';  // 편집 중 우선순위
let dvEditStatus   = 'wait'; // 편집 중 학습상태

function getDvEditValue() {
  if (!dvEditing) return '';
  const ta = document.getElementById('dv-edit-textarea');
  return ta ? ta.value : '';
}

// dirty 체크 — 본문 OR 메타 중 하나라도 변경됐으면 true
function isDvEditDirty() {
  if (!dvEditing) return false;
  if (getDvEditValue() !== dvEditOriginal) return true;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) return false;
  const titleEl = document.getElementById('dv-me-title');
  const groupEl = document.getElementById('dv-me-group');
  const tagsEl  = document.getElementById('dv-me-tags');
  const colEl   = document.getElementById('dv-me-col');
  if (titleEl && titleEl.value.trim()  !== (card.title  || '')) return true;
  if (groupEl && groupEl.value.trim()  !== (card.group  || '')) return true;
  if (tagsEl  && tagsEl.value.trim()   !== (card.tags   || []).join(', ')) return true;
  if (colEl   && parseInt(colEl.value) !== card.colId)           return true;
  if (dvEditPri    !== (card.priority || 'mid'))                  return true;
  if (dvEditStatus !== (S.userData.status[card.id] || 'wait'))   return true;
  return false;
}

// 메타 편집 패널 HTML 생성
function buildDvMetaEditHTML(card) {
  const colOptions = S.columns.map(col =>
    `<option value="${col.id}" ${col.id === card.colId ? 'selected' : ''}>${escapeHTML(col.title)}</option>`
  ).join('');

  const priMap = [['high','높음'],['mid','보통'],['low','낮음']];
  const priHTML = priMap.map(([v,l]) => {
    const sel = dvEditPri === v ? ` sel-${v[0]}` : '';
    return `<button type="button" class="dv-me-btn${sel}" data-dv-pri="${v}">${l}</button>`;
  }).join('');

  const stMap = [['wait','학습대기'],['doing','학습중'],['done','학습완료']];
  const stHTML = stMap.map(([v,l]) => {
    const sel = dvEditStatus === v ? ` sel-${v}` : '';
    return `<button type="button" class="dv-me-btn${sel}" data-dv-st="${v}">${l}</button>`;
  }).join('');

  return `
    <div class="dv-meta-edit" id="dv-meta-edit">
      <div class="dv-me-row">
        <span class="dv-me-label">그룹</span>
        <input class="dv-me-input" id="dv-me-group" type="text" placeholder="예: 불교철학, 번역"
               value="${escapeHTML(card.group || '')}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">태그</span>
        <input class="dv-me-input" id="dv-me-tags" type="text" placeholder="예: 화엄, 연기 (쉼표 구분)"
               value="${escapeHTML((card.tags || []).join(', '))}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">슬러그</span>
        <input class="dv-me-input" id="dv-me-slug" type="text" maxlength="60"
               placeholder="URL 식별자 (비워두면 제목에서 자동 생성)"
               value="${escapeHTML(card.slug || '')}">
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">컬럼</span>
        <select class="dv-me-select" id="dv-me-col">${colOptions}</select>
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">우선순위</span>
        <div class="dv-me-toggle-row" id="dv-me-pri-row">${priHTML}</div>
      </div>
      <div class="dv-me-row">
        <span class="dv-me-label">학습상태</span>
        <div class="dv-me-toggle-row" id="dv-me-st-row">${stHTML}</div>
      </div>
    </div>`;
}

// 우선순위·학습상태 버튼 이벤트 연결
function attachDvMetaBtnHandlers() {
  document.querySelectorAll('#dv-me-pri-row [data-dv-pri]').forEach(btn => {
    btn.addEventListener('click', () => {
      dvEditPri = btn.dataset.dvPri;
      document.querySelectorAll('#dv-me-pri-row [data-dv-pri]').forEach(b => {
        b.className = 'dv-me-btn' + (b.dataset.dvPri === dvEditPri ? ` sel-${dvEditPri[0]}` : '');
      });
    });
  });
  document.querySelectorAll('#dv-me-st-row [data-dv-st]').forEach(btn => {
    btn.addEventListener('click', () => {
      dvEditStatus = btn.dataset.dvSt;
      document.querySelectorAll('#dv-me-st-row [data-dv-st]').forEach(b => {
        b.className = 'dv-me-btn' + (b.dataset.dvSt === dvEditStatus ? ` sel-${dvEditStatus}` : '');
      });
    });
  });
}

// 에디터 영역(dv-body 또는 기존 dv-edit-area) → 마크다운 에디터로 교체
function applyDvEditArea(initialValue) {
  const existing = document.getElementById('dv-body') || document.querySelector('.dv-edit-area');
  if (!existing) return;

  existing.outerHTML = `
    <div class="dv-edit-area">
      <div class="md-editor" id="dv-md-editor">
        <div class="md-toolbar" role="toolbar" aria-label="마크다운 서식 도구">
          <button type="button" class="md-tb-btn" data-md="h1"     title="제목 1"><span class="md-tb-text">H1</span></button>
          <button type="button" class="md-tb-btn" data-md="h2"     title="제목 2"><span class="md-tb-text">H2</span></button>
          <button type="button" class="md-tb-btn" data-md="h3"     title="제목 3"><span class="md-tb-text">H3</span></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="bold"   title="굵게 (Ctrl+B)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="italic" title="기울임 (Ctrl+I)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="strike" title="취소선"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="code"   title="인라인 코드"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="quote"  title="인용"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="ul"     title="불릿 목록"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="ol"     title="번호 목록"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="check"  title="체크박스"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></button>
          <span class="md-tb-sep"></span>
          <button type="button" class="md-tb-btn" data-md="link"   title="링크"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="image"  title="이미지"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></button>
          <button type="button" class="md-tb-btn" data-md="hr"     title="구분선"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg></button>
        </div>
        <div class="md-split-pane">
          <div class="md-editor-pane">
            <textarea id="dv-edit-textarea" class="dv-edit-md"
              placeholder="마크다운으로 입력하세요...&#10;&#10;빈 줄에서 / 를 입력하면 블록 메뉴가 열립니다."></textarea>
          </div>
          <div class="md-preview-pane">
            <div class="md-preview-body">
              <div class="md-preview-empty">미리보기가 여기에 표시됩니다</div>
            </div>
          </div>
        </div>
        <div class="md-slash-menu" role="listbox" aria-label="블록 메뉴"></div>
      </div>
      <!-- v1.5: 이미지 패널 — md-editor 하단 -->
      <div class="dv-img-panel" id="dv-img-panel-row" style="display:none">
        <div class="dv-img-panel-header">
          <span class="dv-img-panel-label">이미지 목록</span>
          <span class="field-hint">alt·주소 수정 가능</span>
        </div>
        <div class="cm-img-list" id="dv-img-list"></div>
      </div>
    </div>`;

  const ta = document.getElementById('dv-edit-textarea');
  if (ta) {
    ta.value = initialValue;
    attachMarkdownEditor(ta);
    // preventScroll: true — 포커스 시 브라우저 자동 스크롤 방지
    // (스크롤 복원은 startInlineEdit의 requestAnimationFrame에서 담당)
    requestAnimationFrame(() => {
      ta.focus({ preventScroll: true });
      try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch(e) {}
    });
  }
}

// 편집 모드 진입 — 메타 패널 + 제목 input + 본문 에디터 모두 구성
function startInlineEdit() {
  if (currentDocCardId == null) return;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) return;

  // v1.5: 미리보기 렌더링 컨텍스트
  _currentEditingCard = card;

  // 편집 진입 직전 스크롤 위치 기억 (편집 후 복원용)
  const mainEl = document.getElementById('main');
  const savedScroll = mainEl ? mainEl.scrollTop : 0;

  // 편집 모드 진입 시 TOC 숨김 + Observer 정리
  const tocEl = document.getElementById('dv-toc');
  if (tocEl) tocEl.style.display = 'none';
  if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }

  dvEditing    = true;
  dvEditPri    = card.priority || 'mid';
  dvEditStatus = S.userData.status[card.id] || 'wait';
  const initial = card.body || '';
  dvEditOriginal = initial;

  const wrap = document.getElementById('dv-wrap');
  if (!wrap) return;

  // 1) dv-meta → 메타 편집 패널로 교체
  const metaEl = wrap.querySelector('.dv-meta');
  if (metaEl) metaEl.outerHTML = buildDvMetaEditHTML(card);

  // 2) dv-title → 제목 input으로 교체
  const titleEl = wrap.querySelector('.dv-title');
  if (titleEl) {
    titleEl.outerHTML = `<input class="dv-me-title-input" id="dv-me-title"
      type="text" placeholder="제목을 입력하세요" value="${escapeHTML(card.title || '')}">`;
  }

  // 3) dv-body → 마크다운 에디터로 교체
  applyDvEditArea(initial);

  // 4) 메타 버튼 이벤트 연결
  attachDvMetaBtnHandlers();

  // 4-0) 커스텀 드롭다운 초기화 (dv-me-col)
  // 인라인 편집 진입마다 새 DOM이 만들어지므로 매번 호출
  requestAnimationFrame(() => {
    const dvCol = document.getElementById('dv-me-col');
    if (dvCol && !dvCol._csInit && typeof initCustomSelect === 'function') {
      initCustomSelect(dvCol);
    }
  });

  // 4-1) v1.5: 문서뷰 이미지 패널 렌더
  renderDvImgPanel();

  // 5) 헤더 액션바를 저장/취소로 교체
  swapDvBarToEditMode();

  // 6) DOM 교체 후 스크롤 복원 → 그 다음 포커스 (포커스가 스크롤을 다시 움직이지 않도록)
  requestAnimationFrame(() => {
    // 스크롤 먼저 복원
    if (mainEl) mainEl.scrollTop = savedScroll;
    // 포커스: scrollIntoView를 막기 위해 preventScroll 옵션 사용
    const ti = document.getElementById('dv-me-title');
    if (ti) ti.focus({ preventScroll: true });
  });
}

// 헤더 액션바 → 편집 모드 (저장 / 취소)
function swapDvBarToEditMode() {
  const bar = document.querySelector('#view-document .view-bar');
  if (!bar) return;
  const editBtn = document.getElementById('dv-edit-btn');
  if (editBtn) editBtn.style.display = 'none';

  let actions = document.getElementById('dv-edit-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.id = 'dv-edit-actions';
    actions.className = 'dv-edit-actions';
    actions.innerHTML = `
      <button class="btn sm danger" id="dv-edit-delete" title="카드 삭제 (휴지통)">삭제</button>
      <button class="btn sm" id="dv-edit-export-md" title=".md 파일 내보내기">↓ md</button>
      <span class="dv-edit-actions-sep"></span>
      <button class="btn sm" id="dv-edit-cancel" title="취소 (Esc)">취소</button>
      <button class="btn pri sm" id="dv-edit-save" title="저장 (Ctrl+S)">저장</button>
    `;
    bar.appendChild(actions);
    document.getElementById('dv-edit-cancel').addEventListener('click', cancelInlineEdit);
    document.getElementById('dv-edit-save').addEventListener('click', saveInlineEdit);
    document.getElementById('dv-edit-delete').addEventListener('click', () => {
      if (!currentDocCardId) return;
      // editCard 임시 세팅 후 deleteCard 호출
      editCard = S.cards.find(c => c.id === currentDocCardId) || null;
      if (editCard) deleteCard();
    });
    document.getElementById('dv-edit-export-md').addEventListener('click', () => {
      const card = _currentEditingCard || S.cards.find(c => c.id === currentDocCardId);
      if (!card) return;
      const mdText = cardToMarkdownText(card);
      const filename = slugFilename(card.title || 'card', 'card-' + card.id) + '.md';
      dlBlob(new Blob([mdText], { type: 'text/markdown; charset=utf-8' }), filename);
      toast('마크다운 파일을 내보냈습니다');
    });
  } else {
    actions.style.display = '';
  }
}

// 헤더 액션바 → 읽기 모드
function swapDvBarToReadMode() {
  const editBtn = document.getElementById('dv-edit-btn');
  if (editBtn) editBtn.style.display = '';
  const actions = document.getElementById('dv-edit-actions');
  if (actions) actions.style.display = 'none';
}

// 저장 — 본문 + 메타 필드 일괄 반영
function saveInlineEdit() {
  if (!dvEditing) return;
  const card = S.cards.find(c => c.id === currentDocCardId);
  if (!card) { cancelInlineEdit(); return; }

  const titleEl = document.getElementById('dv-me-title');
  const newTitle = titleEl ? titleEl.value.trim() : card.title;
  if (!newTitle) { toast('제목을 입력해주세요'); if (titleEl) titleEl.focus(); return; }

  const groupEl  = document.getElementById('dv-me-group');
  const tagsEl   = document.getElementById('dv-me-tags');
  const colEl    = document.getElementById('dv-me-col');
  const slugEl   = document.getElementById('dv-me-slug');
  const newGroup = groupEl ? groupEl.value.trim() : (card.group || '');
  const newTags  = tagsEl  ? tagsEl.value.split(',').map(t => t.trim()).filter(Boolean) : (card.tags || []);
  const colRaw   = colEl   ? parseInt(colEl.value, 10) : card.colId;
  const newColId = Number.isFinite(colRaw) ? colRaw : card.colId;

  // v1.5: slug
  let newSlug = slugEl ? slugEl.value.trim() : (card.slug || '');
  if (!newSlug) newSlug = titleToSlug(newTitle);
  if (!newSlug) newSlug = 'card-' + card.id;
  newSlug = titleToSlug(newSlug) || ('card-' + card.id);

  const newBody = getDvEditValue();
  dispatch(updateCard(card.id, {
    title:    newTitle,
    group:    newGroup,
    tags:     newTags,
    colId:    newColId,
    priority: dvEditPri,
    slug:     newSlug,
    body:     newBody,
    status:   dvEditStatus,
  }));

  dvEditing = false;
  dvEditOriginal = '';
  _currentEditingCard = null;

  updateHash('document');
  const mainEl = document.getElementById('main');
  if (mainEl) mainEl.scrollTop = 0;
  toast('저장되었습니다');
}

// 취소
async function cancelInlineEdit() {
  if (!dvEditing) return;
  if (isDvEditDirty()) {
    const ok = await customConfirm({
      title: '편집 취소',
      message: '변경사항을 버리시겠습니까?',
      confirmText: '버리기',
      cancelText: '계속 편집',
    });
    if (!ok) return;
  }
  dvEditing = false;
  dvEditOriginal = '';
  _currentEditingCard = null;   // v1.5
  queueRender('docview');
  // 취소 후 문서 상단으로 복원
  const mainEl = document.getElementById('main');
  if (mainEl) mainEl.scrollTop = 0;
}
