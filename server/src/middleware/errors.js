// 404 va markaziy xato ishlovchilari. Mijozga hech qachon stack trace yuborilmaydi.

import mongoose from "mongoose";
import { MSG } from "../messages.js";
import { HttpError } from "../utils/http-error.js";

/** Noma'lum /api/* manzili. @type {import("express").RequestHandler} */
export function apiNotFound(_req, res) {
  res.status(404).json({ message: MSG.routeNotFound });
}

/** Qolgan barcha topilmagan manzillar. @type {import("express").RequestHandler} */
export function notFound(_req, res) {
  res.status(404).json({ message: MSG.routeNotFound });
}

/** @type {import("express").ErrorRequestHandler} */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json(err.toJSON());
  }

  // body-parser (express.json) xatolari
  if (err?.type === "entity.parse.failed") return res.status(400).json({ message: MSG.badJson });
  if (err?.type === "entity.too.large") return res.status(413).json({ message: MSG.payloadTooLarge });

  // Noto'g'ri ObjectId va boshqa tur o'zgartirish xatolari → 404 (hech qachon 500 emas).
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ message: MSG.notFoundGeneric });
  }

  if (err instanceof mongoose.Error.DocumentNotFoundError) {
    return res.status(404).json({ message: MSG.notFoundGeneric });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    /** @type {Record<string, string>} */
    const errors = {};
    for (const path of Object.keys(err.errors)) errors[path] = MSG.invalidValue;
    return res.status(400).json({ message: MSG.validationFailed, errors });
  }

  // Unique indeks buzilishi (yagona unique maydon — username).
  if (err?.code === 11000) {
    return res.status(409).json({ message: MSG.usernameTaken, errors: { username: MSG.usernameTaken } });
  }

  // Express/body-parser/send dan kelgan boshqa 4xx xatolar (masalan, URL dagi buzilgan %-kodlash,
  // qo'llab-quvvatlanmaydigan charset, o'chirilgan statik fayl).
  const status = typeof err?.status === "number" ? err.status : err?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({ message: status === 404 ? MSG.routeNotFound : MSG.badJson });
  }

  console.error(`[xato] ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json({ message: MSG.serverError });
}
