'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface Anomaly { type: string; entity: string; severity: string; description: string; value: number; }

export default function AIAnomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetch('/api/ai/anomalies').then(r => r.json()).then(d => { setAnomalies(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const severityColor: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const typeIcon: Record<string, string> = {
    COST_SPIKE: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    REPAIR_FREQUENCY: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0',
    LONG_IDLE: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  const filtered = typeFilter ? anomalies.filter(a => a.type === typeFilter) : anomalies;
  const types = [...new Set(anomalies.map(a => a.type))];

  if (loading) return <SkeletonTable rows={8} cols={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{anomalies.length} anomalies detected</p>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg">
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((a, i) => (
          <div key={i} className={`bg-white rounded-xl border p-4 ${severityColor[a.severity] || 'border-neutral-200'}`}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeIcon[a.type] || 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{a.entity}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor[a.severity]}`}>{a.severity}</span>
                  <span className="text-xs text-neutral-400">{a.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-neutral-600">{a.description}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-neutral-400">No anomalies detected</p>}
      </div>
    </div>
  );
}
