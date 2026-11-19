import React from 'react';
import { Sun, Moon } from 'lucide-react';

export interface ThemeToggleProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme = 'light',
  onToggleTheme,
  className = '',
}) => {
  if (!onToggleTheme) return null;
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      className={`min-w-10 min-h-10 w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#0F6E6E] dark:text-cyan-400 motion-safe:hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${className}`}
      title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
      aria-label="تبديل الوضع الليلي والنهاري"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" aria-hidden="true" />
      )}
    </button>
  );
};
