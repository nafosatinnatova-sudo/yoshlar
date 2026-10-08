// MongoDB o'rnatmasdan ishga tushirish: xotiradagi MongoDB (mongodb-memory-server) + haqiqiy server.
// Ma'lumotlar jarayon to'xtaganda yo'qoladi; demo hisoblar har safar avtomatik yaratiladi.
// Foydalanish: npm run dev:memory

import { MongoMemoryServer } from "mongodb-memory-server";

console.log("Xotiradagi MongoDB ishga tushirilmoqda (birinchi marta binar fayl yuklab olinishi mumkin)...");
const mongod = await MongoMemoryServer.create();
const mongoUri = mongod.getUri("smart-study-planner");
process.env.MONGODB_URI = mongoUri;

// Konfiguratsiya MONGODB_URI o'rnatilgandan keyin yuklanishi uchun dinamik import.
const { startServer } = await import("./index.js");

/** @type {(() => Promise<void>) | null} */
let closeServer = null;

async function shutdown(code = 0) {
  try {
    if (closeServer) await closeServer();
  } finally {
    await mongod.stop();
    process.exit(code);
  }
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));

try {
  const { close } = await startServer({ mongoUri, seed: true });
  closeServer = close;
  console.log("Eslatma: bu rejimda ma'lumotlar faqat xotirada saqlanadi.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  await shutdown(1);
}
