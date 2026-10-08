import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

/** Brand colors as hex values (Recharts needs raw colors, not Tailwind classes). */
export const CHART_COLORS = {
  primary: '#6366f1', // indigo-500
  primaryStrong: '#4f46e5', // indigo-600
  violet: '#8b5cf6', // violet-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#f43f5e', // rose-500
  info: '#0ea5e9', // sky-500
  neutral: '#94a3b8', // slate-400
} as const;

/** Ordered palette for multi-series / categorical charts. */
export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.violet,
  CHART_COLORS.info,
  CHART_COLORS.danger,
] as const;

/** Bar color for a completion percent — same thresholds as <ProgressBar> (100 → green, ≥50 → indigo, else amber). */
export function progressColor(percent: number): string {
  if (percent >= 100) return CHART_COLORS.success;
  if (percent >= 50) return CHART_COLORS.primary;
  if (percent > 0) return CHART_COLORS.warning;
  return CHART_COLORS.neutral;
}

/**
 * Theme-aware Recharts styling. Spread the ready-made prop objects:
 * @example
 * const chart = useChartTheme();
 * <CartesianGrid {...chart.gridProps} />
 * <XAxis dataKey="name" {...chart.axisProps} />
 * <YAxis {...chart.axisProps} />
 * <Tooltip {...chart.tooltipProps} />
 * <Bar dataKey="percent" fill={chart.colors.primary} radius={[6, 6, 0, 0]} />
 */
export function useChartTheme() {
  const { isDark } = useTheme();
  return useMemo(() => {
    const grid = isDark ? '#1e293b' : '#e2e8f0'; // slate-800 / slate-200
    const axis = isDark ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
    const surface = isDark ? '#0f172a' : '#ffffff'; // slate-900 / white
    const border = isDark ? '#334155' : '#e2e8f0'; // slate-700 / slate-200
    const text = isDark ? '#f1f5f9' : '#0f172a'; // slate-100 / slate-900
    const cursor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(99, 102, 241, 0.06)';
    return {
      isDark,
      colors: CHART_COLORS,
      palette: CHART_PALETTE,
      grid,
      axis,
      surface,
      border,
      text,
      gridProps: { stroke: grid, strokeDasharray: '3 3', vertical: false },
      axisProps: {
        stroke: axis,
        tick: { fill: axis, fontSize: 12 },
        tickLine: false,
        axisLine: false,
      },
      tooltipProps: {
        cursor: { fill: cursor },
        contentStyle: {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderRadius: 12,
          boxShadow: '0 8px 24px -8px rgba(15, 23, 42, 0.25)',
          color: text,
          fontSize: 13,
        },
        labelStyle: { color: text, fontWeight: 600, marginBottom: 4 },
        itemStyle: { color: text },
      },
      legendProps: { wrapperStyle: { fontSize: 12, color: axis } },
    };
  }, [isDark]);
}

export type ChartTheme = ReturnType<typeof useChartTheme>;
