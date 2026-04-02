import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN status = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN status = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM asset
      WHERE siteid = 'GBCR'
        AND status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
    `);

    const stats = result.recordset[0];
    stats.utilizationRate = stats.total > 0
      ? parseFloat(((stats.hiredOut / stats.total) * 100).toFixed(1))
      : 0;

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Fleet stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet stats' }, { status: 500 });
  }
}
