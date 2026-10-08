import { Suspense, useEffect, useRef, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { PublicUser } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { roleHome } from '@/utils/roles';
import { ErrorBoundary } from './ErrorBoundary';
import { Logo } from './Logo';
import { NAV_ITEMS, type NavItem } from './navigation';

/**
 * Authenticated app shell: sticky header (logo, role-based nav, theme toggle, user + role badge,
 * "Chiqish"), mobile hamburger menu, main container (max-w-6xl) and footer.
 * Renders child routes through <Outlet /> inside a Suspense boundary (lazy pages).
 */
export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="btn btn-primary btn-sm sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60]"
      >
        Asosiy tarkibga o'tish
      </a>
      <AppHeader />
      <main id="main" tabIndex={-1} className="container-page flex-1 py-6 focus:outline-none sm:py-8">
        {/* Keyed by path: a crashing page keeps the header usable and recovers on navigation. */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <AppFooter />
    </div>
  );
}

function AppHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const items: readonly NavItem[] = user ? NAV_ITEMS[user.role] ?? [] : [];

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close on Esc / outside click / switching to desktop width.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:border-slate-800 dark:bg-slate-950/85 dark:supports-[backdrop-filter]:bg-slate-950/70"
    >
      <div className="container-page flex h-16 items-center gap-3">
        <Link
          to={roleHome(user?.role)}
          className="-ml-1 flex shrink-0 items-center rounded-xl p-1"
          aria-label="Smart Study Planner — bosh sahifa"
        >
          <Logo />
        </Link>

        <nav aria-label="Asosiy menyu" className="ml-6 hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <NavLinkItem key={item.to} item={item} active={item.match(location.pathname)} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user && (
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800 lg:flex">
              <UserBlock user={user} />
              <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                Chiqish
              </Button>
            </div>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            className="btn btn-ghost btn-icon lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="animate-slide-down border-t border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 lg:hidden"
        >
          <div className="container-page space-y-4 py-4">
            <nav aria-label="Mobil menyu" className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLinkItem key={item.to} item={item} active={item.match(location.pathname)} mobile />
              ))}
            </nav>
            {user && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <UserBlock user={user} />
                <Button variant="secondary" size="sm" onClick={logout} leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                  Chiqish
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLinkItem({ item, active, mobile = false }: { item: NavItem; active: boolean; mobile?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        mobile ? 'px-3 py-3 text-base' : 'px-3 py-2 text-sm',
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function UserBlock({ user }: { user: PublicUser }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={user.fullName || user.username} size="sm" />
      <div className="min-w-0 leading-tight">
        <p className="max-w-[12rem] truncate text-sm font-semibold text-slate-900 dark:text-white" title={user.fullName}>
          {user.fullName || user.username}
        </p>
        <RoleBadge role={user.role} className="mt-0.5" />
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800">
      <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:text-left">
        <p>© {new Date().getFullYear()} Smart Study Planner</p>
        <p>Imtihonga aqlli va rejali tayyorgarlik</p>
      </div>
    </footer>
  );
}
