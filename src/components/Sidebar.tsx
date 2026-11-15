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
      badgeColor: 'bg-[#bd9240]/15 text-[#bd9240]',
    },
    {
      id: 'onboarding' as const,
      label: 'قيّم أسبوعك الآن',
      icon: ClipboardList,
      badge: 'مفتوح للتقييم 🌿',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'advisor_chat' as const,
      label: 'استشارة المستشارين',
      icon: MessageSquare,
      badge: 'حوار مفتوح 💬',
      badgeColor: 'bg-[#1b605b]/10 text-[#1b605b]',
    },
    {
      id: 'director_summary' as const,
      label: 'رؤية المنسق العام',
      icon: Compass,
      badge: 'تكامل الذكاء',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'comparison' as const,
      label: 'المقارنة والتحليلات',
      icon: GitCompare,
      badge: 'تراكمي',
      badgeColor: 'bg-[#1b605b]/10 text-[#1b605b]',
    },
  ];

  const handleSelectNav = (id: typeof navItems[number]['id']) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 sm:p-5 select-none bg-white text-right">
      {/* Top: Logo & App Branding */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#eae3d5]">
          <div
            onClick={() => handleSelectNav('dashboard')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <TadbeerLogo size="md" />
          </div>

          {/* Close button on mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl hover:bg-[#FAF7F2] text-[#7a8c88] transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="mt-6 space-y-1.5">
          <span className="text-[11px] font-extrabold text-[#7a8c88] px-3 block mb-2 tracking-wider">
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
                    ? 'bg-[#1b605b] text-white shadow-sm shadow-[#1b605b]/20 font-black'
                    : 'text-[#4e605d] hover:text-[#1b605b] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7a8c88]'}`} />
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
      <div className="pt-4 border-t border-[#eae3d5] space-y-3">
        {/* User Profile Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F2] border border-[#ded7c8]">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#1b605b]/20 text-[#1b605b] font-black text-sm flex items-center justify-center shadow-xs">
            {userProfile?.name?.charAt(0) || 'ت'}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <span className="text-xs font-black text-[#1d2e2b] block truncate">
              {userProfile?.name || 'مستخدم تدبير'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[#7a8c88] font-bold">
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
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#536561] hover:text-[#b88d3b] border border-[#ded7c8] text-[11px] font-bold transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title="تسجيل الخروج"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-[#536561] hover:text-rose-600 border border-[#ded7c8] hover:border-rose-200 text-[11px] font-bold transition-all shadow-xs"
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
      <aside className="hidden lg:block w-64 md:w-72 h-screen sticky top-0 border-l border-[#eae3d5] shadow-xs z-30 flex-shrink-0">
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
