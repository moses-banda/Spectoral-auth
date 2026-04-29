// ═══════════════════════════════════════════════════════════════════
// LibraryPage — Caregiver's object management view
// Browse, search, edit, and delete enrolled objects
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Search, Trash2, Pencil, X,
  Check, Loader2, ScanLine, Clock,
} from 'lucide-react';

import { listObjects, updateObject, deleteObject } from '../supabase/objects';
import { CHANNEL_COLORS } from '../lib/wavelengthColor';

const CATEGORIES = [
  { value: 'all',        label: 'All' },
  { value: 'kitchen',    label: '🍽️ Kitchen' },
  { value: 'bedroom',    label: '🛏️ Bedroom' },
  { value: 'bathroom',   label: '🚿 Bathroom' },
  { value: 'medication', label: '💊 Medication' },
  { value: 'personal',   label: '👓 Personal' },
  { value: 'tool',       label: '🔧 Tool' },
  { value: 'other',      label: '📦 Other' },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const [objects, setObjects]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    setLoading(true);
    try {
      const rows = await listObjects();
      setObjects(rows);
    } catch (e) {
      console.error('Failed to load objects:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this object? This cannot be undone.')) return;
    try {
      await deleteObject(id);
      setObjects(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateObject(id, updates);
      setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
      setEditingId(null);
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  // Filter
  const filtered = objects.filter(o => {
    if (catFilter !== 'all' && o.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.name?.toLowerCase().includes(q) ||
        o.owner?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-lab-muted hover:text-lab-text mb-6">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-lab-text">Object Library</h1>
            <p className="text-sm text-lab-muted">{objects.length} objects enrolled</p>
          </div>
          <button onClick={() => navigate('/enroll')} className="btn-accent text-sm">+ Enroll</button>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lab-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search objects..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-lab-border rounded-lg text-sm focus:border-lumen-teal outline-none"
            />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="bg-white border border-lab-border rounded-lg px-3 py-2 text-sm focus:border-lumen-teal outline-none">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Object list */}
        {loading ? (
          <div className="text-center py-12 text-lab-muted"><Loader2 size={24} className="animate-spin mx-auto mb-2" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 panel p-8">
            <div className="text-lab-muted text-sm">
              {objects.length === 0 ? 'No objects enrolled yet.' : 'No objects match your search.'}
            </div>
            {objects.length === 0 && (
              <button onClick={() => navigate('/enroll')} className="btn-accent text-sm mt-4">Enroll Your First Object</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(obj => (
                <ObjectCard
                  key={obj.id}
                  obj={obj}
                  isEditing={editingId === obj.id}
                  onEdit={() => setEditingId(obj.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(updates) => handleUpdate(obj.id, updates)}
                  onDelete={() => handleDelete(obj.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectCard({ obj, isEditing, onEdit, onCancelEdit, onSave, onDelete }) {
  const [editName, setEditName] = useState(obj.name);
  const [editOwner, setEditOwner] = useState(obj.owner || '');
  const [editDesc, setEditDesc] = useState(obj.description || '');

  const spectrum = typeof obj.spectrum === 'string' ? JSON.parse(obj.spectrum) : (obj.spectrum || []);

  if (isEditing) {
    return (
      <motion.div className="panel p-4" layout>
        <div className="space-y-2 mb-3">
          <input value={editName} onChange={e => setEditName(e.target.value)}
            className="w-full bg-white border border-lab-border rounded-lg px-3 py-1.5 text-sm font-bold" />
          <input value={editOwner} onChange={e => setEditOwner(e.target.value)} placeholder="Owner"
            className="w-full bg-white border border-lab-border rounded-lg px-3 py-1.5 text-sm" />
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2}
            className="w-full bg-white border border-lab-border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancelEdit} className="text-sm text-lab-muted"><X size={14} /></button>
          <button onClick={() => onSave({ name: editName, owner: editOwner || null, description: editDesc || null })}
            className="text-sm text-emerald-600 font-bold flex items-center gap-1"><Check size={14} /> Save</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="panel p-4 hover:border-lumen-teal/30 transition-all" layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-lab-text truncate">{obj.name}</span>
            {obj.category && obj.category !== 'other' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lumen-teal/10 text-lumen-teal uppercase tracking-wider font-semibold">
                {obj.category}
              </span>
            )}
          </div>
          {obj.owner && <div className="text-xs text-lab-muted">Owner: {obj.owner}</div>}
          {obj.description && <div className="text-xs text-lab-muted mt-1 italic line-clamp-2">{obj.description}</div>}

          <div className="flex items-center gap-3 mt-2 text-[10px] text-lab-muted">
            {obj.identify_count > 0 && (
              <span className="flex items-center gap-1"><ScanLine size={10} /> {obj.identify_count}×</span>
            )}
            {obj.last_identified_at && (
              <span className="flex items-center gap-1"><Clock size={10} /> {new Date(obj.last_identified_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 text-lab-muted hover:text-lumen-teal" title="Edit"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1.5 text-lab-muted hover:text-rose-500" title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Mini spectrum */}
      {spectrum.length > 0 && (
        <div className="flex items-end gap-0.5 h-6 mt-3">
          {spectrum.map((v, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{
              height: `${Math.max(4, v * 100)}%`,
              backgroundColor: CHANNEL_COLORS[i],
              opacity: 0.8,
            }} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
