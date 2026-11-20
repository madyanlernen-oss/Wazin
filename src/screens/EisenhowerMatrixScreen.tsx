import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  CalendarDays,
  Layers,
  Clock,
  Printer,
  Flame,
  RotateCcw,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lightbulb,
  ArrowRight,
  BrainCircuit,
  RefreshCw,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  DirectorSummaryReport,
  EisenhowerGoalItem,
  EisenhowerQuadrant,
  GoalTimeframe,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';
import {
  generateAgent11Suggestions,
  EisenhowerSuggestionItem,
  mapDomainNameToAreaId,
} from '../utils/eisenhowerAgent';

export const INITIAL_EISENHOWER_GOALS: EisenhowerGoalItem[] = [
  // 0. أهداف يومية (Daily Goals)
  {
    id: 'g_daily_1',
    title: 'مراجعة أولويات اليوم (3 مهام أساسية) قبل فتح رسائل البريد',
    quadrant: 'q1_urgent_important',
    timeframe: 'daily',
    areaId: 'career',
    completed: true,
    source: 'advisor',
    advisorName: 'م. طارق المهني',
  },
  {
    id: 'g_daily_2',
    title: 'شرب 3 لترات ماء والمشي 20 دقيقة بعد صلاة العصر',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'daily',
    areaId: 'health',
    completed: false,
    source: 'advisor',
    advisorName: 'د. ريان الصحي',
  },
  {
    id: 'g_daily_3',
    title: 'خلوة روحية وتأمل صامت 10 دقائق بعد صلاة الفجر',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'daily',
    areaId: 'spiritual',
    completed: true,
    source: 'advisor',
    advisorName: 'د. سفيان الروحي',
  },
  {
    id: 'g_daily_4',
    title: 'إيقاف إشعارات وسائل التواصل أثناء جلسة العمل العميق (9:00 - 12:00)',
    quadrant: 'q4_not_urgent_not_important',
    timeframe: 'daily',
    areaId: 'personal',
    completed: false,
    source: 'user',
  },

  // 1. مهم وعاجل (نفّذ الآن)
  {
    id: 'g1',
    title: 'تسليم المسودة النهائية لمشروع التحول الرقمي بالعمل',
    quadrant: 'q1_urgent_important',
    timeframe: 'weekly',
    areaId: 'career',
    completed: false,
    source: 'advisor',
    advisorName: 'م. طارق المهني',
  },
  {
    id: 'g2',
    title: 'سداد دفعة البطاقة الائتمانية قبل تاريخ الاستحقاق لتجنب الرسوم',
    quadrant: 'q1_urgent_important',
    timeframe: 'weekly',
    areaId: 'financial',
    completed: true,
    source: 'advisor',
    advisorName: 'أ. كمال المالي',
  },
  {
    id: 'g3',
    title: 'إجراء الفحص الدوري الشامل وتحاليل الدم للضغط والسكر',
    quadrant: 'q1_urgent_important',
    timeframe: 'monthly',
    areaId: 'health',
    completed: false,
    source: 'user',
  },

  // 2. مهم وغير عاجل (جدول له - سر النجاح والتوازن)
  {
    id: 'g4',
    title: 'المشي الصباحي 30 دقيقة 4 أيام أسبوعياً مع تدبر سورة الكهف',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'weekly',
    areaId: 'spiritual',
    completed: false,
    source: 'advisor',
    advisorName: 'د. سفيان الروحي',
  },
  {
    id: 'g5',
    title: 'دراسة 3 ساعات أسبوعياً في دورة نماذج الذكاء الاصطناعي التوليدي',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'monthly',
    areaId: 'learning',
    completed: true,
    source: 'advisor',
    advisorName: 'بروفيسور زياد المعرفي',
  },
  {
    id: 'g6',
    title: 'بناء وتغذية صندوق الطوارئ ليصل لمصروف 6 أشهر (30,000 ريال)',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'yearly',
    areaId: 'financial',
    completed: false,
    source: 'advisor',
    advisorName: 'أ. كمال المالي',
  },
  {
    id: 'g7',
    title: 'رحلة عمرة مع الأسرة وبرنامج أسبوعي للخلوة والتأمل',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'yearly',
    areaId: 'spiritual',
    completed: false,
    source: 'user',
  },

  // 3. غير مهم وعاجل (فوّضه)
  {
    id: 'g8',
    title: 'فرز الفواتير الروتينية ومشتريات المنزل عبر تطبيقات التوصيل التلقائية',
    quadrant: 'q3_urgent_not_important',
    timeframe: 'weekly',
    areaId: 'personal',
    completed: false,
    source: 'advisor',
    advisorName: 'د. ليلى الذاتية',
  },
  {
    id: 'g9',
    title: 'تفويض بعض المهام الإدارية والرد على البريد المتكرر بالعمل للمساعد',
    quadrant: 'q3_urgent_not_important',
    timeframe: 'monthly',
    areaId: 'career',
    completed: true,
    source: 'user',
  },

  // 4. غير مهم وغير عاجل (احذفه أو قلله)
  {
    id: 'g10',
    title: 'تحديد وقت التصفح العشوائي لشبكات التواصل بـ 30 دقيقة يومياً',
    quadrant: 'q4_not_urgent_not_important',
    timeframe: 'weekly',
    areaId: 'personal',
    completed: false,
    source: 'advisor',
    advisorName: 'د. ليلى الذاتية',
  },
  {
    id: 'g11',
    title: 'الاعتذار اللبق عن الجلسات المسائية المستنزفة التي تضيع ساعات النوم',
    quadrant: 'q4_not_urgent_not_important',
    timeframe: 'monthly',
    areaId: 'social',
    completed: false,
    source: 'advisor',
    advisorName: 'أ. سامي الاجتماعي',
  },
];

interface EisenhowerMatrixScreenProps {
  goals?: EisenhowerGoalItem[];
  onUpdateGoals?: (goals: EisenhowerGoalItem[]) => void;
  directorReport?: DirectorSummaryReport | null;
  scores?: Record<LifeAreaId, number>;
  userProfile?: UserProfile | null;
  onNavigateToAssessment?: () => void;
  onNavigateToDirector?: () => void;
  theme?: 'light' | 'dark';
}

export const EisenhowerMatrixScreen: React.FC<EisenhowerMatrixScreenProps> = ({
  goals: propGoals,
  onUpdateGoals,
  directorReport,
  scores,
  userProfile,
  onNavigateToAssessment,
  onNavigateToDirector: _onNavigateToDirector,
  theme: _theme = 'light',
}) => {
  const [goals, setGoals] = useState<EisenhowerGoalItem[]>(() => {
    if (propGoals && propGoals.length > 0) return propGoals;
    try {
      const stored = localStorage.getItem('wazan_eisenhower_goals');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_EISENHOWER_GOALS;
  });

  const [activeTimeframe, setActiveTimeframe] = useState<GoalTimeframe>(() => {
    try {
      const stored = localStorage.getItem('wazan_eisenhower_timeframe');
      if (stored === 'daily' || stored === 'weekly' || stored === 'monthly' || stored === 'yearly') {
        return stored;
      }
    } catch (e) {
      // ignore
    }
    return 'weekly';
  });

  // Sync activeTimeframe to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wazan_eisenhower_timeframe', activeTimeframe);
    } catch (e) {
      // ignore
    }
  }, [activeTimeframe]);

  // Sync propGoals when updated externally (e.g. from AI Advisors)
  React.useEffect(() => {
    if (propGoals && propGoals.length > 0) {
      setGoals(propGoals);
      try {
        localStorage.setItem('wazan_eisenhower_goals', JSON.stringify(propGoals));
      } catch (e) {
        // ignore
      }
    }
  }, [propGoals]);

  // Drag and drop state
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);

  // New goal form modal / state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuadrant, setNewQuadrant] = useState<EisenhowerQuadrant>('q2_important_not_urgent');
  const [newAreaId, setNewAreaId] = useState<LifeAreaId>('career');

  // Agent 11 Suggestions state (derived from Agent 9 & Agent 10)
  const [suggestions, setSuggestions] = useState<EisenhowerSuggestionItem[]>([]);
  const [isSuggestionsCollapsed, setIsSuggestionsCollapsed] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<EisenhowerSuggestionItem | null>(null);
  const [editingGoal, setEditingGoal] = useState<EisenhowerGoalItem | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotificationToast({ message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 3500);
  };

  // Generate initial suggestions from Agent 9 & Agent 10 via Agent 11
  useEffect(() => {
    const generated = generateAgent11Suggestions(directorReport, scores, goals);
    setSuggestions(generated.filter((s) => !dismissedSuggestionIds.has(s.id)));
  }, [directorReport, scores]);

  // Direct addition of a suggestion to the matrix
  const handleAddSuggestionDirectly = (sug: EisenhowerSuggestionItem) => {
    const newGoal: EisenhowerGoalItem = {
      id: `goal_sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: sug.title,
      quadrant: sug.quadrant,
      timeframe: sug.timeframe,
      areaId: sug.areaId,
      completed: false,
      source: 'advisor',
      advisorName: sug.sourceAgentName,
      createdAt: new Date().toISOString(),
    };

    const updated = [newGoal, ...goals];
    updateAllGoals(updated);
    setSuggestions((prev) => prev.filter((item) => item.id !== sug.id));
    showToast(`تمت إضافة الهدف إلى (${sug.quadrantLabel}) بنجاح!`, 'success');
  };

  // Manual customization of a suggestion before adding
  const handleCustomizeSuggestion = (sug: EisenhowerSuggestionItem) => {
    setNewTitle(sug.title);
    setNewQuadrant(sug.quadrant);
    setNewAreaId(sug.areaId);
    setActiveTimeframe(sug.timeframe);
    setEditingSuggestion(sug);
    setShowAddModal(true);
  };

  // Dismiss a suggestion
  const handleDismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    setDismissedSuggestionIds((prev) => new Set([...prev, id]));
    showToast('تم استبعاد الاقتراح من القائمة', 'info');
  };

  // Refresh suggestions (tries server endpoint then fallback to local generator)
  const handleRefreshSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/gemini/eisenhower-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directorReport,
          scores,
          userProfile,
          currentGoals: goals,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const mapped: EisenhowerSuggestionItem[] = data.suggestions.map((item: any, idx: number) => {
            const areaId = (item.domain ? mapDomainNameToAreaId(item.domain) : 'personal') as LifeAreaId;
            const domainObj = ADVISORS_LIST.find((a) => a.id === areaId);
            return {
              id: item.id || `sug_remote_${Date.now()}_${idx}`,
              title: item.title,
              quadrant: (item.quadrant || 'q2_important_not_urgent') as EisenhowerQuadrant,
              quadrantLabel: item.quadrant_label || 'المربع 2 (جدول له)',
              timeframe: (item.timeframe || 'weekly') as GoalTimeframe,
              areaId,
              domainName: domainObj?.title || item.domain || 'الجانب الشخصي',
              sourceAgent: item.sourceAgent || 'agent_9_aggregator',
              sourceAgentName: item.sourceAgentName || 'م. معتز التكاملي (وكيل 9)',
              sourceTypeLabel: item.sourceTypeLabel || 'اقتراح ذكي',
              rationale: item.rationale || 'مستخلص من التحليل التكاملي لمجالات الحياة.',
            };
          });
          setSuggestions(mapped);
          showToast('تم تحديث الاقتراحات بنجاح من وكيل أهدافي 11', 'success');
          setIsLoadingSuggestions(false);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    const fresh = generateAgent11Suggestions(directorReport, scores, goals);
    setSuggestions(fresh);
    showToast('تم جلب اقتراحات جديدة من تحليلات م. معتز ود. هاني', 'success');
    setIsLoadingSuggestions(false);
  };

  // Open clean manual modal
  const handleOpenAddModalManual = () => {
    setEditingGoal(null);
    setEditingSuggestion(null);
    setNewTitle('');
    setNewQuadrant('q2_important_not_urgent');
    setNewAreaId('career');
    setShowAddModal(true);
  };

  // Start editing existing goal
  const handleStartEditGoal = (g: EisenhowerGoalItem) => {
    setEditingSuggestion(null);
    setEditingGoal(g);
    setNewTitle(g.title);
    setNewQuadrant(g.quadrant);
    setNewAreaId(g.areaId);
    setActiveTimeframe(g.timeframe);
    setShowAddModal(true);
  };

  // Confirmation state for deleting a single goal
  const [goalToDelete, setGoalToDelete] = useState<EisenhowerGoalItem | null>(null);

  // Confirmation state for resetting all goals to initial defaults
  const [showResetGoalsConfirm, setShowResetGoalsConfirm] = useState(false);

  const updateAllGoals = (updated: EisenhowerGoalItem[]) => {
    setGoals(updated);
    try {
      localStorage.setItem('wazan_eisenhower_goals', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    if (onUpdateGoals) onUpdateGoals(updated);
  };

  // Toggle goal completion
  const handleToggleGoal = (id: string) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g));
    updateAllGoals(updated);
  };

  // Confirm delete goal
  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) return;
    const updated = goals.filter((g) => g.id !== goalToDelete.id);
    updateAllGoals(updated);
    setGoalToDelete(null);
  };

  // Reset goals to defaults
  const handleConfirmResetGoals = () => {
    updateAllGoals(INITIAL_EISENHOWER_GOALS);
    setShowResetGoalsConfirm(false);
  };

  // Move goal to another quadrant
  const handleMoveQuadrant = (id: string, targetQuadrant: EisenhowerQuadrant) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, quadrant: targetQuadrant } : g));
    updateAllGoals(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedGoalId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    e.preventDefault();
    const id = draggedGoalId || e.dataTransfer.getData('text/plain');
    if (id) {
      handleMoveQuadrant(id, quadrant);
      setDraggedGoalId(null);
    }
  };

  // Add new goal manually (or save customized suggestion / edited goal)
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingGoal) {
      const updated = goals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              title: newTitle.trim(),
              quadrant: newQuadrant,
              timeframe: activeTimeframe,
              areaId: newAreaId,
            }
          : g
      );
      updateAllGoals(updated);
      setEditingGoal(null);
      showToast('تم تعديل وحفظ الهدف بنجاح!', 'success');
      setNewTitle('');
      setShowAddModal(false);
      return;
    }

    const newGoal: EisenhowerGoalItem = {
      id: `goal_${Date.now()}`,
      title: newTitle.trim(),
      quadrant: newQuadrant,
      timeframe: activeTimeframe,
      areaId: newAreaId,
      completed: false,
      source: editingSuggestion ? 'advisor' : 'user',
      advisorName: editingSuggestion ? editingSuggestion.sourceAgentName : undefined,
      createdAt: new Date().toISOString(),
    };

    updateAllGoals([newGoal, ...goals]);
    if (editingSuggestion) {
      setSuggestions((prev) => prev.filter((item) => item.id !== editingSuggestion.id));
      setEditingSuggestion(null);
      showToast('تم تخصيص وحفظ الهدف بنجاح في مصفوفتك!', 'success');
    } else {
      showToast('تمت إضافة الهدف يدوياً بنجاح!', 'success');
    }
    setNewTitle('');
    setShowAddModal(false);
  };

  // Print / Export
  const handlePrint = () => {
    window.print();
  };

  // Filter goals by current timeframe
  const currentGoals = goals.filter((g) => g.timeframe === activeTimeframe);
  const q1Goals = currentGoals.filter((g) => g.quadrant === 'q1_urgent_important');
  const q2Goals = currentGoals.filter((g) => g.quadrant === 'q2_important_not_urgent');
  const q3Goals = currentGoals.filter((g) => g.quadrant === 'q3_urgent_not_important');
  const q4Goals = currentGoals.filter((g) => g.quadrant === 'q4_not_urgent_not_important');

  // Overall completion for this timeframe
  const totalInTimeframe = currentGoals.length;
  const completedInTimeframe = currentGoals.filter((g) => g.completed).length;
  const completionPercent = totalInTimeframe ? Math.round((completedInTimeframe / totalInTimeframe) * 100) : 0;

  // Reusable card renderer
  const renderGoalCard = (g: EisenhowerGoalItem, quadrantColor: 'rose' | 'emerald' | 'amber' | 'slate') => {
    const adv = ADVISORS_LIST.find((a) => a.id === g.areaId);

    const colorClasses = {
      rose: g.completed
        ? 'bg-slate-50/70 dark:bg-[#0B161C]/80 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500'
        : 'bg-rose-50/40 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/40 text-[#0F172A] dark:text-slate-100 hover:border-rose-300 dark:hover:border-rose-700/60 hover:shadow-xs',
      emerald: g.completed
        ? 'bg-slate-50/70 dark:bg-[#0B161C]/80 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500'
        : 'bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/40 text-[#0F172A] dark:text-slate-100 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-xs',
      amber: g.completed
        ? 'bg-slate-50/70 dark:bg-[#0B161C]/80 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500'
        : 'bg-amber-50/40 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/40 text-[#0F172A] dark:text-slate-100 hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-xs',
      slate: g.completed
        ? 'bg-slate-50/70 dark:bg-[#0B161C]/80 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500'
        : 'bg-slate-50/80 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800 text-[#0F172A] dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs',
    }[quadrantColor];

    const checkColors = {
      rose: g.completed ? 'text-rose-600 dark:text-rose-400' : 'text-rose-400 dark:text-rose-500 hover:text-rose-600',
      emerald: g.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-400 dark:text-emerald-500 hover:text-emerald-600',
      amber: g.completed ? 'text-amber-600 dark:text-amber-400' : 'text-amber-400 dark:text-amber-500 hover:text-amber-600',
      slate: g.completed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600',
    }[quadrantColor];

    return (
      <div
        key={g.id}
        draggable
        onDragStart={(e) => handleDragStart(e, g.id)}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col gap-2.5 cursor-grab active:cursor-grabbing group min-w-0 select-none shadow-2xs ${colorClasses}`}
      >
        {/* Top Row: Checkbox & Goal Content (Full horizontal width, never squished) */}
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 w-full">
          {/* Completion Checkbox with Comfortable Target & Clear Focus Ring */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleGoal(g.id);
            }}
            className={`mt-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028] ${checkColors}`}
            title={g.completed ? 'تعليم كغير مكتمل' : 'تعليم كمكتمل'}
            aria-label={g.completed ? `إلغاء إكمال الهدف: ${g.title}` : `إكمال الهدف: ${g.title}`}
          >
            {g.completed ? (
              <CheckCircle2 className="w-5 h-5 fill-current text-white dark:text-[#112028]" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          {/* Goal Title - Full Width, Clean Word Break */}
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs sm:text-[13px] font-bold leading-relaxed break-words text-right ${
                g.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-[#0F172A] dark:text-white'
              }`}
            >
              {g.title}
            </p>
          </div>
        </div>

        {/* Bottom Row: Metadata Tags + Controls (Never Collide on Narrow or Medium Screens) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 min-w-0 w-full">
          {/* Tags: Domain Badge + Advisor Badge */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {/* Domain Tag */}
            {adv && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#334155] dark:text-slate-200 bg-white/95 dark:bg-[#0B161C] px-2 py-0.5 rounded-md border border-slate-200/90 dark:border-slate-700 shadow-2xs max-w-full">
                <span className="text-xs">{adv.avatarSvg}</span>
                <span className="truncate">{adv.title}</span>
              </span>
            )}

            {/* Advisor Guidance Tag */}
            {g.advisorName && (
              <span className="inline-flex items-center text-[10px] font-bold text-[#0B6E72] dark:text-cyan-300 bg-[#0B6E72]/10 dark:bg-cyan-950/70 border border-[#0B6E72]/20 dark:border-cyan-800/50 px-2 py-0.5 rounded-md max-w-full">
                <span className="truncate">توجيه: {g.advisorName}</span>
              </span>
            )}
          </div>

          {/* Quick Actions: Quadrant Move Dropdown, Edit & Delete Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ms-auto">
            <select
              aria-label="نقل المربع لمصفوفة أيزنهاور"
              value={g.quadrant}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleMoveQuadrant(g.id, e.target.value as EisenhowerQuadrant)}
              className="text-[11px] sm:text-xs font-semibold bg-white dark:bg-[#0B161C] border border-slate-300 dark:border-slate-700 hover:border-[#0B6E72] dark:hover:border-cyan-400 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028] cursor-pointer shadow-2xs transition-colors min-h-[30px]"
            >
              <option value="q1_urgent_important">المربع 1 (نفّذ)</option>
              <option value="q2_important_not_urgent">المربع 2 (جدول)</option>
              <option value="q3_urgent_not_important">المربع 3 (فوّض)</option>
              <option value="q4_not_urgent_not_important">المربع 4 (احذف)</option>
            </select>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEditGoal(g);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0B6E72] dark:hover:text-cyan-400 hover:bg-[#0B6E72]/10 dark:hover:bg-cyan-950/50 border border-transparent hover:border-[#0B6E72]/30 dark:hover:border-cyan-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028] transition-all cursor-pointer flex-shrink-0"
              title="تعديل الهدف"
              aria-label={`تعديل الهدف: ${g.title}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGoalToDelete(g);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:focus-visible:ring-rose-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028] transition-all cursor-pointer flex-shrink-0"
              title="حذف الهدف"
              aria-label={`حذف الهدف: ${g.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8 bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 transition-colors duration-300">
      {/* Header and Timeframe Selector */}
      <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-950/60 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/40 text-xs font-bold">
              <Target className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              مصفوفة أيزنهاور لإدارة الأولويات
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-[#FBBF24] text-xs font-black border border-amber-200 dark:border-amber-800/50">
              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-[#FBBF24] fill-amber-500" />
              <span>الالتزام: 4 أسابيع متتالية 🔥</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white transition-colors">
            أهدافي (إدارة الأولويات الذكية)
          </h1>
          <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 mt-1 max-w-2xl leading-relaxed transition-colors">
            رتّب أهدافك واسحبها بين المربعات الأربعة بحرية. <strong className="text-emerald-700 dark:text-emerald-400">المربع الثاني (مهم وغير عاجل)</strong> هو وقود التوازن الشامل والنجاح المستدام.
          </p>
        </div>

        {/* Timeframe Toggle Buttons & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs" role="tablist" aria-label="النطاق الزمني للأهداف">
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeframe === 'daily'}
              onClick={() => setActiveTimeframe('daily')}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                activeTimeframe === 'daily'
                  ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>يومية</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeframe === 'weekly'}
              onClick={() => setActiveTimeframe('weekly')}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                activeTimeframe === 'weekly'
                  ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>أسبوعية</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeframe === 'monthly'}
              onClick={() => setActiveTimeframe('monthly')}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                activeTimeframe === 'monthly'
                  ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>شهرية</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeframe === 'yearly'}
              onClick={() => setActiveTimeframe('yearly')}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0B161C] ${
                activeTimeframe === 'yearly'
                  ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>سنوية</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة وتصدير مصفوفة أيزنهاور"
            aria-label="طباعة وتصدير المصفوفة"
            className="p-2.5 rounded-xl bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-400 hover:border-[#0B6E72]/40 dark:hover:border-cyan-500/40 shadow-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028]"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowResetGoalsConfirm(true)}
            title="إعادة تعيين الأهداف الافتراضية"
            aria-label="إعادة تعيين الأهداف الافتراضية"
            className="p-2.5 rounded-xl bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModalManual}
            className="px-4 py-2.5 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#112028]"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة هدف</span>
          </button>
        </div>
      </div>

      {/* Progress Bar for Current Timeframe */}
      <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center font-black text-sm sm:text-base tabular-nums flex-shrink-0"
            dir="ltr"
          >
            {completionPercent}%
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
              معدل إنجاز أهداف النطاق الزمني{' '}
              <span dir="ltr" className="font-extrabold tabular-nums text-[#0B6E72] dark:text-cyan-400">
                ({completedInTimeframe} / {totalInTimeframe})
              </span>
            </h4>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 block">
              اسحب أي مهمة وأسقطها لتغيير مربعها، أو استخدم القائمة المنسدلة السريعة داخل البطاقة.
            </span>
          </div>
        </div>

        <div className="w-full sm:w-64 h-2.5 bg-slate-100 dark:bg-[#0B161C] rounded-full overflow-hidden border border-slate-200/70 dark:border-slate-800">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Agent 11 Smart Goal & Plan Suggestions Section (Powered by Agent 9 & Agent 10) */}
      <section
        aria-label="اقتراحات الأهداف والخطط الذكية"
        className="bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 dark:from-[#0B1E26] dark:via-[#112028] dark:to-[#0D242D] border-2 border-[#0B6E72]/20 dark:border-cyan-800/40 rounded-3xl p-5 sm:p-7 shadow-xs transition-all duration-300 space-y-4"
      >
        {/* Top Header of Suggestions Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-100/80 dark:border-cyan-900/40">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0B6E72]/15 dark:bg-cyan-950/70 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/25 dark:border-cyan-800/50 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-950/80 text-[#0B6E72] dark:text-cyan-300 text-[11px] font-black border border-[#0B6E72]/20 dark:border-cyan-800/60">
                  <BrainCircuit className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  وكيل أهدافي 11 (اقتراح الخطط والأولويات الذكية)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/50">
                  ⚡ مستخلصة من وكيل 9 (م. معتز) ووكيل 10 (د. هاني)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                اقتراحات الأهداف والخطط الذكية
              </h3>
              <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5 leading-relaxed">
                خطط عملية مستخلصة من تشخيص منظومة حياتك وعلاج عنق الزجاجة (م. معتز) وأولويات المربع الثاني (د. هاني). يمكنك <strong className="text-[#0B6E72] dark:text-cyan-400">طرحها مباشرة في مصفوفتك</strong> أو <strong className="text-[#0B6E72] dark:text-cyan-400">تعديلها وملؤها يدوياً</strong>.
              </p>
            </div>
          </div>

          {/* Action & Toggle Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/90 dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 shadow-2xs">
              {suggestions.length} {suggestions.length === 1 ? 'اقتراح ذكي' : suggestions.length === 2 ? 'اقتراحان ذكيان' : 'اقتراحات ذكية'}
            </span>

            <button
              type="button"
              onClick={handleRefreshSuggestions}
              disabled={isLoadingSuggestions}
              title="تحديث واستدعاء مقترحات جديدة من الوكلاء"
              className="p-2 rounded-xl bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:border-[#0B6E72]/40 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSuggestions ? 'animate-spin text-[#0B6E72]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsSuggestionsCollapsed(!isSuggestionsCollapsed)}
              title={isSuggestionsCollapsed ? 'توسيع وإظهار الاقتراحات' : 'طي الاقتراحات مؤقتاً'}
              className="p-2 rounded-xl bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <span className="text-[11px] font-bold sm:inline hidden">
                {isSuggestionsCollapsed ? 'عرض' : 'طي'}
              </span>
              {isSuggestionsCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestions Body: Cards Grid */}
        {!isSuggestionsCollapsed && (
          <div className="space-y-4 pt-1">
            {suggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {suggestions.map((sug) => {
                  const adv = ADVISORS_LIST.find((a) => a.id === sug.areaId);
                  const isQ2 = sug.quadrant === 'q2_important_not_urgent';
                  const isQ1 = sug.quadrant === 'q1_urgent_important';

                  return (
                    <div
                      key={sug.id}
                      className="bg-white dark:bg-[#0F1D24] border border-teal-100 dark:border-cyan-900/40 hover:border-teal-300 dark:hover:border-cyan-700 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3.5 transition-all hover:shadow-xs group"
                    >
                      {/* Top Meta: Source Agent Pill & Strategy Badge & Dismiss */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-[#0B6E72]/10 dark:bg-cyan-950/70 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/50">
                            <span>{sug.sourceAgentName}</span>
                          </span>
                          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                            {sug.sourceTypeLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDismissSuggestion(sug.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                          title="استبعاد الاقتراح"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Middle: Domain, Title, and Rationale Callout */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {adv && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#475569] dark:text-slate-300">
                              <span>{adv.avatarSvg}</span>
                              <span>{adv.title}</span>
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isQ2
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                : isQ1
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {sug.quadrantLabel}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">
                          {sug.title}
                        </h4>

                        <div className="text-[11px] text-[#475569] dark:text-slate-300 bg-slate-50/90 dark:bg-[#071318]/70 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-2.5 leading-relaxed">
                          <strong className="text-[#0B6E72] dark:text-cyan-400 font-black">سبب الاقتراح: </strong>
                          <span>{sug.rationale}</span>
                        </div>
                      </div>

                      {/* Bottom Actions: Add Directly (+) OR Edit & Fill Manually */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddSuggestionDirectly(sug)}
                          className="flex-1 px-3 py-2 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                          title="طرح الهدف مباشرة في المربع المقترح بنقرة واحدة"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>طرح في المصفوفة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCustomizeSuggestion(sug)}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-[#112028] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#334155] dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="تعديل وتخصيص نص الهدف أو المربع قبل الحفظ"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>تعديل يدوي</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-[#0F1D24] border border-teal-100 dark:border-cyan-900/30 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0F172A] dark:text-white">
                    تم استعراض وطرح كافة المقترحات الحالية!
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-md mx-auto">
                    جميع اقتراحات وكيل أهدافي 11 تمت إضافتها إلى مصفوفتك أو استبعادها. يمكنك طلب اقتراحات إضافية جديدة في أي وقت.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshSuggestions}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>جلب اقتراحات إضافية</span>
                </button>
              </div>
            )}

            {/* Hint when directorReport is not yet generated */}
            {!directorReport && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>تلميح ذكي:</strong> للحصول على خطط مخصصة بدقة فائقة من وكيل 9 (م. معتز) ووكيل 10 (د. هاني)، ننصحك بإتمام تقييمك الشامل.
                  </span>
                </div>
                {onNavigateToAssessment && (
                  <button
                    type="button"
                    onClick={onNavigateToAssessment}
                    className="inline-flex items-center gap-1 font-black text-[#0B6E72] dark:text-cyan-400 hover:underline cursor-pointer flex-shrink-0"
                  >
                    <span>قيّم أسبوعك الآن</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* The 4 Eisenhower Quadrants Grid (Strict 2x2 Natural Arabic RTL Flow) */}
      {/* 
        In RTL layout:
        Row 1: Column 1 (Right) is Quadrant 1 ("مهم وعاجل") | Column 2 (Left) is Quadrant 2 ("مهم وغير عاجل")
        Row 2: Column 1 (Right) is Quadrant 3 ("غير مهم وعاجل") | Column 2 (Left) is Quadrant 4 ("غير مهم وغير عاجل")
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
        {/* Quadrant 1: مهم وعاجل (أعلى اليمين • نفّذ الآن) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q1_urgent_important')}
          className="bg-white dark:bg-[#112028] border-2 border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all"
        >
          <div className="flex items-start justify-between pb-3 border-b border-rose-100 dark:border-rose-900/40">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-black uppercase mb-1 border border-rose-200 dark:border-rose-800/60">
                <span>1️⃣ المربع 1</span>
                <span>•</span>
                <span>نفّذ الآن (Do First)</span>
              </div>
              <h2 className="text-lg font-black text-rose-900 dark:text-rose-200">
                مهم وعاجل
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                أزمات ومواعيد نهائية وشؤون حيوية تتطلب تدخلك الفوري والمباشر.
              </p>
            </div>
            <span
              className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-black text-sm flex items-center justify-center tabular-nums flex-shrink-0"
              dir="ltr"
              aria-label={`عدد الأهداف في المربع 1: ${q1Goals.length}`}
            >
              {q1Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[170px] flex-1">
            {q1Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-rose-500/70 dark:text-rose-400/60 border-2 border-dashed border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-rose-300 dark:text-rose-700 mb-1" />
                <span className="text-xs font-semibold">اسحب أي مهمة عاجلة ومهمة إلى هنا</span>
              </div>
            ) : (
              q1Goals.map((g) => renderGoalCard(g, 'rose'))
            )}
          </div>
        </div>

        {/* Quadrant 2: مهم وغير عاجل (أعلى اليسار • جدوله • سر التوازن) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q2_important_not_urgent')}
          className="bg-white dark:bg-[#112028] border-2 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300 dark:hover:border-emerald-700/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all"
        >
          <div className="flex items-start justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase mb-1 border border-emerald-200 dark:border-emerald-800/60">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span>2️⃣ المربع 2</span>
                <span>•</span>
                <span>جدوله (Schedule • مربع التوازن)</span>
              </div>
              <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                مهم وغير عاجل
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                تطوير الذات، بناء العادات، الصحة، التخطيط الاستراتيجي، والعلاقات العميقة.
              </p>
            </div>
            <span
              className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-black text-sm flex items-center justify-center tabular-nums flex-shrink-0"
              dir="ltr"
              aria-label={`عدد الأهداف في المربع 2: ${q2Goals.length}`}
            >
              {q2Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[170px] flex-1">
            {q2Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-emerald-600/70 dark:text-emerald-400/60 border-2 border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-2xl">
                <Target className="w-8 h-8 text-emerald-300 dark:text-emerald-700 mb-1" />
                <span className="text-xs font-semibold">اسحب أهدافك الاستراتيجية هنا لحمايتها من التسويف</span>
              </div>
            ) : (
              q2Goals.map((g) => renderGoalCard(g, 'emerald'))
            )}
          </div>
        </div>

        {/* Quadrant 3: غير مهم وعاجل (أسفل اليمين • فوّضه) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q3_urgent_not_important')}
          className="bg-white dark:bg-[#112028] border-2 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all"
        >
          <div className="flex items-start justify-between pb-3 border-b border-amber-100 dark:border-amber-900/40">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-[#FBBF24] text-[11px] font-black uppercase mb-1 border border-amber-200 dark:border-amber-800/60">
                <span>3️⃣ المربع 3</span>
                <span>•</span>
                <span>فوّضه (Delegate)</span>
              </div>
              <h2 className="text-lg font-black text-amber-900 dark:text-amber-200">
                غير مهم وعاجل
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                مقاطعات وطلبات عاجلة يمكن أتمتتها أو إسنادها لغيرك دون تعطيل يومك.
              </p>
            </div>
            <span
              className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-[#FBBF24] border border-amber-200 dark:border-amber-800/60 font-black text-sm flex items-center justify-center tabular-nums flex-shrink-0"
              dir="ltr"
              aria-label={`عدد الأهداف في المربع 3: ${q3Goals.length}`}
            >
              {q3Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[170px] flex-1">
            {q3Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-amber-600/70 dark:text-amber-400/60 border-2 border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 rounded-2xl">
                <Clock className="w-8 h-8 text-amber-300 dark:text-amber-700 mb-1" />
                <span className="text-xs font-semibold">اسحب مهام التفويض أو الأتمتة إلى هنا</span>
              </div>
            ) : (
              q3Goals.map((g) => renderGoalCard(g, 'amber'))
            )}
          </div>
        </div>

        {/* Quadrant 4: غير مهم وغير عاجل (أسفل اليسار • احذفه أو قلّله) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q4_not_urgent_not_important')}
          className="bg-white dark:bg-[#112028] border-2 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all"
        >
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase mb-1 border border-slate-200 dark:border-slate-800">
                <span>4️⃣ المربع 4</span>
                <span>•</span>
                <span>احذفه أو قلّله (Eliminate)</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                غير مهم وغير عاجل
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                مشتتات ومضيعات الوقت والالتزامات المستنزفة التي ينبغي شطبها أو تقليصها.
              </p>
            </div>
            <span
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-black text-sm flex items-center justify-center tabular-nums flex-shrink-0"
              dir="ltr"
              aria-label={`عدد الأهداف في المربع 4: ${q4Goals.length}`}
            >
              {q4Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[170px] flex-1">
            {q4Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500/70 dark:text-slate-400/60 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 rounded-2xl">
                <Trash2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-1" />
                <span className="text-xs font-semibold">اسحب المشتتات والمهام المستنزفة إلى هنا لحذفها</span>
              </div>
            ) : (
              q4Goals.map((g) => renderGoalCard(g, 'slate'))
            )}
          </div>
        </div>
      </div>

      {/* Add / Customize Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0B6E72]/15 dark:bg-cyan-950/70 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/50 flex items-center justify-center flex-shrink-0">
                  {editingGoal || editingSuggestion ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                    {editingGoal
                      ? 'تعديل الهدف في مصفوفة أيزنهاور'
                      : editingSuggestion
                      ? 'تخصيص اقتراح وكيل أهدافي 11'
                      : 'إضافة هدف جديد لمصفوفة أيزنهاور'}
                  </h3>
                  {editingGoal && editingGoal.advisorName && (
                    <p className="text-[11px] text-[#0B6E72] dark:text-cyan-300 font-bold mt-0.5">
                      توجيه المستشار: {editingGoal.advisorName}
                    </p>
                  )}
                  {editingSuggestion && (
                    <p className="text-[11px] text-[#0B6E72] dark:text-cyan-300 font-bold mt-0.5">
                      مستخلص من: {editingSuggestion.sourceAgentName} • {editingSuggestion.sourceTypeLabel}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGoal(null);
                  setEditingSuggestion(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  نص الهدف أو الخطة العملية:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: قراءة 20 صفحة يومياً، تثبيت موعد النوم..."
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400"
                  dir="rtl"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  المربع المستهدف في مصفوفة أيزنهاور:
                </label>
                <select
                  value={newQuadrant}
                  onChange={(e) => setNewQuadrant(e.target.value as EisenhowerQuadrant)}
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer"
                >
                  <option value="q1_urgent_important">1 - مهم وعاجل (نفّذ الآن)</option>
                  <option value="q2_important_not_urgent">2 - مهم وغير عاجل (جدول له - وقود التوازن)</option>
                  <option value="q3_urgent_not_important">3 - غير مهم وعاجل (فوّضه)</option>
                  <option value="q4_not_urgent_not_important">4 - غير مهم وغير عاجل (احذفه أو قلله)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  النطاق الزمني:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'daily', label: 'يومية' },
                    { id: 'weekly', label: 'أسبوعية' },
                    { id: 'monthly', label: 'شهرية' },
                    { id: 'yearly', label: 'سنوية' },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setActiveTimeframe(tf.id as GoalTimeframe)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                        activeTimeframe === tf.id
                          ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white border-transparent shadow-2xs'
                          : 'bg-slate-50 dark:bg-[#102033] border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:border-[#0B6E72]/40'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  المجال المرتبط بالهدف:
                </label>
                <select
                  value={newAreaId}
                  onChange={(e) => setNewAreaId(e.target.value as LifeAreaId)}
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer"
                >
                  {ADVISORS_LIST.map((adv) => (
                    <option key={adv.id} value={adv.id}>
                      {adv.avatarSvg} {adv.title} ({adv.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGoal(null);
                    setEditingSuggestion(null);
                  }}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
                >
                  {editingGoal
                    ? 'تحديث وحفظ الهدف'
                    : editingSuggestion
                    ? 'حفظ وطرح الهدف في المصفوفة'
                    : 'حفظ الهدف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Goal (Guards Against Accidental Deletion) */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                تأكيد حذف الهدف
              </h3>
            </div>

            <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الهدف:{' '}
              <strong className="text-[#0F172A] dark:text-white block mt-1 p-2 rounded-xl bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-800">
                "{goalToDelete.title}"
              </strong>
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGoal}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                نعم، احذف الهدف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset All Goals to Defaults (Guards Against Accidental Bulk Reset) */}
      {showResetGoalsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                تأكيد إعادة تعيين الأهداف
              </h3>
            </div>

            <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في استعادة قائمة الأهداف النموذجية الأولية؟ سيتم استبدال أي أهداف مخصصة قمت بإضافتها بالأهداف النموذجية المتوازنة.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetGoalsConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmResetGoals}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                نعم، استعد الأهداف الافتراضية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {notificationToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className="bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-black border border-slate-700 dark:border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{notificationToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
