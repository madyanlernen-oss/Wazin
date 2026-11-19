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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
      badgeColor: 'bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-[#FBBF24] border border-amber-200/80 dark:border-amber-800/40',
    },
    {
      id: 'onboarding' as const,
      label: 'قيّم أسبوعك الآن',
      icon: ClipboardList,
      badge: 'مفتوح للتقييم 🌿',
      badgeColor: 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40',
    },
    {
      id: 'advisor_chat' as const,
      label: 'استشارة المستشارين',
      icon: MessageSquare,
      badge: 'حوار مفتوح 💬',
      badgeColor: 'bg-[#0B6E72]/10 text-[#0B6E72] dark:bg-cyan-950/40 dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/40',
    },
    {
      id: 'director_summary' as const,
      label: 'رؤية المنسق العام',
      icon: Compass,
      badge: 'تكامل الذكاء',
      badgeColor: 'bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-[#FBBF24] border border-amber-200/80 dark:border-amber-800/40',
    },
    {
      id: 'comparison' as const,
      label: 'المقارنة والتحليلات',
      icon: GitCompare,
      badge: 'تراكمي',
      badgeColor: 'bg-[#0B6E72]/10 text-[#0B6E72] dark:bg-cyan-950/40 dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/40',
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
            <TadbeerLogo size="md" />
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#112028] text-[#0B6E72] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
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
        <div className="mt-6 space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-400 px-3 block mb-2 tracking-wider">
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
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-sm shadow-[#0B6E72]/20 font-black'
                    : 'text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#112028]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
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
      <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800/80 space-y-3">
        {/* User Profile Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#112028] border border-slate-200/80 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0B161C] border border-[#0B6E72]/20 dark:border-cyan-500/30 text-[#0B6E72] dark:text-cyan-300 font-black text-sm flex items-center justify-center shadow-xs">
            {userProfile?.name?.charAt(0) || 'و'}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <span className="text-xs font-black text-[#0F172A] dark:text-white block truncate">
              {userProfile?.name || 'مستخدم وازن'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {completedCount === 0 ? 'مستخدم جديد' : 'نشط الآن'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Sign Out (Primary) & De-emphasized Reset */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج من الحساب"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#112028] dark:hover:bg-rose-950/40 text-[#334155] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700/70 hover:border-rose-200 dark:hover:border-rose-800/50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>تسجيل الخروج</span>
          </button>

          {/* De-emphasized Safe Reset Action */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="إعادة تعيين تقييمات المنظومة"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-amber-700 dark:text-slate-500 dark:hover:text-[#FBBF24] transition-colors py-1 px-2 rounded-lg hover:bg-amber-50/60 dark:hover:bg-amber-950/30 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
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
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                نعم، إعادة الضبط
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B161C] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
