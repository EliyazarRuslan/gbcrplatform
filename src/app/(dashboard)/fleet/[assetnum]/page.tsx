'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

interface VehicleDetail {
  assetnum: string; description: string; status: string; siteid: string;
  pluspcustomer: string | null; serialnum: string | null;
  gb_regno: string | null; gb_make: string | null; gb_model: string | null;
  gb_vehicletype: string | null; changedate: string | null; installdate: string | null;
  purchaseprice: number | null; totalcost: number | null;
  laborCost: number; materialCost: number; totalRevenue: number;
  workOrderCount: number; lastServiceDate: string | null;
  workOrders: { wonum: string; description: string; status: string; worktype: string; reportdate: string | null; actfinish: string | null; pluspcustomer: string | null; }[];
}

const tabs = ['Overview', 'Financial', 'Service History', 'AI Insights'];

export default function VehicleDetailPage({ params }: { params: Promise<{ assetnum: string }> }) {
  const { assetnum } = use(params);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    fetch(`/api/fleet/${assetnum}`)
      .then((r) => r.json())
      .then((data) => { setVehicle(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assetnum]);

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonTable /></div>;
  if (!vehicle) return <div className="text-center py-12 text-neutral-500">Vehicle not found</div>;

  const profitability = vehicle.totalRevenue - vehicle.laborCost - vehicle.materialCost;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/fleet" className="p-2 hover:bg-neutral-200 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{vehicle.gb_regno || vehicle.assetnum}</h1>
          <p className="text-sm text-neutral-500">{vehicle.description}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
            <h3 className="font-semibold text-neutral-700">Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Asset Number', vehicle.assetnum],
                ['Reg Number', vehicle.gb_regno],
                ['Serial Number', vehicle.serialnum],
                ['Make', vehicle.gb_make],
                ['Model', vehicle.gb_model],
                ['Type', vehicle.gb_vehicletype],
                ['Site', vehicle.siteid],
                ['Customer', vehicle.pluspcustomer],
                ['Install Date', formatDate(vehicle.installdate)],
                ['Last Updated', formatDate(vehicle.changedate)],
              ].map(([label, val]) => (
                <div key={label as string}><p className="text-neutral-400">{label}</p><p className="font-medium">{val || '-'}</p></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
            <h3 className="font-semibold text-neutral-700">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg"><p className="text-xs text-blue-600">Work Orders</p><p className="text-xl font-bold text-blue-900">{vehicle.workOrderCount}</p></div>
              <div className="p-3 bg-green-50 rounded-lg"><p className="text-xs text-green-600">Revenue</p><p className="text-xl font-bold text-green-900">{formatCurrency(vehicle.totalRevenue)}</p></div>
              <div className="p-3 bg-red-50 rounded-lg"><p className="text-xs text-red-600">Total Cost</p><p className="text-xl font-bold text-red-900">{formatCurrency(vehicle.laborCost + vehicle.materialCost)}</p></div>
              <div className={`p-3 rounded-lg ${profitability >= 0 ? 'bg-green-50' : 'bg-red-50'}`}><p className={`text-xs ${profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>Profitability</p><p className={`text-xl font-bold ${profitability >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatCurrency(profitability)}</p></div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-neutral-400">Last Service</p>
              <p className="text-sm font-medium">{formatDate(vehicle.lastServiceDate)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Financial' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
          <h3 className="font-semibold text-neutral-700">Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-sm text-neutral-400">Purchase Price</p><p className="text-lg font-bold">{formatCurrency(vehicle.purchaseprice)}</p></div>
            <div><p className="text-sm text-neutral-400">Labor Cost</p><p className="text-lg font-bold text-red-600">{formatCurrency(vehicle.laborCost)}</p></div>
            <div><p className="text-sm text-neutral-400">Material Cost</p><p className="text-lg font-bold text-red-600">{formatCurrency(vehicle.materialCost)}</p></div>
            <div><p className="text-sm text-neutral-400">Total Revenue</p><p className="text-lg font-bold text-green-600">{formatCurrency(vehicle.totalRevenue)}</p></div>
          </div>
          <div className="border-t border-neutral-200 pt-4 flex justify-between">
            <span className="font-medium">Net Profitability</span>
            <span className={`text-lg font-bold ${profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profitability)}</span>
          </div>
        </div>
      )}

      {activeTab === 'Service History' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">WO Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Reported</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Completed</th>
              </tr>
            </thead>
            <tbody>
              {(vehicle.workOrders || []).map((wo) => (
                <tr key={wo.wonum} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3"><Link href={`/services/${wo.wonum}`} className="text-blue-600 hover:underline">{wo.wonum}</Link></td>
                  <td className="px-4 py-3 truncate max-w-[300px]">{wo.description}</td>
                  <td className="px-4 py-3">{wo.worktype}</td>
                  <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                  <td className="px-4 py-3">{formatDate(wo.reportdate)}</td>
                  <td className="px-4 py-3">{formatDate(wo.actfinish)}</td>
                </tr>
              ))}
              {(!vehicle.workOrders || vehicle.workOrders.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">No work orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'AI Insights' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-semibold text-neutral-700 mb-1">AI Insights Coming Soon</h3>
          <p className="text-sm text-neutral-400">Maintenance predictions and optimization recommendations for this vehicle.</p>
        </div>
      )}
    </div>
  );
}
