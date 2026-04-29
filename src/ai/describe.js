// ═══════════════════════════════════════════════════════════════════
// describe.js — AI paint color identification via OpenAI (ChatGPT)
//
// Pre-analyzes the spectrum to find dominant wavelengths, then
// gives ChatGPT structured context so it doesn't guess blindly.
// ═══════════════════════════════════════════════════════════════════

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Channel metadata — wavelength + human-readable color region
const CHANNELS = [
  { idx: 0, nm: 415, region: 'violet' },
  { idx: 1, nm: 445, region: 'indigo/deep blue' },
  { idx: 2, nm: 480, region: 'blue' },
  { idx: 3, nm: 515, region: 'cyan/teal' },
  { idx: 4, nm: 555, region: 'green' },
  { idx: 5, nm: 590, region: 'yellow' },
  { idx: 6, nm: 630, region: 'orange' },
  { idx: 7, nm: 680, region: 'red' },
  // Channels 8 (Clear) and 9 (NIR) are broadband — not color-specific
];

/**
 * Analyze the spectrum to determine dominant color characteristics.
 * This runs locally — no AI needed — and gives ChatGPT real context.
 */
function analyzeSpectrum(spectrum) {
  // Only use the 8 color channels (F1–F8), not Clear/NIR
  const colorChannels = spectrum.slice(0, 8);
  const max = Math.max(...colorChannels);
  const min = Math.min(...colorChannels);

  if (max === 0) return { dominant: 'unknown', analysis: 'All channels near zero — no signal.' };

  // Normalize to 0–1 relative to the max channel
  const norm = colorChannels.map(v => v / max);

  // Find the top 3 strongest channels
  const ranked = CHANNELS
    .map(ch => ({ ...ch, value: norm[ch.idx], raw: spectrum[ch.idx] }))
    .sort((a, b) => b.value - a.value);

  const top3 = ranked.slice(0, 3);
  const bottom3 = ranked.slice(-3);

  // Determine warmth: compare warm (590–680nm) vs cool (415–515nm)
  const warmEnergy = (norm[5] + norm[6] + norm[7]) / 3;  // yellow + orange + red
  const coolEnergy = (norm[0] + norm[1] + norm[2]) / 3;  // violet + indigo + blue
  const midEnergy  = (norm[3] + norm[4]) / 2;             // cyan + green

  let temperatureHint;
  if (warmEnergy > coolEnergy * 1.3) temperatureHint = 'warm-toned (dominant red/orange/yellow)';
  else if (coolEnergy > warmEnergy * 1.3) temperatureHint = 'cool-toned (dominant blue/violet)';
  else if (midEnergy > warmEnergy && midEnergy > coolEnergy) temperatureHint = 'mid-toned (dominant green/cyan)';
  else temperatureHint = 'neutral/balanced across spectrum';

  // Check if it's a "flat white" (all channels roughly equal)
  const range = max - min;
  const isFlat = (range / max) < 0.15;

  const analysis = isFlat
    ? `Flat/white spectrum — all channels roughly equal. ${temperatureHint}.`
    : `Strongest: ${top3.map(c => `${c.region} (${c.nm}nm: ${(c.value * 100).toFixed(0)}%)`).join(', ')}. ` +
      `Weakest: ${bottom3.map(c => `${c.region} (${c.nm}nm: ${(c.value * 100).toFixed(0)}%)`).join(', ')}. ` +
      `Overall: ${temperatureHint}.`;

  return {
    dominant: top3[0].region,
    analysis,
  };
}

/**
 * Ask ChatGPT to identify a paint color, given pre-analyzed spectral context.
 *
 * @param {Object} opts
 * @param {number[]} opts.spectrum - 10-channel normalized spectrum
 * @param {string}   opts.name     - user-provided name
 * @param {string}   opts.category - category
 * @returns {Promise<{paintName: string, commonColor: string}>}
 */
export async function describePaint({ spectrum, name = '', category = 'other' }) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env.local');
  }

  // Pre-analyze the spectrum locally so we give the AI real context
  const { analysis } = analyzeSpectrum(spectrum);

  const spectrumValues = spectrum.slice(0, 8)
    .map((v, i) => `${CHANNELS[i].region}(${CHANNELS[i].nm}nm)=${v.toFixed(4)}`)
    .join(', ');

  const prompt = `Identify this paint color from AS7341 spectral sensor data.

Category: ${category}
${name ? `User label: ${name}` : ''}

Spectral analysis (pre-computed): ${analysis}
Raw values: ${spectrumValues}
Clear=${spectrum[8]?.toFixed(4)}, NIR=${spectrum[9]?.toFixed(4)}

IMPORTANT: The spectral analysis above tells you the ACTUAL dominant wavelengths. Use it to determine the color. Do NOT default to blue.

Respond with ONLY valid JSON:
{"paintName": "Brand Color Name Code", "commonColor": "simple everyday color name like red, warm brown, sage green, cream, etc"}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a paint color analyst. You MUST use the spectral analysis provided to determine the color. Respond with ONLY JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[AI] OpenAI API error:', err);
    throw new Error(`OpenAI API failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) throw new Error('No response from OpenAI');

  try {
    const parsed = JSON.parse(text);
    return {
      paintName: parsed.paintName || 'Unknown',
      commonColor: parsed.commonColor || 'unknown',
    };
  } catch {
    return {
      paintName: text.slice(0, 60),
      commonColor: 'unknown',
    };
  }
}
