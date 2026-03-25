'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import FAB from '@/components/ui/fab';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchBookings = (showLoading = true) => {
    if (showLoading) setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/bookings?${params}`)
      .then(r => r.json())
      .then(data => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  useEffect(() => {
    const interval = setInterval(() => fetchBookings(false), 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Bookings</h1>
          <p className="text-sm text-neutral-400 mt-0.5">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/bookings/calendar" className="px-4 py-2 text-sm border border-neutral-200/80 rounded-xl hover:bg-white hover:border-neutral-300 transition-all font-medium text-neutral-600">
            Calendar View
          </Link>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2 text-sm bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl hover:shadow-md hover:shadow-primary/20 transition-all font-medium">
            New Booking
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="shrink-0 px-4 py-2 text-sm bg-white border border-neutral-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all appearance-none cursor-pointer">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable rows={8} cols={8} /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-neutral-200/80 overflow-visible shadow-sm shadow-neutral-900/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/80">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Start Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">End Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Daily Rate</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Created By</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-neutral-50 hover:bg-neutral-50/60 transition-colors">
                    <td className="px-4 py-3"><a href={`/fleet/${b.assetnum}`} className="text-primary hover:text-primary-dark font-semibold transition-colors">{b.assetnum}</a></td>
                    <td className="px-4 py-3 text-neutral-700">{b.customer_name}</td>
                    <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{formatDate(b.start_date)}</td>
                    <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{formatDate(b.end_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-neutral-700 font-medium">{formatCurrency(b.daily_rate)}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{(b as unknown as Record<string, string>).created_by_name || '-'}</td>
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
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-neutral-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      No bookings found. Create your first booking to get started.
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 px-4 py-12 text-center text-sm text-neutral-400">
                No bookings found. Create your first booking to get started.
              </div>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/fleet/${b.assetnum}`)}
                  className="bg-white rounded-xl border border-neutral-200/80 p-4 cursor-pointer active:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary text-sm">{b.assetnum}</p>
                      <p className="text-xs text-neutral-600 mt-0.5">{b.customer_name}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                    <span>{formatDate(b.start_date)}</span>
                    <span className="text-neutral-300">→</span>
                    <span>{formatDate(b.end_date)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-700">{formatCurrency(b.daily_rate)}/day</span>
                    {(b as unknown as Record<string, string>).created_by_name && (
                      <span className="text-xs text-neutral-400">{(b as unknown as Record<string, string>).created_by_name}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* FAB for mobile */}
      <FAB label="New Booking" onClick={() => setShowCreate(true)} />

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

  const statusTransitions: { label: string; value: string; className: string }[] = [];
  if (status === 'PENDING') {
    statusTransitions.push({ label: 'Confirm', value: 'CONFIRMED', className: 'text-blue-700 hover:bg-blue-50' });
  }
  if (status === 'CONFIRMED') {
    statusTransitions.push({ label: 'Set Active', value: 'ACTIVE', className: 'text-emerald-700 hover:bg-emerald-50' });
  }
  if (status === 'ACTIVE') {
    statusTransitions.push({ label: 'Complete', value: 'COMPLETED', className: 'text-emerald-700 hover:bg-emerald-50' });
  }

  const canCancel = ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(status);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl shadow-black/10 border border-neutral-200/80 py-1 z-50 animate-scale-in">
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-black/10 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-neutral-900">New Booking</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Vehicle Asset No</label>
              <input required value={form.assetnum} onChange={e => setForm({...form, assetnum: e.target.value})}
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Customer Code</label>
              <input required value={form.customer_code} onChange={e => setForm({...form, customer_code: e.target.value})}
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Customer Name</label>
            <input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})}
              className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Start Date</label>
              <input type="date" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">End Date</label>
              <input type="date" required value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Daily Rate (SGD)</label>
            <input type="number" step="0.01" value={form.daily_rate} onChange={e => setForm({...form, daily_rate: e.target.value})}
              className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all bg-neutral-50/50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full mt-1.5 px-3.5 py-2.5 text-sm border border-neutral-200/80 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all resize-none bg-neutral-50/50 focus:bg-white" />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-neutral-200/80 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all font-medium text-neutral-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl hover:shadow-md hover:shadow-primary/20 transition-all font-medium disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
