import type { PlanDay } from '@/api/types';
import { cn } from '@/utils/cn';
import { DayCard, type DayCardProps } from './DayCard';

export interface DayGridProps extends Omit<DayCardProps, 'day' | 'isToday' | 'className'> {
  days: readonly PlanDay[];
  className?: string;
}

/** Responsive grid of DayCards (1 col → 2 cols at sm → 3 cols at lg). */
export function DayGrid({ days, className, ...cardProps }: DayGridProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {days.map((day) => (
        <DayCard key={day.dayNumber} day={day} {...cardProps} />
      ))}
    </div>
  );
}
