import type { Role } from '@/api/types';

export interface DemoAccount {
  role: Role;
  username: string;
  password: string;
  fullName: string;
}

/** Seeded demo accounts (docs/CONTRACT.md §6) — shown on the login page for judges. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'admin', username: 'admin', password: 'admin123', fullName: 'Administrator' },
  { role: 'teacher', username: 'teacher', password: 'teacher123', fullName: 'Dilnoza Karimova' },
  { role: 'student', username: 'student', password: 'student123', fullName: 'Ali Valiyev' },
  { role: 'student', username: 'student2', password: 'student123', fullName: 'Madina Rahimova' },
];
