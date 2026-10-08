import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import type { Role } from '@/api/types';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { roleHome } from '@/utils/roles';

/** Router state passed to /login so the user can be sent back after logging in. */
export interface LoginRedirectState {
  from?: Location;
}

export interface ProtectedRouteProps {
  /** Allowed roles. Omit to allow any authenticated user. */
  roles?: readonly Role[];
  /** Content to render; defaults to <Outlet /> (use as a layout route). */
  children?: ReactNode;
}

/**
 * Route guard:
 * - session being verified → full-screen loader
 * - anonymous → /login (with `state.from` = current location)
 * - wrong role → that role's home (student "/", teacher "/teacher", admin "/admin")
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader fullScreen label="Sessiya tekshirilmoqda…" />;
  if (!user) {
    const state: LoginRedirectState = { from: location };
    return <Navigate to="/login" replace state={state} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children !== undefined ? <>{children}</> : <Outlet />;
}
