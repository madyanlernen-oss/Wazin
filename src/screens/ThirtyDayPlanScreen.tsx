import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Download,
  Printer,
  ShieldCheck,
  Check,
  Edit3,
  Clock,
  Target,
  LayoutDashboard,
  Award,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { LifeAreaId, ThirtyDayPlanState, DayPlanTask, Screen } from '../types/lifeBalance';
import { isolateNumbersInText } from '../components/FormattedChatMessage';
import {
  generateThirtyDayPlan,
  getStoredThirtyDayPlan,
  saveThirtyDayPlanToStorage,
  syncThirtyDayPlanWithScores,
  resolveActivePlanDayAndWeek,
  getPrioritizedScoredDomains,
  exportPlanAsText,
  DOMAIN_META,
  WEEK_INFO,
} from '../utils/thirtyDayPlanGenerator';
import {
  formatThirtyDayPlanForArabicPdf,
  getDomainArabicName,
} from '../utils/arabicDomainLabels';
import { ADVISORS_LIST } from '../data/advisorsData';

interface ThirtyDayPlanScreenProps {
  scores: Record<LifeAreaId, number>;
  onNavigate: (screen: Screen) => void;
  theme?: 'light' | 'dark';
}

export const ThirtyDayPlanScreen: React.FC<ThirtyDayPlanScreenProps> = ({
  scores,
  onNavigate,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  // Load plan from storage and immediately sync with live scores to prevent any stale state
  const [plan, setPlan] = useState<ThirtyDayPlanState | null>(() => {
    const stored = getStoredThirtyDayPlan();
    if (!stored) return null;
    return syncThirtyDayPlanWithScores(stored, scores).plan;
  });
  const initialActiveFocus = resolveActivePlanDayAndWeek(plan);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialActiveFocus.dayNumber);
  const [activeWeekTab, setActiveWeekTab] = useState<number>(initialActiveFocus.weekNumber);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [showCelebrationToast, setShowCelebrationToast] = useState(false);
  const [customInputText, setCustomInputText] = useState('');

  // Active incomplete day pointer derived from actual completion progress
  const activeFocusDay = resolveActivePlanDayAndWeek(plan);

  const handleSelectWeek = (wNum: number) => {
    setActiveWeekTab(wNum);
    if (!plan) return;
    const weekTasks = plan.days.filter((d) => d.weekNumber === wNum);
    const targetDay = weekTasks.find((d) => !d.isCompleted) || weekTasks[0];
    if (targetDay) {
      setSelectedDayNum(targetDay.dayNumber);
    }
  };

  // Keep plan focus domains & 30-day schedule synchronized whenever Life Wheel scores change
  useEffect(() => {
    if (!plan) return;
    const { plan: syncedPlan, didUpdate } = syncThirtyDayPlanWithScores(plan, scores);
    if (didUpdate) {
      setPlan(syncedPlan);
    }
  }, [scores, plan]);

  // Sync selected day and input when plan loads or selectedDay changes
  useEffect(() => {
    if (plan && plan.days.length > 0) {
      const activeDay = plan.days.find((d) => d.dayNumber === selectedDayNum) || plan.days[0];
      if (activeDay) {
        setActiveWeekTab(activeDay.weekNumber);
        setCustomInputText(activeDay.customTask || '');
      }
    }
  }, [plan, selectedDayNum]);

  // Current active day task
  const currentTask: DayPlanTask | undefined = plan?.days.find(
    (d) => d.dayNumber === selectedDayNum
  );

  // Completion calculation
  const completedCount = plan ? plan.days.filter((d) => d.isCompleted).length : 0;
  const progressPercent = plan ? Math.round((completedCount / plan.days.length) * 100) : 0;

  // Handler: Generate new plan
  const handleCreatePlan = () => {
    const newPlan = generateThirtyDayPlan(scores);
    setPlan(newPlan);
    setSelectedDayNum(1);
    setActiveWeekTab(1);
    saveThirtyDayPlanToStorage(newPlan);
  };

  // Handler: Reset Plan Confirmation
  const handleConfirmReset = () => {
    const freshPlan = generateThirtyDayPlan(scores);
    setPlan(freshPlan);
    setSelectedDayNum(1);
    setActiveWeekTab(1);
    setShowResetConfirm(false);
    saveThirtyDayPlanToStorage(freshPlan);
  };

  // Handler: Select a smart suggestion
  const handleSelectSuggestion = (suggestion: string) => {
    if (!plan || !currentTask) return;

    const updatedDays = plan.days.map((d) => {
      if (d.dayNumber === selectedDayNum) {
        return {
          ...d,
          selectedTask: suggestion,
          isCustomSelected: false,
        };
      }
      return d;
    });

    const updatedPlan: ThirtyDayPlanState = {
      ...plan,
      days: updatedDays,
    };

    setPlan(updatedPlan);
    saveThirtyDayPlanToStorage(updatedPlan);
  };

  // Handler: Select or edit custom task
  const handleCustomTaskChange = (text: string) => {
    setCustomInputText(text);
    if (!plan || !currentTask) return;

    const updatedDays = plan.days.map((d) => {
      if (d.dayNumber === selectedDayNum) {
        return {
          ...d,
          customTask: text,
          selectedTask: text.trim() || d.defaultSuggestions[0],
          isCustomSelected: text.trim().length > 0,
        };
      }
      return d;
    });

    const updatedPlan: ThirtyDayPlanState = {
      ...plan,
      days: updatedDays,
    };

    setPlan(updatedPlan);
    saveThirtyDayPlanToStorage(updatedPlan);
  };

  // Handler: Toggle Task Completion for Selected Day
  const handleToggleCompletion = () => {
    if (!plan || !currentTask) return;

    const nextCompleted = !currentTask.isCompleted;
    if (nextCompleted) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
      setShowCelebrationToast(true);
      setTimeout(() => setShowCelebrationToast(false), 3200);
    }
    const updatedDays = plan.days.map((d) => {
      if (d.dayNumber === selectedDayNum) {
        return {
          ...d,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
      }
      return d;
    });

    // Advance to next day if completing and next day exists
    let nextCurrentDay = plan.currentDay;
    if (nextCompleted && selectedDayNum < 30) {
      nextCurrentDay = Math.max(plan.currentDay, selectedDayNum + 1);
    }

    const updatedPlan: ThirtyDayPlanState = {
      ...plan,
      days: updatedDays,
      currentDay: nextCurrentDay,
    };

    setPlan(updatedPlan);
    saveThirtyDayPlanToStorage(updatedPlan);

    // Auto advance to next day for convenience after a short delay
    if (nextCompleted && selectedDayNum < 30) {
      setTimeout(() => {
        setSelectedDayNum((prev) => Math.min(30, prev + 1));
      }, 400);
    }
  };

  // Handler: Export Plan Text
  const handleExportText = () => {
    if (!plan) return;
    const text = exportPlanAsText(plan);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Single source of truth for prioritized domains sorted strictly ascending (lowest evaluated score first, excluding unrated domains)
  const lowestDomains = getPrioritizedScoredDomains(scores);
  const sortedFocusDomains: LifeAreaId[] =
    lowestDomains.length > 0
      ? lowestDomains.map((d) => d.id)
      : plan
        ? [...plan.focusDomains].sort((a, b) => {
            const sa = Number(scores?.[a]) || 0;
            const sb = Number(scores?.[b]) || 0;
            if (sa <= 0 && sb > 0) return 1;
            if (sb <= 0 && sa > 0) return -1;
            return sa - sb;
          })
        : [];
  const pdfPlanPayload = plan ? formatThirtyDayPlanForArabicPdf(plan, scores) : null;

  return (
    <div className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 transition-colors duration-300">
      {/* 1. Hero Banner (مطابق تماماً لصورة 1) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#06383A] via-[#0A4B4B] to-[#052A2C] text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-teal-600/30">
        {/* Ambient Halos */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Right Text Column (RTL start) */}
          <div className="space-y-4 max-w-2xl text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>وزان · تجربة شخصية قابلة للتنفيذ</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              من معرفة التوازن إلى صناعة التغيير.
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-medium">
              30 يومًا، خطوة بسيطة كل يوم. يحوّل وزان نتائج تقييمك إلى خطة عملية تركز على الجوانب الأكثر حاجةً للاهتمام.
            </p>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-200 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                <span>يعمل دون اتصال بخدمة الذكاء الاصطناعي</span>
              </span>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <span>لوحة التحكم</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Left Large 30-Day Circle Indicator (مطابق لصورة 1) */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-teal-400/30 bg-[#073D3F]/80 flex flex-col items-center justify-center p-4 text-center shadow-2xl backdrop-blur-xs">
              <div className="absolute inset-1 rounded-full border border-teal-300/20 pointer-events-none" />
              <CalendarDays className="w-6 h-6 text-amber-300 mb-1" />
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">30</span>
              <span className="text-[11px] sm:text-xs text-teal-200 font-bold mt-0.5">يومًا لتوازن أفضل</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Setup Cards (إذا لم تكن الخطة منشأة بعد - مطابق لصورة 2) */}
      {!plan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card: How It Works */}
          <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                كيف تعمل التجربة؟
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                  01
                </span>
                <div className="text-right">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                    قيّم جوانب حياتك
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    أجب عن أسئلة المجالات التي تهمك في عجلة الحياة.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                  02
                </span>
                <div className="text-right">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                    اكتشف أولوياتك
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    نختار الجوانب ذات الدرجات الأقل من المجالات المقيّمة لبدء علاجها أولاً.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                  03
                </span>
                <div className="text-right">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                    نفّذ وتتبع
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مهمة يومية بسيطة مع 3 اقتراحات ذكية أو اقتراح شخصي تضعه بنفسك.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
              هذه توصيات مبنية على قواعد متوازنة وليست تحليلاً طبياً أو استثمارياً متخصصاً.
            </p>
          </div>

          {/* Card: Plan Starts From Your Evaluation */}
          <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-[#0F6E6E] dark:text-cyan-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                  خطتك تبدأ من تقييمك
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                نرتب درجات مجالات حياتك التي أجريت تقييمها، ونختار حتى ثلاثة منها تحتاج تركيزاً أكبر. ثم نقترح مهمة بسيطة لكل يوم يمكنك تعديلها أو اختيار بديل لها.
              </p>

              {/* Priority pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {lowestDomains.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-[#0F6E6E] dark:text-cyan-400 font-black font-mono">
                      ({item.score.toFixed(1)} / 10)
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreatePlan}
              className="w-full py-4 px-6 rounded-2xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>أنشئ خطتي الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 3. Active Plan Workspace (مطابق لصورة 3 و4 و5 مع الميزة المطلوبة) */
        <div className="space-y-6 sm:space-y-8">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Start Date */}
            <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 text-right space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                <span>موعد البداية</span>
                <CalendarDays className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">
                {plan.startDateStr}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
                <span>
                  المهمة المعروضة: اليوم{' '}
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-bold text-[#0F172A] dark:text-slate-200">
                    {selectedDayNum} / 30
                  </span>
                </span>
                {selectedDayNum !== activeFocusDay.dayNumber && completedCount < 30 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayNum(activeFocusDay.dayNumber);
                      setActiveWeekTab(activeFocusDay.weekNumber);
                    }}
                    className="text-[11px] font-bold text-[#0F6E6E] dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    الانتقال لليوم النشط (<span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{activeFocusDay.dayNumber}</span>)
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Focus Domains */}
            <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 text-right space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                <span>مجالات التركيز</span>
                <Target className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sortedFocusDomains.map((id) => {
                  const scoreVal = Number(scores?.[id]) || 0;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-300 border border-teal-200/80 dark:border-teal-800/40 text-xs font-bold"
                    >
                      <span>{DOMAIN_META[id]?.icon || '🎯'}</span>
                      <span>{getDomainArabicName(id)}</span>
                      {scoreVal > 0 && (
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-[11px] opacity-85">
                          ({scoreVal.toFixed(1)} / 10)
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                اختيرت تلقائياً من أدنى درجات عجلة حياتك
              </div>
            </div>

          {/* Card 3: Plan Progress */}
          <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 text-right space-y-2 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                تقدم الخطة
              </span>
              <span className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white block">
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{completedCount} / 30</span> يوماً
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                كل إنجاز صغير له أثر تراكمي
              </span>
            </div>

            {/* Progress Percentage Badge */}
            <div className="w-14 h-14 rounded-full border-4 border-teal-500/20 bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center flex-shrink-0">
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-xs font-black text-[#0F6E6E] dark:text-cyan-300 font-mono">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

          {/* 30-Day Interactive Visual Progress Bar with Weekly Milestones */}
          <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                <span>مسار الإنجاز التراكمي لـ 30 يوماً</span>
              </span>
              <span className="font-bold text-[#0F6E6E] dark:text-cyan-400">
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{completedCount} / 30</span> يوماً مُنجز (<span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{progressPercent}%</span>)
              </span>
            </div>

            {/* Progress track */}
            <div className="relative w-full h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-[#0F6E6E] dark:from-cyan-400 dark:via-teal-400 dark:to-emerald-400 transition-all duration-500 rounded-full shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

              {/* 4 Weekly Milestones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 text-[11px]">
        {[
          { week: 1, label: 'الأسبوع 1', days: 'يوم 1 - 7', target: 7 },
          { week: 2, label: 'الأسبوع 2', days: 'يوم 8 - 14', target: 14 },
          { week: 3, label: 'الأسبوع 3', days: 'يوم 15 - 21', target: 21 },
          { week: 4, label: 'الأسبوع 4', days: 'يوم 22 - 30', target: 30 },
        ].map((m) => {
          const isPassed = completedCount >= m.target;
          const isCurrent =
            completedCount < m.target &&
            (m.week === 1 || completedCount >= [0, 7, 14, 21][m.week - 1]);
          return (
            <button
              key={m.week}
              type="button"
              onClick={() => handleSelectWeek(m.week)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${isPassed
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                : isCurrent
                  ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-400 dark:border-cyan-500 text-teal-800 dark:text-cyan-300 font-extrabold ring-1 ring-teal-400/50'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
            >
              <div className="flex items-center justify-center gap-1">
                {isPassed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                )}
                <span>{m.label}</span>
              </div>
              <span className="text-[10px] opacity-75 block mt-0.5">{isolateNumbersInText(m.days)}</span>
            </button>
          );
        })}
      </div>
    </div>

          {/* Main Plan Area: Two Columns (Interactive on screen; full 30-day Arabic table rendered cleanly in PDF print) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
            {/* Left Card: مهمتك لهذا اليوم (5 Columns on Desktop) - WITH USER'S REQUESTED 3 SUGGESTIONS + CUSTOM OPTION */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm sticky top-6">
              {/* Day & Domain Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      اليوم <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{selectedDayNum} / 30</span>
                    </span>
                    {currentTask?.isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800/60">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>مُنجز</span>
                      </span>
                    ) : selectedDayNum === activeFocusDay.dayNumber ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-cyan-950/60 text-[#0F6E6E] dark:text-cyan-300 text-[10px] font-black border border-teal-200 dark:border-cyan-800/60">
                        <span>اليوم النشط</span>
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                    <span>{currentTask?.domainIcon || '🎯'}</span>
                    <span>{currentTask ? getDomainArabicName(currentTask.domainId || currentTask.domainTitle) : ''}</span>
                  </span>
                </div>

        {/* ✨ The User's Specific Requested Feature: 3 Smart Suggestions + Custom Task */}
        <div className="space-y-3">
          {/* 3 Smart Suggestions */}
          {currentTask?.defaultSuggestions.map((suggestion, idx) => {
            const isSelected =
              !currentTask.isCustomSelected && currentTask.selectedTask === suggestion;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-right p-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-start gap-3 border ${isSelected
                  ? 'bg-[#0F6E6E]/10 dark:bg-cyan-950/50 border-[#0F6E6E] dark:border-cyan-400 text-[#0F6E6E] dark:text-cyan-300 shadow-xs'
                  : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-cyan-500'
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isSelected
                    ? 'border-[#0F6E6E] dark:border-cyan-400 bg-[#0F6E6E] dark:bg-cyan-400 text-white dark:text-[#0B161C]'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                    }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="leading-relaxed flex-1">{isolateNumbersInText(suggestion)}</span>
              </button>
            );
          })}

          {/* Option 4: Custom Personal Suggestion (اقتراح شخصي مخصص) */}
          <div
            className={`p-3.5 rounded-2xl border transition-all space-y-2 ${currentTask?.isCustomSelected
              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
              : 'bg-slate-50/60 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>أو اكتب اقتراحك الشخصي لهذا اليوم:</span>
              </span>
              {currentTask?.isCustomSelected && (
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md font-bold">
                  محدد حالياً
                </span>
              )}
            </div>

            <input
              type="text"
              value={customInputText}
              onChange={(e) => handleCustomTaskChange(e.target.value)}
              placeholder="مثال: مشي 15 دقيقة مع الأهل، أو تنظيم طاولة المكتب..."
              className="w-full bg-white dark:bg-[#071318] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              dir="rtl"
            />
          </div>
        </div>

        {/* Time Estimate */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>اقتراح: 10 دقائق تقريباً</span>
        </div>

        {/* Primary Complete Action Button */}
        <button
          type="button"
          onClick={handleToggleCompletion}
          className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${currentTask?.isCompleted
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500 text-white hover:scale-[1.01] active:scale-98'
            }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>
            {currentTask?.isCompleted
              ? 'تم إنجاز مهمة هذا اليوم (انقر للإلغاء)'
              : 'أنجزت مهمة اليوم'}
          </span>
        </button>

        {/* Bottom Day Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
          <button
            type="button"
            disabled={selectedDayNum <= 1}
            onClick={() => setSelectedDayNum((prev) => Math.max(1, prev - 1))}
            className="inline-flex items-center gap-1.5 hover:text-[#0F6E6E] dark:hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>

          <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-bold">
            {selectedDayNum} / 30
          </span>

          <button
            type="button"
            disabled={selectedDayNum >= 30}
            onClick={() => setSelectedDayNum((prev) => Math.min(30, prev + 1))}
            className="inline-flex items-center gap-1.5 hover:text-[#0F6E6E] dark:hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <span>اليوم التالي</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Area: Weeks & Days Selector (7 Columns on Desktop) */}
      <div className="lg:col-span-7 bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm">
        {/* Header with Title and Export Button */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="text-right">
            <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
              رحلتك خلال 30 يومًا
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اختر أي يوم للاطلاع على مهمته واختيار اقتراحك أو تسجيل إنجازه
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="طباعة أو تصدير الخطة بصيغة PDF"
            >
              <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
              <span>تصدير PDF / طباعة</span>
            </button>
            <button
              type="button"
              onClick={handleExportText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{copiedToast ? 'تم النسخ إلى الحافظة! ✓' : 'حفظ الخطة نصياً'}</span>
            </button>
          </div>
        </div>

        {/* Week Tabs Selector (الأسبوع 1، 2، 3، 4، الختام) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[1, 2, 3, 4, 5].map((wNum) => {
            const weekTasks = plan.days.filter((d) => d.weekNumber === wNum);
            const weekCompleted = weekTasks.filter((d) => d.isCompleted).length;
            const isWeekFullyCompleted = weekTasks.length > 0 && weekCompleted === weekTasks.length;
            const isWeekActive = activeWeekTab === wNum;

            return (
              <button
                key={wNum}
                type="button"
                onClick={() => handleSelectWeek(wNum)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer border ${
                  isWeekActive
                    ? isWeekFullyCompleted
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 shadow-sm font-black'
                      : 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] shadow-sm font-black'
                    : isWeekFullyCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/70'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {isWeekFullyCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>{wNum === 5 ? 'الختام' : `الأسبوع ${wNum}`}</span>
                </span>
                <span className="block text-[10px] opacity-85 mt-0.5">
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{weekCompleted} / {weekTasks.length}</span> مكتمل
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Week Theme Banner */}
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/40 text-right space-y-1">
          <span className="text-xs sm:text-sm font-black text-[#0F6E6E] dark:text-cyan-300 block">
            {WEEK_INFO[activeWeekTab]?.title}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300 block">
            {WEEK_INFO[activeWeekTab]?.subtitle}
          </span>
        </div>

        {/* Day Buttons Row for Active Week */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {plan.days
            .filter((d) => d.weekNumber === activeWeekTab)
            .map((day) => {
              const isSelected = selectedDayNum === day.dayNumber;
              const isCompleted = day.isCompleted;
              const isActiveTarget = !isCompleted && day.dayNumber === activeFocusDay.dayNumber;

              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayNum(day.dayNumber)}
                  className={`relative p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[84px] ${isSelected
                    ? isCompleted
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] dark:border-cyan-400 shadow-md ring-2 ring-teal-500/35'
                    : isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800 hover:border-emerald-400'
                      : isActiveTarget
                        ? 'bg-teal-50/80 dark:bg-cyan-950/30 text-[#0F6E6E] dark:text-cyan-300 border-teal-400 dark:border-cyan-500 ring-1 ring-teal-400/40'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                >
                  {isCompleted && (
                    <span
                      className={`absolute top-1.5 start-1.5 w-4 h-4 rounded-full flex items-center justify-center ${isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-600 text-white dark:bg-emerald-500'
                        }`}
                      title="مُنجز"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  {!isCompleted && isActiveTarget && (
                    <span
                      className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-[#0F6E6E] dark:bg-cyan-400 animate-pulse'
                        }`}
                      title="اليوم النشط"
                    />
                  )}
                  <span className="text-[11px] font-bold opacity-80">يوم</span>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-base font-black font-mono">
                    {day.dayNumber}
                  </span>
                  <span className="text-sm mt-1">{day.domainIcon}</span>
                </button>
              );
            })}
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إنشاء خطة جديدة</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
            <span>يُسجّل تقدمك على هذا الجهاز فقط، ولا يحتاج إلى حساب خارجي.</span>
          </div>
        </div>
      </div>
    </div>

    {/* 4. Bottom Card: لماذا هذه المجالات؟ (مطابق لصورة 4) */}
    <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm text-right">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-teal-600 dark:text-cyan-400" />
        <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
          لماذا هذه المجالات؟
        </h3>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        اختيرت تلقائياً من أقل درجات تقييمك المسجلة (مرتبة تصاعدياً من الأدنى للأعلى). درجة صفر تعني «غير مقيّم»، لذلك لا تُحسب ضمن الأولويات.
      </p>

      <div className="space-y-3 pt-2">
        {sortedFocusDomains.map((id) => {
          const scoreVal = Number(scores?.[id]) || 0;
          const percent = Math.min(100, Math.round(scoreVal * 10));

          return (
            <div key={id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-slate-500 dark:text-slate-400 font-mono">
                  {scoreVal.toFixed(1)} / 10
                </span>
                <span className="flex items-center gap-1.5 text-[#0F172A] dark:text-white">
                  <span>{getDomainArabicName(id)}</span>
                  <span>{DOMAIN_META[id]?.icon || '🎯'}</span>
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#0F6E6E] dark:bg-[#0891B2] rounded-full transition-all duration-500"
                  style={{ width: `${percent}% ` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Printable Full 30-Day Arabic PDF Schedule (hidden on screen, shown in PDF / print) */}
    {pdfPlanPayload && (
      <div className="hidden print:block space-y-4 text-right" dir="rtl">
        <div className="border-b-2 border-slate-300 pb-3">
          <h2 className="text-xl font-black text-[#0F172A]">
            منصة وزان — خطة التوازن الذكية لمدة 30 يوماً
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            موعد البدء: {pdfPlanPayload.startDateStr} • نسبة الإنجاز: {pdfPlanPayload.completedCount} / 30 ({pdfPlanPayload.progressPercent}%)
          </p>
          <p className="text-xs font-bold text-[#0F6E6E] mt-1">
            مجالات التركيز (الأدنى درجة):{' '}
            {pdfPlanPayload.focusDomains
              .map((d) => (d.score > 0 ? `${d.label} (${d.score.toFixed(1)}/10)` : d.label))
              .join(' • ')}
          </p>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-2 text-right font-black border border-slate-300 w-16">اليوم</th>
              <th className="p-2 text-right font-black border border-slate-300 w-44">المجال</th>
              <th className="p-2 text-right font-black border border-slate-300">المهمة اليومية</th>
              <th className="p-2 text-right font-black border border-slate-300 w-24">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {pdfPlanPayload.days.map((day) => (
              <tr key={day.dayNumber} className="border-b border-slate-200 print-avoid-break">
                <td className="p-2 border border-slate-200 font-bold">يوم {day.dayNumber}</td>
                <td className="p-2 border border-slate-200 font-bold text-[#0F6E6E]">
                  {day.domainLabel}
                </td>
                <td className="p-2 border border-slate-200">{isolateNumbersInText(day.taskText)}</td>
                <td className="p-2 border border-slate-200 font-bold">
                  {day.isCompleted ? 'منجز ✓' : 'قيد التنفيذ'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
      )}

{/* Confirmation Modal for Resetting Plan */ }
{
  showResetConfirm && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={() => setShowResetConfirm(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <RotateCcw className="w-5 h-5" />
          <h3 className="font-black text-sm text-[#0F172A] dark:text-white">
            إنشاء خطة جديدة؟
          </h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          سيتم إنشاء خطة جديدة لـ 30 يوماً وإعادة حساب المجالات ذات الأولوية وفق أحدث تقييماتك في عجلة الحياة.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(false)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm cursor-pointer"
          >
            نعم، أنشئ خطة جديدة
          </button>
        </div>
      </div>
    </div>
  )
}

{/* Micro-Celebration Toast on Completing Day Task */ }
{
  showCelebrationToast && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F6E6E] dark:bg-cyan-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/20 select-none pointer-events-none">
      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
      <span>🎉 رائع جداً! تم تسجيل إنجاز اليوم بنجاح وخطوت خطوة للأمام نحو التوازن.</span>
    </div>
  )
}
    </div >
  );
};
