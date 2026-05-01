// ═══════════════════════════════════════════════════════════════════
// IdentifyPage — The patient interface
//
// Design principles:
//   - ONE button. That's it.
//   - Scan → if confident (≥98%): play audio of what it is
//   - If not confident: "Please scan again" — no guessing
//   - No text walls, no confidence %, no abstractions
//   - Just: object name in big text + warm audio voice
//
// Future: this page drives a mini speaker on the physical device.
// The web interface is just a visual companion.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Volume2 } from 'lucide-react';

import { identifyObject, logIdentification } from '../supabase/objects';
import { speak } from '../ai/speak';

const CONFIDENCE_THRESHOLD = 0.99;

export default function IdentifyPage({ connected, lastScan }) {
  const navigate = useNavigate();

  const [state, setState]   = useState('idle');  // idle | working | found | rescan
  const [result, setResult] = useState(null);
  const lastScanRef = useRef(null);

  // Watch for incoming BLE scans
  useEffect(() => {
    if (!lastScan) return;
    if (lastScanRef.current === lastScan.timestamp) return;
    lastScanRef.current = lastScan.timestamp;

    handleScan(lastScan.spectrum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan]);

  const handleScan = async (spectrum) => {
    setState('working');

    try {
      const matches = await identifyObject(spectrum, 3);

      // No matches at all
      if (!matches || matches.length === 0) {
        setState('rescan');
        speak("I couldn't find a match. Please scan again.");
        return;
      }

      const top = matches[0];

      // Below threshold → don't guess, ask for rescan
      if (top.similarity < CONFIDENCE_THRESHOLD) {
        setState('rescan');
        speak("Please hold the device closer and scan again.");
        return;
      }

      // ✅ Confident match — tell grandpa what it is
      setResult(top);
      setState('found');

      // Build the spoken text — warm and direct, no "I'm sure" prefix
      const spoken = top.description
        ? `${top.name}. ${top.description}`
        : `This is ${top.name}.`;

      speak(spoken);

      // Log it (non-blocking)
      logIdentification(top.id, top.name, top.similarity, spectrum);
    } catch (e) {
      console.error('Identification failed:', e);
      setState('rescan');
      speak("Something went wrong. Please try scanning again.");
    }
  };

  const handlePlayAgain = () => {
    if (!result) return;
    const spoken = result.description
      ? `${result.name}. ${result.description}`
      : `This is ${result.name}.`;
    speak(spoken);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F1729' }}>
      {/* Tiny back button — only family members use this */}
      <div className="flex items-center justify-between px-6 py-4">
        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-xs opacity-40 hover:opacity-100 transition-opacity">
          <ChevronLeft size={14} />
        </button>
        <div className="text-slate-600 text-[10px]">
          {connected ? '●' : '○'}
        </div>
      </div>

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16">
        <AnimatePresence mode="wait">

          {/* ═══ IDLE — waiting for scan ═══ */}
          {state === 'idle' && (
            <motion.div key="idle" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="w-48 h-48 rounded-full mx-auto mb-10 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, rgba(11,122,138,0.15) 0%, rgba(11,122,138,0.05) 50%, transparent 70%)',
                  border: '3px solid rgba(11,122,138,0.2)',
                }}
                animate={{
                  scale: [1, 1.04, 1],
                  borderColor: ['rgba(11,122,138,0.2)', 'rgba(11,122,138,0.5)', 'rgba(11,122,138,0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-[#0B7A8A]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              <h2 className="text-2xl font-semibold text-white/90">Ready</h2>
              <p className="text-slate-400 mt-2">Press the button on the device</p>

              {!connected && (
                <p className="text-rose-400/80 text-sm mt-6">Device not connected</p>
              )}
            </motion.div>
          )}

          {/* ═══ WORKING — processing ═══ */}
          {state === 'working' && (
            <motion.div key="working" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="w-48 h-48 rounded-full mx-auto mb-10 flex items-center justify-center"
                style={{ border: '3px solid rgba(212,162,118,0.5)' }}
                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-lumen-warm"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </motion.div>
              <h2 className="text-2xl font-semibold text-white/90">Looking…</h2>
            </motion.div>
          )}

          {/* ═══ FOUND — object identified ═══ */}
          {state === 'found' && result && (
            <motion.div key="found" className="text-center w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>

              {/* Big object name */}
              <motion.h1
                className="text-5xl font-bold text-white leading-tight mb-6"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
              >
                {result.name}
              </motion.h1>

              {/* Description */}
              {result.description && (
                <p className="text-xl text-slate-300 leading-relaxed mb-8">
                  {result.description}
                </p>
              )}

              {/* Owner + location — subtle */}
              <div className="text-sm text-slate-500 space-y-1 mb-10">
                {result.owner && result.owner !== 'shared' && (
                  <div>Belongs to {result.owner}</div>
                )}
                {result.location && (
                  <div>Usually found: {result.location}</div>
                )}
              </div>

              {/* Play again + scan another */}
              <div className="flex gap-4 justify-center">
                <motion.button onClick={handlePlayAgain}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#0B7A8A] text-white font-bold text-lg"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Volume2 size={22} /> Hear Again
                </motion.button>
                <motion.button onClick={() => { setState('idle'); setResult(null); }}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-lg"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Next
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ RESCAN — not confident enough ═══ */}
          {state === 'rescan' && (
            <motion.div key="rescan" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="w-48 h-48 rounded-full mx-auto mb-10 flex items-center justify-center"
                style={{ border: '3px solid rgba(212,162,118,0.3)' }}
                animate={{ borderColor: ['rgba(212,162,118,0.3)', 'rgba(212,162,118,0.6)', 'rgba(212,162,118,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-5xl">🔄</span>
              </motion.div>

              <h2 className="text-2xl font-semibold text-white/90 mb-3">Please scan again</h2>
              <p className="text-slate-400">Hold the device a little closer</p>

              <motion.button
                onClick={() => setState('idle')}
                className="mt-8 px-8 py-4 rounded-2xl bg-slate-800 text-white font-bold text-lg"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                Ready
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
