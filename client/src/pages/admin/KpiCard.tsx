import { useId, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui';
import { cn } from '@/utils/cn';

export type KpiTone = 'primary' | 'success' | 'warning' | 'violet';

// Literal class maps (Tailwind cannot see dynamically built class names).
const ICON_TONES: Record<KpiTone, string> = {
  primary: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
};

export interface KpiDetail {
  label: string;
  value: ReactNode;
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Small text after the value, e.g. "/ 18". */
  unit?: ReactNode;
  icon: ReactNode;
  tone?: KpiTone;
  /** Breakdown rows under the value (rendered as a description list, wraps on narrow cards). */
  details?: KpiDetail[];
  /** Extra content at the bottom (e.g. a progress bar). */
  footer?: ReactNode;
  className?: string;
}

/**
 * KPI tile for the admin statistics. Unlike the shared StatCard it has room for a breakdown
 * ("O'quvchilar 12 / O'qituvchilar 3 …") that stays readable in a 2-column grid at 360px.
 */
export function KpiCard({ label, value, unit, icon, tone = 'primary', details, footer, className }: KpiCardProps) {
  const titleId = useId();
  return (
    <article className={cn('card flex flex-col p-4 sm:p-5', className)} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-2">
        <h3 id={titleId} className="min-w-0 text-sm font-medium leading-snug text-slate-500 dark:text-slate-400">
          {label}
        </h3>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 [&>svg]:h-5 [&>svg]:w-5',
            ICON_TONES[tone],
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        <span className="tabular-nums" data-testid="kpi-value">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
      </p>
      {details && details.length > 0 && (
        <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-800 sm:text-sm">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-2">
              <dt className="min-w-0 truncate text-slate-500 dark:text-slate-400">{detail.label}</dt>
              <dd className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </article>
  );
}

/** Placeholder with the same footprint as a KpiCard. */
export function KpiCardSkeleton() {
  return (
    <div className="card space-y-3 p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
