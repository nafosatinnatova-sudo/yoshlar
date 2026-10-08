import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'info' | 'neutral';

const ICON_TONES: Record<StatTone, string> = {
  primary: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export interface StatCardProps {
  /** Small caption, e.g. "Jami". */
  label: ReactNode;
  /** Big value, e.g. 6 or "50%". */
  value: ReactNode;
  /** Small text right after the value, e.g. "mavzu". */
  unit?: ReactNode;
  /** Secondary line under the value. */
  sub?: ReactNode;
  /** Icon (e.g. lucide) shown in a tinted square. */
  icon?: ReactNode;
  tone?: StatTone;
  /** Show a skeleton instead of the value. */
  loading?: boolean;
  className?: string;
}

/** KPI card: icon + label + big value (+ unit / sub line). */
export function StatCard({ label, value, unit, sub, icon, tone = 'primary', loading = false, className }: StatCardProps) {
  return (
    <div className={cn('card flex items-center gap-4 p-4 sm:p-5', className)}>
      {icon && (
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6',
            ICON_TONES[tone],
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {loading ? (
          <div className="skeleton mt-1.5 h-7 w-16" aria-hidden="true" />
        ) : (
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="tabular-nums">{value}</span>
            {unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
          </p>
        )}
        {sub && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
