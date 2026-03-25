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
      style={{ bottom: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
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
