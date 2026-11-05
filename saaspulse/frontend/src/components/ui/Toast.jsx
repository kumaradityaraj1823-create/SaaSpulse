import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex flex-col gap-2 sm:left-1/2 sm:right-auto sm:w-[360px] sm:-translate-x-1/2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="anim-pop-in flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.22)]">
            {t.type === 'error' ? <AlertCircle className="mt-px h-4 w-4 shrink-0 text-down" /> : <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-up" />}
            <p className="flex-1 text-[13px] text-ink">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
