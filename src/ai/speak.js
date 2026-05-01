// ═══════════════════════════════════════════════════════════════════
// speak.js — High-quality TTS using OpenAI's text-to-speech API
//
// Produces natural, warm audio that sounds like a real person.
// Way better than the robotic browser speech synthesis.
//
// Falls back to browser speech if no API key is set.
// ═══════════════════════════════════════════════════════════════════

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Cache audio blobs so repeated plays are instant
const audioCache = new Map();

/**
 * Speak text aloud using OpenAI TTS (or browser fallback).
 *
 * @param {string} text   - What to say
 * @param {object} opts
 * @param {string} opts.voice - OpenAI voice: alloy, echo, fable, onyx, nova, shimmer
 * @param {number} opts.speed - 0.25 to 4.0 (default 1.0)
 * @returns {Promise<void>} resolves when audio finishes playing
 */
export async function speak(text, { voice = 'nova', speed = 1.0 } = {}) {
  if (!text) return;

  // Try OpenAI TTS
  if (OPENAI_API_KEY) {
    try {
      await speakWithOpenAI(text, voice, speed);
      return;
    } catch (e) {
      console.warn('[TTS] OpenAI failed, falling back to browser:', e.message);
    }
  }

  // Browser fallback
  speakWithBrowser(text);
}

/**
 * OpenAI TTS — natural, warm voice
 */
async function speakWithOpenAI(text, voice, speed) {
  // Check cache first
  const cacheKey = `${voice}:${speed}:${text}`;
  let audioBlob = audioCache.get(cacheKey);

  if (!audioBlob) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    audioBlob = await response.blob();
    audioCache.set(cacheKey, audioBlob);
  }

  // Play it
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);

  return new Promise((resolve, reject) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    audio.play();
  });
}

/**
 * Browser fallback — works offline, sounds robotic
 */
function speakWithBrowser(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  // Try to pick a decent English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any currently playing audio
 */
export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
