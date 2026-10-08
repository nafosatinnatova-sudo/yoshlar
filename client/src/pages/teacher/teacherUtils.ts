// Pure helpers for the teacher pages (search, sorting, aggregates, chart labels).
// All completion percents come from the shared planner module (computeProgress / percentOf),
// so the numbers match the backend and the student's own screens exactly.
import { computeProgress, percentOf } from '@shared/planner';
import { isApiError } from '@/api/client';
import type { ActivityPoint, Plan, TeacherStudent } from '@/api/types';
import type { SelectOption } from '@/components/ui/Select';
import { progressColor } from '@/hooks/useChartTheme';
import { diffInCalendarDays, formatTimeUz, toDate, todayISO } from '@/utils/date';

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const TEACHER_MESSAGES = Object.freeze({
  noStudents: "Sizga hali o'quvchi biriktirilmagan.",
  noStudentsHint: "Administrator sizga o'quvchi biriktirgach, ularning rejalari va natijalari shu yerda ko'rinadi.",
  noActivity: "Hali faollik yo'q",
  forbiddenTitle: "Ruxsat yo'q",
  forbiddenStudent: "Bu o'quvchi sizga biriktirilmagan.",
  notFoundTitle: "O'quvchi topilmadi",
  notFoundStudent: "Bunday o'quvchi mavjud emas yoki tizimdan o'chirilgan.",
  staleData: "Ma'lumotlarni yangilab bo'lmadi. Ko'rsatilgan ma'lumotlar eskirgan bo'lishi mumkin.",
});

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/** Typographic apostrophes used in Uzbek Latin (o‘, g‘, ʼ …) → plain "'". */
const APOSTROPHE_VARIANTS = /[‘’ʻʼʹ`´]/g;

/** Lower-cases, unifies apostrophes and collapses whitespace so "O‘quvchi" matches "o'quvchi". */
export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(APOSTROPHE_VARIANTS, "'").replace(/\s+/g, ' ').trim();
}

/**
 * True when every word of `query` occurs in the student's full name or username.
 * A leading "@" is ignored ("@student" finds username "student"). Empty query matches everyone.
 */
export function matchesStudentQuery(student: Pick<TeacherStudent, 'fullName' | 'username'>, query: string): boolean {
  const tokens = normalizeSearchText(query)
    .split(' ')
    .map((token) => token.replace(/^@+/, ''))
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${normalizeSearchText(student.fullName)} ${normalizeSearchText(student.username)}`;
  return tokens.every((token) => haystack.includes(token));
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export type StudentSortKey = 'name' | 'progress-desc' | 'progress-asc' | 'activity';

export const STUDENT_SORT_OPTIONS: readonly (SelectOption & { value: StudentSortKey })[] = [
  { value: 'name', label: "Ism bo'yicha (A–Z)" },
  { value: 'progress-desc', label: 'Natija: yuqoridan pastga' },
  { value: 'progress-asc', label: 'Natija: pastdan yuqoriga' },
  { value: 'activity', label: "Oxirgi faollik bo'yicha" },
];

export function isStudentSortKey(value: string): value is StudentSortKey {
  return STUDENT_SORT_OPTIONS.some((option) => option.value === value);
}

function compareByName(a: TeacherStudent, b: TeacherStudent): number {
  return (
    a.fullName.localeCompare(b.fullName, 'uz', { sensitivity: 'base' }) || a.username.localeCompare(b.username, 'uz')
  );
}

/** Timestamp of the last activity (−Infinity when there is none, so those rows sort last). */
function activityTime(student: TeacherStudent): number {
  return toDate(student.lastActivityAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/** Returns a NEW sorted array (ties are always broken by name). */
export function sortStudents(students: readonly TeacherStudent[], key: StudentSortKey): TeacherStudent[] {
  const list = [...students];
  switch (key) {
    case 'progress-desc':
      return list.sort((a, b) => b.progress - a.progress || compareByName(a, b));
    case 'progress-asc':
      return list.sort((a, b) => a.progress - b.progress || compareByName(a, b));
    case 'activity':
      // (−∞) − (−∞) is NaN, which is falsy → falls through to the name comparison.
      return list.sort((a, b) => activityTime(b) - activityTime(a) || compareByName(a, b));
    case 'name':
    default:
      return list.sort(compareByName);
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard aggregates                                                */
/* ------------------------------------------------------------------ */

/** True when an ISO timestamp falls on today's LOCAL calendar date. */
export function isActiveToday(iso: string | null | undefined, now: Date = new Date()): boolean {
  return diffInCalendarDays(iso, now) === 0;
}

export interface StudentsOverview {
  studentsCount: number;
  /** Students with at least one plan. */
  withPlansCount: number;
  plansCount: number;
  totalTopics: number;
  completedTopics: number;
  /** Mean of the students' percents — only students that have a plan are counted (0 if none). */
  averageProgress: number;
  /** percentOf(all completed topics, all topics) — same formula as the backend. */
  overallProgress: number;
  /** Students who completed at least one topic today. */
  activeTodayCount: number;
}

export function summarizeStudents(students: readonly TeacherStudent[], now: Date = new Date()): StudentsOverview {
  let plansCount = 0;
  let totalTopics = 0;
  let completedTopics = 0;
  let withPlansCount = 0;
  let progressSum = 0;
  let activeTodayCount = 0;

  for (const student of students) {
    plansCount += student.plansCount;
    totalTopics += student.totalTopics;
    completedTopics += student.completedTopics;
    if (student.plansCount > 0) {
      withPlansCount += 1;
      progressSum += student.progress;
    }
    if (isActiveToday(student.lastActivityAt, now)) activeTodayCount += 1;
  }

  return {
    studentsCount: students.length,
    withPlansCount,
    plansCount,
    totalTopics,
    completedTopics,
    averageProgress: withPlansCount > 0 ? Math.round(progressSum / withPlansCount) : 0,
    overallProgress: percentOf(completedTopics, totalTopics),
    activeTodayCount,
  };
}

/* ------------------------------------------------------------------ */
/* Progress buckets (chart colors + legend)                            */
/* ------------------------------------------------------------------ */

export type ProgressBucketKey = 'done' | 'high' | 'low' | 'none';

export interface ProgressBucket {
  key: ProgressBucketKey;
  label: string;
  /** Same color the chart uses for bars in this range (progressColor thresholds). */
  color: string;
}

/** Ordered like the chart colors: 100% → green, 50–99% → indigo, 1–49% → amber, 0% → slate. */
export const PROGRESS_BUCKETS: readonly ProgressBucket[] = [
  { key: 'done', label: 'Yakunlagan (100%)', color: progressColor(100) },
  { key: 'high', label: '50–99%', color: progressColor(50) },
  { key: 'low', label: '1–49%', color: progressColor(1) },
  { key: 'none', label: 'Boshlamagan (0%)', color: progressColor(0) },
];

export function progressBucket(percent: number): ProgressBucketKey {
  if (percent >= 100) return 'done';
  if (percent >= 50) return 'high';
  if (percent > 0) return 'low';
  return 'none';
}

export function countProgressBuckets(students: readonly Pick<TeacherStudent, 'progress'>[]): Record<ProgressBucketKey, number> {
  const counts: Record<ProgressBucketKey, number> = { done: 0, high: 0, low: 0, none: 0 };
  for (const student of students) counts[progressBucket(student.progress)] += 1;
  return counts;
}

/* ------------------------------------------------------------------ */
/* Student page aggregates                                             */
/* ------------------------------------------------------------------ */

export interface PlansAggregate {
  plansCount: number;
  total: number;
  completed: number;
  percent: number;
  /** Latest completedAt among all completed topics (ISO), or null. */
  lastCompletedAt: string | null;
}

/**
 * Totals over every plan of a student. Uses the shared computeProgress over all days, which is
 * exactly the backend's `percentOf(sum completed, sum total)`.
 */
export function aggregatePlans(plans: readonly Pick<Plan, 'days'>[]): PlansAggregate {
  const days = plans.flatMap((plan) => (Array.isArray(plan.days) ? plan.days : []));
  const { total, completed, percent } = computeProgress(days);

  let lastCompletedAt: string | null = null;
  let lastTime = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    for (const topic of day.topics ?? []) {
      if (!topic.completed || !topic.completedAt) continue;
      const time = toDate(topic.completedAt)?.getTime();
      if (time !== undefined && time > lastTime) {
        lastTime = time;
        lastCompletedAt = topic.completedAt;
      }
    }
  }

  return { plansCount: plans.length, total, completed, percent, lastCompletedAt };
}

export interface ActivitySummary {
  /** Topics completed in the whole window. */
  total: number;
  /** Days with at least one completion. */
  activeDays: number;
  /** The busiest day (latest one on ties), or null when there was no activity. */
  best: ActivityPoint | null;
  /** Completions today (0 when today is not in the window). */
  today: number;
}

export function summarizeActivity(points: readonly ActivityPoint[], today: string = todayISO()): ActivitySummary {
  let total = 0;
  let activeDays = 0;
  let best: ActivityPoint | null = null;
  let todayCount = 0;
  for (const point of points) {
    const count = Number.isFinite(point.completed) ? Math.max(0, point.completed) : 0;
    total += count;
    if (count > 0) {
      activeDays += 1;
      if (!best || count >= best.completed) best = { date: point.date, completed: count };
    }
    if (point.date === today) todayCount = count;
  }
  return { total, activeDays, best, today: todayCount };
}

/** Activity points sorted oldest → newest (defensive copy; the API already sends them in order). */
export function sortActivity(points: readonly ActivityPoint[] | null | undefined): ActivityPoint[] {
  return [...(points ?? [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type AccessErrorKind = 'forbidden' | 'notFound';

/** 403 → 'forbidden', 404 → 'notFound', anything else → null (retryable). */
export function accessErrorKind(error: unknown): AccessErrorKind | null {
  if (!isApiError(error)) return null;
  if (error.status === 403) return 'forbidden';
  if (error.status === 404) return 'notFound';
  return null;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "2026-10-08" → "08.10" (chart axis ticks). Unparseable input is returned unchanged. */
export function formatDayDot(value: string): string {
  const date = toDate(value);
  if (!date) return value;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

/** Local clock time with seconds, "14:05:09" (for the "last updated" note). */
export function formatClockUz(date: Date): string {
  return `${formatTimeUz(date)}:${pad2(date.getSeconds())}`;
}

/** Shortens long names for chart axes: "Abdurahmonov Abdulaziz" → "Abdurahmonov A…". */
export function truncateLabel(text: string, max: number): string {
  const value = text.trim();
  if (max < 2 || value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
