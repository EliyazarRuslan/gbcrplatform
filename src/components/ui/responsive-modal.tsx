'use client';

import { useEffect } from 'react';
import BottomSheet from '@/components/ui/bottom-sheet';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function ResponsiveModal({ open, onClose, title, children }: ResponsiveModalProps) {
  // Escape key handler — desktop only. On mobile the BottomSheet mounts inside the md:hidden
  // wrapper and handles Escape itself; attaching here too would double-fire onClose.
  useEffect(() => {
    if (!open) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />
        {/* Modal container — stopPropagation prevents backdrop click from firing through */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'responsive-modal-title' : undefined}
          onClick={onClose}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — always rendered so close button is always accessible */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              {title ? (
                <h3 id="responsive-modal-title" className="text-lg font-semibold text-neutral-800">{title}</h3>
              ) : (
                <span />
              )}
              <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400">
                <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
