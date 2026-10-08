const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Faqat 24 belgili hex satrni haqiqiy ObjectId deb hisoblaydi
 * (mongoose.isValidObjectId 12 belgili ixtiyoriy satrlarni ham qabul qiladi).
 * @param {unknown} value
 * @returns {value is string}
 */
export function isObjectIdString(value) {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

/**
 * Ikki id (ObjectId | string | null) tengmi?
 * @param {unknown} a
 * @param {unknown} b
 */
export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
