// src/core/theme.js
// ── 테마 토글 (라이트/다크) ─────────────────────────

export function applyTheme(theme) {
  const root = document.documentElement;
  let actual = theme;
  if (theme === 'system') {
    actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (actual === 'dark') root.classList.add('dark');
  else                    root.classList.remove('dark');
  localStorage.setItem('ol_theme', theme);

  const b = document.body;
  b.style.backgroundColor = actual === 'dark' ? 'hsl(0 0% 3.9%)' : 'hsl(0 0% 100%)';
  b.style.color           = actual === 'dark' ? 'hsl(0 0% 98%)'  : 'hsl(0 0% 3.9%)';
  requestAnimationFrame(() => {
    b.style.backgroundColor = '';
    b.style.color = '';
  });

  const sbLabel = document.getElementById('sb-mp-theme-label');
  if (sbLabel) sbLabel.textContent = (actual === 'dark') ? '라이트 모드' : '다크 모드';
}

export function getStoredTheme() {
  return localStorage.getItem('ol_theme') || 'system';
}

applyTheme(getStoredTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStoredTheme() === 'system') applyTheme('system');
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});
