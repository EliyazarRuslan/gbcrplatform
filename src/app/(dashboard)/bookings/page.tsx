'use client';

import { useState, useEffect, useRef } from 'react';
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

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/bookings?${params}`)
      .then(r => r.json())
      .then(data => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) fetchBookings();
      else alert('Failed to cancel booking');
    } catch { alert('Error cancelling booking'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this booking? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) fetchBookings();
      else alert('Failed to delete booking');
    } catch { alert('Error deleting booking'); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!window.confirm(`Change booking status to ${newStatus}?`)) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchBookings();
      else alert('Failed to update booking');
    } catch { alert('Error updating booking'); }
  };

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

      {loading ? <SkeletonTable rows={8} cols={8} /> : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-visible">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3"><Link href={`/fleet/${b.assetnum}`} className="text-primary hover:underline font-medium">{b.assetnum}</Link></td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{formatDate(b.start_date)}</td>
                  <td className="px-4 py-3">{formatDate(b.end_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">{formatCurrency(b.daily_rate)}</td>
                  <td className="px-4 py-3">{formatCurrency(b.total_amount)}</td>
                  <td className="px-4 py-3">
                    <ActionsDropdown
                      booking={b}
                      onCancel={() => handleCancel(b.id)}
                      onDelete={() => handleDelete(b.id)}
                      onStatusChange={(status) => handleStatusChange(b.id, status)}
                    />
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400">No bookings found. Create your first booking to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateBookingModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchBookings(); }} />}
    </div>
  );
}

function ActionsDropdown({
  booking,
  onCancel,
  onDelete,
  onStatusChange,
}: {
  booking: Booking;
  onCancel: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const status = (booking.status || '').toUpperCase();

  // Determine available actions based on current status
  const statusTransitions: { label: string; value: string; className: string }[] = [];
  if (status === 'PENDING') {
    statusTransitions.push({ label: 'Confirm', value: 'CONFIRMED', className: 'text-blue-700 hover:bg-blue-50' });
  }
  if (status === 'CONFIRMED') {
    statusTransitions.push({ label: 'Set Active', value: 'ACTIVE', className: 'text-green-700 hover:bg-green-50' });
  }
  if (status === 'ACTIVE') {
    statusTransitions.push({ label: 'Complete', value: 'COMPLETED', className: 'text-green-700 hover:bg-green-50' });
  }

  const canCancel = ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(status);
  const canDelete = true; // Always allow delete

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 animate-fade-in">
          {statusTransitions.map((t) => (
            <button
              key={t.value}
              onClick={() => { setOpen(false); onStatusChange(t.value); }}
              className={`w-full text-left px-4 py-2 text-sm ${t.className} transition-colors`}
            >
              {t.label}
            </button>
          ))}

          {canCancel && (
            <button
              onClick={() => { setOpen(false); onCancel(); }}
              className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {(statusTransitions.length > 0 || canCancel) && (
            <div className="border-t border-neutral-100 my-1" />
          )}

          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete Booking
          </button>
        </div>
      )}
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
