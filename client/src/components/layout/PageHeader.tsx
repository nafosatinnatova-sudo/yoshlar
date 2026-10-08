import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  /** Page title (rendered as the page's h1). */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (buttons / ButtonLinks). Wrap below the title on phones. */
  actions?: ReactNode;
  /** Shows a "← {backLabel}" link above the title. */
  backTo?: string;
  /** Default "Orqaga". */
  backLabel?: string;
  /** Small text above the title (e.g. role or section name). */
  eyebrow?: ReactNode;
  className?: string;
}

/** Standard page title block: optional back link, eyebrow, h1, description and actions. */
export function PageHeader({ title, description, actions, backTo, backLabel = 'Orqaga', eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 sm:mb-8', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
          )}
          <h1 className="page-title break-words">{title}</h1>
          {description && <p className="page-subtitle">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
