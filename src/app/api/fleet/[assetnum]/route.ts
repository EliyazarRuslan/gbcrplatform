import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assetnum: string }> }) {
  try {
    const { assetnum } = await params;
    const pool = await getMaxPool();

    // Vehicle info
    const vehicleResult = await pool.request().query(`
      SELECT a.assetnum, a.description, a.status,
        a.siteid, a.pluspcustomer, a.serialnum,
        a.gb_assetregistrationno as gb_regno,
        a.gb_franchisecode as gb_make,
        a.gb_vehiclemodel as gb_model,
        a.gb_product as gb_vehicletype,
        a.changedate, a.installdate, a.purchaseprice,
        a.totdowntime, a.totunchargedcost, a.totalcost
      FROM asset a WHERE a.assetnum = '${assetnum.replace(/'/g, "''")}'
    `);
    if (vehicleResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    const vehicle = vehicleResult.recordset[0];

    // Work orders
    const woResult = await pool.request().query(`
      SELECT TOP 50 wonum, description, status, worktype, reportdate, actfinish,
        pluspcustomer, estdur
      FROM workorder
      WHERE assetnum = '${assetnum.replace(/'/g, "''")}'
      ORDER BY reportdate DESC
    `);

    // Labor costs
    const laborResult = await pool.request().query(`
      SELECT ISNULL(SUM(linecost), 0) as totalLabor
      FROM labtrans
      WHERE refwo IN (SELECT wonum FROM workorder WHERE assetnum = '${assetnum.replace(/'/g, "''")}')
    `);

    // Material costs
    const matResult = await pool.request().query(`
      SELECT ISNULL(SUM(ABS(linecost)), 0) as totalMaterial
      FROM matusetrans
      WHERE assetnum = '${assetnum.replace(/'/g, "''")}'
        AND issuetype = 'ISSUE'
    `);

    // Revenue from billing
    const revResult = await pool.request().query(`
      SELECT ISNULL(SUM(bl.linecost), 0) as totalRevenue
      FROM pluspbillline bl
      INNER JOIN workorder wo ON bl.refwo = wo.wonum
      WHERE wo.assetnum = '${assetnum.replace(/'/g, "''")}'
    `);

    // Last service date
    const lastServiceResult = await pool.request().query(`
      SELECT TOP 1 actfinish
      FROM workorder
      WHERE assetnum = '${assetnum.replace(/'/g, "''")}'
        AND worktype IN ('PM','CM','SR')
        AND actfinish IS NOT NULL
      ORDER BY actfinish DESC
    `);

    return NextResponse.json({
      ...vehicle,
      laborCost: laborResult.recordset[0].totalLabor,
      materialCost: matResult.recordset[0].totalMaterial,
      totalRevenue: revResult.recordset[0].totalRevenue,
      workOrderCount: woResult.recordset.length,
      lastServiceDate: lastServiceResult.recordset[0]?.actfinish || null,
      workOrders: woResult.recordset,
    });
  } catch (error: unknown) {
    console.error('Vehicle detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle details' }, { status: 500 });
  }
}
