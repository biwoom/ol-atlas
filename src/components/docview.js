// src/components/docview.js
// ── ④ Document View (Phase 4) ────────────────────────

// ══════════════════════════════════════════════════════
//  TOC — 문서뷰 우측 목차 네비게이션
// ══════════════════════════════════════════════════════

// 마크다운 원본에서 H1~H3 헤더 목록 추출 (코드 블록 제외)
// parseMarkdown과 동일한 ID 생성 로직을 사용
function extractToc(md) {
  if (!md) return [];
  const items = [];
  const usedIds = new Set();
  let inFence = false;

  function makeId(rawText) {
    const plain = rawText.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '');
    const base = 'h-' + (plain.toLowerCase()
      .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
      .trim().replace(/\s+/g, '-') || 'heading');
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  }

  md.split('\n').forEach(line => {
    // 펜스 코드 블록 안은 건너뜀
    if (/^```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;

    const hm = line.match(/^(#{1,3})\s+(.+)/); // H1~H3만
    if (!hm) return;

    const lvl  = hm[1].length;
    const text = hm[2].trim();
    const id   = makeId(text);
    items.push({ lvl, text, id });
  });
  return items;
}

// TOC 렌더링 — 2개 이상일 때만 표시
function renderDocToc(tocItems, card) {
  const toc = document.getElementById('dv-toc');
  if (!toc) return;

  if (!tocItems || tocItems.length < 2) {
    toc.style.display = 'none';
    toc.innerHTML = '';
    return;
  }

  toc.style.display = '';
  toc.innerHTML = '';

  // 제목 라벨
  const label = document.createElement('div');
  label.className = 'dv-toc-label';
  label.textContent = '목차';
  toc.appendChild(label);

  // 항목 리스트
  const list = document.createElement('nav');
  list.className = 'dv-toc-list';

  tocItems.forEach(({ lvl, text, id }) => {
    const a = document.createElement('a');
    a.className = `dv-toc-item dv-toc-h${lvl}`;
    a.textContent = text;
    a.href = '#';
    a.dataset.headingId = id;
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 즉시 active 처리 (Observer 지연 보완)
        toc.querySelectorAll('.dv-toc-item').forEach(el => el.classList.remove('active'));
        a.classList.add('active');
      }
    });
    list.appendChild(a);
  });

  toc.appendChild(list);
}

// IntersectionObserver로 스크롤 시 현재 헤딩 추적
let _tocObserver = null;

function setupTocObserver() {
  // 기존 Observer 정리
  if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }

  const toc = document.getElementById('dv-toc');
  if (!toc || toc.style.display === 'none') return;

  // dv-body 안의 헤더들만 추적 (dv-title은 제외)
  const body = document.getElementById('dv-body');
  if (!body) return;
  const headings = Array.from(body.querySelectorAll('.md-h1[id],.md-h2[id],.md-h3[id]'));
  if (!headings.length) return;

  // 스크롤 루트: #main (overflow-y: auto인 영역)
  const scrollRoot = document.getElementById('main');

  // 현재 화면에서 가장 위에 있는 헤딩을 active로
  let lastActive = null;

  _tocObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = toc.querySelector(`[data-heading-id="${e.target.id}"]`);
      if (!link) return;
      if (e.isIntersecting) {
        // 새로 진입한 헤딩 활성화
        toc.querySelectorAll('.dv-toc-item').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        lastActive = link;
        // TOC 항목을 뷰포트 안으로 스크롤 (TOC 자체가 길 때)
        link.scrollIntoView({ block: 'nearest' });
      }
    });
  }, {
    root: scrollRoot,
    // 헤더 상단 80px(뷰바 높이)을 제외, 뷰포트 40% 아래까지 진입 시 트리거
    rootMargin: '-120px 0px -55% 0px',
    threshold: 0
  });

  headings.forEach(h => _tocObserver.observe(h));

  // 초기 활성 항목: 페이지 최상단이면 첫 번째 항목
  if (headings.length) {
    const firstLink = toc.querySelector(`[data-heading-id="${headings[0].id}"]`);
    if (firstLink) firstLink.classList.add('active');
  }
}

// 카드 본문을 마크다운으로 렌더링한 HTML 반환
function renderDocBody(card) {
  if (!card) return '';
  const src = (card.body || '').trim();
  if (!src) return '<div class="dv-body-empty">(본문이 비어 있습니다)</div>';
  return '<div class="md-body">' + parseMarkdown(src, { card }) + '</div>';
}

// 문서뷰 메인 렌더링
function renderDocumentView() {
  // Phase 5: 본문 영역을 다시 그릴 때마다 편집 상태/액션바도 초기화
  // (편집 중이라면 startInlineEdit이 직접 처리하므로 여기서는 강제 종료 X — 다만 외부 재렌더 시 안전망)
  // 단, dvEditing이 true인 채로 renderDocumentView가 호출되는 케이스는
  // (1) 카드 삭제 후 currentDocCardId가 재설정될 때 — 이때는 편집 데이터를 강제 폐기
  // 그 외에는 saveInlineEdit/cancelInlineEdit이 dvEditing=false로 해놓고 호출함
  if (dvEditing) {
    dvEditing = false;
    dvEditOriginal = '';
  }
  swapDvBarToReadMode();

  const wrap = document.getElementById('dv-wrap');
  const editBtn = document.getElementById('dv-edit-btn');
  const barTitle = document.getElementById('dv-bar-title');
  const barPos = document.getElementById('dv-bar-pos');
  if (!wrap) return;

  wrap.innerHTML = '';

  // 빈 상태 — 카드 추가 버튼 포함
  if (!S.cards.length) {
    barTitle.textContent = '문서뷰';
    barPos.textContent = '';
    if (editBtn) editBtn.style.display = 'none';
    const emptyEl = buildEmptyState('doc', '문서가 없습니다',
      '카드를 추가하면 이곳에서 문서처럼 읽고 편집할 수 있습니다.');
    // 카드 추가 버튼
    const addBtn = ce('button', 'btn pri sm');
    addBtn.textContent = '+ 첫 카드 추가';
    addBtn.style.marginTop = '1rem';
    addBtn.addEventListener('click', () => openCardModal(null, null));
    emptyEl.appendChild(addBtn);
    wrap.appendChild(emptyEl);
    currentDocCardId = null;
    return;
  }

  // 현재 카드 결정 — 없거나 삭제됐으면 첫 카드로
  let card = currentDocCardId != null ? S.cards.find(c => c.id === currentDocCardId) : null;
  if (!card) {
    const list = getOrderedCardList();
    card = list[0] || null;
    if (card) currentDocCardId = card.id;
  }
  if (!card) {
    barTitle.textContent = '문서뷰';
    barPos.textContent = '';
    if (editBtn) editBtn.style.display = 'none';
    wrap.appendChild(buildEmptyState('doc', '카드를 찾을 수 없습니다', '다른 카드를 선택해주세요.'));
    return;
  }

  if (editBtn) editBtn.style.display = '';

  const { prev, next, idx, total } = getPrevNextCard(card.id);
  const col = S.columns.find(c => c.id === card.colId);
  const learnStatus = S.userData.status[card.id] || 'wait';
  const priLabel    = { high:'높음', mid:'보통', low:'낮음' }[card.priority] || '보통';
  const stLabel     = { wait:'학습대기', doing:'학습중', done:'학습완료' }[learnStatus] || '학습대기';

  barTitle.textContent = '문서뷰';
  barPos.textContent = `${idx + 1} / ${total}`;

  // 메타
  const metaParts = [];
  if (col) {
    metaParts.push(
      `<span class="dv-meta-col"><span class="dv-meta-col-dot" style="background:${col.color || '#888'}"></span>${escapeHTML(col.title || '')}</span>`
    );
  }
  if (card.group) {
    metaParts.push(`<span class="dv-meta-group">${escapeHTML(card.group)}</span>`);
  }
  metaParts.push(`<span class="dv-meta-prio ${card.priority || 'mid'}">${priLabel}</span>`);
  metaParts.push(`<span class="dv-meta-status ${learnStatus}">${stLabel}</span>`);
  if (card.tags && card.tags.length) {
    const tagsHtml = card.tags.map(t => `<span class="dv-meta-tag">${escapeHTML(t)}</span>`).join('');
    metaParts.push(`<span class="dv-meta-tags">${tagsHtml}</span>`);
  }

  // 본문
  const bodyHtml = renderDocBody(card);

  // 이전/다음
  const prevHtml = `
    <button class="dv-nav-btn prev" id="dv-prev" title="이전 카드 ([)" ${prev ? '' : 'disabled'}>
      <span class="dv-nav-label">← 이전</span>
      <span class="dv-nav-title">${prev ? escapeHTML(prev.title || '(제목 없음)') : '—'}</span>
    </button>`;
  const nextHtml = `
    <button class="dv-nav-btn next" id="dv-next" title="다음 카드 (])" ${next ? '' : 'disabled'}>
      <span class="dv-nav-label">다음 →</span>
      <span class="dv-nav-title">${next ? escapeHTML(next.title || '(제목 없음)') : '—'}</span>
    </button>`;

  wrap.innerHTML = `
    <div class="dv-meta">${metaParts.join('')}</div>
    <h1 class="dv-title">${escapeHTML(card.title || '(제목 없음)')}</h1>
    <div class="dv-body" id="dv-body">${bodyHtml}</div>
    <div class="dv-foot">${prevHtml}${nextHtml}</div>
  `;

  // 네비게이션 핸들러
  if (prev) document.getElementById('dv-prev').addEventListener('click', () => goToDocCard(prev.id));
  if (next) document.getElementById('dv-next').addEventListener('click', () => goToDocCard(next.id));

  // TOC 생성 및 Observer 설정
  const tocItems = extractToc(card.body || '');
  renderDocToc(tocItems, card);
  // DOM이 완전히 렌더된 뒤 Observer 등록
  requestAnimationFrame(() => setupTocObserver());
}

// Phase 1: store에 등록
subscribe('docview', renderDocumentView);
