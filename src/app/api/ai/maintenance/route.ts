import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    const result = await pool.request().query(`
      SELECT TOP 50
        a.assetnum, a.gb_assetregistrationno as gb_regno, a.description, a.status, a.installdate,
        a.totalcost, a.purchaseprice,
        (SELECT TOP 1 actfinish FROM workorder WHERE assetnum = a.assetnum AND worktype IN ('PM','CM') AND actfinish IS NOT NULL ORDER BY actfinish DESC) as lastService,
        (SELECT COUNT(*) FROM workorder WHERE assetnum = a.assetnum AND worktype IN ('CM','EM') AND reportdate >= DATEADD(YEAR, -1, GETDATE())) as repairCount12mo,
        (SELECT ISNULL(SUM(actlabcost + actmatcost), 0) FROM workorder WHERE assetnum = a.assetnum AND reportdate >= DATEADD(YEAR, -1, GETDATE())) as costLast12mo,
        (SELECT COUNT(*) FROM workorder WHERE assetnum = a.assetnum AND status IN ('APPR','WMATL','INPRG')) as openWOs
      FROM asset a
      WHERE a.siteid IN ('GBE','HAPL','MV') AND a.assetnum LIKE 'V%'
        AND a.status NOT IN ('DECOMMISSIONED')
      ORDER BY a.totalcost DESC
    `);

    const now = new Date();
    const scores = result.recordset.map((v: Record<string, unknown>) => {
      // Days since last service (max 30 points)
      const lastService = v.lastService ? new Date(v.lastService as string) : null;
      const daysSinceService = lastService ? Math.floor((now.getTime() - lastService.getTime()) / 86400000) : 365;
      const serviceScore = Math.min(30, (daysSinceService / 365) * 30);

      // Repair frequency (max 25 points)
      const repairCount = (v.repairCount12mo as number) || 0;
      const repairScore = Math.min(25, repairCount * 5);

      // Vehicle age (max 15 points)
      const installDate = v.installdate ? new Date(v.installdate as string) : null;
      const ageYears = installDate ? (now.getTime() - installDate.getTime()) / (365.25 * 86400000) : 5;
      const ageScore = Math.min(15, (ageYears / 10) * 15);

      // Cost ratio (max 20 points)
      const costLast12mo = (v.costLast12mo as number) || 0;
      const purchasePrice = (v.purchaseprice as number) || 50000;
      const costRatio = purchasePrice > 0 ? costLast12mo / purchasePrice : 0;
      const costScore = Math.min(20, costRatio * 100);

      // Open WOs (max 10 points)
      const openWOs = (v.openWOs as number) || 0;
      const openScore = Math.min(10, openWOs * 5);

      const totalScore = Math.round(serviceScore + repairScore + ageScore + costScore + openScore);

      let recommendation = 'Normal monitoring';
      if (totalScore >= 70) recommendation = 'Immediate maintenance review required';
      else if (totalScore >= 50) recommendation = 'Schedule preventive maintenance soon';
      else if (totalScore >= 30) recommendation = 'Monitor closely, maintenance may be needed';

      return {
        assetnum: v.assetnum,
        gb_regno: v.gb_regno,
        description: v.description,
        status: v.status,
        score: totalScore,
        factors: {
          daysSinceService: Math.round(daysSinceService),
          repairFrequency: repairCount,
          vehicleAge: Math.round(ageYears * 10) / 10,
          costRatio: Math.round(costRatio * 1000) / 10,
          openWOs: openWOs,
        },
        recommendation,
      };
    });

    scores.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    return NextResponse.json(scores);
  } catch (error: unknown) {
    console.error('Maintenance prediction error:', error);
    return NextResponse.json({ error: 'Failed to generate predictions' }, { status: 500 });
  }
}
