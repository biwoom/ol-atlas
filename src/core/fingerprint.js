// src/core/fingerprint.js
// ── 디바이스 핑거프린트 생성 (개인 식별 불가 수준) ──────

function generateFingerprint() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return 'fp_' + Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);
}

export { generateFingerprint };
