'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');
    setDateStr(new Date().toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/fleet/stats', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/auth/me', { signal: controller.signal }).then(r => r.json()),
    ]).then(([statsData, userData]) => {
      if (statsData.success) setStats(statsData.data);
      if (userData.success) setUserName(userData.data.full_name || '');
      setLoading(false);
    }).catch(err => { if (err.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SkeletonChart /><SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-charcoal p-7 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#c8a04a]/[0.06] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-[#c8a04a]/[0.04] rounded-full blur-[60px] translate-y-1/2" />
        <div className="absolute inset-0 industrial-pattern opacity-30" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-[34px] font-semibold tracking-tight leading-tight">
                {greeting && userName ? `${greeting}, ${userName}` : greeting || 'Welcome'}
              </h1>
              <p className="text-white/40 text-[14px] font-medium mt-2">Real-time vehicle status and fleet performance</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot" />
              {dateStr && (
                <p className="text-[12px] text-white/35 font-semibold uppercase tracking-wider">
                  {dateStr}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-in">
        <StatCard
          title="Total Fleet"
          value={stats?.total?.toLocaleString() || '0'}
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          color="blue"
        />
        <StatCard
          title="Hired Out"
          value={stats?.hiredOut?.toLocaleString() || '0'}
          subtitle={formatPercent(stats && stats.total > 0 ? (stats.hiredOut / stats.total) * 100 : 0)}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stats && <FleetStatusChart stats={stats} />}
        {stats && <FleetBreakdownChart stats={stats} />}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-in">
        {[
          { href: '/fleet', label: 'Fleet Management', sub: `${stats?.total?.toLocaleString()} vehicles`, bgClass: 'bg-blue-600', icon: 'M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z' },
          { href: '/bookings', label: 'Bookings', sub: 'Manage reservations', bgClass: 'bg-emerald-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { href: '/settings/users', label: 'User Management', sub: 'Manage staff accounts', bgClass: 'bg-violet-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="group card-industrial p-6">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${link.bgClass} flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-900 text-[15px] group-hover:text-charcoal transition-colors">{link.label}</p>
                <p className="text-[13px] text-neutral-400 mt-0.5 font-medium">{link.sub}</p>
              </div>
              <svg className="w-5 h-5 text-neutral-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
