import { cn } from '@/utils/cn';

/** Pulsing placeholder block. Size it with classes, e.g. <Skeleton className="h-6 w-32" />. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/** Placeholder shaped like a padded card with a few text lines. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('card card-body space-y-3', className)} aria-hidden="true">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
