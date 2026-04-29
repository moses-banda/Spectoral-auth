import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { createProfile } from '../supabase/profiles';
import { describePaint } from '../ai/describe';

const CATEGORIES = [
  { value: 'home_paint', label: 'Home Paint' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'artifact',   label: 'Artifact / Museum' },
  { value: 'art',        label: 'Artist Paint' },
  { value: 'other',      label: 'Other' },
];

export default function RegisterModal({ open, onClose, liveSpectrum, onRegistered }) {
  const [name, setName]         = useState('');
  const [category, setCategory] = useState('home_paint');

  // Async states
  const [step, setStep]           = useState('idle');   // idle | saving | done
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!open) {
      setName(''); setCategory('home_paint');
      setStep('idle'); setError(null);
    }
  }, [open]);

  const canSave = name.trim() && liveSpectrum;

  // One-click: capture + AI identify + save in one step
  const handleSave = async () => {
    if (!liveSpectrum) {
      setError('No spectrum — is device connected?');
      return;
    }

    const capturedSpectrum = [...liveSpectrum];
    setError(null);

    try {
      setStep('saving');

      // Get AI identification (now returns structured { paintName, commonColor })
      let description = '';
      try {
        const ai = await describePaint({
          spectrum: capturedSpectrum,
          name,
          category,
        });
        description = `${ai.paintName} — ${ai.commonColor}`;
      } catch (e) {
        console.warn('AI describe failed, saving without:', e);
        description = '';
      }

      // Save to Supabase
      const profile = await createProfile({
        name:        name.trim(),
        brand:       null,
        color_code:  null,
        category,
        spectrum:    capturedSpectrum,
        description,
        notes:       null,
      });

      setStep('done');
      onRegistered?.(profile);
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Save failed');
      setStep('idle');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="panel max-w-md w-full p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="lab-label">REGISTER PROFILE</span>
              <button onClick={onClose} className="text-lab-muted hover:text-lab-text">
                <X size={20} />
              </button>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="lab-muted">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hale Navy"
                autoFocus
                className="w-full mt-1 bg-white border border-lab-border rounded-lg px-3 py-2 text-sm focus:border-lab-accent focus:ring-1 focus:ring-lab-accent/20 outline-none transition-colors"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="lab-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 bg-white border border-lab-border rounded-lg px-3 py-2 text-sm focus:border-lab-accent focus:ring-1 focus:ring-lab-accent/20 outline-none transition-colors"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 p-2 rounded bg-rose-50 border border-rose-300 text-rose-700 text-sm">
                {error}
              </div>
            )}

            {/* Action */}
            <div className="flex gap-3 justify-end">
              {step === 'done' ? (
                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                  <CheckCircle2 size={18} /> Saved!
                </div>
              ) : (
                <>
                  <button onClick={onClose} className="px-4 py-2 text-sm text-lab-muted">
                    Cancel
                  </button>
                  <button
                    disabled={!canSave || step === 'saving'}
                    onClick={handleSave}
                    className="px-5 py-2 btn-accent rounded-lg font-bold text-sm disabled:opacity-40 flex items-center gap-2"
                  >
                    {step === 'saving' && <Loader2 size={14} className="animate-spin" />}
                    {step === 'saving' ? 'Saving…' : 'Capture & Save'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
