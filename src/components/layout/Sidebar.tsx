'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/auth';
import { getVisibleItems, type NavItem } from '@/lib/nav-items';

export default function Sidebar({ userRole }: { userRole: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [visibleItems, setVisibleItems] = useState<NavItem[]>(() => getVisibleItems(userRole));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/nav-items', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setVisibleItems(data.data);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        // Use hardcoded defaults on failure
      });
    return () => controller.abort();
  }, [userRole]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c8a04a] to-[#a07830] flex items-center justify-center">
              <span className="text-[15px] font-bold text-[#0e0e10]">G</span>
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[14px] text-white tracking-wide uppercase">Goldbell</span>
              <span className="text-[11px] text-neutral-500 block tracking-widest uppercase font-medium">Fleet Platform</span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c8a04a] to-[#a07830] flex items-center justify-center mx-auto">
            <span className="text-[15px] font-bold text-[#0e0e10]">G</span>
          </div>
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
          <span className="text-[11px] font-bold text-[#68686f] uppercase tracking-[0.15em]">Navigation</span>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[14px] group relative ${
                isActive
                  ? 'bg-[#c8a04a]/[0.10] text-white'
                  : 'text-[#a0a0a8] hover:bg-white/[0.06] hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c8a04a] rounded-r-full" />
              )}
              <svg className={`w-[20px] h-[20px] shrink-0 transition-colors ${isActive ? 'text-[#c8a04a]' : 'text-[#78787f] group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {!collapsed && <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-[#68686f] font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot" />
              <span className="tracking-wide uppercase">System Online</span>
            </div>
            <span className="text-[11px] text-[#58585f] font-mono font-medium">v2.0</span>
          </div>
        ) : (
          <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot mx-auto" />
        )}
      </div>
    </>
  );

  return (
    <aside className={`hidden md:flex sidebar-gradient text-white flex-col transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
      {sidebarContent}
    </aside>
  );
}
