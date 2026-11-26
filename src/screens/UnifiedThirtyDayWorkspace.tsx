import React from 'react';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import {
  DirectorSummaryReport,
  EisenhowerGoalItem,
  LifeAreaId,
  Screen,
  UserProfile,
} from '../types/lifeBalance';
import { ThirtyDayPlanScreen } from './ThirtyDayPlanScreen';
import { EisenhowerMatrixScreen } from './EisenhowerMatrixScreen';

export type UnifiedPlanTab = 'plan' | 'matrix';

interface UnifiedThirtyDayWorkspaceProps {
  activeTab: UnifiedPlanTab;
  onSelectTab: (tab: UnifiedPlanTab) => void;
  scores: Record<LifeAreaId, number>;
  onNavigate: (screen: Screen) => void;
  eisenhowerGoals?: EisenhowerGoalItem[];
  onUpdateEisenhowerGoals: (goals: EisenhowerGoalItem[]) => void;
  directorReport?: DirectorSummaryReport | null;
  userProfile: UserProfile | null;
  onNavigateToAssessment: () => void;
  onNavigateToDirector: () => void;
  theme?: 'light' | 'dark';
}

export const UnifiedThirtyDayWorkspace: React.FC<UnifiedThirtyDayWorkspaceProps> = ({
  activeTab,
  onSelectTab,
  scores,
  onNavigate,
  eisenhowerGoals,
  onUpdateEisenhowerGoals,
  directorReport,
  userProfile,
  onNavigateToAssessment,
  onNavigateToDirector,
  theme = 'light',
}) => {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] transition-colors duration-300"
    >
      {/* Prominent RTL Segmented Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-1 print:hidden">
        <div
          role="tablist"
          aria-label="أقسام خطة 30 يوم"
          className="flex w-full sm:w-auto sm:inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors"
        >
          <button
            type="button"
            role="tab"
            id="unified-tab-plan"
            aria-selected={activeTab === 'plan'}
            onClick={() => onSelectTab('plan')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              activeTab === 'plan'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <CalendarDays className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">خطة 30 يوم</span>
          </button>

          <button
            type="button"
            role="tab"
            id="unified-tab-matrix"
            aria-selected={activeTab === 'matrix'}
            onClick={() => onSelectTab('matrix')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              activeTab === 'matrix'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">مصفوفة أيزنهاور (للترتيب)</span>
          </button>
        </div>
      </div>

      {/* Active Tab Content (Preserves existing views and internal state untouched) */}
      <div
        role="tabpanel"
        aria-labelledby={activeTab === 'plan' ? 'unified-tab-plan' : 'unified-tab-matrix'}
      >
        {activeTab === 'plan' ? (
          <ThirtyDayPlanScreen
            scores={scores}
            onNavigate={onNavigate}
            theme={theme}
          />
        ) : (
          <EisenhowerMatrixScreen
            goals={eisenhowerGoals}
            onUpdateGoals={onUpdateEisenhowerGoals}
            directorReport={directorReport}
            scores={scores}
            userProfile={userProfile}
            onNavigateToAssessment={onNavigateToAssessment}
            onNavigateToDirector={onNavigateToDirector}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};
