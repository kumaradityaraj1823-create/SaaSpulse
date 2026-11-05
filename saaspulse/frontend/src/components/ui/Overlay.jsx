import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscape } from '../../lib/hooks';

function useLockScroll(open) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-md' }) {
  useEscape(onClose, open);
  useLockScroll(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/35 dark:bg-black/60 anim-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} rounded-t-xl sm:rounded-xl border border-line bg-surface shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)] anim-pop-in max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-ink-2">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-1.5 -mt-1 rounded-md p-1.5 text-muted hover:bg-hover hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5 bg-surface-2 rounded-b-xl">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, children, label }) {
  useEscape(onClose, open);
  useLockScroll(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/55 anim-fade-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] border-l border-line bg-surface shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.25)] anim-slide-in flex flex-col">
        {children}
      </aside>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, danger, loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3.5 rounded-lg text-[13.5px] font-medium border border-line-strong bg-surface hover:bg-hover">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-white disabled:opacity-50 ${danger ? 'bg-down' : 'bg-ink !text-inverse'}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
