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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
              <img src="/goldbell-logo.svg" alt="Goldbell" className="w-5 h-5 brightness-0 invert" />
            </div>
            <div>
              <span className="font-semibold text-sm text-white tracking-tight">GBCR</span>
              <span className="text-xs text-neutral-500 block leading-none">Platform</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center mx-auto shadow-md shadow-primary/20">
            <img src="/goldbell-logo.svg" alt="Goldbell" className="w-5 h-5 brightness-0 invert" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex p-1.5 rounded-lg hover:bg-white/5 transition-colors text-neutral-500 hover:text-neutral-300 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group relative ${
                isActive
                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <svg className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-primary-light' : 'text-neutral-500 group-hover:text-neutral-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {!collapsed && <span className={`${isActive ? 'font-medium' : 'font-normal'}`}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] text-neutral-600">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" />
            <span>System Online</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <aside className={`hidden md:flex sidebar-gradient text-white flex-col transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[230px]'}`}>
      {sidebarContent}
    </aside>
  );
}
