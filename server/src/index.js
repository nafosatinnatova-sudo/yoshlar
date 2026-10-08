// Serverni ishga tushirish: MongoDB ga ulanish → (ixtiyoriy) demo ma'lumotlar → HTTP server.

import http from "node:http";
import { createApp } from "./app.js";
import { config, getConfigProblems, getConfigWarnings } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import { seedDemoData } from "./seed.js";
import { isMainModule } from "./utils/is-main.js";

/**
 * @param {{ port?: number, mongoUri?: string, seed?: boolean }} [options]
 */
export async function startServer({ port = config.port, mongoUri = config.mongoUri, seed = config.seedDemo } = {}) {
  const problems = getConfigProblems();
  if (problems.length > 0) throw new Error(problems.join("\n"));
  for (const warning of getConfigWarnings()) console.warn(`[config] ${warning}`);

  try {
    await connectDB(mongoUri);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `MongoDB ga ulanib bo'lmadi (${reason}).\n` +
        "MONGODB_URI ni tekshiring yoki MongoDB o'rnatmasdan ishga tushirish uchun `npm run dev:memory` dan foydalaning."
    );
  }
  console.log("MongoDB ga ulandi.");

  if (seed) {
    const result = await seedDemoData({ reset: false });
    if (result.seeded) console.log("Demo hisoblar yaratildi: admin/admin123, teacher/teacher123, student/student123, student2/student123");
  }

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve(undefined);
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Smart Study Planner API: http://localhost:${actualPort}/api (${config.nodeEnv})`);
  if (app.locals.clientBuild) console.log(`Frontend: http://localhost:${actualPort}/`);

  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await new Promise((resolve) => server.close(() => resolve(undefined)));
    await disconnectDB();
  }

  return { app, server, close };
}

if (isMainModule(import.meta)) {
  try {
    const { close } = await startServer();
    /** @param {string} signal */
    const shutdown = async (signal) => {
      console.log(`${signal} qabul qilindi, server to'xtatilmoqda...`);
      await close();
      process.exit(0);
    };
    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
