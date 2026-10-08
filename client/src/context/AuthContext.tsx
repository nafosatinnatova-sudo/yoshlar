import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AUTH_LOGOUT_EVENT,
  ApiError,
  SESSION_EXPIRED_MESSAGE,
  getMe,
  isAbortError,
  login as apiLogin,
  type AuthLogoutDetail,
} from '@/api/client';
import type { PublicUser } from '@/api/types';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/errors';
import { TOKEN_KEY, tokenStorage } from '@/utils/storage';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  /** 'loading' while a stored token is being verified on boot. */
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Logs in, stores the token, returns the user. Throws ApiError (400 field errors / 401 / 429 / network). */
  login: (username: string, password: string) => Promise<PublicUser>;
  /** Clears the session and navigates to /login. */
  logout: () => void;
  /** Re-fetches the current user (GET /api/auth/me). Returns null if the session is gone. */
  refreshUser: () => Promise<PublicUser | null>;
}

interface SessionState {
  user: PublicUser | null;
  token: string | null;
  status: AuthStatus;
}

const ANONYMOUS: SessionState = { user: null, token: null, status: 'anonymous' };

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Start already authenticated without calling the API (tests / storybook-like usage).
   * When omitted, a token found in localStorage is verified with GET /api/auth/me.
   */
  initialSession?: { user: PublicUser; token: string } | null;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setStateRaw] = useState<SessionState>(() => {
    if (initialSession) return { user: initialSession.user, token: initialSession.token, status: 'authenticated' };
    return tokenStorage.get() ? { user: null, token: null, status: 'loading' } : ANONYMOUS;
  });

  // Mirror of the latest state for event handlers (avoids stale closures and duplicate handling).
  const stateRef = useRef(state);
  const setState = useCallback((next: SessionState) => {
    stateRef.current = next;
    setStateRaw(next);
  }, []);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const locationRef = useRef(location);
  locationRef.current = location;

  /* ---------------- Boot: verify the stored token ---------------- */
  useEffect(() => {
    if (initialSession) return;
    const stored = tokenStorage.get();
    if (!stored) {
      if (stateRef.current.status === 'loading') setState(ANONYMOUS);
      return;
    }
    const controller = new AbortController();
    getMe({ signal: controller.signal })
      .then(({ user }) => setState({ user, token: stored, status: 'authenticated' }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        if (error instanceof ApiError && error.status === 401) {
          // Token already cleared by the API client; the auth:logout handler shows the message.
          setState(ANONYMOUS);
          return;
        }
        // Server unreachable etc.: keep the token (a later reload may succeed) but let the user log in again.
        setState(ANONYMOUS);
        toast.error(getErrorMessage(error));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /* ---------------- 401 from any request → session expired ---------------- */
  useEffect(() => {
    const onLogout = (event: Event) => {
      const detail = (event as CustomEvent<AuthLogoutDetail>).detail;
      const hadSession = stateRef.current.status !== 'anonymous';
      setState(ANONYMOUS);
      if (!hadSession) return;
      toast.error(detail?.message || SESSION_EXPIRED_MESSAGE);
      if (locationRef.current.pathname !== '/login') {
        navigateRef.current('/login', { replace: true, state: { from: locationRef.current } });
      }
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, [setState, toast]);

  /* ---------------- Cross-tab sync (login/logout in another tab) ---------------- */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      const newToken = tokenStorage.get();
      const current = stateRef.current;
      if (!newToken) {
        if (current.status === 'authenticated') {
          setState(ANONYMOUS);
          navigateRef.current('/login', { replace: true });
        }
        return;
      }
      if (newToken === current.token) return;
      getMe()
        .then(({ user }) => {
          setState({ user, token: newToken, status: 'authenticated' });
        })
        .catch(() => setState(ANONYMOUS));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setState]);

  /* ---------------- Actions ---------------- */
  const login = useCallback(
    async (username: string, password: string): Promise<PublicUser> => {
      const { token, user } = await apiLogin(username, password);
      tokenStorage.set(token);
      setState({ user, token, status: 'authenticated' });
      return user;
    },
    [setState],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setState(ANONYMOUS);
    navigateRef.current('/login', { replace: true });
  }, [setState]);

  const refreshUser = useCallback(async (): Promise<PublicUser | null> => {
    const token = tokenStorage.get();
    if (!token) {
      setState(ANONYMOUS);
      return null;
    }
    try {
      const { user } = await getMe();
      setState({ user, token, status: 'authenticated' });
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }, [setState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      token: state.token,
      status: state.status,
      isAuthenticated: state.status === 'authenticated' && state.user !== null,
      login,
      logout,
      refreshUser,
    }),
    [state, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Session state + actions. Must be used inside <AuthProvider> (which must be inside a Router). */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * The logged-in user. Use only in pages rendered behind <ProtectedRoute> (user is guaranteed there).
 * Throws if called while anonymous.
 */
export function useCurrentUser(): PublicUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without an authenticated user');
  return user;
}
