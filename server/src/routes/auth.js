// /api/auth — tizimga kirish va joriy foydalanuvchi.

import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { MSG } from "../messages.js";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { toPublicUser } from "../services/serializers.js";
import { signToken } from "../services/tokens.js";
import { HttpError, validationError } from "../utils/http-error.js";

// Foydalanuvchi topilmaganda ham bcrypt solishtiruvi bajariladi — javob vaqti orqali
// mavjud loginlarni aniqlab bo'lmasligi uchun.
const DUMMY_HASH = bcrypt.hashSync("smart-study-planner-timing-guard", config.bcryptRounds);

/**
 * @param {{ loginRateLimit?: Partial<import("express-rate-limit").Options> }} [options]
 */
export function createAuthRouter({ loginRateLimit = {} } = {}) {
  const router = Router();

  // Brute-force himoyasi: IP bo'yicha 15 daqiqada 20 ta muvaffaqiyatsiz urinish.
  // Muvaffaqiyatli kirishlar hisobga olinmaydi (bitta tarmoqdagi hakamlar bloklanib qolmasligi uchun).
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({ message: MSG.tooManyLogins });
    },
    ...loginRateLimit,
  });

  router.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    /** @type {Record<string, string>} */
    const errors = {};
    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!normalizedUsername) errors.username = MSG.usernameRequired;
    if (typeof password !== "string" || password.trim() === "") errors.password = MSG.passwordRequired;
    if (Object.keys(errors).length > 0) throw validationError(errors, ["username", "password"]);

    const user = await User.findOne({ username: normalizedUsername }).select("+passwordHash");
    const passwordOk = await bcrypt.compare(/** @type {string} */ (password), user ? user.passwordHash : DUMMY_HASH);
    if (!user || !passwordOk) throw new HttpError(401, MSG.invalidCredentials);

    res.json({ token: signToken(user), user: toPublicUser(user) });
  });

  router.get("/me", authenticate, (req, res) => {
    res.json({ user: toPublicUser(req.user) });
  });

  return router;
}
