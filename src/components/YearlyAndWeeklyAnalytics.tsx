import React, { useState } from 'react';
import {
  Calendar,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  CalendarDays,
  Zap,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeAreaId } from '../types/lifeBalance';

interface MonthData {
  month: string;
  monthName: string;
  averageScore: number;
  highlight: string;
  completedTasks: number;
  topArea: string;
  bottleneckArea: string;
  scores: Record<LifeAreaId, number>;
}

interface WeekData {
  weekNumber: number;
  dateRange: string;
  balanceScore: number;
  weeklyHabitCompletion: number; // percentage
  reflection: string;
  wins: string[];
  challenges: string[];
}

// 12 Full Months History (1 Full Year of Data)
const ONE_YEAR_MONTHLY_HISTORY: MonthData[] = [
  {
    month: '2025-12',
    monthName: 'ديسمبر 2025',
    averageScore: 5.4,
    highlight: 'انطلاقة التقييم الأول، والبدء في تنظيم ساعات النوم وجدول العمل.',
    completedTasks: 18,
    topArea: 'الجانب الروحي',
    bottleneckArea: 'الجانب الصحي',
    scores: {
      spiritual: 7.2,
      financial: 5.0,
      career: 6.0,
      personal: 5.5,
      learning: 5.8,
      family: 6.2,
      social: 4.5,
      health: 3.2,
    },
  },
  {
    month: '2026-01',
    monthName: 'يناير 2026',
    averageScore: 5.8,
    highlight: 'إيقاف التسرب المالي ببطاقة منفصلة والبدء في المشي 3 أيام أسبوعياً.',
    completedTasks: 24,
    topArea: 'الجانب المالي',
    bottleneckArea: 'الجانب الصحي',
    scores: {
      spiritual: 7.5,
      financial: 5.8,
      career: 6.2,
      personal: 5.8,
      learning: 6.0,
      family: 6.4,
      social: 5.0,
      health: 4.0,
    },
  },
  {
    month: '2026-02',
    monthName: 'فبراير 2026',
    averageScore: 6.1,
    highlight: 'تحسن ملحوظ في جودة النوم وانضباط في الصلاة مع العائلة.',
    completedTasks: 27,
    topArea: 'الجانب الأسري',
    bottleneckArea: 'الجانب الاجتماعي',
    scores: {
      spiritual: 7.8,
      financial: 6.0,
      career: 6.5,
      personal: 6.2,
      learning: 6.3,
      family: 7.0,
      social: 5.2,
      health: 4.8,
    },
  },
  {
    month: '2026-03',
    monthName: 'مارس 2026',
    averageScore: 6.4,
    highlight: 'تصفية ديون بطاقة الائتمان الأولى وتكثيف جلسات القراءة المعرفية.',
    completedTasks: 31,
    topArea: 'الجانب التعليمي',
    bottleneckArea: 'الجانب المهني',
    scores: {
      spiritual: 8.0,
      financial: 6.5,
      career: 6.6,
      personal: 6.5,
      learning: 7.0,
      family: 7.2,
      social: 5.5,
      health: 5.2,
    },
  },
  {
    month: '2026-04',
    monthName: 'أبريل 2026',
    averageScore: 6.7,
    highlight: 'رمضان المبارك: قفزة استثنائية في الروحانية والتواصل الأسري.',
    completedTasks: 36,
    topArea: 'الجانب الروحي',
    bottleneckArea: 'الجانب المهني',
    scores: {
      spiritual: 8.8,
      financial: 6.8,
      career: 6.5,
      personal: 6.8,
      learning: 7.2,
      family: 7.8,
      social: 6.2,
      health: 5.5,
    },
  },
  {
    month: '2026-05',
    monthName: 'مايو 2026',
    averageScore: 7.0,
    highlight: 'ترقية في العمل وتأسيس ميزانية واضحة للاستثمار والادخار.',
    completedTasks: 34,
    topArea: 'الجانب المهني',
    bottleneckArea: 'الجانب الصحي',
    scores: {
      spiritual: 8.2,
      financial: 7.2,
      career: 7.8,
      personal: 7.0,
      learning: 7.3,
      family: 7.5,
      social: 6.5,
      health: 6.0,
    },
  },
  {
    month: '2026-06',
    monthName: 'يونيو 2026',
    averageScore: 7.2,
    highlight: 'الاشتراك في نادي صحي وبدء تمارين المقاومة المنتظمة 3 مرات أسبوعياً.',
    completedTasks: 38,
    topArea: 'الجانب الصحي',
    bottleneckArea: 'الجانب المالي',
    scores: {
      spiritual: 8.3,
      financial: 7.1,
      career: 7.9,
      personal: 7.2,
      learning: 7.5,
      family: 7.6,
      social: 6.8,
      health: 6.8,
    },
  },
  {
    month: '2026-07',
    monthName: 'يوليو 2026',
    averageScore: 7.4,
    highlight: 'عطلة صيفية ممتعة مع الأسرة وتعزيز الروابط الاجتماعية.',
    completedTasks: 30,
    topArea: 'الجانب الأسري والاجتماعي',
    bottleneckArea: 'الجانب المعرفي',
    scores: {
      spiritual: 8.4,
      financial: 7.3,
      career: 7.8,
      personal: 7.4,
      learning: 7.0,
      family: 8.2,
      social: 7.4,
      health: 7.0,
    },
  },
  {
    month: '2026-08',
    monthName: 'أغسطس 2026',
    averageScore: 7.6,
    highlight: 'إنهاء دورة متقدمة في الذكاء الاصطناعي وبدء مشروع ريادي جانبي.',
    completedTasks: 41,
    topArea: 'الجانب المعرفي',
    bottleneckArea: 'الجانب الصحي',
    scores: {
      spiritual: 8.5,
      financial: 7.6,
      career: 8.2,
      personal: 7.6,
      learning: 8.0,
      family: 8.0,
      social: 7.2,
      health: 7.2,
    },
  },
  {
    month: '2026-09',
    monthName: 'سبتمبر 2026',
    averageScore: 7.8,
    highlight: 'بناء أول صندوق طوارئ يغطي 3 أشهر وتثبيت عادات الصباح.',
    completedTasks: 42,
    topArea: 'الجانب المالي',
    bottleneckArea: 'الجانب الاجتماعي',
    scores: {
      spiritual: 8.6,
      financial: 8.0,
      career: 8.4,
      personal: 8.0,
      learning: 8.1,
      family: 8.2,
      social: 7.2,
      health: 7.5,
    },
  },
  {
    month: '2026-10',
    monthName: 'أكتوبر 2026',
    averageScore: 8.0,
    highlight: 'وصول مؤشر التوازن الشامل إلى 8/10 لأول مرة وتكامل الأبعاد.',
    completedTasks: 44,
    topArea: 'الجانب الروحي',
    bottleneckArea: 'الجانب الصحي',
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
    month: '2026-11',
    monthName: 'نوفمبر 2026 (الشهر الحالي)',
    averageScore: 8.2,
    highlight: 'نضج منظومة الحياة: 82% نسبة التناغم وانسجام تام بين العمل والسكينة.',
    completedTasks: 46,
    topArea: 'الجانب المهني والروحي',
    bottleneckArea: 'الحفاظ على الاستدامة',
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

// 4 Recent Weeks Detailed Analysis
const RECENT_WEEKS_ANALYSIS: WeekData[] = [
  {
    weekNumber: 45,
    dateRange: '19 أكتوبر - 25 أكتوبر 2026',
    balanceScore: 7.9,
    weeklyHabitCompletion: 86,
    reflection: 'أسبوع إنتاجي ممتاز، تم إنجاز التقرير الفصلي بنجاح مع المحافظة على ركعتي الفجر ورياضة المشي.',
    wins: [
      'التزام 5 أيام بالمشي الصباحي 25 دقيقة',
      'إكمال ملخص كتاب في التفكير الاستراتيجي',
      'جلسة عائلية مسائية بدون شاشات',
    ],
    challenges: ['تأخر النوم ليلة الأربعاء بسبب اجتماع طارئ'],
  },
  {
    weekNumber: 46,
    dateRange: '26 أكتوبر - 1 نوفمبر 2026',
    balanceScore: 8.1,
    weeklyHabitCompletion: 92,
    reflection: 'هدوء نفسي عميق، وترتيب مالي دقيق باستقطاع 20% للاستثمار قبل الصرف.',
    wins: [
      'تحقيق استثمار شهري آلي في صناديق استثمارية',
      'زيارة صلة رحم وقضاء وقت ممتع مع الوالدين',
      'قراءة يومية في السيرة وتدبر القرآن',
    ],
    challenges: ['ضغط بسيط في مواعيد العمل يوم الخميس'],
  },
  {
    weekNumber: 47,
    dateRange: '2 نوفمبر - 8 نوفمبر 2026',
    balanceScore: 8.3,
    weeklyHabitCompletion: 94,
    reflection: 'أعلى نسبة إنجاز عادات محورية، تناغم كبير بين الطاقة البدنية والإنتاجية الذهنية.',
    wins: [
      'المواظبة على شرب 3 لترات ماء والنوم عند 11:00 مساءً',
      'تقديم ورشة عمل مصغرة لفريق العمل ونيل إشادة الإدارة',
      'حوار بناء مع شريك الحياة حول أهداف العام القادم',
    ],
    challenges: ['الاعتذار عن مناسبة اجتماعية غير ضرورية للحفاظ على الطاقة'],
  },
  {
    weekNumber: 48,
    dateRange: '9 نوفمبر - 15 نوفمبر 2026 (الأسبوع الحالي)',
    balanceScore: 8.4,
    weeklyHabitCompletion: 96,
    reflection: 'ثبات المنظومة عند مستوى استثنائي، مع جاهزية كاملة لانطلاقة مشاريع جديدة بوعي.',
    wins: [
      'حضور ذهني كامل في العمل دون تشتت الإشعارات',
      'ممارسة التأمل والامتنان يومياً لمدة 10 دقائق',
      'إكمال 100% من عادات الصباح الثلاث',
    ],
    challenges: ['الحفاظ على هذا الزخم العالي دون إرهاق'],
  },
];

interface YearlyAndWeeklyAnalyticsProps {
  theme?: 'light' | 'dark';
}

export const YearlyAndWeeklyAnalytics: React.FC<YearlyAndWeeklyAnalyticsProps> = ({ theme: _theme = 'light' }) => {
  const [selectedView, setSelectedView] = useState<'yearly' | 'weekly'>('yearly');
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(ONE_YEAR_MONTHLY_HISTORY.length - 1);

  const activeMonth = ONE_YEAR_MONTHLY_HISTORY[activeMonthIdx];

  return (
    <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-500/10 text-[#0B6E72] dark:text-cyan-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            سجل التحليلات التراكمية (سنة كاملة)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white transition-colors">
            تحليلات التوازن الأسبوعية والشهرية
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 transition-colors">
            تتبع نضج أبعاد حياتك وتطور المؤشرات عبر 12 شهراً وآخر الأسابيع التراكمية لحسابك.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex p-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSelectedView('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedView === 'yearly'
                ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>السجل السنوي (12 شهراً)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedView('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedView === 'weekly'
                ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>التقارير الأسبوعية</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 12-MONTH YEARLY TIMELINE */}
      {selectedView === 'yearly' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Metrics Bar for 1 Year Progress */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mb-1">النتيجة الابتدائية (ديسمبر 2025)</span>
              <span className="text-2xl font-black text-[#64748B] dark:text-slate-400 tabular-nums block" dir="ltr">
                5.4 / 10
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mb-1">النتيجة الحالية (نوفمبر 2026)</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums block" dir="ltr">
                8.2 / 10
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mb-1">نسبة النمو السنوي</span>
              <span className="text-2xl font-black text-[#0B6E72] dark:text-cyan-400 flex items-center gap-1 tabular-nums" dir="ltr">
                <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                +51.8%
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mb-1">المهام المنجزة خلال السنة</span>
              <span className="text-2xl font-black text-amber-600 dark:text-[#FBBF24]">398 مهمة</span>
            </div>
          </div>

          {/* Monthly Progression Chart (SVG Bars) */}
          <div className="bg-slate-50 dark:bg-[#0B161C] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-white">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400" />
                مخطط نمو معدل التوازن عبر شهور السنة (اختر شهراً للتفاصيل):
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                معدل الاستقرار السنوي: ممتاز
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 items-end h-44">
              {ONE_YEAR_MONTHLY_HISTORY.map((item, idx) => {
                const isSelected = idx === activeMonthIdx;
                const heightPercent = ((item.averageScore - 3) / 7) * 100;

                return (
                  <button
                    key={item.month}
                    type="button"
                    onClick={() => setActiveMonthIdx(idx)}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group transition-all cursor-pointer"
                  >
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        isSelected
                          ? 'text-[#0B6E72] dark:text-cyan-400'
                          : 'text-[#64748B] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
                      }`}
                    >
                      {item.averageScore}
                    </span>
                    <div className="w-full bg-slate-200/70 dark:bg-slate-800/80 rounded-t-xl overflow-hidden h-28 flex items-end">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-[#0B6E72] dark:bg-cyan-500 shadow-md shadow-[#0B6E72]/30 dark:shadow-cyan-500/30'
                            : 'bg-amber-500/50 dark:bg-amber-500/40 group-hover:bg-amber-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span
                      className={`text-[9px] font-semibold truncate w-full text-center ${
                        isSelected
                          ? 'text-[#0B6E72] dark:text-cyan-400 font-black'
                          : 'text-[#64748B] dark:text-slate-400'
                      }`}
                    >
                      {item.monthName.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Month Deep-Dive Card */}
          <div className="bg-white dark:bg-[#112028] border-2 border-[#0B6E72]/30 dark:border-cyan-500/30 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0B6E72] dark:bg-[#0E7490] text-white font-black text-lg flex items-center justify-center shadow-xs tabular-nums">
                  {activeMonth.averageScore}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A] dark:text-white">{activeMonth.monthName}</h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">{activeMonth.highlight}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  الأعلى: {activeMonth.topArea}
                </span>
                <span className="text-amber-800 dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  عنق الزجاجة: {activeMonth.bottleneckArea}
                </span>
              </div>
            </div>

            {/* 8 Areas Scores in Selected Month */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {ADVISORS_LIST.map((advisor) => {
                const sc = activeMonth.scores[advisor.id] || 0;
                return (
                  <div
                    key={advisor.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{advisor.avatarSvg}</span>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {advisor.title.split(' ')[0]} {advisor.title.split(' ')[1] || ''}
                      </span>
                    </div>
                    <span
                      className="text-xs font-black tabular-nums"
                      dir="ltr"
                      style={{ color: advisor.themeColor }}
                    >
                      {sc} / 10
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED WEEKLY REPORTS */}
      {selectedView === 'weekly' && (
        <div className="space-y-4 animate-fadeIn">
          {RECENT_WEEKS_ANALYSIS.map((wk) => (
            <div
              key={wk.weekNumber}
              className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6E72] dark:bg-[#0E7490] text-white flex items-center justify-center font-black text-sm">
                    أ{wk.weekNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#0F172A] dark:text-white">
                      الأسبوع {wk.weekNumber} ({wk.dateRange})
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 italic mt-0.5">"{wk.reflection}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">معدل التوازن</span>
                    <span className="text-base font-black text-[#0B6E72] dark:text-cyan-400 tabular-nums" dir="ltr">
                      {wk.balanceScore} / 10
                    </span>
                  </div>
                  <div className="text-right pr-3 border-r border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 block">انضباط العادات</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                      {wk.weeklyHabitCompletion}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Wins and Challenges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white dark:bg-[#112028] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    انتصارات الأسبوع الصغيرة:
                  </span>
                  <ul className="space-y-1.5 text-[#334155] dark:text-slate-300">
                    {(wk.wins || []).map((win, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <span className="leading-relaxed">{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-[#112028] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-amber-800 dark:text-[#FBBF24] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600 dark:text-[#FBBF24]" />
                    تحديات وتوصية التعديل:
                  </span>
                  <ul className="space-y-1.5 text-[#334155] dark:text-slate-300">
                    {(wk.challenges || []).map((ch, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                        <span className="leading-relaxed">{ch}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
