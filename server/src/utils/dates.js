// Sana yordamchilari: statistika uchun kunlar ilova vaqt zonasida (standart Asia/Tashkent) hisoblanadi.

import { addDays } from "../../../shared/planner.js";

/** @type {Map<string, Intl.DateTimeFormat>} */
const formatters = new Map();

/** @param {string} timeZone */
function formatterFor(timeZone) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

/**
 * Berilgan vaqt momentining shu vaqt zonasidagi sanasi ("YYYY-MM-DD").
 * @param {Date} date
 * @param {string} timeZone
 */
export function dateKey(date, timeZone) {
  const parts = formatterFor(timeZone).formatToParts(date);
  /** @param {string} type */
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Bugundan boshlab orqaga `count` kunlik sanalar (eskisidan yangisiga, bugun ham kiradi).
 * @param {number} count
 * @param {string} timeZone
 * @param {Date} [now]
 */
export function lastDateKeys(count, timeZone, now = new Date()) {
  const today = dateKey(now, timeZone);
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}

/**
 * Date | string | null → ISO satr yoki null.
 * @param {unknown} value
 * @returns {string | null}
 */
export function toIso(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(/** @type {string} */ (value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
