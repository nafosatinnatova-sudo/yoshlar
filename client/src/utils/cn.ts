export type ClassValue = string | number | false | null | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

/**
 * Joins class names, skipping falsy values. Accepts strings, arrays and `{ 'class': condition }` maps.
 * @example cn('btn', isActive && 'btn-primary', { 'opacity-50': disabled })
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const visit = (value: ClassValue): void => {
    if (!value && value !== 0) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object') {
      for (const [key, enabled] of Object.entries(value)) if (enabled) out.push(key);
    }
  };
  values.forEach(visit);
  return out.join(' ');
}
