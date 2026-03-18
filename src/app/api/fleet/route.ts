import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET(req: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const customer = searchParams.get('customer') || '';
    const type = searchParams.get('type') || '';
    const statsOnly = searchParams.get('statsOnly') === 'true';

    // Stats query
    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN a.status = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN a.status = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN a.status = 'BOOKED' THEN 1 ELSE 0 END) as booked,
        SUM(CASE WHEN a.status IN ('IN SERVICE','LIMITING SERVICE') THEN 1 ELSE 0 END) as inService,
        SUM(CASE WHEN a.status = 'DECOMMISSIONED' THEN 1 ELSE 0 END) as decommissioned
      FROM asset a
      WHERE a.siteid IN ('GBE','HAPL','MV')
        AND a.assetnum LIKE 'V%'
    `);
    const stats = statsResult.recordset[0];
    stats.utilizationRate = stats.total > 0 ? ((stats.hiredOut / stats.total) * 100) : 0;

    if (statsOnly) {
      return NextResponse.json({ stats });
    }

    // Build WHERE clause
    let where = "a.siteid IN ('GBE','HAPL','MV') AND a.assetnum LIKE 'V%'";
    if (search) {
      where += ` AND (a.assetnum LIKE '%${search.replace(/'/g, "''")}%' OR a.description LIKE '%${search.replace(/'/g, "''")}%' OR a.serialnum LIKE '%${search.replace(/'/g, "''")}%' OR a.gb_assetregistrationno LIKE '%${search.replace(/'/g, "''")}%')`;
    }
    if (status) where += ` AND a.status = '${status.replace(/'/g, "''")}'`;
    if (customer) where += ` AND a.pluspcustomer = '${customer.replace(/'/g, "''")}'`;
    if (type) where += ` AND a.gb_product = '${type.replace(/'/g, "''")}'`;

    const offset = (page - 1) * limit;
    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM asset a WHERE ${where}`);
    const totalCount = countResult.recordset[0].total;

    const result = await pool.request().query(`
      SELECT
        a.assetnum, a.description, a.status,
        a.siteid, a.pluspcustomer, a.serialnum,
        a.gb_assetregistrationno as gb_regno,
        a.gb_franchisecode as gb_make,
        a.gb_vehiclemodel as gb_model,
        a.gb_product as gb_vehicletype,
        a.changedate, a.installdate, a.purchaseprice,
        a.totdowntime, a.totunchargedcost, a.totalcost
      FROM asset a
      WHERE ${where}
      ORDER BY a.changedate DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    return NextResponse.json({
      stats,
      vehicles: result.recordset,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    });
  } catch (error: unknown) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}
