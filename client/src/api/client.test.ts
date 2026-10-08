import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '@/test/utils';
import { TOKEN_KEY } from '@/utils/storage';
import {
  AUTH_LOGOUT_EVENT,
  ApiError,
  NETWORK_ERROR_MESSAGE,
  createPlan,
  deleteUser,
  getPlan,
  listUsers,
  login,
  setTopicCompleted,
} from './client';

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON with the Bearer token and returns the parsed body', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    fetchMock.mockResolvedValueOnce(jsonResponse({ plan: { id: 'p1' } }));
    const result = await setTopicCompleted('p1', 't3', true);
    expect(result).toEqual({ plan: { id: 'p1' } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/plans/p1/topics/t3');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ completed: true }));
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc.def.ghi');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does not send a token to the login endpoint and trims the username', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'old-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 't', user: { id: 'u1' } }));
    await login('  student ', 'student123');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({ username: 'student', password: 'student123' });
  });

  it('turns a network failure into ApiError(status 0) with the Uzbek message', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await getPlan('p1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).isNetworkError).toBe(true);
    expect((error as ApiError).message).toBe("Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.");
    expect((error as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('treats a non-JSON 5xx (proxy / gateway) as unreachable server', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    const error = (await getPlan('p1').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(500);
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('exposes the server message, field errors and topicErrors on 400', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'tok');
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "Ma'lumotlarda xatolik bor.",
          errors: { daysCount: "Kunlar soni kamida 1 bo'lishi kerak." },
          topicErrors: [null, 'Barcha 6 ta mavzuni kiriting.', null, null, null, null],
        },
        400,
      ),
    );
    const error = (await createPlan({
      title: 'a',
      subject: 'b',
      daysCount: 0,
      dailyMinutes: 60,
      startDate: '2026-10-10',
      topics: ['1', '', '3', '4', '5', '6'],
    }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Ma'lumotlarda xatolik bor.");
    expect(error.errors).toEqual({ daysCount: "Kunlar soni kamida 1 bo'lishi kerak." });
    expect(error.topicErrors?.[1]).toBe('Barcha 6 ta mavzuni kiriting.');
    // A 400 must not log the user out.
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('on 401 clears the token and fires the auth:logout event', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'expired');
    const listener = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, listener);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Sessiya muddati tugagan. Qaytadan kiring.' }, 401));
    const error = (await getPlan('p1').catch((e: unknown) => e)) as ApiError;
    window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
    expect(error.status).toBe(401);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      message: 'Sessiya muddati tugagan. Qaytadan kiring.',
    });
  });

  it('a 401 from the login form (wrong password) does not fire auth:logout', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, listener);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Login yoki parol noto'g'ri." }, 401));
    const error = (await login('student', 'bad').catch((e: unknown) => e)) as ApiError;
    window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
    expect(error.message).toBe("Login yoki parol noto'g'ri.");
    expect(listener).not.toHaveBeenCalled();
  });

  it('falls back to Uzbek status messages when the body has none', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 403));
    const error = (await deleteUser('u1').catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe("Bu amalni bajarish uchun ruxsatingiz yo'q.");
  });

  it('encodes path segments and builds query strings', async () => {
    // A Response body can be read only once — build a fresh one per call.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ users: [] })));
    await listUsers('teacher');
    await listUsers();
    await getPlan('a/b');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/users?role=teacher');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/users');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/plans/a%2Fb');
  });

  it('propagates aborts as AbortError (not ApiError)', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const promise = getPlan('p1', { signal: controller.signal });
    controller.abort();
    const error = await promise.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe('AbortError');
  });
});
