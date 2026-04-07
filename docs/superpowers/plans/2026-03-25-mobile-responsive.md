# Mobile-Responsive Web Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing GBCR platform fully responsive for mobile browsers with bottom tab navigation and PWA support, while keeping the desktop UI unchanged.

**Architecture:** Mobile-first responsive design using Tailwind `md:` breakpoints. Desktop sidebar hidden on mobile, replaced with bottom tab bar. Tables become card lists on mobile via a `ResponsiveTable` wrapper. PWA manifest + manual service worker for home screen install and static asset caching. No backend changes.

**Tech Stack:** Tailwind CSS 4, React 19, Next.js 16 App Router, Service Worker API

**Spec:** `docs/superpowers/specs/2026-03-25-mobile-responsive-design.md`

---

## Phase 1: Mobile Navigation & Layout

### Task 1: Bottom Tab Bar Component

**Files:**
- Create: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create the MobileNav component**

This component renders a fixed bottom tab bar on mobile only. It imports the same `navItems` array logic from Sidebar (we'll extract it in Task 3). For now, hardcode the tabs.

```typescript
// src/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/auth';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  visibleTo: Role[] | 'all';
}

// Same nav items as Sidebar (src/components/layout/Sidebar.tsx lines 15-25)
const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', visibleTo: 'all' },
  { href: '/inspections', label: 'Inspections', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', visibleTo: ['super_admin', 'branch_manager', 'rental_officer', 'inspector'] },
  { href: '/fleet', label: 'Fleet', icon: 'M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/ai', label: 'AI Chat', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', visibleTo: ['super_admin', 'branch_manager'] },
  { href: '/bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', visibleTo: ['super_admin', 'branch_manager', 'finance'] },
  { href: '/services', label: 'Services', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', visibleTo: ['super_admin', 'branch_manager', 'rental_officer', 'inspector'] },
  { href: '/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/settings', label: 'Settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', visibleTo: ['super_admin'] },
];

// First 4 role-visible items become primary tabs, rest go to "More"
const MAX_PRIMARY_TABS = 4;

export default function MobileNav({ userRole }: { userRole: Role }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => item.visibleTo === 'all' || item.visibleTo.includes(userRole)
  );

  const primaryTabs = visibleItems.slice(0, MAX_PRIMARY_TABS);
  const moreTabs = visibleItems.slice(MAX_PRIMARY_TABS);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const isMoreActive = moreTabs.some((item) => isActive(item.href));

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu bottom sheet */}
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

      {/* Bottom tab bar */}
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
```

- [ ] **Step 2: Add CSS variable to globals.css**

Add to `src/app/globals.css` (after the `@theme` block):

```css
:root {
  --mobile-nav-height: 4rem;
}
```

- [ ] **Step 3: Verify it renders**

```bash
cd src/components/layout && ls MobileNav.tsx
```

Expected: File exists

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MobileNav.tsx src/app/globals.css
git commit -m "feat: add mobile bottom tab bar navigation component"
```

---

### Task 2: Mobile Header Component

**Files:**
- Create: `src/components/layout/MobileHeader.tsx`

- [ ] **Step 1: Create the MobileHeader component**

A simplified top header for mobile — app title + user avatar. No breadcrumbs on mobile.

```typescript
// src/components/layout/MobileHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MobileHeaderProps {
  user: {
    full_name: string;
    role: string;
  };
}

export default function MobileHeader({ user }: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
          <img src="/goldbell-logo.svg" alt="Goldbell" className="w-4 h-4 brightness-0 invert" />
        </div>
        <span className="font-semibold text-sm text-neutral-800">GBCR</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button className="relative p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-800 truncate">{user.full_name}</p>
                <p className="text-xs text-neutral-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push('/change-password'); }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MobileHeader.tsx
git commit -m "feat: add simplified mobile header component"
```

---

### Task 3: Update Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Remove mobile hamburger/drawer from Sidebar**

In `src/components/layout/Sidebar.tsx`, remove the mobile-specific code:
- Remove lines 117-140 (mobile hamburger button, overlay, mobile aside)
- Remove `mobileOpen` state (line 28) and its `useEffect` (lines 32-34)
- Keep only the desktop aside (line 142-144)

The return should become:

```typescript
  return (
    <aside className={`hidden md:flex sidebar-gradient text-white flex-col transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[230px]'}`}>
      {sidebarContent}
    </aside>
  );
```

Also remove the close button from `sidebarContent` (lines 59-66, the `md:hidden` button) since there's no mobile sidebar anymore.

- [ ] **Step 2: Update dashboard layout to include MobileNav and MobileHeader**

Modify `src/app/(dashboard)/layout.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import MobileHeader from '@/components/layout/MobileHeader';
import type { Role } from '@/types/auth';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  branch_id: number | null;
  branch_name: string | null;
  mustChangePassword: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          if (data.data.mustChangePassword) {
            router.push('/change-password');
            return;
          }
          setUser(data.data);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center animate-glow">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          </div>
          <p className="text-sm text-neutral-400 font-medium">Loading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:block">
          <Header user={user} />
        </div>
        {/* Mobile header */}
        <MobileHeader user={user} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav userRole={user.role} />
    </div>
  );
}
```

Key changes from original (line 58-68):
- Added `MobileHeader` (visible on mobile only via its own `md:hidden` class)
- Wrapped `Header` with `hidden md:block` to hide on mobile
- Changed `p-6` to `p-3 md:p-6` for tighter mobile padding
- Added `pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-6` for bottom tab bar clearance
- Added `MobileNav` component at bottom

- [ ] **Step 3: Verify the app builds**

```bash
npx next build
```

Expected: Build succeeds

- [ ] **Step 4: Verify on mobile viewport**

Open app in browser, use DevTools mobile viewport (iPhone 14, 390px). Should see:
- Mobile header at top with GBCR logo + avatar
- Bottom tab bar with tabs
- No sidebar visible
- Content fills the screen

On desktop (>= 768px): existing sidebar + header unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: integrate mobile navigation into dashboard layout"
```

---

## Phase 2: Responsive UI Components

### Task 4: ResponsiveTable Component

**Files:**
- Create: `src/components/ui/responsive-table.tsx`

- [ ] **Step 1: Create ResponsiveTable wrapper**

This wraps the existing `DataTable` (at `src/components/ui/data-table.tsx`) and adds a mobile card list view. It accepts the same props as `DataTable` plus a `mobileCard` render prop.

```typescript
// src/components/ui/responsive-table.tsx
'use client';

import React from 'react';
import DataTable, { Column } from '@/components/ui/data-table';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationProps;
  emptyMessage?: string;
  loading?: boolean;
  mobileCard: (row: T, index: number) => React.ReactNode;
  onRowClick?: (row: T) => void;
}

export default function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  emptyMessage = 'No data available.',
  loading = false,
  mobileCard,
  onRowClick,
}: ResponsiveTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;
  const startItem = pagination
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 1;
  const endItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;

  return (
    <>
      {/* Desktop: existing table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={data}
          pagination={pagination}
          emptyMessage={emptyMessage}
          loading={loading}
        />
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="skeleton h-4 w-3/4 rounded mb-2" />
                <div className="skeleton h-3 w-1/2 rounded mb-2" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-12 text-center text-sm text-neutral-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((row, idx) => (
              <div
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`bg-white rounded-xl border border-neutral-200 p-4 ${
                  onRowClick ? 'cursor-pointer active:bg-neutral-50' : ''
                }`}
              >
                {mobileCard(row, idx)}
              </div>
            ))}
          </div>
        )}

        {/* Mobile pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-neutral-500">
              {startItem}–{endItem} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-neutral-500">
                {pagination.page}/{totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/responsive-table.tsx
git commit -m "feat: add ResponsiveTable component with mobile card list view"
```

---

### Task 5: BottomSheet and ResponsiveModal Components

**Files:**
- Create: `src/components/ui/bottom-sheet.tsx`
- Create: `src/components/ui/responsive-modal.tsx`

- [ ] **Step 1: Create BottomSheet component**

```typescript
// src/components/ui/bottom-sheet.tsx
'use client';

import { useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-100">
          <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          {title && <h3 className="text-base font-semibold text-neutral-800">{title}</h3>}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add slide-up animation to globals.css**

Add to `src/app/globals.css`:

```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

- [ ] **Step 3: Create ResponsiveModal component**

```typescript
// src/components/ui/responsive-modal.tsx
'use client';

import BottomSheet from '@/components/ui/bottom-sheet';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function ResponsiveModal({ open, onClose, title, children }: ResponsiveModalProps) {
  if (!open) return null;

  // Render both versions, use Tailwind to show the correct one.
  // This avoids hydration mismatch from JS-based detection.
  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <BottomSheet open={open} onClose={onClose} title={title}>
          {children}
        </BottomSheet>
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden md:block">
        <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx src/components/ui/responsive-modal.tsx src/app/globals.css
git commit -m "feat: add BottomSheet and ResponsiveModal components"
```

---

### Task 6: FAB Component

**Files:**
- Create: `src/components/ui/fab.tsx`

- [ ] **Step 1: Create FAB component**

```typescript
// src/components/ui/fab.tsx
'use client';

interface FABProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

export default function FAB({ onClick, label, icon }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed z-30 right-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 px-5 py-3 flex items-center gap-2 text-sm font-medium active:scale-95 transition-transform"
      style={{ bottom: 'calc(var(--mobile-nav-height) + 1rem)' }}
    >
      {icon || (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/fab.tsx
git commit -m "feat: add floating action button component for mobile"
```

---

## Phase 3: Page Responsiveness

Each task makes one page responsive. These tasks can run in parallel after Phase 2.

### Task 7: Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Make dashboard responsive**

Read the current `src/app/(dashboard)/page.tsx` fully. Update grid layouts:
- Stat cards: already uses `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` — verify this works
- Chart sections: change from multi-column grids to `grid-cols-1 md:grid-cols-2` where needed
- Ensure all chart containers have `w-full` and charts are responsive

- [ ] **Step 2: Verify on mobile viewport**

Open in DevTools mobile viewport. Stat cards should be 2-column, charts stacked vertically.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: make dashboard page responsive for mobile"
```

---

### Task 8: Fleet Page

**Files:**
- Modify: `src/app/(dashboard)/fleet/page.tsx`

- [ ] **Step 1: Read the current fleet page**

Read `src/app/(dashboard)/fleet/page.tsx` fully to understand the current table and filter setup.

- [ ] **Step 2: Replace DataTable with ResponsiveTable**

Import `ResponsiveTable` from `@/components/ui/responsive-table` and replace the `DataTable` usage. Add a `mobileCard` render prop that shows each vehicle as a card:

```typescript
<ResponsiveTable
  columns={columns}
  data={vehicles}
  pagination={pagination}
  loading={loading}
  mobileCard={(vehicle) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-neutral-800">{vehicle.regno}</span>
        <Badge variant={statusVariant(vehicle.status)}>{vehicle.status}</Badge>
      </div>
      <p className="text-xs text-neutral-500">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
      <p className="text-xs text-neutral-400 mt-1">{vehicle.category}</p>
    </div>
  )}
  onRowClick={(vehicle) => router.push(`/fleet/${vehicle.assetnum}`)}
/>
```

- [ ] **Step 3: Make filter chips horizontally scrollable on mobile**

Wrap filter/search section in `flex overflow-x-auto gap-2 pb-2` on mobile:

```typescript
<div className="flex flex-wrap md:flex-nowrap gap-2 overflow-x-auto pb-2 md:pb-0">
  {/* filter buttons/chips */}
</div>
```

- [ ] **Step 4: Verify on mobile viewport**

Fleet page should show cards on mobile, table on desktop.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/fleet/page.tsx
git commit -m "feat: make fleet page responsive with mobile card view"
```

---

### Task 9: Inspections Page

**Files:**
- Modify: `src/app/(dashboard)/inspections/page.tsx`

- [ ] **Step 1: Read the current inspections page**

Read `src/app/(dashboard)/inspections/page.tsx` fully.

- [ ] **Step 2: Replace DataTable with ResponsiveTable**

Same pattern as fleet page. Mobile card shows: vehicle reg, inspection type badge, date, status badge.

- [ ] **Step 3: Add FAB for "New Inspection"**

Import FAB and add below the main content:

```typescript
<FAB label="New Inspection" onClick={() => router.push('/inspections/new')} />
```

- [ ] **Step 4: Make filters responsive**

Horizontally scrollable filter chips on mobile.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/inspections/page.tsx
git commit -m "feat: make inspections page responsive with mobile cards and FAB"
```

---

### Task 10: Bookings Page

**Files:**
- Modify: `src/app/(dashboard)/bookings/page.tsx`

- [ ] **Step 1: Read and make bookings page responsive**

Same pattern: replace `DataTable` with `ResponsiveTable`, add mobile card showing vehicle, customer, dates, status. Add FAB for "New Booking". Make filters scrollable.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/bookings/page.tsx
git commit -m "feat: make bookings page responsive with mobile cards"
```

---

### Task 11: Services Page

**Files:**
- Modify: `src/app/(dashboard)/services/page.tsx`

- [ ] **Step 1: Read and make services page responsive**

Same pattern. Mobile card shows: work order number, vehicle, status, type, dates.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/services/page.tsx
git commit -m "feat: make services page responsive with mobile cards"
```

---

### Task 12: Customers Page

**Files:**
- Modify: `src/app/(dashboard)/customers/page.tsx`

- [ ] **Step 1: Read and make customers page responsive**

Same pattern. Mobile card shows: customer name, active rentals, revenue, status.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/customers/page.tsx
git commit -m "feat: make customers page responsive with mobile cards"
```

---

### Task 13: Analytics Page

**Files:**
- Modify: `src/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Read and make analytics responsive**

Read `src/app/(dashboard)/analytics/page.tsx` fully. Update:
- Chart grids from multi-column to `grid-cols-1 md:grid-cols-2`
- Stat cards: `grid-cols-2 md:grid-cols-4`
- Charts: ensure Recharts `ResponsiveContainer` wraps all charts (it likely already does)
- Wide charts: add `overflow-x-auto` wrapper on mobile

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/analytics/page.tsx
git commit -m "feat: make analytics page responsive for mobile"
```

---

### Task 14: AI Chat Page

**Files:**
- Modify: `src/app/(dashboard)/ai/page.tsx`

- [ ] **Step 1: Read and make AI chat responsive**

Read `src/app/(dashboard)/ai/page.tsx` and its chat component. Update:
- Tab selector: horizontally scrollable on mobile
- Chat area: full height, input fixed at bottom above tab bar (use `bottom: var(--mobile-nav-height)`)
- Chat bubbles: reduce max-width on mobile
- Quick prompts: horizontally scrollable chips

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/ai/page.tsx
git commit -m "feat: make AI chat page responsive for mobile"
```

---

### Task 15: Settings & User Management Pages

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/settings/users/page.tsx`

- [ ] **Step 1: Make settings page responsive**

Single column layout on mobile, stacked sections.

- [ ] **Step 2: Make user management responsive**

Replace DataTable with ResponsiveTable. Mobile card: user name, role badge, status, branch.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/
git commit -m "feat: make settings and user management pages responsive"
```

---

### Task 16: Extract Shared navItems

**Files:**
- Create: `src/lib/nav-items.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create shared nav items file**

Extract the `navItems` array and `NavItem` interface to a shared file:

```typescript
// src/lib/nav-items.ts
import type { Role } from '@/types/auth';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  visibleTo: Role[] | 'all';
}

export const navItems: NavItem[] = [
  // Copy the full array from Sidebar.tsx lines 15-25
];

export function getVisibleItems(userRole: Role): NavItem[] {
  return navItems.filter(
    (item) => item.visibleTo === 'all' || item.visibleTo.includes(userRole)
  );
}
```

- [ ] **Step 2: Update Sidebar.tsx to import from shared file**

Replace the local `NavItem` interface and `navItems` array with:

```typescript
import { navItems, getVisibleItems, type NavItem } from '@/lib/nav-items';
```

Remove local `NavItem` interface (lines 8-13) and `navItems` array (lines 15-25). Replace `visibleItems` filter (line 36-38) with `getVisibleItems(userRole)`.

- [ ] **Step 3: Update MobileNav.tsx to import from shared file**

Same change — remove the duplicated `navItems` array and import from `@/lib/nav-items`.

- [ ] **Step 4: Verify build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav-items.ts src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx
git commit -m "refactor: extract shared nav items to avoid duplication"
```

---

### Task 17: Bookings Calendar Page

**Files:**
- Modify: `src/app/(dashboard)/bookings/calendar/page.tsx`

- [ ] **Step 1: Read the current calendar page**

Read `src/app/(dashboard)/bookings/calendar/page.tsx` fully.

- [ ] **Step 2: Make calendar responsive**

On mobile:
- Switch from full month grid to a compact vertical list/day view
- Add a toggle between "Calendar" and "List" views on mobile
- Date picker at top for quick navigation
- Each day shows bookings as mini cards

On desktop: keep existing calendar grid unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/bookings/calendar/page.tsx
git commit -m "feat: make bookings calendar responsive with mobile list view"
```

---

### Task 18: Mobile Inspection Form (Multi-Step)

**Files:**
- Modify: `src/app/(dashboard)/inspections/[id]/page.tsx`
- Create: `src/components/inspection/MobileInspectionForm.tsx`
- Modify: `src/components/inspection/` (existing inspection components as needed)

This is the most complex mobile UX task. The desktop form stays unchanged. On mobile, the inspection form becomes a multi-step wizard.

- [ ] **Step 1: Read the current inspection detail page**

Read `src/app/(dashboard)/inspections/[id]/page.tsx` and all components in `src/components/inspection/` fully to understand current form structure.

- [ ] **Step 2: Create MobileInspectionForm component**

```typescript
// src/components/inspection/MobileInspectionForm.tsx
'use client';

import { useReducer, useState } from 'react';

type Step = 'vehicle' | 'condition' | 'damage' | 'photos' | 'signatures' | 'review';

const STEPS: { key: Step; label: string }[] = [
  { key: 'vehicle', label: 'Vehicle & Type' },
  { key: 'condition', label: 'Condition' },
  { key: 'damage', label: 'Damage' },
  { key: 'photos', label: 'Photos' },
  { key: 'signatures', label: 'Signatures' },
  { key: 'review', label: 'Review' },
];

interface FormState {
  // All inspection fields accumulated across steps
  [key: string]: unknown;
}

type FormAction =
  | { type: 'UPDATE'; payload: Partial<FormState> }
  | { type: 'RESET' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'RESET':
      return {};
    default:
      return state;
  }
}

interface MobileInspectionFormProps {
  inspectionId: string;
  initialData?: FormState;
  onSave: (data: FormState) => Promise<void>;
}

export default function MobileInspectionForm({
  inspectionId,
  initialData = {},
  onSave,
}: MobileInspectionFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, dispatch] = useReducer(formReducer, initialData);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const updateForm = (updates: Partial<FormState>) => {
    dispatch({ type: 'UPDATE', payload: updates });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--mobile-nav-height)-3.5rem)]">
      {/* Step progress bar */}
      <div className="flex gap-1 px-1 mb-4">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= currentStep ? 'bg-primary' : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        Step {currentStep + 1} of {STEPS.length}: {step.label}
      </p>

      {/* Step content */}
      <div className="flex-1">
        {/* Each step renders the appropriate section of the existing inspection form components.
            Reuse existing components from src/components/inspection/ but wrapped in full-width layout.
            Step 'vehicle': vehicle selection + inspection type
            Step 'condition': mileage, fuel, cleanliness, condition dropdowns
            Step 'damage': full-width VehicleDiagram with touch events, damage detail via BottomSheet
            Step 'photos': camera input with accept="image/*" capture="environment", GPS via navigator.geolocation, thumbnail grid
            Step 'signatures': full-width SignatureCanvas for inspector + customer
            Step 'review': read-only summary of all data with Submit button */}
      </div>

      {/* Step navigation */}
      <div className="flex gap-3 pt-4 border-t border-neutral-100 mt-4">
        {!isFirst && (
          <button
            onClick={goBack}
            className="flex-1 py-3 rounded-xl border border-neutral-300 text-neutral-600 text-sm font-medium"
          >
            Back
          </button>
        )}
        <button
          onClick={isLast ? () => onSave(formData) : goNext}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium"
        >
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Integrate into inspection detail page**

In `src/app/(dashboard)/inspections/[id]/page.tsx`, conditionally render:
- Desktop (>= 768px): existing form layout (unchanged)
- Mobile (< 768px): `MobileInspectionForm` component

Use Tailwind `hidden md:block` / `md:hidden` to render the correct version.

- [ ] **Step 4: Wire up step content**

For each step, reuse existing inspection components from `src/components/inspection/`:
- **Photos step:** Ensure the photo input uses `<input type="file" accept="image/*" capture="environment">` for native camera. Add GPS capture via `navigator.geolocation.getCurrentPosition()`.
- **Damage step:** Render the existing `VehicleDiagram` full-width. Damage detail modal uses `BottomSheet` instead of a side panel.
- **Signatures step:** Render the existing `SignatureCanvas` component at full-width.

- [ ] **Step 5: Commit**

```bash
git add src/components/inspection/MobileInspectionForm.tsx src/app/\(dashboard\)/inspections/\[id\]/page.tsx
git commit -m "feat: add multi-step mobile inspection form with touch-optimized UX"
```

---

### Task 19: Native Select on Mobile

**Files:**
- Modify: `src/components/ui/select.tsx`

- [ ] **Step 1: Read the current select component**

Read `src/components/ui/select.tsx` fully.

- [ ] **Step 2: Add mobile-native rendering**

The existing component is already a `<select>` wrapper. Ensure it has:
- `text-base` class (16px font) to prevent iOS auto-zoom
- Touch-friendly height: `min-h-[44px]`

```typescript
// In the select element, add/update classes:
className="w-full px-3 py-2.5 min-h-[44px] text-base md:text-sm rounded-lg border ..."
```

- [ ] **Step 3: Add global input font size rule**

In `src/app/globals.css`, add after the `:root` block:

```css
/* Prevent iOS auto-zoom on input focus */
@media (max-width: 767px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/select.tsx src/app/globals.css
git commit -m "feat: optimize select and inputs for mobile touch UX"
```

---

### Task 20: Detail Pages (Fleet, Service)

**Files:**
- Modify: `src/app/(dashboard)/fleet/[assetnum]/page.tsx`
- Modify: `src/app/(dashboard)/services/[wonum]/page.tsx`

Note: Inspection detail page is handled separately in Task 18 (multi-step mobile form).

- [ ] **Step 1: Make fleet detail page responsive**

Read and update: change multi-column layouts to `grid-cols-1 md:grid-cols-2`. Sections stack vertically on mobile.

- [ ] **Step 2: Make service detail page responsive**

Same pattern.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fleet/\[assetnum\]/page.tsx src/app/\(dashboard\)/services/\[wonum\]/page.tsx
git commit -m "feat: make fleet and service detail pages responsive"
```

---

## Phase 4: PWA Configuration

### Task 21: Update Manifest & Add Icons

**Files:**
- Modify: `public/manifest.json`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-512-maskable.png`
- Create: `public/icons/apple-touch-icon.png`

- [ ] **Step 1: Update manifest.json**

Replace `public/manifest.json` content:

```json
{
  "id": "gbcr-platform",
  "name": "GBCR Platform",
  "short_name": "GBCR",
  "description": "Goldbell Car Rental Fleet Management",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f0f2f5",
  "theme_color": "#d4941c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

Generate or create placeholder icons at the required sizes. Use the Goldbell logo/brand as the icon. Place in `public/icons/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `icon-512-maskable.png` (512x512 with safe zone padding for adaptive icons)
- `apple-touch-icon.png` (180x180)

For now, create simple placeholder PNGs. Replace with proper branded icons later.

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json public/icons/
git commit -m "feat: update PWA manifest with proper icons and metadata"
```

---

### Task 22: Service Worker & PWA Meta Tags

**Files:**
- Create: `public/sw.js`
- Create: `public/offline.html`
- Create: `src/components/layout/ServiceWorkerRegistration.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create service worker**

```javascript
// public/sw.js
const CACHE_NAME = 'gbcr-v1';
const OFFLINE_URL = '/offline.html';

// Cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/goldbell-logo.svg',
      ]);
    })
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for all requests, offline fallback for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
```

- [ ] **Step 2: Create offline fallback page**

```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GBCR Platform - Offline</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f2f5; color: #333; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; font-size: 0.9rem; }
    button { margin-top: 1rem; padding: 0.75rem 1.5rem; background: #d4941c; color: white; border: none; border-radius: 0.75rem; font-size: 0.9rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>Connect to WiFi to use GBCR Platform.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>
```

- [ ] **Step 3: Create ServiceWorkerRegistration component**

```typescript
// src/components/layout/ServiceWorkerRegistration.tsx
'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  return null;
}
```

- [ ] **Step 4: Update root layout**

Modify `src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegistration from '@/components/layout/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'GBCR Platform',
  description: 'Goldbell Car Rental - Vehicle Booking & Inspection Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GBCR',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#d4941c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npx next build
```

Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add public/sw.js public/offline.html src/components/layout/ServiceWorkerRegistration.tsx src/app/layout.tsx
git commit -m "feat: add PWA service worker, offline page, and meta tags"
```

---

## Phase 5: Final Verification

### Task 23: Cross-Page Mobile Testing

- [ ] **Step 1: Test all pages on mobile viewport**

Open the app in Chrome DevTools with mobile viewport (390px width). Navigate to every page and verify:
- [ ] Dashboard — stat cards 2-col, charts stacked
- [ ] Fleet — card list, filters scrollable
- [ ] Fleet detail — single column
- [ ] Bookings — card list with FAB
- [ ] Inspections — card list with FAB
- [ ] Inspection detail — form stacks vertically
- [ ] Services — card list
- [ ] Service detail — single column
- [ ] Customers — card list
- [ ] Analytics — charts stacked, stats 2-col
- [ ] AI Chat — full screen, input above tab bar
- [ ] Settings — single column
- [ ] Users — card list
- [ ] Login — centered, works on mobile
- [ ] Bottom tab bar — visible, tabs work, "More" opens
- [ ] Mobile header — logo + avatar, sign out works

- [ ] **Step 2: Test on desktop**

Verify desktop is unchanged: sidebar visible, tables show, no bottom tab bar, no mobile header.

- [ ] **Step 3: Test PWA install**

On Chrome: open app → three-dot menu → "Install App" or address bar install icon. Verify:
- App installs with correct name and icon
- Opens in standalone mode (no browser chrome)
- Tab bar has proper safe area padding

- [ ] **Step 4: Test offline fallback**

In DevTools → Network → Offline. Navigate to a page. Should show "You're Offline" page with retry button.

- [ ] **Step 5: Fix any issues found**

Address any layout or interaction issues discovered during testing.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: address mobile responsiveness issues from testing"
```
