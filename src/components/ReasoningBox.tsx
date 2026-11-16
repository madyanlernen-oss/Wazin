import React, { useState } from 'react';
import { Brain, ChevronDown, Sparkles } from 'lucide-react';

interface ReasoningBoxProps {
  reasoning: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const ReasoningBox: React.FC<ReasoningBoxProps> = ({
  reasoning,
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!reasoning || !reasoning.trim()) return null;

  return (
    <div
      className={`rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-orange-50/40 text-right overflow-hidden shadow-xs transition-all ${className}`}
      dir="rtl"
    >
      {/* Header bar: Brain Icon + Title + Expand Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-amber-100/40 hover:bg-amber-100/70 transition-colors cursor-pointer select-none text-xs font-bold text-amber-900 border-b border-amber-200/40"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="font-black text-[12px] text-amber-950 flex items-center gap-1.5">
            مسار التفكير والتحليل العميق (Reasoning)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 font-extrabold hidden sm:inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            تحليل استراتيجي
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-amber-800">
          <span className="hidden sm:inline font-semibold">
            {isExpanded ? 'طي التحليل' : 'عرض خطوات التفكير'}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Reasoning Content Body */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 text-xs leading-relaxed text-[#403521] border-r-4 border-r-[#bd9240] bg-white/70 space-y-2 animate-fadeIn">
          <div className="whitespace-pre-wrap font-sans text-xs sm:text-[12.5px] leading-relaxed">
            {reasoning}
          </div>
        </div>
      )}
    </div>
  );
};
