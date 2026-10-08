import { useId } from 'react';
import { CalendarDays, CircleCheck, Clock, Coffee } from 'lucide-react';
import { REVIEW_DAY_LABEL } from '@shared/planner';
import type { PlanDay, PlanTopic } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import { formatDateTimeUz, formatDateUz, formatMinutesShortUz, formatMinutesUz, todayISO } from '@/utils/date';

/** A set or array of topic ids ("t1".."t6"). */
export type TopicIdCollection = ReadonlySet<string> | readonly string[];

function includesId(collection: TopicIdCollection | undefined, id: string): boolean {
  if (!collection) return false;
  return Array.isArray(collection) ? collection.includes(id) : (collection as ReadonlySet<string>).has(id);
}

export interface DayCardProps {
  day: PlanDay;
  /** Called with the topic id and its NEW completed value. Omit (or set readOnly) for a read-only card. */
  onToggle?: (topicId: string, next: boolean) => void;
  /** Disables all checkboxes (teacher view). */
  readOnly?: boolean;
  /** Topics with a request in flight: spinner + "Saqlanmoqda…", further toggles are ignored. */
  pendingTopicIds?: TopicIdCollection;
  /** Topics whose change failed to save: amber "Saqlanmagan" marker (toggling still allowed). */
  unsavedTopicIds?: TopicIdCollection;
  /** Highlight as today. Default: compares day.date with today's local date. */
  isToday?: boolean;
  className?: string;
}

/**
 * One day of a plan: "1-kun", formatted date, "60 daqiqa" and the day's topics as accessible
 * checkboxes ("Mavzu 1 — 30 daq."). Review days (type "review") show "Takrorlash / dam olish".
 */
export function DayCard({
  day,
  onToggle,
  readOnly = false,
  pendingTopicIds,
  unsavedTopicIds,
  isToday,
  className,
}: DayCardProps) {
  const baseId = `day${useId().replace(/:/g, '')}`;
  const headingId = `${baseId}-title`;
  const isReview = day.type === 'review' || day.topics.length === 0;
  const today = isToday ?? (day.date ? day.date === todayISO() : false);
  const doneCount = day.topics.filter((t) => t.completed).length;
  const allDone = !isReview && doneCount === day.topics.length;
  const interactive = !readOnly && typeof onToggle === 'function';

  const HeaderIcon = isReview ? Coffee : allDone ? CircleCheck : CalendarDays;

  return (
    <article
      aria-labelledby={headingId}
      data-day-type={isReview ? 'review' : 'study'}
      className={cn(
        'card flex flex-col overflow-hidden',
        isReview && 'border-dashed border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/[0.06]',
        allDone && 'border-emerald-200 dark:border-emerald-500/30',
        today && 'ring-2 ring-indigo-500/60 ring-offset-2 ring-offset-slate-50 dark:ring-indigo-400/60 dark:ring-offset-slate-950',
        className,
      )}
    >
      <header
        className={cn(
          'flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5',
          !isReview && 'border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              isReview
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                : allDone
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
            )}
            aria-hidden="true"
          >
            <HeaderIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-base font-semibold text-slate-900 dark:text-white">
              {day.dayNumber}-kun
            </h3>
            {day.date && (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                <time dateTime={day.date}>{formatDateUz(day.date)}</time>
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {formatMinutesUz(day.totalMinutes)}
          </span>
          {today && (
            <Badge tone="primary" dot>
              Bugun
            </Badge>
          )}
        </div>
      </header>

      {isReview ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 pb-5 pt-1 text-center sm:px-5">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{REVIEW_DAY_LABEL}</p>
          <p className="max-w-xs text-xs text-amber-800/80 dark:text-amber-200/70">
            O'tilgan mavzularni takrorlang yoki dam oling. Bu kun bajarilish foiziga ta'sir qilmaydi.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {day.topics.map((topic) => (
              <TopicRow
                key={topic.topicId}
                topic={topic}
                inputId={`${baseId}-${topic.topicId}`}
                interactive={interactive}
                pending={includesId(pendingTopicIds, topic.topicId)}
                unsaved={includesId(unsavedTopicIds, topic.topicId)}
                onToggle={onToggle}
              />
            ))}
          </ul>
          <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5">
            <span className="tabular-nums">
              {doneCount}/{day.topics.length} mavzu bajarildi
            </span>
            {allDone && (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Kun yakunlandi
              </span>
            )}
          </footer>
        </>
      )}
    </article>
  );
}

interface TopicRowProps {
  topic: PlanTopic;
  inputId: string;
  interactive: boolean;
  pending: boolean;
  unsaved: boolean;
  onToggle?: (topicId: string, next: boolean) => void;
}

function TopicRow({ topic, inputId, interactive, pending, unsaved, onToggle }: TopicRowProps) {
  const metaId = `${inputId}-meta`;
  const showCompletedAt = topic.completed && Boolean(topic.completedAt);
  const hasMeta = pending || unsaved || showCompletedAt;

  return (
    <li
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors sm:px-5',
        topic.completed && 'bg-emerald-50/50 dark:bg-emerald-500/[0.05]',
      )}
      aria-busy={pending || undefined}
    >
      <input
        id={inputId}
        type="checkbox"
        className="checkbox mt-0.5"
        checked={topic.completed}
        disabled={!interactive}
        aria-describedby={hasMeta ? metaId : undefined}
        onChange={() => {
          if (!interactive || pending) return;
          onToggle?.(topic.topicId, !topic.completed);
        }}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={inputId}
          className={cn('flex items-start justify-between gap-3', interactive ? 'cursor-pointer' : 'cursor-default')}
        >
          <span
            className={cn(
              'min-w-0 break-words text-sm font-medium text-slate-800 dark:text-slate-100',
              topic.completed && 'text-slate-400 line-through decoration-slate-400 dark:text-slate-500 dark:decoration-slate-500',
            )}
          >
            {topic.title}
          </span>
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {formatMinutesShortUz(topic.minutes)}
          </span>
        </label>
        {hasMeta && (
          <p id={metaId} className="mt-1 flex items-center gap-1.5 text-xs font-medium">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Spinner size="xs" />
                Saqlanmoqda…
              </span>
            ) : unsaved ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                Saqlanmagan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Bajarildi: {formatDateTimeUz(topic.completedAt)}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}
