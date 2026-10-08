import { useId } from 'react';
import { cn } from '@/utils/cn';

/** Brand mark (gradient square with checklist) — decorative. */
export function LogoMark({ className }: { className?: string }) {
  const gradientId = `ssp-logo${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('h-9 w-9 shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M9 10.5h9M9 15.5h6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14.5 21.5l3 3 6-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface LogoProps {
  className?: string;
  /** Hide the "Smart Study Planner" text (mark only). */
  markOnly?: boolean;
  /** White text for colored backgrounds. */
  inverted?: boolean;
}

/** Brand mark + "Smart Study Planner" wordmark. */
export function Logo({ className, markOnly = false, inverted = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!markOnly && (
        <span
          className={cn(
            'text-base font-bold leading-tight tracking-tight',
            inverted ? 'text-white' : 'text-slate-900 dark:text-white',
          )}
        >
          Smart Study <span className={inverted ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}>Planner</span>
        </span>
      )}
    </span>
  );
}
