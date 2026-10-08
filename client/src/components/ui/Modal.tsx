import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' } as const;

export interface ModalProps {
  open: boolean;
  /** Called on Esc, backdrop click and the close (X) button — unless `dismissible` is false. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row at the bottom (buttons are stacked full-width on phones, right-aligned on sm+). */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  /** Element to focus on open (default: first focusable element inside the body, else the panel). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** False while an action is running: Esc/backdrop/X do nothing. Default true. */
  dismissible?: boolean;
  /** Close when clicking the dimmed backdrop. Default true. */
  closeOnBackdrop?: boolean;
  /** 'alertdialog' for confirmations. Default 'dialog'. */
  role?: 'dialog' | 'alertdialog';
  hideCloseButton?: boolean;
  /** Icon shown left of the title. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog rendered in a portal: aria-modal, labelled by its title, focus moved
 * inside and trapped (Tab / Shift+Tab cycle), Esc closes, body scroll locked, focus restored on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  dismissible = true,
  closeOnBackdrop = true,
  role = 'dialog',
  hideCloseButton = false,
  icon,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Latest values for the long-lived listeners.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  // Focus management + scroll lock + keyboard handling while open.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;

    const focusInitial = () => {
      if (!panel) return;
      const target =
        initialFocusRef?.current ??
        getFocusable(panel).find((el) => !el.hasAttribute('data-modal-close')) ??
        panel;
      target.focus();
    };
    // Defer so the portal content is laid out (and autoFocus inside wins if present).
    const raf = requestAnimationFrame(() => {
      if (!panel?.contains(document.activeElement)) focusInitial();
    });

    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (dismissibleRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = getFocusable(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
    // initialFocusRef is a ref object (stable); re-run only when opening/closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-[2px]"
        aria-hidden="true"
        onMouseDown={() => {
          if (closeOnBackdrop && dismissibleRef.current) onCloseRef.current();
        }}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-slide-up focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:animate-scale-in',
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start gap-3 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {description}
              </div>
            )}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              data-modal-close=""
              onClick={() => dismissible && onClose()}
              disabled={!dismissible}
              className="-mr-2 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
