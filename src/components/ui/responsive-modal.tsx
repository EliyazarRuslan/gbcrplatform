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
