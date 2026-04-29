import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-orange-500'];

/**
 * Ranked leaderboard of best-matching profiles.
 * matches = [{ id, name, brand, color_code, similarity, description, spectrum, category }]
 */
export default function MatchResults({ matches, onSelect, selectedId }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="panel p-5">
        <div className="lab-label mb-2">MATCH RESULTS</div>
        <div className="lab-muted text-sm">
          No matches yet — register some profiles, then scan.
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="lab-label mb-4">MATCH RESULTS · TOP {matches.length}</div>

      <div className="space-y-2">
        {matches.map((m, i) => {
          const Icon     = RANK_ICONS[i] || null;
          const rankCol  = RANK_COLORS[i] || 'text-lab-muted';
          const pct      = Math.max(0, m.similarity * 100);
          const isActive = m.id === selectedId;

          return (
            <motion.button
              key={m.id}
              onClick={() => onSelect?.(m)}
              className={`w-full text-left p-3 rounded-xl border transition-all
                ${isActive
                  ? 'border-lab-accent bg-lab-accent/5 shadow-sm'
                  : 'border-lab-border hover:border-lab-accent/40 bg-white/60'}`}
              whileHover={{ x: 2 }}
              layout
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 ${rankCol}`}>
                  {Icon ? <Icon size={20} /> : <span className="text-xs">#{i + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-lab-text truncate">{m.name}</div>
                  <div className="lab-muted text-xs truncate">
                    {[m.brand, m.color_code].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-mono font-bold ${
                    pct > 95 ? 'text-emerald-600' :
                    pct > 85 ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    {pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Similarity bar */}
              <div className="mt-2 h-1.5 bg-lab-elevated rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    pct > 95 ? 'bg-emerald-500' :
                    pct > 85 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
