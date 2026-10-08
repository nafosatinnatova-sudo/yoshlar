import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { buttonClasses } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { roleHome } from '@/utils/roles';

export default function NotFoundPage() {
  useDocumentTitle('Sahifa topilmadi');
  const { user } = useAuth();
  const home = user ? roleHome(user.role) : '/login';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container-page flex items-center justify-between py-4">
        <Link to={home} className="rounded-xl p-1" aria-label="Smart Study Planner — bosh sahifa">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <SearchX className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
            404
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Sahifa topilmadi</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Siz qidirgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.
          </p>
          <Link to={home} className={buttonClasses({ variant: 'primary', size: 'lg', className: 'mt-8' })}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            {user ? 'Bosh sahifaga qaytish' : 'Kirish sahifasiga qaytish'}
          </Link>
        </div>
      </main>
    </div>
  );
}
