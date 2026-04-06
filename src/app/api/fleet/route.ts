import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';
import { getPool, sql as dbSql } from '@/lib/db';

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

    // Stats from Fabric (Maximo)
    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN status = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN status = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM asset
      WHERE siteid = 'GBCR'
        AND status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
    `);
    const stats = statsResult.recordset[0];
    stats.utilizationRate = stats.total > 0
      ? parseFloat(((stats.hiredOut / stats.total) * 100).toFixed(1))
      : 0;

    // Build WHERE for Maximo asset query
    const conditions: string[] = [
      "a.siteid = 'GBCR'",
      "a.status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')",
    ];
    const listReq = pool.request();

    if (search) {
      conditions.push(`(a.assetnum LIKE @search OR a.description LIKE @search OR a.gb_assetregistrationno LIKE @search OR a.gb_vehiclemodel LIKE @search)`);
      listReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (status) {
      conditions.push('a.status = @status');
      listReq.input('status', sql.NVarChar, status);
    }

    // If filtering by category, we need to get matching assetnums from GBCR_Platform first
    let categoryAssetnums: string[] | null = null;
    if (category) {
      const dbPool = await getPool();
      const catResult = await dbPool.request()
        .input('category', dbSql.Int, parseInt(category))
        .query(`SELECT assetnum FROM vehicle_overrides WHERE category_id = @category`);
      categoryAssetnums = catResult.recordset.map((r: { assetnum: string }) => r.assetnum);
      if (categoryAssetnums.length === 0) {
        return NextResponse.json({
          success: true,
          data: { stats, vehicles: [], pagination: { page, pageSize, total: 0 } },
        });
      }
      // Add IN clause for matching assetnums
      const inList = categoryAssetnums.map((_, i) => `@cat${i}`).join(',');
      categoryAssetnums.forEach((an, i) => listReq.input(`cat${i}`, sql.NVarChar, an));
      conditions.push(`a.assetnum IN (${inList})`);
    }

    const whereClause = conditions.join(' AND ');

    // Count (separate request)
    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (status) countReq.input('status', sql.NVarChar, status);
    let total: number;
    if (categoryAssetnums) {
      const inList = categoryAssetnums.map((_, i) => `@cat${i}`).join(',');
      categoryAssetnums.forEach((an, i) => countReq.input(`cat${i}`, sql.NVarChar, an));
      // Rebuild conditions for count with the IN clause
      const countConditions = [
        "a.siteid = 'GBCR'",
        "a.status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')",
      ];
      if (search) countConditions.push(`(a.assetnum LIKE @search OR a.description LIKE @search OR a.gb_assetregistrationno LIKE @search OR a.gb_vehiclemodel LIKE @search)`);
      if (status) countConditions.push('a.status = @status');
      countConditions.push(`a.assetnum IN (${inList})`);
      const countWhere = countConditions.join(' AND ');
      const countResult = await countReq.query(`SELECT COUNT(*) as total FROM asset a WHERE ${countWhere}`);
      total = countResult.recordset[0].total;
    } else {
      const countResult = await countReq.query(`SELECT COUNT(*) as total FROM asset a WHERE ${whereClause}`);
      total = countResult.recordset[0].total;
    }

    // List assets from Fabric
    listReq.input('offset', sql.Int, offset);
    listReq.input('pageSize', sql.Int, pageSize);
    const result = await listReq.query(`
      SELECT
        a.assetnum as assetnum,
        a.description as description,
        a.status as status,
        a.gb_assetregistrationno as registration_no,
        a.gb_vehiclemodel as model,
        a.gb_bodycolor as colour,
        a.gb_fueltype as fuel_type,
        a.gb_transmission as transmission,
        a.gb_yearmfg as year_mfg,
        a.gb_vehiclechassisno as chassis_no,
        a.pluspcustomer as customer_code,
        a.changedate as change_date
      FROM asset a
      WHERE ${whereClause}
      ORDER BY a.changedate DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    // Enrich with overrides from GBCR_Platform (on GBITR01V)
    const assetnums = result.recordset.map((r: { assetnum: string }) => r.assetnum);
    const overridesMap: Record<string, { category_id: number | null; category_name: string | null; availability_override: string | null; override_reason: string | null; notes: string | null }> = {};

    if (assetnums.length > 0) {
      const dbPool = await getPool();
      const ovReq = dbPool.request();
      const inList = assetnums.map((_: string, i: number) => `@an${i}`).join(',');
      assetnums.forEach((an: string, i: number) => ovReq.input(`an${i}`, dbSql.NVarChar, an));
      const ovResult = await ovReq.query(`
        SELECT vo.assetnum, vo.category_id, vc.name as category_name,
          vo.availability_override, vo.override_reason, vo.notes
        FROM vehicle_overrides vo
        LEFT JOIN vehicle_categories vc ON vo.category_id = vc.id
        WHERE vo.assetnum IN (${inList})
      `);
      for (const ov of ovResult.recordset) {
        overridesMap[ov.assetnum] = ov;
      }
    }

    // Merge
    const vehicles = result.recordset.map((v: Record<string, unknown>) => ({
      ...v,
      category_id: overridesMap[v.assetnum as string]?.category_id ?? null,
      category_name: overridesMap[v.assetnum as string]?.category_name ?? null,
      availability_override: overridesMap[v.assetnum as string]?.availability_override ?? null,
      override_reason: overridesMap[v.assetnum as string]?.override_reason ?? null,
      notes: overridesMap[v.assetnum as string]?.notes ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { stats, vehicles, pagination: { page, pageSize, total } },
    });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}
