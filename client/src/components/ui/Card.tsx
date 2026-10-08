import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element (default "div"). */
  as?: 'div' | 'section' | 'article' | 'aside' | 'li' | 'header';
  /** Adds the standard inner padding (p-4 sm:p-6). Default true. */
  padded?: boolean;
  /** Hover lift + indigo border (for clickable cards). */
  interactive?: boolean;
}

/** Surface container: rounded-2xl, border, white / slate-900 background. */
export function Card({ as = 'div', padded = true, interactive = false, className, ...rest }: CardProps) {
  const Tag = as as ElementType;
  return <Tag className={cn('card', padded && 'card-body', interactive && 'card-interactive', className)} {...rest} />;
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned content (buttons, badges…). */
  action?: ReactNode;
  /** Decorative icon shown in a tinted square. */
  icon?: ReactNode;
  /** Heading element (default h2). */
  titleAs?: 'h2' | 'h3';
  className?: string;
  /** id for the heading (useful for aria-labelledby). */
  titleId?: string;
}

/** Title row for a Card (place it as the first child of a padded Card). */
export function CardHeader({ title, description, action, icon, titleAs = 'h2', className, titleId }: CardHeaderProps) {
  const Heading = titleAs;
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 [&>svg]:h-5 [&>svg]:w-5"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <Heading id={titleId} className="section-title">
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
