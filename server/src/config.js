// Muhit o'zgaruvchilarini (server/.env) o'qish va tekshirish.
// Konfiguratsiya bir marta, modul yuklanganda hisoblanadi; process.env dagi
// qiymatlar .env faylidagilardan ustun turadi (dotenv ularni qayta yozmaydi).

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** server/ papkasining mutlaq yo'li. */
export const SERVER_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(SERVER_ROOT, ".env") });

/** .env.example dagi namunaviy qiymat — production'da qabul qilinmaydi. */
const PLACEHOLDER_SECRET = "change_me_to_a_long_random_string";
const DEFAULT_TIMEZONE = "Asia/Tashkent";

const env = process.env;

/** @param {string | undefined} value */
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {string | undefined} value
 * @param {boolean} fallback
 */
function parseBool(value, fallback) {
  const v = clean(value).toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return fallback;
}

/**
 * @param {string | undefined} value
 * @param {number} fallback
 */
function parsePort(value, fallback) {
  const v = clean(value);
  if (!/^\d+$/.test(v)) return fallback;
  const port = Number(v);
  return port >= 0 && port <= 65535 ? port : fallback;
}

/**
 * jsonwebtoken satr ko'rinishidagi "3600" ni millisekund deb tushunadi,
 * shuning uchun faqat raqamdan iborat qiymatni soniya (number) sifatida beramiz.
 * @param {string | undefined} value
 */
function parseExpiresIn(value) {
  const v = clean(value);
  if (!v) return "7d";
  return /^\d+$/.test(v) ? Number(v) : v;
}

/** @param {string} tz */
function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Express "trust proxy" sozlamasi: production'da standart 1 (Render kabi proksi orqasida).
 * @param {string | undefined} value
 * @param {boolean} isProduction
 */
function parseTrustProxy(value, isProduction) {
  const v = clean(value).toLowerCase();
  if (!v) return isProduction ? 1 : false;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return clean(value); // masalan "loopback" yoki IP ro'yxati
}

const nodeEnv = clean(env.NODE_ENV) || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const rawSecret = clean(env.JWT_SECRET);
const secretMissing = !rawSecret || rawSecret === PLACEHOLDER_SECRET;
let jwtSecret = secretMissing ? null : rawSecret;
if (!jwtSecret && !isProduction) {
  // Development/test: vaqtinchalik tasodifiy kalit (server qayta ishga tushganda tokenlar bekor bo'ladi).
  jwtSecret = crypto.randomBytes(48).toString("hex");
  if (!isTest) {
    console.warn(
      "[config] JWT_SECRET o'rnatilmagan — vaqtinchalik tasodifiy kalit ishlatilmoqda. server/.env faylida JWT_SECRET ni belgilang."
    );
  }
}

const timeZoneRaw = clean(env.APP_TIMEZONE) || DEFAULT_TIMEZONE;

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  isTest,
  port: parsePort(env.PORT, 5000),
  mongoUri: clean(env.MONGODB_URI) || "mongodb://127.0.0.1:27017/smart-study-planner",
  jwtSecret,
  jwtExpiresIn: parseExpiresIn(env.JWT_EXPIRES_IN),
  clientOrigins: clean(env.CLIENT_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  seedDemo: parseBool(env.SEED_DEMO, true),
  serveClient: clean(env.SERVE_CLIENT).toLowerCase() !== "false",
  timeZone: isValidTimeZone(timeZoneRaw) ? timeZoneRaw : DEFAULT_TIMEZONE,
  trustProxy: parseTrustProxy(env.TRUST_PROXY, isProduction),
  bcryptRounds: 10,
});

/**
 * Serverni ishga tushirishdan oldin tekshiriladigan jiddiy muammolar.
 * Production'da JWT_SECRET bo'lmasa (yoki namunaviy qiymat bo'lsa) server ishga tushmaydi.
 * @returns {string[]}
 */
export function getConfigProblems() {
  const problems = [];
  if (!config.jwtSecret) {
    problems.push(
      "JWT_SECRET o'rnatilmagan (yoki namunaviy qiymatda qoldirilgan). Production rejimida server xavfsizlik sababli ishga tushmaydi."
    );
  }
  return problems;
}

/** Ogohlantirishlar (ishga tushishga to'sqinlik qilmaydi). */
export function getConfigWarnings() {
  const warnings = [];
  if (config.isProduction && config.jwtSecret && config.jwtSecret.length < 32) {
    warnings.push("JWT_SECRET juda qisqa — kamida 32 belgidan iborat tasodifiy satr tavsiya etiladi.");
  }
  if (clean(env.APP_TIMEZONE) && !isValidTimeZone(clean(env.APP_TIMEZONE))) {
    warnings.push(`APP_TIMEZONE noto'g'ri — "${DEFAULT_TIMEZONE}" ishlatilmoqda.`);
  }
  return warnings;
}
