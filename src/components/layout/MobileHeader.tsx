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
