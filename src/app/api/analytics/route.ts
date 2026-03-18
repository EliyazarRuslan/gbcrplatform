import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Monthly revenue - GBCR site
    // pluspbillline has no linecost or invoicedate; use billedprice and scheduledate
    const revenueResult = await pool.request().query(`
      SELECT FORMAT(bb.scheduledate, 'yyyy-MM') as month,
        SUM(bl.billedprice) as revenue
      FROM pluspbillline bl
      INNER JOIN pluspbillbatch bb ON bl.billbatchnum = bb.billbatchnum
      WHERE bb.scheduledate >= DATEADD(MONTH, -12, GETDATE())
        AND bl.siteid = 'GBCR'
      GROUP BY FORMAT(bb.scheduledate, 'yyyy-MM')
      ORDER BY month
    `);

    // Labor cost breakdown - GBCR site
    const laborCostResult = await pool.request().query(`
      SELECT FORMAT(transdate, 'yyyy-MM') as month, SUM(linecost) as cost
      FROM labtrans WHERE transdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR'
      GROUP BY FORMAT(transdate, 'yyyy-MM')
      ORDER BY month
    `);

    // Material cost breakdown - GBCR site
    const matCostResult = await pool.request().query(`
      SELECT FORMAT(actualdate, 'yyyy-MM') as month, SUM(ABS(linecost)) as cost
      FROM matusetrans WHERE actualdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR' AND issuetype = 'ISSUE'
      GROUP BY FORMAT(actualdate, 'yyyy-MM')
      ORDER BY month
    `);

    // WO counts by type - GBCR site
    const woTypeResult = await pool.request().query(`
      SELECT worktype, COUNT(*) as count
      FROM workorder WHERE reportdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR'
      GROUP BY worktype ORDER BY count DESC
    `);

    // Top 10 costly vehicles - GBCR site
    const topCostResult = await pool.request().query(`
      SELECT TOP 10 a.assetnum, a.gb_assetregistrationno as gb_regno, a.description,
        ISNULL(a.totalcost, 0) as totalCost,
        (SELECT COUNT(*) FROM workorder wo WHERE wo.assetnum = a.assetnum AND wo.siteid = 'GBCR') as woCount
      FROM asset a
      WHERE a.siteid = 'GBCR'
      ORDER BY a.totalcost DESC
    `);

    // Fleet status distribution - GBCR site
    const statusDist = await pool.request().query(`
      SELECT status, COUNT(*) as count
      FROM asset WHERE siteid = 'GBCR'
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
    // Return empty data gracefully so the page doesn't crash
    return NextResponse.json({
      revenue: [],
      laborCost: [],
      materialCost: [],
      woByType: [],
      topCostlyVehicles: [],
      statusDistribution: [],
    });
  }
}
