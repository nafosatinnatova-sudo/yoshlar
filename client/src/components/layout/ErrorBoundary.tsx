import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** A failed lazy chunk (usually after a new deploy) — a reload fixes it. */
function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );
}

/** Catches render errors and shows a friendly Uzbek fallback instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep a trace in the console for debugging; users see the fallback UI.
    console.error('UI error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    const chunk = isChunkLoadError(error);
    return (
      <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {chunk ? 'Ilova yangilangan' : 'Kutilmagan xatolik yuz berdi'}
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {chunk
            ? "Sahifani yangilang — ilovaning yangi versiyasi yuklanadi."
            : "Sahifani ko'rsatishda muammo yuz berdi. Sahifani yangilab, qaytadan urinib ko'ring."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Sahifani yangilash
          </button>
          {!chunk && (
            <a href="/" className="btn btn-secondary btn-md">
              Bosh sahifaga qaytish
            </a>
          )}
        </div>
      </div>
    );
  }
}
