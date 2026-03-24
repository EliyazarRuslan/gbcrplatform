'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export default function FleetStatusChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', value: stats.hiredOut, color: COLORS[0] },
    { name: 'Not Ready', value: stats.notReady, color: COLORS[1] },
    { name: 'Idle', value: stats.idle, color: COLORS[2] },
    { name: 'Booked', value: stats.booked, color: COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm shadow-neutral-900/[0.03]">
      <h3 className="font-semibold text-neutral-800 text-sm mb-1">Fleet Status Distribution</h3>
      <p className="text-xs text-neutral-400 mb-4">{stats.total} total vehicles</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={4}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), 'Vehicles']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
