// Client-side filtering for the admin users list (role filter + free-text search).
import { ROLES, type AdminUser, type Role } from '@/api/types';

export type RoleFilter = 'all' | Role;

export const ROLE_FILTERS: readonly RoleFilter[] = ['all', ...ROLES];

/** Filter chip labels. */
export const ROLE_FILTER_LABELS: Readonly<Record<RoleFilter, string>> = Object.freeze({
  all: 'Hammasi',
  student: "O'quvchi",
  teacher: "O'qituvchi",
  admin: 'Administrator',
});

/** Parses a ?role= value; anything unknown means "all". */
export function parseRoleFilter(value: string | null | undefined): RoleFilter {
  return value && (ROLES as readonly string[]).includes(value) ? (value as Role) : 'all';
}

// Uzbek text is typed with many apostrophe look-alikes (o‘ g' oʻ g`…) — treat them all as "'".
const APOSTROPHES_RE = /[‘’ʻʼ`´′]/g;

/** Lower-cases, unifies apostrophes and collapses whitespace so "O‘quvchi" matches "o'quvchi". */
export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(APOSTROPHES_RE, "'").replace(/\s+/g, ' ').trim();
}

/** Text a user row can be found by: full name, login and (for students) the teacher's name. */
function searchableText(user: AdminUser): string {
  return normalizeSearchText([user.fullName, user.username, user.teacherName ?? ''].join(' '));
}

/**
 * Users matching the role filter and every word of the query (in any order).
 * A leading "@" is ignored so "@student" finds the login "student".
 */
export function filterUsers(users: readonly AdminUser[], role: RoleFilter, query: string): AdminUser[] {
  const terms = normalizeSearchText(query)
    .split(' ')
    .map((term) => term.replace(/^@+/, ''))
    .filter(Boolean);
  return users.filter((user) => {
    if (role !== 'all' && user.role !== role) return false;
    if (terms.length === 0) return true;
    const haystack = searchableText(user);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Number of users per filter chip. */
export function countByRole(users: readonly AdminUser[]): Record<RoleFilter, number> {
  const counts: Record<RoleFilter, number> = { all: users.length, student: 0, teacher: 0, admin: 0 };
  for (const user of users) {
    if (user.role in counts) counts[user.role] += 1;
  }
  return counts;
}

/** Teachers sorted by name (options of the "O'qituvchi" select). */
export function selectTeachers(users: readonly AdminUser[]): AdminUser[] {
  return users
    .filter((user) => user.role === 'teacher')
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
}

/** How many students are assigned to the given teacher. */
export function countAssignedStudents(users: readonly AdminUser[], teacherId: string): number {
  return users.reduce((sum, user) => (user.role === 'student' && user.teacherId === teacherId ? sum + 1 : sum), 0);
}
