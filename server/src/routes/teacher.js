// /api/teacher — o'qituvchi faqat o'ziga biriktirilgan o'quvchilarni (teacherId == o'zi) ko'radi.

import { Router } from "express";
import mongoose from "mongoose";
import { MSG } from "../messages.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { StudyPlan } from "../models/StudyPlan.js";
import { User } from "../models/User.js";
import { serializePlan, toPublicUser } from "../services/serializers.js";
import { PROGRESS_PROJECTION, buildActivity, summarizePlans } from "../services/stats.js";
import { HttpError } from "../utils/http-error.js";
import { isObjectIdString, sameId } from "../utils/ids.js";

export const teacherRouter = Router();

teacherRouter.use(authenticate, requireRole("teacher"));

// Biriktirilgan o'quvchilar va ularning umumiy ko'rsatkichlari.
teacherRouter.get("/students", async (req, res) => {
  const students = await User.find({ role: "student", teacherId: req.user._id }).sort({ fullName: 1, _id: 1 }).lean();
  const ids = students.map((s) => s._id);

  const plans =
    ids.length > 0
      ? await StudyPlan.find({ userId: mongoose.trusted({ $in: ids }) }, PROGRESS_PROJECTION).lean()
      : [];

  /** @type {Map<string, any[]>} */
  const plansByStudent = new Map();
  for (const plan of plans) {
    const key = String(plan.userId);
    const list = plansByStudent.get(key);
    if (list) list.push(plan);
    else plansByStudent.set(key, [plan]);
  }

  res.json({
    students: students.map((student) => {
      const summary = summarizePlans(plansByStudent.get(String(student._id)) ?? []);
      return {
        id: String(student._id),
        fullName: student.fullName,
        username: student.username,
        plansCount: summary.plansCount,
        totalTopics: summary.totalTopics,
        completedTopics: summary.completedTopics,
        progress: summary.progress,
        lastActivityAt: summary.lastActivityAt,
      };
    }),
  });
});

// Bitta o'quvchining rejalari (faqat o'qish), kundalik faollik va umumiy natija.
teacherRouter.get("/students/:id/plans", async (req, res) => {
  const { id } = req.params;
  if (!isObjectIdString(id)) throw new HttpError(404, MSG.userNotFound);

  const student = await User.findById(id).lean();
  if (!student || student.role !== "student") throw new HttpError(404, MSG.userNotFound);
  if (!sameId(student.teacherId, req.user._id)) throw new HttpError(403, MSG.forbidden);

  const plans = await StudyPlan.find({ userId: student._id }).sort({ createdAt: -1, _id: -1 }).lean();
  const summary = summarizePlans(plans);

  res.json({
    student: toPublicUser(student),
    plans: plans.map((plan) => serializePlan(plan)),
    activity: buildActivity(plans),
    summary: {
      plansCount: summary.plansCount,
      totalTopics: summary.totalTopics,
      completedTopics: summary.completedTopics,
      progress: summary.progress,
    },
  });
});
