// ═══════════════════════════════════════════════════════════════════
// scans.js — Log historical scans
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './client';

/**
 * Record a completed scan with its top matches.
 */
export async function logScan({ spectrum, top_matches, notes = null }) {
  const spectrumLiteral = `[${spectrum.join(',')}]`;

  const { data, error } = await supabase
    .from('scans')
    .insert({
      spectrum:    spectrumLiteral,
      top_matches,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch recent scans for history display.
 */
export async function listRecentScans(limit = 20) {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
