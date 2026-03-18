'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isWithinInterval } from 'date-fns';
import { statusColor } from '@/lib/utils';

interface CalendarBooking {
  id: string;
  assetnum: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function BookingCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetch(`/api/bookings/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => setBookings(Array.isArray(data) ? data : []));
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      try {
        return isWithinInterval(day, { start: parseISO(b.start_date), end: parseISO(b.end_date) });
      } catch { return false; }
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bookings" className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-2xl font-bold">Booking Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-lg font-semibold min-w-[160px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-neutral-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-neutral-500 bg-neutral-50">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Padding */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px] p-2 border-b border-r border-neutral-100 bg-neutral-50" />
          ))}
          {days.map(day => {
            const dayBookings = getBookingsForDay(day);
            return (
              <div key={day.toISOString()} className={`min-h-[100px] p-2 border-b border-r border-neutral-100 ${!isSameMonth(day, currentDate) ? 'bg-neutral-50' : ''} ${isToday(day) ? 'bg-blue-50' : ''}`}>
                <p className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-blue-600' : 'text-neutral-600'}`}>{format(day, 'd')}</p>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map(b => (
                    <div key={b.id} className={`text-xs px-1.5 py-0.5 rounded truncate ${statusColor(b.status)}`} title={`${b.assetnum} - ${b.customer_name}`}>
                      {b.assetnum}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-xs text-neutral-400">+{dayBookings.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
