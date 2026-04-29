// ═══════════════════════════════════════════════════════════════════
// CapturePage.jsx — Labeled data collection UI for CNN training
//
// Workflow:
//   1. Connect to SpecAuth device
//   2. Pick a class label + enter sample ID
//   3. Toggle "Start Capture" — device rapid-scans every 500ms
//   4. Each scan auto-saves to dataset_scans in Supabase
//   5. Progress bars show samples per class
//   6. Export button downloads CSV for Google Colab
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Download, Trash2, Database,
  Wifi, WifiOff, ChevronLeft, RotateCcw,
} from 'lucide-react';

import { useBLE } from '../ble/useBLE';
import { CHANNEL_LABELS } from '../ble/protocol';
import {
  saveDatasetScan,
  getClassCounts,
  exportDataset,
  deleteClassScans,
} from '../supabase/dataset';

// ── Config ────────────────────────────────────────────────────────
const CLASSES = [
  { key: 'skin',        emoji: '🤚', color: '#e8a87c' },
  { key: 'paper_white', emoji: '📄', color: '#d4d8dd' },
  { key: 'leaf_living', emoji: '🌿', color: '#4caf50' },
  { key: 'paint_warm',  emoji: '🔴', color: '#ef5350' },
  { key: 'paint_cool',  emoji: '🔵', color: '#42a5f5' },
  { key: 'fabric',      emoji: '🧵', color: '#ab47bc' },
];
const TARGET_PER_CLASS = 40;

export default function CapturePage({ onBack }) {
  const {
    isSupported, connected, connecting, error,
    lastScan, connect, disconnect, setCaptureMode,
  } = useBLE();

  // ── State ──────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [sampleId, setSampleId]           = useState('');
  const [capturing, setCapturing]         = useState(false);
  const [sessionId]                       = useState(() => crypto.randomUUID());
  const [classCounts, setClassCounts]     = useState({});
  const [sessionCount, setSessionCount]   = useState(0);
  const [recentScans, setRecentScans]     = useState([]);
  const [exporting, setExporting]         = useState(false);

  const lastScanRef = useRef(null);

  // ── Load class counts on mount & after changes ──────────────────
  const refreshCounts = useCallback(async () => {
    try {
      const rows = await getClassCounts();
      const map = {};
      for (const r of rows) map[r.label] = Number(r.count);
      setClassCounts(map);
    } catch (e) {
      console.error('Failed to fetch class counts:', e);
    }
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  // ── Auto-save incoming scans while capturing ────────────────────
  useEffect(() => {
    if (!capturing || !lastScan || !selectedClass) return;
    // Deduplicate by timestamp
    if (lastScanRef.current === lastScan.timestamp) return;
    lastScanRef.current = lastScan.timestamp;

    const spectrum = lastScan.spectrum;
    saveDatasetScan({
      label: selectedClass,
      spectrum,
      session_id: sessionId,
      sample_id: sampleId || null,
    })
      .then(() => {
        setSessionCount(c => c + 1);
        setClassCounts(prev => ({
          ...prev,
          [selectedClass]: (prev[selectedClass] || 0) + 1,
        }));
        setRecentScans(prev => [
          { spectrum, label: selectedClass, ts: Date.now() },
          ...prev.slice(0, 9),
        ]);
      })
      .catch(e => console.error('Save failed:', e));
  }, [lastScan, capturing, selectedClass, sessionId, sampleId]);

  // ── Start / Stop capture ────────────────────────────────────────
  const toggleCapture = async () => {
    if (capturing) {
      try { await setCaptureMode(false); } catch {}
      setCapturing(false);
    } else {
      if (!selectedClass) return;
      try {
        await setCaptureMode(true);
        setCapturing(true);
        setSessionCount(0);
      } catch (e) {
        console.error('Failed to start capture:', e);
      }
    }
  };

  // ── Export CSV for Colab ────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await exportDataset();
      if (rows.length === 0) {
        alert('No data to export yet.');
        return;
      }

      // Build CSV
      const header = ['id', 'label', 'sample_id', ...CHANNEL_LABELS, 'created_at'];
      const csvLines = [header.join(',')];
      for (const r of rows) {
        const spec = Array.isArray(r.spectrum) ? r.spectrum : JSON.parse(r.spectrum);
        csvLines.push([
          r.id,
          r.label,
          r.sample_id || '',
          ...spec.map(v => v.toFixed(6)),
          r.created_at,
        ].join(','));
      }
      const csv = csvLines.join('\n');

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `specauth_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Reset a class ──────────────────────────────────────────────
  const handleResetClass = async (cls) => {
    if (!confirm(`Delete all "${cls}" scans? This cannot be undone.`)) return;
    try {
      await deleteClassScans(cls);
      refreshCounts();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // ── Computed ────────────────────────────────────────────────────
  const totalScans = Object.values(classCounts).reduce((a, b) => a + b, 0);
  const allClassesDone = CLASSES.every(c => (classCounts[c.key] || 0) >= TARGET_PER_CLASS);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl">

        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-lab-muted hover:text-lab-text transition-colors"
          >
            <ChevronLeft size={16} />
            Back to app
          </button>

          <div className="flex items-center gap-3">
            {connected ? (
              <button onClick={disconnect}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wifi size={12} /> Connected
              </button>
            ) : (
              <button onClick={connect} disabled={connecting || !isSupported}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 disabled:opacity-50">
                <WifiOff size={12} /> {connecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* ═══ HEADER ═══ */}
        <div className="panel p-6 mb-6 overflow-hidden">
          <div className="h-1 w-full -mt-6 -mx-6 mb-5" style={{ width: 'calc(100% + 3rem)', background: 'linear-gradient(90deg, #0a8f6c, #0b7a8a, #5b4fc7)' }} />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl tracking-[0.2em]"
                  style={{ background: 'linear-gradient(135deg, #0a8f6c, #0b7a8a, #5b4fc7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DATA CAPTURE
              </h1>
              <p className="text-lab-muted mt-1 text-sm">
                Collect labeled spectra for CNN training
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-lab-text">{totalScans}</div>
              <div className="text-xs text-lab-muted">total scans</div>
            </div>
          </div>
        </div>

        {/* ═══ CLASS PROGRESS BARS ═══ */}
        <div className="panel p-5 mb-6">
          <div className="lab-label mb-4">CLASS PROGRESS</div>
          <div className="space-y-3">
            {CLASSES.map(cls => {
              const count = classCounts[cls.key] || 0;
              const pct = Math.min((count / TARGET_PER_CLASS) * 100, 100);
              const done = count >= TARGET_PER_CLASS;
              return (
                <div key={cls.key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cls.emoji}</span>
                      <span className={`text-sm font-medium ${selectedClass === cls.key ? 'text-lab-text' : 'text-lab-muted'}`}>
                        {cls.key}
                      </span>
                      {done && <span className="text-xs text-emerald-600 font-bold">✓ DONE</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-lab-muted">{count}/{TARGET_PER_CLASS}</span>
                      <button
                        onClick={() => handleResetClass(cls.key)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        title={`Reset ${cls.key}`}
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: done ? '#10b981' : cls.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ CAPTURE CONTROLS ═══ */}
        <div className="panel p-5 mb-6">
          <div className="lab-label mb-4">CAPTURE CONTROLS</div>

          {/* Class selector */}
          <div className="mb-4">
            <label className="text-xs text-lab-muted block mb-2">Select class</label>
            <div className="grid grid-cols-3 gap-2">
              {CLASSES.map(cls => (
                <button
                  key={cls.key}
                  onClick={() => { if (!capturing) setSelectedClass(cls.key); }}
                  disabled={capturing}
                  className={`
                    px-3 py-2.5 rounded-lg text-sm font-medium transition-all border
                    ${selectedClass === cls.key
                      ? 'border-2 shadow-md scale-[1.02]'
                      : 'border-slate-200 bg-white/60 hover:bg-white/90 text-slate-600'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                  style={selectedClass === cls.key ? {
                    borderColor: cls.color,
                    background: `${cls.color}15`,
                    color: '#1a2332',
                  } : undefined}
                >
                  <span className="mr-1.5">{cls.emoji}</span>
                  {cls.key}
                </button>
              ))}
            </div>
          </div>

          {/* Sample ID */}
          <div className="mb-5">
            <label className="text-xs text-lab-muted block mb-2">
              Sample ID <span className="text-slate-400">(e.g. "hand_palm_left")</span>
            </label>
            <input
              type="text"
              value={sampleId}
              onChange={e => setSampleId(e.target.value)}
              disabled={capturing}
              placeholder="Enter sample identifier..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/80 text-sm
                         focus:border-[#0a8f6c] focus:ring-1 focus:ring-[#0a8f6c]/30 transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Start / Stop button */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={toggleCapture}
              disabled={!connected || !selectedClass}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white text-sm
                transition-all disabled:opacity-40 disabled:cursor-not-allowed
              `}
              style={{
                background: capturing
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #0a8f6c, #0b7a8a)',
                boxShadow: capturing
                  ? '0 2px 12px rgba(239, 68, 68, 0.3)'
                  : '0 2px 12px rgba(10, 143, 108, 0.3)',
              }}
              whileHover={{ scale: connected && selectedClass ? 1.01 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              {capturing ? (
                <>
                  <Square size={16} fill="white" />
                  STOP CAPTURE ({sessionCount} this session)
                </>
              ) : (
                <>
                  <Play size={16} fill="white" />
                  START CAPTURE
                </>
              )}
            </motion.button>
          </div>

          {!connected && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              Connect to your SpecAuth device first
            </p>
          )}
        </div>

        {/* ═══ LIVE FEED ═══ */}
        <AnimatePresence>
          {capturing && recentScans.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="panel p-5 mb-6"
            >
              <div className="lab-label mb-3">LIVE FEED</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentScans.map((scan, i) => (
                  <motion.div
                    key={scan.ts}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-md bg-slate-50/80"
                  >
                    <span className="text-emerald-500 font-bold">●</span>
                    <span className="font-medium text-lab-text">{scan.label}</span>
                    <span className="text-lab-muted font-mono text-[10px] flex-1 truncate">
                      [{scan.spectrum.map(v => v.toFixed(2)).join(', ')}]
                    </span>
                    <span className="text-lab-muted tabular-nums">
                      {new Date(scan.ts).toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ EXPORT ═══ */}
        <div className="panel p-5 mb-6">
          <div className="lab-label mb-3">EXPORT FOR TRAINING</div>
          <p className="text-xs text-lab-muted mb-4">
            Download a CSV file of all collected scans. Upload this to your Google Colab notebook for training.
          </p>
          <div className="flex gap-3">
            <motion.button
              onClick={handleExport}
              disabled={totalScans === 0 || exporting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm
                         border border-slate-200 bg-white/80 hover:bg-white text-lab-text
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              whileHover={{ scale: totalScans > 0 ? 1.01 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download size={15} />
              {exporting ? 'Exporting...' : `Export CSV (${totalScans} scans)`}
            </motion.button>
          </div>
          {allClassesDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center font-medium"
            >
              🎉 All classes have ≥{TARGET_PER_CLASS} samples — dataset is ready for training!
            </motion.div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="py-4 text-center">
          <div className="h-px w-24 mx-auto mb-4 opacity-30"
               style={{ background: 'linear-gradient(90deg, transparent, #0a8f6c, transparent)' }} />
          <span className="text-lab-muted text-xs">
            Session: {sessionId.slice(0, 8)}
          </span>
          <span className="mx-3 text-lab-border">·</span>
          <span className="text-lab-muted text-xs">
            {connected ? '🟢 connected' : '⚪ offline'}
          </span>
        </footer>
      </div>
    </div>
  );
}
