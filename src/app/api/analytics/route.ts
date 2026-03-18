import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Monthly revenue
    const revenueResult = await pool.request().query(`
      SELECT FORMAT(bb.invoicedate, 'yyyy-MM') as month,
        SUM(bl.linecost) as revenue
      FROM pluspbillline bl
      INNER JOIN pluspbillbatch bb ON bl.billbatchnum = bb.billbatchnum
      WHERE bb.invoicedate >= DATEADD(MONTH, -12, GETDATE())
        AND bb.siteid IN ('GBE','HAPL','MV')
      GROUP BY FORMAT(bb.invoicedate, 'yyyy-MM')
      ORDER BY month
    `);

    // Cost breakdown by type
    const laborCostResult = await pool.request().query(`
      SELECT FORMAT(transdate, 'yyyy-MM') as month, SUM(linecost) as cost
      FROM labtrans WHERE transdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid IN ('GBE','HAPL','MV')
      GROUP BY FORMAT(transdate, 'yyyy-MM')
    `);

    const matCostResult = await pool.request().query(`
      SELECT FORMAT(actualdate, 'yyyy-MM') as month, SUM(ABS(linecost)) as cost
      FROM matusetrans WHERE actualdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid IN ('GBE','HAPL','MV') AND issuetype = 'ISSUE'
      GROUP BY FORMAT(actualdate, 'yyyy-MM')
    `);

    // WO counts by type
    const woTypeResult = await pool.request().query(`
      SELECT worktype, COUNT(*) as count
      FROM workorder WHERE reportdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid IN ('GBE','HAPL','MV')
      GROUP BY worktype ORDER BY count DESC
    `);

    // Top 10 costly vehicles
    const topCostResult = await pool.request().query(`
      SELECT TOP 10 a.assetnum, a.gb_assetregistrationno as gb_regno, a.description,
        ISNULL(a.totalcost, 0) as totalCost,
        (SELECT COUNT(*) FROM workorder wo WHERE wo.assetnum = a.assetnum) as woCount
      FROM asset a
      WHERE a.siteid IN ('GBE','HAPL','MV') AND a.assetnum LIKE 'V%'
      ORDER BY a.totalcost DESC
    `);

    // Fleet status distribution
    const statusDist = await pool.request().query(`
      SELECT status, COUNT(*) as count
      FROM asset WHERE siteid IN ('GBE','HAPL','MV') AND assetnum LIKE 'V%'
      GROUP BY status ORDER BY count DESC
    `);

    return NextResponse.json({
      revenue: revenueResult.recordset,
      laborCost: laborCostResult.recordset,
      materialCost: matCostResult.recordset,
      woByType: woTypeResult.recordset,
      topCostlyVehicles: topCostResult.recordset,
      statusDistribution: statusDist.recordset,
    });
  } catch (error: unknown) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
