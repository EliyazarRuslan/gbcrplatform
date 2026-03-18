'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, ColumnDef, SortingState,
} from '@tanstack/react-table';
import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface Vehicle {
  assetnum: string;
  description: string;
  status: string;
  registration_no: string | null;
  model: string | null;
  colour: string | null;
  fuel_type: string | null;
  transmission: string | null;
  year_mfg: number | null;
  chassis_no: string | null;
  customer_code: string | null;
  change_date: string | null;
  category_id: number | null;
  category_name: string | null;
  availability_override: string | null;
  override_reason: string | null;
  notes: string | null;
}

interface Stats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
  utilizationRate: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const CATEGORY_OPTIONS = [
  { id: '', label: 'All Categories' },
  { id: '1', label: 'Economy Sedan' },
  { id: '2', label: 'Standard Sedan' },
  { id: '3', label: 'Premium Sedan' },
  { id: '4', label: 'SUV' },
  { id: '5', label: 'Van' },
  { id: '6', label: 'Truck Light' },
  { id: '7', label: 'Truck Heavy' },
];

const CATEGORY_COLORS: Record<number, string> = {
  1: 'bg-sky-100 text-sky-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-indigo-100 text-indigo-700',
  4: 'bg-emerald-100 text-emerald-700',
  5: 'bg-violet-100 text-violet-700',
  6: 'bg-orange-100 text-orange-700',
  7: 'bg-red-100 text-red-700',
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, hiredOut: 0, notReady: 0, idle: 0, booked: 0, utilizationRate: 0 });
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0 });

  const fetchData = useCallback((p: number, search: string, status: string, category: string) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '50',
      search,
      status,
      category,
    });
    fetch(`/api/fleet?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setStats(res.data.stats || { total: 0, hiredOut: 0, notReady: 0, idle: 0, booked: 0, utilizationRate: 0 });
          setVehicles(res.data.vehicles || []);
          setPagination(res.data.pagination || { page: 1, pageSize: 50, total: 0 });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(page, activeSearch, statusFilter, categoryFilter);
  }, [page, activeSearch, statusFilter, categoryFilter, fetchData]);

  const handleSearch = () => {
    setPage(1);
    setActiveSearch(searchInput);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    {
      accessorKey: 'registration_no',
      header: 'Reg No',
      cell: ({ row }) => (
        <Link href={`/fleet/${row.original.assetnum}`} className="text-blue-600 hover:underline font-medium">
          {row.original.registration_no || row.original.assetnum}
        </Link>
      ),
    },
    { accessorKey: 'assetnum', header: 'Asset' },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="truncate max-w-[200px] block" title={getValue() as string}>
          {getValue() as string}
        </span>
      ),
    },
    { accessorKey: 'model', header: 'Model', cell: ({ getValue }) => getValue() || <span className="text-neutral-300">-</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.original.status} />
          {row.original.availability_override && (
            <span
              title={row.original.override_reason || 'Availability override set'}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 cursor-help"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category_name',
      header: 'Category',
      cell: ({ row }) => {
        const { category_id, category_name } = row.original;
        if (!category_id || !category_name) return <span className="text-neutral-300">-</span>;
        const color = CATEGORY_COLORS[category_id] || 'bg-gray-100 text-gray-700';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {category_name}
          </span>
        );
      },
    },
    { accessorKey: 'fuel_type', header: 'Fuel', cell: ({ getValue }) => getValue() || <span className="text-neutral-300">-</span> },
    { accessorKey: 'transmission', header: 'Transmission', cell: ({ getValue }) => getValue() || <span className="text-neutral-300">-</span> },
    {
      accessorKey: 'customer_code',
      header: 'Customer',
      cell: ({ getValue }) => getValue() || <span className="text-neutral-300">-</span>,
    },
  ], []);

  const table = useReactTable({
    data: vehicles,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <span className="text-sm text-neutral-500">{stats.total.toLocaleString()} vehicles</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Fleet"
          value={stats.total.toLocaleString()}
          icon="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M3 16h10M13 16h2m0 0h2a2 2 0 000-4h-2m0 4V8m0 0h2a2 2 0 010 4h-2"
          color="blue"
        />
        <StatCard
          title="Hired Out"
          value={stats.hiredOut.toLocaleString()}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatCard
          title="Not Ready"
          value={stats.notReady.toLocaleString()}
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          color="red"
        />
        <StatCard
          title="Idle"
          value={stats.idle.toLocaleString()}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="yellow"
        />
        <StatCard
          title="Booked"
          value={stats.booked.toLocaleString()}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="indigo"
        />
        <StatCard
          title="Utilization"
          value={`${stats.utilizationRate.toFixed(1)}%`}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search by asset, reg no, description..."
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light w-80"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          <option value="">All Statuses</option>
          <option value="HIRED OUT">HIRED OUT</option>
          <option value="NOT READY">NOT READY</option>
          <option value="IDLE">IDLE</option>
          <option value="BOOKED">BOOKED</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Search
        </button>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={10} cols={9} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-neutral-200 bg-neutral-50">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700 select-none"
                      >
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
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-neutral-400 text-sm">
                      No vehicles found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-neutral-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages} ({pagination.total.toLocaleString()} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
