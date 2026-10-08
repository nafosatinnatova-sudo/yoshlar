// Asosiy algoritm testlari (shared/planner.js) — TZ §9 dagi 12 ta majburiy test + xossa testlari.

import { describe, expect, it } from "vitest";
import {
  MESSAGES,
  REVIEW_DAY_LABEL,
  TOPIC_COUNT,
  addDays,
  computeProgress,
  distributeTopics,
  percentOf,
  sanitizeText,
  validatePlanInput,
} from "../../shared/planner.js";

const TOPICS = ["Mavzu 1", "Mavzu 2", "Mavzu 3", "Mavzu 4", "Mavzu 5", "Mavzu 6"];
const START = "2026-10-10";
const TOPIC_IDS = ["t1", "t2", "t3", "t4", "t5", "t6"];

/** @param {Record<string, unknown>} [overrides] */
function input(overrides = {}) {
  return {
    title: "Matematika imtihoni",
    subject: "Matematika",
    daysCount: 3,
    dailyMinutes: 60,
    startDate: START,
    topics: TOPICS,
    ...overrides,
  };
}

/** Kiritishni tekshirib, taqsimotni qaytaradi (UI va API qiladigan ish bilan bir xil). */
function plan(daysCount, dailyMinutes) {
  const result = validatePlanInput(input({ daysCount, dailyMinutes }));
  expect(result.valid).toBe(true);
  return distributeTopics(/** @type {any} */ (result.value));
}

/** @param {Array<{ topics: unknown[] }>} days */
const topicCounts = (days) => days.map((d) => d.topics.length);
/** @param {{ topics: Array<{ minutes: number }> }} day */
const dayMinutes = (day) => day.topics.map((t) => t.minutes);
/** @param {number[]} values */
const sum = (values) => values.reduce((a, b) => a + b, 0);

/**
 * Birinchi `n` ta mavzuni bajarilgan deb belgilaydi (UI dagi checkbox bosish kabi).
 * @param {any[]} days
 * @param {number} n
 */
function markCompleted(days, n) {
  let left = n;
  return days.map((day) => ({
    ...day,
    topics: day.topics.map((/** @type {any} */ t) =>
      left-- > 0 ? { ...t, completed: true, completedAt: "2026-10-10T08:00:00.000Z" } : t
    ),
  }));
}

describe("Hakamlar uchun majburiy testlar (TZ §9)", () => {
  it("Test 1: 6 mavzu, 3 kun, 60 daqiqa → 2+2+2 mavzu (har biri 30 daqiqa)", () => {
    const { days, endDate } = plan(3, 60);
    expect(topicCounts(days)).toEqual([2, 2, 2]);
    expect(days.map(dayMinutes)).toEqual([
      [30, 30],
      [30, 30],
      [30, 30],
    ]);
    expect(days.map((d) => d.topics.map((t) => t.title))).toEqual([
      ["Mavzu 1", "Mavzu 2"],
      ["Mavzu 3", "Mavzu 4"],
      ["Mavzu 5", "Mavzu 6"],
    ]);
    expect(days.every((d) => d.totalMinutes === 60 && d.type === "study")).toBe(true);
    expect(endDate).toBe("2026-10-12");
  });

  it("Test 2: 6 mavzu, 2 kun, 60 daqiqa → 3+3 mavzu", () => {
    const { days } = plan(2, 60);
    expect(topicCounts(days)).toEqual([3, 3]);
    expect(days.map(dayMinutes)).toEqual([
      [20, 20, 20],
      [20, 20, 20],
    ]);
  });

  it("Test 3: 6 mavzu, 4 kun, 60 daqiqa → 2+2+1+1 mavzu", () => {
    const { days } = plan(4, 60);
    expect(topicCounts(days)).toEqual([2, 2, 1, 1]);
    expect(days.map(dayMinutes)).toEqual([[30, 30], [30, 30], [60], [60]]);
  });

  it("Test 4: 6 mavzu, 0 kun → xatolik ko'rsatadi", () => {
    const result = validatePlanInput(input({ daysCount: 0 }));
    expect(result.valid).toBe(false);
    expect(result.value).toBeNull();
    expect(result.errors.daysCount).toBe("Kunlar soni kamida 1 bo'lishi kerak.");
    expect(() => distributeTopics({ topics: TOPICS, daysCount: 0, dailyMinutes: 60 })).toThrow(MESSAGES.daysMin);
  });

  it("Test 5: 6 mavzu, 3 kun, 0 daqiqa → xatolik ko'rsatadi", () => {
    const result = validatePlanInput(input({ dailyMinutes: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.dailyMinutes).toBe("Kunlik vaqtni to'g'ri kiriting.");
    expect(() => distributeTopics({ topics: TOPICS, daysCount: 3, dailyMinutes: 0 })).toThrow(MESSAGES.minutesMin);
  });

  it("Test 6: 6 mavzudan 3 tasi bajarildi → 50%", () => {
    const { days } = plan(3, 60);
    expect(computeProgress(markCompleted(days, 3))).toEqual({ total: 6, completed: 3, percent: 50 });
  });

  it("Test 7: 6 mavzudan 6 tasi bajarildi → 100%", () => {
    const { days } = plan(3, 60);
    expect(computeProgress(markCompleted(days, 6))).toEqual({ total: 6, completed: 6, percent: 100 });
  });

  it("Test 8: 6 mavzudan 0 tasi bajarildi → 0%", () => {
    const { days } = plan(3, 60);
    expect(computeProgress(days)).toEqual({ total: 6, completed: 0, percent: 0 });
  });

  it("Test 9: rejani saqlash va qayta ochish → ma'lumotlar saqlanadi (JSON orqali saqlash/qayta o'qish)", () => {
    const original = plan(3, 60);
    const saved = { ...original, days: markCompleted(original.days, 3) };
    const reopened = JSON.parse(JSON.stringify(saved));
    expect(reopened).toEqual(saved);
    expect(computeProgress(reopened.days)).toEqual({ total: 6, completed: 3, percent: 50 });
    expect(reopened.days.flatMap((/** @type {any} */ d) => d.topics.map((/** @type {any} */ t) => t.completed))).toEqual(
      [true, true, true, false, false, false]
    );
  });

  it("Test 10: 6 mavzu, 8 kun → 6 kun mavzu, 2 kun takrorlash", () => {
    const { days, endDate } = plan(8, 60);
    expect(days).toHaveLength(8);
    expect(days.map((d) => d.type)).toEqual(["study", "study", "study", "study", "study", "study", "review", "review"]);
    expect(topicCounts(days)).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
    expect(endDate).toBe("2026-10-17");
    // Takrorlash kunlari foizga ta'sir qilmaydi.
    expect(computeProgress(markCompleted(days, 6))).toEqual({ total: 6, completed: 6, percent: 100 });
    expect(REVIEW_DAY_LABEL).toBe("Takrorlash / dam olish");
  });

  it("Test 11: 6 mavzu, 3 kun, 61 daqiqa → kuniga 31+30 daqiqa", () => {
    const { days } = plan(3, 61);
    expect(days.map(dayMinutes)).toEqual([
      [31, 30],
      [31, 30],
      [31, 30],
    ]);
    expect(days.every((d) => sum(dayMinutes(d)) === 61)).toBe(true);
  });

  it("Test 12: 6 mavzu, 3 kun, 1 daqiqa → \"Vaqt yetarli emas\" xatoligi", () => {
    const result = validatePlanInput(input({ dailyMinutes: 1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.dailyMinutes).toContain("Vaqt yetarli emas");
    expect(result.errors.dailyMinutes).toBe(MESSAGES.notEnoughTime(2));
    expect(() => distributeTopics({ topics: TOPICS, daysCount: 3, dailyMinutes: 1 })).toThrow(/Vaqt yetarli emas/);
    // Chegaraviy holat: 2 daqiqa yetarli (har mavzuga 1 daqiqa).
    expect(validatePlanInput(input({ dailyMinutes: 2 })).valid).toBe(true);
  });
});

describe("Taqsimlash algoritmi xossalari (D = 1..30, T ∈ {6, 7, 60, 61, 119})", () => {
  const cases = [];
  for (let D = 1; D <= 30; D++) for (const T of [6, 7, 60, 61, 119]) cases.push([D, T]);

  it.each(cases)("D=%i, T=%i: har bir mavzu aynan bir marta, tartib bilan; vaqt to'g'ri bo'lingan", (D, T) => {
    const { days, endDate, totalTopics } = distributeTopics({
      topics: TOPICS,
      daysCount: D,
      dailyMinutes: T,
      startDate: START,
    });

    expect(days).toHaveLength(D);
    expect(totalTopics).toBe(TOPIC_COUNT);
    expect(endDate).toBe(addDays(START, D - 1));

    // Hech bir mavzu yo'qolmaydi yoki takrorlanmaydi, tartib saqlanadi.
    const flat = days.flatMap((d) => d.topics);
    expect(flat.map((t) => t.topicId)).toEqual(TOPIC_IDS);
    expect(flat.map((t) => t.title)).toEqual(TOPICS);
    expect(new Set(flat.map((t) => t.topicId)).size).toBe(TOPIC_COUNT);

    const base = Math.floor(TOPIC_COUNT / D);
    const remainder = TOPIC_COUNT % D;
    days.forEach((day, i) => {
      expect(day.dayNumber).toBe(i + 1);
      expect(day.date).toBe(addDays(START, i));
      expect(day.totalMinutes).toBe(T);

      // Mavzular soni: base, birinchi `remainder` kunga +1.
      const expectedCount = base + (i < remainder ? 1 : 0);
      expect(day.topics).toHaveLength(expectedCount);

      if (expectedCount === 0) {
        expect(day.type).toBe("review");
        return;
      }
      expect(day.type).toBe("study");

      const minutes = dayMinutes(day);
      expect(sum(minutes)).toBe(T); // kunlik vaqt to'liq taqsimlanadi
      expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(1); // teng bo'linadi
      expect(minutes.every((m) => Number.isInteger(m) && m >= 1)).toBe(true);
      for (let k = 1; k < minutes.length; k++) expect(minutes[k]).toBeLessThanOrEqual(minutes[k - 1]); // ortiqcha daqiqalar birinchilarga
      expect(day.topics.every((t) => t.completed === false && t.completedAt === null)).toBe(true);
    });

    // Kunlardagi mavzular soni bir-biridan ko'pi bilan 1 ga farq qiladi.
    const studyCounts = topicCounts(days).filter((c) => c > 0);
    expect(Math.max(...studyCounts) - Math.min(...studyCounts)).toBeLessThanOrEqual(1);
    expect(computeProgress(days)).toEqual({ total: 6, completed: 0, percent: 0 });
  });
});

describe("Kiritishni tekshirish (validatsiya)", () => {
  it.each([["abc"], ["3a"], ["2.5"], [2.5], ["2,5"], ["1e3"], ["0x10"], [true], [[3]], [{}]])(
    "kunlar soni %j → butun son emas xatosi",
    (value) => {
      const result = validatePlanInput(input({ daysCount: value }));
      expect(result.valid).toBe(false);
      expect(result.errors.daysCount).toBe(MESSAGES.daysNotInteger);
    }
  );

  it.each([["abc"], ["60m"], ["30.5"], [30.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    "kunlik vaqt %j → butun son emas xatosi",
    (value) => {
      const result = validatePlanInput(input({ dailyMinutes: value }));
      expect(result.valid).toBe(false);
      expect(result.errors.dailyMinutes).toBe(MESSAGES.minutesNotInteger);
    }
  );

  it.each([[-1], ["-3"], [0], ["0"]])("kunlar soni %j → kamida 1 xatosi", (value) => {
    expect(validatePlanInput(input({ daysCount: value })).errors.daysCount).toBe(MESSAGES.daysMin);
  });

  it.each([[-5], ["-60"], [0]])("kunlik vaqt %j → to'g'ri kiriting xatosi", (value) => {
    expect(validatePlanInput(input({ dailyMinutes: value })).errors.dailyMinutes).toBe(MESSAGES.minutesMin);
  });

  it.each([[""], ["   "], [null], [undefined]])("bo'sh qiymatlar %j → 'kiriting' xatolari", (value) => {
    const result = validatePlanInput(input({ daysCount: value, dailyMinutes: value }));
    expect(result.errors.daysCount).toBe(MESSAGES.daysRequired);
    expect(result.errors.dailyMinutes).toBe(MESSAGES.minutesRequired);
  });

  it("chegaradan katta qiymatlar rad etiladi", () => {
    expect(validatePlanInput(input({ daysCount: 366 })).errors.daysCount).toBe(MESSAGES.daysMax);
    expect(validatePlanInput(input({ dailyMinutes: 1441 })).errors.dailyMinutes).toBe(MESSAGES.minutesMax);
  });

  it("satr ko'rinishidagi butun sonlar qabul qilinadi", () => {
    const result = validatePlanInput(input({ daysCount: " 3 ", dailyMinutes: "60" }));
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({ daysCount: 3, dailyMinutes: 60 });
  });

  it("bo'sh mavzu → 'Barcha 6 ta mavzuni kiriting.' va aynan o'sha maydon belgilanadi", () => {
    const topics = [...TOPICS];
    topics[2] = "   ";
    const result = validatePlanInput(input({ topics }));
    expect(result.valid).toBe(false);
    expect(result.errors.topics).toBe("Barcha 6 ta mavzuni kiriting.");
    expect(result.topicErrors).toEqual([null, null, MESSAGES.topicsRequired, null, null, null]);
  });

  it("5 ta mavzu, mavzular yo'q yoki faqat HTML teglardan iborat mavzu rad etiladi", () => {
    expect(validatePlanInput(input({ topics: TOPICS.slice(0, 5) })).errors.topics).toBe(MESSAGES.topicsRequired);
    expect(validatePlanInput(input({ topics: undefined })).errors.topics).toBe(MESSAGES.topicsRequired);
    expect(validatePlanInput(input({ topics: "Mavzu 1" })).errors.topics).toBe(MESSAGES.topicsRequired);
    const tagsOnly = [...TOPICS];
    tagsOnly[0] = "<b></b>";
    expect(validatePlanInput(input({ topics: tagsOnly })).errors.topics).toBe(MESSAGES.topicsRequired);
  });

  it("reja nomi, fan nomi va boshlanish sanasi majburiy", () => {
    const result = validatePlanInput(input({ title: "", subject: " ", startDate: "2026-02-30" }));
    expect(result.errors.title).toBe(MESSAGES.titleRequired);
    expect(result.errors.subject).toBe(MESSAGES.subjectRequired);
    expect(result.errors.startDate).toBe(MESSAGES.startDateInvalid);
  });

  it("xato bo'lsa `value` null (reja yaratilmaydi)", () => {
    const result = validatePlanInput(input({ daysCount: 0, dailyMinutes: 0 }));
    expect(result.valid).toBe(false);
    expect(result.value).toBeNull();
  });
});

describe("sanitizeText va percentOf", () => {
  it("HTML teglarni olib tashlaydi va bo'shliqlarni normallashtiradi", () => {
    expect(sanitizeText("<b>Algebra</b>")).toBe("Algebra");
    expect(sanitizeText("<script>alert(1)</script>Geometriya")).toBe("alert(1)Geometriya");
    expect(sanitizeText('<img src=x onerror="alert(1)">Fizika')).toBe("Fizika");
    expect(sanitizeText("  Kvadrat \n\t tenglamalar  ")).toBe("Kvadrat tenglamalar");
    expect(sanitizeText(42)).toBe("");
    expect(sanitizeText(null)).toBe("");
  });

  it("validatsiya natijasidagi matnlar tozalangan bo'ladi", () => {
    const topics = [...TOPICS];
    topics[0] = "<i>Logarifmlar</i>";
    const result = validatePlanInput(input({ title: "<h1>Reja</h1>", topics }));
    expect(result.value?.title).toBe("Reja");
    expect(result.value?.topics[0]).toBe("Logarifmlar");
  });

  it("foiz butun songa yaxlitlanadi, jami 0 bo'lsa 0%", () => {
    expect(percentOf(1, 6)).toBe(17);
    expect(percentOf(2, 6)).toBe(33);
    expect(percentOf(5, 6)).toBe(83);
    expect(percentOf(0, 0)).toBe(0);
    expect(computeProgress([])).toEqual({ total: 0, completed: 0, percent: 0 });
  });
});
