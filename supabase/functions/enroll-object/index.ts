// Supabase Edge Function: enroll-object
// Extracts structured metadata from a voice transcript using Gemini.
//
// Deploy: supabase functions deploy enroll-object
// Set secret: supabase secrets set GEMINI_API_KEY=AIza...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set. Run: supabase secrets set GEMINI_API_KEY=...');
    }

    const { transcript, spectrum } = await req.json();

    if (!transcript) {
      throw new Error('Missing transcript');
    }

    const prompt = `You are a memory aid assistant for someone with dementia.
A caregiver just enrolled a new object by speaking about it.

Voice transcript:
"${transcript}"

${spectrum ? `Spectral signature (10-channel reflectance): [${spectrum.join(', ')}]` : ''}

From the transcript, extract:
1. NAME — a short, memorable name for this object (3-5 words max)
2. OWNER — the person this belongs to (if mentioned), otherwise "shared"
3. DESCRIPTION — one warm, simple sentence the patient would hear when re-encountering this object. Use kind, reassuring language.
4. CATEGORY — one of: kitchen, bedroom, bathroom, medication, personal, tool, other

Respond ONLY with valid JSON:
{"name": "...", "owner": "...", "description": "...", "category": "..."}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', err);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response from Gemini');

    const parsed = JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('enroll-object error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
