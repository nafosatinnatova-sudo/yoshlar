import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_KEY, storageGet, storageRemove, storageSet } from '@/utils/storage';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Effective theme currently applied. */
  theme: Theme;
  isDark: boolean;
  /** True while following the OS preference (nothing saved in localStorage). */
  isSystem: boolean;
  /** Switches light ↔ dark and remembers the choice ("ssp_theme"). */
  toggleTheme: () => void;
  /** Sets and remembers an explicit theme. */
  setTheme: (theme: Theme) => void;
  /** Forgets the saved choice and follows the OS preference again. */
  followSystemTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#020617' };

function readStoredTheme(): Theme | null {
  const value = storageGet(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

function getSystemTheme(): Theme {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Theme | null>(readStoredTheme);
  const [system, setSystem] = useState<Theme>(getSystemTheme);
  const theme: Theme = stored ?? system;

  // Apply before paint to avoid flashes when toggling.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow OS changes while no explicit choice is saved.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14
    mql.addListener?.(onChange);
    return () => mql.removeListener?.(onChange);
  }, []);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_KEY) setStored(readStoredTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    storageSet(THEME_KEY, next);
    setStored(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const followSystemTheme = useCallback(() => {
    storageRemove(THEME_KEY);
    setStored(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark: theme === 'dark', isSystem: stored === null, toggleTheme, setTheme, followSystemTheme }),
    [theme, stored, toggleTheme, setTheme, followSystemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Current theme + toggle. Must be used inside <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
