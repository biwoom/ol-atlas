// src/core/tag-parser.js
// ── prefix 태그 파싱 유틸 ──────────────────────────────

export function parseTag(tag) {
  if (typeof tag !== 'string') {
    return { prefix: null, value: String(tag), raw: tag };
  }
  const colonIdx = tag.indexOf(':');
  if (colonIdx > 0) {
    const prefix = tag.slice(0, colonIdx).trim();
    const value  = tag.slice(colonIdx + 1).trim();
    if (prefix && value) {
      return { prefix, value, raw: tag };
    }
  }
  return { prefix: null, value: tag.trim(), raw: tag };
}

export function buildPrefixIndex(cards) {
  const index = {};
  (cards || []).forEach(card => {
    (card.tags || []).forEach(tag => {
      const { prefix, value } = parseTag(tag);
      if (prefix && value) {
        if (!index[prefix]) index[prefix] = new Set();
        index[prefix].add(value);
      }
    });
  });
  const result = {};
  Object.keys(index).sort().forEach(k => {
    result[k] = [...index[k]].sort();
  });
  return result;
}

export function getFreeTags(cards) {
  const free = new Set();
  (cards || []).forEach(card => {
    (card.tags || []).forEach(tag => {
      const { prefix, value } = parseTag(tag);
      if (!prefix && value) free.add(value);
    });
  });
  return [...free].sort();
}

export function countCardsWithPrefixValue(cards, prefix, value) {
  let count = 0;
  (cards || []).forEach(card => {
    if ((card.tags || []).some(tag => {
      const p = parseTag(tag);
      return p.prefix === prefix && p.value === value;
    })) count++;
  });
  return count;
}

export function countCardsWithFreeTag(cards, tagValue) {
  let count = 0;
  (cards || []).forEach(card => {
    if ((card.tags || []).some(tag => {
      const p = parseTag(tag);
      return !p.prefix && p.value === tagValue;
    })) count++;
  });
  return count;
}
