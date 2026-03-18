'use client';

import { useState, useEffect } from 'react';
import StatCard from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent } from '@/lib/utils';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/dashboard/DashboardCharts'), { ssr: false, loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div> });

interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
  inService: number;
  decommissioned: number;
  utilizationRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fleet/stats')
      .then((res) => res.json())
      .then((data) => { setStats(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
          title="In Service"
          value={stats?.inService?.toLocaleString() || '0'}
          icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          color="purple"
        />
        <StatCard
          title="Utilization"
          value={formatPercent(stats?.utilizationRate || 0)}
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          color="orange"
        />
      </div>

      {/* Charts */}
      <DashboardCharts />
    </div>
  );
}
