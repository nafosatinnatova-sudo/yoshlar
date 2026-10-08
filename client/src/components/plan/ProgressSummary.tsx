import { useMemo } from 'react';
import { CircleCheck, ListChecks, Target } from 'lucide-react';
import { computeProgress } from '@shared/planner';
import type { PlanDay } from '@/api/types';
import { ProgressBar, progressTone } from '@/components/ui/ProgressBar';
import { StatCard, type StatTone } from '@/components/ui/StatCard';
import { cn } from '@/utils/cn';

export interface ProgressSummaryProps {
  /** Current days state (local/optimistic state is fine) — progress is computed from it. */
  days: ReadonlyArray<Pick<PlanDay, 'topics'>>;
  /** Visible caption above the progress bar. Default "Umumiy bajarilish". */
  barLabel?: string;
  className?: string;
}

const TONE_BY_PROGRESS: Record<ReturnType<typeof progressTone>, StatTone> = {
  success: 'success',
  primary: 'primary',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
};

/**
 * "Jami — 6 mavzu", "Bajarildi — N mavzu", "Natija — P% bajarilgan" + progress bar.
 * Uses the shared computeProgress (identical to the backend). Changes are announced politely.
 */
export function ProgressSummary({ days, barLabel = 'Umumiy bajarilish', className }: ProgressSummaryProps) {
  const progress = useMemo(() => computeProgress(days), [days]);
  const tone = TONE_BY_PROGRESS[progressTone(progress.percent)];

  return (
    <section aria-label="Bajarilish natijasi" className={cn('space-y-3 sm:space-y-4', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Jami" value={progress.total} unit="mavzu" icon={<ListChecks />} tone="primary" />
        <StatCard label="Bajarildi" value={progress.completed} unit="mavzu" icon={<CircleCheck />} tone="success" />
        <StatCard label="Natija" value={`${progress.percent}%`} unit="bajarilgan" icon={<Target />} tone={tone} />
      </div>
      <div className="card px-4 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">{barLabel}</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {progress.completed} / {progress.total} mavzu
          </span>
        </div>
        <ProgressBar value={progress.percent} label={barLabel} size="lg" />
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {`Bajarildi ${progress.completed} / ${progress.total} mavzu. Natija: ${progress.percent} foiz.`}
      </p>
    </section>
  );
}
