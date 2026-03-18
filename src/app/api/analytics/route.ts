import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Monthly rental revenue from active agreements (pluspagreement)
    const revenueResult = await pool.request().query(`
      SELECT FORMAT(startdate, 'yyyy-MM') as month,
        COUNT(*) as agreements,
        SUM(gb_rentalamount) as revenue
      FROM pluspagreement
      WHERE orgid = 'GOLDBELL' AND gb_entity = 'GBCR'
        AND status IN ('ACTIVE', 'COMPLETE')
        AND startdate >= DATEADD(MONTH, -12, GETDATE())
      GROUP BY FORMAT(startdate, 'yyyy-MM')
      ORDER BY month
    `);

    // Agreement status summary
    const agreementStatusResult = await pool.request().query(`
      SELECT status, COUNT(*) as count,
        SUM(gb_rentalamount) as total_rental
      FROM pluspagreement
      WHERE orgid = 'GOLDBELL' AND gb_entity = 'GBCR'
      GROUP BY status
      ORDER BY count DESC
    `);

    // Active agreements total value
    const activeValueResult = await pool.request().query(`
      SELECT
        COUNT(*) as active_count,
        SUM(gb_rentalamount) as active_rental,
        SUM(gb_depositamount) as active_deposits
      FROM pluspagreement
      WHERE orgid = 'GOLDBELL' AND gb_entity = 'GBCR' AND status = 'ACTIVE'
    `);

    // PV vs CV breakdown
    const productBreakdownResult = await pool.request().query(`
      SELECT
        CASE
          WHEN gb_product = 'PV' THEN 'Passenger Vehicle (PV)'
          WHEN gb_product = 'CV' THEN 'Commercial Vehicle (CV)'
          WHEN gb_product = 'BV' THEN 'Bus/Van (BV)'
          ELSE 'Unclassified'
        END as product,
        gb_product as product_code,
        COUNT(*) as count,
        SUM(gb_rentalamount) as total_rental
      FROM pluspagreement
      WHERE orgid = 'GOLDBELL' AND gb_entity = 'GBCR' AND status = 'ACTIVE'
      GROUP BY gb_product
      ORDER BY COUNT(*) DESC
    `);

    // Monthly revenue split by PV/CV
    const revenueBySplitResult = await pool.request().query(`
      SELECT
        FORMAT(startdate, 'yyyy-MM') as month,
        ISNULL(gb_product, 'Other') as product,
        COUNT(*) as agreements,
        SUM(gb_rentalamount) as revenue
      FROM pluspagreement
      WHERE orgid = 'GOLDBELL' AND gb_entity = 'GBCR'
        AND status IN ('ACTIVE', 'COMPLETE')
        AND startdate >= DATEADD(MONTH, -12, GETDATE())
        AND gb_product IN ('PV', 'CV')
      GROUP BY FORMAT(startdate, 'yyyy-MM'), gb_product
      ORDER BY month, product
    `);

    // WO counts by type - GBCR site
    const woTypeResult = await pool.request().query(`
      SELECT worktype, COUNT(*) as count
      FROM workorder WHERE reportdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR'
      GROUP BY worktype ORDER BY count DESC
    `);

    // Top vehicles by rental amount (active agreements)
    const topVehiclesResult = await pool.request().query(`
      SELECT TOP 10
        a.assetnum,
        a.gb_assetregistrationno as gb_regno,
        a.description,
        COUNT(ag.agreement) as agreement_count,
        SUM(ag.gb_rentalamount) as total_rental
      FROM pluspagreement ag
      INNER JOIN asset a ON ag.assetnum COLLATE DATABASE_DEFAULT = a.assetnum COLLATE DATABASE_DEFAULT AND a.siteid = 'GBCR'
      WHERE ag.orgid = 'GOLDBELL' AND ag.gb_entity = 'GBCR' AND ag.status = 'ACTIVE'
      GROUP BY a.assetnum, a.gb_assetregistrationno, a.description
      ORDER BY total_rental DESC
    `);

    // Fleet status distribution - GBCR site (active fleet only)
    const statusDist = await pool.request().query(`
      SELECT status, COUNT(*) as count
      FROM asset WHERE siteid = 'GBCR'
        AND status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
      GROUP BY status ORDER BY count DESC
    `);

    return NextResponse.json({
      revenue: revenueResult.recordset,
      agreementStatus: agreementStatusResult.recordset,
      activeValue: activeValueResult.recordset[0],
      productBreakdown: productBreakdownResult.recordset,
      revenueBySplit: revenueBySplitResult.recordset,
      woByType: woTypeResult.recordset,
      topVehicles: topVehiclesResult.recordset,
      statusDistribution: statusDist.recordset,
    });
  } catch (error: unknown) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      revenue: [],
      agreementStatus: [],
      activeValue: { active_count: 0, active_rental: 0, active_deposits: 0 },
      productBreakdown: [],
      revenueBySplit: [],
      woByType: [],
      topVehicles: [],
      statusDistribution: [],
    });
  }
}
