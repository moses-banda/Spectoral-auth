// ═══════════════════════════════════════════════════════════════════
// IdentifyPage — Patient kiosk mode
//
// ONE huge button. Scan → identify → speak result aloud.
// Designed for people with cognitive impairment:
//   - Huge text, huge buttons
//   - High contrast dark theme
//   - Auto-speaks the result
//   - Minimal UI elements
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Volume2, HelpCircle, ScanLine } from 'lucide-react';

import { identifyObject, logIdentification, getConfidenceTier } from '../supabase/objects';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export default function IdentifyPage({ connected, lastScan }) {
  const navigate = useNavigate();
  const tts = useSpeechSynthesis();

  const [state, setState] = useState('idle'); // idle | scanning | found | unknown
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const lastScanRef = useRef(null);

  // Watch for incoming scans
  useEffect(() => {
    if (!lastScan || state === 'scanning') return;
    if (lastScanRef.current === lastScan.timestamp) return;
    lastScanRef.current = lastScan.timestamp;

    handleScan(lastScan.spectrum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan]);

  const handleScan = async (spectrum) => {
    setState('scanning');
    try {
      const matches = await identifyObject(spectrum, 3);

      if (matches.length === 0 || matches[0].similarity < 0.5) {
        setState('unknown');
        setResult(null);
        tts.speak("I don't recognize this object. Can someone help?");
        return;
      }

      const top = matches[0];
      const tier = getConfidenceTier(top.similarity);
      setResult(top);
      setConfidence(tier);
      setState('found');

      // Build speech text
      const speechText = top.description
        ? `${tier.label} ${top.name}. ${top.description}`
        : `${tier.label} ${top.name}.`;
      tts.speak(speechText);

      // Log the identification
      logIdentification(top.id, top.name, top.similarity, spectrum);
    } catch (e) {
      console.error('Identification failed:', e);
      setState('idle');
    }
  };

  const handlePlayAgain = () => {
    if (!result) return;
    const tier = getConfidenceTier(result.similarity);
    const text = result.description
      ? `${tier.label} ${result.name}. ${result.description}`
      : `${tier.label} ${result.name}.`;
    tts.speak(text);
  };

  const TIER_COLORS = {
    sure:    { bg: 'bg-emerald-900/30', border: 'border-emerald-500', text: 'text-emerald-400' },
    likely:  { bg: 'bg-amber-900/30',   border: 'border-amber-500',   text: 'text-amber-400'   },
    unsure:  { bg: 'bg-orange-900/30',  border: 'border-orange-500',  text: 'text-orange-400'  },
    unknown: { bg: 'bg-slate-800/30',   border: 'border-slate-600',   text: 'text-slate-400'   },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F1729' }}>
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="text-slate-500 text-xs">
          {connected ? '🟢 Connected' : '⚪ Not connected'}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        <AnimatePresence mode="wait">
          {/* ═══ IDLE ═══ */}
          {state === 'idle' && (
            <motion.div key="idle" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="w-40 h-40 rounded-full mx-auto mb-8 flex items-center justify-center border-4 border-lumen-teal/30"
                style={{ background: 'radial-gradient(circle, rgba(11,122,138,0.2) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.03, 1], borderColor: ['rgba(11,122,138,0.3)', 'rgba(11,122,138,0.6)', 'rgba(11,122,138,0.3)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <ScanLine size={56} className="text-lumen-teal/60" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-3">Ready to Identify</h2>
              <p className="text-lg text-slate-400">Press the button on the device to scan</p>
              {!connected && (
                <p className="text-sm text-rose-400 mt-4">⚠ Connect your device first</p>
              )}
            </motion.div>
          )}

          {/* ═══ SCANNING ═══ */}
          {state === 'scanning' && (
            <motion.div key="scanning" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="w-40 h-40 rounded-full mx-auto mb-8 flex items-center justify-center border-4 border-amber-400/50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <ScanLine size={56} className="text-amber-400 animate-pulse" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white">Identifying…</h2>
            </motion.div>
          )}

          {/* ═══ FOUND ═══ */}
          {state === 'found' && result && confidence && (
            <motion.div key="found" className="text-center w-full max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className={`rounded-2xl p-8 border-2 ${TIER_COLORS[confidence.tier]?.bg} ${TIER_COLORS[confidence.tier]?.border}`}>
                <div className={`text-sm uppercase tracking-wider mb-3 ${TIER_COLORS[confidence.tier]?.text}`}>
                  {confidence.label}
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">{result.name}</h2>

                {result.description && (
                  <p className="text-xl text-slate-300 leading-relaxed mb-4">
                    "{result.description}"
                  </p>
                )}

                {result.owner && result.owner !== 'shared' && (
                  <div className="text-sm text-slate-400 mb-2">Belongs to: {result.owner}</div>
                )}
                {result.location && (
                  <div className="text-sm text-slate-400">Usually found: {result.location}</div>
                )}

                <div className="mt-6 text-2xl font-mono font-bold text-white">
                  {(result.similarity * 100).toFixed(0)}%
                  <span className="text-sm text-slate-400 ml-2">confidence</span>
                </div>
              </div>

              <div className="flex gap-4 justify-center mt-8">
                <motion.button onClick={handlePlayAgain}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-lumen-teal text-white font-bold text-lg"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Volume2 size={20} /> Play Again
                </motion.button>
                <motion.button onClick={() => { setState('idle'); setResult(null); }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-lg"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Scan Another
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ UNKNOWN ═══ */}
          {state === 'unknown' && (
            <motion.div key="unknown" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HelpCircle size={72} className="text-slate-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-3">I don't recognize this</h2>
              <p className="text-lg text-slate-400 mb-8">Can someone help? This object hasn't been enrolled yet.</p>
              <motion.button onClick={() => setState('idle')}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-bold text-lg"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
