'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/auth';
import { getVisibleItems } from '@/lib/nav-items';

const MAX_PRIMARY_TABS = 4;

export default function MobileNav({ userRole }: { userRole: Role }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const visibleItems = getVisibleItems(userRole);

  const primaryTabs = visibleItems.slice(0, MAX_PRIMARY_TABS);
  const moreTabs = visibleItems.slice(MAX_PRIMARY_TABS);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const isMoreActive = moreTabs.some((item) => isActive(item.href));

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMoreOpen(false)}
          role="button"
          aria-label="Close menu"
        />
      )}

      {moreOpen && moreTabs.length > 0 && (
        <div className="md:hidden fixed bottom-[var(--mobile-nav-height)] left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-neutral-200 pb-2">
          <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mt-3 mb-2" />
          <nav className="px-4 pb-2">
            {moreTabs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 flex justify-around items-center"
        style={{
          height: 'var(--mobile-nav-height)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {primaryTabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-2 text-[10px] transition-colors ${
              isActive(item.href) ? 'text-primary font-medium' : 'text-neutral-400'
            }`}
          >
            <svg
              className={`w-5 h-5 mb-0.5 ${isActive(item.href) ? 'text-primary' : 'text-neutral-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        ))}

        {moreTabs.length > 0 && (
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-label="More menu"
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center flex-1 py-2 text-[10px] transition-colors ${
              isMoreActive || moreOpen ? 'text-primary font-medium' : 'text-neutral-400'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  );
}
