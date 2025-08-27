import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';
type Toast = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 space-y-2 z-50">
        {toasts.map((t) => {
          const variantClasses =
            t.variant === 'success'
              ? 'border-green-600/50 bg-green-500/10 text-green-200'
              : t.variant === 'error'
              ? 'border-red-600/50 bg-red-500/10 text-red-200'
              : t.variant === 'info'
              ? 'border-blue-600/50 bg-blue-500/10 text-blue-200'
              : 'border-gray-700 bg-gray-800 text-white';
          return (
            <div
              key={t.id}
              className={`rounded-lg px-4 py-3 shadow-lg animate-fade-in-up border ${variantClasses}`}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};


