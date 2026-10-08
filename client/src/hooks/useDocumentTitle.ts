import { useEffect } from 'react';

export const APP_NAME = 'Smart Study Planner';

/** Sets `document.title` to "<title> — Smart Study Planner" (or just the app name). */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
  }, [title]);
}
