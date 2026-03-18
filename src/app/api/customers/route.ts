import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    const result = await pool.request().query(`
      SELECT TOP 200
        c.customer, c.name,
        cl.department, cl.payterm, cl.creditlimit,
        (SELECT COUNT(*) FROM asset a WHERE a.pluspcustomer = c.customer AND a.status = 'HIRED OUT') as activeRentals,
        ISNULL((SELECT SUM(bl.linecost) FROM pluspbillline bl
          INNER JOIN workorder wo ON bl.refwo = wo.wonum
          WHERE wo.pluspcustomer = c.customer), 0) as totalRevenue
      FROM pluspcustomer c
      LEFT JOIN gb_creditlimits cl ON cl.customer = c.customer
      WHERE c.customer IS NOT NULL AND c.customer != ''
      ORDER BY c.name
    `);

    return NextResponse.json(result.recordset);
  } catch (error: unknown) {
    console.error('Customers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
