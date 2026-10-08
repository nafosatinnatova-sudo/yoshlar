import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getMatch(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * True when the user asked the OS to reduce motion. Recharts animates in JavaScript, so the global
 * CSS rule does not reach it — charts pass `isAnimationActive={!reduceMotion}` instead.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduce(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  return reduce;
}
