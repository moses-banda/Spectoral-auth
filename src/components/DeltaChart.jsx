import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { spectralDelta } from '../lib/cosineSimilarity';
import { CHANNEL_COLORS } from '../lib/wavelengthColor';

/**
 * The hero comparison visualization — shows where the live scan
 * DIFFERS from the reference, per channel.
 *
 * Positive bar → live has MORE reflectance at that wavelength
 * Negative bar → reference has MORE reflectance at that wavelength
 * Zero → perfect match at that channel
 */
export default function DeltaChart({ live, reference, referenceName }) {
  if (!live || !reference) {
    return (
      <div className="panel p-5">
        <div className="lab-label mb-2">SPECTRAL DELTA</div>
        <div className="lab-muted text-sm">
          Select a match to see where it differs from the live scan.
        </div>
      </div>
    );
  }

  const delta = spectralDelta(live, reference);
  const data  = delta.map((v, i) => ({
    channel: ['F1','F2','F3','F4','F5','F6','F7','F8','Clear','NIR'][i],
    delta:   v,
    abs:     Math.abs(v),
    fill:    CHANNEL_COLORS[i],
  }));

  const maxAbs = Math.max(...data.map(d => d.abs), 0.1);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-label">SPECTRAL DELTA</span>
        {referenceName && (
          <span className="lab-muted text-xs">vs {referenceName}</span>
        )}
      </div>

      <div className="text-xs text-lab-muted mb-2">
        <span className="text-emerald-400">▲</span> live more reflective &nbsp;·&nbsp;
        <span className="text-rose-400">▼</span> reference more reflective
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <XAxis
              dataKey="channel"
              stroke="#6b7a8d"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6b7a8d' }}
              axisLine={{ stroke: '#dce1e8' }}
            />
            <YAxis
              stroke="#6b7a8d"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#6b7a8d' }}
              domain={[-maxAbs * 1.1, maxAbs * 1.1]}
              axisLine={{ stroke: '#dce1e8' }}
            />
            <ReferenceLine y={0} stroke="#0a8f6c" strokeOpacity={0.4} strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #dce1e8',
                borderRadius: 8,
                fontFamily: 'JetBrains Mono',
                fontSize: 12,
                color: '#1a2332',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(val) => [val.toFixed(4), 'Δ']}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="delta" radius={[2, 2, 2, 2]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.delta >= 0 ? entry.fill : `${entry.fill}88`}
                  opacity={entry.delta >= 0 ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stat */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Max Δ"
              value={maxAbs.toFixed(3)} />
        <Stat label="Total Δ"
              value={delta.reduce((s, v) => s + Math.abs(v), 0).toFixed(3)} />
        <Stat label="Biggest Δ channel"
              value={['F1','F2','F3','F4','F5','F6','F7','F8','Clear','NIR'][
                delta.indexOf(delta.reduce((a, b) => Math.abs(a) > Math.abs(b) ? a : b))
              ]} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg p-2 bg-lab-accent/5 border border-lab-accent/10">
      <div className="lab-muted text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-lab-accent font-mono font-bold mt-0.5">{value}</div>
    </div>
  );
}
