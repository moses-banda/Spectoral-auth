import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, BookOpen, Database,
  Bluetooth, BluetoothConnected, Loader2,
  Lightbulb, Users, ScanLine, TrendingUp,
} from 'lucide-react';
import { getObjectStats } from '../supabase/objects';

export default function HomePage({ connected, connecting, onConnect, onDisconnect, isSupported }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getObjectStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="text-center mb-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-bold tracking-tight lumen-gradient-text">Lumen</h1>
            <p className="text-lab-muted mt-2 text-sm tracking-wide">Spectral Memory Aid</p>
          </motion.div>

          <div className="mt-6 flex justify-center">
            {!isSupported ? (
              <div className="text-xs text-rose-500 bg-rose-50 px-4 py-2 rounded-full border border-rose-200">
                Web Bluetooth not supported — use Chrome
              </div>
            ) : connected ? (
              <motion.button onClick={onDisconnect}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-emerald-300 bg-emerald-50/80 text-sm font-semibold text-emerald-700"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <BluetoothConnected size={16} />
                <span>Connected</span>
                <motion.div className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </motion.button>
            ) : (
              <motion.button onClick={onConnect} disabled={connecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-lab-border bg-white/80 text-sm font-medium text-lab-text hover:border-lumen-teal/50 transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {connecting ? <><Loader2 size={16} className="animate-spin" /> Connecting…</> : <><Bluetooth size={16} /> Connect Device</>}
              </motion.button>
            )}
          </div>
        </header>

        {/* Stats */}
        {stats && (
          <motion.div className="grid grid-cols-3 gap-3 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <StatCard icon={<Lightbulb size={18} />} value={stats.totalObjects} label="Objects" color="#D4A276" />
            <StatCard icon={<ScanLine size={18} />} value={stats.totalIdentifications} label="IDs" color="#0B7A8A" />
            <StatCard icon={<Users size={18} />} value={stats.uniqueOwners.length} label="Owners" color="#E8A87C" />
          </motion.div>
        )}

        {stats?.mostIdentified?.identify_count > 0 && (
          <div className="panel p-4 mb-8 flex items-center gap-3">
            <TrendingUp size={16} className="text-lumen-warm" />
            <span className="text-sm text-lab-muted">Most identified:</span>
            <span className="text-sm font-bold text-lab-text">{stats.mostIdentified.name}</span>
            <span className="text-xs text-lab-muted ml-auto">{stats.mostIdentified.identify_count}×</span>
          </div>
        )}

        {/* Actions */}
        <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <ActionCard icon={<Plus size={22} />} title="Enroll Object" sub="Speak about an object and scan it to remember" grad="linear-gradient(135deg, #D4A276, #E8A87C)" onClick={() => navigate('/enroll')} />
          <ActionCard icon={<Search size={22} />} title="Identify" sub="Scan an object to find out what it is" grad="linear-gradient(135deg, #0B7A8A, #0a8f6c)" onClick={() => navigate('/identify')} />
          <ActionCard icon={<BookOpen size={22} />} title="Object Library" sub={`Browse ${stats?.totalObjects || 0} enrolled objects`} grad="linear-gradient(135deg, #5b4fc7, #7c6de8)" onClick={() => navigate('/library')} />
          <ActionCard icon={<Database size={16} />} title="Data Capture" sub="Collect labeled spectra for CNN training" grad="linear-gradient(135deg, #6b7a8d, #8a99ab)" onClick={() => navigate('/capture')} compact />
        </motion.div>

        <footer className="py-8 text-center">
          <div className="h-px w-24 mx-auto mb-4 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, #D4A276, transparent)' }} />
          <span className="text-lab-muted text-xs">{connected ? '🟢 connected' : '⚪ offline'}</span>
          <span className="mx-3 text-lab-border">·</span>
          <span className="text-lab-muted text-xs">Lumen v1.0</span>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="panel p-4 text-center">
      <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
      <div className="text-2xl font-bold text-lab-text">{value}</div>
      <div className="text-xs text-lab-muted mt-0.5">{label}</div>
    </div>
  );
}

function ActionCard({ icon, title, sub, grad, onClick, compact }) {
  return (
    <motion.button onClick={onClick} className="w-full text-left panel overflow-hidden group" whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }}>
      <div className="h-1 w-full" style={{ background: grad }} />
      <div className={`flex items-center gap-4 ${compact ? 'p-3' : 'p-5'}`}>
        <div className={`flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl text-white`} style={{ background: grad }}>{icon}</div>
        <div className="flex-1">
          <div className={`font-bold text-lab-text ${compact ? 'text-sm' : ''}`}>{title}</div>
          <div className="text-xs text-lab-muted mt-0.5">{sub}</div>
        </div>
        <div className="text-lab-muted group-hover:text-lab-text transition-colors">→</div>
      </div>
    </motion.button>
  );
}
