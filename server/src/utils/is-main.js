import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Modul to'g'ridan-to'g'ri `node <fayl>` orqali ishga tushirilganmi?
 * Node >= 24.2 da import.meta.main bor; eski versiyalar uchun process.argv[1] bilan solishtiramiz.
 * @param {ImportMeta & { main?: boolean }} meta
 */
export function isMainModule(meta) {
  if (typeof meta.main === "boolean") return meta.main;
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const self = path.resolve(fileURLToPath(meta.url));
    const target = path.resolve(entry);
    return process.platform === "win32" ? self.toLowerCase() === target.toLowerCase() : self === target;
  } catch {
    return false;
  }
}
