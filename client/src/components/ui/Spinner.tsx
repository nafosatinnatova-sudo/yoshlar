import { cn } from '@/utils/cn';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Accessible text. When set the spinner is announced (role="status"); otherwise it is decorative. */
  label?: string;
}

/** Animated loading indicator (inherits text color). */
export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const svg = (
    <svg className={cn('animate-spin', SIZES[size], className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
  if (!label) return svg;
  return (
    <span role="status" className="inline-flex items-center">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface PageLoaderProps {
  /** Default "Yuklanmoqda…" */
  label?: string;
  /** Fill the whole viewport (used while the session is verified). */
  fullScreen?: boolean;
  className?: string;
}

/** Centered spinner + text for page-level loading states. */
export function PageLoader({ label = 'Yuklanmoqda…', fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-16 text-slate-500 dark:text-slate-400',
        fullScreen && 'min-h-screen',
        className,
      )}
    >
      <Spinner size="lg" className="text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
