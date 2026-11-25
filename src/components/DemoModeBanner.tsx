import React, { useState } from 'react';
import {
  RotateCcw,
  UserPlus,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { isolateNumbersInText } from './FormattedChatMessage';

export interface DemoBannerStateInput {
  userName?: string;
  completedCount?: number;
  totalStations?: number;
  activeScreen?: string;
  hasDirectorReport?: boolean;
  hasThirtyDayPlan?: boolean;
}

export function getDemoBannerCopy({
  userName = 'سعود المنصور',
  completedCount = 0,
  totalStations = 8,
  activeScreen = 'onboarding',
  hasDirectorReport = false,
  hasThirtyDayPlan = false,
}: DemoBannerStateInput): { headlineSuffix: string; detail: string } {
  const safeCompleted = Math.max(0, Math.min(totalStations, completedCount));

  if (safeCompleted >= totalStations) {
    if (activeScreen === 'director_summary') {
      return {
        headlineSuffix: `تقرير المنسق العام الشامل جاهز (${safeCompleted} / ${totalStations} محطات مكتملة)`,
        detail:
          'تم إكمال جميع محطات التقييم الثماني بنجاح، ويعرض التقرير قراءتك التكاملية وتوصيات الموازنة المعتمدة.',
      };
    }
    if (activeScreen === 'thirty_day_plan') {
      return {
        headlineSuffix: `خطتك الذكية لـ 30 يوماً مفعّلة (${safeCompleted} / ${totalStations} محطات مكتملة)`,
        detail:
          'تم ترتيب مجالات التركيز تلقائياً من أدنى الدرجات المعتمدة في عجلة الحياة لبناء خطة الـ 30 يوماً.',
      };
    }
    if (activeScreen === 'goals_matrix') {
      return {
        headlineSuffix: `مصفوفة أيزنهاور محدّثة (${safeCompleted} / ${totalStations} محطات مكتملة)`,
        detail:
          'الأهداف والمقترحات موزعة وفق أولوياتك المعتمدة من جميع المستشارين الثمانية.',
      };
    }
    return {
      headlineSuffix: `اكتملت محطات التقييم الثماني بنجاح (${safeCompleted} / ${totalStations})`,
      detail:
        'جميع مخرجات رادار الحياة، تقرير المنسق العام، وخطة الـ 30 يوماً محدثة وجاهزة للاستعراض أو التصدير.',
    };
  }

  if (safeCompleted > 0) {
    if (activeScreen === 'director_summary' && hasDirectorReport) {
      return {
        headlineSuffix: `تقرير المنسق العام المبدئي (${safeCompleted} / ${totalStations} محطات مكتملة)`,
        detail: `أتممت ${safeCompleted} من أصل ${totalStations} محطات؛ أكمل بقية المحطات لتحديث القراءة التكاملية بالكامل.`,
      };
    }
    if (activeScreen === 'thirty_day_plan' && hasThirtyDayPlan) {
      return {
        headlineSuffix: `خطة الـ 30 يوماً محدّثة لتقدمك (${safeCompleted} / ${totalStations} محطات مكتملة)`,
        detail: `تمت مواءمة مجالات التركيز مع المحطات المنجزة (${safeCompleted} من ${totalStations})، وتُحدّث تلقائياً عند إكمال البقية.`,
      };
    }
    return {
      headlineSuffix: `جلسة تقييم أسبوعية جارية (${safeCompleted} / ${totalStations} محطات مكتملة)`,
      detail: `أتممت ${safeCompleted} من أصل ${totalStations} محطات؛ يمكنك مواصلة الحوار مع المستشارين أو استعراض النتائج الحالية.`,
    };
  }

  if (activeScreen === 'director_summary') {
    return {
      headlineSuffix: `تقرير المنسق العام الاسترشادي (0 / ${totalStations} محطات معتمدة بعد)`,
      detail:
        'يعرض هذا التقرير قراءة تمهيدية؛ وبمجرد اعتماد تقييمات المحطات سيتحدّث التحليل التكاملي بناءً على إجاباتك الفعلية.',
    };
  }

  if (activeScreen === 'thirty_day_plan') {
    return {
      headlineSuffix: `خطة الـ 30 يوماً التمهيدية (بانتظار اعتماد تقييماتك)`,
      detail:
        'عند إكمال محطات التقييم سيتم إعادة ترتيب مجالات التركيز تلقائياً وفق أدنى الدرجات المعتمدة في عجلة حياتك.',
    };
  }

  return {
    headlineSuffix: `جلسة تقييم أسبوعية نشطة وجاهزة للبدء (0 / ${totalStations} محطات مكتملة)`,
    detail: `خض الحوار التفاعلي مع المستشار المختص لإكمال المحطات، وستُفتح مخرجات رادار الحياة وخطة الـ 30 يوماً تلقائياً بناءً على تقييمك الفعلي يا ${userName}.`,
  };
}

interface DemoModeBannerProps extends DemoBannerStateInput {
  onResetDemo: () => void;
  onStartFreshProfile: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  onResetDemo,
  onStartFreshProfile,
  userName = 'سعود المنصور',
  completedCount = 0,
  totalStations = 8,
  activeScreen = 'onboarding',
  hasDirectorReport = false,
  hasThirtyDayPlan = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const displayName = (userName || '').trim() || 'سعود المنصور';
  const bannerCopy = getDemoBannerCopy({
    userName: displayName,
    completedCount,
    totalStations,
    activeScreen,
    hasDirectorReport,
    hasThirtyDayPlan,
  });

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => setIsDismissed(false)}
        className="fixed top-2 start-2 z-50 px-3 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-600 text-white text-[11px] font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
        title="إظهار شريط وضع المحكّمين"
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>وضع المحكّمين</span>
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
                <span>وضع المحكّمين • العرض التجريبي</span>
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-slate-200 truncate">
                المستفيد: <strong>{displayName}</strong> • {isolateNumbersInText(bannerCopy.headlineSuffix)}
              </span>
            </div>
            {!isCollapsed && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 hidden sm:block mt-0.5">
                {isolateNumbersInText(bannerCopy.detail)}
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
