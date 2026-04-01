'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationProps;
  emptyMessage?: string;
  loading?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-3 h-3', className)}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-3 h-3', className)}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  emptyMessage = 'No data available.',
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return sortDir === 'asc' ? 1 : -1;
      if (bv == null) return sortDir === 'asc' ? -1 : 1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir]);

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;
  const startItem = pagination
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 1;
  const endItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-[13px] font-bold uppercase tracking-wide text-neutral-500',
                    col.sortable && 'cursor-pointer select-none hover:text-neutral-700',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUpIcon
                          className={cn(
                            sortKey === col.key && sortDir === 'asc'
                              ? 'text-neutral-700'
                              : 'text-neutral-300',
                          )}
                        />
                        <ChevronDownIcon
                          className={cn(
                            sortKey === col.key && sortDir === 'desc'
                              ? 'text-neutral-700'
                              : 'text-neutral-300',
                          )}
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="skeleton h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3 text-neutral-700', col.className)}
                    >
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as React.ReactNode) ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
          <p className="text-xs text-neutral-500">
            Showing {startItem} to {endItem} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={cn(
                'px-3 py-1 text-xs rounded border transition-colors',
                pagination.page <= 1
                  ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100',
              )}
            >
              Previous
            </button>
            <span className="text-xs text-neutral-500">
              {pagination.page} / {totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className={cn(
                'px-3 py-1 text-xs rounded border transition-colors',
                pagination.page >= totalPages
                  ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100',
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
