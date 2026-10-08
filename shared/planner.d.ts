// Type declarations for shared/planner.js (used by the TypeScript frontend).

export declare const TOPIC_COUNT: 6;

export declare const LIMITS: Readonly<{
  minDays: number;
  maxDays: number;
  minDailyMinutes: number;
  maxDailyMinutes: number;
  maxTitleLength: number;
  maxSubjectLength: number;
  maxTopicLength: number;
}>;

export declare const REVIEW_DAY_LABEL: string;

export declare const MESSAGES: Readonly<{
  titleRequired: string;
  titleTooLong: string;
  subjectRequired: string;
  subjectTooLong: string;
  daysRequired: string;
  daysNotInteger: string;
  daysMin: string;
  daysMax: string;
  minutesRequired: string;
  minutesNotInteger: string;
  minutesMin: string;
  minutesMax: string;
  topicsRequired: string;
  topicTooLong: string;
  startDateInvalid: string;
  notEnoughTime: (needed: number) => string;
}>;

export type PlanField = "title" | "subject" | "daysCount" | "dailyMinutes" | "topics" | "startDate";

export interface PlanInput {
  title?: unknown;
  subject?: unknown;
  daysCount?: unknown;
  dailyMinutes?: unknown;
  topics?: unknown;
  startDate?: unknown;
}

export interface ValidPlanInput {
  title: string;
  subject: string;
  daysCount: number;
  dailyMinutes: number;
  topics: string[];
  startDate: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<PlanField, string>>;
  topicErrors: (string | null)[];
  value: ValidPlanInput | null;
}

export interface PlanTopic {
  topicId: string;
  title: string;
  minutes: number;
  completed: boolean;
  completedAt: string | null;
}

export interface PlanDay {
  dayNumber: number;
  date: string | null;
  type: "study" | "review";
  totalMinutes: number;
  topics: PlanTopic[];
}

export interface Distribution {
  days: PlanDay[];
  endDate: string | null;
  totalTopics: number;
}

export interface Progress {
  total: number;
  completed: number;
  percent: number;
}

export type ParsedInteger = { ok: true; value: number } | { ok: false; reason: "empty" | "notInteger" };

export declare function parseIntegerField(value: unknown): ParsedInteger;
export declare function isValidDateString(value: unknown): boolean;
export declare function addDays(dateStr: string, days: number): string;
export declare function sanitizeText(value: unknown): string;
export declare function maxTopicsPerDay(topicCount: number, daysCount: number): number;
export declare function validatePlanInput(input: PlanInput, options?: { requireMeta?: boolean }): ValidationResult;
export declare function distributeTopics(params: {
  topics: string[];
  daysCount: number;
  dailyMinutes: number;
  startDate?: string;
}): Distribution;
export declare function computeProgress(days: ReadonlyArray<{ topics?: ReadonlyArray<{ completed?: boolean }> }>): Progress;
export declare function percentOf(completed: number, total: number): number;
