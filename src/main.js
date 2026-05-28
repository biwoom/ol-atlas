// src/main.js
// ── OL Atlas 진입점 ─────────────────────────────────────

// ── CSS (dev 모드 watch 대상 포함용) ─────────────────────
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sidebar.css';
import './styles/kanban.css';
import './styles/cardgrid.css';
import './styles/listview.css';
import './styles/docview.css';
import './styles/reader.css';
import './styles/modal.css';
import './ui/confirm-modal.css';
import './components/shared/dirty-indicator.css';
import './ui/editor-modal.css';

// ── 컴포넌트 (subscribe 등록 포함) ──────────────────────
import './components/author/kanban.js';
import './components/author/cardgrid.js';
import './components/author/listview.js';
import './components/shared/sidebar.js';
import './components/shared/docview.js';
import './components/shared/reader.js';
import './components/author/home.js';
import './components/shared/about.js';
import './components/shared/dirty-indicator.js';

// ── 검색 ────────────────────────────────────────────────
import './data/search/search.js';

// ── 이벤트 와이어링 ─────────────────────────────────────
import './core/events.js';

// ── 부팅 ─────────────────────────────────────────────────
import { boot } from './data/init.js';
boot();
