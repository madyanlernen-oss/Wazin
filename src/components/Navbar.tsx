import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  GitCompare,
  Target,
  RotateCcw,
  LogOut,
  LogIn,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import { WazanLogo } from './WazanLogo';

interface NavbarProps {
  currentScreen: 'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix';
  onNavigate: (screen: 'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix') => void;
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onReset: () => void;
  completedCount?: number;
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
  completedCount: _completedCount,
  theme = 'light',
  onToggleTheme,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // If on the dedicated login page, show ONLY the program name and logo + theme toggle!
  if (currentScreen === 'login') {
    return (
      <header className="sticky top-0 z-40 bg-white/92 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            onClick={() => onNavigate('landing')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <WazanLogo size="md" />
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#0B6E72] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
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

  // If on landing page and not signed in: show brand on right, theme toggle and secondary "تسجيل الدخول" in top bar
  if (!userProfile) {
    return (
      <header className="sticky top-0 z-40 bg-white/92 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate('landing')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <WazanLogo size="md" />
          </div>

          {/* Top Actions: Theme Switcher & Secondary Ghost Login Button */}
          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#0B6E72] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
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

            {/* Secondary CTA: Clean outline pill that defers prominence to the hero primary button */}
            <button
              onClick={() => {
                if (onNavigateToAuth) onNavigateToAuth('login');
                else onNavigate('login');
              }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-transparent hover:bg-[#0B6E72]/10 dark:hover:bg-cyan-950/40 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/30 dark:border-cyan-500/35 hover:border-[#0B6E72]/60 dark:hover:border-cyan-400/60 text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Inside app when user is logged in
  return (
    <header className="sticky top-0 z-40 bg-white/92 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <WazanLogo size="sm" />
        </div>

        {/* Navigation Tabs (Only when authenticated inside dashboard/tools) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              currentScreen === 'dashboard'
                ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">عجلة الحياة</span>
            <span className="md:hidden">العجلة</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('goals_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              currentScreen === 'goals_matrix'
                ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="hidden md:inline">أهدافي (أيزنهاور)</span>
            <span className="md:hidden">أهدافي</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              currentScreen === 'comparison'
                ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span className="hidden md:inline">المقارنة</span>
            <span className="md:hidden">المقارنة</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('advisor_chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              currentScreen === 'advisor_chat'
                ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">المستشارون</span>
            <span className="md:hidden">المستشارون</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('onboarding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              currentScreen === 'onboarding'
                ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden md:inline">قيّم أسبوعك الآن</span>
            <span className="md:hidden">التقييم</span>
          </button>
        </nav>

        {/* Top Actions: Theme toggle, User name, Reset & Sign out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-[#0B6E72] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
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

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xs">
            <div className="w-6 h-6 rounded-lg bg-[#0B6E72]/15 dark:bg-cyan-500/20 border border-[#0B6E72]/20 dark:border-cyan-500/30 flex items-center justify-center text-xs text-[#0B6E72] dark:text-cyan-300 font-black">
              {userProfile.name.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#0F172A] dark:text-white leading-none">{userProfile.name}</span>
              <span className="text-[9.5px] text-[#0B6E72] dark:text-cyan-400 font-semibold mt-0.5">نشط الآن</span>
            </div>
          </div>

          {/* Reset Evaluation Button (Guarded with Confirmation Modal) */}
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            title="إعادة ضبط التقييم والبيانات"
            aria-label="إعادة ضبط التقييم والبيانات"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Sign Out (تسجيل الخروج) */}
          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج من الحساب"
            aria-label="تسجيل الخروج"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#475569] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/50 text-xs font-bold transition-all shadow-xs group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-[#FBBF24] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                تأكيد إعادة تعيين التقييم
              </h3>
              <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في مسح كافة التقييمات والأهداف والبدء بحساب نظيف؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B161C] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء والاحتفاظ بالبيانات
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                نعم، إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
