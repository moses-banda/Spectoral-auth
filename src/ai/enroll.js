// ═══════════════════════════════════════════════════════════════════
// enroll.js — AI metadata extraction using OpenAI
//
// Takes a voice transcript and extracts structured object metadata
// for enrollment. Uses OpenAI's GPT model to parse natural speech.
// ═══════════════════════════════════════════════════════════════════

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Extract structured object metadata from a voice transcript.
 *
 * @param {string}   transcript - What the caregiver said
 * @param {number[]} spectrum   - 10-channel spectral data
 * @returns {{ name: string, owner: string, description: string, category: string }}
 */
export async function extractObjectMetadata(transcript, spectrum) {
  // Try OpenAI first, fall back to local parsing
  if (OPENAI_API_KEY) {
    try {
      return await extractViaOpenAI(transcript, spectrum);
    } catch (e) {
      console.warn('[AI] OpenAI call failed, using local fallback:', e.message);
    }
  }

  return parseTranscriptLocally(transcript);
}

/**
 * Use OpenAI to extract structured metadata from natural speech.
 */
async function extractViaOpenAI(transcript, spectrum) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a memory aid assistant for someone with dementia.
A caregiver is enrolling a new object by describing it out loud.
Extract structured metadata from their description.

Respond ONLY with JSON:
{
  "name": "short memorable name, 3-5 words max",
  "owner": "person this belongs to (if mentioned), otherwise 'shared'",
  "description": "one warm, simple sentence the patient will hear when they scan this object later. Use kind, familiar language. Do NOT start with 'I am sure' or confidence phrases. Just describe the object warmly.",
  "category": "one of: kitchen, bedroom, bathroom, medication, personal, tool, other"
}`
        },
        {
          role: 'user',
          content: `Caregiver said: "${transcript}"${spectrum ? `\nSpectral data: [${spectrum.join(', ')}]` : ''}`
        }
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${err}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  return {
    name:        parsed.name || 'Unnamed Object',
    owner:       parsed.owner || 'shared',
    description: parsed.description || '',
    category:    parsed.category || 'other',
  };
}

/**
 * Fallback: extract metadata from transcript using heuristics. No AI needed.
 */
function parseTranscriptLocally(transcript) {
  if (!transcript?.trim()) {
    return { name: 'Unnamed Object', owner: 'shared', description: '', category: 'other' };
  }

  const text = transcript.trim();

  // Owner detection
  let owner = 'shared';
  const possessiveMatch = text.match(/(\w+)(?:'s|s')\s/i);
  if (possessiveMatch) {
    owner = possessiveMatch[1].charAt(0).toUpperCase() + possessiveMatch[1].slice(1);
  }

  // Name extraction
  let name = text;
  const thisIsMatch = text.match(/this is (?:(?:the|a|an|my|our|his|her|their)\s+)?(.+)/i);
  if (thisIsMatch) name = thisIsMatch[1];

  // Truncate to first sentence, max 6 words
  const sentences = name.split(/[.!?]/).filter(s => s.trim());
  if (sentences.length > 1) name = sentences[0].trim();
  const words = name.split(/\s+/);
  if (words.length > 6) name = words.slice(0, 6).join(' ');
  name = name.charAt(0).toUpperCase() + name.slice(1);

  // Category guessing
  const lower = text.toLowerCase();
  let category = 'other';
  if (/kitchen|mug|cup|plate|bowl|kettle|spoon|fork|knife|pot|pan/i.test(lower)) category = 'kitchen';
  else if (/pill|medicine|medication|vitamin|prescription/i.test(lower)) category = 'medication';
  else if (/bedroom|bed|pillow|blanket|lamp/i.test(lower)) category = 'bedroom';
  else if (/bathroom|towel|soap|shampoo|toothbrush/i.test(lower)) category = 'bathroom';
  else if (/key|wallet|phone|glasses|watch|remote/i.test(lower)) category = 'personal';
  else if (/tool|hammer|screwdriver|wrench/i.test(lower)) category = 'tool';

  return { name, owner, description: text, category };
}
