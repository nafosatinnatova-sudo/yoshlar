// Progress va faollik statistikasi. Foizlar faqat shared computeProgress / percentOf orqali
// hisoblanadi — frontend bilan aynan bir xil natija.

import { computeProgress, percentOf } from "../../../shared/planner.js";
import { config } from "../config.js";
import { dateKey, lastDateKeys, toIso } from "../utils/dates.js";

/** Faollik grafigi uchun kunlar soni (bugun ham kiradi). */
export const ACTIVITY_DAYS = 14;

/** Progress hisoblash uchun rejadan yuklanadigan minimal maydonlar. */
export const PROGRESS_PROJECTION = Object.freeze({
  userId: 1,
  updatedAt: 1,
  "days.topics.completed": 1,
  "days.topics.completedAt": 1,
});

/**
 * Bir nechta reja bo'yicha umumiy ko'rsatkichlar.
 * @param {Array<{ days?: any[], updatedAt?: Date }>} plans
 */
export function summarizePlans(plans) {
  let totalTopics = 0;
  let completedTopics = 0;
  /** @type {Date | null} */
  let lastActivity = null;
  for (const plan of plans) {
    const { total, completed } = computeProgress(plan.days ?? []);
    totalTopics += total;
    completedTopics += completed;
    const updatedAt = plan.updatedAt ? new Date(plan.updatedAt) : null;
    if (updatedAt && (!lastActivity || updatedAt > lastActivity)) lastActivity = updatedAt;
  }
  return {
    plansCount: plans.length,
    totalTopics,
    completedTopics,
    progress: percentOf(completedTopics, totalTopics),
    lastActivityAt: toIso(lastActivity),
  };
}

/**
 * Oxirgi `days` kun ichida har kuni nechta mavzu bajarilgani (completedAt bo'yicha), eskisidan yangisiga.
 * @param {Array<{ days?: any[] }>} plans
 * @param {{ days?: number, timeZone?: string, now?: Date }} [options]
 * @returns {{ date: string, completed: number }[]}
 */
export function buildActivity(plans, { days = ACTIVITY_DAYS, timeZone = config.timeZone, now = new Date() } = {}) {
  const keys = lastDateKeys(days, timeZone, now);
  /** @type {Map<string, number>} */
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const plan of plans) {
    for (const day of plan.days ?? []) {
      for (const topic of day.topics ?? []) {
        if (topic.completed !== true || !topic.completedAt) continue;
        const at = new Date(topic.completedAt);
        if (Number.isNaN(at.getTime())) continue;
        const key = dateKey(at, timeZone);
        if (counts.has(key)) counts.set(key, /** @type {number} */ (counts.get(key)) + 1);
      }
    }
  }
  return keys.map((date) => ({ date, completed: /** @type {number} */ (counts.get(date)) }));
}

/**
 * Admin statistikasi uchun rejalar bo'yicha yig'indi.
 * @param {Array<{ days?: any[] }>} plans
 */
export function aggregatePlanStats(plans) {
  let completedPlans = 0;
  let topicsTotal = 0;
  let topicsCompleted = 0;
  let percentSum = 0;
  for (const plan of plans) {
    const progress = computeProgress(plan.days ?? []);
    topicsTotal += progress.total;
    topicsCompleted += progress.completed;
    percentSum += progress.percent;
    if (progress.total > 0 && progress.percent === 100) completedPlans += 1;
  }
  return {
    plans: { total: plans.length, completed: completedPlans, inProgress: plans.length - completedPlans },
    topics: { total: topicsTotal, completed: topicsCompleted },
    averageProgress: plans.length > 0 ? Math.round(percentSum / plans.length) : 0,
    overallProgress: percentOf(topicsCompleted, topicsTotal),
  };
}
