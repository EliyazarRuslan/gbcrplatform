import { NextResponse } from 'next/server';
import { getAxPool } from '@/lib/axdb';
import { getMaxPool } from '@/lib/maxdb';

// D365 SALESSTATUS: 1=Open/Active, 3=Invoiced, 4=Cancelled
// DATAAREAID 'gbe' = Goldbell Engineering (GBCR)

export const maxDuration = 120;

export async function GET() {
  try {
    const [ax, mx] = await Promise.all([getAxPool(), getMaxPool()]);

    // Run all queries in parallel
    // Run AX and Maximo queries separately to handle timeouts better
    // Maximo queries (fast)
    const [woTypeResult, statusDist] = await Promise.all([
      mx.request().query(`
        SELECT worktype, COUNT(*) as count
        FROM workorder WITH (NOLOCK) WHERE reportdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR'
        GROUP BY worktype ORDER BY count DESC
      `),
      mx.request().query(`
        SELECT status, COUNT(*) as count
        FROM asset WITH (NOLOCK) WHERE siteid = 'GBCR'
          AND status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
        GROUP BY status ORDER BY count DESC
      `),
    ]);

    // AX queries (slower - run with NOLOCK hints for performance)
    const axReq = () => { const r = ax.request(); r.timeout = 90000; return r; };

    const [
      revenueResult,
      agreementStatusResult,
      activeValueResult,
      topCustomersResult,
      topOrdersResult,
    ] = await Promise.all([
      axReq().query(`
        SELECT FORMAT(i.INVOICEDATE, 'yyyy-MM') as month,
          COUNT(DISTINCT i.INVOICEID) as invoices,
          SUM(i.INVOICEAMOUNTMST) as revenue
        FROM CUSTINVOICEJOUR i WITH (NOLOCK)
        WHERE i.DATAAREAID = 'gbe'
          AND i.INVOICEDATE >= DATEADD(MONTH, -12, GETDATE())
          AND EXISTS (SELECT 1 FROM SALESTABLE s WITH (NOLOCK) WHERE s.SALESID = i.SALESID AND s.DATAAREAID = 'gbe' AND s.SALESSTATUS = 1)
        GROUP BY FORMAT(i.INVOICEDATE, 'yyyy-MM')
        ORDER BY month
      `),

      axReq().query(`
        SELECT
          CASE s.SALESSTATUS
            WHEN 1 THEN 'Active'
            WHEN 2 THEN 'Delivered'
            WHEN 3 THEN 'Invoiced'
            WHEN 4 THEN 'Cancelled'
            ELSE 'Unknown'
          END as status,
          COUNT(*) as count,
          ISNULL(SUM(s.SMMSALESAMOUNTTOTAL), 0) as total_invoiced
        FROM SALESTABLE s WITH (NOLOCK)
        WHERE s.DATAAREAID = 'gbe'
        GROUP BY s.SALESSTATUS
        ORDER BY count DESC
      `),

      axReq().query(`
        SELECT
          (SELECT COUNT(*) FROM SALESTABLE WITH (NOLOCK) WHERE DATAAREAID = 'gbe' AND SALESSTATUS = 1) as active_count,
          COUNT(DISTINCT i.INVOICEID) as invoice_count,
          ISNULL(SUM(i.INVOICEAMOUNTMST), 0) as total_invoiced
        FROM CUSTINVOICEJOUR i WITH (NOLOCK)
        WHERE i.DATAAREAID = 'gbe'
          AND EXISTS (SELECT 1 FROM SALESTABLE s WITH (NOLOCK) WHERE s.SALESID = i.SALESID AND s.DATAAREAID = 'gbe' AND s.SALESSTATUS = 1)
      `),

      axReq().query(`
        SELECT TOP 10
          s.CUSTACCOUNT as customer_id,
          MAX(s.SALESNAME) as customer_name,
          COUNT(DISTINCT s.SALESID) as agreement_count,
          COUNT(DISTINCT i.INVOICEID) as invoice_count,
          SUM(i.INVOICEAMOUNTMST) as total_invoiced
        FROM CUSTINVOICEJOUR i WITH (NOLOCK)
        INNER JOIN SALESTABLE s WITH (NOLOCK) ON s.SALESID = i.SALESID AND s.DATAAREAID = 'gbe'
        WHERE i.DATAAREAID = 'gbe' AND s.SALESSTATUS = 1
        GROUP BY s.CUSTACCOUNT
        ORDER BY total_invoiced DESC
      `),

      axReq().query(`
        SELECT TOP 10
          i.SALESID,
          MAX(s.CUSTACCOUNT) as customer_id,
          MAX(s.SALESNAME) as customer_name,
          COUNT(DISTINCT i.INVOICEID) as invoice_count,
          SUM(i.INVOICEAMOUNTMST) as total_invoiced,
          MIN(i.INVOICEDATE) as first_invoice,
          MAX(i.INVOICEDATE) as last_invoice
        FROM CUSTINVOICEJOUR i WITH (NOLOCK)
        INNER JOIN SALESTABLE s WITH (NOLOCK) ON s.SALESID = i.SALESID AND s.DATAAREAID = 'gbe'
        WHERE i.DATAAREAID = 'gbe' AND s.SALESSTATUS = 1
        GROUP BY i.SALESID
        ORDER BY total_invoiced DESC
      `),
    ]);

    // Build revenue by customer segment from topCustomers (avoid expensive CTE)
    const topNames = topCustomersResult.recordset.slice(0, 3).map((c: { customer_id: string }) => c.customer_id);
    let revenueByCustomer: { month: string; segment: string; revenue: number }[] = [];
    if (topNames.length > 0) {
      const segRequest = ax.request();
      segRequest.timeout = 90000;
      topNames.forEach((name: string, i: number) => segRequest.input(`p${i}`, name));
      const caseWhen = topNames.map((_: string, i: number) => `WHEN s.CUSTACCOUNT = @p${i} THEN s.SALESNAME`).join(' ');
      const segResult = await segRequest.query(`
        SELECT
          FORMAT(i.INVOICEDATE, 'yyyy-MM') as month,
          CASE ${caseWhen} ELSE 'Others' END as segment,
          SUM(i.INVOICEAMOUNTMST) as revenue
        FROM CUSTINVOICEJOUR i WITH (NOLOCK)
        INNER JOIN SALESTABLE s WITH (NOLOCK) ON s.SALESID = i.SALESID AND s.DATAAREAID = 'gbe'
        WHERE i.DATAAREAID = 'gbe' AND s.SALESSTATUS = 1
          AND i.INVOICEDATE >= DATEADD(MONTH, -12, GETDATE())
        GROUP BY FORMAT(i.INVOICEDATE, 'yyyy-MM'),
          CASE ${caseWhen} ELSE 'Others' END
        ORDER BY month, segment
      `);
      revenueByCustomer = segResult.recordset;
    }

    return NextResponse.json({
      revenue: revenueResult.recordset,
      agreementStatus: agreementStatusResult.recordset,
      activeValue: activeValueResult.recordset[0],
      topCustomers: topCustomersResult.recordset,
      revenueByCustomer,
      topOrders: topOrdersResult.recordset,
      woByType: woTypeResult.recordset,
      statusDistribution: statusDist.recordset,
    });
  } catch (error: unknown) {
    console.error('Analytics API error:', error instanceof Error ? error.message : error);
    console.error('Analytics API stack:', error instanceof Error ? error.stack : '');
    return NextResponse.json({
      revenue: [],
      agreementStatus: [],
      activeValue: { active_count: 0, invoice_count: 0, total_invoiced: 0 },
      topCustomers: [],
      revenueByCustomer: [],
      topOrders: [],
      woByType: [],
      statusDistribution: [],
    });
  }
}
