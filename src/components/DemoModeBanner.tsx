import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  UserPlus,
  X,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DemoModeBannerProps {
  onResetDemo: () => void;
  onStartFreshProfile: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  onResetDemo,
  onStartFreshProfile,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => setIsDismissed(false)}
        className="fixed top-2 start-2 z-50 px-3 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-600 text-white text-[11px] font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
        title="إظهار شريط وضع المحكّمين"
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>وضع المحكّمين (Demo Mode)</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="شريط وضع التجربة والتحكيم"
      className="relative z-30 bg-gradient-to-r from-amber-500/15 via-teal-500/10 to-amber-500/15 dark:from-amber-950/50 dark:via-teal-950/40 dark:to-amber-950/50 border-b border-amber-300/40 dark:border-amber-800/40 backdrop-blur-md px-3 sm:px-6 py-2 transition-all font-['Cairo',sans-serif]"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 text-right">
        {/* Right Side: Demo Badge and Context Text */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Zap className="w-4 h-4 fill-current text-white animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] sm:text-[11px] font-black">
                <span>وضع المحكّمين • Demo Mode</span>
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-slate-200 truncate">
                المستفيد التجريبي: <strong>سعود المنصور</strong> (بيانات مكتملة عبر 8 مجالات + خطة 30 يوماً + مصفوفة أيزنهاور)
              </span>
            </div>
            {!isCollapsed && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 hidden sm:block mt-0.5">
                يمكنك التفاعل الحي مع المستشارين بالذكاء الاصطناعي، أو إعادة تعيين البيانات التجريبية، أو البدء بحساب جديد فارغ.
              </p>
            )}
          </div>
        </div>

        {/* Left Side: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onResetDemo}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            title="استعادة حالة البيانات التجريبية الغنية الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين العرض</span>
          </button>

          <button
            type="button"
            onClick={onStartFreshProfile}
            className="px-3 py-1.5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            title="الخروج من العرض التجريبي والبدء بحساب حقيقي جديد فارغ"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إنشاء حساب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors hidden sm:inline-flex"
            title={isCollapsed ? 'توسيع الشريط' : 'تقليص الشريط'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            title="إخفاء الشريط مؤقتاً"
            aria-label="إخفاء شريط الوضع التجريبي"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
