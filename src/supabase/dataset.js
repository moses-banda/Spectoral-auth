// ═══════════════════════════════════════════════════════════════════
// dataset.js — CRUD for the dataset_scans table (CNN training data)
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './client';

/**
 * Insert a single labeled scan.
 * @param {Object} opts
 * @param {string} opts.label       - Class label (e.g. "skin", "leaf_living")
 * @param {number[]} opts.spectrum  - 10-channel float array
 * @param {string|null} opts.session_id - Groups scans from one capture session
 * @param {string|null} opts.sample_id  - Physical sample ID (prevents class leakage)
 * @param {string|null} opts.notes
 */
export async function saveDatasetScan({
  label,
  spectrum,
  session_id = null,
  sample_id = null,
  notes = null,
}) {
  const { data, error } = await supabase
    .from('dataset_scans')
    .insert({
      label,
      spectrum: `[${spectrum.join(',')}]`,
      session_id,
      sample_id,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get count per class — uses the dataset_class_counts() RPC.
 * @returns {Array<{label: string, count: number}>}
 */
export async function getClassCounts() {
  const { data, error } = await supabase.rpc('dataset_class_counts');
  if (error) throw error;
  return data;
}

/**
 * Pull the entire dataset as JSON (used by training notebook).
 * @returns {Array<Object>}
 */
export async function exportDataset() {
  const { data, error } = await supabase
    .from('dataset_scans')
    .select('id, label, spectrum, session_id, sample_id, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Parse spectra from pgvector strings to arrays
  return data.map(row => ({
    ...row,
    spectrum: typeof row.spectrum === 'string'
      ? JSON.parse(row.spectrum)
      : row.spectrum,
  }));
}

/**
 * Delete a single scan (in case of mis-labeling).
 * @param {string} id - UUID of the scan to delete
 */
export async function deleteDatasetScan(id) {
  const { error } = await supabase
    .from('dataset_scans')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete all scans of a given session (e.g., redoing a session).
 * @param {string} session_id
 */
export async function deleteSession(session_id) {
  const { error } = await supabase
    .from('dataset_scans')
    .delete()
    .eq('session_id', session_id);

  if (error) throw error;
}

/**
 * Delete all scans for a given class label (reset a class).
 * @param {string} label
 */
export async function deleteClassScans(label) {
  const { error } = await supabase
    .from('dataset_scans')
    .delete()
    .eq('label', label);

  if (error) throw error;
}
