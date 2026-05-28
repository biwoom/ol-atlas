// src/core/state.js
// ── 앱 상태 & S Proxy ──────────────────────────────────

import { devLog } from './dev.js';
import { getState, storeInit } from './store.js';
import { today } from './utils.js';

export function makeDefault() {
  const now = today();
  const originEditorId = 'origin_biwoom';
  return {
    meta: {
      fileId:        'ol-' + Math.random().toString(36).slice(2, 10),
      title:         'OL Weaving the Wisdom',
      created:       now,
      version:         '0.0.1',
      schemaVersion:   10,
      dirty:           false,
      lastSavedAt:     null,
      editors: [
        {
          id:           originEditorId,
          name:         '비움',
          email:        '',
          firstSavedAt: now,
          lastSavedAt:  now,
          saveCount:    0,
          isOrigin:     true,
        },
      ],
      saveLog: [
        { at: now, editorId: originEditorId, note: '원본 생성' },
      ],
      actLog:          [],
      currentEditorId: null,
      bookInfo: {
        bookTitle:   '',
        subtitle:    '',
        author:      '',
        translator:  '',
        publisher:   '',
        publishedAt: '',
        revisedAt:   '',
        bookVersion: '',
        description: '',
        coverColor:  '',
        language:    'ko',
        isbn:        '',
      },
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
      { id: 1, title: '😃 기획중',   color: 'rgb(99, 102, 241)' },
      { id: 2, title: '🤓 검토중', color: 'rgb(245, 158, 11)' },
      { id: 3, title: '😎 완료됨', color: 'rgb(34, 197, 94)' },
    ],
    cards: [
      {
        id: 1,
        colId: 1,
        title: 'OL ATLAS 소개 카드',
        body:
`# OL ATLAS — 한 파일에 담는 불교 콘텐츠 제작 도구

> ***Weaving the Wisdom · 지혜의 올을 엮다***

**OL ATLAS**는 단일 HTML 파일로 동작하는 불교 콘텐츠 에디터이자 뷰어입니다.
설치도, 서버도, 계정도 필요하지 않습니다. 만들고, 저장하고, 그대로 누군가에게 보냅니다 — 한 파일 그대로.

> 책 한 권을 받는 것이, 그 책을 만든 작업실을 받는 일과 같아지도록.

## 설계 원칙

- **단일 HTML 파일** — 에디터·뷰어·콘텐츠·이미지 자산이 한 파일에 들어 있습니다
- **에디터 ↔ 뷰어 토글** — 같은 파일을 편집 모드와 읽기 모드로 전환합니다
- **자유로운 수정과 전달** — OL 콘텐츠는 오픈소스입니다. 받은 파일을 자유롭게 고치고 더 풍성하게 확장하세요
- **로컬 우선** — 계정 없음, 추적 없음. 모든 데이터는 당신의 브라우저와 파일 안에만 머뭅니다

## 기본 기능

- **칸반 보드** — 컬럼 단위로 카드 흐름 관리
- **카드 / 테이블 뷰** — 같은 데이터를 다른 시점으로
- **문서 뷰 · 독서 뷰** — 마크다운 본문을 책처럼 읽기
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
- **내보내기**로 HTML / JSON / Markdown 형식 백업 가능
- 다른 사람과 공유할 때는 HTML 파일을 그대로 전달하면 됩니다

## 단축키

- \`Cmd/Ctrl + K\` — 검색 열기
- \`Cmd/Ctrl + S\` — (편집 중) 저장
- \`Cmd/Ctrl + B\` / \`I\` — 굵게 / 기울임
- \`[\` / \`]\` — (문서뷰) 이전 / 다음 카드
- \`Esc\` — 모달·검색·편집 닫기

## 이 도구로 무엇을 엮을까

ATLAS는 빈 그릇입니다. 붓다의 생애, 담마빠다 게송, 중관학 논서, 선사들의 노래 — 무엇이든 카드로 옮겨 엮으면, 그 자체로 한 권의 책이자 하나의 작업실이 됩니다.

> 이 카드는 삭제하셔도 됩니다.
> 첫 카드를 추가해, 당신의 올을 엮어보세요.

---
*OL · olbit.org · CC BY-SA 4.0*`,
        group: '시작하기',
        tags: ['안내', '시작'],
        priority: 'mid',
        created: today(),
      },
    ],
    userData: { status: {} },
    nextColId:  4,
    nextCardId: 2,
    trash: [],
  };
}

export const S = new Proxy({}, {
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

export function bootState(initial) {
  storeInit(initial);
  devLog('BOOT', 'state injected into store');
}
