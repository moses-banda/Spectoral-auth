import { useEffect, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { listRecentScans } from '../supabase/scans';

export default function ScanHistory() {
  const [scans, setScans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listRecentScans(20);
        setScans(rows);
      } catch (e) {
        console.error('Failed to load scan history:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = expanded ? scans : scans.slice(0, 5);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-lab-accent" />
          <span className="lab-label">SCAN HISTORY · {scans.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-lab-muted text-sm animate-pulse">Loading history...</div>
      ) : scans.length === 0 ? (
        <div className="text-lab-muted text-sm text-center py-4">
          No scans yet. Connect your device and scan a paint sample.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((scan) => {
              const topMatch = scan.top_matches?.[0];
              const pct = topMatch ? (topMatch.similarity * 100).toFixed(1) : null;
              const time = new Date(scan.timestamp).toLocaleString();

              return (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-lab-border bg-white/60 hover:border-lab-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-lab-text truncate">
                      {topMatch?.name || 'No match'}
                    </div>
                    <div className="text-xs text-lab-muted">{time}</div>
                  </div>
                  {pct && (
                    <div className={`text-sm font-mono font-bold ml-3 ${
                      pct > 95 ? 'text-emerald-600' :
                      pct > 85 ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {pct}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {scans.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 w-full flex items-center justify-center gap-1 text-lab-accent text-xs font-semibold hover:underline"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Show less' : `Show all ${scans.length} scans`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
