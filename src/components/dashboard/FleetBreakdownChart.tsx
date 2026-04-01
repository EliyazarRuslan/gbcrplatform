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

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

const tooltipStyle = {
  backgroundColor: '#1a1d23',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
};

export default function FleetBreakdownChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', count: stats.hiredOut },
    { name: 'Not Ready', count: stats.notReady },
    { name: 'Idle', count: stats.idle },
    { name: 'Booked', count: stats.booked },
  ];

  return (
    <div className="card-industrial p-5">
      <div className="mb-5">
        <h3 className="font-bold text-neutral-900 text-[15px]">Fleet Status Breakdown</h3>
        <p className="text-[12px] font-bold text-neutral-400 mt-0.5">{stats.utilizationRate.toFixed(1)}% utilization rate</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e1e3ea" />
          <XAxis type="number" tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 700, fill: '#636878' }} width={80} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), 'Vehicles']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
