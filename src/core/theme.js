// src/core/theme.js
// ── 테마 토글 (라이트/다크/독서) ───────────────────────

const THEME_LABELS = {
  light: '라이트 모드',
  dark: '다크 모드',
  reading: '독서 모드',
};

const _themeChangeHooks = [];
export function registerThemeChangeHook(fn) { _themeChangeHooks.push(fn); }

function _resolveTheme(theme) {
  if (theme === 'dark' || theme === 'reading' || theme === 'light') return theme;
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function _nextTheme(actualTheme) {
  if (actualTheme === 'light') return 'dark';
  if (actualTheme === 'dark') return 'reading';
  return 'light';
}

function _syncThemeControls(actualTheme) {
  const nextTheme = _nextTheme(actualTheme);
  const nextLabel = THEME_LABELS[nextTheme];

  const sbLabel = document.getElementById('sb-mp-theme-label');
  if (sbLabel) sbLabel.textContent = nextLabel;

  const homeLabel = document.getElementById('home-theme-label');
  if (homeLabel) homeLabel.textContent = nextLabel;

  const desktopToggle = document.getElementById('theme-toggle');
  if (desktopToggle) {
    desktopToggle.title = nextLabel;
    desktopToggle.setAttribute('aria-label', nextLabel);
  }
}

export function getStoredTheme() {
  return localStorage.getItem('ol_theme') || 'system';
}

export function getResolvedTheme(theme = getStoredTheme()) {
  return _resolveTheme(theme);
}

export function getNextTheme(theme = getStoredTheme()) {
  return _nextTheme(_resolveTheme(theme));
}

export function getThemeLabel(theme = getStoredTheme()) {
  return THEME_LABELS[_resolveTheme(theme)];
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const actual = _resolveTheme(theme);

  root.classList.toggle('dark', actual === 'dark');
  root.classList.toggle('reading', actual === 'reading');
  localStorage.setItem('ol_theme', theme);

  const b = document.body;
  if (actual === 'dark') {
    b.style.backgroundColor = 'hsl(0 0% 3.9%)';
    b.style.color = 'hsl(0 0% 98%)';
  } else if (actual === 'reading') {
    b.style.backgroundColor = 'hsl(40 30% 96%)';
    b.style.color = 'hsl(30 25% 18%)';
  } else {
    b.style.backgroundColor = 'hsl(0 0% 100%)';
    b.style.color = 'hsl(0 0% 3.9%)';
  }
  requestAnimationFrame(() => {
    b.style.backgroundColor = '';
    b.style.color = '';
  });

  _syncThemeControls(actual);
  _themeChangeHooks.forEach(function(fn) { fn(actual); });
}

export function toggleTheme() {
  applyTheme(getNextTheme());
}

applyTheme(getStoredTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStoredTheme() === 'system') applyTheme('system');
});

const desktopToggle = document.getElementById('theme-toggle');
if (desktopToggle) {
  desktopToggle.addEventListener('click', toggleTheme);
}
