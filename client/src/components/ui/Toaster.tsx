import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastItem, ToastType } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

const ICONS: Record<ToastType, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert,
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-rose-500 dark:text-rose-400',
  info: 'text-indigo-500 dark:text-indigo-400',
  warning: 'text-amber-500 dark:text-amber-400',
};

const ACCENTS: Record<ToastType, string> = {
  success: 'before:bg-emerald-500',
  error: 'before:bg-rose-500',
  info: 'before:bg-indigo-500',
  warning: 'before:bg-amber-500',
};

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/**
 * Toast stack. Top-center on phones, bottom-right from `sm` up.
 * The container is a permanent polite live region; error toasts use role="alert".
 */
export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end sm:p-6"
    >
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (paused || toast.duration <= 0) return;
    const timer = setTimeout(() => onDismissRef.current(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration]);

  const Icon = ICONS[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm animate-slide-down items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-2 shadow-lg sm:animate-slide-up',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        'dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40',
        ACCENTS[toast.type],
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLORS[toast.type])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <p className="font-semibold text-slate-900 dark:text-white">{toast.title}</p>}
        <p className={cn('break-words text-slate-700 dark:text-slate-200', toast.title && 'mt-0.5')}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-my-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Bildirishnomani yopish"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
