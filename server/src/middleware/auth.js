// JWT autentifikatsiya va rol tekshiruvi.
// Har bir so'rovda foydalanuvchi bazadan qayta yuklanadi: o'chirilgan foydalanuvchi yoki
// o'zgartirilgan rol darhol kuchga kiradi (tokendagi rolga ishonilmaydi).

import { MSG } from "../messages.js";
import { User } from "../models/User.js";
import { verifyToken } from "../services/tokens.js";
import { HttpError } from "../utils/http-error.js";
import { isObjectIdString } from "../utils/ids.js";

const BEARER_RE = /^Bearer\s+(\S+)\s*$/i;

/** @type {import("express").RequestHandler} */
export async function authenticate(req, _res, next) {
  const header = req.get("authorization");
  const match = header ? BEARER_RE.exec(header) : null;
  if (!match) throw new HttpError(401, MSG.authRequired);

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch {
    // Muddati o'tgan, soxta yoki buzilgan token.
    throw new HttpError(401, MSG.sessionExpired);
  }

  if (!isObjectIdString(payload.sub)) throw new HttpError(401, MSG.sessionExpired);
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, MSG.sessionExpired);

  req.user = user;
  next();
}

/**
 * Faqat ko'rsatilgan rollarga ruxsat beradi (authenticate dan keyin ishlatiladi).
 * @param {...("student" | "teacher" | "admin")} roles
 * @returns {import("express").RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw new HttpError(401, MSG.authRequired);
    if (!roles.includes(req.user.role)) throw new HttpError(403, MSG.forbidden);
    next();
  };
}
