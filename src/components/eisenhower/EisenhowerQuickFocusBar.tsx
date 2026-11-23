import React from 'react';
import { Target, Star, Plus } from 'lucide-react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import {
  EisenhowerQuadrant,
  GoalTimeframe,
  LifeAreaId,
} from '../../types/lifeBalance';

interface EisenhowerQuickFocusBarProps {
  activeTimeframe: GoalTimeframe;
  activeFocusCount: number;
  title: string;
  quadrant: EisenhowerQuadrant;
  areaId: LifeAreaId;
  isFocus: boolean;
  onChangeTitle: (val: string) => void;
  onChangeQuadrant: (q: EisenhowerQuadrant) => void;
  onChangeAreaId: (id: LifeAreaId) => void;
  onToggleFocus: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EisenhowerQuickFocusBar: React.FC<EisenhowerQuickFocusBarProps> = ({
  activeTimeframe,
  activeFocusCount,
  title,
  quadrant,
  areaId,
  isFocus,
  onChangeTitle,
  onChangeQuadrant,
  onChangeAreaId,
  onToggleFocus,
  onSubmit,
}) => {
  return (
    <section
      aria-label="إضافة تركيز يدوي سريع"
      className="bg-white dark:bg-[#112028] border-2 border-teal-500/30 dark:border-cyan-800/60 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-[#0B6E72] dark:text-cyan-300 border border-teal-200 dark:border-cyan-800/50 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Target className="w-5 h-5 text-[#0B6E72] dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">
                تركيزي وأولوياتي اليدوية
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-[#0B6E72] dark:text-cyan-300 border border-teal-200/80 dark:border-cyan-800/50">
                إضافة يدوية عادية ✍️
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                النطاق:{' '}
                {activeTimeframe === 'daily'
                  ? 'يومي'
                  : activeTimeframe === 'weekly'
                  ? 'أسبوعي'
                  : activeTimeframe === 'monthly'
                  ? 'شهري'
                  : 'سنوي'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أضف أي مهمة، هدف، أو عادة ترغب بالتركيز عليها مباشرة بأسلوبك الخاص دون وساطة الذكاء الاصطناعي.
            </p>
          </div>
        </div>

        {activeFocusCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-black self-start sm:self-auto">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{activeFocusCount} أهداف في بؤرة التركيز</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="اكتب هنا ما تريد التركيز عليه وإنجازه يدوياً... (اضغط Enter للإضافة)"
              className="w-full bg-slate-50 dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-700/80 focus:border-[#0B6E72] dark:focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
              dir="rtl"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Quadrant Selector */}
            <select
              aria-label="المربع المستهدف في مصفوفة أيزنهاور"
              value={quadrant}
              onChange={(e) => onChangeQuadrant(e.target.value as EisenhowerQuadrant)}
              className="text-xs font-bold bg-slate-50 dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-3 py-3 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer min-h-[44px]"
            >
              <option value="q1_urgent_important">🔴 المربع 1: نفّذ الآن (مهم وعاجل)</option>
              <option value="q2_important_not_urgent">🟢 المربع 2: جدولـه (مهم وغير عاجل • التوازن)</option>
              <option value="q3_urgent_not_important">🟡 المربع 3: فوّضه (غير مهم وعاجل)</option>
              <option value="q4_not_urgent_not_important">⚪ المربع 4: احذفه (غير مهم وغير عاجل)</option>
            </select>

            {/* Life Area Selector */}
            <select
              aria-label="مجال الحياة المرتبط بالهدف"
              value={areaId}
              onChange={(e) => onChangeAreaId(e.target.value as LifeAreaId)}
              className="text-xs font-bold bg-slate-50 dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-3 py-3 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer min-h-[44px]"
            >
              {ADVISORS_LIST.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.avatarSvg} {adv.title}
                </option>
              ))}
            </select>

            {/* Pin as Focus toggle */}
            <button
              type="button"
              onClick={onToggleFocus}
              className={`px-3 py-3 rounded-2xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
                isFocus
                  ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-[#0B161C] border-slate-200/90 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-amber-600'
              }`}
              title={isFocus ? 'معين كبؤرة تركيز رئيسية' : 'تحديد كبؤرة تركيز رئيسية'}
            >
              <Star className={`w-3.5 h-3.5 ${isFocus ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">تركيز رئيسي</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-3 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للتركيز</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
