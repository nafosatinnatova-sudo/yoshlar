import { cn } from '@/utils/cn';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** Color by value: 100 → success, ≥50 → primary, >0 → warning, 0 → neutral. */
export function progressTone(value: number): ProgressTone {
  if (value >= 100) return 'success';
  if (value >= 50) return 'primary';
  if (value > 0) return 'warning';
  return 'neutral';
}

/** Clamps to 0–100 and rounds (NaN → 0). */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

const FILLS: Record<ProgressTone, string> = {
  primary: 'bg-gradient-to-r from-indigo-500 to-violet-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-400',
};

const VALUE_COLORS: Record<ProgressTone, string> = {
  primary: 'text-indigo-600 dark:text-indigo-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-500 dark:text-slate-400',
};

const HEIGHTS = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' } as const;

export interface ProgressBarProps {
  /** Percent 0–100 (clamped & rounded). */
  value: number;
  /** Accessible name (and visible caption when showLabel). Default "Bajarilish foizi". */
  label?: string;
  /** Show `label` above the bar. */
  showLabel?: boolean;
  /** Show the value text, e.g. "50%". */
  showValue?: boolean;
  /** Color; 'auto' (default) picks by value via progressTone(). */
  tone?: ProgressTone | 'auto';
  size?: keyof typeof HEIGHTS;
  className?: string;
}

/** Accessible progress bar (role="progressbar", aria-valuenow 0–100). */
export function ProgressBar({
  value,
  label = 'Bajarilish foizi',
  showLabel = false,
  showValue = false,
  tone = 'auto',
  size = 'md',
  className,
}: ProgressBarProps) {
  const pct = clampPercent(value);
  const resolvedTone = tone === 'auto' ? progressTone(pct) : tone;
  const valueText = `${pct}%`;

  const bar = (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
      className={cn('relative w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800', HEIGHTS[size])}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', FILLS[resolvedTone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  if (showLabel) {
    return (
      <div className={cn('w-full', className)}>
        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
          {showValue && <span className={cn('font-semibold tabular-nums', VALUE_COLORS[resolvedTone])}>{valueText}</span>}
        </div>
        {bar}
      </div>
    );
  }

  if (showValue) {
    return (
      <div className={cn('flex w-full items-center gap-3', className)}>
        <div className="min-w-0 flex-1">{bar}</div>
        <span className={cn('w-11 shrink-0 text-right text-sm font-semibold tabular-nums', VALUE_COLORS[resolvedTone])}>
          {valueText}
        </span>
      </div>
    );
  }

  return <div className={cn('w-full', className)}>{bar}</div>;
}
