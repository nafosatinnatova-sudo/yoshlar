// Safe wrappers around localStorage. Storage can throw (private mode, disabled cookies,
// quota exceeded, sandboxed iframes), so every access is guarded.

export const TOKEN_KEY = 'ssp_token';
export const THEME_KEY = 'ssp_theme';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Reads a value; returns null when missing or when storage is unavailable. */
export function storageGet(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a value; silently ignores storage failures. */
export function storageSet(key: string, value: string): void {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Removes a value; silently ignores storage failures. */
export function storageRemove(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** JWT persistence (localStorage key "ssp_token"). */
export const tokenStorage = {
  get: (): string | null => storageGet(TOKEN_KEY),
  set: (token: string): void => storageSet(TOKEN_KEY, token),
  clear: (): void => storageRemove(TOKEN_KEY),
};
