'use client';

import { useState, useEffect } from 'react';
import StatCard from '@/components/ui/StatCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatPercent } from '@/lib/utils';

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
  utilizationRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fleet/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Fleet"
          value={stats?.total?.toLocaleString() || '0'}
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          color="blue"
        />
        <StatCard
          title="Hired Out"
          value={stats?.hiredOut?.toLocaleString() || '0'}
          subtitle={formatPercent(stats ? (stats.hiredOut / stats.total) * 100 : 0)}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatCard
          title="Not Ready"
          value={stats?.notReady?.toLocaleString() || '0'}
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          color="red"
        />
        <StatCard
          title="Idle"
          value={stats?.idle?.toLocaleString() || '0'}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="yellow"
        />
        <StatCard
          title="Booked"
          value={stats?.booked?.toLocaleString() || '0'}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="indigo"
        />
        <StatCard
          title="Utilization"
          value={formatPercent(stats?.utilizationRate || 0)}
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          color="orange"
        />
      </div>

      {/* Placeholder for future charts */}
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-neutral-400">
        <p className="text-lg font-medium">Dashboard charts will be added in Phase 2</p>
        <p className="text-sm mt-1">Fleet analytics, booking trends, and revenue reporting</p>
      </div>
    </div>
  );
}
