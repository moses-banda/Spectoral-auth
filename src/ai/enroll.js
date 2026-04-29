// ═══════════════════════════════════════════════════════════════════
// enroll.js — AI metadata extraction for object enrollment
//
// Calls a Supabase Edge Function that uses Gemini to extract
// structured metadata from a voice transcript + spectral data.
//
// If no Edge Function is deployed, falls back to local parsing.
// ═══════════════════════════════════════════════════════════════════

import { supabase } from '../supabase/client';

/**
 * Extract structured object metadata from a voice transcript.
 *
 * Tries: Supabase Edge Function → local fallback
 *
 * @param {string}   transcript - What the caregiver said
 * @param {number[]} spectrum   - 10-channel spectral data
 * @returns {{ name: string, owner: string, description: string, category: string }}
 */
export async function extractObjectMetadata(transcript, spectrum) {
  // Try Edge Function first (keeps API key server-side)
  try {
    const { data, error } = await supabase.functions.invoke('enroll-object', {
      body: { transcript, spectrum },
    });

    if (!error && data?.name) {
      return {
        name:        data.name,
        owner:       data.owner || 'shared',
        description: data.description || '',
        category:    data.category || 'other',
      };
    }
  } catch (e) {
    console.warn('[AI] Edge function unavailable, using local fallback:', e.message);
  }

  // ── Local fallback — simple transcript parsing ────────────────
  return parseTranscriptLocally(transcript);
}

/**
 * Fallback: extract name, owner, and description from the transcript
 * using basic heuristics. No AI needed.
 */
function parseTranscriptLocally(transcript) {
  if (!transcript || !transcript.trim()) {
    return { name: 'Unnamed Object', owner: 'shared', description: '', category: 'other' };
  }

  const text = transcript.trim();

  // Try to find owner patterns like "grandpa's", "Mom's", "Sarah's"
  let owner = 'shared';
  const possessiveMatch = text.match(/(\w+(?:'s|s'))\s/i);
  if (possessiveMatch) {
    owner = possessiveMatch[1].replace(/'s$/i, '').replace(/s'$/i, '');
    // Capitalize first letter
    owner = owner.charAt(0).toUpperCase() + owner.slice(1);
  }

  // Try to extract "this is [NAME]" or just use the whole thing as name
  let name = text;
  const thisIsMatch = text.match(/this is (?:(?:the|a|an|my|our|his|her|their)\s+)?(.+)/i);
  if (thisIsMatch) {
    name = thisIsMatch[1];
  }

  // Clean up: take first sentence for the name, rest is description
  const sentences = name.split(/[.!?]/).filter(s => s.trim());
  if (sentences.length > 1) {
    name = sentences[0].trim();
  }

  // Truncate name to something reasonable (3-6 words)
  const words = name.split(/\s+/);
  if (words.length > 6) {
    name = words.slice(0, 6).join(' ');
  }

  // Capitalize the name
  name = name.charAt(0).toUpperCase() + name.slice(1);

  // Category guessing from keywords
  const lower = text.toLowerCase();
  let category = 'other';
  if (/kitchen|mug|cup|plate|bowl|kettle|spoon|fork|knife|pot|pan/i.test(lower)) category = 'kitchen';
  else if (/pill|medicine|medication|vitamin|prescription/i.test(lower)) category = 'medication';
  else if (/bedroom|bed|pillow|blanket|lamp/i.test(lower)) category = 'bedroom';
  else if (/bathroom|towel|soap|shampoo|toothbrush/i.test(lower)) category = 'bathroom';
  else if (/key|wallet|phone|glasses|watch|remote/i.test(lower)) category = 'personal';
  else if (/tool|hammer|screwdriver|wrench/i.test(lower)) category = 'tool';

  return {
    name,
    owner,
    description: text,
    category,
  };
}
