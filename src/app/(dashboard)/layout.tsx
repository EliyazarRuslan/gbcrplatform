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
