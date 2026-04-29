import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle, Sparkles } from 'lucide-react';

const VERDICT_CONFIG = {
  PASS: {
    icon: CheckCircle2,
    label: 'AUTHENTIC',
    color: 'text-emerald-600',
    border: 'border-emerald-400/50',
    glow: 'shadow-emerald-200/40',
    bg: 'bg-emerald-50/60',
  },
  FAIL: {
    icon: XCircle,
    label: 'NO MATCH',
    color: 'text-rose-600',
    border: 'border-rose-400/50',
    glow: 'shadow-rose-200/40',
    bg: 'bg-rose-50/60',
  },
  UNCERTAIN: {
    icon: HelpCircle,
    label: 'UNCERTAIN',
    color: 'text-amber-600',
    border: 'border-amber-400/50',
    glow: 'shadow-amber-200/40',
    bg: 'bg-amber-50/60',
  },
  IDLE: {
    icon: Sparkles,
    label: 'AWAITING SCAN',
    color: 'text-lab-muted',
    border: 'border-lab-border',
    glow: '',
    bg: '',
  },
};

export default function VerdictCard({ scan }) {
  const verdict = scan?.result || 'IDLE';
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.IDLE;
  const Icon = cfg.icon;
  const similarityPct = scan ? Math.max(0, scan.similarity * 100) : 0;

  return (
    <div className={`panel overflow-hidden ${cfg.border} ${cfg.bg} transition-all duration-300`}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0a8f6c, #0b7a8a, #5b4fc7)' }} />
      <div className="p-5">
      <span className="lab-label">VERDICT</span>

      <AnimatePresence mode="wait">
        <motion.div
          key={verdict}
          initial={{ opacity: 0, rotateX: -90 }}
          animate={{ opacity: 1, rotateX: 0 }}
          exit={{ opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.4 }}
          className="mt-4 flex flex-col items-center justify-center py-6"
        >
          <Icon size={72} className={`${cfg.color} mb-4`} />
          <div className={`font-display text-2xl tracking-wider ${cfg.color}`}>
            {cfg.label}
          </div>

          {scan && scan.similarity >= 0 && (
            <div className="mt-4 text-center">
              <div className={`text-4xl font-mono font-bold ${cfg.color}`}>
                {similarityPct.toFixed(1)}
                <span className="text-lg">%</span>
              </div>
              <div className="lab-muted mt-1">confidence</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {scan && (
        <div className="mt-2 text-center lab-muted">
          Mode: <span className="text-lab-accent">{scan.mode}</span>
          {scan.lux > 0 && <> · ambient: {scan.lux.toFixed(0)} lx</>}
        </div>
      )}
      </div>
    </div>
  );
}
