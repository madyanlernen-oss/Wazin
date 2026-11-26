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
  Clock,
  Target,
  Award,
  Lightbulb,
  SlidersHorizontal,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import { LifeAreaId, ThirtyDayPlanState, DayPlanTask, DailyGoalItem, Screen } from '../types/lifeBalance';
import { isolateNumbersInText } from '../components/FormattedChatMessage';
import {
  ALL_CANONICAL_DOMAINS,
  MAX_DAILY_GOALS,
  applyFocusDomainsToPlan,
  extractPriorityDomains,
  generateThirtyDayPlan,
  getStoredCustomFocusDomains,
  getStoredThirtyDayPlan,
  resolveDayGoals,
  saveCustomFocusDomainsToStorage,
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
  localizeDomainText,
} from '../utils/arabicDomainLabels';

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
  void theme;

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
  const [goalLimitWarning, setGoalLimitWarning] = useState<string | null>(null);
  const limitWarningTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customFocusDomains, setCustomFocusDomains] = useState<LifeAreaId[] | null>(() => {
    const storedCustom = getStoredCustomFocusDomains();
    if (storedCustom && storedCustom.length === 3) return storedCustom;
    return null;
  });
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [draftFocusDomains, setDraftFocusDomains] = useState<LifeAreaId[]>([]);

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

  // Sync active week tab and clear draft custom task input when selected day changes
  useEffect(() => {
    if (plan && plan.days.length > 0) {
      const activeDay = plan.days.find((d) => d.dayNumber === selectedDayNum) || plan.days[0];
      if (activeDay) {
        setActiveWeekTab(activeDay.weekNumber);
      }
    }
    setCustomInputText('');
    setGoalLimitWarning(null);
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
    const override =
      customFocusDomains && customFocusDomains.length === 3 ? customFocusDomains : undefined;
    const newPlan = generateThirtyDayPlan(scores, override);
    setPlan(newPlan);
    setSelectedDayNum(1);
    setActiveWeekTab(1);
    saveThirtyDayPlanToStorage(newPlan);
  };

  // Handler: Reset Plan Confirmation
  const handleConfirmReset = () => {
    setCustomFocusDomains(null);
    saveCustomFocusDomainsToStorage(null);
    const freshPlan = generateThirtyDayPlan(scores);
    setPlan(freshPlan);
    setSelectedDayNum(1);
    setActiveWeekTab(1);
    setShowResetConfirm(false);
    saveThirtyDayPlanToStorage(freshPlan);
  };

  // Handlers: Focus Areas Customization Modal (Default weakest 3, user can swap to any 3)
  const handleOpenFocusModal = () => {
    const currentSelection =
      plan?.focusDomains && plan.focusDomains.length === 3
        ? [...plan.focusDomains]
        : customFocusDomains && customFocusDomains.length === 3
          ? [...customFocusDomains]
          : extractPriorityDomains(scores);
    setDraftFocusDomains(currentSelection.slice(0, 3));
    setShowFocusModal(true);
  };

  const handleToggleDraftDomain = (id: LifeAreaId) => {
    setDraftFocusDomains((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleConfirmCustomFocus = () => {
    if (draftFocusDomains.length !== 3) return;
    const chosen = draftFocusDomains.slice(0, 3);
    setCustomFocusDomains(chosen);
    saveCustomFocusDomainsToStorage(chosen);
    if (plan) {
      const updated = applyFocusDomainsToPlan(plan, chosen, true);
      setPlan(updated);
    }
    setShowFocusModal(false);
  };

  const handleResetToWeakestDomains = () => {
    const weakest = extractPriorityDomains(scores);
    const resetTarget: LifeAreaId[] =
      weakest.length > 0 ? weakest : ['health', 'financial', 'spiritual'];
    setCustomFocusDomains(null);
    saveCustomFocusDomainsToStorage(null);
    setDraftFocusDomains(resetTarget);
    if (plan) {
      const updated = applyFocusDomainsToPlan(plan, resetTarget, false);
      setPlan(updated);
    }
    setShowFocusModal(false);
  };

  const triggerGoalLimitWarning = (
    msg: string = 'الحد الأقصى 4 أهداف في اليوم — احذف هدفاً أولاً لإضافة هدف جديد.'
  ) => {
    setGoalLimitWarning(msg);
    if (limitWarningTimeoutRef.current) clearTimeout(limitWarningTimeoutRef.current);
    limitWarningTimeoutRef.current = setTimeout(() => setGoalLimitWarning(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (limitWarningTimeoutRef.current) clearTimeout(limitWarningTimeoutRef.current);
    };
  }, []);

  // Unified commit helper keeping dailyGoals (1..4), selectedTask, customTasks, and day completion in sync
  const commitDayGoalsUpdate = (
    targetDayNum: number,
    nextGoalsRaw: DailyGoalItem[],
    triggerCelebrationOnComplete: boolean = false,
    autoAdvanceIfSelected: boolean = false
  ) => {
    if (!plan || nextGoalsRaw.length === 0) return;
    const prevDay = plan.days.find((d) => d.dayNumber === targetDayNum);
    if (!prevDay) return;

    const nextGoals = nextGoalsRaw.slice(0, MAX_DAILY_GOALS);
    const allGoalsDone = nextGoals.length > 0 && nextGoals.every((g) => g.isCompleted);
    const newlyCompletedDay = !prevDay.isCompleted && allGoalsDone;
    const customList = nextGoals.filter((g) => g.isCustom).map((g) => g.text);
    const primaryGoal = nextGoals[0];

    if (newlyCompletedDay && triggerCelebrationOnComplete) {
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
      if (d.dayNumber !== targetDayNum) return d;
      return {
        ...d,
        dailyGoals: nextGoals,
        customTasks: customList,
        customTask: customList[0] || '',
        selectedTask: primaryGoal.text,
        isCustomSelected: Boolean(primaryGoal.isCustom),
        isCompleted: allGoalsDone,
        completedAt: allGoalsDone ? (d.completedAt || Date.now()) : undefined,
      };
    });

    let nextCurrentDay = plan.currentDay;
    if (allGoalsDone && targetDayNum < 30) {
      nextCurrentDay = Math.max(plan.currentDay, targetDayNum + 1);
    }

    const updatedPlan: ThirtyDayPlanState = {
      ...plan,
      days: updatedDays,
      currentDay: nextCurrentDay,
    };

    setPlan(updatedPlan);
    saveThirtyDayPlanToStorage(updatedPlan);

    if (autoAdvanceIfSelected && newlyCompletedDay && targetDayNum === selectedDayNum && targetDayNum < 30) {
      setTimeout(() => {
        setSelectedDayNum((prev) => Math.min(30, prev + 1));
      }, 400);
    }
  };

  // Handler: Add or toggle a smart suggestion in today's goals (1..4 cap)
  const handleToggleSuggestionInDay = (suggestion: string) => {
    if (!plan || !currentTask) return;
    const goals = resolveDayGoals(currentTask);
    const existing = goals.find((g) => g.text === suggestion);

    if (existing) {
      if (goals.length <= 1) {
        triggerGoalLimitWarning('يجب أن يحتوي اليوم على هدف واحد على الأقل.');
        return;
      }
      setGoalLimitWarning(null);
      commitDayGoalsUpdate(
        selectedDayNum,
        goals.filter((g) => g.id !== existing.id)
      );
      return;
    }

    if (goals.length >= MAX_DAILY_GOALS) {
      triggerGoalLimitWarning('الحد الأقصى 4 أهداف في اليوم — احذف هدفاً أولاً لإضافة هذا الاقتراح.');
      return;
    }

    setGoalLimitWarning(null);
    const addedGoal: DailyGoalItem = {
      id: `sug_${selectedDayNum}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: suggestion,
      isCompleted: false,
      isCustom: false,
    };
    commitDayGoalsUpdate(selectedDayNum, [...goals, addedGoal]);
  };

  // Handler: Add a new custom goal/task at the top on Enter / + إضافة (up to MAX_DAILY_GOALS = 4)
  const handleAddCustomTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInputText.trim();
    if (!plan || !currentTask || !trimmed) return;

    const goals = resolveDayGoals(currentTask);
    if (goals.some((g) => g.text === trimmed)) {
      setCustomInputText('');
      setGoalLimitWarning(null);
      return;
    }

    if (goals.length >= MAX_DAILY_GOALS) {
      triggerGoalLimitWarning('الحد الأقصى 4 أهداف في اليوم');
      return;
    }

    setGoalLimitWarning(null);
    const newCustomGoal: DailyGoalItem = {
      id: `custom_${selectedDayNum}_${Date.now()}`,
      text: trimmed,
      isCompleted: false,
      isCustom: true,
    };

    commitDayGoalsUpdate(selectedDayNum, [newCustomGoal, ...goals]);
    setCustomInputText('');
  };

  // Handler: Toggle completion of an individual daily goal independently
  const handleToggleSingleGoalCompletion = (goalId: string) => {
    if (!plan || !currentTask) return;
    const goals = resolveDayGoals(currentTask);
    const nextGoals = goals.map((g) => {
      if (g.id !== goalId) return g;
      const nextDone = !g.isCompleted;
      return {
        ...g,
        isCompleted: nextDone,
        completedAt: nextDone ? Date.now() : undefined,
      };
    });
    commitDayGoalsUpdate(selectedDayNum, nextGoals, true, false);
  };

  // Handler: Remove a goal/task from the selected day (keeping at least 1 goal per day)
  const handleRemoveDailyGoal = (goalId: string) => {
    if (!plan || !currentTask) return;
    const goals = resolveDayGoals(currentTask);
    if (goals.length <= 1) {
      triggerGoalLimitWarning('يجب أن يحتوي اليوم على هدف واحد على الأقل.');
      return;
    }
    setGoalLimitWarning(null);
    commitDayGoalsUpdate(
      selectedDayNum,
      goals.filter((g) => g.id !== goalId)
    );
  };

  // Handler: Toggle whole-day completion (used by main button and weekly table ✓ buttons)
  const handleToggleDayCompletion = (targetDayNum: number, autoAdvanceIfSelected: boolean = false) => {
    if (!plan) return;
    const targetDay = plan.days.find((d) => d.dayNumber === targetDayNum);
    if (!targetDay) return;

    const nextCompleted = !targetDay.isCompleted;
    const goals = resolveDayGoals(targetDay);
    const nextGoals = goals.map((g) => ({
      ...g,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? (g.completedAt || Date.now()) : undefined,
    }));

    commitDayGoalsUpdate(targetDayNum, nextGoals, nextCompleted, autoAdvanceIfSelected);
  };

  // Handler: Export Plan Text
  const handleExportText = () => {
    if (!plan) return;
    const text = exportPlanAsText(plan);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Single source of truth for prioritized domains (custom user choice if set, else strictly ascending lowest evaluated scores)
  const lowestDomains = getPrioritizedScoredDomains(scores);
  const isUsingCustomFocus = Boolean(plan?.isCustomFocus) || Boolean(customFocusDomains && customFocusDomains.length === 3);
  const sortedFocusDomains: LifeAreaId[] = plan
    ? plan.isCustomFocus && plan.focusDomains.length === 3
      ? plan.focusDomains
      : lowestDomains.length > 0
        ? lowestDomains.map((d) => d.id)
        : [...plan.focusDomains]
    : customFocusDomains && customFocusDomains.length === 3
      ? customFocusDomains
      : lowestDomains.map((d) => d.id);
  const activeWeekDays = plan ? plan.days.filter((d) => d.weekNumber === activeWeekTab) : [];
  const currentDayGoals = resolveDayGoals(currentTask);
  const dayCompletedGoalsCount = currentDayGoals.filter((g) => g.isCompleted).length;
  const isDayAtMaxGoals = currentDayGoals.length >= MAX_DAILY_GOALS;
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-[#0F6E6E] dark:text-cyan-400 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                    خطتك تبدأ من تقييمك
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleOpenFocusModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/60 text-[#0F6E6E] dark:text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تخصيص المجالات</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {isUsingCustomFocus
                  ? 'اخترت هذه المجالات الثلاثة للتركيز عليها خلال الـ 30 يوماً القادمة، ويمكنك استعادة أضعف 3 مجالات في أي وقت.'
                  : 'نرتب درجات مجالات حياتك التي أجريت تقييمها، ونختار حتى ثلاثة منها تحتاج تركيزاً أكبر. ثم نقترح مهمة بسيطة لكل يوم يمكنك تعديلها أو اختيار بديل لها.'}
              </p>

              {/* Priority pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {sortedFocusDomains.map((id) => {
                  const scoreVal = Number(scores?.[id]) || 0;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      <span>{DOMAIN_META[id]?.icon || '🎯'}</span>
                      <span>{getDomainArabicName(id)}</span>
                      {scoreVal > 0 && (
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-[#0F6E6E] dark:text-cyan-400 font-black font-mono">
                          ({scoreVal.toFixed(1)} / 10)
                        </span>
                      )}
                    </span>
                  );
                })}
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
            <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 text-right space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-bold">
                  <Target className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
                  <span>مجالات التركيز</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenFocusModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800/60 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>تخصيص المجالات</span>
                </button>
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
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
                <span>
                  {isUsingCustomFocus
                    ? 'مجالات مخصصة حسب اختيارك'
                    : 'اختيرت تلقائياً من أدنى درجات عجلة حياتك'}
                </span>
                {isUsingCustomFocus && (
                  <button
                    type="button"
                    onClick={handleResetToWeakestDomains}
                    className="text-[#0F6E6E] dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    استعادة أضعف 3
                  </button>
                )}
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
            {/* Left Card: أهداف اليوم المختارة (1 إلى 4 أهداف) + الاقتراحات */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm sticky top-6">
              {/* Day & Domain Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
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

              {/* Daily Goals Progress Counter Badge (1 to 4 goals per day) */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071318] border border-slate-200/80 dark:border-slate-800 flex-wrap">
                <span className="text-xs font-black text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-cyan-400" />
                  <span>
                    الأهداف المنجزة اليوم:{' '}
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-[#0F6E6E] dark:text-cyan-300">
                      {dayCompletedGoalsCount} / {currentDayGoals.length}
                    </span>
                  </span>
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isDayAtMaxGoals
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : 'bg-white dark:bg-[#0B161C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  المجدولة اليوم:{' '}
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-black">
                    {currentDayGoals.length} / {MAX_DAILY_GOALS}
                  </span>
                </span>
              </div>

              {/* Active Daily Goals Checklist (1 to 4 independent toggleable goals) */}
              <div className="space-y-2">
                {currentDayGoals.map((goal, gIdx) => {
                  const cleanGoalText = localizeDomainText(goal.text);
                  return (
                    <div
                      key={goal.id}
                      className={`w-full text-right p-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-start gap-3 border group ${
                        goal.isCompleted
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                          : 'bg-[#0F6E6E]/8 dark:bg-cyan-950/40 border-[#0F6E6E]/40 dark:border-cyan-500/40 text-[#0F172A] dark:text-white shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSingleGoalCompletion(goal.id)}
                        aria-label={goal.isCompleted ? `إلغاء إنجاز الهدف ${gIdx + 1}` : `تحديد الهدف ${gIdx + 1} كمُنجز`}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer ${
                          goal.isCompleted
                            ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
                            : 'bg-white dark:bg-[#0B161C] border-[#0F6E6E]/50 dark:border-cyan-400/60 text-transparent hover:border-[#0F6E6E] dark:hover:border-cyan-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSingleGoalCompletion(goal.id)}
                        className="flex-1 min-w-0 text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-black text-[#0F6E6E] dark:text-cyan-300">
                            هدف <span dir="ltr" className="font-mono [unicode-bidi:isolate]">{gIdx + 1}</span>
                          </span>
                          {goal.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-500/15 dark:bg-cyan-500/20 text-[#0F6E6E] dark:text-cyan-300 font-black">
                              مخصص
                            </span>
                          )}
                        </div>
                        <span
                          className={`leading-relaxed block break-words ${
                            goal.isCompleted ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {isolateNumbersInText(cleanGoalText)}
                        </span>
                      </button>

                      {currentDayGoals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDailyGoal(goal.id)}
                          aria-label="إزالة الهدف من اليوم"
                          title="إزالة الهدف"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sleek Custom Goal Input Bar (Press Enter or + إضافة, capped at 4 goals/day) */}
              <div className="space-y-2">
                <form onSubmit={handleAddCustomTask} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder={
                      isDayAtMaxGoals
                        ? 'تم بلوغ الحد الأقصى (4 أهداف لهذا اليوم)...'
                        : 'أضف هدفاً إضافياً لهذا اليوم واضغط Enter (حتى 4)...'
                    }
                    className="flex-1 min-w-0 bg-[#F7F6F2] dark:bg-[#071318] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F6E6E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0F6E6E] dark:focus:ring-cyan-400 transition-all"
                    dir="rtl"
                  />
                  <button
                    type="submit"
                    disabled={!customInputText.trim()}
                    className={`inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black transition-all shadow-xs cursor-pointer flex-shrink-0 ${
                      isDayAtMaxGoals
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </form>

                {goalLimitWarning && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 text-xs font-bold animate-in fade-in duration-150"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{goalLimitWarning}</span>
                  </div>
                )}
              </div>

              {/* Selectable Smart Suggestions (Click to add up to 4 goals/day or remove) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>أضف من الاقتراحات الذكية (حتى 4 أهداف):</span>
                </div>
                <div className="space-y-2">
                  {currentTask?.defaultSuggestions.map((suggestion, idx) => {
                    const isIncluded = currentDayGoals.some((g) => g.text === suggestion);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleSuggestionInDay(suggestion)}
                        className={`w-full text-right p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2.5 border ${
                          isIncluded
                            ? 'bg-teal-50/70 dark:bg-cyan-950/35 border-[#0F6E6E]/50 dark:border-cyan-500/50 text-[#0F6E6E] dark:text-cyan-300'
                            : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-cyan-500'
                        }`}
                      >
                        <span className="leading-relaxed flex-1">{isolateNumbersInText(suggestion)}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 flex-shrink-0 ${
                            isIncluded
                              ? 'bg-[#0F6E6E] dark:bg-cyan-600 text-white'
                              : 'bg-white dark:bg-[#0B161C] text-[#0F6E6E] dark:text-cyan-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isIncluded ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>مضاف</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>إضافة</span>
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Estimate */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>اقتراح: 10 دقائق تقريباً لكل هدف</span>
              </div>

              {/* Primary Complete Action Button (Marks all active daily goals complete/incomplete) */}
              <button
                type="button"
                onClick={() => handleToggleDayCompletion(selectedDayNum, true)}
                className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${currentTask?.isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500 text-white hover:scale-[1.01] active:scale-98'
                  }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {currentTask?.isCompleted
                    ? `تم إنجاز أهداف اليوم (${dayCompletedGoalsCount} / ${currentDayGoals.length}) — انقر للإلغاء`
                    : currentDayGoals.length > 1
                      ? `أنجزت جميع أهداف اليوم (${currentDayGoals.length})`
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
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer border ${isWeekActive
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
                {activeWeekDays.map((day) => {
                  const isSelected = selectedDayNum === day.dayNumber;
                  const isCompleted = day.isCompleted;
                  const isActiveTarget = !isCompleted && day.dayNumber === activeFocusDay.dayNumber;
                  const dayGoalsList = resolveDayGoals(day);
                  const dayDoneGoals = dayGoalsList.filter((g) => g.isCompleted).length;

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
                      {!isCompleted && dayGoalsList.length > 1 ? (
                        <span
                          dir="ltr"
                          style={{ unicodeBidi: 'isolate' }}
                          className={`absolute top-1.5 start-1.5 px-1 py-0.2 rounded text-[9px] font-mono font-black ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-teal-500/15 text-[#0F6E6E] dark:text-cyan-300'
                          }`}
                          title={`${dayDoneGoals} من ${dayGoalsList.length} أهداف منجزة`}
                        >
                          {dayDoneGoals}/{dayGoalsList.length}
                        </span>
                      ) : !isCompleted && isActiveTarget ? (
                        <span
                          className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-[#0F6E6E] dark:bg-cyan-400 animate-pulse'
                            }`}
                          title="اليوم النشط"
                        />
                      ) : null}
                      <span className="text-[11px] font-bold opacity-80">يوم</span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-base font-black font-mono">
                        {day.dayNumber}
                      </span>
                      <span className="text-sm mt-1">{day.domainIcon}</span>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Weekly Schedule Table / Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                    <span>جدول مهام الأسبوع التفاعلي</span>
                  </h4>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {activeWeekTab === 5 ? 'الأسبوع الختامي' : `الأسبوع ${activeWeekTab}`}
                  </span>
                </div>

                {/* Desktop Interactive Table */}
                <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-[#071318]/60">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-[#112028] border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300">
                        <th className="py-3 px-4 w-44">اليوم والمجال</th>
                        <th className="py-3 px-4">أهداف اليوم المختارة</th>
                        <th className="py-3 px-4 w-28 text-center">الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                      {activeWeekDays.map((day) => {
                        const isFocused = day.dayNumber === selectedDayNum;
                        const domainLabel = getDomainArabicName(day.domainId || day.domainTitle);
                        const dayGoals = resolveDayGoals(day);
                        const doneCount = dayGoals.filter((g) => g.isCompleted).length;

                        return (
                          <tr
                            key={day.dayNumber}
                            onClick={() => setSelectedDayNum(day.dayNumber)}
                            className={`transition-colors cursor-pointer ${isFocused
                                ? 'bg-teal-50/75 dark:bg-cyan-950/35'
                                : 'hover:bg-white dark:hover:bg-[#0E1D24]'
                              }`}
                          >
                            <td className="py-3 px-4 align-middle">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-[#0F172A] dark:text-white">
                                    يوم <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{day.dayNumber}</span>
                                  </span>
                                  {dayGoals.length > 1 && (
                                    <span
                                      dir="ltr"
                                      style={{ unicodeBidi: 'isolate' }}
                                      className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/10 dark:bg-cyan-500/15 text-[#0F6E6E] dark:text-cyan-300"
                                    >
                                      {doneCount}/{dayGoals.length}
                                    </span>
                                  )}
                                </div>
                                <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700/80 text-[10px] font-bold text-[#0F6E6E] dark:text-cyan-300">
                                  <span>{day.domainIcon || '🎯'}</span>
                                  <span className="truncate max-w-[120px]">{domainLabel}</span>
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="space-y-1">
                                {dayGoals.map((goal) => (
                                  <div key={goal.id} className="flex items-start gap-2">
                                    <span
                                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                        goal.isCompleted
                                          ? 'bg-emerald-500'
                                          : 'bg-slate-300 dark:bg-slate-600'
                                      }`}
                                    />
                                    <span
                                      className={`leading-relaxed font-semibold ${goal.isCompleted
                                          ? 'line-through text-slate-400 dark:text-slate-500'
                                          : 'text-[#0F172A] dark:text-slate-200'
                                        }`}
                                    >
                                      {isolateNumbersInText(localizeDomainText(goal.text))}
                                    </span>
                                    {goal.isCustom && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/15 dark:bg-cyan-500/20 text-[#0F6E6E] dark:text-cyan-300 flex-shrink-0">
                                        مخصصة
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-middle text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDayCompletion(day.dayNumber, false);
                                }}
                                aria-label={day.isCompleted ? `إلغاء إنجاز يوم ${day.dayNumber}` : `تحديد يوم ${day.dayNumber} كمُنجز`}
                                className={`mx-auto w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${day.isCompleted
                                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-[#0B161C] hover:border-[#0F6E6E] dark:hover:border-cyan-400 border-slate-300 dark:border-slate-700 text-slate-400 hover:text-[#0F6E6E] dark:hover:text-cyan-300'
                                  }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Stacked Checklist Cards */}
                <div className="md:hidden space-y-2.5">
                  {activeWeekDays.map((day) => {
                    const isFocused = day.dayNumber === selectedDayNum;
                    const domainLabel = getDomainArabicName(day.domainId || day.domainTitle);
                    const dayGoals = resolveDayGoals(day);
                    const doneCount = dayGoals.filter((g) => g.isCompleted).length;

                    return (
                      <div
                        key={day.dayNumber}
                        onClick={() => setSelectedDayNum(day.dayNumber)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isFocused
                            ? 'bg-teal-50/80 dark:bg-cyan-950/35 border-[#0F6E6E] dark:border-cyan-500 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-[#071318] border-slate-200 dark:border-slate-800'
                          }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-[#0F172A] dark:text-white">
                              يوم <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{day.dayNumber}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-[#0F6E6E] dark:text-cyan-300">
                              <span>{day.domainIcon || '🎯'}</span>
                              <span>{domainLabel}</span>
                            </span>
                            {dayGoals.length > 1 && (
                              <span
                                dir="ltr"
                                style={{ unicodeBidi: 'isolate' }}
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-500/10 dark:bg-cyan-500/15 text-[#0F6E6E] dark:text-cyan-300"
                              >
                                {doneCount}/{dayGoals.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayGoals.map((goal) => (
                              <p
                                key={goal.id}
                                className={`text-xs leading-relaxed font-semibold flex items-start gap-1.5 ${goal.isCompleted
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-[#334155] dark:text-slate-200'
                                  }`}
                              >
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${goal.isCompleted ? 'bg-emerald-500' : 'bg-teal-500'}`} />
                                <span>{isolateNumbersInText(localizeDomainText(goal.text))}</span>
                              </p>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDayCompletion(day.dayNumber, false);
                          }}
                          aria-label={day.isCompleted ? `إلغاء إنجاز يوم ${day.dayNumber}` : `تحديد يوم ${day.dayNumber} كمُنجز`}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all cursor-pointer ${day.isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-[#0B161C] border-slate-300 dark:border-slate-700 text-slate-400'
                            }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
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
              {isUsingCustomFocus
                ? 'تم تحديد هذه المجالات الثلاثة وفق اختيارك الشخصي للتركيز عليها خلال الخطة، ويمكنك استعادة أضعف 3 مجالات في أي وقت عبر زر «تخصيص المجالات».'
                : 'اختيرت تلقائياً من أقل درجات تقييمك المسجلة (مرتبة تصاعدياً من الأدنى للأعلى). درجة صفر تعني «غير مقيّم»، لذلك لا تُحسب ضمن الأولويات.'}
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

      {/* Customizable Focus Areas Picker Modal (8 Life Areas, Strict Max/Min 3) */}
      {showFocusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fadeIn print:hidden"
          onClick={() => setShowFocusModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="تخصيص مجالات التركيز الثلاثة"
            dir="rtl"
            className="bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#0F6E6E] dark:text-cyan-400">
                  <SlidersHorizontal className="w-5 h-5" />
                  <h3 className="font-black text-base text-[#0F172A] dark:text-white">
                    تخصيص مجالات التركيز
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  اختر 3 مجالات تود التركيز عليها خلال الـ 30 يوماً (الاختيار الحالي:{' '}
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-black text-[#0F6E6E] dark:text-cyan-300">
                    {draftFocusDomains.length} / 3
                  </span>
                  )
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFocusModal(false)}
                aria-label="إغلاق"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto pr-0.5">
              {ALL_CANONICAL_DOMAINS.map((id) => {
                const isChecked = draftFocusDomains.includes(id);
                const isDisabled = !isChecked && draftFocusDomains.length >= 3;
                const scoreVal = Number(scores?.[id]) || 0;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleToggleDraftDomain(id)}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${isChecked
                        ? 'bg-[#0F6E6E]/10 dark:bg-cyan-950/50 border-[#0F6E6E] dark:border-cyan-400 text-[#0F6E6E] dark:text-cyan-300 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-[#071318] border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-teal-400 dark:hover:border-cyan-600'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">{DOMAIN_META[id]?.icon || '🎯'}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate">{getDomainArabicName(id)}</span>
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                          {scoreVal > 0 ? `${scoreVal.toFixed(1)} / 10` : 'غير مقيّم'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked
                          ? 'border-[#0F6E6E] dark:border-cyan-400 bg-[#0F6E6E] dark:bg-cyan-400 text-white dark:text-[#0B161C]'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetToWeakestDomains}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة أضعف 3 مجالات</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFocusModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={draftFocusDomains.length !== 3}
                  onClick={handleConfirmCustomFocus}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black shadow-sm cursor-pointer"
                >
                  تأكيد وحفظ المجالات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting Plan */}
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

      {/* Micro-Celebration Toast on Completing Day Task */}
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
