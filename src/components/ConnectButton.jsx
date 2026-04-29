import { motion } from 'framer-motion';
import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2 } from 'lucide-react';

export default function ConnectButton({
  connected,
  connecting,
  onConnect,
  onDisconnect,
  isSupported,
}) {
  if (!isSupported) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-xl border border-rose-200">
        <BluetoothOff size={16} />
        <span>Web Bluetooth not supported — use Chrome or Edge</span>
      </div>
    );
  }

  if (connected) {
    return (
      <motion.button
        onClick={onDisconnect}
        className="px-4 py-3 flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50/80 hover:bg-emerald-50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <BluetoothConnected size={18} className="text-lab-accent" />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-lab-accent text-sm font-semibold">CONNECTED</span>
          <span className="lab-muted">Tap to disconnect</span>
        </div>
        <motion.div
          className="ml-2 w-2 h-2 rounded-full bg-lab-accent"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onConnect}
      disabled={connecting}
      className="panel px-4 py-3 flex items-center gap-3 hover:border-lab-accent/50 transition-all disabled:opacity-60"
      style={{ borderImage: connecting ? 'none' : undefined }}
      whileHover={{ scale: connecting ? 1 : 1.02 }}
      whileTap={{ scale: connecting ? 1 : 0.98 }}
    >
      {connecting ? (
        <>
          <Loader2 size={18} className="animate-spin text-lab-accent" />
          <span className="lab-label">Connecting…</span>
        </>
      ) : (
        <>
          <Bluetooth size={18} />
          <span className="lab-label">Connect to SpecAuth</span>
        </>
      )}
    </motion.button>
  );
}
