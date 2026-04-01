'use client';

import { useState, useEffect, useCallback } from 'react';
import { navItems } from '@/lib/nav-items';
import type { Role } from '@/types/auth';

const ALL_ROLES: { key: Role; label: string }[] = [
  { key: 'super_admin', label: 'Super Admin' },
  { key: 'branch_manager', label: 'Branch Manager' },
  { key: 'customer_service', label: 'Customer Service' },
  { key: 'rental_officer', label: 'Rental Officer' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'driver', label: 'Driver' },
  { key: 'finance', label: 'Finance' },
];

// Pages that can be configured (exclude Dashboard which is always visible)
const CONFIGURABLE_PAGES = navItems.filter((item) => item.visibleTo !== 'all');

type AccessMap = Record<string, Record<string, boolean>>;

export default function NavAccessControl() {
  const [access, setAccess] = useState<AccessMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Build initial state from defaults + DB overrides
  const loadAccess = useCallback(async () => {
    // Start with hardcoded defaults
    const defaults: AccessMap = {};
    for (const page of CONFIGURABLE_PAGES) {
      defaults[page.href] = {};
      for (const role of ALL_ROLES) {
        defaults[page.href][role.key] =
          page.visibleTo === 'all' || (Array.isArray(page.visibleTo) && page.visibleTo.includes(role.key));
      }
    }

    try {
      const res = await fetch('/api/settings/nav-access');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        for (const row of data.data) {
          if (defaults[row.nav_href] && defaults[row.nav_href][row.role] !== undefined) {
            defaults[row.nav_href][row.role] = row.has_access;
          }
        }
      }
    } catch {
      // Use defaults if API fails
    }

    setAccess(defaults);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  function toggleAccess(href: string, role: string) {
    // Don't allow removing super_admin from anything
    if (role === 'super_admin') return;

    setAccess((prev) => ({
      ...prev,
      [href]: {
        ...prev[href],
        [role]: !prev[href][role],
      },
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const updates: Array<{ nav_href: string; role: string; has_access: boolean }> = [];

    for (const [href, roles] of Object.entries(access)) {
      for (const [role, hasAccess] of Object.entries(roles)) {
        updates.push({ nav_href: href, role, has_access: hasAccess });
      }
    }

    try {
      const res = await fetch('/api/settings/nav-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (data.success) {
        setDirty(false);
        setToast('Navigation access saved');
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast('Error: ' + data.error);
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast('Failed to save');
      setTimeout(() => setToast(null), 4000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
        <div className="skeleton h-6 w-48 mb-4 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/[0.07] flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-neutral-900">Navigation Access</h2>
          <p className="text-[13px] font-medium text-neutral-400 mt-1">Control which roles can see each page in the sidebar</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
            dirty
              ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
              : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50">
              <th className="text-left px-6 py-3.5 text-[12px] font-bold text-neutral-400 uppercase tracking-wider w-44">
                Page
              </th>
              {ALL_ROLES.map((role) => (
                <th key={role.key} className="text-center px-3 py-3.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONFIGURABLE_PAGES.map((page, idx) => (
              <tr
                key={page.href}
                className={`border-t border-black/[0.05] ${idx % 2 === 0 ? '' : 'bg-neutral-50/50'} hover:bg-primary/[0.02] transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={page.icon} />
                      </svg>
                    </div>
                    <span className="text-[14px] font-semibold text-neutral-900">{page.label}</span>
                  </div>
                </td>
                {ALL_ROLES.map((role) => {
                  const isEnabled = access[page.href]?.[role.key] ?? false;
                  const isSuperAdmin = role.key === 'super_admin';
                  return (
                    <td key={role.key} className="text-center px-3 py-4">
                      <button
                        onClick={() => toggleAccess(page.href, role.key)}
                        disabled={isSuperAdmin}
                        className={`w-10 h-6 rounded-full relative transition-all duration-200 ${
                          isSuperAdmin
                            ? 'bg-primary/30 cursor-not-allowed'
                            : isEnabled
                            ? 'bg-primary cursor-pointer'
                            : 'bg-neutral-200 cursor-pointer hover:bg-neutral-300'
                        }`}
                        title={isSuperAdmin ? 'Super Admin always has access' : `Toggle ${role.label} access to ${page.label}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                            isEnabled || isSuperAdmin ? 'left-[18px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info footer */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-black/[0.05]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span className="text-[12px] font-medium text-neutral-400">
            Dashboard is always visible to all roles. Super Admin access cannot be restricted. Changes take effect on next login.
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-charcoal text-white px-5 py-3 rounded-xl shadow-lg text-[14px] font-semibold animate-scale-in">
          {toast}
        </div>
      )}
    </div>
  );
}
