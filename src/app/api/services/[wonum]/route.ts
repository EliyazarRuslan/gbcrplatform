import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';
import sql from 'mssql';

export async function GET(req: NextRequest, { params }: { params: Promise<{ wonum: string }> }) {
  try {
    const { wonum } = await params;
    const pool = await getMaxPool();

    const woResult = await pool.request()
      .input('wonum', sql.VarChar, wonum)
      .query(`SELECT w.* FROM workorder w WHERE w.wonum = @wonum AND w.siteid = 'GBCR'`);

    if (woResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    const laborResult = await pool.request()
      .input('wonum', sql.VarChar, wonum)
      .query(`
        SELECT laborcode, craft, startdate, finishdate, regularhrs, linecost, gb_chargeable
        FROM labtrans WHERE refwo = @wonum ORDER BY startdate DESC
      `);

    const matResult = await pool.request()
      .input('wonum', sql.VarChar, wonum)
      .query(`
        SELECT itemnum, description, ABS(quantity) as quantity, linecost, storeloc, actualdate
        FROM matusetrans WHERE wonum = @wonum AND issuetype = 'ISSUE'
        ORDER BY actualdate DESC
      `);

    return NextResponse.json({
      ...woResult.recordset[0],
      labor: laborResult.recordset,
      materials: matResult.recordset,
      totalLabor: laborResult.recordset.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.linecost as number) || 0), 0),
      totalMaterial: matResult.recordset.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.linecost as number) || 0), 0),
    });
  } catch (error: unknown) {
    console.error('WO detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch work order' }, { status: 500 });
  }
}
