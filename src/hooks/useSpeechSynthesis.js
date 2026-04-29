// ═══════════════════════════════════════════════════════════════════
// useSpeechSynthesis — Voice output via Web Speech API
//
// Zero dependencies, zero install. Works in all modern browsers.
// Speaks text aloud with configurable voice and rate.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechSynthesis() {
  const [voices, setVoices]             = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [rate, setRate]                 = useState(0.9);  // Slightly slow for dementia accessibility
  const utteranceRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices (async in some browsers)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Default to a good English voice
        const preferred = available.find(v =>
          v.lang.startsWith('en') && v.name.includes('Google')
        ) || available.find(v =>
          v.lang.startsWith('en')
        ) || available[0];
        setSelectedVoice(prev => prev || preferred);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [isSupported]);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, selectedVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
  };
}
