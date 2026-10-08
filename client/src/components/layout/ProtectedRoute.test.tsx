import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '@/api/types';
import { ROUTER_FUTURE } from '@/constants/router';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { TEST_USERS } from '@/test/fixtures';
import { jsonResponse } from '@/test/utils';
import { TOKEN_KEY } from '@/utils/storage';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(route: string, user: PublicUser | null) {
  return render(
    <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider initialSession={user ? { user, token: 't' } : null}>
            <Routes>
              <Route path="/login" element={<p>LOGIN PAGE</p>} />
              <Route element={<ProtectedRoute roles={['student']} />}>
                <Route path="/" element={<p>STUDENT HOME</p>} />
                <Route path="/plans" element={<p>MY PLANS</p>} />
              </Route>
              <Route element={<ProtectedRoute roles={['teacher']} />}>
                <Route path="/teacher" element={<p>TEACHER HOME</p>} />
              </Route>
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin" element={<p>ADMIN HOME</p>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects anonymous users to /login', () => {
    renderAt('/plans', null);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the page for the right role', () => {
    renderAt('/plans', TEST_USERS.student);
    expect(screen.getByText('MY PLANS')).toBeInTheDocument();
  });

  it.each([
    ['teacher', '/', 'TEACHER HOME'],
    ['admin', '/plans', 'ADMIN HOME'],
    ['student', '/admin', 'STUDENT HOME'],
    ['student', '/teacher', 'STUDENT HOME'],
  ] as const)('sends a %s on %s to their own home', (role, route, marker) => {
    renderAt(route, TEST_USERS[role]);
    expect(screen.getByText(marker)).toBeInTheDocument();
  });

  it('verifies a stored token with /api/auth/me before rendering', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'stored');
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ user: TEST_USERS.teacher }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/teacher']} future={ROUTER_FUTURE}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<p>LOGIN PAGE</p>} />
                <Route element={<ProtectedRoute roles={['teacher']} />}>
                  <Route path="/teacher" element={<p>TEACHER HOME</p>} />
                </Route>
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Sessiya tekshirilmoqda…')).toBeInTheDocument();
    expect(await screen.findByText('TEACHER HOME')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/me');
  });

  it('an expired stored token ends on /login with the server message', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'expired');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse({ message: 'Sessiya muddati tugagan. Qaytadan kiring.' }, 401)),
    );
    render(
      <MemoryRouter initialEntries={['/']} future={ROUTER_FUTURE}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<p>LOGIN PAGE</p>} />
                <Route element={<ProtectedRoute roles={['student']} />}>
                  <Route path="/" element={<p>STUDENT HOME</p>} />
                </Route>
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(await screen.findByText('Sessiya muddati tugagan. Qaytadan kiring.')).toBeInTheDocument();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
