'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface RevenueCost { month: string; revenue: number; cost: number; profit: number; }
interface Utilization { month: string; rate: number; hiredCount: number; totalCount: number; }
interface VehicleType { vehicleType: string; count: number; }

export default function DashboardCharts() {
  const [revenueCost, setRevenueCost] = useState<RevenueCost[]>([]);
  const [utilization, setUtilization] = useState<Utilization[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/fleet/revenue-cost').then(r => r.json()),
      fetch('/api/fleet/utilization').then(r => r.json()),
      fetch('/api/fleet/types').then(r => r.json()),
    ]).then(([rc, util, types]) => {
      setRevenueCost(Array.isArray(rc) ? rc : []);
      setUtilization(Array.isArray(util) ? util : []);
      setVehicleTypes(Array.isArray(types) ? types : []);
    });
  }, []);

  const formatK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue vs Cost */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Revenue vs Cost (12 months)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueCost}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} />
            <Bar dataKey="cost" fill="#ef4444" name="Cost" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Utilization Trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Fleet Utilization Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={utilization}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
            <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Utilization %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Vehicle Type Distribution */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Fleet by Vehicle Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={vehicleTypes.slice(0, 8)} dataKey="count" nameKey="vehicleType" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
              {vehicleTypes.slice(0, 8).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Fleet Status Distribution</h3>
        <div className="space-y-3">
          {vehicleTypes.slice(0, 10).map((vt, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-sm text-neutral-600 flex-1 truncate">{vt.vehicleType}</span>
              <span className="text-sm font-medium text-neutral-900">{vt.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
