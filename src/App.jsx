import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';

import { useBLE } from './ble/useBLE';
import { findMatches } from './supabase/profiles';
import { logScan } from './supabase/scans';
import { describePaint } from './ai/describe';

import ConnectButton from './components/ConnectButton';
import VerdictCard   from './components/VerdictCard';
import RegisterModal from './components/RegisterModal';
import MatchResults  from './components/MatchResults';
import ProfileGallery from './components/ProfileGallery';
import ScanHistory   from './components/ScanHistory';
import HuntMode      from './components/HuntMode';
import DeltaChart    from './components/DeltaChart';
import SpectrumChart from './components/SpectrumChart';
import CapturePage   from './components/CapturePage';
import { parseSpectrum } from './lib/cosineSimilarity';

export default function App() {
  const {
    isSupported, connected, connecting, error,
    lastScan, liveSpectrum,
    connect, disconnect, pushProfile,
  } = useBLE();

  const [registerOpen,  setRegisterOpen]  = useState(false);
  const [matches,       setMatches]       = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [aiResult,      setAiResult]      = useState(null);  // { paintName, commonColor }
  const [aiLoading,     setAiLoading]     = useState(false);
  const [huntTarget,    setHuntTarget]    = useState(null);
  const [page,          setPage]          = useState('main'); // 'main' | 'capture'

  // ─── Hunt target pushing ────────────────────────────────────────
  useEffect(() => {
    if (huntTarget && connected) {
      try {
        const spec = parseSpectrum(huntTarget.spectrum);
        pushProfile(0, spec).catch(console.error);
      } catch (err) {
        console.error('Failed to parse or push hunt target:', err);
      }
    }
  }, [huntTarget, connected, pushProfile]);

  // ─── When a new scan arrives, query for matches + log it ──────
  useEffect(() => {
    if (!lastScan) return;

    (async () => {
      try {
        const rows = await findMatches(lastScan.spectrum, 5);
        setMatches(rows);
        if (rows.length > 0 && !selectedMatch) {
          setSelectedMatch(rows[0]);
        }

        // Log the scan event for history
        logScan({
          spectrum:    lastScan.spectrum,
          top_matches: rows.slice(0, 3).map(r => ({
            id:         r.id,
            name:       r.name,
            similarity: r.similarity,
          })),
        }).catch(console.error);

        // Ask AI to identify the color
        setAiLoading(true);
        try {
          const ai = await describePaint({
            spectrum: lastScan.spectrum,
            name: rows[0]?.name || 'Unknown',
            category: rows[0]?.category || 'other',
          });
          setAiResult(ai);
        } catch (e) {
          console.error('AI describe failed:', e);
          setAiResult(null);
        } finally {
          setAiLoading(false);
        }
      } catch (e) {
        console.error('Match query failed:', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan]);

  // ─── Render capture page if active ───────────────────────────
  if (page === 'capture') {
    return <CapturePage onBack={() => setPage('main')} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl">

        {/* Top accent bar */}
        <div className="h-1 w-full rounded-full mb-6 opacity-60"
             style={{ background: 'linear-gradient(90deg, #0a8f6c, #0b7a8a, #5b4fc7, #0a8f6c)' }} />

        {/* ═══════ HEADER ═══════ */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl tracking-[0.3em]"
                style={{ background: 'linear-gradient(135deg, #0a8f6c, #0b7a8a, #5b4fc7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SPECAUTH
            </h1>
            <p className="text-lab-muted mt-1 text-sm">Spectral Paint Authenticator</p>
            <button
              onClick={() => setPage('capture')}
              className="mt-1 text-xs px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors"
            >
              📊 Data Capture
            </button>
          </div>
          <ConnectButton
            connected={connected}
            connecting={connecting}
            onConnect={connect}
            onDisconnect={disconnect}
            isSupported={isSupported}
          />
        </header>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* ═══════ SCAN STATUS + AI IDENTIFICATION ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <VerdictCard scan={lastScan} />

          <div className="panel overflow-hidden">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #5b4fc7, #0b7a8a, #0a8f6c)' }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-lab-accent" />
                <span className="lab-label">AI IDENTIFICATION</span>
              </div>
              {aiLoading ? (
                <div className="text-lab-muted text-sm animate-pulse py-4 text-center">
                  Identifying...
                </div>
              ) : aiResult ? (
                <div>
                  <div className="text-base font-bold text-lab-text">{aiResult.paintName}</div>
                  <div className="text-sm text-lab-muted mt-1">Color: {aiResult.commonColor}</div>
                </div>
              ) : (
                <p className="text-sm text-lab-muted py-4 text-center">
                  Scan to identify
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ REGISTER BUTTON ═══════ */}
        <div className="mb-6">
          <motion.button
            onClick={() => setRegisterOpen(true)}
            disabled={!liveSpectrum && !connected}
            className="w-full btn-accent flex items-center justify-center gap-2 py-3 disabled:opacity-40"
            whileHover={{ scale: connected ? 1.01 : 1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} />
            <span className="text-sm tracking-wider font-display">REGISTER NEW PROFILE</span>
          </motion.button>
        </div>

        {/* ═══════ HUNT MODE ═══════ */}
        {huntTarget && (
          <div className="mb-6">
            <HuntMode
              target={huntTarget}
              liveSpectrum={liveSpectrum || lastScan?.spectrum}
              onExit={() => setHuntTarget(null)}
            />
          </div>
        )}

        {/* ═══════ MATCH RESULTS ═══════ */}
        <div className="mb-6">
          <MatchResults
            matches={matches}
            onSelect={setSelectedMatch}
            selectedId={selectedMatch?.id}
          />
        </div>

        {/* ═══════ COMPARE VIEW ═══════ */}
        {selectedMatch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <SpectrumChart
              spectrum={liveSpectrum || lastScan?.spectrum}
              title="LIVE SPECTRUM"
              accent={liveSpectrum ? 'streaming' : 'frozen'}
            />
            <DeltaChart
              live={liveSpectrum || lastScan?.spectrum}
              reference={parseSpectrum(selectedMatch.spectrum)}
              referenceName={selectedMatch.name}
            />
            <div className="col-span-1 md:col-span-2 panel p-5 border-t-4" style={{ borderTopColor: '#0b7a8a' }}>
              <div className="lab-label mb-2">REFERENCE DESCRIPTION</div>
              <div className="text-sm text-lab-text italic leading-relaxed">
                {selectedMatch.description || 'No AI description available for this profile.'}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ PROFILE LIBRARY ═══════ */}
        <div className="mb-6">
          <ProfileGallery 
            refreshKey={refreshKey} 
            connected={connected} 
            onPush={setHuntTarget}
          />
        </div>

        {/* ═══════ SCAN HISTORY ═══════ */}
        <div className="mb-6">
          <ScanHistory />
        </div>

        {/* ═══════ REGISTER MODAL ═══════ */}
        <RegisterModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          liveSpectrum={liveSpectrum || lastScan?.spectrum}
          onRegistered={() => setRefreshKey(k => k + 1)}
        />

        {/* ═══════ FOOTER ═══════ */}
        <footer className="py-4 text-center">
          <div className="h-px w-24 mx-auto mb-4 opacity-30"
               style={{ background: 'linear-gradient(90deg, transparent, #0a8f6c, transparent)' }} />
          <span className="text-lab-muted text-xs">
            status: {connected ? '🟢 connected' : '⚪ offline'}
          </span>
          <span className="mx-3 text-lab-border">·</span>
          <span className="text-lab-muted text-xs">v0.1 · made with spectrum + signal</span>
        </footer>
      </div>
    </div>
  );
}
