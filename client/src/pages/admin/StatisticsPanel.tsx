import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenCheck, ClipboardList, RefreshCw, Target, Users } from 'lucide-react';
import { getAdminStatistics } from '@/api/client';
import type { AdminStatistics } from '@/api/types';
import { Alert, Button, ErrorState, ProgressBar, Skeleton } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { formatTimeUz } from '@/utils/date';
import { getErrorMessage, isAbortError } from '@/utils/errors';
import { ActivityChart } from './ActivityChart';
import { KpiCard, KpiCardSkeleton } from './KpiCard';
import { UsersByRoleChart } from './UsersByRoleChart';

/** Statistics are re-fetched silently this often while the tab is visible ("real vaqtga yaqin"). */
export const STATS_AUTO_REFRESH_MS = 30_000;

/** "Statistika" tab: KPI cards, users-by-role donut, 14-day activity chart. */
export function StatisticsPanel() {
  const toast = useToast();
  const { data, loading, errorMessage, reload, setData } = useAsync((signal) => getAdminStatistics({ signal }), []);

  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  /** Last background refresh failed (data on screen may be stale). */
  const [staleError, setStaleError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Every new snapshot (initial load or refresh) moves the "Yangilandi" timestamp.
  useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);

  // Abort an in-flight refresh when leaving the tab/page.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (!silent) setRefreshing(true);
      try {
        const fresh = await getAdminStatistics({ signal: controller.signal });
        if (controller.signal.aborted) return;
        setData(fresh);
        setStaleError(null);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        const message = getErrorMessage(error);
        setStaleError(message);
        if (!silent) toast.error(message);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setRefreshing(false);
        }
      }
    },
    [setData, toast],
  );

  // Near-real-time: silent refresh on an interval, only while the page is visible and data is shown.
  const hasData = data !== undefined;
  useEffect(() => {
    if (!hasData) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !controllerRef.current) void refresh({ silent: true });
    }, STATS_AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [hasData, refresh]);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="section-title">Umumiy statistika</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {updatedAt ? (
            <>
              Yangilandi: <time dateTime={updatedAt.toISOString()}>{formatTimeUz(updatedAt)}</time> · har 30 soniyada
              avtomatik yangilanadi
            </>
          ) : (
            "Tizim bo'yicha jamlangan ko'rsatkichlar"
          )}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => void refresh()}
        loading={refreshing}
        loadingText="Yangilanmoqda…"
        disabled={!hasData}
        leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
      >
        Yangilash
      </Button>
    </div>
  );

  // First load.
  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        <p className="sr-only" role="status">
          Statistika yuklanmoqda…
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  // First load failed.
  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="card">
          <ErrorState
            title="Statistikani yuklab bo'lmadi"
            message={errorMessage ?? "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring."}
            onRetry={() => void reload()}
            retrying={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {staleError && (
        <Alert
          tone="warning"
          title="Ma'lumotlarni yangilab bo'lmadi"
          action={
            <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={refreshing}>
              Qayta urinish
            </Button>
          }
        >
          {staleError} Ekrandagi ko'rsatkichlar eskirgan bo'lishi mumkin.
        </Alert>
      )}
      <StatisticsContent stats={data} />
    </div>
  );
}

/** Pure presentation of an AdminStatistics snapshot. */
export function StatisticsContent({ stats }: { stats: AdminStatistics }) {
  const { users, plans, topics, averageProgress, overallProgress, recentActivity } = stats;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Jami foydalanuvchilar"
          value={users.total}
          icon={<Users />}
          tone="primary"
          details={[
            { label: "O'quvchilar", value: users.students },
            { label: "O'qituvchilar", value: users.teachers },
            { label: 'Adminlar', value: users.admins },
          ]}
        />
        <KpiCard
          label="Jami rejalar"
          value={plans.total}
          icon={<ClipboardList />}
          tone="violet"
          details={[
            { label: 'Yakunlangan', value: plans.completed },
            { label: 'Jarayonda', value: plans.inProgress },
          ]}
        />
        <KpiCard
          label="Mavzular (bajarilgan / jami)"
          value={topics.completed}
          unit={`/ ${topics.total}`}
          icon={<BookOpenCheck />}
          tone="success"
          details={[{ label: 'Umumiy bajarilish', value: `${overallProgress}%` }]}
          footer={<ProgressBar value={overallProgress} size="sm" label="Mavzular bo'yicha umumiy bajarilish" />}
        />
        <KpiCard
          label="O'rtacha natija"
          value={`${averageProgress}%`}
          icon={<Target />}
          tone="warning"
          details={[{ label: 'Hisobga olingan rejalar', value: plans.total }]}
          footer={<ProgressBar value={averageProgress} size="sm" label="Rejalar bo'yicha o'rtacha natija" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <UsersByRoleChart users={users} className="lg:col-span-2" />
        <ActivityChart points={recentActivity ?? []} className="lg:col-span-3" />
      </div>
    </>
  );
}
