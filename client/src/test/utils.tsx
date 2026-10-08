// Render helpers for component/page tests.
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PublicUser } from '@/api/types';
import { ROUTER_FUTURE } from '@/constants/router';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL (default "/"). */
  route?: string;
  /** Route pattern to mount `ui` under so useParams works, e.g. "/plans/:id". */
  path?: string;
  /** Start authenticated as this user (no API call). Omit for an anonymous session. */
  user?: PublicUser | null;
  /** Extra routes rendered next to `ui` (e.g. a "/login" stub to assert redirects). */
  extraRoutes?: ReactNode;
}

export type RenderWithProvidersResult = RenderResult & { user: ReturnType<typeof userEvent.setup> };

/**
 * Renders `ui` inside MemoryRouter + Theme + Toast + Auth providers.
 * @example
 * const { user } = renderWithProviders(<PlanDetailPage />, { route: '/plans/p1', path: '/plans/:id', user: TEST_USERS.student });
 */
export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}): RenderWithProvidersResult {
  const { route = '/', path, user = null, extraRoutes, ...renderOptions } = options;
  const session = user ? { user, token: 'test-token' } : null;
  const content =
    path || extraRoutes ? (
      <Routes>
        <Route path={path ?? '*'} element={ui} />
        {extraRoutes}
      </Routes>
    ) : (
      ui
    );

  const result = render(
    <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider initialSession={session}>{content}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
    renderOptions,
  );
  return Object.assign(result, { user: userEvent.setup() });
}

/** Builds a fetch Response with a JSON body (for vi.spyOn(globalThis, 'fetch')). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
