'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, ColumnDef, SortingState,
} from '@tanstack/react-table';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Vehicle } from '@/lib/types';

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  const fetchData = (p: number = 1, search: string = '', status: string = '') => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    fetch(`/api/fleet?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setVehicles(data.vehicles || []);
        setPagination(data.pagination || { total: 0, pages: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(page, globalFilter, statusFilter); }, [page, statusFilter]);

  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    {
      accessorKey: 'gb_regno',
      header: 'Reg No',
      cell: ({ row }) => (
        <Link href={`/fleet/${row.original.assetnum}`} className="text-blue-600 hover:underline font-medium">
          {row.original.gb_regno || row.original.assetnum}
        </Link>
      ),
    },
    { accessorKey: 'assetnum', header: 'Asset' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="truncate max-w-[200px] block">{getValue() as string}</span> },
    { accessorKey: 'gb_make', header: 'Make' },
    { accessorKey: 'gb_model', header: 'Model' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    { accessorKey: 'pluspcustomer', header: 'Customer', cell: ({ getValue }) => getValue() || <span className="text-neutral-300">-</span> },
    { accessorKey: 'gb_vehicletype', header: 'Type' },
    {
      accessorKey: 'totalcost',
      header: 'Total Cost',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      accessorKey: 'changedate',
      header: 'Last Updated',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
  ], []);

  const table = useReactTable({
    data: vehicles,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const statuses = ['', 'HIRED OUT', 'NOT READY', 'IDLE', 'BOOKED', 'IN SERVICE', 'DECOMMISSIONED'];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <span className="text-sm text-neutral-500">{pagination.total.toLocaleString()} vehicles</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData(1, globalFilter, statusFilter); } }}
          placeholder="Search by asset, reg no, serial..."
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light w-80"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          <option value="">All Statuses</option>
          {statuses.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setPage(1); fetchData(1, globalFilter, statusFilter); }}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Search
        </button>
      </div>

      {loading ? <SkeletonTable rows={10} cols={8} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-neutral-200 bg-neutral-50">
                    {hg.headers.map((header) => (
                      <th key={header.id} onClick={header.column.getToggleSortingHandler()}
                        className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700">
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-neutral-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-sm text-neutral-500">
              Page {page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
