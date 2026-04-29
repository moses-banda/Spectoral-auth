// ═══════════════════════════════════════════════════════════════════
// EnrollPage — 3-step object enrollment wizard
// Step 1: Speak about the object (voice input)
// Step 2: Scan the object 3 times (BLE)
// Step 3: Review AI-extracted metadata, edit, save
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, ChevronLeft, Check, Loader2,
  RotateCcw, ScanLine, CheckCircle2, Pencil,
} from 'lucide-react';

import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { extractObjectMetadata } from '../ai/enroll';
import { createObject } from '../supabase/objects';
import { CHANNEL_COLORS } from '../lib/wavelengthColor';

const CATEGORIES = [
  { value: 'kitchen',    label: '🍽️ Kitchen' },
  { value: 'bedroom',    label: '🛏️ Bedroom' },
  { value: 'bathroom',   label: '🚿 Bathroom' },
  { value: 'medication', label: '💊 Medication' },
  { value: 'personal',   label: '👓 Personal' },
  { value: 'tool',       label: '🔧 Tool' },
  { value: 'other',      label: '📦 Other' },
];

export default function EnrollPage({ connected, lastScan, liveSpectrum }) {
  const navigate = useNavigate();
  const speech = useSpeechRecognition();

  const [step, setStep] = useState(1);  // 1=speak, 2=scan, 3=review

  // Step 2: collected scans
  const [scans, setScans] = useState([]);
  const lastScanRef = useRef(null);

  // Step 3: metadata
  const [meta, setMeta] = useState({ name: '', owner: '', description: '', category: 'other', location: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Collect scans in step 2
  useEffect(() => {
    if (step !== 2 || !lastScan || scans.length >= 3) return;
    if (lastScanRef.current === lastScan.timestamp) return;
    lastScanRef.current = lastScan.timestamp;

    setScans(prev => [...prev, lastScan.spectrum]);
  }, [lastScan, step, scans.length]);

  // Auto-advance to step 3 when 3 scans collected
  useEffect(() => {
    if (scans.length >= 3 && step === 2) {
      handleAdvanceToReview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scans.length, step]);

  const handleAdvanceToReview = async () => {
    setStep(3);
    setAiLoading(true);

    // Average the spectra
    const avg = averageSpectra(scans);

    try {
      const extracted = await extractObjectMetadata(speech.transcript, avg);
      setMeta(prev => ({
        ...prev,
        name: extracted.name || prev.name,
        owner: extracted.owner || prev.owner,
        description: extracted.description || prev.description,
        category: extracted.category || prev.category,
      }));
    } catch (e) {
      console.warn('AI extraction failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!meta.name.trim()) { setError('Name is required'); return; }
    setError(null);
    setSaving(true);

    try {
      const avg = averageSpectra(scans);
      await createObject({
        name:             meta.name.trim(),
        owner:            meta.owner || null,
        description:      meta.description || null,
        category:         meta.category,
        location:         meta.location || null,
        spectrum:         avg,
        spectrum_a:       scans[0] || null,
        spectrum_b:       scans[1] || null,
        spectrum_c:       scans[2] || null,
        voice_transcript: speech.transcript || null,
      });

      setSaved(true);
      setTimeout(() => navigate('/library'), 1500);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Back */}
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-lab-muted hover:text-lab-text mb-6">
          <ChevronLeft size={16} /> Back
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-lab-text mb-1">Enroll Object</h1>
        <p className="text-sm text-lab-muted mb-6">Teach Lumen about a new object in 3 steps</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s ? 'bg-emerald-500 text-white' :
                step === s ? 'bg-lumen-teal text-white' :
                'bg-lab-elevated text-lab-muted'
              }`}>
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-emerald-400' : 'bg-lab-border'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: SPEAK ═══ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="panel p-6 text-center">
                <div className="text-lg font-bold text-lab-text mb-2">Tell me about this object</div>
                <p className="text-sm text-lab-muted mb-6">
                  Tap the microphone and describe the object. Say who it belongs to and what it is.
                </p>

                {/* Mic button */}
                <motion.button
                  onClick={speech.isListening ? speech.stop : speech.start}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
                    speech.isListening
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                      : 'bg-lumen-teal text-white shadow-lg shadow-teal-200 hover:shadow-xl'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={speech.isListening ? { scale: [1, 1.05, 1] } : {}}
                  transition={speech.isListening ? { duration: 1, repeat: Infinity } : {}}
                >
                  {speech.isListening ? <MicOff size={36} /> : <Mic size={36} />}
                </motion.button>

                {speech.isListening && (
                  <div className="flex items-center justify-center gap-2 text-sm text-rose-500 mb-4">
                    <motion.div className="w-2 h-2 rounded-full bg-rose-500" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    Listening...
                  </div>
                )}

                {/* Transcript */}
                {speech.transcript && (
                  <div className="bg-lab-elevated rounded-xl p-4 text-left mb-4">
                    <div className="text-xs text-lab-muted mb-1 uppercase tracking-wider">What I heard:</div>
                    <div className="text-sm text-lab-text leading-relaxed">"{speech.transcript}"</div>
                  </div>
                )}

                {speech.error && (
                  <div className="text-xs text-rose-500 mb-4">{speech.error}</div>
                )}

                <div className="flex gap-3 justify-end">
                  {speech.transcript && (
                    <button onClick={speech.reset} className="text-sm text-lab-muted hover:text-lab-text flex items-center gap-1">
                      <RotateCcw size={14} /> Re-record
                    </button>
                  )}
                  <button
                    onClick={() => { speech.stop(); setStep(2); }}
                    disabled={!speech.transcript}
                    className="btn-accent text-sm disabled:opacity-40"
                  >
                    Next: Scan Object →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: SCAN ═══ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="panel p-6 text-center">
                <div className="text-lg font-bold text-lab-text mb-2">Scan the object</div>
                <p className="text-sm text-lab-muted mb-6">
                  Hold the device near the object and press the scan button 3 times.
                  {!connected && <span className="text-rose-500 block mt-1">⚠ Device not connected</span>}
                </p>

                {/* Scan slots */}
                <div className="flex justify-center gap-4 mb-6">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-all ${
                        scans[i]
                          ? 'border-emerald-400 bg-emerald-50'
                          : i === scans.length
                            ? 'border-lumen-teal border-dashed bg-lumen-teal/5'
                            : 'border-lab-border bg-lab-elevated'
                      }`}
                      animate={i === scans.length ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {scans[i] ? (
                        <CheckCircle2 size={24} className="text-emerald-500" />
                      ) : i === scans.length ? (
                        <ScanLine size={24} className="text-lumen-teal animate-pulse" />
                      ) : (
                        <span className="text-lab-muted text-sm">{i + 1}</span>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="text-sm text-lab-muted">{scans.length}/3 scans captured</div>

                {/* Mini spectrum preview of last scan */}
                {scans.length > 0 && (
                  <div className="flex items-end gap-0.5 h-8 mt-4 mx-auto max-w-xs">
                    {scans[scans.length - 1].map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{
                        height: `${Math.max(8, v * 100)}%`,
                        backgroundColor: CHANNEL_COLORS[i],
                        opacity: 0.85,
                      }} />
                    ))}
                  </div>
                )}

                <div className="flex gap-3 justify-between mt-6">
                  <button onClick={() => { setStep(1); setScans([]); }} className="text-sm text-lab-muted hover:text-lab-text">← Back</button>
                  {scans.length > 0 && (
                    <button onClick={() => setScans([])} className="text-sm text-lab-muted hover:text-lab-text flex items-center gap-1">
                      <RotateCcw size={14} /> Reset scans
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: REVIEW ═══ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="panel p-6">
                {saved ? (
                  <div className="text-center py-8">
                    <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                    <div className="text-lg font-bold text-emerald-600">Object Saved!</div>
                    <div className="text-sm text-lab-muted mt-1">Redirecting to library…</div>
                  </div>
                ) : aiLoading ? (
                  <div className="text-center py-8">
                    <Loader2 size={32} className="animate-spin text-lumen-teal mx-auto mb-3" />
                    <div className="text-sm text-lab-muted">AI is analyzing your description…</div>
                  </div>
                ) : (
                  <>
                    <div className="text-lg font-bold text-lab-text mb-4 flex items-center gap-2">
                      <Pencil size={16} /> Review & Save
                    </div>

                    {/* Transcript preview */}
                    {speech.transcript && (
                      <div className="bg-lab-elevated rounded-lg p-3 mb-4 text-xs text-lab-muted italic">
                        "{speech.transcript}"
                      </div>
                    )}

                    {/* Editable fields */}
                    <div className="space-y-3">
                      <Field label="Name *" value={meta.name} onChange={v => setMeta(m => ({ ...m, name: v }))} placeholder="e.g. Grandpa's blue mug" />
                      <Field label="Owner" value={meta.owner} onChange={v => setMeta(m => ({ ...m, owner: v }))} placeholder="e.g. Grandpa" />
                      <Field label="Description" value={meta.description} onChange={v => setMeta(m => ({ ...m, description: v }))} placeholder="A warm sentence the patient will hear" multiline />
                      <Field label="Location" value={meta.location} onChange={v => setMeta(m => ({ ...m, location: v }))} placeholder="e.g. kitchen counter" />

                      <div>
                        <label className="text-xs text-lab-muted block mb-1">Category</label>
                        <select value={meta.category} onChange={e => setMeta(m => ({ ...m, category: e.target.value }))}
                          className="w-full bg-white border border-lab-border rounded-lg px-3 py-2 text-sm focus:border-lumen-teal outline-none">
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {error && <div className="mt-3 p-2 rounded bg-rose-50 border border-rose-300 text-rose-700 text-sm">{error}</div>}

                    <div className="flex gap-3 justify-end mt-6">
                      <button onClick={() => setStep(2)} className="text-sm text-lab-muted">← Back</button>
                      <button onClick={handleSave} disabled={saving || !meta.name.trim()}
                        className="btn-accent text-sm flex items-center gap-2 disabled:opacity-40">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {saving ? 'Saving…' : 'Save Object'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }) {
  const cls = "w-full bg-white border border-lab-border rounded-lg px-3 py-2 text-sm focus:border-lumen-teal outline-none transition-colors";
  return (
    <div>
      <label className="text-xs text-lab-muted block mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function averageSpectra(scans) {
  if (scans.length === 0) return new Array(10).fill(0);
  const avg = new Array(10).fill(0);
  for (const s of scans) {
    for (let i = 0; i < 10; i++) avg[i] += s[i];
  }
  return avg.map(v => v / scans.length);
}
