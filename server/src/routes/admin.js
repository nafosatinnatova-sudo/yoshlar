// /api/admin — umumiy statistika va foydalanuvchilarni boshqarish (faqat admin).

import bcrypt from "bcryptjs";
import { Router } from "express";
import mongoose from "mongoose";
import { sanitizeText } from "../../../shared/planner.js";
import { config } from "../config.js";
import { MSG } from "../messages.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { StudyPlan } from "../models/StudyPlan.js";
import { FULL_NAME_MAX, ROLES, USERNAME_MAX, USERNAME_MIN, USERNAME_RE, User } from "../models/User.js";
import { toAdminUser } from "../services/serializers.js";
import { PROGRESS_PROJECTION, aggregatePlanStats, buildActivity } from "../services/stats.js";
import { HttpError, validationError } from "../utils/http-error.js";
import { isObjectIdString, sameId } from "../utils/ids.js";

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;
const USER_ERROR_PRIORITY = ["fullName", "username", "password", "role", "teacherId"];

// ---------------------------------------------------------------------------
// Maydon validatorlari: xato bo'lsa `errors` ga yozadi va tozalangan qiymatni qaytaradi.
// ---------------------------------------------------------------------------

/**
 * @param {unknown} raw
 * @param {Record<string, string>} errors
 */
function readFullName(raw, errors) {
  const value = sanitizeText(raw);
  if (!value) errors.fullName = MSG.fullNameRequired;
  else if (value.length > FULL_NAME_MAX) errors.fullName = MSG.fullNameTooLong;
  return value;
}

/**
 * @param {unknown} raw
 * @param {Record<string, string>} errors
 */
function readUsername(raw, errors) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) errors.username = MSG.usernameRequired;
  else if (value.length < USERNAME_MIN || value.length > USERNAME_MAX || !USERNAME_RE.test(value)) {
    errors.username = MSG.usernameInvalid;
  }
  return value;
}

/**
 * Parol o'zgartirilmaydi (trim/sanitize qilinmaydi) — faqat tekshiriladi.
 * @param {unknown} raw
 * @param {Record<string, string>} errors
 */
function readPassword(raw, errors) {
  if (typeof raw !== "string" || raw.trim() === "") {
    errors.password = MSG.passwordRequired;
    return "";
  }
  if (raw.length < PASSWORD_MIN) errors.password = MSG.passwordTooShort;
  else if (raw.length > PASSWORD_MAX) errors.password = MSG.passwordTooLong;
  return raw;
}

/**
 * @param {unknown} raw
 * @param {Record<string, string>} errors
 * @returns {string | null}
 */
function readRole(raw, errors) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!ROLES.includes(value)) {
    errors.role = MSG.roleInvalid;
    return null;
  }
  return value;
}

/**
 * teacherId: null / "" → biriktirilmagan; aks holda mavjud o'qituvchi bo'lishi shart.
 * @param {unknown} raw
 * @param {Record<string, string>} errors
 * @param {unknown} [selfId] tahrirlanayotgan foydalanuvchi (o'ziga biriktirib bo'lmaydi)
 */
async function resolveTeacherId(raw, errors, selfId) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isObjectIdString(raw)) {
    errors.teacherId = MSG.teacherNotFound;
    return null;
  }
  if (selfId && sameId(raw, selfId)) {
    errors.teacherId = MSG.teacherSelf;
    return null;
  }
  const teacher = await User.findOne({ _id: raw, role: "teacher" }, { _id: 1 }).lean();
  if (!teacher) {
    errors.teacherId = MSG.teacherNotFound;
    return null;
  }
  return teacher._id;
}

/**
 * O'quvchilarning o'qituvchi ismlari: teacherId → fullName.
 * @param {any[]} users
 */
async function loadTeacherNames(users) {
  const ids = [
    ...new Set(users.filter((u) => u.role === "student" && u.teacherId).map((u) => String(u.teacherId))),
  ];
  if (ids.length === 0) return new Map();
  const teachers = await User.find({ _id: mongoose.trusted({ $in: ids }) }, { fullName: 1 }).lean();
  return new Map(teachers.map((t) => [String(t._id), t.fullName]));
}

/** @param {any} user */
async function presentUser(user) {
  return toAdminUser(user, await loadTeacherNames([user]));
}

/** @param {string} id */
async function findUserOr404(id) {
  if (!isObjectIdString(id)) throw new HttpError(404, MSG.userNotFound);
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, MSG.userNotFound);
  return user;
}

/** @param {Record<string, unknown>} body @param {string} key */
function has(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
}

// ---------------------------------------------------------------------------

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin"));

// Tizim bo'yicha umumiy statistika.
adminRouter.get("/statistics", async (_req, res) => {
  const [roleCounts, plans] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    StudyPlan.find({}, PROGRESS_PROJECTION).lean(),
  ]);

  /** @type {Record<string, number>} */
  const byRole = Object.fromEntries(roleCounts.map((r) => [r._id, r.count]));
  const stats = aggregatePlanStats(plans);

  res.json({
    users: {
      total: roleCounts.reduce((sum, r) => sum + r.count, 0),
      students: byRole.student ?? 0,
      teachers: byRole.teacher ?? 0,
      admins: byRole.admin ?? 0,
    },
    plans: stats.plans,
    topics: stats.topics,
    averageProgress: stats.averageProgress,
    overallProgress: stats.overallProgress,
    recentActivity: buildActivity(plans),
  });
});

// Foydalanuvchilar ro'yxati (ixtiyoriy ?role= filtri).
adminRouter.get("/users", async (req, res) => {
  /** @type {Record<string, string>} */
  const filter = {};
  const { role } = req.query;
  if (role !== undefined && role !== "") {
    if (typeof role !== "string" || !ROLES.includes(role)) {
      throw new HttpError(400, MSG.roleInvalid, { errors: { role: MSG.roleInvalid } });
    }
    filter.role = role;
  }

  const users = await User.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
  const teacherNames = await loadTeacherNames(users);
  res.json({ users: users.map((u) => toAdminUser(u, teacherNames)) });
});

// Yangi foydalanuvchi yaratish.
adminRouter.post("/users", async (req, res) => {
  const body = req.body;
  /** @type {Record<string, string>} */
  const errors = {};

  const fullName = readFullName(body.fullName, errors);
  const username = readUsername(body.username, errors);
  const password = readPassword(body.password, errors);
  const role = has(body, "role") && body.role !== null && body.role !== "" ? readRole(body.role, errors) : "student";
  // O'qituvchi faqat o'quvchiga biriktiriladi; boshqa rollar uchun teacherId e'tiborsiz qoldiriladi.
  const teacherId = role === "student" ? await resolveTeacherId(body.teacherId, errors) : null;

  if (Object.keys(errors).length > 0) throw validationError(errors, USER_ERROR_PRIORITY);

  if (await User.exists({ username })) {
    throw new HttpError(409, MSG.usernameTaken, { errors: { username: MSG.usernameTaken } });
  }

  const user = await User.create({
    fullName,
    username,
    passwordHash: await bcrypt.hash(password, config.bcryptRounds),
    role,
    teacherId,
  });

  res.status(201).json({ user: await presentUser(user) });
});

// Foydalanuvchini tahrirlash: fullName, role, teacherId (null — biriktirishni bekor qilish), password.
adminRouter.patch("/users/:id", async (req, res) => {
  const target = await findUserOr404(req.params.id);
  const body = req.body;

  if (!["fullName", "role", "teacherId", "password"].some((key) => has(body, key))) {
    throw new HttpError(400, MSG.nothingToUpdate);
  }

  /** @type {Record<string, string>} */
  const errors = {};
  const isSelf = sameId(target._id, req.user._id);
  const previousRole = target.role;

  const fullName = has(body, "fullName") ? readFullName(body.fullName, errors) : undefined;
  const password = has(body, "password") ? readPassword(body.password, errors) : undefined;

  let nextRole = previousRole;
  if (has(body, "role")) {
    const role = readRole(body.role, errors);
    if (role && role !== previousRole && isSelf) errors.role = MSG.cannotChangeOwnRole;
    else if (role) nextRole = role;
  }

  // Rol o'quvchidan boshqa bo'lsa teacherId doim null.
  let nextTeacherId = nextRole === "student" ? target.teacherId : null;
  if (nextRole === "student" && has(body, "teacherId")) {
    nextTeacherId = await resolveTeacherId(body.teacherId, errors, target._id);
  }

  if (Object.keys(errors).length > 0) {
    // O'z rolini o'zgartirishga urinish — alohida aniq xabar.
    if (errors.role === MSG.cannotChangeOwnRole) {
      throw validationError(errors, ["role", ...USER_ERROR_PRIORITY]);
    }
    throw validationError(errors, USER_ERROR_PRIORITY);
  }

  if (fullName !== undefined) target.fullName = fullName;
  if (password !== undefined) target.passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  target.role = nextRole;
  target.teacherId = nextTeacherId;
  await target.save();

  // O'qituvchi boshqa rolga o'tkazilsa, uning o'quvchilari biriktirilmagan holatga o'tadi.
  if (previousRole === "teacher" && nextRole !== "teacher") {
    await User.updateMany({ teacherId: target._id }, { $set: { teacherId: null } });
  }

  res.json({ user: await presentUser(target) });
});

// Foydalanuvchini o'chirish (rejalari ham o'chiriladi).
adminRouter.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  if (!isObjectIdString(id)) throw new HttpError(404, MSG.userNotFound);
  if (sameId(id, req.user._id)) throw new HttpError(400, MSG.cannotDeleteSelf);

  const target = await User.findById(id, { _id: 1 }).lean();
  if (!target) throw new HttpError(404, MSG.userNotFound);

  // Avval foydalanuvchi o'chiriladi (uning tokeni darhol yaroqsiz bo'ladi), keyin bog'liq ma'lumotlar.
  await User.deleteOne({ _id: target._id });
  await Promise.all([
    StudyPlan.deleteMany({ userId: target._id }),
    User.updateMany({ teacherId: target._id }, { $set: { teacherId: null } }),
  ]);

  res.json({ message: MSG.userDeleted });
});
