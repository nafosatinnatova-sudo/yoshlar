import { cn } from '@/utils/cn';

/** "Ali Valiyev" → "AV"; "admin" → "AD". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' } as const;

/** Initials avatar with a brand gradient (decorative — pair it with the visible name). */
export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white',
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
