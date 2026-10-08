// Express ilovasini yig'ish. listen() bu yerda chaqirilmaydi — testlarda supertest ishlatadi.

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { DEFAULT_CLIENT_DIST, buildHelmetOptions, loadClientBuild, mountClient } from "./client.js";
import { config } from "./config.js";
import { apiNotFound, errorHandler, notFound } from "./middleware/errors.js";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { adminRouter } from "./routes/admin.js";
import { createAuthRouter } from "./routes/auth.js";
import { plansRouter } from "./routes/plans.js";
import { teacherRouter } from "./routes/teacher.js";

/**
 * CORS: CLIENT_ORIGIN (vergul bilan) ro'yxati; o'rnatilmagan bo'lsa development'da hammasiga,
 * production'da faqat bir xil manbaga (same-origin) ruxsat.
 * @returns {import("cors").CorsOptions}
 */
function corsOptions() {
  if (config.clientOrigins.length > 0) return { origin: config.clientOrigins, maxAge: 600 };
  return { origin: !config.isProduction, maxAge: 600 };
}

/**
 * @param {{
 *   serveClient?: boolean,
 *   clientDistDir?: string,
 *   loginRateLimit?: Partial<import("express-rate-limit").Options>,
 * }} [options]
 */
export function createApp(options = {}) {
  const { serveClient = config.serveClient, clientDistDir = DEFAULT_CLIENT_DIST, loginRateLimit = {} } = options;
  if (!config.jwtSecret) throw new Error("JWT_SECRET o'rnatilmagan.");

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  const clientBuild = serveClient ? loadClientBuild(clientDistDir) : null;
  app.locals.clientBuild = clientBuild;

  // Xavfsizlik va parsing
  app.use(helmet(buildHelmetOptions(clientBuild, { isProduction: config.isProduction })));
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: "100kb" }));
  app.use(sanitizeRequest);

  // API javoblari keshlanmaydi (shaxsiy ma'lumotlar).
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/auth", createAuthRouter({ loginRateLimit }));
  app.use("/api/plans", plansRouter);
  app.use("/api/teacher", teacherRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", apiNotFound);

  if (clientBuild) mountClient(app, clientBuild);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
