// Immutable helpers for a plan's `days` state (local preview state / optimistic updates).
// They never touch distribution or progress math — use computeProgress from '@shared/planner' for that.
import type { PlanDay, PlanTopic } from '@/api/types';

/**
 * Returns new days with one topic's completed flag changed.
 * completed=true sets completedAt (default now, ISO) unless it was already completed; false clears it.
 */
export function setTopicCompletedInDays(
  days: readonly PlanDay[],
  topicId: string,
  completed: boolean,
  completedAt: string = new Date().toISOString(),
): PlanDay[] {
  return days.map((day) => {
    if (!day.topics.some((t) => t.topicId === topicId)) return day;
    return {
      ...day,
      topics: day.topics.map((t) =>
        t.topicId === topicId
          ? { ...t, completed, completedAt: completed ? (t.completed && t.completedAt ? t.completedAt : completedAt) : null }
          : t,
      ),
    };
  });
}

/** All topics unchecked ("Tiklash"). */
export function resetDays(days: readonly PlanDay[]): PlanDay[] {
  return days.map((day) => ({
    ...day,
    topics: day.topics.map((t) => ({ ...t, completed: false, completedAt: null })),
  }));
}

/** Ids of completed topics, e.g. for createPlan({ ..., completedTopicIds }). */
export function getCompletedTopicIds(days: readonly PlanDay[]): string[] {
  return days.flatMap((day) => day.topics.filter((t) => t.completed).map((t) => t.topicId));
}

/** Finds a topic by id. */
export function findTopic(days: readonly PlanDay[], topicId: string): PlanTopic | undefined {
  for (const day of days) {
    const topic = day.topics.find((t) => t.topicId === topicId);
    if (topic) return topic;
  }
  return undefined;
}
