import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';

export async function GET(request: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeRentals') === 'true';
    const offset = (page - 1) * pageSize;

    // Build base query depending on filter
    if (activeOnly) {
      // Only customers with active rentals — join through ASSET
      const listReq = pool.request();
      const conditions: string[] = [
        "c.gb_siteid = 'GBCR'",
        "c.status = 'ACTIVE'",
      ];

      if (search) {
        conditions.push(`(c.customer LIKE @search OR c.name LIKE @search OR c.gb_email LIKE @search)`);
        listReq.input('search', sql.NVarChar, `%${search}%`);
      }

      const whereClause = conditions.join(' AND ');

      const countReq = pool.request();
      if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
      const countResult = await countReq.query(`
        SELECT COUNT(DISTINCT c.customer) as total
        FROM pluspcustomer c
        INNER JOIN asset a ON a.pluspcustomer = c.customer AND a.siteid = 'GBCR' AND a.status = 'HIRED OUT'
        WHERE ${whereClause}
      `);
      const total = countResult.recordset[0].total;

      listReq.input('offset', sql.Int, offset);
      listReq.input('pageSize', sql.Int, pageSize);
      const result = await listReq.query(`
        SELECT
          c.customer as customer_code,
          c.name as name,
          c.companyphone as phone,
          c.gb_email as email,
          c.streetaddress as address,
          c.postalcode as postal_code,
          c.gb_payterm as pay_term,
          c.status as status,
          COUNT(a.assetnum) as active_rentals
        FROM pluspcustomer c
        INNER JOIN asset a ON a.pluspcustomer = c.customer AND a.siteid = 'GBCR' AND a.status = 'HIRED OUT'
        WHERE ${whereClause}
        GROUP BY c.customer, c.name, c.companyphone, c.gb_email, c.streetaddress, c.postalcode, c.gb_payterm, c.status
        ORDER BY COUNT(a.assetnum) DESC, c.name
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

      return NextResponse.json({
        success: true,
        data: { customers: result.recordset, pagination: { page, pageSize, total } },
      });
    }

    // All active customers
    const conditions: string[] = [
      "c.gb_siteid = 'GBCR'",
      "c.status = 'ACTIVE'",
    ];
    const listReq = pool.request();

    if (search) {
      conditions.push(`(c.customer LIKE @search OR c.name LIKE @search OR c.gb_email LIKE @search OR c.companyphone LIKE @search)`);
      listReq.input('search', sql.NVarChar, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM pluspcustomer c WHERE ${whereClause}`);
    const total = countResult.recordset[0].total;

    listReq.input('offset', sql.Int, offset);
    listReq.input('pageSize', sql.Int, pageSize);

    const result = await listReq.query(`
      SELECT
        c.customer as customer_code,
        c.name as name,
        c.companyphone as phone,
        c.gb_email as email,
        c.streetaddress as address,
        c.postalcode as postal_code,
        c.gb_payterm as pay_term,
        c.status as status,
        (SELECT COUNT(*) FROM asset a
         WHERE a.pluspcustomer = c.customer
         AND a.siteid = 'GBCR'
         AND a.status = 'HIRED OUT') as active_rentals
      FROM pluspcustomer c
      WHERE ${whereClause}
      ORDER BY c.name
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
