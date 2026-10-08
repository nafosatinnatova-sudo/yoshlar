// NoSQL-injection va prototype-pollution himoyasi.
// req.body va req.params ichidan `$` bilan boshlanadigan yoki `.` saqlovchi kalitlar,
// shuningdek __proto__/constructor/prototype kalitlari olib tashlanadi (joyida, in-place).
// Express 5 da req.query getter bo'lgani uchun u qayta yozilmaydi — query qiymatlari
// routelarda faqat oq ro'yxat (whitelist) bo'yicha tekshiriladi.

import { MSG } from "../messages.js";
import { HttpError } from "../utils/http-error.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 32;

/** @param {string} key */
function isUnsafeKey(key) {
  return key.startsWith("$") || key.includes(".") || FORBIDDEN_KEYS.has(key);
}

/**
 * @param {unknown} value
 * @param {number} depth
 */
function clean(value, depth) {
  if (value === null || typeof value !== "object") return;
  if (depth > MAX_DEPTH) throw new HttpError(400, MSG.badJson);
  if (Array.isArray(value)) {
    for (const item of value) clean(item, depth + 1);
    return;
  }
  const obj = /** @type {Record<string, unknown>} */ (value);
  for (const key of Object.keys(obj)) {
    if (isUnsafeKey(key)) delete obj[key];
    else clean(obj[key], depth + 1);
  }
}

/** @param {unknown} value */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @type {import("express").RequestHandler} */
export function sanitizeRequest(req, _res, next) {
  // Express 5 da tana bo'lmasa req.body undefined bo'ladi; routelar doim obyekt kutadi.
  if (!isPlainObject(req.body)) req.body = {};
  else clean(req.body, 0);
  if (req.params) clean(req.params, 0);
  next();
}
