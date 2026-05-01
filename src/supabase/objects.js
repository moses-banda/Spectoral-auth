// ═══════════════════════════════════════════════════════════════════
// objects.js — CRUD + identification for Lumen objects
//
// Replaces the old profiles.js. The profiles table has been renamed
// to objects and extended with owner, location, voice, and stats.
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './client';

/**
 * List all objects, newest first. Optionally filter by owner or category.
 */
export async function listObjects({ owner, category } = {}) {
  let query = supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false });

  if (owner)    query = query.eq('owner', owner);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get a single object by ID.
 */
export async function getObject(id) {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Format a spectrum array as a pgvector literal string.
 */
function toVectorLiteral(spectrum) {
  if (!Array.isArray(spectrum) || spectrum.length !== 10) {
    throw new Error(`Spectrum must be a 10-element array, got ${spectrum?.length}`);
  }
  return `[${spectrum.join(',')}]`;
}

/**
 * Enroll a new object with up to 3 individual scans.
 * The mean spectrum goes into `spectrum`, individual scans into spectrum_a/b/c.
 */
export async function createObject({
  name,
  owner = null,
  description = null,
  category = 'other',
  location = null,
  spectrum,
  spectrum_a = null,
  spectrum_b = null,
  spectrum_c = null,
  voice_transcript = null,
  created_by = null,
  notes = null,
  photo_url = null,
}) {
  const row = {
    name,
    owner,
    description,
    category,
    location,
    spectrum: toVectorLiteral(spectrum),
    voice_transcript,
    created_by,
    notes,
    photo_url,
  };

  // Add individual scans if provided
  if (spectrum_a) row.spectrum_a = toVectorLiteral(spectrum_a);
  if (spectrum_b) row.spectrum_b = toVectorLiteral(spectrum_b);
  if (spectrum_c) row.spectrum_c = toVectorLiteral(spectrum_c);

  const { data, error } = await supabase
    .from('objects')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an object's metadata. Does NOT update spectrum.
 */
export async function updateObject(id, updates) {
  // Don't allow spectrum changes via this function
  const { spectrum, spectrum_a, spectrum_b, spectrum_c, ...safe } = updates;

  const { data, error } = await supabase
    .from('objects')
    .update(safe)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an object.
 */
export async function deleteObject(id) {
  const { error } = await supabase
    .from('objects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Identify an object by spectrum using pgvector kNN search.
 * Returns top-K matches with similarity scores.
 *
 * @param {number[]} spectrum - 10-channel live scan
 * @param {number}   limit    - how many matches (default 5)
 * @returns {Array<{id, name, owner, similarity, ...}>}
 */
export async function identifyObject(spectrum, limit = 5) {
  if (!Array.isArray(spectrum) || spectrum.length !== 10) {
    throw new Error('Spectrum must be a 10-element array');
  }

  const { data, error } = await supabase.rpc('identify_object', {
    query_spectrum: `[${spectrum.join(',')}]`,
    match_limit: limit,
  });

  if (error) throw error;
  return data;
}

/**
 * Determine confidence tier from similarity score.
 * Binary decision: either we're certain (≥99%) or we ask for a rescan.
 * No guessing. No "I think" language.
 */
export function getConfidenceTier(similarity) {
  if (similarity >= 0.99) return { tier: 'certain', label: 'certain', color: 'emerald' };
  return                         { tier: 'rescan',  label: 'rescan',  color: 'slate'   };
}

/**
 * Log an identification event (atomically updates counters).
 */
export async function logIdentification(objectId, objectName, similarity, spectrum) {
  const tier = getConfidenceTier(similarity).tier;

  const { error } = await supabase.rpc('log_identification', {
    p_object_id:   objectId,
    p_object_name: objectName,
    p_similarity:  similarity,
    p_tier:        tier,
    p_spectrum:    `[${spectrum.join(',')}]`,
  });

  if (error) {
    console.error('Failed to log identification:', error);
    // Non-fatal — don't throw
  }
}

/**
 * Get recent identification events for history display.
 */
export async function getIdentificationHistory(limit = 20) {
  const { data, error } = await supabase
    .from('identification_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get aggregate stats for the dashboard.
 */
export async function getObjectStats() {
  const { data: objects, error } = await supabase
    .from('objects')
    .select('id, name, owner, identify_count, last_identified_at, created_at');

  if (error) throw error;

  const totalObjects = objects.length;
  const totalIdentifications = objects.reduce((sum, o) => sum + (o.identify_count || 0), 0);
  const uniqueOwners = [...new Set(objects.map(o => o.owner).filter(Boolean))];
  const mostIdentified = objects.reduce((best, o) =>
    (o.identify_count || 0) > (best?.identify_count || 0) ? o : best
  , null);

  return { totalObjects, totalIdentifications, uniqueOwners, mostIdentified };
}

// ── Legacy compatibility ──────────────────────────────────────────
// These aliases let old code (CapturePage, etc.) still work

export const listProfiles  = listObjects;
export const createProfile = createObject;
export const updateProfile = updateObject;
export const deleteProfile = deleteObject;

export async function findMatches(spectrum, limit = 5) {
  return identifyObject(spectrum, limit);
}
