import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import { LifeAreaId } from '../../types/lifeBalance';

interface OnboardingProgressHeaderProps {
  completedCount: number;
  progressPercent: number;
  isAllCompleted: boolean;
  currentAdvisorIndex: number;
  completedAdvisors: LifeAreaId[];
  onSelectAdvisor: (index: number) => void;
  onNavigateToDashboard: () => void;
}

export const OnboardingProgressHeader: React.FC<OnboardingProgressHeaderProps> = ({
  completedCount,
  progressPercent,
  isAllCompleted,
  currentAdvisorIndex,
  completedAdvisors,
  onSelectAdvisor,
  onNavigateToDashboard,
}) => {
  return (
    <>
      {/* All 8 Domains Completed Milestone Banner */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-[#0F6E6E] to-[#0A4B4B] dark:from-[#0E1D24] dark:to-[#16333F] text-white rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300 border border-teal-500/30 dark:border-[#1E343F] transition-colors">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              🌟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">اكتملت خريطتك المتكاملة (8 من 8)!</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  مكتمل وموثق بنجاح 🔒
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                تم رسم عجلة الحياة وتحديث مصفوفة أيزنهاور وصياغة تقرير المنسق العام بالكامل.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F6E6E] dark:bg-[#22D3EE] dark:hover:bg-cyan-300 dark:text-[#071318] font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <span>استعراض خريطتي ولوحة التحكم</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Station Selector & Adaptive Doctor Consultation Header */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors space-y-4">
        {/* Clean Doctor Consultation Title & Global Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E2E8F0] dark:border-[#1E343F]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0F6E6E]/10 dark:bg-[#22D3EE]/15 text-[#0F6E6E] dark:text-[#22D3EE] flex items-center justify-center text-xl flex-shrink-0">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  جلسة الاستشارة والتقييم الحواري التكيفي
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0F6E6E]/15 dark:bg-[#22D3EE]/20 text-[#0F6E6E] dark:text-[#22D3EE] border border-[#0F6E6E]/30 dark:border-[#22D3EE]/40 flex items-center gap-1 shadow-xs">
                  <span>التقييم التأسيسي الشامل</span>
                  <span>•</span>
                  <span>8 محطات نوعية</span>
                </span>
              </div>
              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-0.5">
                حوار استشاري هادئ ومطمئن؛ استمع لمستشارك وشارك واقعك برفق لنشخص اتزانك خطوة بخطوة.
              </p>
            </div>
          </div>

          {/* Accurate Completion Progress Indicator */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F6F2] dark:bg-[#112028] border border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 self-start sm:self-auto">
            <span className="text-xs font-bold text-[#334155] dark:text-[#CBD5E1]">المكتمل:</span>
            <span dir="ltr" className="font-mono text-xs font-black px-1.5 py-0.5 rounded-md bg-white dark:bg-[#071318] text-[#0F6E6E] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-[#1E343F]">
              {completedCount} / 8
            </span>
            <div className="w-20 sm:w-28 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F6E6E] dark:bg-[#22D3EE] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span dir="ltr" className="font-mono text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* 8 Advisor Station Tabs - Balanced Grid (No Clipping of 5th Domain) */}
        <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-8 gap-1.5 sm:gap-2">
          {ADVISORS_LIST.map((advisor, index) => {
            const isAdvCompleted = completedAdvisors.includes(advisor.id);
            const isCurrent = index === currentAdvisorIndex;

            return (
              <button
                key={advisor.id}
                type="button"
                onClick={() => onSelectAdvisor(index)}
                className={`group relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none text-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
                  isCurrent
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] dark:border-[#0891B2] shadow-sm ring-2 ring-[#0F6E6E]/20 dark:ring-[#22D3EE]/30'
                    : isAdvCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                    : 'bg-[#F7F6F2] dark:bg-[#0B161C] text-[#334155] dark:text-[#CBD5E1] border-[#E2E8F0] dark:border-[#1E343F] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-white dark:hover:bg-[#162734]'
                }`}
                title={`المحطة ${index + 1}: ${advisor.title}`}
              >
                <span className="text-sm flex-shrink-0">{advisor.avatarSvg}</span>
                <span className="truncate">{advisor.title.replace('الجانب ', '')}</span>
                {isAdvCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <span
                    dir="ltr"
                    className={`text-[9px] font-mono px-1 rounded-sm ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
