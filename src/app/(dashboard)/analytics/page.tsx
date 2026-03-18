'use client';

import { useState, useEffect } from 'react';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(() => import('@/components/analytics/AnalyticsCharts'), {
  ssr: false,
  loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}</div>,
});

interface AnalyticsData {
  revenue: { month: string; agreements: number; revenue: number }[];
  agreementStatus: { status: string; count: number; total_rental: number }[];
  activeValue: { active_count: number; active_rental: number; active_deposits: number };
  productBreakdown: { product: string; product_code: string; count: number; total_rental: number }[];
  revenueBySplit: { month: string; product: string; agreements: number; revenue: number }[];
  woByType: { worktype: string; count: number }[];
  topVehicles: { assetnum: string; gb_regno: string; description: string; agreement_count: number; total_rental: number }[];
  statusDistribution: { status: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        setData({
          revenue: Array.isArray(d.revenue) ? d.revenue : [],
          agreementStatus: Array.isArray(d.agreementStatus) ? d.agreementStatus : [],
          activeValue: d.activeValue || { active_count: 0, active_rental: 0, active_deposits: 0 },
          productBreakdown: Array.isArray(d.productBreakdown) ? d.productBreakdown : [],
          revenueBySplit: Array.isArray(d.revenueBySplit) ? d.revenueBySplit : [],
          woByType: Array.isArray(d.woByType) ? d.woByType : [],
          topVehicles: Array.isArray(d.topVehicles) ? d.topVehicles : [],
          statusDistribution: Array.isArray(d.statusDistribution) ? d.statusDistribution : [],
        });
        setLoading(false);
      })
      .catch(() => {
        setData({
          revenue: [], agreementStatus: [], productBreakdown: [], revenueBySplit: [],
          activeValue: { active_count: 0, active_rental: 0, active_deposits: 0 },
          woByType: [], topVehicles: [], statusDistribution: [],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}</div>
    </div>
  );

  const totalRevenue = data?.revenue.reduce((s, r) => s + (r.revenue || 0), 0) || 0;
  const totalAgreements = data?.revenue.reduce((s, r) => s + (r.agreements || 0), 0) || 0;
  const totalWO = data?.woByType.reduce((s, r) => s + r.count, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Active Agreements</p>
          <p className="text-2xl font-bold text-blue-600">{data?.activeValue.active_count?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Active Rental Value</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.activeValue.active_rental)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">New Agreements (12mo)</p>
          <p className="text-2xl font-bold text-purple-600">{totalAgreements.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-1">{formatCurrency(totalRevenue)} rental value</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">Work Orders (12mo)</p>
          <p className="text-2xl font-bold text-orange-600">{totalWO.toLocaleString()}</p>
        </div>
      </div>

      {/* PV vs CV Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(data?.productBreakdown || []).filter(p => p.product_code).map(p => (
          <div key={p.product_code} className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-700">{p.product}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                p.product_code === 'PV' ? 'bg-blue-100 text-blue-800' :
                p.product_code === 'CV' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>{p.product_code}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900">{p.count.toLocaleString()}</p>
            <p className="text-sm text-neutral-500 mt-1">{formatCurrency(p.total_rental)} rental value</p>
          </div>
        ))}
      </div>

      {data && <AnalyticsCharts data={data} />}

      {/* Top vehicles by rental */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200"><h3 className="font-semibold text-neutral-700">Top 10 Vehicles by Active Rental Value</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Asset</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Reg No</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Description</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Agreements</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Rental Value</th>
          </tr></thead>
          <tbody>
            {(data?.topVehicles || []).map((v, i) => (
              <tr key={v.assetnum} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{v.assetnum}</td>
                <td className="px-4 py-2">{v.gb_regno || '-'}</td>
                <td className="px-4 py-2 truncate max-w-[200px]">{v.description}</td>
                <td className="px-4 py-2">{v.agreement_count}</td>
                <td className="px-4 py-2 font-medium text-green-600">{formatCurrency(v.total_rental)}</td>
              </tr>
            ))}
            {(data?.topVehicles || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Agreement Status Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200"><h3 className="font-semibold text-neutral-700">Agreement Status Breakdown</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Status</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Count</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Total Rental</th>
          </tr></thead>
          <tbody>
            {(data?.agreementStatus || []).map(s => (
              <tr key={s.status} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 font-medium">{s.status}</td>
                <td className="px-4 py-2">{s.count.toLocaleString()}</td>
                <td className="px-4 py-2">{formatCurrency(s.total_rental)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
