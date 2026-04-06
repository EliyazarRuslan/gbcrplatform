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

  const fetchData = (signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('worktype', typeFilter);
    fetch(`/api/services?${params}`, signal ? { signal } : undefined)
      .then(r => r.json())
      .then(data => { setWorkOrders(data.workOrders || []); setPagination(data.pagination || { total: 0, pages: 0 }); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false); });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [page, statusFilter, typeFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-3xl font-bold">Service & Maintenance</h1>

      <div className="space-y-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchData(); } }}
          placeholder="Search WO, asset, description..."
          className="w-full px-4 py-2 text-[14px] font-medium bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light" />
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="shrink-0 px-4 py-2 text-[14px] font-medium bg-white border border-neutral-200 rounded-lg">
            <option value="">All Statuses</option>
            {['APPR','WMATL','INPRG','COMP','CLOSE','CAN'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="shrink-0 px-4 py-2 text-[14px] font-medium bg-white border border-neutral-200 rounded-lg">
            <option value="">All Types</option>
            {['PM','CM','SR','EM','CAP'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { setPage(1); fetchData(); }} className="shrink-0 px-4 py-2 text-[14px] font-bold bg-primary text-white rounded-lg hover:bg-primary-dark">Search</button>
        </div>
      </div>

      {loading ? <SkeletonTable rows={10} cols={8} /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px] font-medium">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">WO Number</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Description</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Asset</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Type</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Status</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Reported</th>
                    <th className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[15px] font-medium text-neutral-400">No work orders found</td>
                    </tr>
                  ) : workOrders.map(wo => (
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
              <span className="text-[15px] font-medium text-neutral-500">Page {page} of {pagination.pages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="px-3 py-1.5 text-[14px] font-bold border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">Previous</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page>=pagination.pages} className="px-3 py-1.5 text-[14px] font-bold border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">Next</button>
              </div>
            </div>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {workOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-12 text-center text-[15px] font-medium text-neutral-400">
                No work orders found
              </div>
            ) : (
              workOrders.map((wo) => (
                <Link
                  key={wo.wonum}
                  href={`/services/${wo.wonum}`}
                  className="block bg-white rounded-2xl border border-neutral-200/80 p-4 active:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary text-[15px]">{wo.wonum}</p>
                      <p className="text-[13px] font-medium text-neutral-500 mt-0.5 line-clamp-1">{wo.description}</p>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-neutral-500">
                    <span>Asset: <span className="font-bold text-neutral-700">{wo.assetnum}</span></span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-bold">{wo.worktype}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[13px]">
                    <span className="text-neutral-400 font-medium">{formatDate(wo.reportdate)}</span>
                    <span className="font-bold text-neutral-700">{formatCurrency((wo.actlabcost || 0) + (wo.actmatcost || 0))}</span>
                  </div>
                </Link>
              ))
            )}
            {/* Mobile pagination */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-[13px] font-medium text-neutral-500">Page {page} of {pagination.pages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}
                    className="px-3 py-1.5 text-[13px] font-bold rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                  <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page>=pagination.pages}
                    className="px-3 py-1.5 text-[13px] font-bold rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
