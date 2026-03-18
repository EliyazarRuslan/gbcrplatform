import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Monthly utilization for last 12 months based on status changes
    const result = await pool.request().query(`
      SELECT
        FORMAT(a.changedate, 'yyyy-MM') as month,
        COUNT(*) as totalAssets,
        SUM(CASE WHEN a.status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut
      FROM asset a
      WHERE a.siteid IN ('GBE','HAPL','MV')
        AND a.assetnum LIKE 'V%'
        AND a.changedate >= DATEADD(MONTH, -12, GETDATE())
      GROUP BY FORMAT(a.changedate, 'yyyy-MM')
      ORDER BY month
    `);

    const data = result.recordset.map((row: Record<string, unknown>) => ({
      month: row.month as string,
      rate: (row.totalAssets as number) > 0 ? ((row.hiredOut as number) / (row.totalAssets as number)) * 100 : 0,
      hiredCount: row.hiredOut as number,
      totalCount: row.totalAssets as number,
    }));

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Utilization API error:', error);
    return NextResponse.json({ error: 'Failed to fetch utilization data' }, { status: 500 });
  }
}
