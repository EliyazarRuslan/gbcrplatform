'use client';

import React from 'react';
import DataTable, { Column } from '@/components/ui/data-table';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationProps;
  emptyMessage?: string;
  loading?: boolean;
  mobileCard: (row: T, index: number) => React.ReactNode;
  onRowClick?: (row: T) => void;
}

export default function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  emptyMessage = 'No data available.',
  loading = false,
  mobileCard,
  onRowClick,
}: ResponsiveTableProps<T>) {
  const safePageSize = pagination && pagination.pageSize > 0 ? pagination.pageSize : 1;
  const totalPages = pagination
    ? Math.ceil(pagination.total / safePageSize)
    : 1;
  const startItem = pagination
    ? (pagination.page - 1) * safePageSize + 1
    : 1;
  const endItem = pagination
    ? Math.min(pagination.page * safePageSize, pagination.total)
    : data.length;

  return (
    <>
      {/* Desktop: existing table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={data}
          pagination={pagination}
          emptyMessage={emptyMessage}
          loading={loading}
        />
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="skeleton h-4 w-3/4 rounded mb-2" />
                <div className="skeleton h-3 w-1/2 rounded mb-2" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-12 text-center text-sm text-neutral-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((row, idx) => (
              <div
                key={idx}
                onClick={() => onRowClick?.(row)}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
                className={`bg-white rounded-xl border border-neutral-200 p-4 ${
                  onRowClick ? 'cursor-pointer active:bg-neutral-50' : ''
                }`}
              >
                {mobileCard(row, idx)}
              </div>
            ))}
          </div>
        )}

        {/* Mobile pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-neutral-500">
              {startItem}–{endItem} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-neutral-500">
                {pagination.page}/{totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
