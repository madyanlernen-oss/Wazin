import React from 'react';
import {
  Target,
  Flame,
  Clock,
  CalendarDays,
  Calendar,
  Layers,
  Printer,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { GoalTimeframe } from '../../types/lifeBalance';

interface EisenhowerHeaderProps {
  activeTimeframe: GoalTimeframe;
  onSelectTimeframe: (tf: GoalTimeframe) => void;
  onPrint: () => void;
  onResetDefaults: () => void;
  onOpenAddModal: () => void;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

export const EisenhowerHeader: React.FC<EisenhowerHeaderProps> = ({
  activeTimeframe,
  onSelectTimeframe,
  onPrint,
  onResetDefaults,
  onOpenAddModal,
  completedCount,
  totalCount,
  completionPercent,
}) => {
  return (
    <>
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
            رتّب أهدافك واسحبها بين المربعات الأربعة بحرية.{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              المربع الثاني (مهم وغير عاجل)
            </strong>{' '}
            هو وقود التوازن الشامل والنجاح المستدام.
          </p>
        </div>

        {/* Timeframe Toggle Buttons & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex p-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs"
            role="tablist"
            aria-label="النطاق الزمني للأهداف"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeframe === 'daily'}
              onClick={() => onSelectTimeframe('daily')}
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
              onClick={() => onSelectTimeframe('weekly')}
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
              onClick={() => onSelectTimeframe('monthly')}
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
              onClick={() => onSelectTimeframe('yearly')}
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
            onClick={onPrint}
            title="طباعة وتصدير مصفوفة أيزنهاور"
            aria-label="طباعة وتصدير المصفوفة"
            className="p-2.5 rounded-xl bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-400 hover:border-[#0B6E72]/40 dark:hover:border-cyan-500/40 shadow-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028]"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            title="إعادة تعيين الأهداف الافتراضية"
            aria-label="إعادة تعيين الأهداف الافتراضية"
            className="p-2.5 rounded-xl bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#112028]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
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
                ({completedCount} / {totalCount})
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
    </>
  );
};
