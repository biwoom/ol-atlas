// src/actions/export-import.js
// ── 내보내기 / 가져오기 ───────────────────────────────

import { applyState }                  from '../core/store.js';
import { S }                           from '../core/state.js';
import { dispatch }                    from '../core/action.js';
import { normalizeState }              from '../core/normalize.js';
import { migrate }                     from '../core/schema.js';
import { bodyImagesToTokens, bodyTokensToStandardMd, slugFilename } from '../core/constants.js';
import { today, dlBlob, toast }        from '../core/utils.js';
import { currentView, switchView }     from '../core/router.js';
import { queueRender }                 from '../core/render-queue.js';
import { save }                        from '../core/storage.js';
import { importMerge, VALID_PRIORITIES } from './card-actions.js';
import { __STATIC_HTML__ }              from '../core/static-html.js';

// ── 벌크 선택 핸들러 등록 (cross-layer 의존 방지) ────
let _getBulkHandlers = null;
export function registerBulkHandlers(fn) { _getBulkHandlers = fn; }

// ── 드롭다운 열기/닫기 헬퍼 ──────────────────────────
export function closeAllDropdowns() {
  document.querySelectorAll('.h-dropdown.open, .sb-mp-dropdown.open').forEach(d => {
    d.classList.remove('open');
    const trigger = d.querySelector('[aria-expanded]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

['save-dropdown', 'open-dropdown'].forEach(id => {
  const wrap    = document.getElementById(id);
  const trigger = document.getElementById(id + '-trigger');
  if (!wrap || !trigger) return;
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = wrap.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', () => closeAllDropdowns());
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllDropdowns();
    if (_getBulkHandlers) {
      const { cgSelected, lvSelected, clearBulkSelection, closeBulkPopovers } = _getBulkHandlers();
      if (currentView === 'cards' && cgSelected.size > 0) {
        clearBulkSelection('cg'); closeBulkPopovers(); queueRender('cards');
      } else if (currentView === 'list' && lvSelected.size > 0) {
        clearBulkSelection('lv'); closeBulkPopovers(); queueRender('list');
      }
    }
  }
});

// ── 파일명 헬퍼 ──────────────────────────────────────
function safeFname() {
  return (S.meta.title || 'OL').replace(/[\\/:*?"<>|]/g, '').trim() || 'OL';
}

// ── 카드 한 장 → 마크다운 텍스트 (프런트매터 + 본문) ──
export function cardToMarkdownText(card) {
  const colMap = {};
  (S.columns || []).forEach(col => { colMap[col.id] = col.title; });
  const colName     = colMap[card.colId] || '';
  const learnStatus = S.userData.status[card.id] || 'wait';
  const priority    = VALID_PRIORITIES.includes(card.priority) ? card.priority : 'mid';
  const fm = [
    '---',
    'title: '       + JSON.stringify(card.title || ''),
    'column: '      + JSON.stringify(colName),
    'group: '       + JSON.stringify(card.group || ''),
    'priority: '    + priority,
    'learnStatus: ' + learnStatus,
    'tags: ['       + (card.tags || []).map(t => JSON.stringify(t)).join(', ') + ']',
    'slug: '        + JSON.stringify(card.slug || ''),
    'created: '     + (card.created || ''),
    '---',
  ].join('\n');
  const body = bodyTokensToStandardMd(card);
  return fm + '\n\n' + body;
}

// ══════════════════════════════════════════════════════
//  순수 JS ZIP 생성기 (외부 라이브러리 불필요)
//  ZIP 포맷 스펙: APPNOTE.TXT 6.3.10
// ══════════════════════════════════════════════════════
const _crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  _crcTable[i] = c;
}
function _crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = _crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const _enc = new TextEncoder();
function _writeU16(view, offset, v) { view.setUint16(offset, v, true); }
function _writeU32(view, offset, v) { view.setUint32(offset, v, true); }

function makeZip(files) {
  const localHeaders = [];
  let offset = 0;
  const parts = [];

  files.forEach(({ name, data }) => {
    const nameBytes  = _enc.encode(name);
    const dataBytes  = (typeof data === 'string') ? _enc.encode(data) : data;
    const crc        = _crc32(dataBytes);
    const compSize   = dataBytes.length;
    const uncompSize = dataBytes.length;

    const lhSize = 30 + nameBytes.length;
    const lh = new Uint8Array(lhSize);
    const lv = new DataView(lh.buffer);
    _writeU32(lv, 0,  0x04034B50);
    _writeU16(lv, 4,  20);
    _writeU16(lv, 6,  0x0800);
    _writeU16(lv, 8,  0);
    _writeU16(lv, 10, 0);
    _writeU16(lv, 12, 0);
    _writeU32(lv, 14, crc);
    _writeU32(lv, 18, compSize);
    _writeU32(lv, 22, uncompSize);
    _writeU16(lv, 26, nameBytes.length);
    _writeU16(lv, 28, 0);
    lh.set(nameBytes, 30);

    localHeaders.push({ nameBytes, crc, compSize, uncompSize, offset });
    offset += lhSize + compSize;
    parts.push(lh, dataBytes);
  });

  const cdStart = offset;
  const cdParts = [];
  localHeaders.forEach(({ nameBytes, crc, compSize, uncompSize, offset: localOffset }) => {
    const cdSize = 46 + nameBytes.length;
    const cd = new Uint8Array(cdSize);
    const cv = new DataView(cd.buffer);
    _writeU32(cv, 0,  0x02014B50);
    _writeU16(cv, 4,  20);
    _writeU16(cv, 6,  20);
    _writeU16(cv, 8,  0x0800);
    _writeU16(cv, 10, 0);
    _writeU16(cv, 12, 0);
    _writeU16(cv, 14, 0);
    _writeU32(cv, 16, crc);
    _writeU32(cv, 20, compSize);
    _writeU32(cv, 24, uncompSize);
    _writeU16(cv, 28, nameBytes.length);
    _writeU16(cv, 30, 0);
    _writeU16(cv, 32, 0);
    _writeU16(cv, 34, 0);
    _writeU16(cv, 36, 0);
    _writeU32(cv, 38, 0);
    _writeU32(cv, 42, localOffset);
    cd.set(nameBytes, 46);
    cdParts.push(cd);
  });

  const cdSize = cdParts.reduce((s, c) => s + c.length, 0);

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  _writeU32(ev, 0,  0x06054B50);
  _writeU16(ev, 4,  0);
  _writeU16(ev, 6,  0);
  _writeU16(ev, 8,  files.length);
  _writeU16(ev, 10, files.length);
  _writeU32(ev, 12, cdSize);
  _writeU32(ev, 16, cdStart);
  _writeU16(ev, 20, 0);

  const all = [...parts, ...cdParts, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  all.forEach(a => { result.set(a, pos); pos += a.length; });
  return result;
}

export function exportCardsAsIndividualMd(cards) {
  if (!cards || !cards.length) { toast('내보낼 카드가 없습니다'); return; }
  const used = new Map();
  const files = cards.map(card => {
    const base = slugFilename(card.title, 'card-' + card.id);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const name = (n > 1 ? base + '-' + n : base) + '.md';
    return { name, data: cardToMarkdownText(card) };
  });

  try {
    const zipBytes = makeZip(files);
    const zipBlob  = new Blob([zipBytes], { type: 'application/zip' });
    const zipName  = (S.meta.title ? slugFilename(S.meta.title, 'ol') : 'ol-export') +
                     '_' + new Date().toISOString().slice(0,10) + '.zip';
    dlBlob(zipBlob, zipName);
    toast(files.length + '개 파일을 zip으로 내보냈습니다', 'success');
  } catch (e) {
    console.error('ZIP 생성 오류:', e);
    toast('ZIP 생성 중 오류가 발생했습니다', 'error');
  }
}

// ── 1. OL 파일로 저장 (.html) ────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  closeAllDropdowns();
  save();
  const json = JSON.stringify(S, null, 2);
  try {
    const html = buildExportHTML(json);
    dlBlob(new Blob([html], { type: 'text/html; charset=utf-8' }),
           safeFname() + '_v' + S.meta.version + '.html');
    queueRender('sidebar');
    toast('v' + S.meta.version + ' 파일로 저장되었습니다');
  } catch(err) {
    toast('저장 실패: ' + err.message);
    console.error('export error:', err);
  }
});

function buildExportHTML(json) {
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // eslint-disable-next-line no-undef
  let src = __STATIC_HTML__;
  src = src.replace(/(<html[^>]*)\s+class="dark"/, '$1');
  src = src.replace(/(<html[^>]*class="[^"]*)(\bdark\b\s*)([^"]*)"/, (_, pre, _d, post) => `${pre}${post.trim()}"`);
  const VAR = '__LOADED' + '_DATA_B64__';
  const KEY = 'const ' + VAR + " = '";
  const RE  = new RegExp('const ' + VAR + " = '[^']*';");
  src = src.replace(RE, KEY + b64 + "';");
  return src;
}

// ── 2. 카드 JSON 내보내기 (ol-cards-v1) ──────────────
document.getElementById('export-json-btn').addEventListener('click', () => {
  closeAllDropdowns();
  const colMap = {};
  (S.columns || []).forEach(col => { colMap[col.id] = col.title; });

  const cards = (S.cards || []).map(card => ({
    id:          card.id,
    title:       card.title       || '',
    body:        card.body        || '',
    column:      colMap[card.colId] || '',
    group:       card.group       || '',
    tags:        Array.isArray(card.tags) ? card.tags : [],
    priority:    VALID_PRIORITIES.includes(card.priority) ? card.priority : 'mid',
    learnStatus: S.userData.status[card.id] || 'wait',
    created:     card.created     || '',
  }));

  const payload = {
    format:     'ol-cards-v1',
    exportedAt: new Date().toISOString(),
    source:     S.meta.title || 'OL',
    cards,
  };
  dlBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json; charset=utf-8' }),
         safeFname() + '_cards.json');
  toast('카드 JSON을 내보냈습니다 (' + cards.length + '개)');
});

// ── 3. 마크다운으로 내보내기 ─────────────────────────
document.getElementById('export-md-btn').addEventListener('click', () => {
  closeAllDropdowns();
  const colMap = {};
  (S.columns || []).forEach(col => { colMap[col.id] = col.title; });

  const parts = (S.cards || []).map(card => {
    const colName     = colMap[card.colId] || '';
    const learnStatus = S.userData.status[card.id] || 'wait';
    const priority    = VALID_PRIORITIES.includes(card.priority) ? card.priority : 'mid';
    const fm = [
      '---',
      'title: '       + JSON.stringify(card.title || ''),
      'column: '      + JSON.stringify(colName),
      'group: '       + JSON.stringify(card.group || ''),
      'priority: '    + priority,
      'learnStatus: ' + learnStatus,
      'tags: ['       + (card.tags || []).map(t => JSON.stringify(t)).join(', ') + ']',
      'created: '     + (card.created || ''),
      '---',
    ].join('\n');
    return fm + '\n' + (card.body || '');
  });

  dlBlob(new Blob([parts.join('\n\n---\n\n')], { type: 'text/markdown; charset=utf-8' }),
         safeFname() + '_cards.md');
  toast('마크다운을 내보냈습니다 (' + (S.cards||[]).length + '개)');
});

// ── 각 카드를 개별 .md로 내보내기 ─────────────────────
document.getElementById('export-md-each-btn').addEventListener('click', () => {
  closeAllDropdowns();
  exportCardsAsIndividualMd(S.cards || []);
});

// ── 4. OL 파일 열기 (.html) ──────────────────────────
document.getElementById('import-btn').addEventListener('click', () => {
  closeAllDropdowns();
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const VAR   = '__LOADED' + '_DATA_B64__';
      const RE    = new RegExp("const " + VAR + " = '([^']+)';");
      const match = ev.target.result.match(RE);
      if (!match || match[1] === '__INIT_DATA_B64__') throw new Error('저장된 데이터를 찾을 수 없습니다');
      const json = decodeURIComponent(escape(atob(match[1])));
      const data = JSON.parse(json);
      if (!Array.isArray(data.columns) || !Array.isArray(data.cards)) {
        throw new Error('유효하지 않은 파일');
      }
      applyState(migrate(normalizeState(data)));
      save();
      switchView('kanban'); queueRender('__all__'); toast('OL 파일을 불러왔습니다');
    } catch(err) { toast('파일을 읽을 수 없습니다: ' + err.message); }
  };
  reader.readAsText(file); e.target.value = '';
});

// ── 병합 모달 상태 ──────────────────────────────────
let _mergeQueue  = null;
let _mergeSource = null;

function openMergeModal(incoming, source) {
  _mergeQueue  = incoming;
  _mergeSource = source;

  const { dupById, dupByTitle } = detectDuplicates(incoming);
  const dupCount = dupById.size + dupByTitle.size;

  document.getElementById('merge-modal-desc').textContent =
    incoming.length + '개 카드를 가져옵니다. ' +
    (dupCount > 0 ? '중복이 감지된 항목이 있습니다.' : '중복 항목이 없습니다.');

  const summary = document.getElementById('merge-dup-summary');
  const text    = document.getElementById('merge-dup-text');
  if (dupCount > 0) {
    const parts = [];
    if (dupById.size)    parts.push('ID 일치 ' + dupById.size + '개');
    if (dupByTitle.size) parts.push('제목+컬럼 일치 ' + dupByTitle.size + '개');
    text.textContent = '중복 감지: ' + parts.join(', ');
    summary.style.display = 'block';
  } else {
    summary.style.display = 'none';
  }

  const group = document.getElementById('merge-strategy-group');
  const label = document.querySelector('#merge-modal .field > label');
  if (dupCount === 0) {
    group.style.display = 'none';
    if (label) label.style.display = 'none';
    document.querySelector('input[name="merge-strategy"][value="skip"]').checked = true;
  } else {
    group.style.display = 'flex';
    if (label) label.style.display = 'block';
  }

  document.getElementById('merge-modal').classList.add('open');
}

function closeMergeModal() {
  document.getElementById('merge-modal').classList.remove('open');
  _mergeQueue  = null;
  _mergeSource = null;
}

// ── 마크다운 프런트매터 파서 ──────────────────────────
function parseFrontmatterLine(line) {
  const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
  if (!m) return null;
  const key = m[1];
  let raw = m[2].trim();
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return { key, val: [] };
    const parts = [];
    let buf = '', inStr = false, esc = false;
    for (const ch of inner) {
      if (esc) { buf += ch; esc = false; continue; }
      if (ch === '\\') { esc = true; buf += ch; continue; }
      if (ch === '"') { inStr = !inStr; buf += ch; continue; }
      if (ch === ',' && !inStr) { parts.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return { key, val: parts.map(p => { try { return JSON.parse(p); } catch { return p.replace(/^["']|["']$/g, ''); } }) };
  }
  try { return { key, val: JSON.parse(raw) }; }
  catch { return { key, val: raw.replace(/^["']|["']$/g, '') }; }
}

function parseMarkdownFile(text, fallbackTitle) {
  let title = fallbackTitle || '', column = '', group = '';
  let priority = 'mid', learnStatus = 'wait', tags = [], created = today();
  let slug = '';
  let body = text;

  const fmRe = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const m = text.match(fmRe);
  if (m) {
    m[1].split(/\r?\n/).forEach(line => {
      const kv = parseFrontmatterLine(line);
      if (!kv) return;
      switch (kv.key) {
        case 'title':       title = String(kv.val); break;
        case 'column':      column = String(kv.val); break;
        case 'group':       group = String(kv.val); break;
        case 'priority':    if (VALID_PRIORITIES.includes(kv.val)) priority = kv.val; break;
        case 'learnStatus': if (['wait','doing','done'].includes(kv.val)) learnStatus = kv.val; break;
        case 'tags':        if (Array.isArray(kv.val)) tags = kv.val.map(String); break;
        case 'slug':        if (typeof kv.val === 'string') slug = kv.val; break;
        case 'created':     created = String(kv.val); break;
      }
    });
    body = text.slice(m[0].length).replace(/^\s*\n+/, '');
  } else {
    const h = text.match(/^\s*#\s+(.+?)\s*$/m);
    if (h && !title) title = h[1].trim();
    body = text;
  }

  const card = {
    title: title || fallbackTitle || '제목 없음',
    column, group, priority, learnStatus, tags, created, body,
    slug: slug || '',
    images: {},
  };
  bodyImagesToTokens(card);
  return card;
}

// ── 중복 감지 헬퍼 ────────────────────────────────────
function detectDuplicates(incoming) {
  const existingIds = new Set((S.cards || []).map(c => c.id));
  const colMap = {};
  (S.columns || []).forEach(col => { colMap[col.title] = col.id; });
  const existingTitleCol = new Set(
    (S.cards || []).map(c => c.title + '\x00' + (c.colId || ''))
  );

  const dupById    = new Set();
  const dupByTitle = new Set();

  incoming.forEach((card, i) => {
    if (card.id && existingIds.has(card.id)) dupById.add(i);
    else {
      const colName = card.column || card.status || '';
      const colId   = colMap[colName] || '';
      const key     = (card.title || '') + '\x00' + colId;
      if (existingTitleCol.has(key)) dupByTitle.add(i);
    }
  });

  return { dupById, dupByTitle };
}

// ── 실제 병합 실행 ────────────────────────────────────
function executeMerge(incoming, strategy) {
  const colMap = {};
  (S.columns || []).forEach(col => { colMap[col.title] = col.id; });
  const nameToId = { ...colMap };
  const existingIds = new Set((S.cards || []).map(c => c.id));
  const existingTitleCol = new Set((S.cards || []).map(c => c.title + '\x00' + (c.colId || '')));

  let added = 0, overwritten = 0, skipped = 0;
  incoming.forEach(card => {
    const colName = card.column || card.status || '';
    let colId = nameToId[colName];
    if (!colId && colName) { colId = '__new__'; nameToId[colName] = colId; }
    if (!colId) colId = (S.columns[0] || {}).id || null;
    const idDup    = card.id && existingIds.has(card.id);
    const titleKey = (card.title || '') + '\x00' + (colId === '__new__' ? colName : (colId || ''));
    const titleDup = !idDup && existingTitleCol.has(titleKey);
    const isDup    = idDup || titleDup;
    if (!isDup)                        { added++; existingIds.add(card.id || 'x'); existingTitleCol.add(titleKey); }
    else if (strategy === 'skip')      { skipped++; }
    else if (strategy === 'overwrite') { overwritten++; }
    else if (strategy === 'keepboth')  { added++; }
  });

  dispatch(importMerge(incoming, strategy));

  const parts = [];
  if (added)       parts.push(added + '개 추가');
  if (overwritten) parts.push(overwritten + '개 덮어씀');
  if (skipped)     parts.push(skipped + '개 건너뜀');
  toast('가져오기 완료: ' + parts.join(', '));
}

// ── 모달 버튼 이벤트 ─────────────────────────────────
document.getElementById('merge-modal-close').addEventListener('click', closeMergeModal);
document.getElementById('merge-cancel-btn').addEventListener('click', closeMergeModal);
document.getElementById('merge-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('merge-modal')) closeMergeModal();
});
document.getElementById('merge-confirm-btn').addEventListener('click', () => {
  const strategy = document.querySelector('input[name="merge-strategy"]:checked')?.value || 'skip';
  const incoming = _mergeQueue;
  closeMergeModal();
  if (incoming) executeMerge(incoming, strategy);
});

// ── 5. 카드 JSON 가져오기 (병합) ─────────────────────
document.getElementById('import-json-btn').addEventListener('click', () => {
  closeAllDropdowns();
  document.getElementById('import-json-file').click();
});
document.getElementById('import-json-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed   = JSON.parse(ev.target.result);
      const incoming = Array.isArray(parsed) ? parsed
        : (parsed.format === 'ol-cards-v1' && Array.isArray(parsed.cards)) ? parsed.cards
        : null;
      if (!incoming) throw new Error('인식할 수 없는 JSON 형식입니다');
      openMergeModal(incoming, 'json');
    } catch(err) { toast('JSON을 읽을 수 없습니다: ' + err.message); }
  };
  reader.readAsText(file); e.target.value = '';
});

// ── 마크다운 파일 가져오기 (.md, 다중) ──────────
document.getElementById('import-md-btn').addEventListener('click', () => {
  closeAllDropdowns();
  document.getElementById('import-md-file').click();
});

document.getElementById('import-md-file').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;

  const cards = [];
  let errCnt = 0;
  for (const file of files) {
    try {
      const text = await file.text();
      const fallbackTitle = file.name.replace(/\.(md|markdown)$/i, '');
      cards.push(parseMarkdownFile(text, fallbackTitle));
    } catch { errCnt++; }
  }

  if (!cards.length) { toast('읽을 수 있는 마크다운 파일이 없습니다', 'error'); return; }
  if (errCnt > 0) toast(errCnt + '개 파일을 읽지 못했습니다', 'warning');
  openMergeModal(cards, 'markdown');
});
