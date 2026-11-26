import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, LogOut, X, Lock } from 'lucide-react';
import { Screen, UserProfile } from '../types/lifeBalance';
import { isCoordinatorUnlockedInStorage } from '../utils/storage';
import { WazanLogo } from './WazanLogo';
import { ConfirmDialog } from './ConfirmDialog';
import { ThemeToggle } from './ThemeToggle';
import { NAV_ITEMS } from '../config/navItems';

export type SidebarScreen = Exclude<Screen, 'landing' | 'login'>;

export interface SidebarProps {
  currentScreen: SidebarScreen;
  onNavigate: (screen: SidebarScreen) => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onReset: () => void;
  completedCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  openerRef?: React.RefObject<HTMLElement | null>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  userProfile,
  onSignOut,
  onReset,
  completedCount,
  isOpenMobile = false,
  onCloseMobile,
  theme = 'light',
  onToggleTheme,
  openerRef,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // 1. Mobile drawer accessibility: focus trap, Escape to close, scroll lock, focus return
  useEffect(() => {
    if (isOpenMobile) {
      // Save previously focused element to return focus upon closing drawer
      triggerElementRef.current = openerRef?.current || (document.activeElement as HTMLElement | null);

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Move focus to close button
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCloseMobile?.();
          return;
        }

        if (e.key === 'Tab' && drawerRef.current) {
          const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleKeyDown);
        // Return focus to opening trigger
        triggerElementRef.current?.focus();
      };
    }
  }, [isOpenMobile, onCloseMobile, openerRef]);

  const handleSelectNav = (screen: Screen) => {
    if (screen === 'director_summary' && completedCount < 8 && !isCoordinatorUnlockedInStorage()) {
      onNavigate('dashboard');
      if (onCloseMobile) onCloseMobile();
      return;
    }
    onNavigate(screen as SidebarScreen);
    if (onCloseMobile) onCloseMobile();
  };

  // 5. Safe Unicode initial
  const avatarInitial = Array.from((userProfile?.name || '').trim())[0] ?? 'و';

  const sidebarContent = (
    <div className="h-dvh flex flex-col justify-between p-4 sm:p-5 select-none bg-white dark:bg-[#0B161C] text-right border-e border-slate-200/90 dark:border-slate-800/80 transition-colors">
      {/* Top: Logo & Navigation */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Brand Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/90 dark:border-slate-800/80 flex-shrink-0">
          {/* 4. Logo as accessible button */}
          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            aria-label="وزان، لوحة التحكم"
            className="cursor-pointer transition-transform motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 rounded-xl text-right p-0.5"
          >
            <WazanLogo size="md" />
          </button>

          <div className="flex items-center gap-1.5">
            {/* 10. Shared ThemeToggle component */}
            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
            )}

            {/* 15. Mobile drawer close button (at least 44x44px touch target) */}
            {onCloseMobile && (
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden min-w-[44px] min-h-[44px] w-[44px] h-[44px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* 11. Navigation Links wrapped in nav landmark */}
        <nav aria-label="القائمة الرئيسية" className="mt-6 space-y-1 overflow-y-auto flex-1">
          {/* 12 & 13. Menu heading with text-slate-600 and text-xs */}
          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 px-3 block mb-2 tracking-wider">
            القائمة الرئيسية
          </span>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isDirectorItem = item.screen === 'director_summary';
            const isDirectorUnlocked = completedCount >= 8 || isCoordinatorUnlockedInStorage();
            const isDirectorLocked = isDirectorItem && !isDirectorUnlocked;
            const isActive =
              currentScreen === item.screen ||
              (item.screen === 'thirty_day_plan' && currentScreen === 'goals_matrix') ||
              (item.screen === 'dashboard' && currentScreen === 'director_summary' && !isDirectorUnlocked);

            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => handleSelectNav(item.screen)}
                aria-current={isActive ? 'page' : undefined}
                title={
                  isDirectorLocked
                    ? `يُفتح بعد إكمال التقييم (${completedCount} / 8)`
                    : undefined
                }
                className={`w-full flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                  isActive
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs font-black'
                    : isDirectorLocked
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-[#112028]/60 opacity-80'
                    : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* 12 & 16. Icon with aria-hidden, text-slate-600 in light, dark:text-slate-400 */}
                  <Icon
                    aria-hidden="true"
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-105 ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-[#0F6E6E] dark:group-hover:text-cyan-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {isDirectorLocked && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1 flex-shrink-0"
                    title="يُفتح بعد إكمال التقييم"
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Card & Account Actions */}
      <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800/80 space-y-3 flex-shrink-0">
        {/* Compact User Account Card */}
        <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#112028] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0B161C] border border-[#0F6E6E]/20 dark:border-cyan-500/30 text-[#0F6E6E] dark:text-cyan-300 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              {avatarInitial}
            </div>

            {/* 6. User Name & Status: always show progress n من 8, email in title */}
            <div
              className="min-w-0 text-right"
              title={userProfile?.email || undefined}
            >
              <span className="text-xs font-bold text-[#0F172A] dark:text-white block truncate leading-tight">
                {userProfile?.name || 'مستخدم وزان'}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 block truncate mt-0.5">
                <span>
                  <span dir="ltr" className="[unicode-bidi:isolate] font-bold tabular-nums">
                    {completedCount}
                  </span>{' '}
                  من 8 مكتمل
                </span>
              </span>
            </div>
          </div>

          {/* 12, 14, 15. Calm, polite Logout Button (>= 44x44px, high contrast text-slate-600) */}
          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج من الحساب"
            aria-label="تسجيل الخروج"
            className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] rounded-xl text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#0B161C] border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/60 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Guarded Reset Action */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/50">
          <div className="text-center">
            {/* 12, 13, 14. Reset button with text-slate-600 and focus ring */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="إعادة تعيين تقييمات المنظومة وبياناتها"
              aria-label="إعادة ضبط التقييم والبيانات"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-600 dark:text-slate-400 dark:group-hover:text-amber-400 transition-colors" aria-hidden="true" />
              <span>إعادة ضبط التقييم والبيانات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 3. Desktop Sidebar: Permanent on right side in RTL with h-dvh */}
      <aside className="hidden lg:block w-64 md:w-72 h-dvh sticky top-0 shadow-xs z-30 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* 1 & 2. Mobile Drawer: Accessible dialog with logical start-0 positioning */}
      {isOpenMobile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="القائمة الرئيسية"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            aria-hidden="true"
          />

          {/* 2 & 3. Sliding Drawer positioned with logical start-0 and h-dvh */}
          <div
            ref={drawerRef}
            className="relative fixed inset-y-0 start-0 w-72 max-w-[85vw] h-dvh shadow-2xl z-10 motion-safe:animate-fadeIn"
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 7. Shared ConfirmDialog with native <dialog> */}
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
    </>
  );
};
