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

const COLORS = ['#16a34a', '#dc2626', '#d97706', '#3b82f6'];

export default function FleetBreakdownChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', count: stats.hiredOut },
    { name: 'Not Ready', count: stats.notReady },
    { name: 'Idle', count: stats.idle },
    { name: 'Booked', count: stats.booked },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <h3 className="font-semibold text-neutral-700 mb-4">Fleet Status Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Vehicles']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
