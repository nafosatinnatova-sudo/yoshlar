// Qurilgan frontend (client/dist) ni berish: statik fayllar + SPA fallback,
// shuningdek Helmet CSP sozlamalari (qurilgan SPA bilan mos).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** server/src → ../../client/dist */
export const DEFAULT_CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

/**
 * index.html ichidagi inline <script> (src siz) bloklari uchun CSP sha256 xeshlari.
 * Masalan, sahifa yuklanishidan oldin dark mode ni qo'yuvchi kichik skript bo'lsa,
 * CSP 'unsafe-inline' siz ham ishlaydi.
 * @param {string} html
 * @returns {string[]}
 */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1];
    const body = match[2];
    if (/\bsrc\s*=/i.test(attrs) || body.trim() === "") continue;
    if (/\btype\s*=\s*["']?application\/(ld\+)?json/i.test(attrs)) continue;
    hashes.add(`'sha256-${crypto.createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

/**
 * client/dist/index.html mavjud bo'lsa, qurilma haqida ma'lumot qaytaradi; aks holda null.
 * @param {string} [distDir]
 */
export function loadClientBuild(distDir = DEFAULT_CLIENT_DIST) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) return null;
  const html = fs.readFileSync(indexPath, "utf8");
  return { distDir, indexPath, scriptHashes: inlineScriptHashes(html) };
}

/**
 * Helmet sozlamalari. CSP: o'z skript/stillarimiz, inline stillar (Recharts, Tailwind dinamik
 * style atributlari), data:/blob: rasmlar, Google Fonts (agar ishlatilsa).
 * @param {{ scriptHashes?: string[] } | null} clientBuild
 * @param {{ isProduction: boolean }} options
 * @returns {import("helmet").HelmetOptions}
 */
export function buildHelmetOptions(clientBuild, { isProduction }) {
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "script-src": ["'self'", ...(clientBuild?.scriptHashes ?? [])],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'"],
        "manifest-src": ["'self'"],
        "worker-src": ["'self'", "blob:"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        // Lokal http da ishlaganda resurslar https ga "ko'tarilib" buzilmasligi uchun faqat production'da.
        ...(isProduction ? { "upgrade-insecure-requests": [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
  };
}

/**
 * Statik fayllar va SPA fallback (/api dan tashqari GET so'rovlar → index.html).
 * @param {import("express").Express} app
 * @param {{ distDir: string, indexPath: string }} build
 */
export function mountClient(app, build) {
  app.use(
    express.static(build.distDir, {
      index: false,
      setHeaders(res, filePath) {
        // Vite xeshlangan fayllari (assets/*) o'zgarmaydi — uzoq muddat keshlanadi.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    // Kengaytmali yo'llar (masalan, /assets/yoq.js) — haqiqiy topilmagan fayl, index.html emas.
    if (path.extname(req.path)) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(build.indexPath);
  });
}
