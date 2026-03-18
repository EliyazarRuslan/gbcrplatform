'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
}

const COLORS = ['#16a34a', '#dc2626', '#d97706', '#3b82f6'];

export default function FleetStatusChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', value: stats.hiredOut, color: COLORS[0] },
    { name: 'Not Ready', value: stats.notReady, color: COLORS[1] },
    { name: 'Idle', value: stats.idle, color: COLORS[2] },
    { name: 'Booked', value: stats.booked, color: COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <h3 className="font-semibold text-neutral-700 mb-4">Fleet Status Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Vehicles']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
