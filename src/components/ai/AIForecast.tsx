'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { SkeletonChart } from '@/components/ui/Skeleton';

interface ForecastData {
  historical: { woMonths: string[]; woCounts: number[]; hireMonths: string[]; hireCounts: number[] };
  forecast: { months: string[]; workOrders: { forecast: number[]; lower: number[]; upper: number[] }; hires: { forecast: number[]; lower: number[]; upper: number[] } };
}

export default function AIForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/ai/forecast').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <SkeletonChart />;
  if (!data) return <p className="text-neutral-400 text-center py-8">Failed to load forecast data</p>;

  // Build chart data for WOs
  const woChartData = [
    ...data.historical.woMonths.map((m, i) => ({ month: m, actual: data.historical.woCounts[i], forecast: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...data.forecast.months.map((m, i) => ({ month: m, actual: null as number | null, forecast: data.forecast.workOrders.forecast[i], lower: data.forecast.workOrders.lower[i], upper: data.forecast.workOrders.upper[i] })),
  ];

  const hireChartData = [
    ...data.historical.hireMonths.map((m, i) => ({ month: m, actual: data.historical.hireCounts[i], forecast: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...data.forecast.months.map((m, i) => ({ month: m, actual: null as number | null, forecast: data.forecast.hires.forecast[i], lower: data.forecast.hires.lower[i], upper: data.forecast.hires.upper[i] })),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Work Order Demand Forecast (6-month)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={woChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#3b82f620" name="Upper Bound" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" name="Lower Bound" />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Actual" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Hire Demand Forecast (6-month)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={hireChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Actual" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
