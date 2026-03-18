'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/bookings?${params}`)
      .then(r => r.json())
      .then(data => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const statuses = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div className="flex gap-3">
          <Link href="/bookings/calendar" className="px-4 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50">
            Calendar View
          </Link>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            New Booking
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable rows={8} cols={7} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Daily Rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3"><Link href={`/fleet/${b.assetnum}`} className="text-blue-600 hover:underline">{b.assetnum}</Link></td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{formatDate(b.start_date)}</td>
                  <td className="px-4 py-3">{formatDate(b.end_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">{formatCurrency(b.daily_rate)}</td>
                  <td className="px-4 py-3">{formatCurrency(b.total_amount)}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No bookings found. Create your first booking to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreate && <CreateBookingModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); window.location.reload(); }} />}
    </div>
  );
}

function CreateBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ assetnum: '', customer_name: '', customer_code: '', start_date: '', end_date: '', daily_rate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null }),
      });
      if (res.ok) onCreated();
      else alert('Failed to create booking');
    } catch { alert('Error creating booking'); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl animate-fade-in">
        <h2 className="text-lg font-bold mb-4">New Booking</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600">Vehicle Asset No</label>
              <input required value={form.assetnum} onChange={e => setForm({...form, assetnum: e.target.value})}
                className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-neutral-600">Customer Code</label>
              <input required value={form.customer_code} onChange={e => setForm({...form, customer_code: e.target.value})}
                className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm text-neutral-600">Customer Name</label>
            <input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})}
              className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600">Start Date</label>
              <input type="date" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-neutral-600">End Date</label>
              <input type="date" required value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm text-neutral-600">Daily Rate (SGD)</label>
            <input type="number" step="0.01" value={form.daily_rate} onChange={e => setForm({...form, daily_rate: e.target.value})}
              className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-neutral-600">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-light focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
