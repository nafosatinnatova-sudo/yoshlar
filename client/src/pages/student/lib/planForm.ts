// Form-state helpers for the "Yangi reja yaratish" page.
// Validation itself ALWAYS comes from the shared validatePlanInput — this file only shapes
// the raw (string) form values and maps errors to fields.
import {
  LIMITS,
  TOPIC_COUNT,
  distributeTopics,
  parseIntegerField,
  type PlanField,
} from '@shared/planner';
import type { ApiError } from '@/api/client';
import { todayISO } from '@/utils/date';

/** Raw form values exactly as typed (numbers stay strings so "abc"/"2.5" reach validation). */
export interface PlanFormValues {
  title: string;
  subject: string;
  daysCount: string;
  dailyMinutes: string;
  /** "YYYY-MM-DD" from <input type="date"> ("" when cleared). */
  startDate: string;
  /** Always TOPIC_COUNT entries. */
  topics: string[];
}

/** Single-value form fields (everything except the topics list). */
export type PlanScalarField = Exclude<keyof PlanFormValues, 'topics'>;

export type PlanFormErrors = Partial<Record<PlanField, string>>;
export type TopicErrors = (string | null)[];

/** A focusable control: a scalar field or the topic input at `index` ("topic-0".."topic-5"). */
export type PlanFocusTarget = PlanScalarField | `topic-${number}`;

/** Scalar fields in visual / tab order (used to focus the first invalid field). */
export const SCALAR_FIELD_ORDER: readonly PlanScalarField[] = ['title', 'subject', 'daysCount', 'dailyMinutes', 'startDate'];

const PLAN_FIELDS: readonly PlanField[] = ['title', 'subject', 'daysCount', 'dailyMinutes', 'topics', 'startDate'];

export const topicTarget = (index: number): PlanFocusTarget => `topic-${index}`;

export function createEmptyForm(startDate: string = todayISO()): PlanFormValues {
  return {
    title: '',
    subject: '',
    daysCount: '',
    dailyMinutes: '',
    startDate,
    topics: Array.from({ length: TOPIC_COUNT }, () => ''),
  };
}

/** Demo data for quick testing (judge test #1: 6 topics, 3 days, 60 minutes). */
export const SAMPLE_PLAN = Object.freeze({
  title: 'Matematika imtihoniga tayyorgarlik',
  subject: 'Matematika',
  daysCount: '3',
  dailyMinutes: '60',
  topics: [
    'Algebraik ifodalar',
    'Chiziqli tenglamalar',
    'Kvadrat tenglamalar',
    'Funksiyalar va grafiklar',
    'Trigonometriya asoslari',
    'Planimetriya',
  ],
});

export function createSampleForm(startDate: string = todayISO()): PlanFormValues {
  return {
    title: SAMPLE_PLAN.title,
    subject: SAMPLE_PLAN.subject,
    daysCount: SAMPLE_PLAN.daysCount,
    dailyMinutes: SAMPLE_PLAN.dailyMinutes,
    startDate: startDate || todayISO(),
    topics: [...SAMPLE_PLAN.topics],
  };
}

/** Stable string of the form values — a preview is "stale" when this differs from the one it was built from. */
export function formSignature(values: PlanFormValues): string {
  return JSON.stringify([values.title, values.subject, values.daysCount, values.dailyMinutes, values.startDate, values.topics]);
}

/** Pads / trims a topicErrors list to exactly TOPIC_COUNT entries. */
export function normalizeTopicErrors(list: readonly (string | null | undefined)[] | undefined): TopicErrors {
  return Array.from({ length: TOPIC_COUNT }, (_, i) => list?.[i] || null);
}

/** First control (in visual order) that has an error, or null. */
export function firstInvalidTarget(errors: PlanFormErrors, topicErrors: TopicErrors): PlanFocusTarget | null {
  for (const field of SCALAR_FIELD_ORDER) {
    if (errors[field]) return field;
  }
  const topicIndex = topicErrors.findIndex(Boolean);
  if (topicIndex >= 0) return topicTarget(topicIndex);
  if (errors.topics) return topicTarget(0);
  return null;
}

export interface ServerFormErrors {
  errors: PlanFormErrors;
  topicErrors: TopicErrors;
  /** Messages for keys that have no field on the form (e.g. completedTopicIds). */
  otherMessages: string[];
  /** True when at least one message could be shown under a form field. */
  hasFieldErrors: boolean;
}

/** Splits a 400 ApiError's `errors` / `topicErrors` into form-field errors and leftovers. */
export function mapServerErrors(error: Pick<ApiError, 'errors' | 'topicErrors'>): ServerFormErrors {
  const errors: PlanFormErrors = {};
  const otherMessages: string[] = [];
  for (const [key, message] of Object.entries(error.errors ?? {})) {
    if ((PLAN_FIELDS as readonly string[]).includes(key)) errors[key as PlanField] = message;
    else otherMessages.push(message);
  }
  const topicErrors = normalizeTopicErrors(error.topicErrors);
  const hasFieldErrors = Object.keys(errors).length > 0 || topicErrors.some(Boolean);
  return { errors, topicErrors, otherMessages, hasFieldErrors };
}

/** Number of topic inputs that contain something other than whitespace. */
export function countFilledTopics(topics: readonly string[]): number {
  return topics.filter((t) => t.trim() !== '').length;
}

export interface DistributionHint {
  /** Topics per study day, e.g. [2, 2, 2]. */
  perDay: number[];
  /** Number of review ("Takrorlash / dam olish") days. */
  reviewDays: number;
  /** Minutes per topic on the first study day, e.g. [31, 30]. */
  firstDayMinutes: number[];
}

const PLACEHOLDER_TOPICS = Array.from({ length: TOPIC_COUNT }, (_, i) => `t${i + 1}`);

/**
 * Live "what will the schedule look like" hint for the current days/minutes, computed with the
 * SHARED distributeTopics (no re-implementation). Null while the numbers are not valid yet.
 */
export function getDistributionHint(daysCount: string, dailyMinutes: string): DistributionHint | null {
  const days = parseIntegerField(daysCount);
  const minutes = parseIntegerField(dailyMinutes);
  if (!days.ok || !minutes.ok) return null;
  if (days.value < LIMITS.minDays || days.value > LIMITS.maxDays) return null;
  if (minutes.value < LIMITS.minDailyMinutes || minutes.value > LIMITS.maxDailyMinutes) return null;
  try {
    const result = distributeTopics({ topics: PLACEHOLDER_TOPICS, daysCount: days.value, dailyMinutes: minutes.value });
    const study = result.days.filter((d) => d.type === 'study');
    return {
      perDay: study.map((d) => d.topics.length),
      reviewDays: result.days.length - study.length,
      firstDayMinutes: study[0]?.topics.map((t) => t.minutes) ?? [],
    };
  } catch {
    // Not enough time per topic — validation will explain it on submit.
    return null;
  }
}
