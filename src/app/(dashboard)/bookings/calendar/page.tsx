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
    const controller = new AbortController();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetch(`/api/bookings/calendar?year=${year}&month=${month}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== 'AbortError') throw err; });
    return () => controller.abort();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/bookings" className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-[26px] font-bold">Booking Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-[18px] font-bold min-w-[160px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="p-2 hover:bg-neutral-200 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 min-w-[560px]">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="px-2 py-3 text-center text-[13px] font-bold text-neutral-500 bg-neutral-50">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 min-w-[560px]">
          {/* Padding */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[70px] md:min-h-[100px] p-1 md:p-2 border-b border-r border-neutral-100 bg-neutral-50" />
          ))}
          {days.map(day => {
            const dayBookings = getBookingsForDay(day);
            return (
              <div key={day.toISOString()} className={`min-h-[70px] md:min-h-[100px] p-1 md:p-2 border-b border-r border-neutral-100 ${!isSameMonth(day, currentDate) ? 'bg-neutral-50' : ''} ${isToday(day) ? 'bg-blue-50' : ''}`}>
                <p className={`text-[13px] font-bold mb-1 ${isToday(day) ? 'text-blue-600' : 'text-neutral-600'}`}>{format(day, 'd')}</p>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map(b => (
                    <div key={b.id} className={`text-[12px] font-semibold px-1.5 py-0.5 rounded truncate ${statusColor(b.status)}`} title={`${b.assetnum} - ${b.customer_name}`}>
                      {b.assetnum}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-[12px] font-medium text-neutral-400">+{dayBookings.length - 3} more</p>
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
