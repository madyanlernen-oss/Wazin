import React from 'react';
import {
  CheckCircle2,
  Circle,
  Star,
  Edit3,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import { isolateNumbersInText } from '../FormattedChatMessage';
import { localizeDomainText } from '../../utils/arabicDomainLabels';
import {
  EisenhowerGoalItem,
  EisenhowerQuadrant,
} from '../../types/lifeBalance';

const QUICK_QUADRANT_OPTIONS: Array<{
  id: EisenhowerQuadrant;
  shortNum: string;
  shortLabel: string;
  fullLabel: string;
  activeClass: string;
}> = [
    {
      id: 'q1_urgent_important',
      shortNum: '1',
      shortLabel: 'نفّذ',
      fullLabel: 'نقل إلى المربع 1: نفّذ الآن',
      activeClass: 'bg-rose-600 text-white border-rose-600 shadow-2xs',
    },
    {
      id: 'q2_important_not_urgent',
      shortNum: '2',
      shortLabel: 'جدول',
      fullLabel: 'نقل إلى المربع 2: جدوله',
      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs',
    },
    {
      id: 'q3_urgent_not_important',
      shortNum: '3',
      shortLabel: 'فوّض',
      fullLabel: 'نقل إلى المربع 3: فوّضه',
      activeClass: 'bg-amber-600 text-white border-amber-600 shadow-2xs',
    },
    {
      id: 'q4_not_urgent_not_important',
      shortNum: '4',
      shortLabel: 'احذف',
      fullLabel: 'نقل إلى المربع 4: احذفه أو قلّله',
      activeClass: 'bg-slate-600 text-white border-slate-600 shadow-2xs',
    },
  ];

interface EisenhowerGoalCardProps {
  goal: EisenhowerGoalItem;
  quadrantColor: 'rose' | 'emerald' | 'amber' | 'slate';
  isDragging?: boolean;
  onToggleGoal: (id: string) => void;
  onToggleFocus: (id: string) => void;
  onMoveQuadrant: (id: string, q: EisenhowerQuadrant) => void;
  onStartEditGoal: (g: EisenhowerGoalItem) => void;
  onRequestDeleteGoal: (g: EisenhowerGoalItem) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
}

export const EisenhowerGoalCard: React.FC<EisenhowerGoalCardProps> = ({
  goal: g,
  quadrantColor,
  isDragging = false,
  onToggleGoal,
  onToggleFocus,
  onMoveQuadrant,
  onStartEditGoal,
  onRequestDeleteGoal,
  onDragStart,
  onDragEnd,
}) => {
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
      draggable
      onDragStart={(e) => onDragStart(e, g.id)}
      onDragEnd={onDragEnd}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col gap-2.5 cursor-grab active:cursor-grabbing group min-w-0 select-none shadow-2xs ${colorClasses} ${g.isFocus ? 'ring-2 ring-amber-400 dark:ring-amber-400/80 shadow-xs border-amber-300 dark:border-amber-700/80' : ''
        } ${isDragging ? 'opacity-50 scale-[0.98] ring-2 ring-[#0B6E72]/40' : ''}`}
    >
      {/* Top Row: Drag Handle, Checkbox & Goal Content */}
      <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 w-full">
        <span
          className="mt-1.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0"
          title="اسحب لنقل المهمة بين المربعات"
          aria-hidden="true"
        >
          <GripVertical className="w-4 h-4" />
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGoal(g.id);
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
          <div className="flex items-start gap-1.5">
            {g.isFocus && (
              <span title="بؤرة تركيز رئيسية">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 flex-shrink-0 mt-0.5" />
              </span>
            )}
            <p
              className={`text-xs sm:text-[13px] font-bold leading-relaxed break-words text-right flex-1 ${g.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-[#0F172A] dark:text-white'
                }`}
            >
              {isolateNumbersInText(localizeDomainText(g.title))}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Metadata Tags + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 min-w-0 w-full">
        {/* Tags: Domain Badge + Advisor Badge */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {adv && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#334155] dark:text-slate-200 bg-white/95 dark:bg-[#0B161C] px-2 py-0.5 rounded-md border border-slate-200/90 dark:border-slate-700 shadow-2xs max-w-full">
              <span className="text-xs">{adv.avatarSvg}</span>
              <span className="truncate">{adv.title}</span>
            </span>
          )}

          {g.advisorName && (
            <span className="inline-flex items-center text-[10px] font-bold text-[#0B6E72] dark:text-cyan-300 bg-[#0B6E72]/10 dark:bg-cyan-950/70 border border-[#0B6E72]/20 dark:border-cyan-800/50 px-2 py-0.5 rounded-md max-w-full">
              <span className="truncate">توجيه: {g.advisorName}</span>
            </span>
          )}

          {g.source === 'user' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-md max-w-full">
              <span>🎯 تركيز يدوي</span>
            </span>
          )}
        </div>

        {/* Quick Actions: 1-Tap Quadrant Buttons, Star, Edit & Delete */}
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 ms-auto">
          <div
            className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-white/95 dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 shadow-2xs"
            role="group"
            aria-label="نقل سريع بين المربعات الأربعة"
          >
            {QUICK_QUADRANT_OPTIONS.map((q) => {
              const isCurrent = g.quadrant === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrent) onMoveQuadrant(g.id, q.id);
                  }}
                  aria-pressed={isCurrent}
                  aria-label={q.fullLabel}
                  title={q.fullLabel}
                  className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${isCurrent
                      ? q.activeClass
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                >
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">
                    {q.shortNum}
                  </span>{' '}
                  <span className="hidden sm:inline">{q.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFocus(g.id);
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${g.isFocus
                ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent'
              }`}
            title={g.isFocus ? 'إلغاء تمييز بؤرة التركيز' : 'تمييز كبؤرة تركيز رئيسية'}
            aria-label={g.isFocus ? 'إلغاء تمييز بؤرة التركيز' : 'تمييز كبؤرة تركيز رئيسية'}
          >
            <Star className={`w-3.5 h-3.5 ${g.isFocus ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartEditGoal(g);
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
              onRequestDeleteGoal(g);
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
