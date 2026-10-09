import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  msg: string;
  type: 'error' | 'warning' | 'success' | 'info';
}

interface ToastNotificationCenterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotificationCenter: React.FC<ToastNotificationCenterProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed top-28 right-6 z-[60] flex flex-col gap-2 w-80 pointer-events-none" dir="rtl">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isSuccess = toast.type === 'success';

          const icon = isError ? (
            <AlertCircle className="w-5 h-5 text-rose-455 shrink-0" />
          ) : isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-455 shrink-0" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-455 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-sky-455 shrink-0" />
          );

          const bgClasses = isError
            ? 'bg-rose-950/90 border border-rose-500/30 text-rose-200'
            : isWarning
            ? 'bg-amber-950/90 border border-amber-500/30 text-amber-200'
            : isSuccess
            ? 'bg-emerald-950/90 border border-emerald-500/30 text-emerald-200'
            : 'bg-slate-900/90 border border-slate-750 text-slate-200';

          return (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`p-3.5 rounded-xl shadow-xl flex items-start gap-2.5 backdrop-blur-md pointer-events-auto select-none ${bgClasses}`}
            >
              {icon}
              <div className="flex-1 min-w-0 pr-0.5">
                <span className="text-[10px] font-bold leading-relaxed block text-right font-sans">
                  {toast.msg}
                </span>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 p-0.5 hover:bg-black/10 rounded"
                title="بستن هشدار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
