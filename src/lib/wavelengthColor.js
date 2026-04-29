// ═══════════════════════════════════════════════════════════════════
// wavelengthColor.js — Map AS7341 channels to actual wavelength colors
// Used for rendering spectrum bars in their true colors.
// ═══════════════════════════════════════════════════════════════════

export const CHANNEL_COLORS = [
  '#8338ec',  // F1 415nm violet
  '#3a86ff',  // F2 445nm indigo
  '#4cc9f0',  // F3 480nm blue
  '#06d6a0',  // F4 515nm cyan
  '#80ed99',  // F5 555nm green
  '#ffd166',  // F6 590nm yellow
  '#ff9f1c',  // F7 630nm orange
  '#ef476f',  // F8 680nm red
  '#f4f4f4',  // Clear (broadband, shown as near-white)
  '#6a040f',  // NIR (conceptual deep red)
];

export function channelColor(i) {
  return CHANNEL_COLORS[i] ?? '#888';
}
