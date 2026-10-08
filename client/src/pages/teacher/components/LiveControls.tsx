// Refresh UI shared by both teacher pages.
import { RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AUTO_REFRESH_INTERVAL_MS, type LiveReloadState } from '../useLiveReload';
import { TEACHER_MESSAGES, formatClockUz } from '../teacherUtils';

/** "Yangilash" button + "auto-refresh / last updated" note, stacked (goes into PageHeader actions). */
export function LiveRefreshActions({ live }: { live: LiveReloadState }) {
  const seconds = Math.round(AUTO_REFRESH_INTERVAL_MS / 1000);
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button
        variant="secondary"
        onClick={() => void live.refresh()}
        loading={live.refreshing}
        loadingText="Yangilanmoqda…"
        leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
      >
        Yangilash
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>
          Har {seconds} soniyada yangilanadi
          {live.updatedAt && (
            <>
              {' · '}
              <time dateTime={live.updatedAt.toISOString()} className="tabular-nums">
                {formatClockUz(live.updatedAt)}
              </time>
            </>
          )}
        </span>
      </p>
    </div>
  );
}

/** Shown when a background/manual refresh failed but older data is still on screen. */
export function StaleDataAlert({
  message,
  onRetry,
  retrying,
}: {
  message: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Alert
      tone="warning"
      role="alert"
      title={TEACHER_MESSAGES.staleData}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Qayta urinish
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
