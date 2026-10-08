// Uzbek (Latin) date/time formatting helpers.
// "YYYY-MM-DD" strings are treated as calendar dates (no timezone shift);
// ISO date-time strings (createdAt, completedAt…) are shown in the user's LOCAL time.

export { roleLabel } from './roles';

export const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

export const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'] as const;

export const UZ_WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] as const;

export type DateInput = string | number | Date | null | undefined;

interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Parses a value into a Date (local). "YYYY-MM-DD" → local midnight of that calendar day. */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const m = ISO_DATE_RE.exec(value.trim());
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const date = new Date(y, mo - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
      return date;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toParts(value: DateInput): DateParts | null {
  const date = toDate(value);
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Local calendar date of a Date as "YYYY-MM-DD" (NOT UTC). */
export function toISODateLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Today's LOCAL date as "YYYY-MM-DD" (e.g. default start date of a new plan). */
export function todayISO(now: Date = new Date()): string {
  return toISODateLocal(now);
}

/**
 * "2026-10-10" → "10-oktabr, 2026". `withYear: false` → "10-oktabr".
 * Empty input → ""; unparseable input is returned unchanged.
 */
export function formatDateUz(value: DateInput, options: { withYear?: boolean } = {}): string {
  const { withYear = true } = options;
  const parts = toParts(value);
  if (!parts) return value === null || value === undefined ? '' : String(value);
  const base = `${parts.day}-${UZ_MONTHS[parts.month - 1]}`;
  return withYear ? `${base}, ${parts.year}` : base;
}

/** "2026-10-10" → "10-oktabr". */
export function formatDayMonthUz(value: DateInput): string {
  return formatDateUz(value, { withYear: false });
}

/** "2026-10-10" → "10-okt" (compact, e.g. chart axis ticks). */
export function formatShortDateUz(value: DateInput): string {
  const parts = toParts(value);
  if (!parts) return value === null || value === undefined ? '' : String(value);
  return `${parts.day}-${UZ_MONTHS_SHORT[parts.month - 1]}`;
}

/** "2026-10-10" → "Shanba". */
export function formatWeekdayUz(value: DateInput): string {
  const date = toDate(value);
  return date ? UZ_WEEKDAYS[date.getDay()] : '';
}

/** ISO → "14:05" (local, 24h). */
export function formatTimeUz(value: DateInput): string {
  const date = toDate(value);
  return date ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : '';
}

/**
 * ISO date-time → "10-oktabr, 14:05" (local time). `withYear: true` → "10-oktabr, 2026, 14:05".
 * Empty/invalid → "".
 */
export function formatDateTimeUz(value: DateInput, options: { withYear?: boolean } = {}): string {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDateUz(date, { withYear: options.withYear ?? false })}, ${formatTimeUz(date)}`;
}

/** "10-oktabr, 2026 — 12-oktabr, 2026" (single date when equal). */
export function formatDateRangeUz(start: DateInput, end: DateInput): string {
  const a = formatDateUz(start);
  const b = formatDateUz(end);
  if (!a) return b;
  if (!b || a === b) return a;
  return `${a} — ${b}`;
}

/** Whole calendar days from `from` to `to` (local dates; negative if `to` is earlier). */
export function diffInCalendarDays(from: DateInput, to: DateInput): number | null {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Human-friendly relative time for activity timestamps:
 * "hozirgina", "5 daqiqa oldin", "bugun, 14:05", "kecha, 09:30", "3 kun oldin", otherwise "10-oktabr, 2026".
 * null/invalid → `emptyText` (default "Faollik yo'q").
 */
export function formatRelativeUz(value: DateInput, options: { now?: Date; emptyText?: string } = {}): string {
  const { now = new Date(), emptyText = "Faollik yo'q" } = options;
  const date = toDate(value);
  if (!date) return emptyText;
  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return 'hozirgina';
  if (diffMs >= 0 && diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} daqiqa oldin`;
  const days = diffInCalendarDays(date, now) ?? 0;
  if (days === 0) return `bugun, ${formatTimeUz(date)}`;
  if (days === 1) return `kecha, ${formatTimeUz(date)}`;
  if (days > 1 && days < 7) return `${days} kun oldin`;
  return formatDateUz(date);
}

/** 60 → "60 daqiqa". */
export function formatMinutesUz(minutes: number): string {
  return `${minutes} daqiqa`;
}

/** 30 → "30 daq." */
export function formatMinutesShortUz(minutes: number): string {
  return `${minutes} daq.`;
}
