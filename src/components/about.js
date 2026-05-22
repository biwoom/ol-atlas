// src/components/about.js
// ── ⑤ About 뷰 & v1.5 휴지통 뷰 ─────────────────────

// ══════════════════════════════════════════════════════
//  v1.5: 휴지통 뷰
// ══════════════════════════════════════════════════════
function renderTrash() {
  const listEl = document.getElementById('trash-list');
  if (!listEl) return;
  const query = (document.getElementById('trash-search')?.value || '').trim().toLowerCase();
  const trash  = (S.trash || []);
  const items  = query
    ? trash.filter(c => (c.title || '').toLowerCase().includes(query) || (c.body || '').toLowerCase().includes(query))
    : trash;

  listEl.innerHTML = '';
  if (!items.length) {
    listEl.innerHTML = '<div class="trash-empty">휴지통이 비어 있습니다</div>';
    // 선택 버튼 숨김
    document.getElementById('trash-restore-sel-btn').style.display = 'none';
    document.getElementById('trash-del-sel-btn').style.display    = 'none';
    document.getElementById('trash-check-all').checked = false;
    return;
  }

  items.forEach(card => {
    const row = document.createElement('div');
    row.className = 'trash-row';
    row.dataset.id = card.id;
    const date = card._trashedAt ? new Date(card._trashedAt).toLocaleDateString() : '';
    row.innerHTML = `
      <input type="checkbox" class="trash-cb" data-id="${card.id}">
      <div class="trash-row-info">
        <div class="trash-row-title">${escapeHTML(card.title || '(제목 없음)')}</div>
        <div class="trash-row-meta">${date ? '삭제: ' + date + ' · ' : ''}${card.body ? stripMarkdown(card.body).slice(0,60) + (card.body.length > 60 ? '…' : '') : '(내용 없음)'}</div>
      </div>
      <div class="trash-row-actions">
        <button class="btn sm" data-trash-restore="${card.id}">복원</button>
        <button class="btn sm danger" data-trash-del="${card.id}">영구삭제</button>
      </div>`;
    listEl.appendChild(row);
  });

  // 선택 버튼 가시성 처리
  _updateTrashSelButtons();
}

function _updateTrashSelButtons() {
  const checked = document.querySelectorAll('.trash-cb:checked').length;
  document.getElementById('trash-restore-sel-btn').style.display = checked ? '' : 'none';
  document.getElementById('trash-del-sel-btn').style.display    = checked ? '' : 'none';
}

function _trashRestoreCard(id) {
  id = Number(id);
  dispatch(restoreCard(id));
  toast('복원되었습니다');
}

function _trashDelCard(id) {
  id = Number(id);
  dispatch(purgeCard(id));
  toast('영구 삭제되었습니다');
}

function initTrashHandlers() {
  // 검색
  document.getElementById('trash-search').addEventListener('input', () => queueRender('trash'));

  // 전체 선택
  document.getElementById('trash-check-all').addEventListener('change', e => {
    document.querySelectorAll('.trash-cb').forEach(cb => { cb.checked = e.target.checked; });
    _updateTrashSelButtons();
  });

  // 리스트 이벤트 위임 (복원/삭제/체크박스)
  document.getElementById('trash-list').addEventListener('click', e => {
    const restoreId = e.target.closest('[data-trash-restore]')?.dataset.trashRestore;
    const delId     = e.target.closest('[data-trash-del]')?.dataset.trashDel;
    const cb        = e.target.closest('.trash-cb');
    if (restoreId) { _trashRestoreCard(restoreId); return; }
    if (delId) {
      if (!confirm('영구 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
      _trashDelCard(delId); return;
    }
    if (cb) { _updateTrashSelButtons(); }
  });

  // 선택 복원
  document.getElementById('trash-restore-sel-btn').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('.trash-cb:checked')].map(cb => Number(cb.dataset.id));
    ids.forEach(id => _trashRestoreCard(id));
  });

  // 선택 영구삭제
  document.getElementById('trash-del-sel-btn').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('.trash-cb:checked')].map(cb => Number(cb.dataset.id));
    if (!ids.length) return;
    if (!confirm(ids.length + '개 카드를 영구 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    ids.forEach(id => dispatch(purgeCard(Number(id))));
    toast('영구 삭제되었습니다');
  });

  // 전체 비우기
  document.getElementById('trash-empty-btn').addEventListener('click', () => {
    if (!(S.trash || []).length) { toast('이미 비어 있습니다'); return; }
    if (!confirm('휴지통을 완전히 비우시겠습니까? 되돌릴 수 없습니다.')) return;
    dispatch(purgeAllCards());
    toast('휴지통을 비웠습니다');
  });
}

function renderAbout() {
  const wrap = document.getElementById('about-inner');
  wrap.innerHTML = '';

  const LOCK_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const ARROW_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  // ── 원저자 카드 ──────────────────────────────────────
  wrap.insertAdjacentHTML('beforeend', `<div class="about-section-label">원저자 정보</div>`);
  const originCard = ce('div', 'about-origin-card');
  originCard.innerHTML = `
    <div class="about-origin-head">
      <div class="about-origin-title">${ORIGIN.tool}</div>
      <div class="about-origin-sub">${ORIGIN.copyright}</div>
    </div>
    <div class="about-origin-body">
      <div>
        <div class="about-field-key">제작자</div>
        <div class="about-field-val">${ORIGIN.author}</div>
      </div>
      <div>
        <div class="about-field-key">사이트</div>
        <div class="about-field-val">
          <a href="https://${ORIGIN.site}" target="_blank" rel="noopener">${ORIGIN.site}</a>
        </div>
      </div>
      <div>
        <div class="about-field-key">라이선스</div>
        <div class="about-field-val">${ORIGIN.license}</div>
      </div>
      <div>
        <div class="about-field-key">저작권</div>
        <div class="about-field-val">${ORIGIN.copyright}</div>
      </div>
    </div>
    <div class="about-lock-row">
      ${LOCK_ICO}
      원저자 정보는 수정할 수 없습니다 — 파일이 배포되어도 이 정보는 유지됩니다.
    </div>
  `;
  wrap.appendChild(originCard);

  // ── 파일 메타 카드 ────────────────────────────────────
  const esc = v => String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  wrap.insertAdjacentHTML('beforeend', `<div class="about-section-label" style="margin-top:1.5rem">파일 정보</div>`);
  const metaCard = ce('div', 'about-meta-card');
  metaCard.innerHTML = `
    <div class="about-meta-title">이 파일에 대하여</div>
    <div class="field">
      <label>파일 제목</label>
      <input type="text" id="about-ftitle" value="${esc(S.meta.title)}" placeholder="파일 제목">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>버전</label>
      <input type="text" id="about-fversion" value="${esc(S.meta.version)}" placeholder="1.0.0">
    </div>
    <div class="about-meta-actions">
      <button class="btn pri sm" id="about-meta-save">저장</button>
    </div>
  `;
  wrap.appendChild(metaCard);

  document.getElementById('about-meta-save').onclick = () => {
    const title   = document.getElementById('about-ftitle').value.trim();
    const version = document.getElementById('about-fversion').value.trim();
    const patch = {};
    if (title)   patch.title   = title;
    if (version) patch.version = version;
    if (Object.keys(patch).length) dispatch(updateMeta(patch));
    toast('파일 정보가 저장되었습니다');
  };

  // ── 링크 카드 ─────────────────────────────────────────
  wrap.insertAdjacentHTML('beforeend', `<div class="about-section-label" style="margin-top:1.5rem">링크</div>`);
  const linksCard = ce('div', 'about-links-card');

  const GLOBE_ICO  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
  const GITHUB_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>';
  const MAIL_ICO   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

  const links = [
    { icon: GLOBE_ICO,  label: '홈페이지',  url: `https://${ORIGIN.site}`,              display: ORIGIN.site },
    { icon: GITHUB_ICO, label: 'GitHub',    url: `https://github.com/ol-project`,            display: 'github.com/ol-project' },
    { icon: MAIL_ICO,   label: '연락처',    url: `mailto:bingeoul@gmail.com`,             display: 'bingeoul@gmail.com' },
  ];

  links.forEach(({ icon, label, url, display }) => {
    const a = document.createElement('a');
    a.className = 'about-link-item';
    a.href = url;
    if (!url.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
    a.innerHTML = `
      <span class="about-link-icon">${icon}</span>
      <span class="about-link-label">${label}</span>
      <span class="about-link-url">${display}</span>
      <span class="about-link-arrow">${ARROW_ICO}</span>
    `;
    linksCard.appendChild(a);
  });
  wrap.appendChild(linksCard);
}

// ══════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════
// SVG 아이콘 헬퍼 (lucide-react 스타일)
const SB_ICONS = {
  hash:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
  folder:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  layers:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
};

// ── About·휴지통 섹션 (일반·문서뷰 사이드바 공통) ──────
function buildAboutTrashSection(el) {
  const aboutItem = ce('div', 'sb-item' + (currentView==='about' ? ' active' : ''));
  aboutItem.innerHTML = `<span class="sb-item-icon">${SB_ICONS.info}</span><span>About</span>`;
  aboutItem.onclick = () => switchView('about');
  const sec = ce('div','sb-section');
  sec.appendChild(aboutItem);
  const trashCount = (S.trash || []).length;
  const trashItem = ce('div', 'sb-item sb-item-trash' + (currentView==='trash' ? ' active' : ''));
  trashItem.innerHTML = `<span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></span><span>휴지통</span>${trashCount ? `<span class="sb-item-count trash-cnt">${trashCount}</span>` : ''}`;
  trashItem.onclick = () => switchView('trash');
  sec.appendChild(trashItem);
  el.appendChild(sec);
}

// Phase 1: store에 등록
subscribe('about', renderAbout);
subscribe('trash', renderTrash);
