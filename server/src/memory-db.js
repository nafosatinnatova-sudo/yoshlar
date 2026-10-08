// Xotiradagi MongoDB (mongodb-memory-server) uchun umumiy yordamchi.
// Deploy'da MONGODB_URI berilmaganda zaxira (fallback) sifatida ishlatiladi:
// start.js serverni shu baza bilan ko'taradi, prefetch-mongo.js esa build
// paytida mongod binarini oldindan yuklab, repo ichidagi keshga joylaydi.
//
// Diqqat: bu modul config.js ni import QILMAYDI — config muhit o'zgaruvchilarini
// import paytida o'qiydi, shuning uchun MONGODB_URI o'rnatilgandan keyin
// yuklanishi kerak.

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo ildizi: server/src → ../.. */
const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * mongod binari saqlanadigan papka. Render'da build va runtime bir xil ish
 * papkasidan yuriladi, shuning uchun repo ichidagi kesh ikkisi uchun ham mos
 * (binar build paytida bir marta yuklanadi, server ko'tarilishida kutilmaydi).
 */
export const MEMORY_DOWNLOAD_DIR = path.join(REPO_ROOT, ".cache", "mongodb-binaries");

/** Tashqi sozlama bo'lmasa, keshni repo ichiga yo'naltiradi. */
function applyDownloadDir() {
  if (!process.env.MONGOMS_DOWNLOAD_DIR?.trim()) {
    process.env.MONGOMS_DOWNLOAD_DIR = MEMORY_DOWNLOAD_DIR;
  }
  return process.env.MONGOMS_DOWNLOAD_DIR;
}

/**
 * Xotiradagi MongoDB ni ishga tushiradi.
 * WiredTiger keshi 256 MB ga cheklangan — Render'ning kichik (512 MB) tarifida
 * mongod va Node birgalikda xotiraga sig'ishi uchun.
 * @returns {Promise<{ uri: string, stop: () => Promise<void> }>}
 */
export async function startMemoryMongo({ dbName = "smart-study-planner" } = {}) {
  applyDownloadDir();
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create({
    instance: { args: ["--wiredTigerCacheSizeGB", "0.25"] },
  });
  return {
    uri: mongod.getUri(dbName),
    stop: async () => {
      await mongod.stop();
    },
  };
}

/** Binarni oldindan yuklab olish (build qadami). */
export async function prefetchMemoryMongo() {
  const dir = applyDownloadDir();
  const { uri, stop } = await startMemoryMongo();
  await stop();
  return { dir, uri };
}
