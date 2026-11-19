import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  ClipboardList,
  GitCompare,
  Target,
  RotateCcw,
  LogOut,
  LogIn,
  UserPlus,
  Sun,
  Moon,
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import { TadbeerLogo } from './TadbeerLogo';

interface NavbarProps {
  currentScreen: 'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix';
  onNavigate: (screen: 'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix') => void;
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onReset: () => void;
  completedCount: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  onNavigateToAuth,
  userProfile,
  onSignOut,
  onReset,
  completedCount,
  theme = 'light',
  onToggleTheme,
}) => {
  // If on the dedicated login page, show ONLY the program name and logo + theme toggle!
  if (currentScreen === 'login') {
    return (
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-[#eae3d5] dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            onClick={() => onNavigate('landing')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <TadbeerLogo size="md" />
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl border border-[#eae3d5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#1b605b] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              aria-label="تبديل الوضع الليلي والنهاري"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}
        </div>
      </header>
    );
  }

  // If on landing page and not signed in: show brand on right, theme toggle and "تسجيل الدخول" in top bar
  if (!userProfile) {
    return (
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-[#eae3d5] dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate('landing')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <TadbeerLogo size="md" />
          </div>

          {/* Top Actions: Theme Switcher & Login Button */}
          <div className="flex items-center gap-2.5">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2.5 rounded-xl border border-[#eae3d5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#1b605b] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                aria-label="تبديل الوضع الليلي والنهاري"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            <button
              onClick={() => {
                if (onNavigateToAuth) onNavigateToAuth('login');
                else onNavigate('login');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b605b] hover:bg-[#16504c] dark:bg-gradient-to-r dark:from-cyan-600 dark:to-teal-600 dark:hover:from-cyan-500 dark:hover:to-teal-500 text-white text-xs font-black transition-all shadow-sm shadow-[#1b605b]/20 hover:shadow-md cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Inside app when user is logged in
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-[#eae3d5] dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <TadbeerLogo size="sm" />
        </div>

        {/* Navigation Tabs (Only when authenticated inside dashboard/tools) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm'
                : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#f1ebd8] dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">عجلة الحياة</span>
            <span className="md:hidden">العجلة</span>
          </button>

          <button
            onClick={() => onNavigate('goals_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentScreen === 'goals_matrix'
                ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm'
                : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#f1ebd8] dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="hidden md:inline">أهدافي (أيزنهاور)</span>
            <span className="md:hidden">أهدافي</span>
          </button>

          <button
            onClick={() => onNavigate('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentScreen === 'comparison'
                ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm'
                : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#f1ebd8] dark:hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span className="hidden md:inline">المقارنة</span>
            <span className="md:hidden">المقارنة</span>
          </button>

          <button
            onClick={() => onNavigate('advisor_chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentScreen === 'advisor_chat'
                ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm'
                : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#f1ebd8] dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">المستشارون</span>
            <span className="md:hidden">المستشارون</span>
          </button>

          <button
            onClick={() => onNavigate('onboarding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentScreen === 'onboarding'
                ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm'
                : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#f1ebd8] dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden md:inline">قيّم أسبوعك الآن</span>
            <span className="md:hidden">التقييم</span>
          </button>
        </nav>

        {/* Top Actions: Theme toggle, User name & Sign out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-[#eae3d5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#1b605b] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              aria-label="تبديل الوضع الليلي والنهاري"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-[#eae3d5] dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xs">
            <div className="w-6 h-6 rounded-lg bg-[#1b605b]/10 dark:bg-cyan-500/20 border border-[#1b605b]/20 dark:border-cyan-500/30 flex items-center justify-center text-xs text-[#1b605b] dark:text-cyan-300 font-black">
              {userProfile.name.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#1d2e2b] dark:text-white leading-none">{userProfile.name}</span>
              <span className="text-[9px] text-[#1b605b] dark:text-cyan-400 font-semibold mt-0.5">نشط الآن</span>
            </div>
          </div>

          {/* Reset Evaluation */}
          <button
            onClick={onReset}
            title="إعادة تعيين التقييم"
            className="p-2 rounded-xl text-[#6b7d79] dark:text-slate-400 hover:text-[#b88d3b] hover:bg-[#f1ebd8] dark:hover:bg-slate-700 border border-[#eae3d5] dark:border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Sign Out (تسجيل الخروج) */}
          <button
            onClick={onSignOut}
            title="تسجيل الخروج من الحساب"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#536561] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-[#eae3d5] dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/50 text-xs font-bold transition-all shadow-xs group"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
