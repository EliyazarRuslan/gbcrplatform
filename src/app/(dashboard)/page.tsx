'use client';

import { useState, useEffect } from 'react';
import StatCard from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { formatPercent } from '@/lib/utils';
import dynamic from 'next/dynamic';

const FleetStatusChart = dynamic(() => import('@/components/dashboard/FleetStatusChart'), {
  ssr: false,
  loading: () => <SkeletonChart />,
});

const FleetBreakdownChart = dynamic(() => import('@/components/dashboard/FleetBreakdownChart'), {
  ssr: false,
  loading: () => <SkeletonChart />,
});

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sidebar via-[#151d35] to-sidebar p-5 sm:p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Fleet Overview</h1>
              <p className="text-neutral-400 text-sm mt-1">Real-time vehicle status and fleet performance</p>
            </div>
            <p className="text-xs text-neutral-500 hidden sm:block font-mono" suppressHydrationWarning>
              {new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {stats && <FleetStatusChart stats={stats} />}
        {stats && <FleetBreakdownChart stats={stats} />}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/fleet" className="group bg-white rounded-xl border border-neutral-200/80 p-5 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 group-hover:text-blue-700 transition-colors text-sm">Fleet Management</p>
              <p className="text-xs text-neutral-400 mt-0.5">{stats?.total?.toLocaleString()} vehicles</p>
            </div>
            <svg className="w-4 h-4 text-neutral-300 ml-auto group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        <a href="/bookings" className="group bg-white rounded-xl border border-neutral-200/80 p-5 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 group-hover:text-emerald-700 transition-colors text-sm">Bookings</p>
              <p className="text-xs text-neutral-400 mt-0.5">Manage reservations</p>
            </div>
            <svg className="w-4 h-4 text-neutral-300 ml-auto group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        <a href="/settings/users" className="group bg-white rounded-xl border border-neutral-200/80 p-5 hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-200/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 group-hover:text-violet-700 transition-colors text-sm">User Management</p>
              <p className="text-xs text-neutral-400 mt-0.5">Manage staff accounts</p>
            </div>
            <svg className="w-4 h-4 text-neutral-300 ml-auto group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      </div>
    </div>
  );
}
