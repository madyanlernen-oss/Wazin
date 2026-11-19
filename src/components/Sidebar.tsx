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
  X,
  Compass,
  Sun,
  Moon,
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import { TadbeerLogo } from './TadbeerLogo';

interface SidebarProps {
  currentScreen: 'dashboard' | 'onboarding' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix';
  onNavigate: (screen: 'dashboard' | 'onboarding' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix') => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onReset: () => void;
  completedCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'لوحة التحكم وعجلة الحياة',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'goals_matrix' as const,
      label: 'أهدافي (مصفوفة أيزنهاور)',
      icon: Target,
      badge: 'التركيز اليومي',
      badgeColor: 'bg-[#bd9240]/15 text-[#bd9240] dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'onboarding' as const,
      label: 'قيّم أسبوعك الآن',
      icon: ClipboardList,
      badge: 'مفتوح للتقييم 🌿',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      id: 'advisor_chat' as const,
      label: 'استشارة المستشارين',
      icon: MessageSquare,
      badge: 'حوار مفتوح 💬',
      badgeColor: 'bg-[#1b605b]/10 text-[#1b605b] dark:bg-cyan-950/40 dark:text-cyan-300',
    },
    {
      id: 'director_summary' as const,
      label: 'رؤية المنسق العام',
      icon: Compass,
      badge: 'تكامل الذكاء',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      id: 'comparison' as const,
      label: 'المقارنة والتحليلات',
      icon: GitCompare,
      badge: 'تراكمي',
      badgeColor: 'bg-[#1b605b]/10 text-[#1b605b] dark:bg-cyan-950/40 dark:text-cyan-300',
    },
  ];

  const handleSelectNav = (id: typeof navItems[number]['id']) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 sm:p-5 select-none bg-white dark:bg-[#07111c] text-right border-l border-[#eae3d5] dark:border-slate-800 transition-colors">
      {/* Top: Logo & App Branding */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#eae3d5] dark:border-slate-800">
          <div
            onClick={() => handleSelectNav('dashboard')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <TadbeerLogo size="md" />
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl border border-[#eae3d5] dark:border-slate-700 bg-[#FAF7F2] dark:bg-slate-800 text-[#1b605b] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
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

            {/* Close button on mobile drawer */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-xl hover:bg-[#FAF7F2] dark:hover:bg-slate-800 text-[#7a8c88] dark:text-slate-400 transition-colors"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 space-y-1.5">
          <span className="text-[11px] font-extrabold text-[#7a8c88] dark:text-slate-400 px-3 block mb-2 tracking-wider">
            القائمة الرئيسية
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#1b605b] dark:bg-cyan-600 text-white shadow-sm shadow-[#1b605b]/20 font-black'
                    : 'text-[#4e605d] dark:text-slate-300 hover:text-[#1b605b] dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7a8c88] dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: User Card & Account Actions */}
      <div className="pt-4 border-t border-[#eae3d5] dark:border-slate-800 space-y-3">
        {/* User Profile Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F2] dark:bg-slate-900/60 border border-[#ded7c8] dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-[#1b605b]/20 dark:border-cyan-500/30 text-[#1b605b] dark:text-cyan-300 font-black text-sm flex items-center justify-center shadow-xs">
            {userProfile?.name?.charAt(0) || 'و'}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <span className="text-xs font-black text-[#1d2e2b] dark:text-white block truncate">
              {userProfile?.name || 'مستخدم وازن'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[#7a8c88] dark:text-slate-400 font-bold">
                {completedCount === 0 ? 'مستخدم جديد' : 'نشط الآن'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Reset & Sign Out */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReset}
            title="إعادة تعيين التقييم"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 text-[#536561] dark:text-slate-300 hover:text-[#b88d3b] border border-[#ded7c8] dark:border-slate-700 text-[11px] font-bold transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#536561] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-[#ded7c8] dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/50 text-[11px] font-bold transition-all shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>خروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Permanent on right side in RTL */}
      <aside className="hidden lg:block w-64 md:w-72 h-screen sticky top-0 shadow-xs z-30 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Sliding Drawer from Right */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-fadeIn">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
