import React, { useState, useId } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { stripMarkdown } from '../utils/stripMarkdown';

interface ReasoningBoxProps {
  reasoning: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const ReasoningBox: React.FC<ReasoningBoxProps> = ({
  reasoning,
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const bodyId = useId();

  const sanitizedReasoning = stripMarkdown(reasoning);
  if (!sanitizedReasoning) return null;

  return (
    <div
      className={`rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/70 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/20 text-right overflow-hidden shadow-xs motion-safe:transition-all ${className}`}
      dir="rtl"
    >
      {/* Header bar: Brain Icon + Title + Expand Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-amber-100/40 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 motion-safe:transition-colors cursor-pointer select-none text-xs font-bold text-amber-900 dark:text-amber-200 border-b border-amber-200/40 dark:border-amber-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0">
            <Brain className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="font-black text-xs text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
            كيف توصّل المستشار إلى هذا الرد
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300">
          <span className="hidden sm:inline font-semibold">
            {isExpanded ? 'طي التحليل' : 'عرض خطوات التفكير'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 motion-safe:transition-transform motion-safe:duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Reasoning Content Body */}
      {isExpanded && (
        <div
          id={bodyId}
          className="p-3.5 sm:p-4 text-sm leading-relaxed text-[#403521] dark:text-slate-200 border-s-4 border-s-[#bd9240] dark:border-s-amber-500 bg-white/70 dark:bg-[#112028]/70 space-y-2 motion-safe:animate-fadeIn"
        >
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {sanitizedReasoning}
          </div>
        </div>
      )}
    </div>
  );
};
