// ═══════════════════════════════════════════════════════════════════
// BLE UUIDs — MUST match ble_service.h in the firmware exactly
// ═══════════════════════════════════════════════════════════════════

export const BLE = {
  DEVICE_NAME: 'SpecAuth',
  SVC_UUID:           '7a0c0001-4a4f-4c48-9b2e-0c1a1a1a1a1a',
  CHAR_SCAN_RESULT:   '7a0c0002-4a4f-4c48-9b2e-0c1a1a1a1a1a',
  CHAR_LIVE_SPECTRUM: '7a0c0003-4a4f-4c48-9b2e-0c1a1a1a1a1a',
  CHAR_PROFILE_SYNC:  '7a0c0004-4a4f-4c48-9b2e-0c1a1a1a1a1a',
  CHAR_CAPTURE_MODE:  '7a0c0005-4a4f-4c48-9b2e-0c1a1a1a1a1a',
};
