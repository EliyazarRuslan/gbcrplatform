'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

interface WorkOrder {
  wonum: string; description: string; status: string; worktype: string;
  assetnum: string; reportdate: string | null; actfinish: string | null;
  pluspcustomer: string | null; siteid: string;
  actlabcost: number | null; actmatcost: number | null;
}

export default function ServicesPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('worktype', typeFilter);
    fetch(`/api/services?${params}`)
      .then(r => r.json())
      .then(data => { setWorkOrders(data.workOrders || []); setPagination(data.pagination || { total: 0, pages: 0 }); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, statusFilter, typeFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Service & Maintenance</h1>

      <div className="flex gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchData(); } }}
          placeholder="Search WO, asset, description..."
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-primary-light" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg">
          <option value="">All Statuses</option>
          {['APPR','WMATL','INPRG','COMP','CLOSE','CAN'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg">
          <option value="">All Types</option>
          {['PM','CM','SR','EM','CAP'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => { setPage(1); fetchData(); }} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Search</button>
      </div>

      {loading ? <SkeletonTable rows={10} cols={8} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">WO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Reported</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Cost</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map(wo => (
                  <tr key={wo.wonum} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3"><Link href={`/services/${wo.wonum}`} className="text-blue-600 hover:underline font-medium">{wo.wonum}</Link></td>
                    <td className="px-4 py-3 truncate max-w-[250px]">{wo.description}</td>
                    <td className="px-4 py-3"><Link href={`/fleet/${wo.assetnum}`} className="text-blue-600 hover:underline">{wo.assetnum}</Link></td>
                    <td className="px-4 py-3">{wo.worktype}</td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-4 py-3">{wo.pluspcustomer || '-'}</td>
                    <td className="px-4 py-3">{formatDate(wo.reportdate)}</td>
                    <td className="px-4 py-3">{formatCurrency((wo.actlabcost || 0) + (wo.actmatcost || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-sm text-neutral-500">Page {page} of {pagination.pages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">Previous</button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page>=pagination.pages} className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
