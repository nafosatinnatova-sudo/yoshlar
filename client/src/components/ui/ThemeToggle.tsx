import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';

/** Light/Dark switch button (aria-label "Yorug'/Qorong'i rejim", aria-pressed = dark). */
export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Yorug'/Qorong'i rejim"
      aria-pressed={isDark}
      title={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
      className={cn('btn btn-ghost btn-icon', className)}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
