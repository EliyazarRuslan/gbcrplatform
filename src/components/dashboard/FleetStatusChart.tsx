'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
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

export default function FleetStatusChart({ stats }: { stats: FleetStats }) {
  const data = [
    { name: 'Hired Out', value: stats.hiredOut, color: COLORS[0] },
    { name: 'Not Ready', value: stats.notReady, color: COLORS[1] },
    { name: 'Idle', value: stats.idle, color: COLORS[2] },
    { name: 'Booked', value: stats.booked, color: COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="card-industrial p-5">
      <div className="mb-5">
        <h3 className="font-bold text-neutral-900 text-[15px]">Fleet Status Distribution</h3>
        <p className="text-[12px] font-bold text-neutral-400 mt-0.5">{stats.total} total vehicles</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent, x, y, textAnchor }) => (
              <text x={x} y={y} textAnchor={textAnchor} fill="#636878" fontSize={13} fontWeight={700}>
                {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              </text>
            )}
            labelLine={{ stroke: '#c8cbd5', strokeWidth: 1 }}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), 'Vehicles']}
            contentStyle={tooltipStyle}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#636878' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
