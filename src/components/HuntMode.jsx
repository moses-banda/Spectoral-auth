import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, X, Flame } from 'lucide-react';
import { cosineSimilarity } from '../lib/cosineSimilarity';
import confetti from 'canvas-confetti';

/**
 * Hunt Mode — show live "warmer/colder" feedback as the user scans
 * different surfaces looking for a target paint.
 */
export default function HuntMode({ target, liveSpectrum, onExit }) {
  const [hasWon, setHasWon] = useState(false);

  if (!target) return null;

  const targetSpectrum = typeof target.spectrum === 'string'
    ? JSON.parse(target.spectrum)
    : target.spectrum;

  const similarity = liveSpectrum
    ? cosineSimilarity(liveSpectrum, targetSpectrum)
    : 0;
  const pct = Math.max(0, similarity * 100);

  useEffect(() => {
    if (pct > 97 && !hasWon) {
      setHasWon(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else if (pct < 90 && hasWon) {
      setHasWon(false);
    }
  }, [pct, hasWon]);

  // Heat level drives the visual intensity
  const heatLevel =
    pct > 97 ? 'victory' :
    pct > 90 ? 'hot' :
    pct > 80 ? 'warm' :
    pct > 60 ? 'cool' :
    'cold';

  const HEAT_CONFIG = {
    victory: { bg: 'bg-emerald-50',   border: 'border-emerald-400', text: 'text-emerald-600', label: '🎯 FOUND IT' },
    hot:     { bg: 'bg-amber-50',     border: 'border-amber-400',   text: 'text-amber-600',   label: '🔥 VERY WARM' },
    warm:    { bg: 'bg-orange-50',    border: 'border-orange-400',  text: 'text-orange-600',  label: '🌡 WARM' },
    cool:    { bg: 'bg-blue-50',      border: 'border-blue-400',    text: 'text-blue-600',    label: '❄️ COOL' },
    cold:    { bg: 'bg-slate-50',     border: 'border-slate-300',   text: 'text-slate-500',   label: '🧊 COLD' },
  };
  const cfg = HEAT_CONFIG[heatLevel];

  return (
    <motion.div
      className={`panel p-5 ${cfg.bg} ${cfg.border} border-2 transition-all duration-300`}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={18} className={cfg.text} />
          <span className="lab-label">HUNTING</span>
        </div>
        <button onClick={onExit} className="text-lab-muted hover:text-lab-text">
          <X size={18} />
        </button>
      </div>

      <div className="text-center py-4">
        <div className="lab-muted text-xs mb-1">target:</div>
        <div className="text-lab-text font-bold text-lg">{target.name}</div>
        {target.brand && (
          <div className="lab-muted text-sm">{target.brand}</div>
        )}

        <motion.div
          className={`mt-4 text-5xl font-mono font-bold ${cfg.text}`}
          animate={heatLevel === 'victory' ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: heatLevel === 'victory' ? Infinity : 0 }}
        >
          {pct.toFixed(1)}%
        </motion.div>

        <div className={`mt-2 font-display tracking-wider ${cfg.text}`}>
          {cfg.label}
        </div>

        {/* Heat bar */}
        <div className="mt-4 h-3 bg-lab-bg rounded-full overflow-hidden border border-lab-border">
          <motion.div
            className={`h-full ${
              pct > 97 ? 'bg-emerald-500' :
              pct > 90 ? 'bg-amber-500' :
              pct > 80 ? 'bg-orange-500' :
              pct > 60 ? 'bg-blue-500' :
              'bg-slate-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
