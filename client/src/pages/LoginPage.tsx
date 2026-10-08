import { useRef, useState, type FormEvent } from 'react';
import { ChartColumn, CircleCheck, KeyRound, Lock, LogIn, Sparkles, User, Users } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Logo } from '@/components/layout/Logo';
import type { LoginRedirectState } from '@/components/layout/ProtectedRoute';
import { Alert } from '@/components/ui/Alert';
import { RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DEMO_ACCOUNTS, type DemoAccount } from '@/constants/demoAccounts';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/utils/errors';
import { isPathAllowedForRole, roleHome } from '@/utils/roles';

const MSG_USERNAME_REQUIRED = 'Foydalanuvchi nomini kiriting.';
const MSG_PASSWORD_REQUIRED = 'Parolni kiriting.';

interface FieldErrors {
  username?: string;
  password?: string;
}

const FEATURES = [
  { icon: CircleCheck, text: "6 ta mavzuni kunlarga teng taqsimlash" },
  { icon: ChartColumn, text: 'Bajarilish foizini real vaqtda kuzatish' },
  { icon: Users, text: "O'qituvchi nazorati va umumiy statistika" },
];

export default function LoginPage() {
  useDocumentTitle('Tizimga kirish');
  const { status, user, login } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Already logged in (or just logged in) → go to the requested page if allowed, else the role's home.
  if (status === 'authenticated' && user) {
    const from = (location.state as LoginRedirectState | null)?.from;
    const fromPath = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : null;
    const target = from && fromPath && isPathAllowedForRole(user.role, from.pathname) ? fromPath : roleHome(user.role);
    return <Navigate to={target} replace />;
  }
  if (status === 'loading') return <PageLoader fullScreen label="Sessiya tekshirilmoqda…" />;

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!username.trim()) next.username = MSG_USERNAME_REQUIRED;
    if (!password) next.password = MSG_PASSWORD_REQUIRED;
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const found = validate();
    setErrors(found);
    if (found.username || found.password) {
      (found.username ? usernameRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(username, password);
      toast.success(`Xush kelibsiz, ${loggedIn.fullName}!`);
      // Redirect happens on re-render (status becomes "authenticated").
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.errors && (error.errors.username || error.errors.password)) {
        setErrors({ username: error.errors.username, password: error.errors.password });
        (error.errors.username ? usernameRef : passwordRef).current?.focus();
        return;
      }
      setServerError(getErrorMessage(error));
      if (error instanceof ApiError && error.status === 401) {
        setPassword('');
        passwordRef.current?.focus();
      }
    }
  };

  const fillDemo = (account: DemoAccount) => {
    setUsername(account.username);
    setPassword(account.password);
    setErrors({});
    setServerError(null);
    submitRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-12 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" aria-hidden="true" />
        <Logo inverted className="relative" />
        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-indigo-100 ring-1 ring-inset ring-white/20">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Aqlli o'quv rejalashtirish tizimi
          </p>
          <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Imtihonga aqlli va rejali tayyorlaning
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Mavzularni kunlarga teng taqsimlang, bajarilganini belgilang va natijangizni foizda kuzating.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-indigo-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">© {new Date().getFullYear()} Smart Study Planner</p>
      </aside>

      {/* Form side */}
      <main id="main" className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 justify-center px-4 pb-12 pt-2 sm:px-6 sm:pt-8 lg:items-center lg:pt-0">
          <div className="w-full max-w-md space-y-6">
            <div>
              <h1 className="page-title">Tizimga kirish</h1>
              <p className="page-subtitle">Davom etish uchun hisobingiz ma'lumotlarini kiriting.</p>
            </div>

            <Card>
              <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-describedby={serverError ? 'login-error' : undefined}>
                {serverError && (
                  <div id="login-error">
                    <Alert tone="danger">{serverError}</Alert>
                  </div>
                )}
                <TextField
                  ref={usernameRef}
                  label="Foydalanuvchi nomi"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="masalan, student"
                  leftIcon={<User />}
                  value={username}
                  error={errors.username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                    if (serverError) setServerError(null);
                  }}
                  required
                />
                <TextField
                  ref={passwordRef}
                  label="Parol"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leftIcon={<Lock />}
                  value={password}
                  error={errors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    if (serverError) setServerError(null);
                  }}
                  required
                />
                <Button
                  ref={submitRef}
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  loadingText="Kirilmoqda…"
                  leftIcon={<LogIn className="h-5 w-5" aria-hidden="true" />}
                >
                  Kirish
                </Button>
              </form>
            </Card>

            <Card>
              <CardHeader
                icon={<KeyRound />}
                title="Demo hisoblar"
                description="Hisobni tanlang — login va parol avtomatik to'ldiriladi."
              />
              <ul className="grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.username}>
                    <button
                      type="button"
                      onClick={() => fillDemo(account)}
                      className="group flex w-full flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                      aria-label={`${account.fullName} (${account.username}) hisobi bilan to'ldirish`}
                    >
                      <RoleBadge role={account.role} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{account.fullName}</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {account.username} / {account.password}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
