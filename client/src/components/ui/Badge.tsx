import type { HTMLAttributes } from 'react';
import type { Role } from '@/api/types';
import { cn } from '@/utils/cn';
import { roleLabel } from '@/utils/roles';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  primary: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
};

const DOTS: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  violet: 'bg-violet-500',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Small colored dot before the text. */
  dot?: boolean;
  size?: 'sm' | 'md';
}

/** Pill label. */
export function Badge({ tone = 'neutral', dot = false, size = 'sm', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Badge tone used for each role across the app. */
export const ROLE_BADGE_TONES: Readonly<Record<Role, BadgeTone>> = Object.freeze({
  student: 'primary',
  teacher: 'success',
  admin: 'warning',
});

/** "O'quvchi" / "O'qituvchi" / "Administrator" badge. */
export function RoleBadge({ role, className, size }: { role: Role; className?: string; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={ROLE_BADGE_TONES[role] ?? 'neutral'} size={size} className={className}>
      {roleLabel(role)}
    </Badge>
  );
}
