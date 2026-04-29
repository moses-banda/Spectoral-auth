// ═══════════════════════════════════════════════════════════════════
// profiles.js — CRUD for paint reference profiles
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './client';

/**
 * List all profiles, newest first.
 */
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new profile (from a capture event).
 */
export async function createProfile({
  name,
  brand = null,
  color_code = null,
  category = 'other',
  spectrum,
  description = null,
  notes = null,
  photo_url = null,
}) {
  if (!Array.isArray(spectrum) || spectrum.length !== 10) {
    throw new Error('Spectrum must be a 10-element array');
  }

  // pgvector accepts a string formatted like '[0.1, 0.2, ...]'
  const spectrumLiteral = `[${spectrum.join(',')}]`;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      name,
      brand,
      color_code,
      category,
      spectrum: spectrumLiteral,
      description,
      notes,
      photo_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a profile's metadata.
 */
export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a profile.
 */
export async function deleteProfile(id) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Find top-K matches for a given spectrum using pgvector cosine similarity.
 * Uses an RPC function defined in schema.sql.
 *
 * @param {number[]} spectrum - 10-channel live scan
 * @param {number} limit - how many matches to return (default 5)
 * @returns {Array<{id, name, brand, similarity, ...}>}
 */
export async function findMatches(spectrum, limit = 5) {
  if (!Array.isArray(spectrum) || spectrum.length !== 10) {
    throw new Error('Spectrum must be a 10-element array');
  }

  const { data, error } = await supabase.rpc('match_profiles', {
    query_spectrum: `[${spectrum.join(',')}]`,
    match_limit: limit,
  });

  if (error) throw error;
  return data;
}
