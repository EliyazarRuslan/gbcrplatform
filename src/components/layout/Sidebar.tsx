'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/auth';
import { getVisibleItems } from '@/lib/nav-items';

export default function Sidebar({ userRole }: { userRole: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const visibleItems = getVisibleItems(userRole);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img src="/goldbell-logo.svg" alt="Goldbell" className="w-9 h-9 rounded-lg" />
            <div className="leading-tight">
              <span className="font-semibold text-[13px] text-white tracking-wide uppercase">Goldbell</span>
              <span className="text-[10px] text-neutral-500 block tracking-widest uppercase">Fleet Platform</span>
            </div>
          </div>
        ) : (
          <img src="/goldbell-logo.svg" alt="Goldbell" className="w-9 h-9 rounded-lg mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-neutral-500 hover:text-neutral-300 ${collapsed ? 'mx-auto mt-1' : 'ml-auto'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-[0.15em]">Navigation</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-1 space-y-0.5 px-2.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] group relative ${
                isActive
                  ? 'bg-primary/[0.12] text-white'
                  : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <svg className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-neutral-600 group-hover:text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {!collapsed && <span className={isActive ? 'font-medium' : 'font-normal'}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-neutral-600">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" />
              <span className="tracking-wide uppercase">System Online</span>
            </div>
            <span className="text-[10px] text-neutral-700 font-mono">v2.0</span>
          </div>
        ) : (
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot mx-auto" />
        )}
      </div>
    </>
  );

  return (
    <aside className={`hidden md:flex sidebar-gradient text-white flex-col transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[240px]'}`}>
      {sidebarContent}
    </aside>
  );
}
