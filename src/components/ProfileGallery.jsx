import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Target } from 'lucide-react';
import { listProfiles, deleteProfile } from '../supabase/profiles';
import { CHANNEL_COLORS } from '../lib/wavelengthColor';

const CATEGORY_LABELS = {
  home_paint: 'Home',
  automotive: 'Auto',
  artifact:   'Artifact',
  art:        'Art',
  other:      'Other',
};

export default function ProfileGallery({ refreshKey, connected, onPush }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await listProfiles();
        if (!cancelled) setProfiles(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile?')) return;
    try {
      await deleteProfile(id);
      setProfiles(p => p.filter(x => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === 'all'
    ? profiles
    : profiles.filter(p => p.category === filter);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="lab-label">PROFILE LIBRARY · {profiles.length}</span>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-lab-border rounded-lg px-2 py-1 text-xs focus:border-lab-accent focus:ring-1 focus:ring-lab-accent/20 outline-none transition-colors"
        >
          <option value="all">All</option>
          <option value="home_paint">Home</option>
          <option value="automotive">Automotive</option>
          <option value="artifact">Artifact</option>
          <option value="art">Art</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="lab-muted text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="lab-muted text-sm">
          No profiles yet. Click <span className="text-lab-accent">Register Reference</span> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onDelete={() => handleDelete(profile.id)}
              connected={connected}
              onPush={onPush}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ profile, onDelete, connected, onPush }) {
  // Parse spectrum which may come back as a string like "[0.1,0.2,...]"
  const spectrum = typeof profile.spectrum === 'string'
    ? JSON.parse(profile.spectrum)
    : profile.spectrum;

  return (
    <motion.div
      className="border border-lab-border rounded-xl p-3 hover:border-lab-accent/40 hover:shadow-md transition-all bg-white/60"
      whileHover={{ y: -2 }}
      layout
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lab-text font-bold text-sm truncate">{profile.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lab-accent/10 text-lab-accent uppercase tracking-wider font-semibold">
              {CATEGORY_LABELS[profile.category] || profile.category}
            </span>
          </div>
          <div className="lab-muted text-xs truncate">
            {[profile.brand, profile.color_code].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        <div className="flex gap-1">
          {connected && onPush && (
            <button
              onClick={() => onPush(profile)}
              className="p-1.5 text-lab-muted hover:text-lab-accent"
              title="Hunt for this target"
            >
              <Target size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-lab-muted hover:text-rose-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Mini spectrum */}
      <div className="flex items-end gap-0.5 h-8 mt-3">
        {spectrum.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(4, v * 100)}%`,
              backgroundColor: CHANNEL_COLORS[i],
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      {profile.description && (
        <div className="mt-2 text-[11px] text-lab-muted leading-snug line-clamp-2 italic">
          {profile.description}
        </div>
      )}
    </motion.div>
  );
}
