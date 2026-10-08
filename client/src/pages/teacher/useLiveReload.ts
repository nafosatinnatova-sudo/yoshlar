// Near-real-time data for the teacher pages: periodic background refresh while the tab is
// visible, a manual "Yangilash" action and the time of the last successful update.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Default background refresh period. */
export const AUTO_REFRESH_INTERVAL_MS = 30_000;

export interface AutoRefreshOptions {
  /** Turn the timer on/off (e.g. only once the first load succeeded). Default true. */
  enabled?: boolean;
  /** Period in ms (≤ 0 disables). Default 30 s. */
  intervalMs?: number;
  /** Skip ticks while a request is already in flight (avoids aborting a slow request forever). */
  busy?: boolean;
}

function isPageVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/**
 * Calls `refresh` every `intervalMs` while the page is visible. Background tabs are skipped;
 * when the tab becomes visible again (or the browser comes back online) an overdue refresh runs
 * immediately.
 */
export function useAutoRefresh(refresh: () => unknown, options: AutoRefreshOptions = {}): void {
  const { enabled = true, intervalMs = AUTO_REFRESH_INTERVAL_MS, busy = false } = options;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return undefined;
    let lastRun = Date.now();

    const run = () => {
      if (busyRef.current || !isPageVisible()) return;
      lastRun = Date.now();
      void refreshRef.current();
    };
    const runIfOverdue = () => {
      if (Date.now() - lastRun >= intervalMs) run();
    };
    const onVisibilityChange = () => {
      if (isPageVisible()) runIfOverdue();
    };

    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', run);
    };
  }, [enabled, intervalMs]);
}

export interface LiveReloadOptions {
  /** Enables the background refresh (pass false until the first load succeeded). */
  enabled: boolean;
  /** True while any load is in flight (useAsync().loading). */
  busy: boolean;
  intervalMs?: number;
}

export interface LiveReloadState {
  /** When `data` last changed (successful load), or null before the first load. */
  updatedAt: Date | null;
  /** True only while a MANUAL refresh (the "Yangilash" button) is running. */
  refreshing: boolean;
  /** Manual refresh; keeps the current data visible. */
  refresh: () => Promise<void>;
}

/**
 * Wires useAsync's `reload` to the auto-refresh timer and a manual refresh button.
 * @example
 * const { data, loading, reload } = useAsync((signal) => getTeacherStudents({ signal }), []);
 * const live = useLiveReload(data, reload, { enabled: Boolean(data), busy: loading });
 */
export function useLiveReload<T>(
  data: T | undefined,
  reload: () => Promise<void>,
  { enabled, busy, intervalMs }: LiveReloadOptions,
): LiveReloadState {
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data !== undefined) setUpdatedAt(new Date());
  }, [data]);

  useAutoRefresh(reload, { enabled, busy, intervalMs });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  return { updatedAt, refreshing, refresh };
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

/** Live `prefers-reduced-motion` flag (Recharts animations are JS-driven, so CSS cannot stop them). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
