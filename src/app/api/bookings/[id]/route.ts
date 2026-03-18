import { NextRequest, NextResponse } from 'next/server';
import { getPlatformPool, sql } from '@/lib/platformdb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPlatformPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM bookings WHERE id = @id');

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json(result.recordset[0]);
  } catch (error: unknown) {
    console.error('Booking GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPlatformPool();
    const body = await req.json();

    const fields: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (body.status !== undefined) { fields.push('status = @status'); request.input('status', sql.VarChar(20), body.status); }
    if (body.start_date !== undefined) { fields.push('start_date = @start_date'); request.input('start_date', sql.Date, body.start_date); }
    if (body.end_date !== undefined) { fields.push('end_date = @end_date'); request.input('end_date', sql.Date, body.end_date); }
    if (body.daily_rate !== undefined) { fields.push('daily_rate = @daily_rate'); request.input('daily_rate', sql.Decimal(18, 2), body.daily_rate); }
    if (body.notes !== undefined) { fields.push('notes = @notes'); request.input('notes', sql.NVarChar(sql.MAX), body.notes); }
    if (body.total_amount !== undefined) { fields.push('total_amount = @total_amount'); request.input('total_amount', sql.Decimal(18, 2), body.total_amount); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = GETDATE()');
    await request.query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = @id`);

    return NextResponse.json({ message: 'Booking updated' });
  } catch (error: unknown) {
    console.error('Booking PUT error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPlatformPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM bookings WHERE id = @id');
    return NextResponse.json({ message: 'Booking deleted' });
  } catch (error: unknown) {
    console.error('Booking DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
