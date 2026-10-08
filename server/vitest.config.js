import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Birinchi ishga tushishda mongodb-memory-server MongoDB binar faylini yuklab oladi.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test_only_jwt_secret_7f3c2a9e5b1d4c8f0a6e2b9d3c7f1a5e",
      JWT_EXPIRES_IN: "1h",
      SEED_DEMO: "false",
      SERVE_CLIENT: "false",
      APP_TIMEZONE: "Asia/Tashkent",
    },
  },
});
