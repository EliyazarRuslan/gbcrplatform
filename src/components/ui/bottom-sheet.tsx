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
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="fixed bottom-0 left-0 right-0 z-[51] bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up"
      >
        <div className="relative flex items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-100">
          <div className="w-10 h-1 bg-neutral-300 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
          {title && <h3 id="sheet-title" className="text-base font-semibold text-neutral-800 mt-2">{title}</h3>}
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 mt-2 ml-auto">
            <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
