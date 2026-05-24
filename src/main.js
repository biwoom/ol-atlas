// src/main.js
// ── OL Atlas 진입점 ─────────────────────────────────────

// ── 컴포넌트 (subscribe 등록 포함) ──────────────────────
import './components/shared/sidebar.js';
import './components/shared/docview.js';
import './components/shared/about.js';
import './components/shared/dirty-indicator.js';
import './components/reader/cover-page.js';
import './components/author/author-bundle.js';

// ── 검색 ────────────────────────────────────────────────
import './data/search/search.js';

// ── 이벤트 와이어링 ─────────────────────────────────────
import './core/events.js';

// ── 부팅 ─────────────────────────────────────────────────
import { boot } from './data/init.js';
boot();
