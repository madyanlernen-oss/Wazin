import React from 'react';
import {
  Sparkles,
  BrainCircuit,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import { EisenhowerSuggestionItem } from '../../utils/eisenhowerAgent';
import { isolateNumbersInText } from '../FormattedChatMessage';
import { localizeDomainText } from '../../utils/arabicDomainLabels';

interface EisenhowerSuggestionsSectionProps {
  suggestions: EisenhowerSuggestionItem[];
  isCollapsed: boolean;
  isLoading: boolean;
  onToggleCollapse: () => void;
  onRefreshSuggestions: () => void;
  onAddSuggestionDirectly: (sug: EisenhowerSuggestionItem) => void;
  onCustomizeSuggestion: (sug: EisenhowerSuggestionItem) => void;
  onDismissSuggestion: (id: string) => void;
}

export const EisenhowerSuggestionsSection: React.FC<EisenhowerSuggestionsSectionProps> = ({
  suggestions,
  isCollapsed,
  isLoading,
  onToggleCollapse,
  onRefreshSuggestions,
  onAddSuggestionDirectly,
  onCustomizeSuggestion,
  onDismissSuggestion,
}) => {
  return (
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
              خطط عملية مستخلصة من تشخيص منظومة حياتك وعلاج عنق الزجاجة (م. معتز) وأولويات المربع الثاني (د. هاني). يمكنك{' '}
              <strong className="text-[#0B6E72] dark:text-cyan-400">طرحها مباشرة في مصفوفتك</strong> أو{' '}
              <strong className="text-[#0B6E72] dark:text-cyan-400">تعديلها وملؤها يدوياً</strong>.
            </p>
          </div>
        </div>

        {/* Action & Toggle Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/90 dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 shadow-2xs">
            {suggestions.length}{' '}
            {suggestions.length === 1
              ? 'اقتراح ذكي'
              : suggestions.length === 2
              ? 'اقتراحان ذكيان'
              : 'اقتراحات ذكية'}
          </span>

          <button
            type="button"
            onClick={onRefreshSuggestions}
            disabled={isLoading}
            title="تحديث واستدعاء مقترحات جديدة من الوكلاء"
            className="p-2 rounded-xl bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:border-[#0B6E72]/40 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0B6E72]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'توسيع وإظهار الاقتراحات' : 'طي الاقتراحات مؤقتاً'}
            className="p-2 rounded-xl bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <span className="text-[11px] font-bold sm:inline hidden">
              {isCollapsed ? 'عرض' : 'طي'}
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Suggestions Body: Cards Grid */}
      {!isCollapsed && (
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
                          {localizeDomainText(sug.sourceTypeLabel)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDismissSuggestion(sug.id)}
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
                          {isolateNumbersInText(localizeDomainText(sug.quadrantLabel))}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">
                        {isolateNumbersInText(localizeDomainText(sug.title))}
                      </h4>

                      <div className="text-[11px] text-[#475569] dark:text-slate-300 bg-slate-50/90 dark:bg-[#071318]/70 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-2.5 leading-relaxed">
                        <strong className="text-[#0B6E72] dark:text-cyan-400 font-black">
                          سبب الاقتراح:{' '}
                        </strong>
                        <span>{isolateNumbersInText(localizeDomainText(sug.rationale))}</span>
                      </div>
                    </div>

                    {/* Bottom Actions: Add Directly (+) OR Edit & Fill Manually */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAddSuggestionDirectly(sug)}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                        title="طرح الهدف مباشرة في المربع المقترح بنقرة واحدة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>طرح في المصفوفة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onCustomizeSuggestion(sug)}
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
                onClick={onRefreshSuggestions}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>طلب مقترحات استراتيجية إضافية</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
