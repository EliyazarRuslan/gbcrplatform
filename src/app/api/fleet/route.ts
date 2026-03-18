import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';

export async function GET(request: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const offset = (page - 1) * pageSize;

    // Stats
    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN STATUS = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN STATUS = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN STATUS = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN STATUS = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM ASSET
      WHERE SITEID = 'GBCR'
        AND STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
    `);
    const stats = statsResult.recordset[0];
    stats.utilizationRate = stats.total > 0
      ? parseFloat(((stats.hiredOut / stats.total) * 100).toFixed(1))
      : 0;

    // Build WHERE
    const conditions: string[] = [
      "a.SITEID = 'GBCR'",
      "a.STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')",
    ];
    const listReq = pool.request();

    if (search) {
      conditions.push(`(a.ASSETNUM LIKE @search OR a.DESCRIPTION LIKE @search OR a.gb_assetregistrationno LIKE @search OR a.gb_vehiclemodel LIKE @search)`);
      listReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (status) {
      conditions.push('a.STATUS = @status');
      listReq.input('status', sql.NVarChar, status);
    }
    if (category) {
      conditions.push('vo.category_id = @category');
      listReq.input('category', sql.Int, parseInt(category));
    }

    const whereClause = conditions.join(' AND ');

    // Count (separate request object to avoid duplicate input names)
    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (status) countReq.input('status', sql.NVarChar, status);
    if (category) countReq.input('category', sql.Int, parseInt(category));

    const countResult = await countReq.query(`
      SELECT COUNT(*) as total
      FROM ASSET a
      LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM COLLATE DATABASE_DEFAULT = vo.assetnum COLLATE DATABASE_DEFAULT
      WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // List
    listReq.input('offset', sql.Int, offset);
    listReq.input('pageSize', sql.Int, pageSize);
    const result = await listReq.query(`
      SELECT
        a.ASSETNUM as assetnum,
        a.DESCRIPTION as description,
        a.STATUS as status,
        a.gb_assetregistrationno as registration_no,
        a.gb_vehiclemodel as model,
        a.gb_bodycolor as colour,
        a.gb_fueltype as fuel_type,
        a.gb_transmission as transmission,
        a.gb_yearmfg as year_mfg,
        a.gb_vehiclechassisno as chassis_no,
        a.PLUSPCUSTOMER as customer_code,
        a.CHANGEDATE as change_date,
        vo.category_id,
        vc.name as category_name,
        vo.availability_override,
        vo.override_reason,
        vo.notes
      FROM ASSET a
      LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM COLLATE DATABASE_DEFAULT = vo.assetnum COLLATE DATABASE_DEFAULT
      LEFT JOIN GBCR_Platform.dbo.vehicle_categories vc ON vo.category_id = vc.id
      WHERE ${whereClause}
      ORDER BY a.CHANGEDATE DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        vehicles: result.recordset,
        pagination: { page, pageSize, total },
      },
    });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}
