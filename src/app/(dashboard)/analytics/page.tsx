'use client';

import { useState, useEffect } from 'react';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(() => import('@/components/analytics/AnalyticsCharts'), {
  ssr: false,
  loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}</div>,
});

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface AnalyticsData {
  revenue: { month: string; invoices: number; revenue: number }[];
  agreementStatus: { status: string; count: number; total_invoiced: number }[];
  activeValue: { active_count: number; invoice_count: number; total_invoiced: number };
  topCustomers: { customer_id: string; customer_name: string; agreement_count: number; invoice_count: number; total_invoiced: number }[];
  revenueByCustomer: { month: string; segment: string; revenue: number }[];
  topOrders: { SALESID: string; customer_id: string; customer_name: string; invoice_count: number; total_invoiced: number; first_invoice: string; last_invoice: string }[];
  woByType: { worktype: string; count: number }[];
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
          activeValue: d.activeValue || { active_count: 0, invoice_count: 0, total_invoiced: 0 },
          topCustomers: Array.isArray(d.topCustomers) ? d.topCustomers : [],
          revenueByCustomer: Array.isArray(d.revenueByCustomer) ? d.revenueByCustomer : [],
          topOrders: Array.isArray(d.topOrders) ? d.topOrders : [],
          woByType: Array.isArray(d.woByType) ? d.woByType : [],
          statusDistribution: Array.isArray(d.statusDistribution) ? d.statusDistribution : [],
        });
        setLoading(false);
      })
      .catch(() => {
        setData({
          revenue: [], agreementStatus: [], topCustomers: [], revenueByCustomer: [],
          activeValue: { active_count: 0, invoice_count: 0, total_invoiced: 0 },
          topOrders: [], woByType: [], statusDistribution: [],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-6 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}</div>
    </div>
  );

  const totalRevenue = data?.revenue.reduce((s, r) => s + (r.revenue || 0), 0) || 0;
  const totalInvoices = data?.revenue.reduce((s, r) => s + (r.invoices || 0), 0) || 0;
  const totalWO = data?.woByType.reduce((s, r) => s + r.count, 0) || 0;

  const kpis = [
    {
      label: 'Active Agreements',
      value: data?.activeValue.active_count?.toLocaleString() || '0',
      sub: 'with invoices in D365',
      color: 'bg-blue-500',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Total Invoiced',
      value: formatCurrency(data?.activeValue.total_invoiced),
      sub: `${data?.activeValue.invoice_count?.toLocaleString() || '0'} invoices`,
      color: 'bg-emerald-500',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Revenue (12mo)',
      value: formatCurrency(totalRevenue),
      sub: `${totalInvoices.toLocaleString()} invoices`,
      color: 'bg-violet-500',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    },
    {
      label: 'Work Orders (12mo)',
      value: totalWO.toLocaleString(),
      sub: 'from Maximo',
      color: 'bg-amber-500',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight">Analytics</h1>
          <p className="text-[15px] font-medium text-neutral-400 mt-0.5">Active agreements with invoices flowing to D365</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-neutral-400 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" />
          <span className="font-medium uppercase tracking-wider">D365 F&O Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-in">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card-industrial p-5 group">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-wider leading-tight">{kpi.label}</p>
              <div className={`w-8 h-8 ${kpi.color} rounded-lg flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={kpi.icon} />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight">{kpi.value}</p>
            <p className="text-[13px] font-medium text-neutral-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {data && <AnalyticsCharts data={data} />}

      {/* Top Customers */}
      <div className="card-industrial overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[16px] text-neutral-900">Top Customers</h3>
            <p className="text-[13px] font-medium text-neutral-400 mt-0.5">By total invoiced amount (active agreements)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">#</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Account</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Orders</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Invoices</th>
              <th className="px-5 py-3 text-right text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Total Invoiced</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topCustomers || []).map((c, i) => (
              <tr key={c.customer_id} className="border-b border-neutral-50 hover:bg-neutral-50/60 transition-colors">
                <td className="px-5 py-3 text-neutral-300 font-medium">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-neutral-800 truncate max-w-[220px]">{c.customer_name}</td>
                <td className="px-5 py-3 text-neutral-400 font-mono text-[13px]">{c.customer_id}</td>
                <td className="px-5 py-3 text-neutral-600">{c.agreement_count}</td>
                <td className="px-5 py-3 text-neutral-600">{c.invoice_count}</td>
                <td className="px-5 py-3 text-right font-semibold text-neutral-900">{formatCurrency(c.total_invoiced)}</td>
              </tr>
            ))}
            {(data?.topCustomers || []).length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-neutral-400">No data available</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Top Sales Orders */}
      <div className="card-industrial overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-bold text-[16px] text-neutral-900">Top Active Sales Orders</h3>
          <p className="text-[13px] font-medium text-neutral-400 mt-0.5">By invoiced amount in D365</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">#</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Sales ID</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Invoices</th>
              <th className="px-5 py-3 text-right text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Total Invoiced</th>
              <th className="px-5 py-3 text-right text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Last Invoice</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topOrders || []).map((o, i) => (
              <tr key={o.SALESID} className="border-b border-neutral-50 hover:bg-neutral-50/60 transition-colors">
                <td className="px-5 py-3 text-neutral-300 font-medium">{i + 1}</td>
                <td className="px-5 py-3 font-mono text-[13px] text-neutral-700">{o.SALESID}</td>
                <td className="px-5 py-3 text-neutral-600 truncate max-w-[200px]">{o.customer_name}</td>
                <td className="px-5 py-3 text-neutral-600">{o.invoice_count}</td>
                <td className="px-5 py-3 text-right font-semibold text-neutral-900">{formatCurrency(o.total_invoiced)}</td>
                <td className="px-5 py-3 text-right text-neutral-400">{formatDate(o.last_invoice)}</td>
              </tr>
            ))}
            {(data?.topOrders || []).length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-neutral-400">No data available</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Agreement Status */}
      <div className="card-industrial overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-bold text-[16px] text-neutral-900">Agreement Status Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Count</th>
              <th className="px-5 py-3 text-right text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Total Invoiced</th>
            </tr>
          </thead>
          <tbody>
            {(data?.agreementStatus || []).length === 0 ? (
              <tr>
                <td className="px-5 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600">No agreement status</span></td>
                <td className="px-5 py-3 font-medium text-neutral-700">-</td>
                <td className="px-5 py-3 text-right font-semibold text-neutral-900">{formatCurrency(0)}</td>
              </tr>
            ) : (data?.agreementStatus || []).map(s => (
              <tr key={s.status} className="border-b border-neutral-50 hover:bg-neutral-50/60 transition-colors">
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold uppercase tracking-wider ${
                    s.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                    s.status === 'Invoiced' ? 'bg-blue-50 text-blue-700' :
                    s.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-neutral-100 text-neutral-600'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-neutral-700">{s.count.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-semibold text-neutral-900">{formatCurrency(s.total_invoiced)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
