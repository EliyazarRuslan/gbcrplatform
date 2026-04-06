import { NextResponse } from 'next/server';
import { getAxPool } from '@/lib/axdb';
import { getMaxPool } from '@/lib/maxdb';

// D365 SALESSTATUS: 1=Open/Active, 3=Invoiced, 4=Cancelled
// DATAAREAID 'gbe' = Goldbell Engineering (GBCR)

export const maxDuration = 120;

export async function GET() {
  const empty = {
    revenue: [] as { month: string; invoices: number; revenue: number }[],
    agreementStatus: [] as { status: string; count: number; total_invoiced: number }[],
    activeValue: { active_count: 0, invoice_count: 0, total_invoiced: 0 },
    topCustomers: [] as { customer_id: string }[],
    revenueByCustomer: [] as { month: string; segment: string; revenue: number }[],
    topOrders: [] as unknown[],
    woByType: [] as { worktype: string; count: number }[],
    statusDistribution: [] as { status: string; count: number }[],
  };

  // Run Maximo and AX independently so one failing doesn't kill the other
  const [mxData, axData] = await Promise.all([
    // Maximo queries (fast)
    (async () => {
      try {
        const mx = await getMaxPool();
        const mxReq = () => { const r = mx.request(); (r as unknown as { timeout: number }).timeout = 60000; return r; };
        const [woTypeResult, statusDist] = await Promise.all([
          mxReq().query(`
            SELECT worktype, COUNT(*) as count
            FROM workorder WHERE reportdate >= DATEADD(MONTH, -12, GETDATE()) AND siteid = 'GBCR'
            GROUP BY worktype ORDER BY count DESC
          `),
          mxReq().query(`
            SELECT status, COUNT(*) as count
            FROM asset WHERE siteid = 'GBCR'
              AND status NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
            GROUP BY status ORDER BY count DESC
          `),
        ]);
        return { woByType: woTypeResult.recordset, statusDistribution: statusDist.recordset };
      } catch (error: unknown) {
        console.error('Analytics Maximo error:', error instanceof Error ? error.message : error);
        return { woByType: empty.woByType, statusDistribution: empty.statusDistribution };
      }
    })(),

    // AX queries (slower)
    (async () => {
      try {
        const ax = await getAxPool();
        const axReq = () => { const r = ax.request(); (r as unknown as { timeout: number }).timeout = 120000; return r; };

        const [
          revenueResult,
          agreementStatusResult,
          activeValueResult,
          topCustomersResult,
          topOrdersResult,
        ] = await Promise.all([
          axReq().query(`
            SELECT FORMAT(i.invoicedate, 'yyyy-MM') as month,
              COUNT(DISTINCT i.invoiceid) as invoices,
              SUM(i.invoiceamountmst) as revenue
            FROM custinvoicejour i
            WHERE i.dataareaid = 'gbe'
              AND i.invoicedate >= DATEADD(MONTH, -12, GETDATE())
              AND EXISTS (SELECT 1 FROM salestable s WHERE s.salesid = i.salesid AND s.dataareaid = 'gbe' AND s.salesstatus = 1)
            GROUP BY FORMAT(i.invoicedate, 'yyyy-MM')
            ORDER BY month
          `),

          axReq().query(`
            SELECT
              CASE s.salesstatus
                WHEN 1 THEN 'Active'
                WHEN 2 THEN 'Delivered'
                WHEN 3 THEN 'Invoiced'
                WHEN 4 THEN 'Cancelled'
                ELSE 'Unknown'
              END as status,
              COUNT(*) as count,
              COALESCE(SUM(s.smmsalesamounttotal), 0) as total_invoiced
            FROM salestable s
            WHERE s.dataareaid = 'gbe'
            GROUP BY s.salesstatus
            ORDER BY count DESC
          `),

          axReq().query(`
            SELECT
              (SELECT COUNT(*) FROM salestable WHERE dataareaid = 'gbe' AND salesstatus = 1) as active_count,
              COUNT(DISTINCT i.invoiceid) as invoice_count,
              COALESCE(SUM(i.invoiceamountmst), 0) as total_invoiced
            FROM custinvoicejour i
            WHERE i.dataareaid = 'gbe'
              AND EXISTS (SELECT 1 FROM salestable s WHERE s.salesid = i.salesid AND s.dataareaid = 'gbe' AND s.salesstatus = 1)
          `),

          axReq().query(`
            SELECT TOP 10
              s.custaccount as customer_id,
              MAX(s.salesname) as customer_name,
              COUNT(DISTINCT s.salesid) as agreement_count,
              COUNT(DISTINCT i.invoiceid) as invoice_count,
              SUM(i.invoiceamountmst) as total_invoiced
            FROM custinvoicejour i
            INNER JOIN salestable s ON s.salesid = i.salesid AND s.dataareaid = 'gbe'
            WHERE i.dataareaid = 'gbe' AND s.salesstatus = 1
            GROUP BY s.custaccount
            ORDER BY total_invoiced DESC
          `),

          axReq().query(`
            SELECT TOP 10
              i.salesid,
              MAX(s.custaccount) as customer_id,
              MAX(s.salesname) as customer_name,
              COUNT(DISTINCT i.invoiceid) as invoice_count,
              SUM(i.invoiceamountmst) as total_invoiced,
              MIN(i.invoicedate) as first_invoice,
              MAX(i.invoicedate) as last_invoice
            FROM custinvoicejour i
            INNER JOIN salestable s ON s.salesid = i.salesid AND s.dataareaid = 'gbe'
            WHERE i.dataareaid = 'gbe' AND s.salesstatus = 1
            GROUP BY i.salesid
            ORDER BY total_invoiced DESC
          `),
        ]);

        // Build revenue by customer segment from topCustomers
        const topNames = topCustomersResult.recordset.slice(0, 3).map((c: { customer_id: string }) => c.customer_id);
        let revenueByCustomer: { month: string; segment: string; revenue: number }[] = [];
        if (topNames.length > 0) {
          const segRequest = ax.request();
          (segRequest as unknown as { timeout: number }).timeout = 120000;
          topNames.forEach((name: string, i: number) => segRequest.input(`p${i}`, name));
          const caseWhen = topNames.map((_: string, i: number) => `WHEN s.custaccount = @p${i} THEN s.salesname`).join(' ');
          const segResult = await segRequest.query(`
            SELECT
              FORMAT(i.invoicedate, 'yyyy-MM') as month,
              CASE ${caseWhen} ELSE 'Others' END as segment,
              SUM(i.invoiceamountmst) as revenue
            FROM custinvoicejour i
            INNER JOIN salestable s ON s.salesid = i.salesid AND s.dataareaid = 'gbe'
            WHERE i.dataareaid = 'gbe' AND s.salesstatus = 1
              AND i.invoicedate >= DATEADD(MONTH, -12, GETDATE())
            GROUP BY FORMAT(i.invoicedate, 'yyyy-MM'),
              CASE ${caseWhen} ELSE 'Others' END
            ORDER BY month, segment
          `);
          revenueByCustomer = segResult.recordset;
        }

        return {
          revenue: revenueResult.recordset,
          agreementStatus: agreementStatusResult.recordset,
          activeValue: activeValueResult.recordset[0],
          topCustomers: topCustomersResult.recordset,
          revenueByCustomer,
          topOrders: topOrdersResult.recordset,
        };
      } catch (error: unknown) {
        console.error('Analytics AX error:', error instanceof Error ? error.message : error);
        return {
          revenue: empty.revenue,
          agreementStatus: empty.agreementStatus,
          activeValue: empty.activeValue,
          topCustomers: empty.topCustomers,
          revenueByCustomer: empty.revenueByCustomer,
          topOrders: empty.topOrders,
        };
      }
    })(),
  ]);

  return NextResponse.json({
    ...mxData,
    ...axData,
  });
}
