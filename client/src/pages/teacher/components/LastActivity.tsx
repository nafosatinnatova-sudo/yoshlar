import { cn } from '@/utils/cn';
import { diffInCalendarDays, formatDateTimeUz, formatRelativeUz, toDate } from '@/utils/date';
import { TEACHER_MESSAGES } from '../teacherUtils';

export interface LastActivityProps {
  /** ISO timestamp of the latest topic completion, or null. */
  value: string | null | undefined;
  /** Reference time (re-rendered on every refresh so relative labels stay fresh). */
  now?: Date;
  /** Show the relative hint ("5 daqiqa oldin") on a second line. Default true. */
  showRelative?: boolean;
  className?: string;
}

/**
 * "8-oktabr, 14:05" + "5 daqiqa oldin" (relative hint only within the last week),
 * or "Hali faollik yo'q" when the student never completed a topic.
 */
export function LastActivity({ value, now = new Date(), showRelative = true, className }: LastActivityProps) {
  const date = toDate(value);
  if (!value || !date) {
    return <span className={cn('text-slate-400 dark:text-slate-500', className)}>{TEACHER_MESSAGES.noActivity}</span>;
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  const absolute = formatDateTimeUz(date, { withYear: !sameYear });
  const daysAgo = diffInCalendarDays(date, now);
  const relative = showRelative && daysAgo !== null && daysAgo >= 0 && daysAgo < 7 ? formatRelativeUz(date, { now }) : null;

  return (
    <span className={cn('flex flex-col', className)}>
      <time dateTime={value} className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
        {absolute}
      </time>
      {relative && <span className="text-xs text-slate-500 dark:text-slate-400">{relative}</span>}
    </span>
  );
}
