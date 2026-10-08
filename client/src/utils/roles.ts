import type { Role } from '@/api/types';

/** Uzbek role names. */
export const ROLE_LABELS: Readonly<Record<Role, string>> = Object.freeze({
  student: "O'quvchi",
  teacher: "O'qituvchi",
  admin: 'Administrator',
});

/** Home route of every role (redirect target after login / on wrong-role access). */
export const ROLE_HOME: Readonly<Record<Role, string>> = Object.freeze({
  student: '/',
  teacher: '/teacher',
  admin: '/admin',
});

/** "O'quvchi" | "O'qituvchi" | "Administrator" (falls back to the raw value). */
export function roleLabel(role: Role | string | null | undefined): string {
  if (!role) return '';
  return (ROLE_LABELS as Record<string, string>)[role] ?? String(role);
}

/** Home path for a role: student → "/", teacher → "/teacher", admin → "/admin". */
export function roleHome(role: Role | null | undefined): string {
  return role ? ROLE_HOME[role] ?? '/' : '/login';
}

/** Whether a pathname belongs to the given role's area (used to honour "from" after login). */
export function isPathAllowedForRole(role: Role, pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0] || '/';
  switch (role) {
    case 'student':
      return path === '/' || path === '/plans' || path.startsWith('/plans/');
    case 'teacher':
      return path === '/teacher' || path.startsWith('/teacher/');
    case 'admin':
      return path === '/admin' || path.startsWith('/admin/');
    default:
      return false;
  }
}
