import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { CHANNEL_COLORS } from '../lib/wavelengthColor';
import { CHANNEL_LABELS } from '../ble/protocol';

/**
 * Live 10-channel spectral bar chart.
 * Each bar is rendered in its true wavelength color.
 */
export default function SpectrumChart({ spectrum, title = 'LIVE SPECTRUM', accent = null }) {
  // Convert to recharts-friendly data
  const data = (spectrum || new Array(10).fill(0)).map((value, i) => ({
    channel: ['F1','F2','F3','F4','F5','F6','F7','F8','Clear','NIR'][i],
    value:   Math.max(0, value),
    fill:    CHANNEL_COLORS[i],
    label:   CHANNEL_LABELS[i],
  }));

  return (
    <div className="panel p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="lab-label">{title}</span>
        {accent && <span className="text-xs text-lab-muted">{accent}</span>}
      </div>

      <div className="h-56">
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
              domain={[0, 'dataMax + 0.1']}
              axisLine={{ stroke: '#dce1e8' }}
            />
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
              formatter={(val, _name, entry) => [val.toFixed(3), entry.payload.label]}
              labelFormatter={() => ''}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!spectrum && (
        <div className="text-center mt-3 lab-muted text-xs">
          waiting for device stream…
        </div>
      )}
    </div>
  );
}
