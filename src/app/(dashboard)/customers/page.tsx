'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  customer: string; name: string; department: string | null;
  payterm: string | null; creditlimit: number | null;
  activeRentals: number; totalRevenue: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    !search || c.customer?.toLowerCase().includes(search.toLowerCase()) || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Customers</h1>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
        className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-primary-light" />

      {loading ? <SkeletonTable rows={10} cols={6} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Pay Term</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Credit Limit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Active Rentals</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.customer} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{c.customer}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3">{c.department || '-'}</td>
                  <td className="px-4 py-3">{c.payterm || '-'}</td>
                  <td className="px-4 py-3">{formatCurrency(c.creditlimit)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.activeRentals > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'}`}>{c.activeRentals}</span></td>
                  <td className="px-4 py-3">{formatCurrency(c.totalRevenue)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
