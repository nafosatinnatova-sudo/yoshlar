import { Activity } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ActivityPoint } from '@/api/types';
import { Card, CardHeader, EmptyState } from '@/components/ui';
import { useChartTheme } from '@/hooks/useChartTheme';
import { cn } from '@/utils/cn';
import { formatDateUz, formatDayMonthUz, formatShortDateUz, formatWeekdayUz } from '@/utils/date';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface ActivityChartProps {
  /** Completions per day, oldest → newest (API: last 14 days incl. today). */
  points: ActivityPoint[];
  className?: string;
}

const SERIES_LABEL = 'Bajarilgan mavzular';

/** Plain-language summary used for the chart's accessible name and the caption under it. */
export function summarizeActivity(points: readonly ActivityPoint[]): { total: number; text: string } {
  const total = points.reduce((sum, point) => sum + Math.max(0, point.completed), 0);
  if (total === 0) return { total, text: `So'nggi ${points.length} kunda birorta ham mavzu bajarilmagan.` };
  // Busiest day; on ties the most recent one.
  const best = points.reduce((top, point) => (point.completed >= top.completed ? point : top), points[0]);
  return {
    total,
    text: `So'nggi ${points.length} kunda jami ${total} ta mavzu bajarildi. Eng faol kun: ${formatDayMonthUz(best.date)} (${best.completed} ta).`,
  };
}

/** Bar chart of topic completions per day across the whole system. */
export function ActivityChart({ points, className }: ActivityChartProps) {
  const chart = useChartTheme();
  const reduceMotion = usePrefersReducedMotion();

  const data = points.map((point) => ({
    date: point.date,
    label: formatShortDateUz(point.date),
    completed: point.completed,
  }));
  const { total, text } = summarizeActivity(points);
  const days = points.length || 14;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        icon={<Activity />}
        title={`So'nggi ${days} kunlik faollik`}
        description="Har kuni bajarilgan mavzular soni (barcha o'quvchilar)"
      />
      {total === 0 ? (
        <EmptyState compact titleAs="p" tone="neutral" icon={<Activity />} title="Hali faollik yo'q" description={text} />
      ) : (
        <>
          <div className="h-64 sm:h-72" role="img" aria-label={`${SERIES_LABEL} grafigi. ${text}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid {...chart.gridProps} />
                <XAxis dataKey="label" {...chart.axisProps} interval="preserveStartEnd" minTickGap={10} />
                <YAxis {...chart.axisProps} allowDecimals={false} width={40} />
                <Tooltip
                  {...chart.tooltipProps}
                  labelFormatter={(label, payload) => {
                    const date = (payload?.[0]?.payload as { date?: string } | undefined)?.date;
                    return date ? `${formatDateUz(date)}, ${formatWeekdayUz(date)}` : label;
                  }}
                  formatter={(value) => [`${value} ta`, SERIES_LABEL]}
                />
                <Bar
                  dataKey="completed"
                  name={SERIES_LABEL}
                  fill={chart.colors.primary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={!reduceMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400" aria-hidden="true">
            {text}
          </p>
          <details className="group mt-3">
            <summary className="link cursor-pointer select-none text-sm">Jadval ko'rinishida</summary>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{`So'nggi ${days} kunda bajarilgan mavzular`}</caption>
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Sana
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {SERIES_LABEL}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.date} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{formatDateUz(point.date)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                        {point.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}
