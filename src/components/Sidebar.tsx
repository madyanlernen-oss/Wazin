import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  GitCompare,
  Target,
  RotateCcw,
  LogOut,
  X,
  Compass,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import { Screen, UserProfile } from '../types/lifeBalance';
import { WazanLogo } from './WazanLogo';

type SidebarScreen = Exclude<Screen, 'landing' | 'login'>;

interface SidebarProps {
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Clean, concise menu items without stacked noisy badges
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'لوحة التحكم وعجلة الحياة',
      icon: LayoutDashboard,
    },
    {
      id: 'goals_matrix' as const,
      label: 'أهدافي (مصفوفة أيزنهاور)',
      icon: Target,
    },
    {
      id: 'onboarding' as const,
      label: 'قيّم أسبوعك الآن',
      icon: ClipboardList,
    },
    {
      id: 'advisor_chat' as const,
      label: 'استشارة المستشارين',
      icon: MessageSquare,
    },
    {
      id: 'director_summary' as const,
      label: 'رؤية المنسق العام',
      icon: Compass,
    },
    {
      id: 'comparison' as const,
      label: 'المقارنة والتحليلات',
      icon: GitCompare,
    },
  ];

  const handleSelectNav = (id: typeof navItems[number]['id']) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 sm:p-5 select-none bg-white dark:bg-[#0B161C] text-right border-l border-slate-200/90 dark:border-slate-800/80 transition-colors">
      {/* Top: Logo & App Branding */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/90 dark:border-slate-800/80">
          <div
            onClick={() => handleSelectNav('dashboard')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <WazanLogo size="md" />
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#112028] text-[#0F6E6E] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                aria-label="تبديل الوضع الليلي والنهاري"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FBBF24]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            {/* Close button on mobile drawer */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 space-y-1">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 px-3 block mb-2 tracking-wider">
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                  isActive
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs font-black'
                    : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 dark:text-slate-400 group-hover:text-[#0F6E6E] dark:group-hover:text-cyan-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: User Card & Account Actions */}
      <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800/80 space-y-3">
        {/* Compact User Account Card with Integrated Calm Logout Button */}
        <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#112028] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0B161C] border border-[#0F6E6E]/20 dark:border-cyan-500/30 text-[#0F6E6E] dark:text-cyan-300 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              {userProfile?.name?.charAt(0) || 'و'}
            </div>

            {/* User Name & Status */}
            <div className="min-w-0 text-right">
              <span className="text-xs font-bold text-[#0F172A] dark:text-white block truncate leading-tight">
                {userProfile?.name || 'مستخدم وازن'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                {userProfile?.email || (completedCount > 0 ? (
                  <span>
                    <span dir="ltr" className="font-bold tabular-nums" style={{ unicodeBidi: 'isolate' }}>{completedCount}</span> مجالات مكتملة
                  </span>
                ) : 'حساب نشط')}
              </span>
            </div>
          </div>

          {/* Calm, polite Logout Button */}
          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج من الحساب"
            aria-label="تسجيل الخروج"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#0B161C] border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/60 transition-all cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Guarded, Visually Separated Reset Action */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/50">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="إعادة تعيين تقييمات المنظومة وبياناتها"
              aria-label="إعادة ضبط التقييم والبيانات"
              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
              <span>إعادة ضبط التقييم والبيانات</span>
            </button>
          </div>
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
    </>
  );
};
