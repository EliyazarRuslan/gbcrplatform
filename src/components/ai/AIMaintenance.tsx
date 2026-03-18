'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface MaintenanceItem {
  assetnum: string; gb_regno: string; description: string; status: string;
  score: number;
  factors: { daysSinceService: number; repairFrequency: number; vehicleAge: number; costRatio: number; openWOs: number; };
  recommendation: string;
}

export default function AIMaintenance() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/ai/maintenance').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <SkeletonTable rows={10} cols={7} />;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-red-100 text-red-800';
    if (score >= 50) return 'bg-orange-100 text-orange-800';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getScoreBar = (score: number) => {
    const color = score >= 70 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 30 ? 'bg-yellow-500' : 'bg-green-500';
    return <div className="w-full bg-neutral-200 rounded-full h-2"><div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(100, score)}%` }} /></div>;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">Urgency scores (0-100) based on service history, repair frequency, vehicle age, cost ratio, and open work orders.</p>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Vehicle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 w-32">Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Days Since Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Repairs (12mo)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Age (yrs)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.assetnum} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/fleet/${item.assetnum}`} className="text-blue-600 hover:underline font-medium">{item.gb_regno || item.assetnum}</Link>
                </td>
                <td className="px-4 py-3 truncate max-w-[200px]">{item.description}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                    {getScoreBar(item.score)}
                  </div>
                </td>
                <td className="px-4 py-3">{item.factors.daysSinceService}</td>
                <td className="px-4 py-3">{item.factors.repairFrequency}</td>
                <td className="px-4 py-3">{item.factors.vehicleAge}</td>
                <td className="px-4 py-3 text-xs">{item.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
