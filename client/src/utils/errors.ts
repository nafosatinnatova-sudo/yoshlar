import { ApiError, isAbortError } from '@/api/client';

export { isAbortError };

export const UNKNOWN_ERROR_MESSAGE = "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring.";

/** Built-in JS runtime errors carry English, developer-facing messages — never show those to users. */
const RUNTIME_ERROR_TYPES = [TypeError, SyntaxError, RangeError, ReferenceError, EvalError, URIError];

/**
 * User-facing (Uzbek) message for any thrown value.
 * - ApiError → its message (server message, network/timeout message…)
 * - string → itself
 * - Error thrown deliberately by app code (e.g. shared planner) → its message
 * - runtime errors / anything else → `fallback`
 */
export function getErrorMessage(error: unknown, fallback: string = UNKNOWN_ERROR_MESSAGE): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  if (error instanceof Error) {
    if (RUNTIME_ERROR_TYPES.some((T) => error instanceof T)) return fallback;
    return error.message || fallback;
  }
  return fallback;
}

/** Field → message map from a 400 ApiError (empty object otherwise). */
export function getFieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.errors ? { ...error.errors } : {};
}

/** Per-topic messages (index 0..5) from a plan-validation ApiError (empty array otherwise). */
export function getTopicErrors(error: unknown): (string | null)[] {
  return error instanceof ApiError && error.topicErrors ? [...error.topicErrors] : [];
}
