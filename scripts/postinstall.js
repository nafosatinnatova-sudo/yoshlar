// Render'da qo'lda yaratilgan xizmatning standart build buyrug'i — yalang'och
// `yarn` yoki `npm install`. U ildizdagi `build` skriptini chaqirmaydi, demak
// client/dist ham, server bog'liqliklari ham paydo bo'lmaydi. Shu ilmoq (hook)
// aynan shu holatni qoplaydi: deploy paytida build o'zi ishga tushadi.
//
// Lokalda ataylab o'tkazib yuboriladi — ildizda `npm install` qilgan ishlab
// chiquvchi to'liq production build'ini kutmasligi va `--omit=dev` server
// devDependencies'ini o'chirib yubormasligi uchun. Lokal o'rnatish:
// `npm run install:all`.

import { spawnSync } from "node:child_process";

const onRender = Boolean(process.env.RENDER ?? process.env.RENDER_SERVICE_ID);
const forced = ["1", "true", "yes"].includes((process.env.SSP_FORCE_BUILD ?? "").toLowerCase());

if (!onRender && !forced) {
  console.log("[postinstall] Lokal o'rnatish — build o'tkazib yuborildi (`npm run build` bilan qo'lda ishga tushiring).");
  process.exit(0);
}

console.log("[postinstall] Render aniqlandi — `npm run build` ishga tushirilmoqda...");
const result = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true });

if (result.error) {
  console.error(`[postinstall] build ishga tushmadi: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
