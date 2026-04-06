'use client';

import type { ReactNode } from 'react';

interface FABProps {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}

export default function FAB({ onClick, label, icon }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed z-30 right-4 bg-charcoal text-white rounded-xl shadow-lg shadow-black/20 px-5 py-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider active:scale-95 transition-transform"
      style={{ bottom: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
    >
      {icon || (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label}
    </button>
  );
}
