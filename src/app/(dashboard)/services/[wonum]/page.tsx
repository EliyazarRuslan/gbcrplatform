'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

interface WODetail {
  wonum: string; description: string; status: string; worktype: string;
  assetnum: string; reportdate: string; actfinish: string | null;
  pluspcustomer: string | null; siteid: string;
  labor: { laborcode: string; craft: string; startdate: string; regularhrs: number; linecost: number; gb_chargeable: boolean; }[];
  materials: { itemnum: string; description: string; quantity: number; linecost: number; storeloc: string; actualdate: string; }[];
  totalLabor: number;
  totalMaterial: number;
}

export default function WODetailPage({ params }: { params: Promise<{ wonum: string }> }) {
  const { wonum } = use(params);
  const [wo, setWO] = useState<WODetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/services/${wonum}`).then(r => r.json()).then(d => { setWO(d); setLoading(false); }).catch(() => setLoading(false));
  }, [wonum]);

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  if (!wo || !wo.wonum) return <div className="text-center py-12 text-neutral-500">Work order not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/services" className="p-2 hover:bg-neutral-200 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{wo.wonum}</h1>
          <p className="text-sm text-neutral-500">{wo.description}</p>
        </div>
        <StatusBadge status={wo.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <h3 className="font-semibold text-neutral-700">Details</h3>
          <div className="space-y-2 text-sm">
            {[['Type', wo.worktype], ['Asset', wo.assetnum], ['Site', wo.siteid], ['Customer', wo.pluspcustomer],
              ['Reported', formatDate(wo.reportdate)], ['Completed', formatDate(wo.actfinish)]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-neutral-400">{l}</span><span className="font-medium">{v || '-'}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-semibold text-neutral-700 mb-3">Cost Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-neutral-400">Labor</span><span className="font-medium text-red-600">{formatCurrency(wo.totalLabor)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-400">Material</span><span className="font-medium text-red-600">{formatCurrency(wo.totalMaterial)}</span></div>
            <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Total</span><span className="font-bold">{formatCurrency(wo.totalLabor + wo.totalMaterial)}</span></div>
          </div>
        </div>
      </div>

      {/* Labor table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200"><h3 className="font-semibold text-neutral-700">Labor ({wo.labor.length})</h3></div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Code</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Craft</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Date</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Hours</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Cost</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Chargeable</th>
          </tr></thead>
          <tbody>
            {wo.labor.map((l, i) => (
              <tr key={i} className="border-b border-neutral-100"><td className="px-4 py-2">{l.laborcode}</td><td className="px-4 py-2">{l.craft}</td><td className="px-4 py-2">{formatDate(l.startdate)}</td><td className="px-4 py-2">{l.regularhrs}</td><td className="px-4 py-2">{formatCurrency(l.linecost)}</td><td className="px-4 py-2">{l.gb_chargeable ? 'Yes' : 'No'}</td></tr>
            ))}
            {wo.labor.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">No labor records</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {/* Materials table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200"><h3 className="font-semibold text-neutral-700">Materials ({wo.materials.length})</h3></div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Item</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Description</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Qty</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Cost</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Store</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Date</th>
          </tr></thead>
          <tbody>
            {wo.materials.map((m, i) => (
              <tr key={i} className="border-b border-neutral-100"><td className="px-4 py-2">{m.itemnum}</td><td className="px-4 py-2 truncate max-w-[200px]">{m.description}</td><td className="px-4 py-2">{m.quantity}</td><td className="px-4 py-2">{formatCurrency(m.linecost)}</td><td className="px-4 py-2">{m.storeloc}</td><td className="px-4 py-2">{formatDate(m.actualdate)}</td></tr>
            ))}
            {wo.materials.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">No material records</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
