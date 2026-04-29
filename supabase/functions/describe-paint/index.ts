// ═══════════════════════════════════════════════════════════════════
// describe-paint — Supabase Edge Function
//
// Receives: { spectrum, name, category }
// Returns:  { description }
//
// Securely calls Gemini 2.5 Flash with the prompt. The GEMINI_API_KEY
// lives as a Supabase secret and never ships to the browser.
//
// Deploy with:
//   supabase functions deploy describe-paint
//   supabase secrets set GEMINI_API_KEY=your_actual_key
// ═══════════════════════════════════════════════════════════════════

// deno-lint-ignore-file

const CHANNEL_WAVELENGTHS = [
  'F1 (415nm violet)',
  'F2 (445nm indigo)',
  'F3 (480nm blue)',
  'F4 (515nm cyan)',
  'F5 (555nm green)',
  'F6 (590nm yellow)',
  'F7 (630nm orange)',
  'F8 (680nm red)',
  'Clear (broadband)',
  'NIR (~910nm)',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { spectrum, name = '', category = 'other' } = await req.json();

    if (!Array.isArray(spectrum) || spectrum.length !== 10) {
      return jsonResponse({ error: 'spectrum must be a 10-element array' }, 400);
    }

    // Build human-readable spectrum table for the prompt
    const table = spectrum
      .map((v, i) => `  ${CHANNEL_WAVELENGTHS[i].padEnd(22)} = ${v.toFixed(3)}`)
      .join('\n');

    const prompt = `You are a materials science assistant specializing in paint and pigment analysis.

Given a 10-channel spectral reflectance signature (values normalized 0.0-1.0 where 1.0 is maximum reflectance), describe the paint's likely color, pigment composition, and notable spectral characteristics.

Spectrum:
${table}

User-provided name: ${name || '(unnamed)'}
Category: ${category}

Respond with a 2-3 sentence description covering:
  1. Perceived color and saturation
  2. Likely pigment family (e.g., cadmium, iron oxide, phthalocyanine, titanium white)
  3. Any notable spectral characteristics (strong NIR response, deep UV absorption, etc.)

Keep the tone scientific but accessible. Do not speculate beyond what the spectrum supports. Do not use markdown formatting — plain prose only.`;

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500);
    }

    // Call Gemini 2.5 Flash
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 300,
          },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error('Gemini error:', errText);
      return jsonResponse({ error: 'Gemini API call failed', detail: errText }, 502);
    }

    const geminiData = await geminiResp.json();
    const description = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!description) {
      return jsonResponse({ error: 'No description returned from Gemini' }, 502);
    }

    return jsonResponse({ description });
  } catch (err) {
    console.error('Function error:', err);
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
