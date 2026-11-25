import React from 'react';
import { Plus, CheckCircle2, Target } from 'lucide-react';
import { EisenhowerGoalItem, EisenhowerQuadrant } from '../../types/lifeBalance';
import { EisenhowerGoalCard } from './EisenhowerGoalCard';

interface EisenhowerQuadrantCardProps {
  quadrant: EisenhowerQuadrant;
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  themeColor: 'rose' | 'emerald' | 'amber' | 'slate';
  goals: EisenhowerGoalItem[];
  inlineInputValue: string;
  placeholderText: string;
  emptyText: string;
  isDropTarget?: boolean;
  isAnyDragging?: boolean;
  draggedGoalId?: string | null;
  onChangeInlineInput: (val: string) => void;
  onSubmitInlineInput: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop: (e: React.DragEvent, quadrant: EisenhowerQuadrant) => void;
  onToggleGoal: (id: string) => void;
  onToggleFocus: (id: string) => void;
  onMoveQuadrant: (id: string, q: EisenhowerQuadrant) => void;
  onStartEditGoal: (g: EisenhowerGoalItem) => void;
  onRequestDeleteGoal: (g: EisenhowerGoalItem) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const EisenhowerQuadrantCard: React.FC<EisenhowerQuadrantCardProps> = ({
  quadrant,
  title,
  subtitle,
  badge,
  themeColor,
  goals,
  inlineInputValue,
  placeholderText,
  emptyText,
  isDropTarget = false,
  isAnyDragging = false,
  draggedGoalId = null,
  onChangeInlineInput,
  onSubmitInlineInput,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  onToggleGoal,
  onToggleFocus,
  onMoveQuadrant,
  onStartEditGoal,
  onRequestDeleteGoal,
  onDragStart,
}) => {
  const containerClasses = {
    rose: 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700/80',
    emerald: 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300 dark:hover:border-emerald-700/80',
    amber: 'border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80',
    slate: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
  }[themeColor];

  const headerBorder = {
    rose: 'border-rose-100 dark:border-rose-900/40',
    emerald: 'border-emerald-100 dark:border-emerald-900/40',
    amber: 'border-amber-100 dark:border-amber-900/40',
    slate: 'border-slate-100 dark:border-slate-800',
  }[themeColor];

  const titleColor = {
    rose: 'text-rose-900 dark:text-rose-200',
    emerald: 'text-emerald-900 dark:text-emerald-200',
    amber: 'text-amber-900 dark:text-amber-200',
    slate: 'text-slate-900 dark:text-slate-200',
  }[themeColor];

  const countBadge = {
    rose: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    amber: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-[#FBBF24] border-amber-200 dark:border-amber-800/60',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }[themeColor];

  const inlineInputWrap = {
    rose: 'border-rose-200/80 dark:border-rose-900/50 focus-within:border-rose-400 dark:focus-within:border-rose-600 focus-within:ring-rose-400',
    emerald: 'border-emerald-200/80 dark:border-emerald-900/50 focus-within:border-emerald-400 dark:focus-within:border-emerald-600 focus-within:ring-emerald-400',
    amber: 'border-amber-200/80 dark:border-amber-900/50 focus-within:border-amber-400 dark:focus-within:border-amber-600 focus-within:ring-amber-400',
    slate: 'border-slate-200/80 dark:border-slate-700/60 focus-within:border-slate-400 dark:focus-within:border-slate-500 focus-within:ring-slate-400',
  }[themeColor];

  const inlineSubmitBtn = {
    rose: 'bg-rose-600 hover:bg-rose-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    slate: 'bg-slate-700 hover:bg-slate-800',
  }[themeColor];

  const emptyPlaceholder = {
    rose: 'text-rose-500/70 dark:text-rose-400/60 border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10',
    emerald: 'text-emerald-600/70 dark:text-emerald-400/60 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10',
    amber: 'text-amber-600/70 dark:text-amber-400/60 border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10',
    slate: 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10',
  }[themeColor];

  const completedInQuadrant = goals.filter((g) => g.completed).length;
  const quadrantCompletionPct = goals.length > 0 ? Math.round((completedInQuadrant / goals.length) * 100) : 0;

  const dropHighlightClasses = {
    rose: 'ring-4 ring-rose-400/35 border-rose-500 dark:border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 scale-[1.01]',
    emerald: 'ring-4 ring-emerald-400/35 border-emerald-500 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 scale-[1.01]',
    amber: 'ring-4 ring-amber-400/35 border-amber-500 dark:border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 scale-[1.01]',
    slate: 'ring-4 ring-cyan-400/30 border-[#0B6E72] dark:border-cyan-400 bg-slate-50/50 dark:bg-cyan-950/20 scale-[1.01]',
  }[themeColor];

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, quadrant)}
      className={`bg-white dark:bg-[#112028] border-2 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all duration-150 ${
        isDropTarget
          ? dropHighlightClasses
          : isAnyDragging
          ? `${containerClasses} border-dashed`
          : containerClasses
      }`}
    >
      <div className={`flex items-start justify-between gap-2 pb-3 border-b ${headerBorder}`}>
        <div>
          {badge}
          <h2 className={`text-lg font-black ${titleColor}`}>{title}</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center tabular-nums border ${countBadge}`}
            dir="ltr"
            aria-label={`عدد الأهداف: ${goals.length}`}
          >
            {goals.length}
          </span>
          {goals.length > 0 && (
            <span
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums"
              title={`تم إنجاز ${completedInQuadrant} من ${goals.length} في هذا المربع`}
            >
              {completedInQuadrant}/{goals.length} ({quadrantCompletionPct}%)
            </span>
          )}
        </div>
      </div>

      {isDropTarget && (
        <div className="rounded-xl border border-dashed border-[#0B6E72]/50 dark:border-cyan-400/50 bg-[#0B6E72]/5 dark:bg-cyan-950/40 px-3 py-1.5 text-center text-[11px] font-black text-[#0B6E72] dark:text-cyan-300 animate-pulse">
          أفلت المهمة هنا لنقلها إلى {title}
        </div>
      )}

      {/* Inline Quick Add */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitInlineInput();
        }}
        className={`flex items-center gap-1.5 bg-slate-50 dark:bg-[#0B161C] border rounded-2xl p-1.5 transition-colors focus-within:ring-1 ${inlineInputWrap}`}
      >
        <input
          type="text"
          value={inlineInputValue}
          onChange={(e) => onChangeInlineInput(e.target.value)}
          placeholder={placeholderText}
          aria-label={`إضافة مهمة سريعة في ${title}`}
          className="w-full bg-transparent border-0 px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!inlineInputValue.trim()}
          className={`px-3 py-1.5 min-h-[34px] rounded-xl text-white text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${inlineSubmitBtn}`}
          title="إضافة سريعة (Enter)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة</span>
        </button>
      </form>

      {/* Goal List */}
      <div className="space-y-2.5 min-h-[170px] flex-1">
        {goals.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-2xl ${emptyPlaceholder}`}
          >
            {themeColor === 'emerald' ? (
              <Target className="w-8 h-8 text-emerald-300 dark:text-emerald-700 mb-1" />
            ) : (
              <CheckCircle2 className="w-8 h-8 opacity-40 mb-1" />
            )}
            <span className="text-xs font-semibold">{emptyText}</span>
          </div>
        ) : (
          goals.map((g) => (
            <EisenhowerGoalCard
              key={g.id}
              goal={g}
              quadrantColor={themeColor}
              isDragging={draggedGoalId === g.id}
              onToggleGoal={onToggleGoal}
              onToggleFocus={onToggleFocus}
              onMoveQuadrant={onMoveQuadrant}
              onStartEditGoal={onStartEditGoal}
              onRequestDeleteGoal={onRequestDeleteGoal}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
};
