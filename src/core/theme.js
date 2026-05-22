// src/core/theme.js
// ── 테마 토글 (라이트/다크) ─────────────────────────

// ══════════════════════════════════════════════════════
//  THEME TOGGLE (라이트/다크 모드)
// ══════════════════════════════════════════════════════
function applyTheme(theme) {
  const root = document.documentElement;
  let actual = theme;
  if (theme === 'system') {
    actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (actual === 'dark') root.classList.add('dark');
  else                    root.classList.remove('dark');
  localStorage.setItem('ol_theme', theme);

  // iOS Safari CSS 변수 재계산 강제 트리거
  // classList 변경 후 hsl(var()) 재계산이 지연되는 버그 대응
  const b = document.body;
  b.style.backgroundColor = actual === 'dark' ? 'hsl(0 0% 3.9%)' : 'hsl(0 0% 100%)';
  b.style.color           = actual === 'dark' ? 'hsl(0 0% 98%)'  : 'hsl(0 0% 3.9%)';
  // 다음 프레임에서 인라인 스타일 제거 → CSS 변수 기반으로 자연스럽게 전환
  requestAnimationFrame(() => {
    b.style.backgroundColor = '';
    b.style.color = '';
  });

  // 사이드바 패널 테마 라벨 동기화
  const sbLabel = document.getElementById('sb-mp-theme-label');
  if (sbLabel) sbLabel.textContent = (actual === 'dark') ? '라이트 모드' : '다크 모드';
}

function getStoredTheme() {
  return localStorage.getItem('ol_theme') || 'system';
}

// 페이지 로드 시 즉시 적용 (FOUC 방지)
applyTheme(getStoredTheme());

// 시스템 설정 변경 시 자동 반영 (사용자가 'system' 모드일 때만)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStoredTheme() === 'system') applyTheme('system');
});

// 토글 버튼: light → dark → light (system 은 초기값으로만)
document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});
