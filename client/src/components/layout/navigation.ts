import { CirclePlus, FolderOpen, House, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/api/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Whether the item is active for a pathname. */
  match: (pathname: string) => boolean;
}

/** Header navigation per role. */
export const NAV_ITEMS: Readonly<Record<Role, readonly NavItem[]>> = {
  student: [
    { to: '/', label: 'Bosh sahifa', icon: House, match: (p) => p === '/' },
    { to: '/plans/new', label: 'Yangi reja', icon: CirclePlus, match: (p) => p === '/plans/new' },
    {
      to: '/plans',
      label: 'Mening rejalarim',
      icon: FolderOpen,
      match: (p) => p === '/plans' || (p.startsWith('/plans/') && p !== '/plans/new'),
    },
  ],
  teacher: [{ to: '/teacher', label: "O'quvchilar", icon: Users, match: (p) => p === '/teacher' || p.startsWith('/teacher/') }],
  admin: [{ to: '/admin', label: 'Admin panel', icon: ShieldCheck, match: (p) => p === '/admin' || p.startsWith('/admin/') }],
};
