'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pageSize: 50 });

  const fetchData = (p: number = 1, searchTerm: string = '') => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: '50' });
    if (searchTerm) params.set('search', searchTerm);
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

  useEffect(() => { fetchData(page); }, [page]);

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
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${val > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'}`}>
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
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-neutral-500">{pagination.total.toLocaleString()} customers</span>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData(1, search); } }}
          placeholder="Search by code, name, email, phone..."
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg w-96 focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <button
          onClick={() => { setPage(1); fetchData(1, search); }}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1); fetchData(1, ''); }}
            className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? <SkeletonTable rows={10} cols={7} /> : (
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
                        className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
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
                  <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-neutral-700">
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
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages} ({pagination.total.toLocaleString()} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-white"
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
