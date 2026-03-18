import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Revenue by month (from billing lines linked to vehicle work orders)
    const revenueResult = await pool.request().query(`
      SELECT
        FORMAT(bb.invoicedate, 'yyyy-MM') as month,
        SUM(bl.linecost) as revenue
      FROM pluspbillline bl
      INNER JOIN pluspbillbatch bb ON bl.billbatchnum = bb.billbatchnum
      WHERE bb.invoicedate >= DATEADD(MONTH, -12, GETDATE())
        AND bb.siteid IN ('GBE','HAPL','MV')
      GROUP BY FORMAT(bb.invoicedate, 'yyyy-MM')
    `);

    // Cost by month (labor + material)
    const costResult = await pool.request().query(`
      SELECT month, SUM(cost) as cost FROM (
        SELECT FORMAT(transdate, 'yyyy-MM') as month, SUM(linecost) as cost
        FROM labtrans
        WHERE transdate >= DATEADD(MONTH, -12, GETDATE())
          AND siteid IN ('GBE','HAPL','MV')
        GROUP BY FORMAT(transdate, 'yyyy-MM')
        UNION ALL
        SELECT FORMAT(actualdate, 'yyyy-MM') as month, SUM(ABS(linecost)) as cost
        FROM matusetrans
        WHERE actualdate >= DATEADD(MONTH, -12, GETDATE())
          AND siteid IN ('GBE','HAPL','MV')
          AND issuetype = 'ISSUE'
        GROUP BY FORMAT(actualdate, 'yyyy-MM')
      ) combined
      GROUP BY month
    `);

    // Merge
    const months = new Set<string>();
    const revMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};

    revenueResult.recordset.forEach((r: Record<string, unknown>) => {
      const m = r.month as string;
      months.add(m);
      revMap[m] = r.revenue as number;
    });
    costResult.recordset.forEach((r: Record<string, unknown>) => {
      const m = r.month as string;
      months.add(m);
      costMap[m] = r.cost as number;
    });

    const data = Array.from(months).sort().map(month => ({
      month,
      revenue: revMap[month] || 0,
      cost: costMap[month] || 0,
      profit: (revMap[month] || 0) - (costMap[month] || 0),
    }));

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Revenue/Cost API error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue/cost data' }, { status: 500 });
  }
}
