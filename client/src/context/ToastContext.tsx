import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/Toaster';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** Optional bold first line. */
  title?: string;
  /** Auto-dismiss delay in ms (default: success/info 4000, warning 5000, error 6000). 0 = sticky. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

/** Never stack more than this many toasts. */
const MAX_TOASTS = 4;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const push = useCallback((type: ToastType, message: string, options: ToastOptions = {}): number => {
    const id = nextId.current++;
    const item: ToastItem = {
      id,
      type,
      message,
      title: options.title,
      duration: options.duration ?? DEFAULT_DURATION[type],
    };
    setToasts((list) => {
      // De-duplicate: the same message re-appears as a fresh toast instead of stacking copies.
      const rest = list.filter((t) => !(t.type === type && t.message === message && t.title === item.title));
      return [...rest, item].slice(-MAX_TOASTS);
    });
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      warning: (message, options) => push('warning', message, options),
      dismiss,
      clear,
    }),
    [push, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Toast notifications. The returned object is referentially stable (safe in effect deps).
 * @example const toast = useToast(); toast.success("Reja muvaffaqiyatli saqlandi.");
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
