import { NextRequest, NextResponse } from 'next/server';
import { getPlatformPool, sql } from '@/lib/platformdb';

export async function GET(req: NextRequest) {
  try {
    const pool = await getPlatformPool();
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    // Compute next month/year correctly to handle December → January rollover
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const result = await pool.request()
      .input('startDate', sql.Date, `${year}-${String(month).padStart(2, '0')}-01`)
      .input('endDate', sql.Date, `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
      .query(`
        SELECT id, assetnum, customer_name, start_date, end_date, status
        FROM bookings
        WHERE start_date < @endDate AND end_date >= @startDate
        ORDER BY start_date
      `);

    return NextResponse.json(result.recordset);
  } catch (error: unknown) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
