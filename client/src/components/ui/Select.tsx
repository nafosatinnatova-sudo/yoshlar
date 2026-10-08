import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: ReactNode;
  /** Error text rendered under the control (rose, role="alert"). */
  error?: string | null;
  hint?: ReactNode;
  /** Options to render (alternatively pass <option> children). */
  options?: readonly SelectOption[];
  /** Adds a first empty option (value "") with this text, e.g. "Tanlang…". */
  placeholder?: string;
  containerClassName?: string;
  hideLabel?: boolean;
}

/** Labelled native <select> styled like TextField. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    options,
    placeholder,
    id,
    className,
    containerClassName,
    hideLabel = false,
    required,
    children,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? `select${autoId.replace(/:/g, '')}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const showHint = Boolean(hint) && !error;
  const describedBy = [ariaDescribedBy, showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={selectId} className={cn('label', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={cn('input cursor-pointer appearance-none pr-10', error && 'input-error', className)}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
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
