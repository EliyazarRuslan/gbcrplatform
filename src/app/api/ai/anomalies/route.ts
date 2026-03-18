import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();
    const anomalies: { type: string; entity: string; severity: string; description: string; value: number }[] = [];

    // Cost spikes: vehicles with costs > 2 std dev above mean
    const costResult = await pool.request().query(`
      WITH VehicleCosts AS (
        SELECT a.assetnum, a.gb_assetregistrationno as gb_regno, ISNULL(a.totalcost, 0) as totalcost
        FROM asset a WHERE a.siteid IN ('GBE','HAPL','MV') AND a.assetnum LIKE 'V%' AND a.totalcost > 0
      ),
      Stats AS (
        SELECT AVG(totalcost) as avgCost, STDEV(totalcost) as stdCost FROM VehicleCosts
      )
      SELECT vc.assetnum, vc.gb_regno, vc.totalcost, s.avgCost, s.stdCost
      FROM VehicleCosts vc CROSS JOIN Stats s
      WHERE vc.totalcost > s.avgCost + 2 * s.stdCost
      ORDER BY vc.totalcost DESC
    `);
    costResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'COST_SPIKE',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.totalcost as number) > (r.avgCost as number) + 3 * (r.stdCost as number) ? 'CRITICAL' : 'HIGH',
        description: `Total cost $${((r.totalcost as number) || 0).toLocaleString()} is significantly above fleet average $${((r.avgCost as number) || 0).toLocaleString()}`,
        value: r.totalcost as number,
      });
    });

    // Excessive repair frequency
    const repairResult = await pool.request().query(`
      SELECT a.assetnum, a.gb_assetregistrationno as gb_regno, COUNT(*) as repairCount
      FROM workorder wo
      INNER JOIN asset a ON wo.assetnum = a.assetnum
      WHERE wo.worktype IN ('CM','EM')
        AND wo.reportdate >= DATEADD(MONTH, -6, GETDATE())
        AND a.siteid IN ('GBE','HAPL','MV') AND a.assetnum LIKE 'V%'
      GROUP BY a.assetnum, a.gb_assetregistrationno
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
    `);
    repairResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'REPAIR_FREQUENCY',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.repairCount as number) >= 8 ? 'CRITICAL' : 'MEDIUM',
        description: `${r.repairCount} corrective/emergency repairs in last 6 months`,
        value: r.repairCount as number,
      });
    });

    // Long idle vehicles
    const idleResult = await pool.request().query(`
      SELECT assetnum, gb_assetregistrationno as gb_regno, DATEDIFF(DAY, changedate, GETDATE()) as idleDays
      FROM asset
      WHERE status = 'IDLE' AND siteid IN ('GBE','HAPL','MV') AND assetnum LIKE 'V%'
        AND DATEDIFF(DAY, changedate, GETDATE()) > 90
      ORDER BY idleDays DESC
    `);
    idleResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'LONG_IDLE',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.idleDays as number) > 180 ? 'HIGH' : 'MEDIUM',
        description: `Vehicle idle for ${r.idleDays} days - review for redeployment or decommission`,
        value: r.idleDays as number,
      });
    });

    return NextResponse.json(anomalies);
  } catch (error: unknown) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json({ error: 'Failed to detect anomalies' }, { status: 500 });
  }
}
