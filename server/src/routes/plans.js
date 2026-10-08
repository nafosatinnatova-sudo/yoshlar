// /api/plans — o'quv rejalari (preview, yaratish, ro'yxat, ko'rish, mavzu holati, o'chirish).
// Validatsiya, taqsimlash va foiz hisobi FAQAT shared/planner.js orqali bajariladi.

import { Router } from "express";
import {
  MESSAGES,
  computeProgress,
  distributeTopics,
  isValidDateString,
  validatePlanInput,
} from "../../../shared/planner.js";
import { MSG } from "../messages.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { StudyPlan } from "../models/StudyPlan.js";
import { User } from "../models/User.js";
import { serializePlan } from "../services/serializers.js";
import { HttpError, validationError } from "../utils/http-error.js";
import { isObjectIdString, sameId } from "../utils/ids.js";

/** So'rov tanasidan faqat shu maydonlar o'qiladi (whitelist). */
const PLAN_FIELDS = /** @type {const} */ (["title", "subject", "daysCount", "dailyMinutes", "startDate", "topics"]);

/** Bir nechta xato bo'lsa, `message` sifatida shu tartibdagi birinchisi ko'rsatiladi. */
const ERROR_PRIORITY = ["daysCount", "dailyMinutes", "topics", "title", "subject", "startDate"];

/** @param {Record<string, unknown>} body */
function pickPlanInput(body) {
  /** @type {Record<string, unknown>} */
  const input = {};
  for (const field of PLAN_FIELDS) input[field] = body[field];
  return input;
}

/**
 * Kiritilgan ma'lumotni serverda mustaqil tekshiradi va taqsimotni QAYTA hisoblaydi
 * (mijoz yuborgan `days` ga hech qachon ishonilmaydi).
 * @param {Record<string, unknown>} body
 */
function validateAndDistribute(body) {
  const result = validatePlanInput(pickPlanInput(body));
  if (!result.valid || !result.value) {
    throw validationError(result.errors, ERROR_PRIORITY, result.errors.topics ? result.topicErrors : undefined);
  }
  const distribution = distributeTopics(result.value);
  // Juda uzoq sanalar (masalan, 9999-12-31 + kunlar) YYYY-MM-DD formatidan chiqib ketmasligi uchun.
  if (!isValidDateString(distribution.endDate)) {
    throw validationError({ startDate: MESSAGES.startDateInvalid });
  }
  return { value: result.value, distribution };
}

/**
 * Ixtiyoriy `completedTopicIds`: shu rejadagi mavzu id lari (t1..t6) massivi; takrorlar e'tiborsiz.
 * @param {unknown} raw
 * @param {Array<{ topics: Array<{ topicId: string }> }>} days
 */
function parseCompletedTopicIds(raw, days) {
  if (raw === undefined || raw === null) return new Set();
  const known = new Set(days.flatMap((day) => day.topics.map((t) => t.topicId)));
  if (!Array.isArray(raw) || !raw.every((id) => typeof id === "string" && known.has(id))) {
    throw validationError({ completedTopicIds: MSG.completedTopicIdsInvalid });
  }
  return new Set(/** @type {string[]} */ (raw));
}

/**
 * @param {string} id
 * @param {Record<string, number>} [projection]
 */
async function findPlanOr404(id, projection) {
  if (!isObjectIdString(id)) throw new HttpError(404, MSG.planNotFound);
  const plan = await StudyPlan.findById(id, projection).lean();
  if (!plan) throw new HttpError(404, MSG.planNotFound);
  return plan;
}

/**
 * Rejani ko'rish huquqi: egasi (o'quvchi), egasiga biriktirilgan o'qituvchi (faqat o'qish), admin.
 * @param {any} user
 * @param {{ userId: unknown }} plan
 */
async function assertCanView(user, plan) {
  if (user.role === "admin") return;
  if (user.role === "student" && sameId(plan.userId, user._id)) return;
  if (user.role === "teacher") {
    const owner = await User.findById(plan.userId, { role: 1, teacherId: 1 }).lean();
    if (owner && owner.role === "student" && sameId(owner.teacherId, user._id)) return;
  }
  throw new HttpError(403, MSG.forbidden);
}

/**
 * @param {any} user
 * @param {{ userId: unknown }} plan
 */
function assertOwner(user, plan) {
  if (!sameId(plan.userId, user._id)) throw new HttpError(403, MSG.forbidden);
}

export const plansRouter = Router();

plansRouter.use(authenticate);

// Taqsimotni hisoblash (saqlamasdan).
plansRouter.post("/preview", requireRole("student"), (req, res) => {
  const { value, distribution } = validateAndDistribute(req.body);
  res.json({
    preview: {
      title: value.title,
      subject: value.subject,
      daysCount: value.daysCount,
      dailyMinutes: value.dailyMinutes,
      startDate: value.startDate,
      endDate: distribution.endDate,
      totalTopics: distribution.totalTopics,
      days: distribution.days,
      progress: computeProgress(distribution.days),
    },
  });
});

// Rejani saqlash.
plansRouter.post("/", requireRole("student"), async (req, res) => {
  const { value, distribution } = validateAndDistribute(req.body);
  const completedIds = parseCompletedTopicIds(req.body.completedTopicIds, distribution.days);

  const now = new Date();
  const days = distribution.days.map((day) => ({
    ...day,
    topics: day.topics.map((topic) =>
      completedIds.has(topic.topicId) ? { ...topic, completed: true, completedAt: now } : topic
    ),
  }));

  const plan = await StudyPlan.create({
    userId: req.user._id,
    title: value.title,
    subject: value.subject,
    daysCount: value.daysCount,
    dailyMinutes: value.dailyMinutes,
    startDate: value.startDate,
    endDate: distribution.endDate,
    totalTopics: distribution.totalTopics,
    days,
  });

  res.status(201).json({ plan: serializePlan(plan) });
});

// O'z rejalari (yangisidan eskisiga), `days` siz.
plansRouter.get("/", requireRole("student"), async (req, res) => {
  const plans = await StudyPlan.find({ userId: req.user._id }).sort({ createdAt: -1, _id: -1 }).lean();
  res.json({ plans: plans.map((plan) => serializePlan(plan, { includeDays: false })) });
});

// Reja tafsilotlari.
plansRouter.get("/:id", async (req, res) => {
  const plan = await findPlanOr404(req.params.id);
  await assertCanView(req.user, plan);
  res.json({ plan: serializePlan(plan) });
});

// Mavzu holatini yangilash (faqat egasi).
plansRouter.patch("/:id/topics/:topicId", requireRole("student"), async (req, res) => {
  const plan = await findPlanOr404(req.params.id, { userId: 1, "days.topics.topicId": 1 });
  assertOwner(req.user, plan);

  const { completed } = req.body;
  if (typeof completed !== "boolean") {
    throw new HttpError(400, MSG.completedMustBeBoolean, { errors: { completed: MSG.completedMustBeBoolean } });
  }

  const { topicId } = req.params;
  const exists = (plan.days ?? []).some((day) => (day.topics ?? []).some((t) => t.topicId === topicId));
  if (!exists) throw new HttpError(404, MSG.topicNotFound);

  // Atomar yangilash. Allaqachon bajarilgan mavzu qayta belgilansa, completedAt o'zgarmaydi.
  const path = "days.$[].topics.$[t]";
  const update = completed
    ? { $set: { [`${path}.completed`]: true, [`${path}.completedAt`]: new Date() } }
    : { $set: { [`${path}.completed`]: false, [`${path}.completedAt`]: null } };
  const arrayFilters = completed
    ? [{ "t.topicId": topicId, "t.completed": false }]
    : [{ "t.topicId": topicId }];

  const updated = await StudyPlan.findOneAndUpdate({ _id: plan._id, userId: req.user._id }, update, {
    arrayFilters,
    new: true,
  }).lean();
  if (!updated) throw new HttpError(404, MSG.planNotFound);

  res.json({ plan: serializePlan(updated) });
});

// Rejani o'chirish (faqat egasi).
plansRouter.delete("/:id", requireRole("student"), async (req, res) => {
  const plan = await findPlanOr404(req.params.id, { userId: 1 });
  assertOwner(req.user, plan);
  await StudyPlan.deleteOne({ _id: plan._id, userId: req.user._id });
  res.json({ message: MSG.planDeleted });
});
