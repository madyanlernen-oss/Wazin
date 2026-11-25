import React, { useState, useEffect } from 'react';
import {
  Sparkles,
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
import { localizeDomainText } from '../utils/arabicDomainLabels';
import {
  INITIAL_EISENHOWER_GOALS,
  EisenhowerHeader,
  EisenhowerQuickFocusBar,
  EisenhowerSuggestionsSection,
  EisenhowerQuadrantCard,
  EisenhowerTaskModal,
} from '../components/eisenhower';

// Re-export INITIAL_EISENHOWER_GOALS for external backwards compatibility
export { INITIAL_EISENHOWER_GOALS };

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
  const [dragOverQuadrant, setDragOverQuadrant] = useState<EisenhowerQuadrant | null>(null);

  // New goal form modal / state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuadrant, setNewQuadrant] = useState<EisenhowerQuadrant>('q2_important_not_urgent');
  const [newAreaId, setNewAreaId] = useState<LifeAreaId>('career');

  // Quick Manual Focus & Priorities states
  const [quickManualTitle, setQuickManualTitle] = useState('');
  const [quickManualQuadrant, setQuickManualQuadrant] = useState<EisenhowerQuadrant>('q2_important_not_urgent');
  const [quickManualAreaId, setQuickManualAreaId] = useState<LifeAreaId>('personal');
  const [quickManualIsFocus, setQuickManualIsFocus] = useState(false);

  // Inline Quick Add inputs for each of the 4 quadrants
  const [inlineInputs, setInlineInputs] = useState<Record<EisenhowerQuadrant, string>>({
    q1_urgent_important: '',
    q2_important_not_urgent: '',
    q3_urgent_not_important: '',
    q4_not_urgent_not_important: '',
  });

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
    showToast(`تمت إضافة الهدف إلى ${localizeDomainText(sug.quadrantLabel)} بنجاح!`, 'success');
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
              title: localizeDomainText(item.title || ''),
              quadrant: (item.quadrant || 'q2_important_not_urgent') as EisenhowerQuadrant,
              quadrantLabel: localizeDomainText(item.quadrant_label || 'المربع 2 (جدوله)'),
              timeframe: (item.timeframe || 'weekly') as GoalTimeframe,
              areaId,
              domainName: domainObj?.title || localizeDomainText(item.domain || '') || 'الجانب الشخصي والوعي بالذات',
              sourceAgent: item.sourceAgent || 'agent_9_aggregator',
              sourceAgentName: item.sourceAgentName || 'م. معتز التكاملي (وكيل 9)',
              sourceTypeLabel: localizeDomainText(item.sourceTypeLabel || 'اقتراح ذكي'),
              rationale: localizeDomainText(item.rationale || 'مستخلص من التحليل التكاملي لمجالات الحياة.'),
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

  // Toggle priority focus on a goal
  const handleToggleFocusGoal = (id: string) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, isFocus: !g.isFocus } : g));
    updateAllGoals(updated);
    const target = updated.find((g) => g.id === id);
    if (target?.isFocus) {
      showToast('تم تمييز الهدف كبؤرة تركيز رئيسية! ⭐', 'success');
    } else {
      showToast('تم إزالة تمييز بؤرة التركيز', 'info');
    }
  };

  // Add goal from top Quick Focus bar
  const handleQuickAddManualGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickManualTitle.trim();
    if (!trimmed) return;

    const newGoal: EisenhowerGoalItem = {
      id: `goal_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: trimmed,
      quadrant: quickManualQuadrant,
      timeframe: activeTimeframe,
      areaId: quickManualAreaId,
      completed: false,
      source: 'user',
      isFocus: quickManualIsFocus,
      createdAt: new Date().toISOString(),
    };

    updateAllGoals([newGoal, ...goals]);
    setQuickManualTitle('');
    setQuickManualIsFocus(false);
    const quadrantLabel = {
      q1_urgent_important: 'المربع 1 (نفّذ الآن)',
      q2_important_not_urgent: 'المربع 2 (جدوله)',
      q3_urgent_not_important: 'المربع 3 (فوّضه)',
      q4_not_urgent_not_important: 'المربع 4 (احذفه)',
    }[quickManualQuadrant];
    showToast(`تمت إضافة مهمة التركيز إلى ${quadrantLabel} بنجاح! 🎯`, 'success');
  };

  // Add goal inline from inside a specific quadrant
  const handleInlineAddGoal = (quadrant: EisenhowerQuadrant) => {
    const text = inlineInputs[quadrant]?.trim();
    if (!text) return;

    const newGoal: EisenhowerGoalItem = {
      id: `goal_inline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: text,
      quadrant,
      timeframe: activeTimeframe,
      areaId: 'personal',
      completed: false,
      source: 'user',
      createdAt: new Date().toISOString(),
    };

    updateAllGoals([newGoal, ...goals]);
    setInlineInputs((prev) => ({ ...prev, [quadrant]: '' }));
    showToast('تمت إضافة المهمة للتركيز في هذا المربع! 🎯', 'success');
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

  const QUADRANT_TOAST_LABELS: Record<EisenhowerQuadrant, string> = {
    q1_urgent_important: 'المربع 1: نفّذ الآن',
    q2_important_not_urgent: 'المربع 2: جدوله',
    q3_urgent_not_important: 'المربع 3: فوّضه',
    q4_not_urgent_not_important: 'المربع 4: احذفه',
  };

  // Move goal to another quadrant
  const handleMoveQuadrant = (id: string, targetQuadrant: EisenhowerQuadrant) => {
    const existing = goals.find((g) => g.id === id);
    if (!existing || existing.quadrant === targetQuadrant) return;
    const updated = goals.map((g) => (g.id === id ? { ...g, quadrant: targetQuadrant } : g));
    updateAllGoals(updated);
    showToast(`تم نقل المهمة إلى ${QUADRANT_TOAST_LABELS[targetQuadrant]} بنجاح!`, 'success');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedGoalId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setDraggedGoalId(null);
    setDragOverQuadrant(null);
  };

  const handleDragOverQuadrant = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQuadrant !== quadrant) {
      setDragOverQuadrant(quadrant);
    }
  };

  const handleDragLeaveQuadrant = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverQuadrant((prev) => (prev === quadrant ? null : prev));
    }
  };

  const handleDrop = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    e.preventDefault();
    const id = draggedGoalId || e.dataTransfer.getData('text/plain');
    setDragOverQuadrant(null);
    setDraggedGoalId(null);
    if (id) {
      handleMoveQuadrant(id, quadrant);
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
  const activeFocusGoals = currentGoals.filter((g) => g.isFocus && !g.completed);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-cairo">
      {/* Header & Controls */}
      <EisenhowerHeader
        activeTimeframe={activeTimeframe}
        completionPercent={completionPercent}
        completedCount={completedInTimeframe}
        totalCount={totalInTimeframe}
        onSelectTimeframe={setActiveTimeframe}
        onPrint={handlePrint}
        onResetDefaults={() => setShowResetGoalsConfirm(true)}
        onOpenAddModal={handleOpenAddModalManual}
      />

      {/* Manual Focus & Priorities Bar */}
      <EisenhowerQuickFocusBar
        activeTimeframe={activeTimeframe}
        activeFocusCount={activeFocusGoals.length}
        title={quickManualTitle}
        quadrant={quickManualQuadrant}
        areaId={quickManualAreaId}
        isFocus={quickManualIsFocus}
        onChangeTitle={setQuickManualTitle}
        onChangeQuadrant={setQuickManualQuadrant}
        onChangeAreaId={setQuickManualAreaId}
        onToggleFocus={() => setQuickManualIsFocus(!quickManualIsFocus)}
        onSubmit={handleQuickAddManualGoal}
      />

      {/* Agent 11 Suggestions Section */}
      <EisenhowerSuggestionsSection
        suggestions={suggestions}
        isCollapsed={isSuggestionsCollapsed}
        isLoading={isLoadingSuggestions}
        onToggleCollapse={() => setIsSuggestionsCollapsed(!isSuggestionsCollapsed)}
        onRefreshSuggestions={handleRefreshSuggestions}
        onAddSuggestionDirectly={handleAddSuggestionDirectly}
        onCustomizeSuggestion={handleCustomizeSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      {/* The 4 Eisenhower Quadrants Grid (Strict 2x2 Natural Arabic RTL Flow) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
        {/* Quadrant 1: مهم وعاجل (أعلى اليمين • نفّذ الآن) */}
        <EisenhowerQuadrantCard
          quadrant="q1_urgent_important"
          title="مهم وعاجل"
          subtitle="أزمات ومواعيد نهائية وشؤون حيوية تتطلب تدخلك الفوري والمباشر."
          badge={
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-black uppercase mb-1 border border-rose-200 dark:border-rose-800/60">
              <span>1️⃣ المربع 1</span>
              <span>•</span>
              <span>نفّذ الآن</span>
            </div>
          }
          themeColor="rose"
          goals={q1Goals}
          inlineInputValue={inlineInputs.q1_urgent_important}
          placeholderText="+ أضف مهمة عاجلة ومهمة للتركيز عليها الآن..."
          emptyText="اسحب أي مهمة عاجلة ومهمة إلى هنا"
          onChangeInlineInput={(val) => setInlineInputs((prev) => ({ ...prev, q1_urgent_important: val }))}
          onSubmitInlineInput={() => handleInlineAddGoal('q1_urgent_important')}
          isDropTarget={dragOverQuadrant === 'q1_urgent_important'}
          isAnyDragging={Boolean(draggedGoalId)}
          draggedGoalId={draggedGoalId}
          onDragOver={(e) => handleDragOverQuadrant(e, 'q1_urgent_important')}
          onDragLeave={(e) => handleDragLeaveQuadrant(e, 'q1_urgent_important')}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onToggleGoal={handleToggleGoal}
          onToggleFocus={handleToggleFocusGoal}
          onMoveQuadrant={handleMoveQuadrant}
          onStartEditGoal={handleStartEditGoal}
          onRequestDeleteGoal={(g) => setGoalToDelete(g)}
          onDragStart={handleDragStart}
        />

        {/* Quadrant 2: مهم وغير عاجل (أعلى اليسار • جدوله • سر التوازن) */}
        <EisenhowerQuadrantCard
          quadrant="q2_important_not_urgent"
          title="مهم وغير عاجل"
          subtitle="تطوير الذات، بناء العادات الصحية، التخطيط الاستراتيجي، والعلاقات العميقة."
          badge={
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase mb-1 border border-emerald-200 dark:border-emerald-800/60">
              <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span>2️⃣ المربع 2</span>
              <span>•</span>
              <span>جدوله • مربع التوازن</span>
            </div>
          }
          themeColor="emerald"
          goals={q2Goals}
          inlineInputValue={inlineInputs.q2_important_not_urgent}
          placeholderText="+ أضف عادة أو هدفاً استراتيجياً للتوازن..."
          emptyText="اسحب أهداف التطوير والعادات الاستراتيجية إلى هنا"
          onChangeInlineInput={(val) => setInlineInputs((prev) => ({ ...prev, q2_important_not_urgent: val }))}
          onSubmitInlineInput={() => handleInlineAddGoal('q2_important_not_urgent')}
          isDropTarget={dragOverQuadrant === 'q2_important_not_urgent'}
          isAnyDragging={Boolean(draggedGoalId)}
          draggedGoalId={draggedGoalId}
          onDragOver={(e) => handleDragOverQuadrant(e, 'q2_important_not_urgent')}
          onDragLeave={(e) => handleDragLeaveQuadrant(e, 'q2_important_not_urgent')}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onToggleGoal={handleToggleGoal}
          onToggleFocus={handleToggleFocusGoal}
          onMoveQuadrant={handleMoveQuadrant}
          onStartEditGoal={handleStartEditGoal}
          onRequestDeleteGoal={(g) => setGoalToDelete(g)}
          onDragStart={handleDragStart}
        />

        {/* Quadrant 3: غير مهم وعاجل (أسفل اليمين • فوّضه أو أتمته) */}
        <EisenhowerQuadrantCard
          quadrant="q3_urgent_not_important"
          title="غير مهم وعاجل"
          subtitle="مقاطعات وطلبات عاجلة يمكن أتمتتها أو إسنادها لغيرك دون تعطيل يومك."
          badge={
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-black uppercase mb-1 border border-amber-200 dark:border-amber-800/60">
              <span>3️⃣ المربع 3</span>
              <span>•</span>
              <span>فوّضه</span>
            </div>
          }
          themeColor="amber"
          goals={q3Goals}
          inlineInputValue={inlineInputs.q3_urgent_not_important}
          placeholderText="+ أضف مهمة تفويض أو أتمتة..."
          emptyText="اسحب مهام التفويض أو الأتمتة إلى هنا"
          onChangeInlineInput={(val) => setInlineInputs((prev) => ({ ...prev, q3_urgent_not_important: val }))}
          onSubmitInlineInput={() => handleInlineAddGoal('q3_urgent_not_important')}
          isDropTarget={dragOverQuadrant === 'q3_urgent_not_important'}
          isAnyDragging={Boolean(draggedGoalId)}
          draggedGoalId={draggedGoalId}
          onDragOver={(e) => handleDragOverQuadrant(e, 'q3_urgent_not_important')}
          onDragLeave={(e) => handleDragLeaveQuadrant(e, 'q3_urgent_not_important')}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onToggleGoal={handleToggleGoal}
          onToggleFocus={handleToggleFocusGoal}
          onMoveQuadrant={handleMoveQuadrant}
          onStartEditGoal={handleStartEditGoal}
          onRequestDeleteGoal={(g) => setGoalToDelete(g)}
          onDragStart={handleDragStart}
        />

        {/* Quadrant 4: غير مهم وغير عاجل (أسفل اليسار • احذفه أو قلّله) */}
        <EisenhowerQuadrantCard
          quadrant="q4_not_urgent_not_important"
          title="غير مهم وغير عاجل"
          subtitle="مشتتات ومضيعات الوقت والالتزامات المستنزفة التي ينبغي شطبها أو تقليصها."
          badge={
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase mb-1 border border-slate-200 dark:border-slate-800">
              <span>4️⃣ المربع 4</span>
              <span>•</span>
              <span>احذفه أو قلّله</span>
            </div>
          }
          themeColor="slate"
          goals={q4Goals}
          inlineInputValue={inlineInputs.q4_not_urgent_not_important}
          placeholderText="+ أضف مشتتاً أو مهمة لحذفها وتقليصها..."
          emptyText="اسحب المشتتات والمهام المستنزفة إلى هنا لحذفها"
          onChangeInlineInput={(val) => setInlineInputs((prev) => ({ ...prev, q4_not_urgent_not_important: val }))}
          onSubmitInlineInput={() => handleInlineAddGoal('q4_not_urgent_not_important')}
          isDropTarget={dragOverQuadrant === 'q4_not_urgent_not_important'}
          isAnyDragging={Boolean(draggedGoalId)}
          draggedGoalId={draggedGoalId}
          onDragOver={(e) => handleDragOverQuadrant(e, 'q4_not_urgent_not_important')}
          onDragLeave={(e) => handleDragLeaveQuadrant(e, 'q4_not_urgent_not_important')}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onToggleGoal={handleToggleGoal}
          onToggleFocus={handleToggleFocusGoal}
          onMoveQuadrant={handleMoveQuadrant}
          onStartEditGoal={handleStartEditGoal}
          onRequestDeleteGoal={(g) => setGoalToDelete(g)}
          onDragStart={handleDragStart}
        />
      </div>

      {/* Modals & Dialogs */}
      <EisenhowerTaskModal
        showAddModal={showAddModal}
        onCloseAddModal={() => {
          setShowAddModal(false);
          setEditingGoal(null);
          setEditingSuggestion(null);
        }}
        onSubmitGoal={handleAddGoal}
        editingGoal={editingGoal}
        editingSuggestion={editingSuggestion}
        newTitle={newTitle}
        onChangeNewTitle={setNewTitle}
        newQuadrant={newQuadrant}
        onChangeNewQuadrant={setNewQuadrant}
        activeTimeframe={activeTimeframe}
        onChangeActiveTimeframe={setActiveTimeframe}
        newAreaId={newAreaId}
        onChangeNewAreaId={setNewAreaId}
        goalToDelete={goalToDelete}
        onCancelDelete={() => setGoalToDelete(null)}
        onConfirmDelete={handleConfirmDeleteGoal}
        showResetGoalsConfirm={showResetGoalsConfirm}
        onCancelReset={() => setShowResetGoalsConfirm(false)}
        onConfirmReset={handleConfirmResetGoals}
        notificationToast={notificationToast}
      />
    </div>
  );
};
export default EisenhowerMatrixScreen;
