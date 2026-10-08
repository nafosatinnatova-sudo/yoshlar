import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const STYLES: Record<AlertTone, string> = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
};

const ICON_COLORS: Record<AlertTone, string> = {
  info: 'text-indigo-500 dark:text-indigo-400',
  success: 'text-emerald-500 dark:text-emerald-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-rose-500 dark:text-rose-400',
};

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert } as const;

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Right-side / bottom action (button or link). */
  action?: ReactNode;
  /** Override the default icon (pass null to hide). */
  icon?: ReactNode | null;
  /** ARIA role. Default: 'alert' for danger, 'status' otherwise. */
  role?: 'alert' | 'status' | 'none';
  className?: string;
}

/** Inline message box (form-level server error, info note, warning…). */
export function Alert({ tone = 'info', title, children, action, icon, role, className }: AlertProps) {
  const Icon = ICONS[tone];
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : 'status');
  return (
    <div
      role={resolvedRole === 'none' ? undefined : resolvedRole}
      className={cn('flex flex-col gap-3 rounded-xl border p-3.5 text-sm sm:flex-row sm:items-start', STYLES[tone], className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon === null ? null : (
          <span className={cn('mt-0.5 shrink-0 [&>svg]:h-5 [&>svg]:w-5', ICON_COLORS[tone])} aria-hidden="true">
            {icon ?? <Icon />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cn('break-words', title && 'mt-0.5 opacity-90')}>{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 sm:ml-2">{action}</div>}
    </div>
  );
}
