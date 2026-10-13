import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';
import { toast, ToastItem, ToastType } from '../../services/toast';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${getToastStyles(
              t.type
            )}`}
          >
            <div className="shrink-0 mt-0.5">{getToastIcon(t.type)}</div>
            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-sm font-bold leading-tight">{t.title}</h5>
              {t.message && (
                <p className="text-xs mt-1 opacity-90 whitespace-pre-line leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="shrink-0 text-current opacity-60 hover:opacity-100 p-1 rounded-lg transition-opacity hover:bg-black/5"
              title="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

function getToastStyles(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20';
    case 'error':
      return 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20';
    case 'warning':
      return 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-900/20';
    case 'info':
    default:
      return 'bg-slate-900 text-white border-slate-800 shadow-slate-950/30';
  }
}

function getToastIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="text-white" size={20} />;
    case 'error':
      return <AlertOctagon className="text-white" size={20} />;
    case 'warning':
      return <AlertTriangle className="text-slate-950" size={20} />;
    case 'info':
    default:
      return <Info className="text-blue-400" size={20} />;
  }
}
