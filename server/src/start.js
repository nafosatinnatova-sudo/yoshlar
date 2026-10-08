// Production kirish nuqtasi (Render startCommand shuni chaqiradi).
//
// MONGODB_URI berilgan bo'lsa — to'g'ridan-to'g'ri o'sha bazaga ulanadi.
// Berilmagan bo'lsa — xotiradagi MongoDB ko'tariladi, demo hisoblar seed
// qilinadi. Bu rejimda ma'lumotlar server qayta ishga tushganda yo'qoladi
// (Render'ning bepul tarifi bo'sh turgandan keyin uyquga ketadi), shuning
// uchun u faqat demo uchun — doimiy baza kerak bo'lsa MONGODB_URI ni
// (MongoDB Atlas) o'rnatish kifoya, kod o'zgarmaydi.

const providedUri = (process.env.MONGODB_URI ?? "").trim();

/** @type {(() => Promise<void>) | null} */
let stopMemoryMongo = null;
let mongoUri = providedUri;

if (!providedUri) {
  console.warn(
    "[start] MONGODB_URI o'rnatilmagan — xotiradagi MongoDB ishlatilmoqda. " +
      "Ma'lumotlar server qayta ishga tushganda yo'qoladi (demo rejimi)."
  );
  const { startMemoryMongo } = await import("./memory-db.js");
  const memory = await startMemoryMongo();
  mongoUri = memory.uri;
  stopMemoryMongo = memory.stop;
  // config.js muhitni import paytida o'qiydi — shuning uchun qiymatni
  // ./index.js dan OLDIN o'rnatamiz.
  process.env.MONGODB_URI = mongoUri;
}

const { startServer } = await import("./index.js");

/** @type {(() => Promise<void>) | null} */
let closeServer = null;

/** @param {number} code */
async function shutdown(code) {
  try {
    if (closeServer) await closeServer();
  } finally {
    if (stopMemoryMongo) await stopMemoryMongo();
    process.exit(code);
  }
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));

try {
  // Xotira rejimida seed majburiy: aks holda hech qanday hisob bo'lmaydi.
  const { close } = await startServer(providedUri ? { mongoUri } : { mongoUri, seed: true });
  closeServer = close;
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  await shutdown(1);
}
