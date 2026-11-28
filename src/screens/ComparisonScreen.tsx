import React, { useState, useEffect, useRef } from 'react';
import {
  GitCompare,
  Calendar,
  CalendarDays,
  Sparkles,
  BarChart3,
  Bot,
  Loader2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Compass,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { OverlappingRadarChart } from '../components/OverlappingRadarChart';
import { LifeAreaId, UserProfile } from '../types/lifeBalance';
import { isolateNumbersInText } from '../components/FormattedChatMessage';
import { localizeDomainText } from '../utils/arabicDomainLabels';

// Historical Years Data
interface PeriodItem {
  id: string;
  name: string;
  subtitle: string;
  averageScore: number;
  scores: Record<LifeAreaId, number>;
  completedHabits: number;
  notes: string;
}

const AVAILABLE_YEARS: PeriodItem[] = [
  {
    id: 'y2023',
    name: 'عام 2023',
    subtitle: 'مرحلة التأسيس والبدايات',
    averageScore: 4.8,
    completedHabits: 140,
    notes: 'تحديات كبرى في إدارة الوقت والإنفاق المالي وقلة النوم',
    scores: {
      spiritual: 6.0,
      financial: 4.2,
      career: 5.5,
      personal: 4.5,
      learning: 5.0,
      family: 5.8,
      social: 4.0,
      health: 3.4,
    },
  },
  {
    id: 'y2024',
    name: 'عام 2024',
    subtitle: 'مرحلة الاستيقاظ والتعديل',
    averageScore: 5.9,
    completedHabits: 220,
    notes: 'بداية استقرار مالي واكتساب عادة المشي وقراءة الكتب',
    scores: {
      spiritual: 7.2,
      financial: 5.6,
      career: 6.2,
      personal: 5.8,
      learning: 6.4,
      family: 6.5,
      social: 5.2,
      health: 4.3,
    },
  },
  {
    id: 'y2025',
    name: 'عام 2025',
    subtitle: 'مرحلة البناء والنمو المستمر',
    averageScore: 7.1,
    completedHabits: 310,
    notes: 'نقلة نوعية في الجانب المهني والتعليمي والسكينة الروحية',
    scores: {
      spiritual: 8.2,
      financial: 7.0,
      career: 7.6,
      personal: 7.2,
      learning: 7.8,
      family: 7.6,
      social: 6.5,
      health: 6.0,
    },
  },
  {
    id: 'y2026',
    name: 'عام 2026 (العام الحالي)',
    subtitle: 'مرحلة التناغم والإنتاجية العميقة',
    averageScore: 8.2,
    completedHabits: 398,
    notes: 'تكامل بين كل المجالات ووصول مؤشر التوازن لـ 8.2/10',
    scores: {
      spiritual: 8.9,
      financial: 8.4,
      career: 8.7,
      personal: 8.3,
      learning: 8.5,
      family: 8.6,
      social: 8.0,
      health: 8.1,
    },
  },
  {
    id: 'y2027_proj',
    name: 'عام 2027 (المستهدف)',
    subtitle: 'الريادة والأثر المجتمعي الشامل',
    averageScore: 9.0,
    completedHabits: 480,
    notes: 'تحقيق الاستقلال المالي والريادة والمحافظة على اللياقة التامة',
    scores: {
      spiritual: 9.5,
      financial: 9.2,
      career: 9.3,
      personal: 9.0,
      learning: 9.1,
      family: 9.2,
      social: 8.8,
      health: 8.9,
    },
  },
];

const AVAILABLE_MONTHS: PeriodItem[] = [
  {
    id: 'm_2026_07',
    name: 'يوليو 2026',
    subtitle: 'شهر الصيف والنادي الرياضي',
    averageScore: 7.4,
    completedHabits: 38,
    notes: 'التركيز على اللياقة البدنية والأنشطة العائلية',
    scores: {
      spiritual: 8.4,
      financial: 6.8,
      career: 7.5,
      personal: 7.7,
      learning: 7.9,
      family: 8.0,
      social: 7.4,
      health: 7.2,
    },
  },
  {
    id: 'm_2026_08',
    name: 'أغسطس 2026',
    subtitle: 'شهر الترقية المهنية',
    averageScore: 7.6,
    completedHabits: 41,
    notes: 'انطلاقة مسار قيادي جديد وتطوير المهارات',
    scores: {
      spiritual: 8.0,
      financial: 7.8,
      career: 8.4,
      personal: 7.8,
      learning: 8.1,
      family: 7.8,
      social: 7.5,
      health: 7.3,
    },
  },
  {
    id: 'm_2026_09',
    name: 'سبتمبر 2026',
    subtitle: 'شهر الاستقرار والدراسة',
    averageScore: 7.8,
    completedHabits: 39,
    notes: 'التزام دورة مكثفة وتنظيم جدول القراءة',
    scores: {
      spiritual: 8.5,
      financial: 8.0,
      career: 8.3,
      personal: 8.0,
      learning: 8.4,
      family: 8.1,
      social: 7.2,
      health: 7.5,
    },
  },
  {
    id: 'm_2026_10',
    name: 'أكتوبر 2026',
    subtitle: 'شهر التوازن النوعي',
    averageScore: 8.0,
    completedHabits: 44,
    notes: 'دخول مؤشر التوازن لمستوى 8.0 مع انضباط العادات',
    scores: {
      spiritual: 8.8,
      financial: 8.2,
      career: 8.5,
      personal: 8.2,
      learning: 8.3,
      family: 8.4,
      social: 7.8,
      health: 7.8,
    },
  },
  {
    id: 'm_2026_11',
    name: 'نوفمبر 2026',
    subtitle: 'الشهر الحالي (ذروة الأداء)',
    averageScore: 8.2,
    completedHabits: 46,
    notes: 'تناغم غير مسبوق بين الصفاء الروحي والإنجاز المهني',
    scores: {
      spiritual: 8.9,
      financial: 8.4,
      career: 8.7,
      personal: 8.3,
      learning: 8.5,
      family: 8.6,
      social: 8.0,
      health: 8.1,
    },
  },
];

const AVAILABLE_WEEKS: PeriodItem[] = [
  {
    id: 'w44',
    name: 'الأسبوع 44',
    subtitle: '12 - 18 أكتوبر 2026',
    averageScore: 7.7,
    completedHabits: 22,
    notes: 'تحضير للربع الأخير من العام ومراجعة الميزانية',
    scores: {
      spiritual: 8.5,
      financial: 7.9,
      career: 8.1,
      personal: 7.9,
      learning: 8.1,
      family: 8.0,
      social: 7.4,
      health: 7.3,
    },
  },
  {
    id: 'w45',
    name: 'الأسبوع 45',
    subtitle: '19 - 25 أكتوبر 2026',
    averageScore: 7.9,
    completedHabits: 25,
    notes: 'إنجاز التقرير الفصلي بنجاح والمحافظة على الرياضة',
    scores: {
      spiritual: 8.6,
      financial: 8.0,
      career: 8.3,
      personal: 8.1,
      learning: 8.2,
      family: 8.2,
      social: 7.6,
      health: 7.5,
    },
  },
  {
    id: 'w46',
    name: 'الأسبوع 46',
    subtitle: '26 أكتوبر - 1 نوفمبر 2026',
    averageScore: 8.1,
    completedHabits: 27,
    notes: 'استقطاع استثماري آلي وقضاء وقت أسري قيم',
    scores: {
      spiritual: 8.7,
      financial: 8.2,
      career: 8.4,
      personal: 8.2,
      learning: 8.3,
      family: 8.4,
      social: 7.8,
      health: 7.8,
    },
  },
  {
    id: 'w47',
    name: 'الأسبوع 47',
    subtitle: '2 - 8 نوفمبر 2026',
    averageScore: 8.3,
    completedHabits: 29,
    notes: 'أعلى وتيرة انضباط عادات وتناغم طاقوي مريح',
    scores: {
      spiritual: 8.8,
      financial: 8.3,
      career: 8.6,
      personal: 8.4,
      learning: 8.4,
      family: 8.5,
      social: 7.9,
      health: 8.0,
    },
  },
  {
    id: 'w48',
    name: 'الأسبوع 48 (الحالي)',
    subtitle: '9 - 15 نوفمبر 2026',
    averageScore: 8.4,
    completedHabits: 31,
    notes: 'حضور ذهني كامل وثبات عند مستوى استثنائي',
    scores: {
      spiritual: 8.9,
      financial: 8.4,
      career: 8.7,
      personal: 8.5,
      learning: 8.6,
      family: 8.6,
      social: 8.1,
      health: 8.2,
    },
  },
];

interface ComparisonScreenProps {
  userProfile: UserProfile | null;
  onNavigateToDashboard: () => void;
  theme?: 'light' | 'dark';
  embedded?: boolean;
}

export const ComparisonScreen: React.FC<ComparisonScreenProps> = ({
  userProfile,
  onNavigateToDashboard,
  theme = 'light',
  embedded = false,
}) => {
  const [periodType, setPeriodType] = useState<'weeks' | 'months' | 'years'>('months');

  // Multi-selection (Up to 5 items)
  const [selectedIds, setSelectedIds] = useState<string[]>(['m_2026_07', 'm_2026_09', 'm_2026_11']);

  // AI Deep Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Selected Area for deep drilldown in the radar comparison
  const [selectedAreaId, setSelectedAreaId] = useState<LifeAreaId>('spiritual');

  // Dismissible in-app UI feedback for comparison selection limit (replaces browser alert)
  const [periodLimitNotice, setPeriodLimitNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLimitNotice = (message: string) => {
    setPeriodLimitNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setPeriodLimitNotice(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Switch period type handler
  const handleSwitchPeriodType = (type: 'weeks' | 'months' | 'years') => {
    setPeriodType(type);
    setAnalysisResult(null);
    setPeriodLimitNotice(null);
    if (type === 'weeks') {
      setSelectedIds(['w45', 'w46', 'w47', 'w48']);
    } else if (type === 'months') {
      setSelectedIds(['m_2026_07', 'm_2026_09', 'm_2026_11']);
    } else {
      setSelectedIds(['y2023', 'y2024', 'y2025', 'y2026']);
    }
  };

  // Get active items pool
  const currentPool: PeriodItem[] =
    periodType === 'weeks'
      ? AVAILABLE_WEEKS
      : periodType === 'months'
      ? AVAILABLE_MONTHS
      : AVAILABLE_YEARS;

  // Toggle item selection (Max 5)
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        setPeriodLimitNotice(null);
      }
    } else {
      if (selectedIds.length < 5) {
        setSelectedIds((prev) => [...prev, id]);
        setPeriodLimitNotice(null);
      } else {
        triggerLimitNotice('يمكنك مقارنة حتى 5 فترات كحد أقصى في آن واحد.');
      }
    }
  };

  // Selected items resolved
  const selectedItems = currentPool.filter((item) => selectedIds.includes(item.id));

  // Colors for selected comparison items adjusted for theme contrast
  const isDark = theme === 'dark';
  const itemColors = isDark
    ? ['#06B6D4', '#F59E0B', '#818CF8', '#34D399', '#F87171']
    : ['#0F6E6E', '#8A5A00', '#6366F1', '#10B981', '#F43F5E'];

  // Trigger AI comprehensive comparative analysis
  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      const typeLabel =
        periodType === 'weeks' ? 'الأسابيع' : periodType === 'months' ? 'الشهور' : 'السنوات';

      const firstItem = selectedItems[0];
      const lastItem = selectedItems[selectedItems.length - 1];
      const diff = (lastItem.averageScore - firstItem.averageScore).toFixed(1);
      const isPositive = parseFloat(diff) >= 0;

      const dynamicReport = `
### 📑 تقرير التحليل الذكي المقارن عبر ${typeLabel} المختارة ${userProfile?.name ? `(للمستفيد: ${userProfile.name})` : ''}:
الفترات: (${selectedItems.map((i) => i.name).join(' و ')})

1. **المنحنى العام للتحول:**
   - رصدنا نمواً بمقدار **${isPositive ? `+${diff}` : diff} درجة** على مؤشر التوازن العام بين بداية الفترة (${firstItem.name}) ونهايتها (${lastItem.name}).
   - المنظومة أظهرت تماسكاً كبيراً، حيث انتقلت من مرحلة التذبذب إلى مرحلة **الاستقرار التكاملي**.

2. **المجال الأكثر نمواً وإلهاماً (المحفّز الأكبر):**
   - **الجانب الصحي والروحي:** كانا الرافعة الأساسية للنمو، حيث انعكس تثبيت مواعيد النوم والمشي اليومي بنسبة تحسن تفوق 45% في المزاج الأسري والإنتاجية المهنية.

3. **نقاط عنق الزجاجة وكيف تم تجاوزها:**
   - في الفترات الأولى، كان الضغط المالي والمهني يستنزف الطاقة الاجتماعية.
   - التحول الحاسم حدث عندما تم إيقاف التسرب المالي ببطاقة منفصلة ووضع حدود واضحة لساعات العمل.

4. **توصية وزان للمرحلة القادمة:**
   - الحفاظ على هذا التناغم العالي (${lastItem.averageScore}/10) يتطلب التحول من "مجهود الإرادة اللحظي" إلى "النظام الآلي" (مثل الاستقطاع الاستثماري التلقائي وطقس الإغلاق الليلي المستمر).
      `.trim();

      setAnalysisResult(dynamicReport);
      setIsAnalyzing(false);
    }, 1200);
  };

  return (
    <div
      className={
        embedded
          ? 'space-y-8 text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300'
          : 'min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300'
      }
    >
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
        <div>
          {!embedded && (
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F6E6E] dark:text-[#22D3EE] hover:underline mb-3 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للوحة التحكم</span>
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F6E6E]/10 dark:bg-[#0891B2]/20 text-[#0F6E6E] dark:text-[#22D3EE] text-xs font-bold mb-2">
            <GitCompare className="w-3.5 h-3.5 text-[#8A5A00] dark:text-amber-400" />
            أداة المقارنة التراكمية
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
            مقارنة أبعاد الحياة (أسابيع • شهور • سنين)
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
            قارن حتى 5 فترات زمنية معاً لمشاهدة كيف نمت جودة حياتك وتطورت درجات المستشارين، مع إمكانية استخراج تحليل ذكي شامل بنقرة واحدة.
          </p>
        </div>

        {/* Period Selector Tabs (Weeks, Months, Years) */}
        <div className="inline-flex p-1.5 bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl self-start lg:self-center shadow-xs">
          <button
            type="button"
            onClick={() => handleSwitchPeriodType('weeks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              periodType === 'weeks'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>مقارنة الأسابيع</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPeriodType('months')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              periodType === 'months'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>مقارنة الشهور</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPeriodType('years')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              periodType === 'years'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>مقارنة السنين</span>
          </button>
        </div>
      </div>

      {/* Selection Chips Bar (Choose up to 5 items) */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-5 sm:p-6 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#8A5A00] dark:text-amber-400" />
            حدد الفترات المراد مقارنتها (اختر حتى 5 عناصر):
          </span>
          <span className="text-[#0F6E6E] dark:text-[#22D3EE]">
            المحدد: {selectedIds.length} من 5
          </span>
        </div>

        {/* In-App Inline Dismissible Banner for Selection Limit (Replaces Browser Alert) */}
        {periodLimitNotice && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100 shadow-xs animate-fadeIn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
              <p className="text-xs font-bold leading-relaxed">
                {periodLimitNotice}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPeriodLimitNotice(null)}
              className="p-1 rounded-lg text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer flex-shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          {currentPool.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const colorIdx = selectedIds.indexOf(item.id);
            const activeColor = colorIdx !== -1 ? itemColors[colorIdx] : (isDark ? '#0891B2' : '#0F6E6E');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelect(item.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : 'bg-[#F7F6F2] dark:bg-[#071318] text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE]'
                }`}
                style={isSelected ? { backgroundColor: activeColor, borderColor: activeColor } : {}}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                    isSelected ? 'bg-white text-black font-black' : 'border-[#CBD5E1] dark:border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{item.name}</span>
                <span className={`text-[10px] ${isSelected ? 'opacity-90' : 'text-[#64748B] dark:text-slate-400'}`} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                  ({item.averageScore} / 10)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {selectedItems.map((item, idx) => {
          const color = itemColors[idx % itemColors.length];
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0E1D24] border-2 rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-3 transition-colors"
              style={{ borderColor: `${color}40` }}
            >
              <div
                className="absolute top-0 right-0 left-0 h-1.5"
                style={{ backgroundColor: color }}
              />
              <div>
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white inline-block mb-1.5"
                  style={{ backgroundColor: color }}
                >
                  فترة <span dir="ltr" className="font-mono [unicode-bidi:isolate]">#{idx + 1}</span>
                </span>
                <h3 className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9]">{isolateNumbersInText(item.name)}</h3>
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] line-clamp-1">{isolateNumbersInText(item.subtitle)}</p>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">معدل التوازن</span>
                  <span className="text-2xl font-black font-mono inline-flex items-baseline gap-1" dir="ltr" style={{ color, unicodeBidi: 'isolate' }}>
                    <span>{item.averageScore}</span>
                    <span className="text-xs text-[#64748B] dark:text-slate-400">/ 10</span>
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">العادات المنجزة</span>
                  <span className="text-sm font-extrabold text-[#0F172A] dark:text-[#F1F5F9] tabular-nums" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    {item.completedHabits}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Chart: 8 Areas Comparative Bar Group */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E343F]">
          <div>
            <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
              مقارنة تفصيلية لمجالات الحياة الثمانية
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              مقارنة درجات كل جانب جنباً إلى جنب بين الفترات المحددة.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            {selectedItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-md"
                  style={{ backgroundColor: itemColors[idx % itemColors.length] }}
                />
                <span className="text-[#334155] dark:text-slate-300">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparative Bars per Area */}
        <div className="space-y-5">
          {ADVISORS_LIST.map((advisor) => (
            <div key={advisor.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{advisor.avatarSvg}</span>
                  <span className="font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">{advisor.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                  {selectedItems.map((item, idx) => {
                    const score = item.scores[advisor.id] || 0;
                    return (
                      <span
                        key={item.id}
                        style={{ color: itemColors[idx % itemColors.length] }}
                      >
                        {score}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Bar Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 bg-[#F7F6F2] dark:bg-[#071318] p-2.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] transition-colors">
                {selectedItems.map((item, idx) => {
                  const score = item.scores[advisor.id] || 0;
                  const color = itemColors[idx % itemColors.length];
                  const percent = Math.min(100, (score / 10) * 100);

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-[#64748B] dark:text-slate-400 truncate">{item.name}</span>
                        <span dir="ltr" style={{ color, unicodeBidi: 'isolate' }}>{score} / 10</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INTERACTIVE COMPARATIVE LIFE WHEEL DASHBOARD (عجلة الحياة المقارنة المتداخلة) */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E343F]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F6E6E]/10 dark:bg-[#0891B2]/20 text-[#0F6E6E] dark:text-[#22D3EE] text-xs font-bold mb-1.5">
              <Compass className="w-3.5 h-3.5 text-[#8A5A00] dark:text-amber-400" />
              عجلة الحياة المقارنة التفاعلية (تداخل الفترات)
            </div>
            <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
              تداخل عجلة الحياة بين الفترات السابقة والحالية
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              انقر على أي جانب في العجلة أو من القوائم لعرض تحليله المفصل ومقدار التحسن الزمني فيه.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedItems.map((item, idx) => {
              const color = itemColors[idx % itemColors.length];
              const isLast = idx === selectedItems.length - 1;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F7F6F2] dark:bg-[#071318] border text-xs font-bold transition-colors"
                  style={{ borderColor: `${color}60` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[#0F172A] dark:text-[#F1F5F9]">{item.name}</span>
                  {isLast && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-black">
                      الحالي
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Grid: Wheel on Left, Drilldown Analysis on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Overlapping Radar Wheel */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#F7F6F2] dark:bg-[#071318] p-4 rounded-3xl border border-[#E2E8F0] dark:border-[#1E343F] transition-colors">
            <OverlappingRadarChart
              periods={selectedItems.map((item, idx) => ({
                id: item.id,
                name: item.name,
                color: itemColors[idx % itemColors.length],
                scores: item.scores,
                averageScore: item.averageScore,
              }))}
              selectedAreaId={selectedAreaId}
              onSelectArea={(id) => setSelectedAreaId(id)}
              size={440}
              theme={theme}
            />
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 mt-2 font-medium">
              💡 انقر على اسم أو دائرة أي جانب لرؤية تحليل الفارق ومعدل التحسن
            </span>
          </div>

          {/* Right: Area Drilldown Details Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0E1D24] border-2 border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 shadow-xs space-y-5 transition-colors">
            {(() => {
              const activeAdv = ADVISORS_LIST.find((a) => a.id === selectedAreaId) || ADVISORS_LIST[0];
              const firstVal = selectedItems[0]?.scores[selectedAreaId] || 0;
              const lastVal = selectedItems[selectedItems.length - 1]?.scores[selectedAreaId] || 0;
              const scoreDiff = Number((lastVal - firstVal).toFixed(1));
              const isImproved = scoreDiff >= 0;

              return (
                <div className="space-y-4">
                  {/* Area Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E343F]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/5"
                        style={{ backgroundColor: `${activeAdv.themeColor}15` }}
                      >
                        {activeAdv.avatarSvg}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">{activeAdv.title}</h4>
                        <p className="text-xs font-semibold" style={{ color: activeAdv.themeColor }}>
                          {activeAdv.name} ({activeAdv.badge})
                        </p>
                      </div>
                    </div>

                    <div className="text-left" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                      <span className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">{lastVal}</span>
                      <span className="text-xs text-[#64748B] dark:text-slate-400"> / 10</span>
                    </div>
                  </div>

                  {/* Growth Metric Badge */}
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      isImproved
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isImproved ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      )}
                      <div>
                        <span className="text-xs font-bold block">
                          {isImproved ? 'تحسن وتطور إيجابي ملحوظ' : 'تراجع يحتاج متابعة'}
                        </span>
                        <span className="text-[11px] opacity-80">
                          بين {selectedItems[0]?.name} و {selectedItems[selectedItems.length - 1]?.name}
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                      <span className="text-lg font-black font-mono">
                        {isImproved ? `+${scoreDiff}` : scoreDiff}
                      </span>
                      <span className="text-xs font-bold font-sans">درجة</span>
                    </div>
                  </div>

                  {/* Progression Across All Selected Periods */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8] block">
                      مسار التطور عبر الفترات المحددة:
                    </span>
                    <div className="space-y-1.5">
                      {selectedItems.map((item, idx) => {
                        const sc = item.scores[selectedAreaId] || 0;
                        const color = itemColors[idx % itemColors.length];
                        const pct = Math.min(100, (sc / 10) * 100);

                        return (
                          <div key={item.id} className="bg-[#F7F6F2] dark:bg-[#071318] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] space-y-1 transition-colors">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-[#0F172A] dark:text-[#F1F5F9]">{item.name}</span>
                              <span dir="ltr" style={{ color, unicodeBidi: 'isolate' }}>{sc} / 10</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actionable Strategic Insight for this Area */}
                  <div className="bg-[#F7F6F2] dark:bg-[#071318] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] text-xs space-y-1.5 transition-colors">
                    <span className="font-bold text-[#0F6E6E] dark:text-[#22D3EE] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8A5A00] dark:text-amber-400" />
                      رؤية المستشار للتحسين المستمر:
                    </span>
                    <p className="leading-relaxed text-[#334155] dark:text-slate-300">
                      {isImproved
                        ? `استمرارية الأداء في ${activeAdv.title} تدل على ترسخ العادات المحورية. حافظ على التوازن ولا ترفع التوقعات بشكل يولد ضغطاً غير ضروري.`
                        : `هذا الجانب يحتاج إلى خطوة إجرائية صغيرة ومحددة هذا الأسبوع في المربع 2 بمصفوفة أيزنهاور لاستعادة زخمه.`}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* AI Comparative Deep Analysis Section (زر تحليل) */}
      <div className="bg-gradient-to-br from-[#0F6E6E] to-[#0A4848] dark:from-[#0E2833] dark:to-[#07151C] dark:border dark:border-[#1E343F] text-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-cyan-500/10 text-emerald-200 dark:text-cyan-300 text-xs font-bold">
              <Bot className="w-3.5 h-3.5 text-[#ffd67a] dark:text-cyan-400" />
              محرك التحليل الذكي التكاملي
            </div>
            <h3 className="text-xl sm:text-2xl font-black">
              تحليل ما حدث عبر هذه البيانات والفترات
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80 dark:text-slate-300 max-w-2xl leading-relaxed">
              انقر على زر "تحليل" ليقوم الذكاء الاصطناعي بربط المتغيرات واكتشاف الأسباب الجذرية وراء صعود أو هبوط المؤشرات وتقديم خطة استباقية.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-3.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] dark:bg-[#0891B2] dark:hover:bg-[#06B6D4] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 self-start sm:self-center cursor-pointer flex-shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري معالجة البيانات وتحليلها...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تحليل الفترات المحددة الآن</span>
              </>
            )}
          </button>
        </div>

        {/* Analysis Output Box */}
        {analysisResult && (
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-5 sm:p-6 text-xs sm:text-sm leading-relaxed text-white space-y-3 animate-fadeIn">
            <div className="whitespace-pre-line prose prose-invert max-w-none text-right">
              {isolateNumbersInText(localizeDomainText(analysisResult))}
            </div>
          </div>
        )}
      </div>

      {/* Floating In-App Toast Notification for Period Limit */}
      {periodLimitNotice && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-fadeIn"
        >
          <div className="bg-[#0F172A] dark:bg-[#071318] text-white dark:text-slate-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black border border-amber-400/80 dark:border-amber-500/70 max-w-md">
            <AlertCircle className="w-4 h-4 text-amber-400 dark:text-amber-300 flex-shrink-0" />
            <span>{periodLimitNotice}</span>
            <button
              type="button"
              onClick={() => setPeriodLimitNotice(null)}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mr-1"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

