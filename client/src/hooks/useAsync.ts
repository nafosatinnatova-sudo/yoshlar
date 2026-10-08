import { useCallback, useEffect, useRef, useState, type DependencyList, type Dispatch, type SetStateAction } from 'react';
import { getErrorMessage, isAbortError } from '@/utils/errors';

export interface UseAsyncOptions {
  /** When false the loader is not run (loading=false, data stays undefined). Default true. */
  enabled?: boolean;
}

export interface UseAsyncResult<T> {
  /** Last successfully loaded value (kept while a manual reload() is in flight). */
  data: T | undefined;
  /** Last error (null when the last run succeeded). */
  error: unknown;
  /** Uzbek message for `error` (null when no error). */
  errorMessage: string | null;
  /** True while a run is in flight. Initial load: `loading && data === undefined`. */
  loading: boolean;
  /** Re-runs the loader keeping current data visible. */
  reload: () => Promise<void>;
  /** Replace data locally (e.g. after a mutation / optimistic update). */
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/**
 * Runs an async loader on mount and whenever `deps` change; aborts stale runs.
 *
 * @example
 * const { data, loading, errorMessage, reload } = useAsync((signal) => getPlan(id!, { signal }), [id]);
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const controllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (reset: boolean): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (reset) setData(undefined);
    setError(null);
    setLoading(true);
    try {
      const result = await loaderRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setData(() => result);
      setLoading(false);
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      setError(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void execute(true);
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are supplied by the caller
  }, [enabled, execute, ...deps]);

  const reload = useCallback(() => execute(false), [execute]);

  return {
    data,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    loading,
    reload,
    setData,
  };
}
