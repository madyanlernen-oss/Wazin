import React, { useState } from 'react';
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
  Zap,
  Clock,
  Printer,
  Flame,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { EisenhowerGoalItem, EisenhowerQuadrant, GoalTimeframe, LifeAreaId } from '../types/lifeBalance';

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

  // 4. غير مهم وغير عاجل (احذفه)
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
}

export const EisenhowerMatrixScreen: React.FC<EisenhowerMatrixScreenProps> = ({
  goals: propGoals,
  onUpdateGoals,
}) => {
  const [goals, setGoals] = useState<EisenhowerGoalItem[]>(propGoals && propGoals.length > 0 ? propGoals : INITIAL_EISENHOWER_GOALS);
  const [activeTimeframe, setActiveTimeframe] = useState<GoalTimeframe>('weekly');

  // Sync propGoals when updated externally (e.g. from AI Advisors)
  React.useEffect(() => {
    if (propGoals && propGoals.length > 0) {
      setGoals(propGoals);
    }
  }, [propGoals]);

  // Drag and drop state
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);

  // New goal form modal / state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuadrant, setNewQuadrant] = useState<EisenhowerQuadrant>('q2_important_not_urgent');
  const [newAreaId, setNewAreaId] = useState<LifeAreaId>('career');

  const updateAllGoals = (updated: EisenhowerGoalItem[]) => {
    setGoals(updated);
    if (onUpdateGoals) onUpdateGoals(updated);
  };

  // Toggle goal completion
  const handleToggleGoal = (id: string) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g));
    updateAllGoals(updated);
  };

  // Delete goal
  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    updateAllGoals(updated);
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

  // Add new goal manually
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: EisenhowerGoalItem = {
      id: `goal_${Date.now()}`,
      title: newTitle.trim(),
      quadrant: newQuadrant,
      timeframe: activeTimeframe,
      areaId: newAreaId,
      completed: false,
      source: 'user',
    };

    updateAllGoals([newGoal, ...goals]);
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

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8 bg-[#FAF7F2]">
      {/* Header and Timeframe Selector */}
      <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b605b]/10 text-[#1b605b] text-xs font-bold">
              <Target className="w-3.5 h-3.5 text-[#bd9240]" />
              مصفوفة أيزنهاور لتنظيم الأولويات
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              الالتزام: 4 أسابيع متتالية 🔥
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#1d2e2b]">
            أهدافي (إدارة الأولويات الذكية)
          </h1>
          <p className="text-xs sm:text-sm text-[#536561] mt-1 max-w-2xl leading-relaxed">
            رتّب أهدافك واسحبها بين المربعات الأربعة بحرية. المربع الثاني (مهم وغير عاجل) هو وقود التوازن والنجاح المستدام.
          </p>
        </div>

        {/* Timeframe Toggle Buttons & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1.5 bg-[#FAF7F2] border border-[#ded7c8] rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTimeframe('daily')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTimeframe === 'daily'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#536561] hover:text-[#1d2e2b]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>يومية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTimeframe('weekly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTimeframe === 'weekly'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#536561] hover:text-[#1d2e2b]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>أسبوعية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTimeframe('monthly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTimeframe === 'monthly'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#536561] hover:text-[#1d2e2b]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>شهرية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTimeframe('yearly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTimeframe === 'yearly'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#536561] hover:text-[#1d2e2b]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>سنوية</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            title="طباعة وتصدير المصفوفة"
            className="p-2.5 rounded-xl bg-white border border-[#ded7c8] text-[#536561] hover:text-[#1b605b] shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#bd9240] hover:bg-[#a88235] text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة هدف</span>
          </button>
        </div>
      </div>

      {/* Progress Bar for Current Timeframe */}
      <div className="bg-white border border-[#eae3d5] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            {completionPercent}%
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1d2e2b]">
              معدل إنجاز أهداف النطاق ({completedInTimeframe} من {totalInTimeframe} مهام مكتملة)
            </h4>
            <span className="text-[11px] text-[#7a8c88]">
              اسحب أي مهمة وأسقطها لتغيير مربعها أو استخدم السهم السريع
            </span>
          </div>
        </div>

        <div className="w-full sm:w-64 h-2.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#eae3d5]">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* The 4 Eisenhower Quadrants Grid (Interactive Drag & Drop Zones) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quadrant 1: مهم وعاجل (نفّذ الآن) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q1_urgent_important')}
          className="bg-white border-2 border-rose-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-rose-400 transition-colors"
        >
          <div className="flex items-start justify-between pb-3 border-b border-rose-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase mb-1 border border-rose-200">
                <span>المربع 1</span>
                <span>•</span>
                <span>نفّذ الآن</span>
              </div>
              <h2 className="text-lg font-black text-rose-950">مهم وعاجل</h2>
              <p className="text-xs text-[#536561] mt-0.5">
                مهام لها موعد نهائي قريب أو مشكلة تتطلب تدخلاً فورياً.
              </p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 font-black text-sm flex items-center justify-center">
              {q1Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[160px]">
            {q1Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8a9995] border-2 border-dashed border-rose-100 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-rose-300 mb-1" />
                <span className="text-xs font-semibold">اسحب أي مهمة إلى هنا</span>
              </div>
            ) : (
              q1Goals.map((g) => {
                const adv = ADVISORS_LIST.find((a) => a.id === g.areaId);
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, g.id)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-grab active:cursor-grabbing ${
                      g.completed
                        ? 'bg-rose-50/40 border-rose-100 text-rose-900/60 line-through'
                        : 'bg-rose-50/20 border-rose-200/80 text-[#1d2e2b] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGoal(g.id)}
                        className="mt-0.5 text-rose-600 cursor-pointer"
                      >
                        {g.completed ? (
                          <CheckCircle2 className="w-4 h-4 fill-rose-600 text-white" />
                        ) : (
                          <Circle className="w-4 h-4 text-rose-400" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs font-extrabold block leading-snug">{g.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {adv && (
                            <span className="text-[10px] text-[#536561] flex items-center gap-1">
                              <span>{adv.avatarSvg}</span>
                              <span>{adv.title.split(' ')[0]}</span>
                            </span>
                          )}
                          {g.advisorName && (
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-100/60 px-1.5 py-0.2 rounded">
                              توجيه {g.advisorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        aria-label="نقل المربع"
                        value={g.quadrant}
                        onChange={(e) => handleMoveQuadrant(g.id, e.target.value as EisenhowerQuadrant)}
                        className="text-[10px] bg-white border border-[#ded7c8] rounded-md px-1 py-0.5 text-[#536561] cursor-pointer"
                      >
                        <option value="q1_urgent_important">المربع 1 (نفذ)</option>
                        <option value="q2_important_not_urgent">المربع 2 (جدول)</option>
                        <option value="q3_urgent_not_important">المربع 3 (فوّض)</option>
                        <option value="q4_not_urgent_not_important">المربع 4 (احذف)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quadrant 2: مهم وغير عاجل (جدول له - سر النجاح المستمر) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q2_important_not_urgent')}
          className="bg-white border-2 border-emerald-300 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-start justify-between pb-3 border-b border-emerald-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase mb-1 border border-emerald-300">
                <Sparkles className="w-3 h-3 text-[#bd9240]" />
                <span>المربع 2</span>
                <span>•</span>
                <span>جدول له (مربع التوازن)</span>
              </div>
              <h2 className="text-lg font-black text-emerald-950">مهم وغير عاجل</h2>
              <p className="text-xs text-[#536561] mt-0.5">
                مهام تخدم أهدافك المستقبلية، وتصنع النمو والسكينة الحقيقية.
              </p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
              {q2Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[160px]">
            {q2Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8a9995] border-2 border-dashed border-emerald-100 rounded-2xl">
                <Target className="w-8 h-8 text-emerald-300 mb-1" />
                <span className="text-xs font-semibold">اسحب أهدافك الاستراتيجية إلى هنا</span>
              </div>
            ) : (
              q2Goals.map((g) => {
                const adv = ADVISORS_LIST.find((a) => a.id === g.areaId);
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, g.id)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-grab active:cursor-grabbing ${
                      g.completed
                        ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900/60 line-through'
                        : 'bg-emerald-50/20 border-emerald-200 text-[#1d2e2b] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGoal(g.id)}
                        className="mt-0.5 text-emerald-600 cursor-pointer"
                      >
                        {g.completed ? (
                          <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                        ) : (
                          <Circle className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs font-extrabold block leading-snug">{g.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {adv && (
                            <span className="text-[10px] text-[#536561] flex items-center gap-1">
                              <span>{adv.avatarSvg}</span>
                              <span>{adv.title.split(' ')[0]}</span>
                            </span>
                          )}
                          {g.advisorName && (
                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                              توجيه {g.advisorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        aria-label="نقل المربع"
                        value={g.quadrant}
                        onChange={(e) => handleMoveQuadrant(g.id, e.target.value as EisenhowerQuadrant)}
                        className="text-[10px] bg-white border border-[#ded7c8] rounded-md px-1 py-0.5 text-[#536561] cursor-pointer"
                      >
                        <option value="q1_urgent_important">المربع 1 (نفذ)</option>
                        <option value="q2_important_not_urgent">المربع 2 (جدول)</option>
                        <option value="q3_urgent_not_important">المربع 3 (فوّض)</option>
                        <option value="q4_not_urgent_not_important">المربع 4 (احذف)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-emerald-400 hover:text-emerald-700 p-1 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quadrant 3: غير مهم وعاجل (فوّضه) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q3_urgent_not_important')}
          className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors"
        >
          <div className="flex items-start justify-between pb-3 border-b border-amber-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase mb-1 border border-amber-200">
                <span>المربع 3</span>
                <span>•</span>
                <span>فوّضه</span>
              </div>
              <h2 className="text-lg font-black text-amber-950">غير مهم وعاجل</h2>
              <p className="text-xs text-[#536561] mt-0.5">
                أمور تستدعي انتباهك لكنها لا تتطلب بالضرورة أن تقوم بها بنفسك.
              </p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
              {q3Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[160px]">
            {q3Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8a9995] border-2 border-dashed border-amber-100 rounded-2xl">
                <Clock className="w-8 h-8 text-amber-300 mb-1" />
                <span className="text-xs font-semibold">اسحب مهام التفويض إلى هنا</span>
              </div>
            ) : (
              q3Goals.map((g) => {
                const adv = ADVISORS_LIST.find((a) => a.id === g.areaId);
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, g.id)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-grab active:cursor-grabbing ${
                      g.completed
                        ? 'bg-amber-50/40 border-amber-200 text-amber-900/60 line-through'
                        : 'bg-amber-50/20 border-amber-200 text-[#1d2e2b] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGoal(g.id)}
                        className="mt-0.5 text-amber-600 cursor-pointer"
                      >
                        {g.completed ? (
                          <CheckCircle2 className="w-4 h-4 fill-amber-600 text-white" />
                        ) : (
                          <Circle className="w-4 h-4 text-amber-500" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs font-extrabold block leading-snug">{g.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {adv && (
                            <span className="text-[10px] text-[#536561] flex items-center gap-1">
                              <span>{adv.avatarSvg}</span>
                              <span>{adv.title.split(' ')[0]}</span>
                            </span>
                          )}
                          {g.advisorName && (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100/70 px-1.5 py-0.2 rounded">
                              توجيه {g.advisorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        aria-label="نقل المربع"
                        value={g.quadrant}
                        onChange={(e) => handleMoveQuadrant(g.id, e.target.value as EisenhowerQuadrant)}
                        className="text-[10px] bg-white border border-[#ded7c8] rounded-md px-1 py-0.5 text-[#536561] cursor-pointer"
                      >
                        <option value="q1_urgent_important">المربع 1 (نفذ)</option>
                        <option value="q2_important_not_urgent">المربع 2 (جدول)</option>
                        <option value="q3_urgent_not_important">المربع 3 (فوّض)</option>
                        <option value="q4_not_urgent_not_important">المربع 4 (احذف)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-amber-400 hover:text-amber-700 p-1 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quadrant 4: غير مهم وغير عاجل (احذفه) */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'q4_not_urgent_not_important')}
          className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors"
        >
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase mb-1 border border-slate-200">
                <span>المربع 4</span>
                <span>•</span>
                <span>احذفه أو قلله</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">غير مهم وغير عاجل</h2>
              <p className="text-xs text-[#536561] mt-0.5">
                أنشطة تستهلك وقتك وطاقتك دون قيمة حقيقية لحياتك.
              </p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center">
              {q4Goals.length}
            </span>
          </div>

          {/* Goal List */}
          <div className="space-y-2.5 min-h-[160px]">
            {q4Goals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8a9995] border-2 border-dashed border-slate-100 rounded-2xl">
                <Zap className="w-8 h-8 text-slate-300 mb-1" />
                <span className="text-xs font-semibold">اسحب مضيعات الوقت إلى هنا لتقليلها</span>
              </div>
            ) : (
              q4Goals.map((g) => {
                const adv = ADVISORS_LIST.find((a) => a.id === g.areaId);
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, g.id)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-grab active:cursor-grabbing ${
                      g.completed
                        ? 'bg-slate-100/60 border-slate-200 text-slate-500 line-through'
                        : 'bg-slate-50 border-slate-200 text-[#1d2e2b] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGoal(g.id)}
                        className="mt-0.5 text-slate-500 cursor-pointer"
                      >
                        {g.completed ? (
                          <CheckCircle2 className="w-4 h-4 fill-slate-500 text-white" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs font-extrabold block leading-snug">{g.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {adv && (
                            <span className="text-[10px] text-[#536561] flex items-center gap-1">
                              <span>{adv.avatarSvg}</span>
                              <span>{adv.title.split(' ')[0]}</span>
                            </span>
                          )}
                          {g.advisorName && (
                            <span className="text-[10px] text-slate-700 font-bold bg-slate-200/80 px-1.5 py-0.2 rounded">
                              توجيه {g.advisorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        aria-label="نقل المربع"
                        value={g.quadrant}
                        onChange={(e) => handleMoveQuadrant(g.id, e.target.value as EisenhowerQuadrant)}
                        className="text-[10px] bg-white border border-[#ded7c8] rounded-md px-1 py-0.5 text-[#536561] cursor-pointer"
                      >
                        <option value="q1_urgent_important">المربع 1 (نفذ)</option>
                        <option value="q2_important_not_urgent">المربع 2 (جدول)</option>
                        <option value="q3_urgent_not_important">المربع 3 (فوّض)</option>
                        <option value="q4_not_urgent_not_important">المربع 4 (احذف)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Manual Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-right space-y-5">
            <h3 className="text-lg font-black text-[#1d2e2b] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1b605b]" />
              إضافة هدف إلى مصفوفة أيزنهاور
            </h3>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1">
                  نص الهدف أو المهمة:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: قراءة 20 صفحة يومياً، إنهاء تقرير المبيعات..."
                  className="w-full bg-[#FAF7F2] border border-[#ded7c8] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1d2e2b] focus:outline-none focus:border-[#1b605b]"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1">
                  المربع المستهدف في مصفوفة أيزنهاور:
                </label>
                <select
                  value={newQuadrant}
                  onChange={(e) => setNewQuadrant(e.target.value as EisenhowerQuadrant)}
                  className="w-full bg-[#FAF7F2] border border-[#ded7c8] rounded-xl px-4 py-2.5 text-xs text-[#1d2e2b] focus:outline-none focus:border-[#1b605b]"
                >
                  <option value="q1_urgent_important">1 - مهم وعاجل (نفّذ الآن)</option>
                  <option value="q2_important_not_urgent">2 - مهم وغير عاجل (جدول له - بناء المستقبل)</option>
                  <option value="q3_urgent_not_important">3 - غير مهم وعاجل (فوّضه)</option>
                  <option value="q4_not_urgent_not_important">4 - غير مهم وغير عاجل (احذفه أو قلله)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1">
                  المجال المرتبط بالهدف:
                </label>
                <select
                  value={newAreaId}
                  onChange={(e) => setNewAreaId(e.target.value as LifeAreaId)}
                  className="w-full bg-[#FAF7F2] border border-[#ded7c8] rounded-xl px-4 py-2.5 text-xs text-[#1d2e2b] focus:outline-none focus:border-[#1b605b]"
                >
                  {ADVISORS_LIST.map((adv) => (
                    <option key={adv.id} value={adv.id}>
                      {adv.avatarSvg} {adv.title} ({adv.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#ded7c8] text-xs font-bold text-[#536561] hover:bg-[#FAF7F2]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  حفظ الهدف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
