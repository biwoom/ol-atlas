// build/fixtures/dev-state.js
// npm run dev 시 자동 주입되는 테스트 state

export const DEV_STATE = {
  meta: {
    fileId: 'dev-fixture-001',
    title: 'OL ATLAS Dev',
    created: '2026-05-25T00:00:00.000Z',
    version: '0.0.4',
    schemaVersion: 9,
    dirty: false,
    lastSavedAt: null,
    editors: [
      {
        id: 'origin_biwoom',
        name: '비움',
        email: '',
        firstSavedAt: '2026-05-25T00:00:00.000Z',
        lastSavedAt: '2026-05-25T00:00:00.000Z',
        saveCount: 0,
        isOrigin: true,
      },
      {
        id: 'fp_test0001',
        name: '편집자A',
        email: 'a@test.com',
        firstSavedAt: '2026-05-25T10:00:00.000Z',
        lastSavedAt: '2026-05-25T14:00:00.000Z',
        saveCount: 2,
      },
      {
        id: 'fp_test0002',
        name: '편집자B',
        email: 'b@test.com',
        firstSavedAt: '2026-05-25T12:00:00.000Z',
        lastSavedAt: '2026-05-25T12:00:00.000Z',
        saveCount: 1,
      },
    ],
    saveLog: [
      { at: '2026-05-25T00:00:00.000Z', editorId: 'origin_biwoom', note: '원본 생성' },
      { at: '2026-05-25T10:00:00.000Z', editorId: 'fp_test0001' },
      { at: '2026-05-25T14:00:00.000Z', editorId: 'fp_test0001' },
      { at: '2026-05-25T12:00:00.000Z', editorId: 'fp_test0002' },
    ],
    actLog: [],
    currentEditorId: null,
  },
  settings: {
    theme: 'system',
    locale: 'ko',
    sidebarOpen: false,
    boardWidth: '',
  },
  columns: [
    { id: 1, title: '기획', color: '#6366f1', order: 0 },
    { id: 2, title: '작성중', color: '#f59e0b', order: 1 },
    { id: 3, title: '완료', color: '#22c55e', order: 2 },
  ],
  cards: [
    {
      id: 1, colId: 1,
      title: '붓다 출가 에피소드',
      body: '# 붓다 출가\n\n왕궁을 떠나는 장면에 대한 경전 기록 비교.',
      bodyMode: 'markdown',
      tags: ['#인물:붓다', '#주제:출가', '#경전:DN1'],
      priority: 'mid',
      acts: [
        { type: 'create', at: '2026-05-25T10:00:00.000Z', editorId: 'fp_test0001' },
        { type: 'update', at: '2026-05-25T14:00:00.000Z', editorId: 'fp_test0001' },
      ],
    },
    {
      id: 2, colId: 1,
      title: '사성제 개요',
      body: '고·집·멸·도의 기본 구조 정리.',
      bodyMode: 'plain',
      tags: ['#주제:사성제'],
      priority: 'high',
      acts: [
        { type: 'create', at: '2026-05-25T12:00:00.000Z', editorId: 'fp_test0002' },
      ],
    },
    {
      id: 3, colId: 2,
      title: '12연기 도표',
      body: '무명 → 행 → 식 → 명색 → 육처 → 촉 → 수 → 애 → 취 → 유 → 생 → 노사',
      bodyMode: 'plain',
      tags: ['#주제:연기'],
      priority: 'low',
      acts: [
        { type: 'create', at: '2026-05-25T10:00:00.000Z', editorId: 'fp_test0001' },
      ],
    },
  ],
  trash: [],
  userData: { status: {} },
  nextCardId: 4,
  nextColId: 4,
};
