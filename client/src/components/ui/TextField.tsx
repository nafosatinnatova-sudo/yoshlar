import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label (rendered as <label htmlFor>). */
  label: ReactNode;
  /** Error text rendered UNDER the input (rose, role="alert"); also sets aria-invalid. */
  error?: string | null;
  /** Helper text under the input (hidden while an error is shown). */
  hint?: ReactNode;
  /** Class for the outer wrapper (the `className` prop goes to the <input>). */
  containerClassName?: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** Icon inside the input on the left (decorative). */
  leftIcon?: ReactNode;
  /** Short text/element inside the input on the right, e.g. "daqiqa" (ignored for password fields). */
  rightAddon?: ReactNode;
}

/**
 * Labelled text input with accessible error/hint wiring. Works for text, password (with show/hide
 * toggle), date, number, email… `required` only adds a visual asterisk + aria-required (no native
 * browser validation bubbles — validate in JS and pass `error`; forms should use `noValidate`).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    id,
    type = 'text',
    className,
    containerClassName,
    hideLabel = false,
    leftIcon,
    rightAddon,
    required,
    disabled,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `field${autoId.replace(/:/g, '')}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const showHint = Boolean(hint) && !error;
  const describedBy = [ariaDescribedBy, showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={inputId} className={cn('label', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        {leftIcon && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 [&>svg]:h-4 [&>svg]:w-4"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={cn(
            'input',
            error && 'input-error',
            leftIcon && 'pl-10',
            isPassword ? 'pr-11' : rightAddon && 'pr-20',
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label={revealed ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            aria-pressed={revealed}
            aria-controls={inputId}
          >
            {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        ) : (
          rightAddon && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-sm text-slate-500 dark:text-slate-400">
              {rightAddon}
            </span>
          )
        )}
      </div>
      {showHint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="field-error">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
