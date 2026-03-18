import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

function exponentialSmoothing(data: number[], alpha: number = 0.3, periods: number = 6): { forecast: number[]; lower: number[]; upper: number[] } {
  if (data.length === 0) return { forecast: [], lower: [], upper: [] };

  let level = data[0];
  const smoothed: number[] = [level];

  for (let i = 1; i < data.length; i++) {
    level = alpha * data[i] + (1 - alpha) * level;
    smoothed.push(level);
  }

  // Calculate standard error
  const errors = data.map((v, i) => v - smoothed[i]);
  const stdErr = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);

  const forecast: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];

  for (let i = 1; i <= periods; i++) {
    forecast.push(Math.max(0, Math.round(level)));
    lower.push(Math.max(0, Math.round(level - 1.96 * stdErr * Math.sqrt(i))));
    upper.push(Math.round(level + 1.96 * stdErr * Math.sqrt(i)));
  }

  return { forecast, lower, upper };
}

export async function GET() {
  try {
    const pool = await getMaxPool();

    // Monthly WO counts (proxy for demand)
    const woResult = await pool.request().query(`
      SELECT FORMAT(reportdate, 'yyyy-MM') as month, COUNT(*) as count
      FROM workorder
      WHERE reportdate >= DATEADD(MONTH, -24, GETDATE())
        AND siteid IN ('GBE','HAPL','MV')
      GROUP BY FORMAT(reportdate, 'yyyy-MM')
      ORDER BY month
    `);

    // Monthly hired out counts (demand indicator)
    const hireResult = await pool.request().query(`
      SELECT FORMAT(changedate, 'yyyy-MM') as month,
        SUM(CASE WHEN status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredCount
      FROM asset
      WHERE changedate >= DATEADD(MONTH, -24, GETDATE())
        AND siteid IN ('GBE','HAPL','MV') AND assetnum LIKE 'V%'
      GROUP BY FORMAT(changedate, 'yyyy-MM')
      ORDER BY month
    `);

    const woData = woResult.recordset.map((r: Record<string, unknown>) => r.count as number);
    const hireData = hireResult.recordset.map((r: Record<string, unknown>) => r.hiredCount as number);

    const woForecast = exponentialSmoothing(woData);
    const hireForecast = exponentialSmoothing(hireData);

    // Generate future month labels
    const lastMonth = woResult.recordset[woResult.recordset.length - 1]?.month || '';
    const futureMonths: string[] = [];
    if (lastMonth) {
      const [y, m] = lastMonth.split('-').map(Number);
      for (let i = 1; i <= 6; i++) {
        const nm = m + i;
        const ny = y + Math.floor((nm - 1) / 12);
        const mm = ((nm - 1) % 12) + 1;
        futureMonths.push(`${ny}-${String(mm).padStart(2, '0')}`);
      }
    }

    return NextResponse.json({
      historical: {
        woMonths: woResult.recordset.map((r: Record<string, unknown>) => r.month),
        woCounts: woData,
        hireMonths: hireResult.recordset.map((r: Record<string, unknown>) => r.month),
        hireCounts: hireData,
      },
      forecast: {
        months: futureMonths,
        workOrders: woForecast,
        hires: hireForecast,
      },
    });
  } catch (error: unknown) {
    console.error('Forecast API error:', error);
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
  }
}
