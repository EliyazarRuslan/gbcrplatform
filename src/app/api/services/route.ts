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
    const worktype = searchParams.get('worktype') || '';

    let where = "w.siteid IN ('GBE','HAPL','MV') AND w.reportdate >= '2024-01-01'";
    if (search) where += ` AND (w.wonum LIKE '%${search.replace(/'/g,"''")}%' OR w.description LIKE '%${search.replace(/'/g,"''")}%' OR w.assetnum LIKE '%${search.replace(/'/g,"''")}%')`;
    if (status) where += ` AND w.status = '${status.replace(/'/g,"''")}'`;
    if (worktype) where += ` AND w.worktype = '${worktype.replace(/'/g,"''")}'`;

    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM workorder w WHERE ${where}`);
    const total = countResult.recordset[0].total;
    const offset = (page - 1) * limit;

    const result = await pool.request().query(`
      SELECT w.wonum, w.description, w.status, w.worktype, w.assetnum,
        w.reportdate, w.actfinish, w.pluspcustomer, w.siteid, w.estdur,
        w.actlabcost, w.actmatcost, w.actservcost
      FROM workorder w
      WHERE ${where}
      ORDER BY w.reportdate DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    return NextResponse.json({
      workOrders: result.recordset,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error('Services API error:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}
