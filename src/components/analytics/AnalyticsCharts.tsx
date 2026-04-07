'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const COLORS = ['#32373c', '#c8a04a', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface Props {
  data: {
    revenue: { month: string; invoices: number; revenue: number }[];
    revenueByCustomer: { month: string; segment: string; revenue: number }[];
    woByType: { worktype: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
  };
}

const chartTooltipStyle = {
  backgroundColor: '#1a1d23',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
};

export default function AnalyticsCharts({ data }: Props) {
  const formatK = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  // Build stacked bar data for revenue by customer segment
  const segments = [...new Set(data.revenueByCustomer.map(r => r.segment))];
  // Sort months chronologically (ISO yyyy-MM strings sort correctly lexicographically, but parse to be explicit)
  const months = [...new Set(data.revenueByCustomer.map(r => r.month))].sort((a, b) => {
    const dateA = new Date(a + '-01').getTime();
    const dateB = new Date(b + '-01').getTime();
    return dateA - dateB;
  });
  const stackedData = months.map(m => {
    const row: Record<string, string | number> = { month: m };
    segments.forEach(seg => {
      const entry = data.revenueByCustomer.find(r => r.month === m && r.segment === seg);
      row[seg] = entry?.revenue || 0;
    });
    return row;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-in">
      {/* Monthly Invoice Revenue */}
      <div className="card-industrial p-5">
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-neutral-900">Monthly Invoice Revenue</h3>
          <p className="text-[12px] font-bold text-neutral-400 mt-0.5">Last 12 months, SGD equivalent</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.revenue}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8a04a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#c8a04a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e3ea" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#c8a04a" strokeWidth={2.5} fill="url(#revenueGradient)" name="Revenue" dot={false} activeDot={{ r: 5, fill: '#c8a04a', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Customer Segment */}
      <div className="card-industrial p-5">
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-neutral-900">Revenue by Top Customers</h3>
          <p className="text-[12px] font-bold text-neutral-400 mt-0.5">Top 3 vs others, last 12 months</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stackedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e3ea" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#636878' }} />
            {segments.map((seg, i) => (
              <Bar
                key={seg}
                dataKey={seg}
                stackId="rev"
                fill={COLORS[i % COLORS.length]}
                name={seg.length > 20 ? seg.slice(0, 18) + '...' : seg}
                radius={i === segments.length - 1 ? [3, 3, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* WO by Type */}
      <div className="card-industrial p-5">
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-neutral-900">Work Orders by Type</h3>
          <p className="text-[12px] font-bold text-neutral-400 mt-0.5">Last 12 months from Maximo</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data.woByType} dataKey="count" nameKey="worktype" cx="50%" cy="50%" innerRadius={55} outerRadius={95}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#c8cbd5', strokeWidth: 1 }}
              style={{ fontSize: '13px', fontWeight: 700, fill: '#636878' }}
            >
              {data.woByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Fleet Status */}
      <div className="card-industrial p-5">
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-neutral-900">Fleet Status Distribution</h3>
          <p className="text-[12px] font-bold text-neutral-400 mt-0.5">Active fleet from Maximo</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.statusDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e3ea" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fontWeight: 700, fill: '#8e93a3' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="status" tick={{ fontSize: 13, fontWeight: 700, fill: '#636878' }} width={90} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" fill="#32373c" radius={[0, 4, 4, 0]} name="Vehicles" barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
