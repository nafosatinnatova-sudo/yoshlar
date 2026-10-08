// Smart Study Planner — umumiy (frontend + backend) algoritm moduli.
// Bu fayl ikkala tomonda ham bir xil import qilinadi, shuning uchun
// taqsimlash va foiz hisobi frontend va backendda aynan bir xil ishlaydi.
// Faqat sof funksiyalar: DOM, Node yoki tashqi kutubxonalarga bog'liq emas.

/** Har bir rejadagi mavzular soni (TZ bo'yicha aynan 6 ta). */
export const TOPIC_COUNT = 6;

export const LIMITS = Object.freeze({
  minDays: 1,
  maxDays: 365,
  minDailyMinutes: 1,
  maxDailyMinutes: 1440,
  maxTitleLength: 100,
  maxSubjectLength: 100,
  maxTopicLength: 120,
});

export const REVIEW_DAY_LABEL = "Takrorlash / dam olish";

export const MESSAGES = Object.freeze({
  titleRequired: "Reja nomini kiriting.",
  titleTooLong: `Reja nomi ${LIMITS.maxTitleLength} belgidan oshmasligi kerak.`,
  subjectRequired: "Imtihon yoki fan nomini kiriting.",
  subjectTooLong: `Fan nomi ${LIMITS.maxSubjectLength} belgidan oshmasligi kerak.`,
  daysRequired: "Kunlar sonini kiriting.",
  daysNotInteger: "Kunlar soni butun son bo'lishi kerak (harf yoki kasr son kiritmang).",
  daysMin: "Kunlar soni kamida 1 bo'lishi kerak.",
  daysMax: `Kunlar soni ${LIMITS.maxDays} dan oshmasligi kerak.`,
  minutesRequired: "Kunlik vaqtni kiriting.",
  minutesNotInteger: "Kunlik vaqt butun son (daqiqa) bo'lishi kerak (harf yoki kasr son kiritmang).",
  minutesMin: "Kunlik vaqtni to'g'ri kiriting.",
  minutesMax: `Kunlik vaqt ${LIMITS.maxDailyMinutes} daqiqadan (24 soat) oshmasligi kerak.`,
  topicsRequired: `Barcha ${TOPIC_COUNT} ta mavzuni kiriting.`,
  topicTooLong: `Mavzu nomi ${LIMITS.maxTopicLength} belgidan oshmasligi kerak.`,
  startDateInvalid: "Boshlanish sanasini to'g'ri tanlang.",
  /** @param {number} needed */
  notEnoughTime: (needed) =>
    `Vaqt yetarli emas: har bir mavzuga kamida 1 daqiqa ajratish uchun kunlik vaqt kamida ${needed} daqiqa bo'lishi kerak. Iltimos, kunlik vaqtni oshiring.`,
});

const INTEGER_RE = /^[+-]?\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Sonli maydonni qat'iy tahlil qiladi.
 * Faqat butun sonlar (number yoki "12" kabi satr) qabul qilinadi;
 * "2.5", "abc", "1e3", "" — rad etiladi.
 * @param {unknown} value
 * @returns {{ ok: true, value: number } | { ok: false, reason: "empty" | "notInteger" }}
 */
export function parseIntegerField(value) {
  if (value === null || value === undefined) return { ok: false, reason: "empty" };
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return { ok: false, reason: "notInteger" };
    return { ok: true, value };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return { ok: false, reason: "empty" };
    if (!INTEGER_RE.test(trimmed)) return { ok: false, reason: "notInteger" };
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) return { ok: false, reason: "notInteger" };
    return { ok: true, value: parsed };
  }
  return { ok: false, reason: "notInteger" };
}

/**
 * "YYYY-MM-DD" ko'rinishidagi haqiqiy sanami?
 * @param {unknown} value
 */
export function isValidDateString(value) {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * "YYYY-MM-DD" sanaga n kun qo'shadi (UTC, vaqt zonasi siljishisiz).
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Matnni tozalaydi: HTML teglar va boshqaruv belgilarini olib tashlaydi,
 * ortiqcha bo'shliqlarni bittaga qisqartiradi.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bir kundagi maksimal mavzular soni: ceil(N / D), lekin kamida 1.
 * @param {number} topicCount
 * @param {number} daysCount
 */
export function maxTopicsPerDay(topicCount, daysCount) {
  if (daysCount <= 0) return topicCount;
  return Math.max(1, Math.ceil(topicCount / daysCount));
}

/**
 * Reja kiritish ma'lumotlarini tekshiradi. Frontend va backend aynan shu funksiyadan foydalanadi.
 * Xatolar maydon nomi bo'yicha qaytariladi: title, subject, daysCount, dailyMinutes, topics, startDate.
 * Mavzular uchun alohida xatolar `topicErrors` massivida (indeks bo'yicha) ham beriladi.
 *
 * @param {{ title?: unknown, subject?: unknown, daysCount?: unknown, dailyMinutes?: unknown, topics?: unknown, startDate?: unknown }} input
 * @param {{ requireMeta?: boolean }} [options] requireMeta=false bo'lsa title/subject/startDate tekshirilmaydi
 *   (masalan, faqat algoritmni sinash uchun). Standart: true.
 */
export function validatePlanInput(input, options = {}) {
  const requireMeta = options.requireMeta !== false;
  const src = input && typeof input === "object" ? input : {};
  /** @type {Record<string, string>} */
  const errors = {};
  /** @type {(string | null)[]} */
  const topicErrors = [];

  const title = sanitizeText(src.title);
  const subject = sanitizeText(src.subject);
  if (requireMeta) {
    if (!title) errors.title = MESSAGES.titleRequired;
    else if (title.length > LIMITS.maxTitleLength) errors.title = MESSAGES.titleTooLong;
    if (!subject) errors.subject = MESSAGES.subjectRequired;
    else if (subject.length > LIMITS.maxSubjectLength) errors.subject = MESSAGES.subjectTooLong;
  }

  let daysCount = NaN;
  const days = parseIntegerField(src.daysCount);
  if (!days.ok) errors.daysCount = days.reason === "empty" ? MESSAGES.daysRequired : MESSAGES.daysNotInteger;
  else if (days.value < LIMITS.minDays) errors.daysCount = MESSAGES.daysMin;
  else if (days.value > LIMITS.maxDays) errors.daysCount = MESSAGES.daysMax;
  else daysCount = days.value;

  let dailyMinutes = NaN;
  const minutes = parseIntegerField(src.dailyMinutes);
  if (!minutes.ok) errors.dailyMinutes = minutes.reason === "empty" ? MESSAGES.minutesRequired : MESSAGES.minutesNotInteger;
  else if (minutes.value < LIMITS.minDailyMinutes) errors.dailyMinutes = MESSAGES.minutesMin;
  else if (minutes.value > LIMITS.maxDailyMinutes) errors.dailyMinutes = MESSAGES.minutesMax;
  else dailyMinutes = minutes.value;

  /** @type {string[]} */
  const topics = [];
  const rawTopics = Array.isArray(src.topics) ? src.topics : [];
  let topicsMissing = !Array.isArray(src.topics) || rawTopics.length !== TOPIC_COUNT;
  for (let i = 0; i < TOPIC_COUNT; i++) {
    const t = sanitizeText(rawTopics[i]);
    topics.push(t);
    if (!t) {
      topicErrors[i] = MESSAGES.topicsRequired;
      topicsMissing = true;
    } else if (t.length > LIMITS.maxTopicLength) {
      topicErrors[i] = MESSAGES.topicTooLong;
      if (!errors.topics) errors.topics = MESSAGES.topicTooLong;
    } else {
      topicErrors[i] = null;
    }
  }
  if (topicsMissing) errors.topics = MESSAGES.topicsRequired;

  let startDate = typeof src.startDate === "string" ? src.startDate.trim() : "";
  if (requireMeta) {
    if (!isValidDateString(startDate)) errors.startDate = MESSAGES.startDateInvalid;
  } else if (!isValidDateString(startDate)) {
    startDate = "";
  }

  // Har bir mavzuga kamida 1 daqiqa ajratish imkoniyati (faqat kunlar va vaqt to'g'ri bo'lsa).
  if (!errors.daysCount && !errors.dailyMinutes) {
    const needed = maxTopicsPerDay(TOPIC_COUNT, daysCount);
    if (dailyMinutes < needed) errors.dailyMinutes = MESSAGES.notEnoughTime(needed);
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    topicErrors,
    value: valid ? { title, subject, daysCount, dailyMinutes, topics, startDate } : null,
  };
}

/**
 * Mavzularni kunlarga imkon qadar teng taqsimlaydi.
 *   base = floor(N / D), remainder = N % D
 *   Har bir kunga base ta, birinchi remainder ta kunga +1 mavzu.
 *   Kun ichida vaqt teng bo'linadi; ortib qolgan daqiqalar birinchi mavzularga +1 dan qo'shiladi.
 *   D > N bo'lsa, ortiqcha kunlar "Takrorlash / dam olish" (type: "review") bo'ladi.
 *
 * Kirish qiymatlari oldindan validatePlanInput orqali tekshirilgan bo'lishi kerak.
 *
 * @param {{ topics: string[], daysCount: number, dailyMinutes: number, startDate?: string }} params
 * @returns {{ days: Array<{ dayNumber: number, date: string | null, type: "study" | "review", totalMinutes: number, topics: Array<{ topicId: string, title: string, minutes: number, completed: boolean, completedAt: string | null }> }>, endDate: string | null, totalTopics: number }}
 */
export function distributeTopics({ topics, daysCount, dailyMinutes, startDate }) {
  if (!Array.isArray(topics) || topics.length === 0) throw new Error("Mavzular ro'yxati bo'sh.");
  if (!Number.isInteger(daysCount) || daysCount < 1) throw new Error(MESSAGES.daysMin);
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < 1) throw new Error(MESSAGES.minutesMin);

  const N = topics.length;
  const needed = maxTopicsPerDay(N, daysCount);
  if (dailyMinutes < needed) throw new Error(MESSAGES.notEnoughTime(needed));

  const hasDate = typeof startDate === "string" && isValidDateString(startDate);
  const base = Math.floor(N / daysCount);
  const remainder = N % daysCount;

  const days = [];
  let cursor = 0;
  for (let d = 0; d < daysCount; d++) {
    const count = base + (d < remainder ? 1 : 0);
    const dayTopics = [];
    if (count > 0) {
      const each = Math.floor(dailyMinutes / count);
      const extra = dailyMinutes % count;
      for (let k = 0; k < count; k++) {
        const index = cursor + k;
        dayTopics.push({
          topicId: `t${index + 1}`,
          title: topics[index],
          minutes: each + (k < extra ? 1 : 0),
          completed: false,
          completedAt: null,
        });
      }
      cursor += count;
    }
    days.push({
      dayNumber: d + 1,
      date: hasDate ? addDays(/** @type {string} */ (startDate), d) : null,
      type: count > 0 ? "study" : "review",
      totalMinutes: dailyMinutes,
      topics: dayTopics,
    });
  }

  return {
    days,
    endDate: hasDate ? addDays(/** @type {string} */ (startDate), daysCount - 1) : null,
    totalTopics: N,
  };
}

/**
 * Bajarilish foizi: bajarilgan / jami * 100 (butun songa yaxlitlangan).
 * Takrorlash kunlarida mavzu yo'q, shuning uchun ular foizga ta'sir qilmaydi.
 * @param {Array<{ topics?: Array<{ completed?: boolean }> }>} days
 * @returns {{ total: number, completed: number, percent: number }}
 */
export function computeProgress(days) {
  let total = 0;
  let completed = 0;
  for (const day of Array.isArray(days) ? days : []) {
    for (const topic of Array.isArray(day?.topics) ? day.topics : []) {
      total += 1;
      if (topic?.completed === true) completed += 1;
    }
  }
  return { total, completed, percent: percentOf(completed, total) };
}

/**
 * @param {number} completed
 * @param {number} total
 */
export function percentOf(completed, total) {
  if (!total || total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
