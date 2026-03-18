import { NextRequest, NextResponse } from 'next/server';
import { getPlatformPool, sql } from '@/lib/platformdb';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const pool = await getPlatformPool();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const month = searchParams.get('month') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let where = '1=1';
    if (status) where += ` AND b.status = @status`;
    if (month) where += ` AND FORMAT(b.start_date, 'yyyy-MM') = @month`;

    const request = pool.request();
    if (status) request.input('status', sql.VarChar, status);
    if (month) request.input('month', sql.VarChar, month);

    const countResult = await request.query(`SELECT COUNT(*) as total FROM bookings b WHERE ${where}`);
    const total = countResult.recordset[0].total;

    const offset = (page - 1) * limit;
    const request2 = pool.request();
    if (status) request2.input('status', sql.VarChar, status);
    if (month) request2.input('month', sql.VarChar, month);

    request2.input('offset', sql.Int, offset);
    request2.input('limit', sql.Int, limit);
    const result = await request2.query(`
      SELECT b.* FROM bookings b
      WHERE ${where}
      ORDER BY b.start_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return NextResponse.json({
      bookings: result.recordset,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pool = await getPlatformPool();
    const body = await req.json();
    const id = uuidv4();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('assetnum', sql.VarChar(50), body.assetnum)
      .input('customer_name', sql.VarChar(200), body.customer_name)
      .input('customer_code', sql.VarChar(50), body.customer_code)
      .input('start_date', sql.Date, body.start_date)
      .input('end_date', sql.Date, body.end_date)
      .input('status', sql.VarChar(20), 'PENDING')
      .input('daily_rate', sql.Decimal(18, 2), body.daily_rate || null)
      .input('notes', sql.NVarChar(sql.MAX), body.notes || null)
      .query(`
        INSERT INTO bookings (id, assetnum, customer_name, customer_code, start_date, end_date, status, daily_rate, notes, created_at, updated_at)
        VALUES (@id, @assetnum, @customer_name, @customer_code, @start_date, @end_date, @status, @daily_rate, @notes, GETDATE(), GETDATE())
      `);

    return NextResponse.json({ id, message: 'Booking created' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Bookings POST error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
