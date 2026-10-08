import { ChartPie, Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { percentOf } from '@shared/planner';
import type { AdminStatistics } from '@/api/types';
import { Card, CardHeader, EmptyState } from '@/components/ui';
import { useChartTheme } from '@/hooks/useChartTheme';
import { cn } from '@/utils/cn';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type UserCounts = AdminStatistics['users'];

/**
 * Role colors match the role badges (student indigo, teacher emerald, admin amber).
 * Dark mode uses the 600 steps: the 500 steps fall outside the readable lightness band on slate-900
 * (checked with the dataviz palette validator). Identity is never color-only — the legend lists
 * every role with its count and percent.
 */
const ROLE_SLICES = [
  { key: 'students', label: "O'quvchilar", light: '#6366f1', dark: '#6366f1' },
  { key: 'teachers', label: "O'qituvchilar", light: '#10b981', dark: '#059669' },
  { key: 'admins', label: 'Administratorlar', light: '#f59e0b', dark: '#d97706' },
] as const satisfies ReadonlyArray<{ key: keyof UserCounts; label: string; light: string; dark: string }>;

export interface UsersByRoleChartProps {
  users: UserCounts;
  className?: string;
}

/** Donut of users per role + a legend that doubles as the data table. */
export function UsersByRoleChart({ users, className }: UsersByRoleChartProps) {
  const chart = useChartTheme();
  const reduceMotion = usePrefersReducedMotion();

  const rows = ROLE_SLICES.map((slice) => {
    const value = Math.max(0, users[slice.key] ?? 0);
    return { key: slice.key, label: slice.label, value, color: chart.isDark ? slice.dark : slice.light };
  });
  // The API total is authoritative; fall back to the sum if it is missing.
  const total = users.total ?? rows.reduce((sum, row) => sum + row.value, 0);
  const slices = rows.filter((row) => row.value > 0);
  const summary = `Foydalanuvchilar rollar bo'yicha: ${rows.map((row) => `${row.label} — ${row.value} ta`).join(', ')}.`;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        icon={<ChartPie />}
        title="Foydalanuvchilar rollar bo'yicha"
        description={`Jami ${total} ta foydalanuvchi`}
      />
      {slices.length === 0 ? (
        <EmptyState compact titleAs="p" icon={<Users />} tone="neutral" title="Foydalanuvchilar yo'q" />
      ) : (
        <div className="grid flex-1 items-center gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div className="relative mx-auto h-52 w-full max-w-[15rem]" role="img" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="64%"
                  outerRadius="92%"
                  startAngle={90}
                  endAngle={-270}
                  stroke={chart.surface}
                  strokeWidth={2}
                  isAnimationActive={!reduceMotion}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip {...chart.tooltipProps} formatter={(value, name) => [`${value} ta`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{total}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">foydalanuvchi</span>
            </div>
          </div>

          <ul className="space-y-2" aria-label="Rollar bo'yicha taqsimot">
            {rows.map((row) => (
              <li key={row.key} className="surface-muted flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{row.value} ta</span>
                <span className="w-10 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {percentOf(row.value, total)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
