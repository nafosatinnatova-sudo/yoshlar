import type { ReactNode } from 'react';
import { BookOpen, CalendarCheck, CalendarDays, Clock, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { formatDateUz, formatMinutesUz } from '@/utils/date';

export interface PlanHeaderProps {
  title: string;
  /** Exam / subject name. */
  subject: string;
  /** "YYYY-MM-DD" */
  startDate: string | null;
  /** "YYYY-MM-DD" */
  endDate: string | null;
  daysCount: number;
  dailyMinutes: number;
  /** Buttons on the right (e.g. "Rejani o'chirish"). */
  actions?: ReactNode;
  /** Extra badge(s) next to the subject (e.g. "Ko'rish rejimi", status). */
  badges?: ReactNode;
  /** Use 'h2' when the page already has an h1 (e.g. preview on the New plan page). Default 'h1'. */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

/** Plan title card: subject, title, start/end dates ("10-oktabr, 2026"), days and daily minutes. */
export function PlanHeader({
  title,
  subject,
  startDate,
  endDate,
  daysCount,
  dailyMinutes,
  actions,
  badges,
  headingLevel = 'h1',
  className,
}: PlanHeaderProps) {
  const Heading = headingLevel;
  return (
    <header className={cn('card card-body', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary" size="md">
              <BookOpen aria-hidden="true" />
              <span className="truncate">{subject}</span>
            </Badge>
            {badges}
          </div>
          <Heading
            className={cn(
              'mt-3 break-words font-bold tracking-tight text-slate-900 dark:text-white',
              headingLevel === 'h1' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
            )}
          >
            {title}
          </Heading>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetaItem icon={<CalendarDays />} label="Boshlanish sanasi" value={startDate ? formatDateUz(startDate) : '—'} />
        <MetaItem icon={<CalendarCheck />} label="Tugash sanasi" value={endDate ? formatDateUz(endDate) : '—'} />
        <MetaItem icon={<ListChecks />} label="Kunlar soni" value={`${daysCount} kun`} />
        <MetaItem icon={<Clock />} label="Kunlik vaqt" value={formatMinutesUz(dailyMinutes)} />
      </dl>
    </header>
  );
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <span className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
      </div>
    </div>
  );
}
