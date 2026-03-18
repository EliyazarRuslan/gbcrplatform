import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const worktype = searchParams.get('worktype') || '';

    const conditions: string[] = ["w.siteid = 'GBCR'", "w.reportdate >= '2024-01-01'"];
    const countRequest = pool.request();
    const dataRequest = pool.request();

    if (search) {
      conditions.push(`(w.wonum LIKE @search OR w.description LIKE @search OR w.assetnum LIKE @search)`);
      const searchVal = `%${search}%`;
      countRequest.input('search', sql.VarChar, searchVal);
      dataRequest.input('search', sql.VarChar, searchVal);
    }
    if (status) {
      conditions.push(`w.status = @status`);
      countRequest.input('status', sql.VarChar, status);
      dataRequest.input('status', sql.VarChar, status);
    }
    if (worktype) {
      conditions.push(`w.worktype = @worktype`);
      countRequest.input('worktype', sql.VarChar, worktype);
      dataRequest.input('worktype', sql.VarChar, worktype);
    }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countResult = await countRequest.query(`SELECT COUNT(*) as total FROM workorder w WHERE ${where}`);
    const total = countResult.recordset[0].total;

    const result = await dataRequest.query(`
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
    return NextResponse.json({
      workOrders: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    });
  }
}
