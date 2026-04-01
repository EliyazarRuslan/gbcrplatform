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
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Sign out failed:', response.status);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-neutral-200/60 sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <img src="/goldbell-logo.svg" alt="Goldbell" className="w-8 h-8 rounded-lg" />
        <div className="leading-tight">
          <span className="font-bold text-[14px] text-neutral-900 tracking-wide uppercase">Goldbell</span>
          <span className="text-[10px] font-semibold text-neutral-400 block tracking-[0.15em] uppercase">Fleet Platform</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* TODO: wire onNotificationsClick prop when notifications panel is implemented */}
        <button aria-label="Notifications" disabled aria-disabled="true" className="relative p-2 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg hover:bg-neutral-50 opacity-60">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-lg bg-charcoal text-white text-[12px] font-bold flex items-center justify-center"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-xl shadow-black/[0.06] border border-neutral-200 py-1 z-50 animate-scale-in">
              <div className="px-4 py-2.5 border-b border-neutral-100">
                <p className="text-[14px] font-semibold text-neutral-800 truncate">{user.full_name}</p>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{user.role.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push('/change-password'); }}
                className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors"
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
