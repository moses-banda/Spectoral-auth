// ═══════════════════════════════════════════════════════════════════
// BLE Protocol Parser
//
// The firmware broadcasts a 50-byte scan result:
//   [0]      mode (uint8)
//   [1]      result code: 0=fail, 1=uncertain, 2=pass, 3=no_profile
//   [2-5]    similarity score (float32 LE)
//   [6-45]   10 spectral channels (float32 LE × 10)
//   [46-49]  reserved (ambient lux, float32 LE)
// ═══════════════════════════════════════════════════════════════════

export const RESULT = {
  FAIL:       0,
  UNCERTAIN:  1,
  PASS:       2,
  NO_PROFILE: 3,
};

export const RESULT_LABEL = {
  0: 'FAIL',
  1: 'UNCERTAIN',
  2: 'PASS',
  3: 'NO PROFILE',
};

export const CHANNEL_LABELS = [
  'F1 (415nm)',
  'F2 (445nm)',
  'F3 (480nm)',
  'F4 (515nm)',
  'F5 (555nm)',
  'F6 (590nm)',
  'F7 (630nm)',
  'F8 (680nm)',
  'Clear',
  'NIR',
];

/**
 * Parse a 50-byte scan result payload from the ESP32.
 * @param {DataView} dv - DataView over the incoming bytes
 * @returns {ScanResult}
 */
export function parseScanResult(dv) {
  if (dv.byteLength < 50) {
    throw new Error(`Payload too short: ${dv.byteLength} bytes (expected 50)`);
  }

  const mode        = dv.getUint8(0);
  const resultCode  = dv.getUint8(1);
  const similarity  = dv.getFloat32(2, /* littleEndian */ true);

  const spectrum = new Array(10);
  for (let i = 0; i < 10; i++) {
    spectrum[i] = dv.getFloat32(6 + i * 4, true);
  }

  const lux = dv.getFloat32(46, true);

  return {
    mode,
    resultCode,
    result: RESULT_LABEL[resultCode] || 'UNKNOWN',
    similarity,
    spectrum,
    lux,
    timestamp: Date.now(),
  };
}

/**
 * Parse a 40-byte live spectrum payload (10 × float32).
 * @param {DataView} dv
 * @returns {number[]} 10 normalized channel values
 */
export function parseLiveSpectrum(dv) {
  const spectrum = new Array(10);
  for (let i = 0; i < 10; i++) {
    spectrum[i] = dv.getFloat32(i * 4, true);
  }
  return spectrum;
}

/**
 * Build a 41-byte profile sync payload to push to the ESP32.
 *   [0]     mode (uint8)
 *   [1-40]  10 spectral floats (float32 LE)
 */
export function encodeProfileSync(mode, spectrum) {
  if (spectrum.length !== 10) {
    throw new Error(`Spectrum must have 10 channels, got ${spectrum.length}`);
  }
  const buf = new ArrayBuffer(41);
  const dv  = new DataView(buf);
  dv.setUint8(0, mode);
  for (let i = 0; i < 10; i++) {
    dv.setFloat32(1 + i * 4, spectrum[i], true);
  }
  return buf;
}
