import { screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_USERS } from '@/test/fixtures';
import { jsonResponse, renderWithProviders } from '@/test/utils';
import { TOKEN_KEY } from '@/utils/storage';
import LoginPage from './LoginPage';

function renderLogin() {
  return renderWithProviders(<LoginPage />, {
    route: '/login',
    path: '/login',
    extraRoutes: (
      <>
        <Route path="/" element={<p>STUDENT HOME</p>} />
        <Route path="/teacher" element={<p>TEACHER HOME</p>} />
        <Route path="/admin" element={<p>ADMIN HOME</p>} />
      </>
    ),
  });
}

describe('LoginPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows errors under the empty fields and does not call the API', async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Kirish' }));
    const username = screen.getByLabelText(/Foydalanuvchi nomi/);
    const password = screen.getByLabelText(/^Parol\*?$/);
    expect(screen.getByText('Foydalanuvchi nomini kiriting.')).toBeInTheDocument();
    expect(screen.getByText('Parolni kiriting.')).toBeInTheDocument();
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fills the form from a demo account card', async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole('button', { name: /teacher\) hisobi bilan to'ldirish/ }));
    expect(screen.getByLabelText(/Foydalanuvchi nomi/)).toHaveValue('teacher');
    expect(screen.getByLabelText(/^Parol\*?$/)).toHaveValue('teacher123');
  });

  it('lists all four demo accounts', () => {
    renderLogin();
    expect(screen.getByText('admin / admin123')).toBeInTheDocument();
    expect(screen.getByText('teacher / teacher123')).toBeInTheDocument();
    expect(screen.getByText('student / student123')).toBeInTheDocument();
    expect(screen.getByText('student2 / student123')).toBeInTheDocument();
  });

  it('shows the server message on wrong credentials', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Login yoki parol noto'g'ri." }, 401));
    const { user } = renderLogin();
    await user.type(screen.getByLabelText(/Foydalanuvchi nomi/), 'student');
    await user.type(screen.getByLabelText(/^Parol\*?$/), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));
    expect(await screen.findByText("Login yoki parol noto'g'ri.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Parol\*?$/)).toHaveValue('');
  });

  it('shows the network error message when the server is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { user } = renderLogin();
    await user.type(screen.getByLabelText(/Foydalanuvchi nomi/), 'student');
    await user.type(screen.getByLabelText(/^Parol\*?$/), 'student123');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));
    expect(await screen.findByText("Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.")).toBeInTheDocument();
  });

  it.each([
    ['student', '/', 'STUDENT HOME'],
    ['teacher', '/teacher', 'TEACHER HOME'],
    ['admin', '/admin', 'ADMIN HOME'],
  ] as const)('logs in as %s, stores the token and redirects to %s', async (role, _path, marker) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: `jwt-${role}`, user: TEST_USERS[role] }));
    const { user } = renderLogin();
    await user.type(screen.getByLabelText(/Foydalanuvchi nomi/), role);
    await user.type(screen.getByLabelText(/^Parol\*?$/), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));
    expect(await screen.findByText(marker)).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(TOKEN_KEY)).toBe(`jwt-${role}`));
  });
});
