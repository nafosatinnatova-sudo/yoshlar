// Mongoose hujjatlarini API shartnomasidagi (CONTRACT.md §3) aniq JSON shakllariga aylantirish.
// Hech qachon _id, __v yoki passwordHash chiqmaydi. `progress` doim shared computeProgress bilan hisoblanadi.

import { computeProgress } from "../../../shared/planner.js";
import { toIso } from "../utils/dates.js";

/**
 * Hujjat yoki lean obyektni oddiy obyektga aylantiradi.
 * @param {any} doc
 */
function plain(doc) {
  return doc && typeof doc.toObject === "function" ? doc.toObject({ depopulate: true }) : doc;
}

/**
 * Ommaviy foydalanuvchi: { id, fullName, username, role, teacherId, createdAt }.
 * @param {any} userDoc
 */
export function toPublicUser(userDoc) {
  const u = plain(userDoc);
  return {
    id: String(u._id ?? u.id),
    fullName: u.fullName,
    username: u.username,
    role: u.role,
    teacherId: u.teacherId ? String(u.teacherId) : null,
    createdAt: toIso(u.createdAt),
  };
}

/**
 * Admin ro'yxati uchun: o'quvchilarga qo'shimcha `teacherName` beriladi.
 * @param {any} userDoc
 * @param {Map<string, string>} teacherNames teacherId → fullName
 */
export function toAdminUser(userDoc, teacherNames) {
  const user = toPublicUser(userDoc);
  if (user.role === "student") {
    return { ...user, teacherName: user.teacherId ? teacherNames.get(user.teacherId) ?? null : null };
  }
  return user;
}

/** @param {any} t */
function serializeTopic(t) {
  return {
    topicId: t.topicId,
    title: t.title,
    minutes: t.minutes,
    completed: t.completed === true,
    completedAt: toIso(t.completedAt),
  };
}

/** @param {any} d */
export function serializeDay(d) {
  return {
    dayNumber: d.dayNumber,
    date: d.date ?? null,
    type: d.type,
    totalMinutes: d.totalMinutes,
    topics: (Array.isArray(d.topics) ? d.topics : []).map(serializeTopic),
  };
}

/**
 * To'liq reja (includeDays = true) yoki qisqa ko'rinish (ro'yxatlar uchun, `days` siz).
 * @param {any} planDoc
 * @param {{ includeDays?: boolean }} [options]
 */
export function serializePlan(planDoc, { includeDays = true } = {}) {
  const p = plain(planDoc);
  const days = (Array.isArray(p.days) ? p.days : []).map(serializeDay);
  /** @type {Record<string, unknown>} */
  const out = {
    id: String(p._id ?? p.id),
    userId: String(p.userId),
    title: p.title,
    subject: p.subject,
    daysCount: p.daysCount,
    dailyMinutes: p.dailyMinutes,
    startDate: p.startDate,
    endDate: p.endDate,
    totalTopics: p.totalTopics,
  };
  if (includeDays) out.days = days;
  out.progress = computeProgress(days);
  out.createdAt = toIso(p.createdAt);
  out.updatedAt = toIso(p.updatedAt);
  return out;
}
