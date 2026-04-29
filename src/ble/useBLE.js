// ═══════════════════════════════════════════════════════════════════
// useBLE — React hook managing Web Bluetooth lifecycle
//
// Responsibilities:
//   • Connect to SpecAuth device
//   • Subscribe to scan result notifications
//   • Subscribe to live spectrum notifications
//   • Push profiles to device (Hunt Mode)
//   • Expose connection state + latest data to React components
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { BLE } from './uuids';
import {
  parseScanResult,
  parseLiveSpectrum,
  encodeProfileSync,
} from './protocol';

export function useBLE() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Latest data from device
  const [lastScan, setLastScan] = useState(null);
  const [liveSpectrum, setLiveSpectrum] = useState(null);

  // Refs to keep the BLE objects across renders
  const deviceRef    = useRef(null);
  const serverRef    = useRef(null);
  const scanCharRef     = useRef(null);
  const specCharRef     = useRef(null);
  const profCharRef     = useRef(null);
  const captureCharRef  = useRef(null);
  const autoReconnectAttemptedRef = useRef(false);

  // ─── Web Bluetooth availability check ───────────────────────────
  const isSupported = typeof navigator !== 'undefined'
                    && 'bluetooth' in navigator;

  // ─── CONNECT ────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth not supported in this browser. Use Chrome or Edge.');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      // Request device with our service UUID
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: BLE.DEVICE_NAME }],
        optionalServices: [BLE.SVC_UUID],
      });

      deviceRef.current = device;
      autoReconnectAttemptedRef.current = false;

      const setupConnection = async (dev) => {
        // Connect to GATT server
        const server = await dev.gatt.connect();
        serverRef.current = server;

        // Get our service
        const service = await server.getPrimaryService(BLE.SVC_UUID);

        // Get all 3 characteristics
        scanCharRef.current = await service.getCharacteristic(BLE.CHAR_SCAN_RESULT);
        specCharRef.current = await service.getCharacteristic(BLE.CHAR_LIVE_SPECTRUM);
        profCharRef.current = await service.getCharacteristic(BLE.CHAR_PROFILE_SYNC);

        // Capture mode characteristic (may not exist on older firmware)
        try {
          captureCharRef.current = await service.getCharacteristic(BLE.CHAR_CAPTURE_MODE);
        } catch {
          console.warn('[BLE] CHAR_CAPTURE_MODE not found — firmware may need update');
          captureCharRef.current = null;
        }

        // Subscribe to scan result notifications
        await scanCharRef.current.startNotifications();
        scanCharRef.current.addEventListener('characteristicvaluechanged', (e) => {
          try {
            const result = parseScanResult(e.target.value);
            setLastScan(result);
          } catch (err) {
            console.error('Scan parse error:', err);
          }
        });

        // Subscribe to live spectrum notifications
        await specCharRef.current.startNotifications();
        specCharRef.current.addEventListener('characteristicvaluechanged', (e) => {
          try {
            const spec = parseLiveSpectrum(e.target.value);
            setLiveSpectrum(spec);
          } catch (err) {
            console.error('Spectrum parse error:', err);
          }
        });

        setConnected(true);
        setConnecting(false);
        console.log('[BLE] Connected to SpecAuth');
      };

      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false);
        serverRef.current = null;
        
        if (!autoReconnectAttemptedRef.current) {
          autoReconnectAttemptedRef.current = true;
          console.log('[BLE] Disconnected. Attempting exactly one auto-reconnect in 2s...');
          setTimeout(async () => {
            try {
              if (deviceRef.current) {
                console.log('[BLE] Auto-reconnecting...');
                await setupConnection(deviceRef.current);
              }
            } catch (err) {
              console.error('[BLE] Auto-reconnect failed:', err);
            }
          }, 2000);
        }
      });

      await setupConnection(device);
    } catch (err) {
      console.error('[BLE] Connection failed:', err);
      setError(err.message || 'Connection failed');
      setConnecting(false);
      setConnected(false);
    }
  }, [isSupported]);

  // ─── DISCONNECT ─────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setConnected(false);
    serverRef.current = null;
  }, []);

  // ─── PUSH PROFILE (Hunt Mode target) ────────────────────────────
  const pushProfile = useCallback(async (mode, spectrum) => {
    if (!profCharRef.current) {
      throw new Error('Not connected');
    }
    const payload = encodeProfileSync(mode, spectrum);
    await profCharRef.current.writeValue(payload);
    console.log(`[BLE] Profile pushed to mode ${mode}`);
  }, []);

  // ─── CAPTURE MODE (rapid-scan toggle) ───────────────────────────
  const setCaptureMode = useCallback(async (enabled) => {
    if (!captureCharRef.current) {
      throw new Error('Capture mode not supported — update firmware');
    }
    const buf = new Uint8Array([enabled ? 1 : 0]);
    await captureCharRef.current.writeValue(buf);
    console.log(`[BLE] Capture mode: ${enabled ? 'ON' : 'OFF'}`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    isSupported,
    connected,
    connecting,
    error,
    lastScan,
    liveSpectrum,
    connect,
    disconnect,
    pushProfile,
    setCaptureMode,
  };
}
