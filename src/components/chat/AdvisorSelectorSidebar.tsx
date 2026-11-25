import React from 'react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../../types/lifeBalance';

interface AdvisorSelectorSidebarProps {
  currentAdvisorId: LifeAreaId;
  scores: Record<LifeAreaId, number>;
  onSelectAdvisor: (advisorId: LifeAreaId) => void;
  advisors?: AdvisorConfig[];
}

export const AdvisorSelectorSidebar: React.FC<AdvisorSelectorSidebarProps> = ({
  currentAdvisorId,
  scores,
  onSelectAdvisor,
  advisors = ADVISORS_LIST,
}) => {
  return (
    <div className="lg:col-span-4 bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-4 shadow-xs space-y-3 transition-colors">
      <div className="px-2 py-1">
        <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F1F5F9]">اختر المستشار للمحادثة</h3>
        <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
          لكل مستشار سياق مستقل مبني على نتائجك وأهدافك
        </p>
      </div>

      <div className="space-y-1.5 overflow-y-auto max-h-[75vh] pr-1">
        {advisors.map((advisor) => {
          const isSelected = advisor.id === currentAdvisorId;
          const sc = scores[advisor.id] || 0;

          return (
            <button
              key={advisor.id}
              onClick={() => onSelectAdvisor(advisor.id)}
              className={`w-full text-right p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
                isSelected
                  ? 'bg-[#F7F6F2] dark:bg-[#112028] border-[#0F6E6E] dark:border-[#0891B2] shadow-xs'
                  : 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-[#0F172A] dark:text-[#F1F5F9]'
              }`}
              style={isSelected ? { borderRightColor: advisor.themeColor, borderRightWidth: '4px' } : {}}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5 dark:border-white/10"
                  style={{ backgroundColor: `${advisor.themeColor}15` }}
                >
                  {advisor.avatarSvg}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F1F5F9]">{advisor.name}</h4>
                  <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">{advisor.title}</p>
                </div>
              </div>

              <div dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-left font-mono font-bold">
                <span className="text-xs" style={{ color: advisor.themeColor }}>
                  {sc.toFixed(1)}
                </span>
                <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8]"> / 10</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
