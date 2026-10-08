import type { ReactNode } from 'react';
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Icon in a tinted square (default: Inbox). */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons / links shown under the text. */
  action?: ReactNode;
  tone?: 'primary' | 'danger' | 'neutral';
  /** Less vertical padding. */
  compact?: boolean;
  /** Title element (default h2). */
  titleAs?: 'h2' | 'h3' | 'p';
  className?: string;
}

const ICON_TONES = {
  primary: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  neutral: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
} as const;

/** Centered "nothing here yet" block. Wrap in <Card> when it should look like a panel. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'primary',
  compact = false,
  titleAs: Title = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 text-center', compact ? 'py-8' : 'py-12 sm:py-16', className)}>
      <span
        className={cn(
          'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl [&>svg]:h-7 [&>svg]:w-7',
          ICON_TONES[tone],
        )}
        aria-hidden="true"
      >
        {icon ?? <Inbox />}
      </span>
      <Title className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">{title}</Title>
      {description && <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  /** Error text (e.g. from getErrorMessage / useAsync().errorMessage). */
  message: ReactNode;
  /** Default "Ma'lumotlarni yuklab bo'lmadi". */
  title?: ReactNode;
  /** Shows a "Qayta urinish" button. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Extra actions (e.g. a back link). */
  action?: ReactNode;
  className?: string;
}

/** Page/section level load error with optional retry. */
export function ErrorState({ message, title = "Ma'lumotlarni yuklab bo'lmadi", onRetry, retrying, action, className }: ErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        tone="danger"
        icon={<TriangleAlert />}
        title={title}
        description={message}
        className={className}
        action={
          onRetry || action ? (
            <>
              {onRetry && (
                <Button variant="secondary" onClick={onRetry} loading={retrying} leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
                  Qayta urinish
                </Button>
              )}
              {action}
            </>
          ) : undefined
        }
      />
    </div>
  );
}
