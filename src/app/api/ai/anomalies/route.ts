import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();
    const anomalies: { type: string; entity: string; severity: string; description: string; value: number }[] = [];

    // Run all three checks in parallel
    const [costResult, repairResult, idleResult] = await Promise.all([
      // Cost spikes: vehicles with labor costs > 2 std dev above mean (from labtrans)
      pool.request().query(`
        WITH VehicleCosts AS (
          SELECT a.assetnum, a.gb_assetregistrationno as gb_regno,
            SUM(ABS(lt.linecost)) as totalcost
          FROM labtrans lt
          INNER JOIN asset a ON lt.assetnum = a.assetnum AND a.siteid = 'GBCR'
          WHERE lt.siteid = 'GBCR'
          GROUP BY a.assetnum, a.gb_assetregistrationno
          HAVING SUM(ABS(lt.linecost)) > 0
        ),
        Stats AS (
          SELECT AVG(totalcost) as avgCost, STDEV(totalcost) as stdCost FROM VehicleCosts
        )
        SELECT vc.assetnum, vc.gb_regno, vc.totalcost, s.avgCost, s.stdCost
        FROM VehicleCosts vc CROSS JOIN Stats s
        WHERE s.stdCost > 0 AND vc.totalcost > s.avgCost + 2 * s.stdCost
        ORDER BY vc.totalcost DESC
      `),

      // Excessive repair frequency: REPAIR or BREAKDOWN work orders in last 6 months
      pool.request().query(`
        SELECT a.assetnum, a.gb_assetregistrationno as gb_regno, COUNT(*) as repairCount
        FROM workorder wo
        INNER JOIN asset a ON wo.assetnum = a.assetnum AND wo.siteid = a.siteid
        WHERE wo.worktype IN ('REPAIR','BREAKDOWN')
          AND wo.reportdate >= DATEADD(MONTH, -6, GETDATE())
          AND a.siteid = 'GBCR'
        GROUP BY a.assetnum, a.gb_assetregistrationno
        HAVING COUNT(*) >= 5
        ORDER BY COUNT(*) DESC
      `),

      // Long idle vehicles: using statusdate (actual status change date)
      pool.request().query(`
        SELECT assetnum, gb_assetregistrationno as gb_regno,
          DATEDIFF(DAY, statusdate, GETDATE()) as idleDays
        FROM asset
        WHERE status = 'IDLE' AND siteid = 'GBCR'
          AND statusdate IS NOT NULL
          AND DATEDIFF(DAY, statusdate, GETDATE()) > 90
        ORDER BY idleDays DESC
      `),
    ]);

    costResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'COST_SPIKE',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.totalcost as number) > (Number(r.avgCost) || 0) + 3 * (Number(r.stdCost) || 0) ? 'CRITICAL' : 'HIGH',
        description: `Labor cost $${((r.totalcost as number) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} is significantly above fleet average $${((r.avgCost as number) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        value: r.totalcost as number,
      });
    });

    repairResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'REPAIR_FREQUENCY',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.repairCount as number) >= 8 ? 'CRITICAL' : 'MEDIUM',
        description: `${r.repairCount} repair/breakdown work orders in last 6 months`,
        value: r.repairCount as number,
      });
    });

    idleResult.recordset.forEach((r: Record<string, unknown>) => {
      anomalies.push({
        type: 'LONG_IDLE',
        entity: `${r.assetnum} (${r.gb_regno || 'N/A'})`,
        severity: (r.idleDays as number) > 365 ? 'CRITICAL' : (r.idleDays as number) > 180 ? 'HIGH' : 'MEDIUM',
        description: `Vehicle idle for ${r.idleDays} days — review for redeployment or decommission`,
        value: r.idleDays as number,
      });
    });

    return NextResponse.json(anomalies);
  } catch (error: unknown) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json([]);
  }
}
