'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface Props {
  data: {
    revenue: { month: string; revenue: number }[];
    laborCost: { month: string; cost: number }[];
    materialCost: { month: string; cost: number }[];
    woByType: { worktype: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
  };
}

export default function AnalyticsCharts({ data }: Props) {
  // Merge revenue and costs by month
  const months = new Set<string>();
  data.revenue.forEach(r => months.add(r.month));
  data.laborCost.forEach(r => months.add(r.month));
  data.materialCost.forEach(r => months.add(r.month));

  const revMap: Record<string, number> = {};
  const labMap: Record<string, number> = {};
  const matMap: Record<string, number> = {};
  data.revenue.forEach(r => { revMap[r.month] = r.revenue; });
  data.laborCost.forEach(r => { labMap[r.month] = r.cost; });
  data.materialCost.forEach(r => { matMap[r.month] = r.cost; });

  const profitData = Array.from(months).sort().map(m => ({
    month: m,
    revenue: revMap[m] || 0,
    labor: labMap[m] || 0,
    material: matMap[m] || 0,
    profit: (revMap[m] || 0) - (labMap[m] || 0) - (matMap[m] || 0),
  }));

  const formatK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue & Profit Trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Revenue & Profit Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f680" name="Revenue" />
            <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b98180" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Cost Breakdown by Month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="labor" stackId="cost" fill="#ef4444" name="Labor" />
            <Bar dataKey="material" stackId="cost" fill="#f59e0b" name="Material" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* WO by Type */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Work Orders by Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data.woByType} dataKey="count" nameKey="worktype" cx="50%" cy="50%" outerRadius={100}
              label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
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
            <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} name="Vehicles" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
