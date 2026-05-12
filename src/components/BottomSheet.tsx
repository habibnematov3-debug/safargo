import type { ReactNode } from 'react';

type BottomSheetProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const BottomSheet = ({ title, isOpen, onClose, children }: BottomSheetProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/50 transition-opacity"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        aria-label="Close"
      />

      {/* Sheet */}
      <div className="safe-bottom flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 animate-in slide-in-from-bottom">
        {/* Header with close button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button
            className="text-2xl font-bold text-slate-400 transition active:scale-90"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">{children}</div>
      </div>
    </div>
  );
};
