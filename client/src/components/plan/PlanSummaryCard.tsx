import type { ReactNode } from 'react';
import { CalendarDays, Clock, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PlanSummary } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/utils/cn';
import { formatDateRangeUz } from '@/utils/date';
import { planStatus } from './planStatus';

export interface PlanSummaryCardProps {
  /** A PlanSummary (or a full Plan — extra fields are ignored). */
  plan: PlanSummary;
  /** Where the card links to. Default `/plans/${plan.id}`. Pass null for a non-clickable card. */
  to?: string | null;
  /** Buttons rendered in the footer (kept clickable above the card link), e.g. a delete button. */
  actions?: ReactNode;
  /** Heading element (default h3). */
  titleAs?: 'h2' | 'h3';
  className?: string;
}

/** Compact plan card for lists/dashboards: subject, title, dates, status badge, progress bar. */
export function PlanSummaryCard({ plan, to, actions, titleAs = 'h3', className }: PlanSummaryCardProps) {
  const href = to === undefined ? `/plans/${plan.id}` : to;
  const status = planStatus(plan.progress.percent);
  const Heading = titleAs;

  return (
    <article className={cn('card card-body relative flex flex-col gap-4', href && 'card-interactive', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {plan.subject}
          </p>
          <Heading className="mt-1 break-words text-base font-semibold text-slate-900 dark:text-white">
            {href ? (
              <Link
                to={href}
                className="rounded after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-500"
              >
                {plan.title}
              </Link>
            ) : (
              plan.title
            )}
          </Heading>
        </div>
        <Badge tone={status.tone} dot className="shrink-0">
          {status.label}
        </Badge>
      </div>

      <ProgressBar value={plan.progress.percent} label={`${plan.title}: bajarilish foizi`} showValue size="sm" />

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <li className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDateRangeUz(plan.startDate, plan.endDate)}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {plan.progress.completed}/{plan.progress.total} mavzu
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {plan.daysCount} kun · kuniga {plan.dailyMinutes} daqiqa
        </li>
      </ul>

      {actions && <div className="relative z-10 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </article>
  );
}
