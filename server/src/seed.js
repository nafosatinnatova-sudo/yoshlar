// Demo ma'lumotlar (CONTRACT.md §6).
//  - seedDemoData({ reset: false }) — faqat users kolleksiyasi bo'sh bo'lsa yaratadi (server ishga tushganda).
//  - seedDemoData({ reset: true })  — demo hisoblarni idempotent tarzda qayta tiklaydi (`npm run seed`).
// Boshqa (demo bo'lmagan) foydalanuvchilarga tegilmaydi.

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { addDays, distributeTopics, validatePlanInput } from "../../shared/planner.js";
import { config } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import { StudyPlan } from "./models/StudyPlan.js";
import { User } from "./models/User.js";
import { dateKey } from "./utils/dates.js";
import { isMainModule } from "./utils/is-main.js";

export const DEMO_ACCOUNTS = Object.freeze([
  { username: "admin", password: "admin123", fullName: "Administrator", role: "admin", teacher: null },
  { username: "teacher", password: "teacher123", fullName: "Dilnoza Karimova", role: "teacher", teacher: null },
  { username: "student", password: "student123", fullName: "Ali Valiyev", role: "student", teacher: "teacher" },
  { username: "student2", password: "student123", fullName: "Madina Rahimova", role: "student", teacher: "teacher" },
]);

const HOUR = 60 * 60 * 1000;

/**
 * Madina Rahimova uchun namunaviy reja: "Fizika imtihoni", 3 kun × 60 daqiqa, 6 tadan 2 tasi bajarilgan.
 * Taqsimot shared algoritm orqali hisoblanadi.
 * @param {import("mongoose").Types.ObjectId} userId
 * @param {Date} now
 */
function buildSamplePlan(userId, now) {
  const today = dateKey(now, config.timeZone);
  const result = validatePlanInput({
    title: "Fizika imtihoni",
    subject: "Fizika",
    daysCount: 3,
    dailyMinutes: 60,
    startDate: addDays(today, -1),
    topics: [
      "Kinematika",
      "Dinamika va Nyuton qonunlari",
      "Ish, energiya va quvvat",
      "Impuls va saqlanish qonunlari",
      "Elektrostatika",
      "O'zgarmas tok va Om qonuni",
    ],
  });
  if (!result.valid || !result.value) throw new Error("Namunaviy reja ma'lumotlari noto'g'ri.");

  const { title, subject, daysCount, dailyMinutes, startDate } = result.value;
  const { days, endDate, totalTopics } = distributeTopics(result.value);
  /** @type {Record<string, Date>} */
  const completedAt = {
    t1: new Date(now.getTime() - 20 * HOUR),
    t2: new Date(now.getTime() - 2 * HOUR),
  };
  for (const day of days) {
    for (const topic of day.topics) {
      const at = completedAt[topic.topicId];
      if (at) Object.assign(topic, { completed: true, completedAt: at });
    }
  }
  return { userId, title, subject, daysCount, dailyMinutes, startDate, endDate, totalTopics, days };
}

/**
 * @param {{ reset?: boolean, now?: Date }} [options]
 * @returns {Promise<{ seeded: boolean, accounts?: { username: string, password: string, role: string }[] }>}
 */
export async function seedDemoData({ reset = false, now = new Date() } = {}) {
  if (!reset && (await User.countDocuments({})) > 0) return { seeded: false };

  /** @type {Record<string, any>} */
  const users = {};
  for (const account of DEMO_ACCOUNTS) {
    const teacherId = account.teacher ? users[account.teacher]._id : null;
    users[account.username] = await User.findOneAndUpdate(
      { username: account.username },
      {
        $set: {
          fullName: account.fullName,
          role: account.role,
          teacherId,
          passwordHash: await bcrypt.hash(account.password, config.bcryptRounds),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  // Ali Valiyev rejalarsiz boshlaydi; Madina Rahimovada bitta namunaviy reja bo'ladi.
  await StudyPlan.deleteMany({ userId: mongoose.trusted({ $in: [users.student._id, users.student2._id] }) });
  await StudyPlan.create(buildSamplePlan(users.student2._id, now));

  return {
    seeded: true,
    accounts: DEMO_ACCOUNTS.map(({ username, password, role }) => ({ username, password, role })),
  };
}

// CLI: `npm run seed` — demo hisoblarni qayta tiklash.
if (isMainModule(import.meta)) {
  try {
    await connectDB(config.mongoUri);
    const result = await seedDemoData({ reset: true });
    console.log("Demo ma'lumotlar tayyor. Hisoblar:");
    console.table(result.accounts);
  } catch (err) {
    console.error("Demo ma'lumotlarni yaratib bo'lmadi:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
