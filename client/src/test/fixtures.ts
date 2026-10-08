// Test data builders based on the REAL shared algorithm (no hand-written distributions).
import { computeProgress, distributeTopics } from '@shared/planner';
import type { Plan, PlanDay, PublicUser } from '@/api/types';

export const SAMPLE_TOPICS = ['Mavzu 1', 'Mavzu 2', 'Mavzu 3', 'Mavzu 4', 'Mavzu 5', 'Mavzu 6'];

export interface BuildDaysOptions {
  daysCount?: number;
  dailyMinutes?: number;
  startDate?: string;
  topics?: string[];
  /** Topic ids to mark completed, e.g. ['t1', 't2', 't3']. */
  completed?: string[];
  /** completedAt for completed topics (ISO). */
  completedAt?: string;
}

/** Days produced by distributeTopics (defaults: 6 topics, 3 days, 60 min, 2026-10-10). */
export function buildDays({
  daysCount = 3,
  dailyMinutes = 60,
  startDate = '2026-10-10',
  topics = SAMPLE_TOPICS,
  completed = [],
  completedAt = '2026-10-10T09:05:00.000Z',
}: BuildDaysOptions = {}): PlanDay[] {
  const { days } = distributeTopics({ topics, daysCount, dailyMinutes, startDate });
  return days.map((day) => ({
    ...day,
    topics: day.topics.map((t) =>
      completed.includes(t.topicId) ? { ...t, completed: true, completedAt } : t,
    ),
  }));
}

/** A full Plan object as returned by the API. */
export function buildPlan(overrides: Partial<Plan> & BuildDaysOptions = {}): Plan {
  const { daysCount = 3, dailyMinutes = 60, startDate = '2026-10-10', completed, completedAt, topics, ...rest } = overrides;
  const days = rest.days ?? buildDays({ daysCount, dailyMinutes, startDate, completed, completedAt, topics });
  const endDate = days[days.length - 1]?.date ?? startDate;
  return {
    id: 'plan-1',
    userId: 'user-student',
    title: 'Matematika imtihoni',
    subject: 'Matematika',
    daysCount,
    dailyMinutes,
    startDate,
    endDate,
    totalTopics: 6,
    progress: computeProgress(days),
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
    ...rest,
    days,
  };
}

export const TEST_USERS: Record<'student' | 'teacher' | 'admin', PublicUser> = {
  student: {
    id: 'user-student',
    fullName: 'Ali Valiyev',
    username: 'student',
    role: 'student',
    teacherId: 'user-teacher',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  teacher: {
    id: 'user-teacher',
    fullName: 'Dilnoza Karimova',
    username: 'teacher',
    role: 'teacher',
    teacherId: null,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  admin: {
    id: 'user-admin',
    fullName: 'Administrator',
    username: 'admin',
    role: 'admin',
    teacherId: null,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
};
