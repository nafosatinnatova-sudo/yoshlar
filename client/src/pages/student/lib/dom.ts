// Small DOM helpers shared by the student pages (safe in jsdom, respects reduced motion).

function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Scrolls an element into view (smoothly unless the user prefers reduced motion). No-op where unsupported. */
export function revealElement(element: Element | null | undefined, block: ScrollLogicalPosition = 'start'): void {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
}

/**
 * Focuses an element without the browser's jump-scroll, then scrolls it to the middle of the
 * viewport (so the sticky header never hides it).
 */
export function focusAndReveal(element: HTMLElement | null | undefined): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  revealElement(element, 'center');
}
