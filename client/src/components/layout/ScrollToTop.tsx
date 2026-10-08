import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top when the pathname changes (SPA navigations otherwise keep the old offset). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0 });
    } catch {
      /* jsdom / old browsers */
    }
  }, [pathname]);
  return null;
}
