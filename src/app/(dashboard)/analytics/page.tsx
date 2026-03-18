'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { SkeletonChart, SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';

const AnalyticsCharts = dynamic(() => import('@/components/analytics/AnalyticsCharts'), { ssr: false, loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({length: 4}).map((_,i) => <SkeletonChart key={i} />)}</div> });

interface AnalyticsData {
  revenue: { month: string; revenue: number }[];
  laborCost: { month: string; cost: number }[];
  materialCost: { month: string; cost: number }[];
  woByType: { worktype: string; count: number }[];
  topCostlyVehicles: { assetnum: string; gb_regno: string; description: string; totalCost: number; woCount: number }[];
  statusDistribution: { status: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        // Ensure all expected arrays are present even if API returns partial/error data
        setData({
          revenue: Array.isArray(d.revenue) ? d.revenue : [],
          laborCost: Array.isArray(d.laborCost) ? d.laborCost : [],
          materialCost: Array.isArray(d.materialCost) ? d.materialCost : [],
          woByType: Array.isArray(d.woByType) ? d.woByType : [],
          topCostlyVehicles: Array.isArray(d.topCostlyVehicles) ? d.topCostlyVehicles : [],
          statusDistribution: Array.isArray(d.statusDistribution) ? d.statusDistribution : [],
        });
        setLoading(false);
      })
      .catch(() => {
        setData({ revenue: [], laborCost: [], materialCost: [], woByType: [], topCostlyVehicles: [], statusDistribution: [] });
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({length:4}).map((_,i) => <SkeletonChart key={i} />)}</div>
    </div>
  );

  const totalRevenue = (data?.revenue || []).reduce((s, r) => s + r.revenue, 0);
  const totalLabor = (data?.laborCost || []).reduce((s, r) => s + r.cost, 0);
  const totalMaterial = (data?.materialCost || []).reduce((s, r) => s + r.cost, 0);
  const totalWO = (data?.woByType || []).reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Total Revenue (12mo)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Labor Cost (12mo)</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLabor)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Material Cost (12mo)</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalMaterial)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Work Orders (12mo)</p>
          <p className="text-2xl font-bold text-blue-600">{totalWO.toLocaleString()}</p>
        </div>
      </div>

      {data && <AnalyticsCharts data={data} />}

      {/* Top costly vehicles */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200"><h3 className="font-semibold text-neutral-700">Top 10 Costliest Vehicles</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Asset</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Reg No</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Description</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Total Cost</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Work Orders</th>
          </tr></thead>
          <tbody>
            {(data?.topCostlyVehicles || []).map((v, i) => (
              <tr key={v.assetnum} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{v.assetnum}</td>
                <td className="px-4 py-2">{v.gb_regno || '-'}</td>
                <td className="px-4 py-2 truncate max-w-[200px]">{v.description}</td>
                <td className="px-4 py-2 font-medium text-red-600">{formatCurrency(v.totalCost)}</td>
                <td className="px-4 py-2">{v.woCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
