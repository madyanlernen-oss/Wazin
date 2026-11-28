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
  Trash2,
  AlertCircle,
  Flame,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LifeAreaId, ThirtyDayPlanState, DayPlanTask, DailyGoalItem, DailyGoalStatus, Screen } from '../types/lifeBalance';
import { isolateNumbersInText } from '../components/FormattedChatMessage';
import {
  ALL_CANONICAL_DOMAINS,
  MAX_DAILY_GOALS,
  XP_DAY_BONUS,
  XP_PER_TASK,
  applyFocusDomainsToPlan,
  computeDayTaskCompletionStats,
  computePlanGamificationStats,
  computeWeekTaskCompletionStats,
  extractPriorityDomains,
  generateThirtyDayPlan,
  getStoredCustomFocusDomains,
  getStoredThirtyDayPlan,
  resolveDailyGoalStatus,
  resolveDayGoals,
  saveCustomFocusDomainsToStorage,
  saveThirtyDayPlanToStorage,
  syncThirtyDayPlanWithScores,
  toggleDailyGoalStatus,
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
  const [expandedWeekTab, setExpandedWeekTab] = useState<number | null>(initialActiveFocus.weekNumber);
  const [showSuggestionsDrawer, setShowSuggestionsDrawer] = useState(false);
  const [showWhyDomains, setShowWhyDomains] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [xpPulse, setXpPulse] = useState(false);
  const [motivationToast, setMotivationToast] = useState<{
    message: string;
    xpDelta: string;
    kind: 'task' | 'day';
  } | null>(null);
  const [customInputText, setCustomInputText] = useState('');
  const [goalLimitWarning, setGoalLimitWarning] = useState<string | null>(null);
  const limitWarningTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpPulseTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customFocusDomains, setCustomFocusDomains] = useState<LifeAreaId[] | null>(() => {
    const storedCustom = getStoredCustomFocusDomains();
    if (storedCustom && storedCustom.length === 3) return storedCustom;
    return null;
  });
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [draftFocusDomains, setDraftFocusDomains] = useState<LifeAreaId[]>([]);

  // Active incomplete day pointer derived from actual completion progress
  const activeFocusDay = resolveActivePlanDayAndWeek(plan);

  const handleToggleWeekAccordion = (wNum: number) => {
    if (expandedWeekTab === wNum) {
      setExpandedWeekTab(null);
      return;
    }
    setActiveWeekTab(wNum);
    setExpandedWeekTab(wNum);
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
    setExpandedWeekTab(1);
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
    setExpandedWeekTab(1);
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
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      if (xpPulseTimeoutRef.current) clearTimeout(xpPulseTimeoutRef.current);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const TASK_MICRO_PRAISE = [
    'أحسنت! خطوة ثابتة نحو توازنك.',
    'رائع! الاستمرارية تصنع الفرق الكبير.',
    'إنجاز يُحسب لك اليوم — واصل التقدم!',
    'خطوة واعية تقرّبك من هدفك.',
  ];

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

    const prevCompletedCount = resolveDayGoals(prevDay).filter(
      (g) => resolveDailyGoalStatus(g) === 'completed'
    ).length;

    const nextGoals = nextGoalsRaw.slice(0, MAX_DAILY_GOALS).map((g) => {
      const st = resolveDailyGoalStatus(g);
      return {
        ...g,
        status: st,
        isCompleted: st === 'completed',
        completedAt: st === 'completed' ? (g.completedAt || Date.now()) : undefined,
      };
    });
    const nextCompletedCount = nextGoals.filter(
      (g) => resolveDailyGoalStatus(g) === 'completed'
    ).length;
    const addedTasksDone = Math.max(0, nextCompletedCount - prevCompletedCount);
    const allGoalsDone =
      nextGoals.length > 0 && nextGoals.every((g) => resolveDailyGoalStatus(g) === 'completed');
    const newlyCompletedDay = !prevDay.isCompleted && allGoalsDone;
    const customList = nextGoals.filter((g) => g.isCustom).map((g) => g.text);
    const primaryGoal = nextGoals[0];

    if (addedTasksDone > 0 || (newlyCompletedDay && triggerCelebrationOnComplete)) {
      setXpPulse(true);
      if (xpPulseTimeoutRef.current) clearTimeout(xpPulseTimeoutRef.current);
      xpPulseTimeoutRef.current = setTimeout(() => setXpPulse(false), 500);
    }

    if (newlyCompletedDay && triggerCelebrationOnComplete) {
      try {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.75 },
        });
      } catch {
        // ignore
      }
      const gainedXp = addedTasksDone * XP_PER_TASK + XP_DAY_BONUS;
      setMotivationToast({
        message: '🎉 رائع جداً! أتممت هدف اليوم بالكامل.',
        xpDelta: `+${gainedXp} XP`,
        kind: 'day',
      });
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = setTimeout(() => setMotivationToast(null), 2800);
    } else if (addedTasksDone > 0 && triggerCelebrationOnComplete) {
      const praise =
        TASK_MICRO_PRAISE[(targetDayNum + nextCompletedCount) % TASK_MICRO_PRAISE.length];
      setMotivationToast({
        message: praise,
        xpDelta: `+${addedTasksDone * XP_PER_TASK} XP`,
        kind: 'task',
      });
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = setTimeout(() => setMotivationToast(null), 2100);
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
      status: 'pending',
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
      status: 'pending',
      isCompleted: false,
      isCustom: true,
    };

    commitDayGoalsUpdate(selectedDayNum, [newCustomGoal, ...goals]);
    setCustomInputText('');
  };

  // Handler: Toggle an individual task status ('completed' ✓ or 'missed' ✕, toggling back to 'pending' on repeat click)
  const handleToggleGoalStatus = (
    targetDayNum: number,
    goalId: string,
    action: 'completed' | 'missed'
  ) => {
    if (!plan) return;
    const targetDay = plan.days.find((d) => d.dayNumber === targetDayNum);
    if (!targetDay) return;
    const goals = resolveDayGoals(targetDay);
    const nextGoals = goals.map((g) =>
      g.id === goalId ? toggleDailyGoalStatus(g, action) : g
    );
    commitDayGoalsUpdate(targetDayNum, nextGoals, action === 'completed', false);
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
    const nextStatus: DailyGoalStatus = nextCompleted ? 'completed' : 'pending';
    const goals = resolveDayGoals(targetDay);
    const nextGoals = goals.map((g) => ({
      ...g,
      status: nextStatus,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? (g.completedAt || Date.now()) : undefined,
    }));

    commitDayGoalsUpdate(targetDayNum, nextGoals, nextCompleted, autoAdvanceIfSelected);
  };

  // Handler: Export Plan Text
  const handleExportText = () => {
    if (!plan) return;
    const text = exportPlanAsText(plan);
    navigator.clipboard?.writeText(text).catch(() => { });
    setCopiedToast(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopiedToast(false), 2500);
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
  const selectDayAndSyncWeek = (dayNum: number) => {
    setSelectedDayNum(dayNum);
    const targetDay = plan?.days.find((d) => d.dayNumber === dayNum);
    if (targetDay) {
      setActiveWeekTab(targetDay.weekNumber);
      setExpandedWeekTab(targetDay.weekNumber);
    }
  };

  const currentDayGoals = resolveDayGoals(currentTask);
  const dayStats = computeDayTaskCompletionStats(currentTask);
  const gamification = computePlanGamificationStats(plan);
  const dayCompletedGoalsCount = dayStats.completed;
  const isDayAtMaxGoals = currentDayGoals.length >= MAX_DAILY_GOALS;
  const pdfPlanPayload = plan ? formatThirtyDayPlanForArabicPdf(plan, scores) : null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 transition-colors duration-300">
      {/* 1. Hero Banner (Setup View Only — keeps active plan clutter-free above the fold) */}
      {!plan && (
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

            {/* Left Large 30-Day Circle Indicator */}
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
      )}

      {/* 2. Setup Cards (إذا لم تكن الخطة منشأة بعد) */}
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
        /* 3. Active Plan Workspace — Clean Hierarchy + Gamification */
        <div className="space-y-5">
          {/* Unified Command Header: Progress Bar + Daily Streak + XP + Focus Domains */}
          <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            {/* Row 1: Title, Focus Pills, Streak/XP Badges & Quick Utility Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="space-y-2 text-right">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#0F6E6E] dark:text-cyan-400" />
                    <span>خطة التوازن لـ 30 يوماً</span>
                  </h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    بدأت: {plan.startDateStr}
                  </span>
                </div>

                {/* Inline Focus Domains + Customize */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sortedFocusDomains.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-300 border border-teal-200/70 dark:border-teal-800/40 text-[11px] font-bold"
                    >
                      <span>{DOMAIN_META[id]?.icon || '🎯'}</span>
                      <span>{getDomainArabicName(id)}</span>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={handleOpenFocusModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-cyan-950/50 text-slate-600 dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>تخصيص</span>
                  </button>
                </div>
              </div>

              {/* Gamification Strip (Streak + XP) + Compact Utility Controls */}
              <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
                {/* Daily Streak Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-black transition-all ${gamification.currentStreak > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  title={`أطول سلسلة: ${gamification.bestStreak} يوم`}
                >
                  <Flame
                    className={`w-4 h-4 ${gamification.currentStreak > 0 ? 'text-amber-500 fill-amber-500/30' : 'text-slate-400'
                      }`}
                  />
                  <span>السلسلة:</span>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">
                    {gamification.currentStreak}
                  </span>
                  <span>{gamification.currentStreak === 1 ? 'يوم' : 'أيام'}</span>
                </div>

                {/* Points / XP Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-black transition-transform duration-300 ${xpPulse ? 'scale-110 ring-2 ring-teal-400/50' : 'scale-100'
                    } ${gamification.xpPoints > 0
                      ? 'bg-teal-50 dark:bg-cyan-950/50 border-teal-300/80 dark:border-cyan-700/60 text-[#0F6E6E] dark:text-cyan-300'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  title={`+${XP_PER_TASK} XP لكل مهمة • +${XP_DAY_BONUS} XP لإتمام اليوم`}
                >
                  <Zap
                    className={`w-4 h-4 ${gamification.xpPoints > 0 ? 'text-teal-600 dark:text-cyan-400 fill-current/20' : 'text-slate-400'
                      }`}
                  />
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">
                    {gamification.xpPoints} XP
                  </span>
                </div>

                <div className="flex items-center gap-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    title="طباعة أو تصدير PDF"
                    aria-label="طباعة أو تصدير PDF"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportText}
                    title={copiedToast ? 'تم النسخ!' : 'نسخ الخطة نصياً'}
                    aria-label="نسخ الخطة نصياً"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedToast ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Download className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    title="إنشاء خطة جديدة"
                    aria-label="إنشاء خطة جديدة"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-500 hover:text-amber-600 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Clean Overall Top Progress Bar */}
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs font-bold flex-wrap">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                  <span>تقدم الخطة الكلي:</span>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-black text-[#0F172A] dark:text-white">
                    {gamification.completedTasks} / {gamification.totalTasks}
                  </span>
                  <span>مهمة</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-slate-500 dark:text-slate-400">
                    {completedCount} / 30
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">يوماً</span>
                </span>
                <span
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate' }}
                  className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-[#0F6E6E]/10 dark:bg-cyan-500/15 text-[#0F6E6E] dark:text-cyan-300"
                >
                  {gamification.overallPercent}%
                </span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0F6E6E] via-teal-500 to-emerald-500 dark:from-cyan-400 dark:via-teal-400 dark:to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${gamification.overallPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main Plan Area: Focused Two-Column Hierarchy (Today's Focus + Collapsible Weeks) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:hidden">
            {/* Column 1: تركيز اليوم (Today's Focus Card) */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm lg:sticky lg:top-6">
              {/* Day & Domain Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0F6E6E] dark:bg-[#0891B2] text-white text-[11px] font-black">
                    <span>تركيز اليوم</span>
                  </span>
                  <span className="text-xs font-extrabold text-[#0F172A] dark:text-slate-200">
                    اليوم <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{selectedDayNum} / 30</span>
                  </span>
                  {selectedDayNum !== activeFocusDay.dayNumber && completedCount < 30 && (
                    <button
                      type="button"
                      onClick={() => selectDayAndSyncWeek(activeFocusDay.dayNumber)}
                      className="text-[11px] font-bold text-[#0F6E6E] dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      العودة لليوم النشط (<span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{activeFocusDay.dayNumber}</span>)
                    </button>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                  <span>{currentTask?.domainIcon || '🎯'}</span>
                  <span>{currentTask ? getDomainArabicName(currentTask.domainId || currentTask.domainTitle) : ''}</span>
                </span>
              </div>

              {/* Live Daily Completion Counter (✓ / ✕ partial tracking) */}
              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#071318] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#0F172A] dark:text-white flex items-center gap-1.5 flex-wrap">
                    <Target className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-cyan-400 flex-shrink-0" />
                    <span>إنجاز اليوم:</span>
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-[#0F6E6E] dark:text-cyan-300">
                      {dayStats.completed} / {dayStats.total}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-bold">مكتمل</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-emerald-700 dark:text-emerald-400">
                      {dayStats.percent}%
                    </span>
                    {dayStats.missed > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60 text-[10px] font-bold">
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{dayStats.missed}</span>
                        <span>فائت</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isDayAtMaxGoals
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        : 'bg-white dark:bg-[#0B161C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    المجدولة:{' '}
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono font-black">
                      {dayStats.total} / {MAX_DAILY_GOALS}
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
                    style={{ width: `${dayStats.percent}%` }}
                  />
                  {dayStats.missed > 0 && dayStats.total > 0 && (
                    <div
                      className="h-full bg-rose-400/70 dark:bg-rose-500/60 transition-all duration-300"
                      style={{ width: `${Math.round((dayStats.missed / dayStats.total) * 100)}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Active Daily Goals Checklist (1 to 4 tasks with ✓ Done & ✕ Missed toggle buttons) */}
              <div className="space-y-2">
                {currentDayGoals.map((goal, gIdx) => {
                  const cleanGoalText = localizeDomainText(goal.text);
                  const goalStatus = resolveDailyGoalStatus(goal);
                  const isDone = goalStatus === 'completed';
                  const isMissed = goalStatus === 'missed';

                  return (
                    <div
                      key={goal.id}
                      className={`w-full text-right p-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-start gap-2.5 border group ${isDone
                          ? 'bg-emerald-50/75 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
                          : isMissed
                            ? 'bg-rose-50/45 dark:bg-rose-950/15 border-rose-200/70 dark:border-rose-900/50 text-slate-500 dark:text-slate-400'
                            : 'bg-[#0F6E6E]/8 dark:bg-cyan-950/40 border-[#0F6E6E]/40 dark:border-cyan-500/40 text-[#0F172A] dark:text-white shadow-2xs'
                        }`}
                    >
                      {/* Explicit ✓ Done & ✕ Missed Action Buttons */}
                      <div role="group" aria-label={`حالة الهدف ${gIdx + 1}`} className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleGoalStatus(selectedDayNum, goal.id, 'completed')}
                          aria-pressed={isDone}
                          aria-label={isDone ? `إلغاء إنجاز الهدف ${gIdx + 1}` : `تحديد الهدف ${gIdx + 1} كمُنجز`}
                          title="تم الإنجاز (✓)"
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${isDone
                              ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-[#0B161C] border-slate-300 dark:border-slate-600 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleGoalStatus(selectedDayNum, goal.id, 'missed')}
                          aria-pressed={isMissed}
                          aria-label={isMissed ? `إلغاء تحديد الهدف ${gIdx + 1} كفائت` : `تحديد الهدف ${gIdx + 1} كفائت`}
                          title="فائت / لم يُنجز (✕)"
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${isMissed
                              ? 'bg-rose-600/85 hover:bg-rose-700 border-rose-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-[#0B161C] border-slate-300 dark:border-slate-600 text-slate-400 hover:border-rose-400 hover:text-rose-500 dark:hover:text-rose-400'
                            }`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.75]" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleGoalStatus(selectedDayNum, goal.id, 'completed')}
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
                          {isDone && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black">
                              منجز ✓
                            </span>
                          )}
                          {isMissed && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 font-black">
                              فائت ✕
                            </span>
                          )}
                        </div>
                        <span
                          className={`leading-relaxed block break-words ${isDone
                              ? 'line-through text-emerald-800/75 dark:text-emerald-300/75'
                              : isMissed
                                ? 'line-through text-slate-400 dark:text-slate-500 decoration-rose-400/70'
                                : ''
                            }`}
                        >
                          {isolateNumbersInText(cleanGoalText)}
                        </span>
                      </button>

                      {currentDayGoals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDailyGoal(goal.id)}
                          aria-label="حذف الهدف من اليوم"
                          title="حذف الهدف"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                    className={`inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black transition-all shadow-xs cursor-pointer flex-shrink-0 ${isDayAtMaxGoals
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

              {/* Collapsible Smart Suggestions Drawer (keeps Today's Focus clutter-free) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#071318]/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSuggestionsDrawer((prev) => !prev)}
                  aria-expanded={showSuggestionsDrawer}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>اقتراحات ذكية إضافية لهذا اليوم ({currentTask?.defaultSuggestions.length || 0})</span>
                  </span>
                  {showSuggestionsDrawer ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>

                {showSuggestionsDrawer && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-200/70 dark:border-slate-800">
                    {currentTask?.defaultSuggestions.map((suggestion, idx) => {
                      const isIncluded = currentDayGoals.some((g) => g.text === suggestion);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleSuggestionInDay(suggestion)}
                          className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2.5 border ${isIncluded
                              ? 'bg-teal-50/70 dark:bg-cyan-950/35 border-[#0F6E6E]/50 dark:border-cyan-500/50 text-[#0F6E6E] dark:text-cyan-300'
                              : 'bg-white dark:bg-[#0B161C] border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-cyan-500'
                            }`}
                        >
                          <span className="leading-relaxed flex-1">{isolateNumbersInText(suggestion)}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 flex-shrink-0 ${isIncluded
                                ? 'bg-[#0F6E6E] dark:bg-cyan-600 text-white'
                                : 'bg-slate-50 dark:bg-slate-800 text-[#0F6E6E] dark:text-cyan-300 border border-slate-200 dark:border-slate-700'
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
                )}
              </div>

              {/* Primary Complete Action Button (Marks all active daily goals complete/incomplete) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleToggleDayCompletion(selectedDayNum, true)}
                  className={`w-full py-3 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${currentTask?.isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-cyan-500 text-white hover:scale-[1.01] active:scale-98'
                    }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {currentTask?.isCompleted
                      ? `تم إنجاز اليوم (${dayCompletedGoalsCount} / ${currentDayGoals.length}) — انقر للإلغاء`
                      : currentDayGoals.length > 1
                        ? `أنجزت جميع أهداف اليوم (${currentDayGoals.length})`
                        : 'أنجزت مهمة اليوم'}
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
                  <button
                    type="button"
                    disabled={selectedDayNum <= 1}
                    onClick={() => selectDayAndSyncWeek(Math.max(1, selectedDayNum - 1))}
                    className="inline-flex items-center gap-1 hover:text-[#0F6E6E] dark:hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </button>

                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>~10 دقائق لكل مهمة</span>
                  </span>

                  <button
                    type="button"
                    disabled={selectedDayNum >= 30}
                    onClick={() => selectDayAndSyncWeek(Math.min(30, selectedDayNum + 1))}
                    className="inline-flex items-center gap-1 hover:text-[#0F6E6E] dark:hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <span>اليوم التالي</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Collapsible Weekly Roadmap (Week 1–4 + الختام) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                  <div className="text-right">
                    <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                      <span>خريطة الأسابيع الـ 4</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      افتح أسبوعاً واحداً في كل مرة لتصفح أيامه دون تشتت
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <span>لوحة التحكم</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collapsible Week 1–5 Accordions */}
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5].map((wNum) => {
                    const weekDaysList = plan.days.filter((d) => d.weekNumber === wNum);
                    const wStats = computeWeekTaskCompletionStats(weekDaysList);
                    const isWeekDone = weekDaysList.length > 0 && wStats.completedDays === weekDaysList.length;
                    const isExpanded = expandedWeekTab === wNum;
                    const weekLabel = wNum === 5 ? 'الختام (يوم 29–30)' : `الأسبوع ${wNum}`;
                    const weekSubtitle = WEEK_INFO[wNum]?.title || '';

                    return (
                      <div
                        key={wNum}
                        className={`rounded-2xl border transition-all overflow-hidden ${isExpanded
                            ? 'border-[#0F6E6E]/50 dark:border-cyan-500/50 bg-slate-50/40 dark:bg-[#071318]/60 shadow-2xs'
                            : isWeekDone
                              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/35 dark:bg-emerald-950/15'
                              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B161C]'
                          }`}
                      >
                        {/* Week Header Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleWeekAccordion(wNum)}
                          aria-expanded={isExpanded}
                          className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-right cursor-pointer hover:bg-slate-50/80 dark:hover:bg-[#102027]/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isWeekDone && (
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-white">
                                {weekLabel}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                · {weekSubtitle}
                              </span>
                            </div>
                            {/* Mini Week Progress Bar */}
                            <div className="w-full h-1 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${isWeekDone
                                    ? 'bg-emerald-500'
                                    : 'bg-[#0F6E6E] dark:bg-cyan-400'
                                  }`}
                                style={{ width: `${wStats.percent}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#0F6E6E] dark:text-cyan-300">
                              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">
                                {wStats.completed}/{wStats.total}
                              </span>
                              <span className="opacity-40">|</span>
                              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono text-emerald-700 dark:text-emerald-400">
                                {wStats.percent}%
                              </span>
                            </span>
                            {wStats.missed > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50">
                                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{wStats.missed}</span> فائت
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Week Body (Only 1 Week Open at a Time) */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-3">
                            {/* Compact Day Strip */}
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                              {weekDaysList.map((day) => {
                                const isSelected = selectedDayNum === day.dayNumber;
                                const isCompleted = day.isCompleted;
                                const isActiveTarget = !isCompleted && day.dayNumber === activeFocusDay.dayNumber;
                                const dayRowStats = computeDayTaskCompletionStats(day);

                                return (
                                  <button
                                    key={day.dayNumber}
                                    type="button"
                                    onClick={() => setSelectedDayNum(day.dayNumber)}
                                    className={`relative py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${isSelected
                                        ? isCompleted
                                          ? 'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/35'
                                          : 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] dark:border-cyan-400 shadow-xs ring-2 ring-teal-500/30'
                                        : isCompleted
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800'
                                          : isActiveTarget
                                            ? 'bg-teal-50/80 dark:bg-cyan-950/30 text-[#0F6E6E] dark:text-cyan-300 border-teal-400 dark:border-cyan-500'
                                            : 'bg-white dark:bg-[#0B161C] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                                      }`}
                                  >
                                    <span className="text-[10px] font-bold opacity-80">يوم</span>
                                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-sm font-black font-mono leading-tight">
                                      {day.dayNumber}
                                    </span>
                                    <span className="text-[10px] mt-0.5 font-mono" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                                      {isCompleted ? '✓' : dayRowStats.total > 1 || dayRowStats.completed > 0 ? `${dayRowStats.completed}/${dayRowStats.total}` : dayRowStats.missed > 0 ? '✕' : day.domainIcon}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Scannable Day Rows inside Active Week */}
                            <div className="space-y-2">
                              {weekDaysList.map((day) => {
                                const isFocused = day.dayNumber === selectedDayNum;
                                const domainLabel = getDomainArabicName(day.domainId || day.domainTitle);
                                const dayGoals = resolveDayGoals(day);
                                const rowStats = computeDayTaskCompletionStats(day);

                                return (
                                  <div
                                    key={day.dayNumber}
                                    onClick={() => setSelectedDayNum(day.dayNumber)}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${isFocused
                                        ? 'bg-teal-50/75 dark:bg-cyan-950/35 border-[#0F6E6E]/60 dark:border-cyan-500/60'
                                        : 'bg-white dark:bg-[#0B161C] border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-cyan-700'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-[#0F172A] dark:text-white">
                                          يوم <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">{day.dayNumber}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-[#0F6E6E] dark:text-cyan-300">
                                          <span>{day.domainIcon || '🎯'}</span>
                                          <span>{domainLabel}</span>
                                        </span>
                                        <span
                                          dir="ltr"
                                          style={{ unicodeBidi: 'isolate' }}
                                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${rowStats.completed === rowStats.total
                                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                              : rowStats.missed > 0 && rowStats.completed === 0
                                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                          {rowStats.completed}/{rowStats.total}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleDayCompletion(day.dayNumber, false);
                                        }}
                                        aria-label={day.isCompleted ? `إلغاء إنجاز يوم ${day.dayNumber}` : `تحديد يوم ${day.dayNumber} كمُنجز`}
                                        title={day.isCompleted ? 'إلغاء إنجاز اليوم' : 'إتمام جميع مهام اليوم'}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer inline-flex items-center gap-1 ${day.isCompleted
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-[#0F6E6E] hover:text-[#0F6E6E]'
                                          }`}
                                      >
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        <span>{day.isCompleted ? 'مكتمل' : 'إتمام اليوم'}</span>
                                      </button>
                                    </div>

                                    <div className="space-y-1.5">
                                      {dayGoals.map((goal, gIdx) => {
                                        const st = resolveDailyGoalStatus(goal);
                                        const isDone = st === 'completed';
                                        const isMissed = st === 'missed';

                                        return (
                                          <div key={goal.id} className="flex items-start justify-between gap-2">
                                            <span
                                              className={`text-xs leading-relaxed font-semibold flex items-start gap-1.5 min-w-0 flex-1 ${isDone
                                                  ? 'line-through text-emerald-700/80 dark:text-emerald-300/80'
                                                  : isMissed
                                                    ? 'line-through text-slate-400 dark:text-slate-500 decoration-rose-400/70'
                                                    : 'text-[#334155] dark:text-slate-200'
                                                }`}
                                            >
                                              <span
                                                className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDone ? 'bg-emerald-500' : isMissed ? 'bg-rose-400' : 'bg-teal-500'
                                                  }`}
                                              />
                                              <span>{isolateNumbersInText(localizeDomainText(goal.text))}</span>
                                            </span>

                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleGoalStatus(day.dayNumber, goal.id, 'completed');
                                                }}
                                                aria-pressed={isDone}
                                                aria-label={`تحديد المهمة ${gIdx + 1} في يوم ${day.dayNumber} كمُنجزة`}
                                                title="منجز (✓)"
                                                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer ${isDone
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'bg-white dark:bg-[#0B161C] border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-600'
                                                  }`}
                                              >
                                                <Check className="w-3 h-3 stroke-[3]" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleGoalStatus(day.dayNumber, goal.id, 'missed');
                                                }}
                                                aria-pressed={isMissed}
                                                aria-label={`تحديد المهمة ${gIdx + 1} في يوم ${day.dayNumber} كفائتة`}
                                                title="فائت (✕)"
                                                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer ${isMissed
                                                    ? 'bg-rose-600/85 border-rose-600 text-white'
                                                    : 'bg-white dark:bg-[#0B161C] border-slate-300 dark:border-slate-700 text-slate-400 hover:border-rose-400 hover:text-rose-500'
                                                  }`}
                                              >
                                                <X className="w-3 h-3 stroke-[2.75]" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Slim Collapsible "لماذا هذه المجالات؟" Accordion */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowWhyDomains((prev) => !prev)}
                    aria-expanded={showWhyDomains}
                    className="w-full py-2 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0F6E6E] dark:hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                      <span>لماذا اخترنا هذه المجالات الثلاثة؟</span>
                    </span>
                    {showWhyDomains ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showWhyDomains && (
                    <div className="pt-2 pb-1 space-y-3 text-right">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {isUsingCustomFocus
                          ? 'تم تحديد هذه المجالات الثلاثة وفق اختيارك الشخصي للتركيز عليها خلال الخطة، ويمكنك تعديلها أو استعادة أضعف 3 مجالات في أي وقت عبر زر «تخصيص» بالأعلى.'
                          : 'اختيرت تلقائياً من أقل درجات تقييمك المسجلة (مرتبة تصاعدياً من الأدنى للأعلى).'}
                      </p>
                      <div className="space-y-2.5">
                        {sortedFocusDomains.map((id) => {
                          const scoreVal = Number(scores?.[id]) || 0;
                          const percent = Math.min(100, Math.round(scoreVal * 10));
                          return (
                            <div key={id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-[#0F172A] dark:text-white">
                                  <span>{DOMAIN_META[id]?.icon || '🎯'}</span>
                                  <span>{getDomainArabicName(id)}</span>
                                </span>
                                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-slate-500 dark:text-slate-400 font-mono">
                                  {scoreVal.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-[#0F6E6E] dark:bg-[#0891B2] rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Privacy Notice */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
                    <span>يُسجّل تقدمك محلياً على جهازك فقط.</span>
                  </span>
                </div>
              </div>
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
                  {isUsingCustomFocus ? 'مجالات التركيز المختارة:' : 'مجالات التركيز (الأدنى درجة):'}{' '}
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

      {/* Micro-Motivation Toast on Task ✓ or Full Day Completion */}
      {motivationToast && (
        <div
          role="status"
          aria-live="polite"
          dir="rtl"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold animate-in fade-in slide-in-from-bottom-4 duration-200 border select-none pointer-events-none max-w-[92vw] ${motivationToast.kind === 'day'
              ? 'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-400/40'
              : 'bg-[#0F6E6E] dark:bg-cyan-700 text-white border-white/20'
            }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span className="truncate">{motivationToast.message}</span>
          <span
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="px-2 py-0.5 rounded-lg bg-white/20 text-amber-200 font-mono text-[11px] font-black flex-shrink-0"
          >
            {motivationToast.xpDelta}
          </span>
        </div>
      )}
    </div>
  );
};
