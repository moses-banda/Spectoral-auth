// ═══════════════════════════════════════════════════════════════════
// cosineSimilarity.js — Client-side similarity for instant previews
// The authoritative matching happens server-side via pgvector, but
// we use this for real-time UI feedback (e.g., Hunt Mode gauge).
// ═══════════════════════════════════════════════════════════════════

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA < 1e-6 || magB < 1e-6) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Compute per-channel delta for the comparison viz.
 * Returns an array of 10 signed floats: positive = live > reference.
 */
export function spectralDelta(live, reference) {
  if (!live || !reference) return new Array(10).fill(0);
  return live.map((v, i) => v - reference[i]);
}

export function parseSpectrum(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return JSON.parse(v);
  return [];
}
