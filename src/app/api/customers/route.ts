import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';

export async function GET(request: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * pageSize;

    // Build WHERE
    const conditions: string[] = [
      "c.gb_siteid = 'GBCR'",
      "c.STATUS = 'ACTIVE'",
    ];
    const listReq = pool.request();

    if (search) {
      conditions.push(`(c.CUSTOMER LIKE @search OR c.NAME LIKE @search OR c.gb_email LIKE @search OR c.COMPANYPHONE LIKE @search)`);
      listReq.input('search', sql.NVarChar, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM PLUSPCUSTOMER c WHERE ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Active rentals subquery
    listReq.input('offset', sql.Int, offset);
    listReq.input('pageSize', sql.Int, pageSize);

    const result = await listReq.query(`
      SELECT
        c.CUSTOMER as customer_code,
        c.NAME as name,
        c.COMPANYPHONE as phone,
        c.gb_email as email,
        c.STREETADDRESS as address,
        c.POSTALCODE as postal_code,
        c.gb_payterm as pay_term,
        c.STATUS as status,
        (SELECT COUNT(*) FROM ASSET a
         WHERE a.PLUSPCUSTOMER = c.CUSTOMER
         AND a.SITEID = 'GBCR'
         AND a.STATUS = 'HIRED OUT') as active_rentals
      FROM PLUSPCUSTOMER c
      WHERE ${whereClause}
      ORDER BY c.NAME
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return NextResponse.json({
      success: true,
      data: {
        customers: result.recordset,
        pagination: { page, pageSize, total },
      },
    });
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
}
