'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface Props {
  data: {
    revenue: { month: string; agreements: number; revenue: number }[];
    revenueBySplit: { month: string; product: string; agreements: number; revenue: number }[];
    woByType: { worktype: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
    agreementStatus: { status: string; count: number; total_rental: number }[];
  };
}

export default function AnalyticsCharts({ data }: Props) {
  const formatK = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Rental Revenue Trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Monthly Rental Revenue (12mo)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="#16a34a40" name="Rental Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PV vs CV Monthly Revenue */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">PV vs CV Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={(() => {
            const months = new Set<string>();
            data.revenueBySplit.forEach(r => months.add(r.month));
            return Array.from(months).sort().map(m => {
              const pv = data.revenueBySplit.find(r => r.month === m && r.product === 'PV');
              const cv = data.revenueBySplit.find(r => r.month === m && r.product === 'CV');
              return { month: m, PV: pv?.revenue || 0, CV: cv?.revenue || 0 };
            });
          })()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="PV" stackId="rev" fill="#3b82f6" name="PV (Passenger)" />
            <Bar dataKey="CV" stackId="rev" fill="#10b981" name="CV (Commercial)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* WO by Type */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Work Orders by Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data.woByType} dataKey="count" nameKey="worktype" cx="50%" cy="50%" outerRadius={100}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
              {data.woByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Fleet Status Distribution */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Fleet Status Distribution</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.statusDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#d4941c" radius={[0, 4, 4, 0]} name="Vehicles" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
