// REST API integratsion testlari: supertest + mongodb-memory-server (yoki MONGODB_TEST_URI).
// Testlar fayl ichida ketma-ket bajariladi va umumiy holatdan (tokenlar, reja id lari) foydalanadi.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MESSAGES } from "../../shared/planner.js";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { connectDB, disconnectDB } from "../src/db.js";
import { MSG } from "../src/messages.js";
import { StudyPlan } from "../src/models/StudyPlan.js";
import { User } from "../src/models/User.js";
import { seedDemoData } from "../src/seed.js";
import { dateKey } from "../src/utils/dates.js";

/** @type {MongoMemoryServer | undefined} */
let mongod;
/** @type {import("express").Express} */
let app;

/** Barcha javob matnlari — oxirida maxfiy maydonlar sizib chiqmaganini tekshirish uchun. */
const responseBodies = [];

const TOPICS = ["Algebra", "Geometriya", "Trigonometriya", "Logarifmlar", "Hosila", "Integral"];

/** @param {Record<string, unknown>} [overrides] */
const planInput = (overrides = {}) => ({
  title: "Matematika imtihoni",
  subject: "Matematika",
  daysCount: 3,
  dailyMinutes: 60,
  startDate: "2026-10-10",
  topics: TOPICS,
  ...overrides,
});

/**
 * @param {"get" | "post" | "patch" | "delete"} method
 * @param {string} url
 * @param {{ token?: string, body?: unknown, target?: import("express").Express }} [options]
 */
async function call(method, url, { token, body, target } = {}) {
  let req = request(target ?? app)[method](url);
  if (token) req = req.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) req = req.send(/** @type {any} */ (body));
  const res = await req;
  responseBodies.push(res.text ?? "");
  return res;
}

const api = {
  /** @param {string} url @param {string} [token] */
  get: (url, token) => call("get", url, { token }),
  /** @param {string} url @param {unknown} body @param {string} [token] */
  post: (url, body, token) => call("post", url, { token, body }),
  /** @param {string} url @param {unknown} body @param {string} [token] */
  patch: (url, body, token) => call("patch", url, { token, body }),
  /** @param {string} url @param {string} [token] */
  delete: (url, token) => call("delete", url, { token }),
};

/** @param {string} username @param {string} password */
async function login(username, password) {
  const res = await api.post("/api/auth/login", { username, password });
  expect(res.status).toBe(200);
  return /** @type {string} */ (res.body.token);
}

/** @param {any} plan @param {string} topicId */
const findTopic = (plan, topicId) =>
  plan.days.flatMap((/** @type {any} */ d) => d.topics).find((/** @type {any} */ t) => t.topicId === topicId);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MISSING_ID = "64b7f0c2a1b2c3d4e5f60718";

// Testlar davomida to'ldiriladigan umumiy holat
const tokens = /** @type {Record<string, string>} */ ({});
const ids = /** @type {Record<string, string>} */ ({});

beforeAll(async () => {
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  await connectDB(uri, { dbName: `ssp_test_${process.pid}_${Date.now()}` });
  await seedDemoData({ reset: true });
  app = createApp({ serveClient: false, loginRateLimit: { limit: 1000 } });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await disconnectDB();
  if (mongod) await mongod.stop();
});

describe("Umumiy", () => {
  it("GET /api/health → { status: 'ok' }", async () => {
    const res = await api.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("noma'lum /api manzili → 404 JSON", async () => {
    const res = await api.get("/api/nimadir/boshqa");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "So'ralgan manzil topilmadi." });
  });

  it("buzilgan JSON → 400 \"So'rov formati noto'g'ri.\"", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"username": "student", "password": ');
    responseBodies.push(res.text);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "So'rov formati noto'g'ri." });
  });

  it("noto'g'ri so'rovlar 500 emas, 4xx qaytaradi", async () => {
    // URL dagi buzilgan %-kodlash (autentifikatsiyadan keyin, route parametri dekodlanganda)
    const studentToken = await login("student", "student123");
    const badParam = await request(app).get("/api/plans/%E0%A4%A").set("Authorization", `Bearer ${studentToken}`);
    expect(badParam.status).toBe(400);
    expect(badParam.body.message).toBe(MSG.badJson);

    // 100kb dan katta tana
    const huge = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ username: "x".repeat(200_000), password: "y" }));
    expect(huge.status).toBe(413);
    expect(huge.body.message).toBe(MSG.payloadTooLarge);

    // Juda chuqur ichma-ich JSON
    const deep = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"username":${"[".repeat(500)}${"]".repeat(500)},"password":"x"}`);
    expect(deep.status).toBe(400);

    // Massiv yoki JSON bo'lmagan tana → maydon xatolari bilan 400
    const arrayBody = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("[]");
    expect(arrayBody.status).toBe(400);
    expect(arrayBody.body.errors).toHaveProperty("username");
    const textBody = await request(app).post("/api/auth/login").set("Content-Type", "text/plain").send("student");
    expect(textBody.status).toBe(400);
    for (const res of [badParam, huge, deep, arrayBody, textBody]) responseBodies.push(res.text);
  });

  it("xavfsizlik sarlavhalari (helmet, CSP) o'rnatilgan, API keshlanmaydi", async () => {
    const res = await api.get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("Demo ma'lumotlar (seed)", () => {
  it("seed idempotent: 4 ta demo hisob, Ali rejasiz, Madinada 2/6 bajarilgan bitta reja", async () => {
    await seedDemoData({ reset: true }); // ikkinchi marta — dublikat yaratmasligi kerak
    const users = await User.find({ username: mongoose.trusted({ $in: ["admin", "teacher", "student", "student2"] }) }).lean();
    expect(users).toHaveLength(4);
    const byName = Object.fromEntries(users.map((u) => [u.username, u]));
    expect(byName.admin.role).toBe("admin");
    expect(byName.teacher.fullName).toBe("Dilnoza Karimova");
    expect(String(byName.student.teacherId)).toBe(String(byName.teacher._id));
    expect(String(byName.student2.teacherId)).toBe(String(byName.teacher._id));

    expect(await StudyPlan.countDocuments({ userId: byName.student._id })).toBe(0);
    const samples = await StudyPlan.find({ userId: byName.student2._id }).lean();
    expect(samples).toHaveLength(1);
    expect(samples[0].title).toBe("Fizika imtihoni");
    expect(samples[0].daysCount).toBe(3);
    expect(samples[0].dailyMinutes).toBe(60);
    const completed = samples[0].days.flatMap((d) => d.topics).filter((t) => t.completed);
    expect(completed).toHaveLength(2);

    // Parollar xeshlangan holda saqlanadi.
    const withHash = await User.findOne({ username: "student" }).select("+passwordHash").lean();
    expect(withHash?.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(withHash?.passwordHash).not.toContain("student123");

    expect((await seedDemoData({ reset: false })).seeded).toBe(false);
  });
});

describe("Autentifikatsiya", () => {
  it.each([
    ["admin", "admin123", "admin", "Administrator"],
    ["teacher", "teacher123", "teacher", "Dilnoza Karimova"],
    ["student", "student123", "student", "Ali Valiyev"],
    ["student2", "student123", "student", "Madina Rahimova"],
  ])("%s sifatida kirish → 200, token va foydalanuvchi", async (username, password, role, fullName) => {
    const res = await api.post("/api/auth/login", { username, password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(Object.keys(res.body.user).sort()).toEqual(["createdAt", "fullName", "id", "role", "teacherId", "username"]);
    expect(res.body.user).toMatchObject({ username, role, fullName });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const decoded = /** @type {any} */ (jwt.decode(res.body.token));
    expect(decoded.sub).toBe(res.body.user.id);
    expect(decoded.role).toBe(role);

    tokens[username] = res.body.token;
    ids[username] = res.body.user.id;
  });

  it("o'quvchiga o'qituvchi biriktirilgan", () => {
    expect(ids.student).toBeTruthy();
    expect(ids.teacher).toBeTruthy();
  });

  it("login katta-kichik harfga sezgir emas va bo'shliqlar olib tashlanadi", async () => {
    const res = await api.post("/api/auth/login", { username: "  STUDENT ", password: "student123" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("student");
  });

  it("noto'g'ri parol → 401", async () => {
    const res = await api.post("/api/auth/login", { username: "student", password: "notogri" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Login yoki parol noto'g'ri." });
    expect(res.body).not.toHaveProperty("token");
  });

  it("mavjud bo'lmagan foydalanuvchi → 401 (xuddi shu xabar)", async () => {
    const res = await api.post("/api/auth/login", { username: "yoq_odam", password: "student123" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MSG.invalidCredentials);
  });

  it("bo'sh maydonlar → 400 maydon xatolari bilan", async () => {
    const res = await api.post("/api/auth/login", { username: "  ", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({
      username: "Foydalanuvchi nomini kiriting.",
      password: "Parolni kiriting.",
    });
  });

  it("NoSQL-injection ({ $ne: null }) bilan kirib bo'lmaydi", async () => {
    const res = await api.post("/api/auth/login", { username: { $ne: null }, password: { $ne: null } });
    expect(res.status).not.toBe(200);
    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty("token");

    const partial = await api.post("/api/auth/login", { username: "student", password: { $gt: "" } });
    expect(partial.status).toBe(400);
    expect(partial.body).not.toHaveProperty("token");

    const regex = await api.post("/api/auth/login", { username: { $regex: ".*" }, password: "student123" });
    expect(regex.status).toBe(400);
  });

  it("GET /api/auth/me → joriy foydalanuvchi", async () => {
    const res = await api.get("/api/auth/me", tokens.student);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: ids.student, username: "student", role: "student", teacherId: ids.teacher });
  });

  it("tokensiz → 401 \"Avval tizimga kiring.\"", async () => {
    const res = await api.get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Avval tizimga kiring.");
  });

  it("buzilgan / soxta / begona token → 401", async () => {
    const malformed = await api.get("/api/auth/me", "bu.token.emas");
    expect(malformed.status).toBe(401);
    expect(malformed.body.message).toBe(MSG.sessionExpired);

    const forged = jwt.sign({ role: "admin" }, "boshqa-maxfiy-kalit", { subject: ids.student, expiresIn: "1h" });
    expect((await api.get("/api/auth/me", forged)).status).toBe(401);

    const expired = jwt.sign({ role: "student" }, /** @type {string} */ (config.jwtSecret), {
      subject: ids.student,
      expiresIn: -10,
    });
    const expiredRes = await api.get("/api/auth/me", expired);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.message).toBe("Sessiya muddati tugagan. Qaytadan kiring.");

    const ghost = jwt.sign({ role: "admin" }, /** @type {string} */ (config.jwtSecret), {
      subject: MISSING_ID,
      expiresIn: "1h",
    });
    expect((await api.get("/api/auth/me", ghost)).status).toBe(401);

    const basic = await request(app).get("/api/auth/me").set("Authorization", "Basic YWRtaW46YWRtaW4xMjM=");
    expect(basic.status).toBe(401);
  });

  it("tokendagi rolga emas, bazadagi rolga ishoniladi", async () => {
    // O'quvchi ID si bilan, lekin "admin" roli yozilgan to'g'ri imzoli token.
    const escalated = jwt.sign({ role: "admin" }, /** @type {string} */ (config.jwtSecret), {
      subject: ids.student,
      expiresIn: "1h",
    });
    const res = await api.get("/api/admin/statistics", escalated);
    expect(res.status).toBe(403);
  });

  it("ko'p muvaffaqiyatsiz urinishdan keyin → 429", async () => {
    const limited = createApp({ serveClient: false, loginRateLimit: { limit: 3 } });
    const attempt = (password) => call("post", "/api/auth/login", { target: limited, body: { username: "student", password } });
    for (let i = 0; i < 3; i++) expect((await attempt("xato-parol")).status).toBe(401);
    const blocked = await attempt("xato-parol");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(MSG.tooManyLogins);
  });
});

describe("Reja preview va validatsiya (POST /api/plans/preview)", () => {
  /** @param {Record<string, unknown>} overrides */
  const preview = (overrides) => api.post("/api/plans/preview", planInput(overrides), tokens.student);

  it("0 kun → 400 \"Kunlar soni kamida 1 bo'lishi kerak.\"", async () => {
    const res = await preview({ daysCount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.daysCount).toBe("Kunlar soni kamida 1 bo'lishi kerak.");
    expect(res.body.message).toBe("Kunlar soni kamida 1 bo'lishi kerak.");
  });

  it("0 daqiqa → 400 \"Kunlik vaqtni to'g'ri kiriting.\"", async () => {
    const res = await preview({ dailyMinutes: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.dailyMinutes).toBe("Kunlik vaqtni to'g'ri kiriting.");
  });

  it("1 daqiqa → 400 \"Vaqt yetarli emas\"", async () => {
    const res = await preview({ dailyMinutes: 1 });
    expect(res.status).toBe(400);
    expect(res.body.errors.dailyMinutes).toContain("Vaqt yetarli emas");
  });

  it.each([["abc"], ["2.5"], [2.5], ["3kun"]])("kunlar soni %j → 400 (harf/kasr)", async (value) => {
    const res = await preview({ daysCount: value });
    expect(res.status).toBe(400);
    expect(res.body.errors.daysCount).toBe(MESSAGES.daysNotInteger);
  });

  it("manfiy kunlar va daqiqalar → 400", async () => {
    const res = await preview({ daysCount: -2, dailyMinutes: -30 });
    expect(res.status).toBe(400);
    expect(res.body.errors.daysCount).toBe(MESSAGES.daysMin);
    expect(res.body.errors.dailyMinutes).toBe(MESSAGES.minutesMin);
  });

  it("bo'sh mavzu → 400 \"Barcha 6 ta mavzuni kiriting.\" + topicErrors", async () => {
    const topics = [...TOPICS];
    topics[2] = "";
    const res = await preview({ topics });
    expect(res.status).toBe(400);
    expect(res.body.errors.topics).toBe("Barcha 6 ta mavzuni kiriting.");
    expect(res.body.topicErrors).toEqual([null, null, "Barcha 6 ta mavzuni kiriting.", null, null, null]);
  });

  it("5 ta mavzu → 400", async () => {
    const res = await preview({ topics: TOPICS.slice(0, 5) });
    expect(res.status).toBe(400);
    expect(res.body.errors.topics).toBe(MESSAGES.topicsRequired);
  });

  it("reja nomi, fan va sana tekshiriladi", async () => {
    const res = await preview({ title: "", subject: "<b></b>", startDate: "2026-13-01" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toMatchObject({
      title: MESSAGES.titleRequired,
      subject: MESSAGES.subjectRequired,
      startDate: MESSAGES.startDateInvalid,
    });
  });

  it("bo'sh tana → 400 barcha maydon xatolari bilan", async () => {
    const res = await api.post("/api/plans/preview", {}, tokens.student);
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(
      ["dailyMinutes", "daysCount", "startDate", "subject", "title", "topics"].sort()
    );
  });

  it("3 kun, 60 daqiqa → 2+2+2 mavzu, har biri 30 daqiqa", async () => {
    const res = await preview({});
    expect(res.status).toBe(200);
    const p = res.body.preview;
    expect(p.days.map((/** @type {any} */ d) => d.topics.length)).toEqual([2, 2, 2]);
    expect(p.days.flatMap((/** @type {any} */ d) => d.topics.map((/** @type {any} */ t) => t.minutes))).toEqual([
      30, 30, 30, 30, 30, 30,
    ]);
    expect(p.days.map((/** @type {any} */ d) => d.date)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(p).toMatchObject({
      title: "Matematika imtihoni",
      subject: "Matematika",
      daysCount: 3,
      dailyMinutes: 60,
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      totalTopics: 6,
      progress: { total: 6, completed: 0, percent: 0 },
    });
  });

  it("2 kun → 3+3, 4 kun → 2+2+1+1", async () => {
    const two = await preview({ daysCount: 2 });
    expect(two.body.preview.days.map((/** @type {any} */ d) => d.topics.length)).toEqual([3, 3]);
    const four = await preview({ daysCount: 4 });
    expect(four.body.preview.days.map((/** @type {any} */ d) => d.topics.length)).toEqual([2, 2, 1, 1]);
  });

  it("8 kun → 6 ta mavzu kuni + 2 ta takrorlash kuni", async () => {
    const res = await preview({ daysCount: 8 });
    expect(res.status).toBe(200);
    const days = res.body.preview.days;
    expect(days).toHaveLength(8);
    expect(days.filter((/** @type {any} */ d) => d.type === "study")).toHaveLength(6);
    expect(days.filter((/** @type {any} */ d) => d.type === "review")).toHaveLength(2);
    expect(days.slice(6).every((/** @type {any} */ d) => d.topics.length === 0)).toBe(true);
    expect(res.body.preview.progress.total).toBe(6);
  });

  it("61 daqiqa → kuniga 31+30 daqiqa", async () => {
    const res = await preview({ dailyMinutes: 61 });
    expect(res.status).toBe(200);
    for (const day of res.body.preview.days) {
      expect(day.topics.map((/** @type {any} */ t) => t.minutes)).toEqual([31, 30]);
      expect(day.totalMinutes).toBe(61);
    }
  });

  it("raqamlar satr ko'rinishida ham qabul qilinadi", async () => {
    const res = await preview({ daysCount: "3", dailyMinutes: "60" });
    expect(res.status).toBe(200);
    expect(res.body.preview.daysCount).toBe(3);
  });

  it("matnlar sanitizatsiya qilinadi (XSS)", async () => {
    const topics = [...TOPICS];
    topics[0] = "<img src=x onerror=alert(1)>Algebra";
    const res = await preview({ title: "<script>alert(1)</script>Reja", topics });
    expect(res.status).toBe(200);
    expect(res.body.preview.title).toBe("alert(1)Reja");
    expect(res.body.preview.days[0].topics[0].title).toBe("Algebra");
  });

  it("preview bazaga saqlanmaydi", async () => {
    expect(await StudyPlan.countDocuments({ userId: ids.student })).toBe(0);
  });

  it("faqat o'quvchi preview qila oladi; tokensiz → 401", async () => {
    expect((await api.post("/api/plans/preview", planInput(), tokens.teacher)).status).toBe(403);
    expect((await api.post("/api/plans/preview", planInput(), tokens.admin)).status).toBe(403);
    expect((await api.post("/api/plans/preview", planInput())).status).toBe(401);
  });
});

describe("Reja: yaratish, saqlash, qayta ochish, belgilash, o'chirish", () => {
  it("POST /api/plans → 201, taqsimot serverda qayta hisoblanadi (mijoz days/userId/progress e'tiborsiz)", async () => {
    const res = await api.post(
      "/api/plans",
      {
        ...planInput(),
        userId: ids.student2,
        days: [{ dayNumber: 1, topics: [{ topicId: "t1", title: "Soxta", minutes: 999, completed: true }] }],
        progress: { total: 6, completed: 6, percent: 100 },
        totalTopics: 99,
      },
      tokens.student
    );
    expect(res.status).toBe(201);
    const plan = res.body.plan;
    ids.planA = plan.id;
    expect(plan.userId).toBe(ids.student);
    expect(plan.totalTopics).toBe(6);
    expect(plan.days.map((/** @type {any} */ d) => d.topics.length)).toEqual([2, 2, 2]);
    expect(plan.days[0].topics[0]).toEqual({
      topicId: "t1",
      title: "Algebra",
      minutes: 30,
      completed: false,
      completedAt: null,
    });
    expect(plan.progress).toEqual({ total: 6, completed: 0, percent: 0 });
    expect(plan.createdAt).toMatch(ISO_RE);
    expect(plan.updatedAt).toMatch(ISO_RE);
    expect(plan).not.toHaveProperty("_id");
    expect(plan).not.toHaveProperty("__v");
  });

  it("POST /api/plans validatsiyasi ham ishlaydi (0 kun → 400)", async () => {
    const res = await api.post("/api/plans", planInput({ daysCount: 0 }), tokens.student);
    expect(res.status).toBe(400);
    expect(res.body.errors.daysCount).toBe(MESSAGES.daysMin);
  });

  it("GET /api/plans → o'z rejalari, days siz, progress bilan", async () => {
    const res = await api.get("/api/plans", tokens.student);
    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(1);
    expect(res.body.plans[0]).not.toHaveProperty("days");
    expect(res.body.plans[0]).toMatchObject({ id: ids.planA, title: "Matematika imtihoni", progress: { percent: 0 } });
  });

  it("GET /api/plans/:id → to'liq reja", async () => {
    const res = await api.get(`/api/plans/${ids.planA}`, tokens.student);
    expect(res.status).toBe(200);
    expect(res.body.plan.days).toHaveLength(3);
    expect(res.body.plan.endDate).toBe("2026-10-12");
  });

  /** @type {Record<string, string>} */
  const completedAtBefore = {};

  it("3 ta mavzu belgilanadi → 50%", async () => {
    const expected = [17, 33, 50];
    for (const [i, topicId] of ["t1", "t2", "t3"].entries()) {
      const res = await api.patch(`/api/plans/${ids.planA}/topics/${topicId}`, { completed: true }, tokens.student);
      expect(res.status).toBe(200);
      expect(res.body.plan.progress.percent).toBe(expected[i]);
      const topic = findTopic(res.body.plan, topicId);
      expect(topic.completed).toBe(true);
      expect(topic.completedAt).toMatch(ISO_RE);
      completedAtBefore[topicId] = topic.completedAt;
    }
  });

  it("qayta ochilganda (GET) natija saqlangan → 50%", async () => {
    const res = await api.get(`/api/plans/${ids.planA}`, tokens.student);
    expect(res.status).toBe(200);
    expect(res.body.plan.progress).toEqual({ total: 6, completed: 3, percent: 50 });
    expect(findTopic(res.body.plan, "t1").completedAt).toBe(completedAtBefore.t1);
    expect(findTopic(res.body.plan, "t4").completed).toBe(false);

    const list = await api.get("/api/plans", tokens.student);
    expect(list.body.plans[0].progress.percent).toBe(50);
  });

  it("allaqachon bajarilgan mavzu qayta belgilansa completedAt o'zgarmaydi", async () => {
    const res = await api.patch(`/api/plans/${ids.planA}/topics/t1`, { completed: true }, tokens.student);
    expect(res.status).toBe(200);
    expect(findTopic(res.body.plan, "t1").completedAt).toBe(completedAtBefore.t1);
    expect(res.body.plan.progress.percent).toBe(50);
  });

  it("completed haqiqiy boolean bo'lishi shart → 400", async () => {
    for (const body of [{ completed: "true" }, { completed: 1 }, {}, { completed: null }]) {
      const res = await api.patch(`/api/plans/${ids.planA}/topics/t4`, body, tokens.student);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("completed qiymati true yoki false bo'lishi kerak.");
    }
  });

  it("noma'lum mavzu → 404 \"Mavzu topilmadi.\"", async () => {
    const res = await api.patch(`/api/plans/${ids.planA}/topics/t9`, { completed: true }, tokens.student);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Mavzu topilmadi.");
  });

  it("noto'g'ri yoki mavjud bo'lmagan id → 404 \"Reja topilmadi.\"", async () => {
    for (const url of ["/api/plans/123", "/api/plans/not-an-id", `/api/plans/${MISSING_ID}`]) {
      const res = await api.get(url, tokens.student);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reja topilmadi.");
    }
    expect((await api.patch("/api/plans/abc/topics/t1", { completed: true }, tokens.student)).status).toBe(404);
    expect((await api.delete("/api/plans/abc", tokens.student)).status).toBe(404);
  });

  it("6 tasi belgilansa 100%, bittasi qaytarilsa completedAt = null", async () => {
    const created = await api.post("/api/plans", planInput({ title: "Ikkinchi reja", daysCount: 2 }), tokens.student);
    expect(created.status).toBe(201);
    ids.planB = created.body.plan.id;

    let last;
    for (const topicId of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
      last = await api.patch(`/api/plans/${ids.planB}/topics/${topicId}`, { completed: true }, tokens.student);
      expect(last.status).toBe(200);
    }
    expect(last?.body.plan.progress).toEqual({ total: 6, completed: 6, percent: 100 });

    const undone = await api.patch(`/api/plans/${ids.planB}/topics/t6`, { completed: false }, tokens.student);
    expect(undone.status).toBe(200);
    expect(findTopic(undone.body.plan, "t6")).toMatchObject({ completed: false, completedAt: null });
    expect(undone.body.plan.progress).toEqual({ total: 6, completed: 5, percent: 83 });

    const reopened = await api.get(`/api/plans/${ids.planB}`, tokens.student);
    expect(findTopic(reopened.body.plan, "t6").completedAt).toBeNull();
    expect(reopened.body.plan.progress.percent).toBe(83);
  });

  it("completedTopicIds bilan yaratish (takrorlar e'tiborsiz) → bajarilgan holda saqlanadi", async () => {
    const res = await api.post(
      "/api/plans",
      planInput({ title: "Belgilangan reja", completedTopicIds: ["t1", "t2", "t2"] }),
      tokens.student
    );
    expect(res.status).toBe(201);
    ids.planC = res.body.plan.id;
    expect(res.body.plan.progress).toEqual({ total: 6, completed: 2, percent: 33 });
    expect(findTopic(res.body.plan, "t1").completedAt).toMatch(ISO_RE);
    expect(findTopic(res.body.plan, "t3")).toMatchObject({ completed: false, completedAt: null });
  });

  it("noto'g'ri completedTopicIds → 400", async () => {
    for (const completedTopicIds of [["t7"], ["t1", 2], "t1", { t1: true }]) {
      const res = await api.post("/api/plans", planInput({ completedTopicIds }), tokens.student);
      expect(res.status).toBe(400);
      expect(res.body.errors.completedTopicIds).toBe(MSG.completedTopicIdsInvalid);
    }
  });

  it("rejalar yangisidan eskisiga tartiblangan", async () => {
    const res = await api.get("/api/plans", tokens.student);
    expect(res.body.plans.map((/** @type {any} */ p) => p.id)).toEqual([ids.planC, ids.planB, ids.planA]);
  });

  it("DELETE → \"Reja o'chirildi.\", keyin GET → 404", async () => {
    for (const id of [ids.planB, ids.planC]) {
      const res = await api.delete(`/api/plans/${id}`, tokens.student);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Reja o'chirildi." });
      const after = await api.get(`/api/plans/${id}`, tokens.student);
      expect(after.status).toBe(404);
      expect(after.body.message).toBe("Reja topilmadi.");
      expect((await api.delete(`/api/plans/${id}`, tokens.student)).status).toBe(404);
    }
    const list = await api.get("/api/plans", tokens.student);
    expect(list.body.plans.map((/** @type {any} */ p) => p.id)).toEqual([ids.planA]);
  });
});

describe("Ruxsatlar (avtorizatsiya)", () => {
  it("admin boshqa o'quvchi va ikkinchi o'qituvchi yaratadi", async () => {
    const other = await api.post(
      "/api/admin/users",
      { fullName: "Boshqa O'quvchi", username: "other_student", password: "secret12", role: "student" },
      tokens.admin
    );
    expect(other.status).toBe(201);
    ids.other = other.body.user.id;
    tokens.other = await login("other_student", "secret12");

    const teacher2 = await api.post(
      "/api/admin/users",
      { fullName: "Ikkinchi O'qituvchi", username: "teacher2", password: "teacher234", role: "teacher" },
      tokens.admin
    );
    expect(teacher2.status).toBe(201);
    ids.teacher2 = teacher2.body.user.id;
    tokens.teacher2 = await login("teacher2", "teacher234");
  });

  it("boshqa o'quvchi rejani ko'ra / o'zgartira / o'chira olmaydi → 403", async () => {
    const get = await api.get(`/api/plans/${ids.planA}`, tokens.other);
    expect(get.status).toBe(403);
    expect(get.body.message).toBe("Bu amalni bajarish uchun ruxsatingiz yo'q.");
    expect((await api.patch(`/api/plans/${ids.planA}/topics/t4`, { completed: true }, tokens.other)).status).toBe(403);
    expect((await api.delete(`/api/plans/${ids.planA}`, tokens.other)).status).toBe(403);

    // Reja o'zgarmagan.
    const own = await api.get(`/api/plans/${ids.planA}`, tokens.student);
    expect(own.status).toBe(200);
    expect(own.body.plan.progress.percent).toBe(50);

    const list = await api.get("/api/plans", tokens.other);
    expect(list.body.plans).toEqual([]);
  });

  it("o'qituvchi o'ziga biriktirilgan o'quvchini va uning 50% natijasini ko'radi", async () => {
    const res = await api.get("/api/teacher/students", tokens.teacher);
    expect(res.status).toBe(200);
    const byUsername = Object.fromEntries(res.body.students.map((/** @type {any} */ s) => [s.username, s]));
    expect(Object.keys(byUsername).sort()).toEqual(["student", "student2"]);
    expect(byUsername.student).toEqual({
      id: ids.student,
      fullName: "Ali Valiyev",
      username: "student",
      plansCount: 1,
      totalTopics: 6,
      completedTopics: 3,
      progress: 50,
      lastActivityAt: expect.stringMatching(ISO_RE),
    });
    expect(byUsername.student2).toMatchObject({ plansCount: 1, totalTopics: 6, completedTopics: 2, progress: 33 });
  });

  it("o'qituvchi o'quvchi rejalari, faolligi va umumiy natijasini ko'radi", async () => {
    const res = await api.get(`/api/teacher/students/${ids.student}/plans`, tokens.teacher);
    expect(res.status).toBe(200);
    expect(res.body.student).toMatchObject({ id: ids.student, fullName: "Ali Valiyev", role: "student" });
    expect(res.body.plans).toHaveLength(1);
    expect(res.body.plans[0].days).toHaveLength(3);
    expect(res.body.plans[0].progress.percent).toBe(50);
    expect(res.body.summary).toEqual({ plansCount: 1, totalTopics: 6, completedTopics: 3, progress: 50 });

    const activity = res.body.activity;
    expect(activity).toHaveLength(14);
    expect(activity.at(-1).date).toBe(dateKey(new Date(), config.timeZone));
    const dates = activity.map((/** @type {any} */ a) => a.date);
    expect([...dates].sort()).toEqual(dates); // eskisidan yangisiga
    expect(activity.at(-1).completed).toBe(3);
    expect(activity.reduce((/** @type {number} */ s, /** @type {any} */ a) => s + a.completed, 0)).toBe(3);
  });

  it("o'qituvchi biriktirilgan o'quvchining rejasini faqat o'qiy oladi", async () => {
    expect((await api.get(`/api/plans/${ids.planA}`, tokens.teacher)).status).toBe(200);
    expect((await api.patch(`/api/plans/${ids.planA}/topics/t4`, { completed: true }, tokens.teacher)).status).toBe(403);
    expect((await api.delete(`/api/plans/${ids.planA}`, tokens.teacher)).status).toBe(403);
    expect((await api.post("/api/plans", planInput(), tokens.teacher)).status).toBe(403);
    expect((await api.get("/api/plans", tokens.teacher)).status).toBe(403);
  });

  it("ikkinchi o'qituvchi bu o'quvchini ko'ra olmaydi → 403", async () => {
    const list = await api.get("/api/teacher/students", tokens.teacher2);
    expect(list.status).toBe(200);
    expect(list.body.students).toEqual([]);
    expect((await api.get(`/api/teacher/students/${ids.student}/plans`, tokens.teacher2)).status).toBe(403);
    expect((await api.get(`/api/plans/${ids.planA}`, tokens.teacher2)).status).toBe(403);
  });

  it("o'qituvchi: noto'g'ri id yoki o'quvchi bo'lmagan foydalanuvchi → 404", async () => {
    const bad = await api.get("/api/teacher/students/xyz/plans", tokens.teacher);
    expect(bad.status).toBe(404);
    expect(bad.body.message).toBe("Foydalanuvchi topilmadi.");
    expect((await api.get(`/api/teacher/students/${ids.admin}/plans`, tokens.teacher)).status).toBe(404);
    expect((await api.get(`/api/teacher/students/${MISSING_ID}/plans`, tokens.teacher)).status).toBe(404);
  });

  it("o'quvchi va o'qituvchi /api/admin/* ga kira olmaydi → 403", async () => {
    for (const token of [tokens.student, tokens.teacher]) {
      expect((await api.get("/api/admin/statistics", token)).status).toBe(403);
      expect((await api.get("/api/admin/users", token)).status).toBe(403);
      expect((await api.post("/api/admin/users", { fullName: "X", username: "xxx", password: "123456" }, token)).status).toBe(403);
      expect((await api.delete(`/api/admin/users/${ids.other}`, token)).status).toBe(403);
    }
    expect((await api.get("/api/teacher/students", tokens.student)).status).toBe(403);
    expect((await api.get("/api/teacher/students", tokens.admin)).status).toBe(403);
  });

  it("admin istalgan rejani ko'ra oladi, lekin o'zgartira olmaydi", async () => {
    expect((await api.get(`/api/plans/${ids.planA}`, tokens.admin)).status).toBe(200);
    expect((await api.patch(`/api/plans/${ids.planA}/topics/t4`, { completed: true }, tokens.admin)).status).toBe(403);
    expect((await api.get("/api/plans", tokens.admin)).status).toBe(403);
  });

  it("tokensiz yoki buzilgan token bilan himoyalangan manzillar → 401", async () => {
    for (const url of ["/api/plans", `/api/plans/${ids.planA}`, "/api/teacher/students", "/api/admin/statistics"]) {
      expect((await api.get(url)).status).toBe(401);
      expect((await api.get(url, "eyJhbGciOiJIUzI1NiJ9.buzilgan.token")).status).toBe(401);
    }
  });
});

describe("Admin paneli", () => {
  it("statistika: to'g'ri shakl va qiymatlar", async () => {
    const res = await api.get("/api/admin/statistics", tokens.admin);
    expect(res.status).toBe(200);
    const s = res.body;
    // Foydalanuvchilar: admin, teacher, teacher2, student, student2, other_student
    expect(s.users).toEqual({ total: 6, students: 3, teachers: 2, admins: 1 });
    // Rejalar: Ali (3/6 = 50%) va Madina (2/6 = 33%)
    expect(s.plans).toEqual({ total: 2, completed: 0, inProgress: 2 });
    expect(s.topics).toEqual({ total: 12, completed: 5 });
    expect(s.averageProgress).toBe(42); // round((50 + 33) / 2)
    expect(s.overallProgress).toBe(42); // round(5 / 12 * 100)
    expect(s.recentActivity).toHaveLength(14);
    expect(s.recentActivity.at(-1).date).toBe(dateKey(new Date(), config.timeZone));
    for (const day of s.recentActivity) {
      expect(Object.keys(day).sort()).toEqual(["completed", "date"]);
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(s.recentActivity.reduce((/** @type {number} */ sum, /** @type {any} */ d) => sum + d.completed, 0)).toBe(5);
  });

  it("foydalanuvchilar ro'yxati, rol bo'yicha filtr, o'quvchilarda teacherName", async () => {
    const res = await api.get("/api/admin/users", tokens.admin);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(6);
    const ali = res.body.users.find((/** @type {any} */ u) => u.username === "student");
    expect(ali).toMatchObject({ role: "student", teacherId: ids.teacher, teacherName: "Dilnoza Karimova" });
    const other = res.body.users.find((/** @type {any} */ u) => u.username === "other_student");
    expect(other.teacherName).toBeNull();

    const teachers = await api.get("/api/admin/users?role=teacher", tokens.admin);
    expect(teachers.status).toBe(200);
    expect(teachers.body.users.map((/** @type {any} */ u) => u.username).sort()).toEqual(["teacher", "teacher2"]);

    const bad = await api.get("/api/admin/users?role=hacker", tokens.admin);
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe(MSG.roleInvalid);
  });

  it("foydalanuvchi yaratish → 201 (o'qituvchi biriktirilgan holda)", async () => {
    const res = await api.post(
      "/api/admin/users",
      {
        fullName: "  Yangi  O'quvchi ",
        username: "New.Student_1",
        password: "parol123",
        role: "student",
        teacherId: ids.teacher,
      },
      tokens.admin
    );
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      fullName: "Yangi O'quvchi",
      username: "new.student_1",
      role: "student",
      teacherId: ids.teacher,
      teacherName: "Dilnoza Karimova",
    });
    ids.newStudent = res.body.user.id;
    expect(await login("new.student_1", "parol123")).toBeTruthy();
  });

  it("band foydalanuvchi nomi → 409", async () => {
    for (const username of ["student", "STUDENT"]) {
      const res = await api.post(
        "/api/admin/users",
        { fullName: "Dublikat", username, password: "parol123", role: "student" },
        tokens.admin
      );
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Bu foydalanuvchi nomi band.");
    }
  });

  it("validatsiya: rol, parol, foydalanuvchi nomi, ism, o'qituvchi", async () => {
    /** @param {Record<string, unknown>} overrides */
    const create = (overrides) =>
      api.post(
        "/api/admin/users",
        { fullName: "Test Foydalanuvchi", username: "valid_user", password: "parol123", role: "student", ...overrides },
        tokens.admin
      );

    const role = await create({ role: "superuser" });
    expect(role.status).toBe(400);
    expect(role.body.errors.role).toBe(MSG.roleInvalid);

    const short = await create({ password: "12345" });
    expect(short.status).toBe(400);
    expect(short.body.errors.password).toBe(MSG.passwordTooShort);

    const missingPassword = await create({ password: undefined });
    expect(missingPassword.body.errors.password).toBe(MSG.passwordRequired);

    for (const username of ["ab", "bad name", "salom!", "a".repeat(31), "ism<script>"]) {
      const res = await create({ username });
      expect(res.status).toBe(400);
      expect(res.body.errors.username).toBe(MSG.usernameInvalid);
    }

    const noName = await create({ fullName: "<b></b>" });
    expect(noName.status).toBe(400);
    expect(noName.body.errors.fullName).toBe(MSG.fullNameRequired);

    const missingTeacher = await create({ teacherId: MISSING_ID });
    expect(missingTeacher.status).toBe(400);
    expect(missingTeacher.body.errors.teacherId).toBe(MSG.teacherNotFound);

    const studentAsTeacher = await create({ teacherId: ids.student });
    expect(studentAsTeacher.status).toBe(400);
    expect(studentAsTeacher.body.errors.teacherId).toBe(MSG.teacherNotFound);

    const injection = await create({ username: { $gt: "" } });
    expect(injection.status).toBe(400);

    expect(await User.exists({ username: "valid_user" })).toBeNull();
  });

  it("rol va o'qituvchini yangilash", async () => {
    const assign = await api.patch(`/api/admin/users/${ids.newStudent}`, { teacherId: ids.teacher2 }, tokens.admin);
    expect(assign.status).toBe(200);
    expect(assign.body.user).toMatchObject({ teacherId: ids.teacher2, teacherName: "Ikkinchi O'qituvchi" });

    const t2students = await api.get("/api/teacher/students", tokens.teacher2);
    expect(t2students.body.students.map((/** @type {any} */ s) => s.id)).toEqual([ids.newStudent]);

    const unassign = await api.patch(`/api/admin/users/${ids.newStudent}`, { teacherId: null }, tokens.admin);
    expect(unassign.body.user.teacherId).toBeNull();

    const reassign = await api.patch(`/api/admin/users/${ids.newStudent}`, { teacherId: ids.teacher2 }, tokens.admin);
    expect(reassign.body.user.teacherId).toBe(ids.teacher2);

    const promote = await api.patch(`/api/admin/users/${ids.newStudent}`, { role: "teacher" }, tokens.admin);
    expect(promote.status).toBe(200);
    expect(promote.body.user).toMatchObject({ role: "teacher", teacherId: null });
    expect(promote.body.user).not.toHaveProperty("teacherName");

    const demote = await api.patch(
      `/api/admin/users/${ids.newStudent}`,
      { role: "student", teacherId: ids.teacher },
      tokens.admin
    );
    expect(demote.body.user).toMatchObject({ role: "student", teacherId: ids.teacher });

    const selfTeacher = await api.patch(`/api/admin/users/${ids.teacher2}`, { role: "student", teacherId: ids.teacher2 }, tokens.admin);
    expect(selfTeacher.status).toBe(400);
    expect(selfTeacher.body.errors.teacherId).toBe(MSG.teacherSelf);

    const badRole = await api.patch(`/api/admin/users/${ids.newStudent}`, { role: "boss" }, tokens.admin);
    expect(badRole.status).toBe(400);
  });

  it("o'qituvchi boshqa rolga o'tkazilsa, uning o'quvchilari biriktirilmagan bo'ladi", async () => {
    await api.patch(`/api/admin/users/${ids.other}`, { teacherId: ids.teacher2 }, tokens.admin);
    const res = await api.patch(`/api/admin/users/${ids.teacher2}`, { role: "admin" }, tokens.admin);
    expect(res.status).toBe(200);
    const other = await User.findById(ids.other).lean();
    expect(other?.teacherId).toBeNull();
    // Rol o'zgarishi darhol kuchga kiradi (eski token bilan ham).
    expect((await api.get("/api/teacher/students", tokens.teacher2)).status).toBe(403);
    expect((await api.get("/api/admin/statistics", tokens.teacher2)).status).toBe(200);
    // Qaytarish
    expect((await api.patch(`/api/admin/users/${ids.teacher2}`, { role: "teacher" }, tokens.admin)).status).toBe(200);
  });

  it("ism va parolni yangilash", async () => {
    const res = await api.patch(
      `/api/admin/users/${ids.other}`,
      { fullName: "<b>Yangilangan</b> Ism", password: "yangiParol1" },
      tokens.admin
    );
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe("Yangilangan Ism");
    expect((await api.post("/api/auth/login", { username: "other_student", password: "secret12" })).status).toBe(401);
    expect(await login("other_student", "yangiParol1")).toBeTruthy();

    const short = await api.patch(`/api/admin/users/${ids.other}`, { password: "123" }, tokens.admin);
    expect(short.status).toBe(400);
    const empty = await api.patch(`/api/admin/users/${ids.other}`, { username: "ignored" }, tokens.admin);
    expect(empty.status).toBe(400);
    expect(empty.body.message).toBe(MSG.nothingToUpdate);
  });

  it("admin o'z rolini o'zgartira va o'zini o'chira olmaydi", async () => {
    const role = await api.patch(`/api/admin/users/${ids.admin}`, { role: "student" }, tokens.admin);
    expect(role.status).toBe(400);
    expect(role.body.message).toBe(MSG.cannotChangeOwnRole);

    const name = await api.patch(`/api/admin/users/${ids.admin}`, { fullName: "Bosh Administrator", role: "admin" }, tokens.admin);
    expect(name.status).toBe(200);
    expect(name.body.user).toMatchObject({ fullName: "Bosh Administrator", role: "admin" });

    const del = await api.delete(`/api/admin/users/${ids.admin}`, tokens.admin);
    expect(del.status).toBe(400);
    expect(del.body.message).toBe("O'zingizni o'chira olmaysiz.");
  });

  it("noto'g'ri yoki mavjud bo'lmagan id → 404", async () => {
    for (const id of ["abc", "123", MISSING_ID]) {
      const patch = await api.patch(`/api/admin/users/${id}`, { fullName: "X Y" }, tokens.admin);
      expect(patch.status).toBe(404);
      expect(patch.body.message).toBe("Foydalanuvchi topilmadi.");
      expect((await api.delete(`/api/admin/users/${id}`, tokens.admin)).status).toBe(404);
    }
  });

  it("foydalanuvchini o'chirish uning rejalarini ham o'chiradi; tokeni yaroqsiz bo'ladi", async () => {
    const created = await api.post(
      "/api/admin/users",
      { fullName: "Vaqtinchalik O'quvchi", username: "temp_student", password: "parol123", role: "student" },
      tokens.admin
    );
    expect(created.status).toBe(201);
    const tempId = created.body.user.id;
    const tempToken = await login("temp_student", "parol123");
    expect((await api.post("/api/plans", planInput(), tempToken)).status).toBe(201);
    expect((await api.post("/api/plans", planInput({ daysCount: 6 }), tempToken)).status).toBe(201);
    expect(await StudyPlan.countDocuments({ userId: tempId })).toBe(2);

    const res = await api.delete(`/api/admin/users/${tempId}`, tokens.admin);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Foydalanuvchi o'chirildi." });
    expect(await StudyPlan.countDocuments({ userId: tempId })).toBe(0);
    expect(await User.exists({ _id: tempId })).toBeNull();

    const me = await api.get("/api/auth/me", tempToken);
    expect(me.status).toBe(401);
    expect(me.body.message).toBe(MSG.sessionExpired);
  });

  it("o'qituvchi o'chirilsa, uning o'quvchilari biriktirilmagan bo'ladi", async () => {
    await api.patch(`/api/admin/users/${ids.other}`, { teacherId: ids.teacher2 }, tokens.admin);
    const res = await api.delete(`/api/admin/users/${ids.teacher2}`, tokens.admin);
    expect(res.status).toBe(200);
    const other = await api.get("/api/admin/users?role=student", tokens.admin);
    const row = other.body.users.find((/** @type {any} */ u) => u.id === ids.other);
    expect(row).toMatchObject({ teacherId: null, teacherName: null });
  });
});

describe("Frontendni berish (client/dist)", () => {
  /** @type {string} */
  let distDir;

  beforeAll(() => {
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), "ssp-dist-"));
    fs.mkdirSync(path.join(distDir, "assets"));
    fs.writeFileSync(
      path.join(distDir, "index.html"),
      '<!doctype html><html><head><script>document.documentElement.classList.add("dark")</script>' +
        '<script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>'
    );
    fs.writeFileSync(path.join(distDir, "assets", "app.js"), "console.log('ok');");
  });

  afterAll(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it("statik fayllar, SPA fallback va CSP (inline skript xeshi bilan)", async () => {
    const spa = createApp({ serveClient: true, clientDistDir: distDir });

    const root = await request(spa).get("/");
    expect(root.status).toBe(200);
    expect(root.headers["content-type"]).toContain("text/html");
    expect(root.text).toContain('<div id="root">');
    expect(root.headers["content-security-policy"]).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(root.headers["content-security-policy"]).toContain("style-src 'self' 'unsafe-inline'");
    expect(root.headers["content-security-policy"]).toContain("img-src 'self' data:");

    const deep = await request(spa).get("/plans/123");
    expect(deep.status).toBe(200);
    expect(deep.text).toContain('<div id="root">');

    const asset = await request(spa).get("/assets/app.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toContain("immutable");

    expect((await request(spa).get("/assets/yoq.js")).status).toBe(404);
    const apiMissing = await request(spa).get("/api/yoq");
    expect(apiMissing.status).toBe(404);
    expect(apiMissing.body.message).toBe(MSG.routeNotFound);
    expect((await request(spa).get("/api/health")).body).toEqual({ status: "ok" });
  });

  it("SERVE_CLIENT=false (serveClient: false) bo'lsa frontend berilmaydi", async () => {
    const apiOnly = createApp({ serveClient: false, clientDistDir: distDir });
    expect((await request(apiOnly).get("/")).status).toBe(404);
  });
});

describe("Maxfiy ma'lumotlar sizib chiqmaydi", () => {
  it("hech bir javobda passwordHash, bcrypt xeshi, _id yoki __v yo'q", () => {
    expect(responseBodies.length).toBeGreaterThan(100);
    for (const text of responseBodies) {
      expect(text).not.toContain("passwordHash");
      expect(text).not.toMatch(/\$2[aby]\$\d{2}\$/);
      expect(text).not.toContain('"_id"');
      expect(text).not.toContain('"__v"');
    }
  });
});
