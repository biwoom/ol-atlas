// src/components/home.js
// ── ⑥ Home (Landing Page) ────────────────────────────

// ══════════════════════════════════════════════════════
//  HOME (Landing Page)
// ══════════════════════════════════════════════════════
function renderHome() {
  const wrap = document.getElementById('home-inner');
  wrap.innerHTML = '';

  // ─── HERO ──────────────────────────────────────
  const hero = ce('section','home-hero');
  hero.innerHTML = `
    <div class="home-hero-eyebrow">${escapeHTML(ORIGIN.tool)}</div>
    <h1 class="home-hero-title">단일 HTML 파일로 작동하는<br>지식 정리 도구</h1>
    <p class="home-hero-sub">"지혜의 올을 엮다(Weaving the Wisdom)!!"</p>
    <p class="home-hero-sub">
      다운로드만 하면 어디서든 사용할 수 있습니다. 카드로 정리하고, 마크다운으로 작성하고, 파일 하나로 공유합니다.
    </p>

    <div class="home-hero-actions">
      <button class="btn pri" id="home-hero-start">칸반 보드로 시작</button>
      <button class="btn" id="home-hero-doc">문서뷰로 보기</button>
    </div>
  `;
  wrap.appendChild(hero);

  // ─── ol-core 기능 ────────────────────────────────
  const features = [
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="18" x="3" y="3" rx="1"/><rect width="7" height="18" x="14" y="3" rx="1"/></svg>',
      title: '칸반 보드', desc: '컬럼 단위로 카드의 흐름을 관리합니다. 드래그앤드롭 지원.'
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
      title: '카드 뷰', desc: '같은 데이터를 그리드로 한눈에 보고, 태그·그룹·상태로 필터링합니다.'
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
      title: '리스트 뷰', desc: '정렬·일괄 작업·인쇄에 최적화된 테이블 형식.'
    },
    {
      icon: ICONS_X.fileText,
      title: '문서뷰', desc: '마크다운 본문을 책처럼 읽고, 목차를 따라 자유롭게 이동합니다.'
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
      title: '내보내기 / 가져오기', desc: 'OL 파일(.html), 카드 JSON, 개별 마크다운으로 자유롭게 입출력합니다.'
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>',
      title: '오프라인 우선', desc: '인터넷 없이도 동작합니다. 데이터는 브라우저 로컬과 파일 안에만 머뭅니다.'
    },
  ];

  const featLabel = ce('div','home-section-label','OL ATLAS · 기본 기능');
  wrap.appendChild(featLabel);
  const featGrid = ce('div','home-feat-grid');
  features.forEach(f => {
    const c = ce('div','home-feat-card');
    c.innerHTML = `
      <span class="home-feat-icon">${f.icon}</span>
      <div class="home-feat-title">${escapeHTML(f.title)}</div>
      <div class="home-feat-desc">${escapeHTML(f.desc)}</div>`;
    featGrid.appendChild(c);
  });
  wrap.appendChild(featGrid);

  // ─── 올확장 프로젝트 ──────────────────────────────
  if (OL_PROJECTS && OL_PROJECTS.length) {
    const extLabel = ce('div','home-section-label','올확장 · 콘텐츠 프로젝트');
    extLabel.style.marginTop = '2.5rem';
    wrap.appendChild(extLabel);
    const projGrid = ce('div','home-proj-grid');
    OL_PROJECTS.forEach(p => {
      const a = document.createElement('a');
      a.className = 'home-proj-card';
      a.href = p.url || '#';
      if (p.url && p.url !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
      a.innerHTML = `
        <div class="home-proj-head">
          <span class="home-proj-tag">${escapeHTML(p.tag || '')}</span>
          <div class="home-proj-title">${escapeHTML(p.name)}</div>
        </div>
        <div class="home-proj-desc">${escapeHTML(p.desc)}</div>
        <span class="home-proj-arrow">${ICONS_X.chevronRight}</span>`;
      projGrid.appendChild(a);
    });
    wrap.appendChild(projGrid);
  }

  // ─── 푸터 ─────────────────────────────────────────
  const foot = ce('div','home-foot');
  foot.innerHTML = `
    <div>${escapeHTML(ORIGIN.tool)} · ${escapeHTML(ORIGIN.copyright)}</div>
    <div>License: ${escapeHTML(ORIGIN.license)} · <a href="https://${ORIGIN.site}" target="_blank" rel="noopener">${escapeHTML(ORIGIN.site)}</a></div>`;
  wrap.appendChild(foot);

  // 핸들러
  document.getElementById('home-hero-start').onclick = () => switchView('kanban');
  document.getElementById('home-hero-doc').onclick   = () => switchView('document');
  document.getElementById('home-start-btn').onclick  = () => switchView('kanban');
}

// Phase 1: store에 등록
subscribe('home', renderHome);
