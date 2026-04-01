'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, ColumnDef, SortingState,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface Customer {
  customer_code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  pay_term: string | null;
  status: string;
  active_rentals: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pageSize: 50 });
  const [activeOnly, setActiveOnly] = useState(false);

  const fetchData = (p: number = 1, searchTerm: string = '', activeRentals: boolean = activeOnly) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: '50' });
    if (searchTerm) params.set('search', searchTerm);
    if (activeRentals) params.set('activeRentals', 'true');
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.data.customers || []);
          setPagination(data.data.pagination || { total: 0, pageSize: 50 });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(page, search, activeOnly); }, [page, activeOnly]);

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      accessorKey: 'customer_code',
      header: 'Code',
      cell: ({ getValue }) => <span className="font-medium text-primary">{getValue() as string}</span>,
    },
    { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <span className="truncate max-w-[250px] block">{getValue() as string}</span> },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => (getValue() as string) || <span className="text-neutral-300">-</span> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => (getValue() as string) || <span className="text-neutral-300">-</span> },
    { accessorKey: 'address', header: 'Address', cell: ({ getValue }) => <span className="truncate max-w-[200px] block">{(getValue() as string) || '-'}</span> },
    { accessorKey: 'pay_term', header: 'Pay Term', cell: ({ getValue }) => (getValue() as string) || <span className="text-neutral-300">-</span> },
    {
      accessorKey: 'active_rentals',
      header: 'Active Rentals',
      cell: ({ getValue }) => {
        const val = getValue() as number;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold ${val > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'}`}>
            {val}
          </span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: customers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
        <span className="text-[15px] font-medium text-neutral-500">{pagination.total.toLocaleString()} customers</span>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData(1, search); } }}
          placeholder="Search by code, name, email, phone..."
          className="w-full px-4 py-2 text-[14px] font-medium bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          <button
            onClick={() => { setPage(1); fetchData(1, search); }}
            className="shrink-0 px-4 py-2 text-[15px] font-bold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => { setActiveOnly(!activeOnly); setPage(1); }}
            className={`shrink-0 px-4 py-2 text-[15px] font-bold rounded-lg transition-colors ${activeOnly ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
          >
            {activeOnly ? 'With Active Rentals' : 'All Customers'}
          </button>
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); fetchData(1, '', activeOnly); }}
              className="shrink-0 px-4 py-2 text-[15px] font-bold bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? <SkeletonTable rows={10} cols={7} /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-neutral-200 bg-neutral-50">
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className="px-4 py-3 text-left text-[13px] font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
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
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/customers/${row.original.customer_code}`)}
                      className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-[15px] font-medium text-neutral-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No customers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
              <span className="text-[15px] font-medium text-neutral-500">
                Page {page} of {totalPages} ({pagination.total.toLocaleString()} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-[15px] font-bold border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-[15px] font-bold border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {customers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-12 text-center text-[15px] font-medium text-neutral-400">
                No customers found
              </div>
            ) : (
              customers.map((c) => (
                <div
                  key={c.customer_code}
                  onClick={() => router.push(`/customers/${c.customer_code}`)}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-4 cursor-pointer active:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary text-[15px]">{c.customer_code}</p>
                      <p className="text-[15px] font-medium text-neutral-700 mt-0.5">{c.name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold ${c.active_rentals > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'}`}>
                      {c.active_rentals} rental{c.active_rentals !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium text-neutral-500">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.pay_term && <span>Pay: {c.pay_term}</span>}
                  </div>
                </div>
              ))
            )}
            {/* Mobile pagination */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-[13px] font-medium text-neutral-500">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-[13px] font-bold rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
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
