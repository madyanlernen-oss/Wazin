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
} from 'lucide-react';
import { Screen, UserProfile } from '../types/lifeBalance';
import { WazanLogo } from './WazanLogo';
import { ConfirmDialog } from './ConfirmDialog';
import { ThemeToggle } from './ThemeToggle';
import { NAV_ITEMS } from '../config/navItems';

interface NavbarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onReset: () => void;
  completedCount?: number;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

// 8. HeaderShell wrapper for consistent sticky header styling
interface HeaderShellProps {
  children: React.ReactNode;
}

const HeaderShell: React.FC<HeaderShellProps> = ({ children }) => (
  <header className="sticky top-0 z-40 bg-white/92 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-2">
      {children}
    </div>
  </header>
);


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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Dedicated login page state: logo button + theme toggle
  if (currentScreen === 'login') {
    return (
      <HeaderShell>
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          aria-label="وزان، الصفحة الرئيسية"
          className="cursor-pointer transition-transform motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 rounded-xl"
        >
          <WazanLogo size="md" />
        </button>

        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </HeaderShell>
    );
  }

  // 2. Landing page / Unauthenticated guest state
  if (!userProfile) {
    return (
      <HeaderShell>
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          aria-label="وزان، الصفحة الرئيسية"
          className="cursor-pointer transition-transform motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 rounded-xl"
        >
          <WazanLogo size="md" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

          {/* Secondary CTA: Login Pill */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToAuth) onNavigateToAuth('login');
              else onNavigate('login');
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 min-h-10 rounded-full bg-transparent hover:bg-[#0B6E72]/10 dark:hover:bg-cyan-950/40 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/30 dark:border-cyan-500/35 hover:border-[#0B6E72]/60 dark:hover:border-cyan-400/60 text-xs sm:text-sm font-bold transition-all motion-safe:hover:scale-105 active:scale-95 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
          >
            <LogIn className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" aria-hidden="true" />
            <span>تسجيل الدخول</span>
          </button>
        </div>
      </HeaderShell>
    );
  }

  // 3. Authenticated inside app state
  return (
    <HeaderShell>
      {/* 1. Brand Logo Button */}
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        aria-label="وزان، الصفحة الرئيسية"
        className="cursor-pointer transition-transform motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 rounded-xl flex-shrink-0"
      >
        <WazanLogo size="sm" />
      </button>

      {/* 7 & 9. Navigation Tabs with aria-label, aria-current, and responsive icon-collapse */}
      <nav aria-label="التنقل الرئيسي" className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {NAV_ITEMS.filter((item) => item.inTopBar).map((item) => {
          const isActive = currentScreen === item.screen;
          const isAssessmentTab = item.screen === 'onboarding';
          const hasBadge = isAssessmentTab && completedCount !== undefined && completedCount < 8;

          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onNavigate(item.screen)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-10 min-w-10 sm:min-w-0 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
                isActive
                  ? 'bg-[#0B6E72] dark:bg-[#0891B2] text-white shadow-xs font-black'
                  : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {/* 15. Responsive label collapse: below 640px icon-only with sr-only, short label on sm, full on md */}
              <span className="sr-only sm:not-sr-only sm:inline md:hidden">{item.shortLabel}</span>
              <span className="sr-only md:not-sr-only md:inline">{item.label}</span>

              {/* 3. Completed Count Badge (n/8) */}
              {hasBadge && (
                <span
                  dir="ltr"
                  className="[unicode-bidi:isolate] text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 leading-none"
                  aria-label={`${completedCount} من 8 مكتمل`}
                >
                  {completedCount}/8
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Top Actions: Theme toggle, User badge, Reset & Sign out */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

        {/* 5. Safe Unicode user avatar & name display (removed hardcoded "نشط الآن") */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 min-h-10 rounded-xl shadow-xs">
          <div className="w-6 h-6 rounded-lg bg-[#0B6E72]/15 dark:bg-cyan-500/20 border border-[#0B6E72]/20 dark:border-cyan-500/30 flex items-center justify-center text-xs text-[#0B6E72] dark:text-cyan-300 font-black">
            {Array.from(userProfile.name.trim())[0] ?? '؟'}
          </div>
          <span className="hidden sm:inline text-xs font-bold text-[#0F172A] dark:text-white leading-none">
            {userProfile.name}
          </span>
        </div>

        {/* 11 & 14. Reset Button with 40x40px target, text-slate-600/400 contrast */}
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          title="إعادة ضبط التقييم والبيانات"
          aria-label="إعادة ضبط التقييم والبيانات"
          className="min-w-10 min-h-10 w-10 h-10 p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* 13 & 14. Sign Out button with motion-safe transition */}
        <button
          type="button"
          onClick={onSignOut}
          title="تسجيل الخروج من الحساب"
          aria-label="تسجيل الخروج"
          className="flex items-center gap-1.5 px-3 py-1.5 min-h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#475569] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/50 text-xs font-bold transition-all shadow-xs group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500 motion-safe:group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </button>
      </div>

      {/* 2. Reusable Native Accessible HTML5 ConfirmDialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="تأكيد إعادة تعيين التقييم"
        description="هل أنت متأكد من رغبتك في مسح كافة التقييمات والأهداف والبدء بحساب نظيف؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه."
        confirmLabel="نعم، إعادة الضبط"
        cancelLabel="إلغاء والاحتفاظ بالبيانات"
        variant="danger"
        onConfirm={() => {
          setShowResetConfirm(false);
          onReset();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </HeaderShell>
  );
};
