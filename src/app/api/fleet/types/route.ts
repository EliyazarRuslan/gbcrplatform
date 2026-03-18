import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();
    const result = await pool.request().query(`
      SELECT
        ISNULL(gb_product, 'Unknown') as vehicleType,
        COUNT(*) as count
      FROM asset
      WHERE siteid IN ('GBE','HAPL','MV')
        AND assetnum LIKE 'V%'
      GROUP BY gb_product
      ORDER BY count DESC
    `);

    return NextResponse.json(result.recordset);
  } catch (error: unknown) {
    console.error('Vehicle types error:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle types' }, { status: 500 });
  }
}
