'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
  utilizationRate: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export default function FleetBreakdownChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', count: stats.hiredOut },
    { name: 'Not Ready', count: stats.notReady },
    { name: 'Idle', count: stats.idle },
    { name: 'Booked', count: stats.booked },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm shadow-neutral-900/[0.03]">
      <h3 className="font-semibold text-neutral-800 text-sm mb-1">Fleet Status Breakdown</h3>
      <p className="text-xs text-neutral-400 mb-4">{stats.utilizationRate.toFixed(1)}% utilization rate</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fill: '#64748b' }} width={80} axisLine={false} tickLine={false} />
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
          <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
