// src/core/state.js
// ── 앱 상태 & 영속성 ──────────────────────────────────

// ══════════════════════════════════════════════════════
//  DEFAULT STATE
// ══════════════════════════════════════════════════════
function makeDefault() {
  return {
    meta: {
      fileId:        'ol-' + Math.random().toString(36).slice(2,10),
      title:         'OL Weaving the Wisdom',
      created:       today(),
      version:       '1.0.0',
      schemaVersion: 7,
      dirty:         false,
      lastSavedAt:   null,
    },
    settings: {
      theme:        (function(){ try { return localStorage.getItem('ol_theme') || 'system'; } catch(_){ return 'system'; } })(),
      locale:       'ko',
      sidebarOpen:  false,
      boardWidth:   'NORMAL',
      metaToggles:  { title: true, body: true, tags: true },
      activeTabId:  'board',
    },
    columns: [
      { id:1, title:'📥 수집',   color:'#1e4a6e' },
      { id:2, title:'🔍 검토중', color:'#b87820' },
      { id:3, title:'✅ 정리됨', color:'#2e6644' },
    ],
    cards: [
      {
        id: 1,
        colId: 1,
        title: 'OL에 오신 것을 환영합니다',
        body:
`# OL — 지식정리도구

> ***Weaving the Wisdom(지혜의 올을 엮다)***

**OL**은 단일 HTML 파일로 작동하는 지식 정리 도구입니다.
다운로드만 하면 어디서든 바로 사용할 수 있습니다.

## 기본 기능

- **칸반 보드** — 컬럼 단위로 카드 흐름 관리
- **카드/리스트 뷰** — 같은 데이터의 다른 시점
- **문서 뷰** — 마크다운 본문을 책처럼 읽기
- **검색** — 제목·본문·태그·그룹 통합 검색

## 카드 작성

- 카드를 더블클릭하면 편집 모달이 열립니다
- 본문은 **마크다운**으로 작성합니다
- \`#\`, \`##\`, \`###\` 으로 제목 작성
- \`-\`, \`1.\` 으로 목록, \`>\` 로 인용
- \`**굵게**\`, \`*기울임*\`, \`\\\`코드\\\`\` 인라인 서식

## 데이터 보관

- 모든 데이터는 **브라우저 로컬**에 저장됩니다 (localStorage)
- 외부 서버로 전송되는 정보는 없습니다
- **내보내기**로 HTML/JSON/Markdown 형식 백업 가능
- 다른 사람과 공유할 때는 HTML 파일을 그대로 전달하면 됩니다

## 단축키

- \`Cmd/Ctrl + K\` — 검색 열기
- \`Cmd/Ctrl + S\` — (편집 중) 저장
- \`Cmd/Ctrl + B\` / \`I\` — 굵게 / 기울임
- \`[\` / \`]\` — (문서뷰) 이전 / 다음 카드
- \`Esc\` — 모달·검색·편집 닫기

> 이 카드는 삭제하셔도 됩니다.
> 첫 카드를 추가해 시작해보세요.`,
        group: '시작하기',
        tags: ['안내', '시작'],
        priority: 'mid',
        created: today()
      },
    ],
    userData: { status:{} },
    nextColId:  4,
    nextCardId: 2,
    trash: [],
  };
}

// ══════════════════════════════════════════════════════
//  S — store Proxy 어댑터
//  기존 코드의 `S.xxx` 직접 접근이 store.getState()를 가리키게 함.
//  Phase 2 완료: 직접 대입(S.xxx = ...) 시 에러를 던짐 (strict mode).
// ══════════════════════════════════════════════════════
const S = new Proxy({}, {
  get: function(target, prop) {
    const state = getState();
    return state ? state[prop] : undefined;
  },
  set: function(target, prop, value) {
    const msg = '[STRICT] Direct S.' + String(prop) + ' mutation forbidden — use dispatch()';
    console.error(msg);
    throw new Error(msg);
  },
});

// store에 state inject (부팅 시 1회 호출)
function bootState(initial) {
  storeInit(initial);
  devLog('BOOT', 'state injected into store');
}
