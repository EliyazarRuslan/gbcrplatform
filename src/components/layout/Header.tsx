'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Role } from '@/types/auth';

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/fleet': 'Fleet Management',
  '/bookings': 'Bookings',
  '/inspections': 'Inspections',
  '/services': 'Service & Maintenance',
  '/customers': 'Customers',
  '/analytics': 'Analytics',
  '/ai': 'AI Insights',
  '/settings': 'Settings',
  '/settings/users': 'User Management',
};

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  customer_service: 'Customer Service',
  rental_officer: 'Rental Officer',
  inspector: 'Inspector',
  driver: 'Driver',
  finance: 'Finance',
};

interface HeaderProps {
  user: {
    full_name: string;
    role: string;
    email: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((seg, i) => ({
      label: breadcrumbMap['/' + segments.slice(0, i + 1).join('/')] || seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore errors, redirect regardless
    }
    router.push('/login');
  }

  const roleLabel = roleLabels[user.role as Role] ?? user.role;
  const avatarLetter = user.full_name.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {i > 0 && <span className="text-neutral-300">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Right side — user dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {avatarLetter}
          </div>

          {/* Name + role */}
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-neutral-900 leading-tight">{user.full_name}</p>
            <p className="text-xs text-neutral-500 leading-tight">{roleLabel}</p>
          </div>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Email */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <Link
                href="/change-password"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
