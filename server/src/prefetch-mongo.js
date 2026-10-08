// Build qadami: xotiradagi MongoDB uchun mongod binarini oldindan yuklab olish.
// MONGODB_URI o'rnatilgan bo'lsa (haqiqiy baza ishlatiladi) hech narsa qilmaydi.
// Shu qadam bo'lmasa, binar serverning birinchi ko'tarilishida yuklanardi va
// Render health check'i kutib qolardi.

const providedUri = (process.env.MONGODB_URI ?? "").trim();

if (providedUri) {
  console.log("[prefetch-mongo] MONGODB_URI mavjud — xotiradagi MongoDB kerak emas, o'tkazib yuborildi.");
} else {
  const { prefetchMemoryMongo } = await import("./memory-db.js");
  try {
    const { dir } = await prefetchMemoryMongo();
    console.log(`[prefetch-mongo] mongod binari tayyor: ${dir}`);
  } catch (err) {
    console.error(`[prefetch-mongo] binarni yuklab bo'lmadi: ${err instanceof Error ? err.message : err}`);
    console.error("[prefetch-mongo] build to'xtatilmaydi — binar serverning birinchi ishga tushishida yuklanadi.");
  }
}
