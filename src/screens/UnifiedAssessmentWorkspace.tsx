import React from 'react';
import { ClipboardList, MessageSquare } from 'lucide-react';
import { LifeAreaId, UserProfile } from '../types/lifeBalance';
import { OnboardingScreen } from './OnboardingScreen';
import { AdvisorChatScreen } from './AdvisorChatScreen';

export type UnifiedAssessmentTab = 'assessment' | 'free_chat';

interface UnifiedAssessmentWorkspaceProps {
  activeTab: UnifiedAssessmentTab;
  onSelectTab: (tab: UnifiedAssessmentTab) => void;
  weeklySessionKey: number;
  selectedAdvisorId: LifeAreaId;
  onSelectAdvisor: (advisorId: LifeAreaId) => void;
  userProfile: UserProfile | null;
  assessmentMode?: 'initial_assessment' | 'weekly_checkin';
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => boolean | void;
  onSaveStationGoals: (advisorId: LifeAreaId, stationGoals: string[]) => void;
  onResetAdvisor: (advisorId: LifeAreaId) => void;
  onStartNewWeeklyAssessment: () => void;
  onCompleteAll: () => void;
  onAddGoal: (advisorId: LifeAreaId, goal: string) => void;
  onAddEisenhowerGoal: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  onAddThirtyDayPlanGoal?: (
    title: string,
    areaId: LifeAreaId
  ) => { added: boolean; dayNumber?: number; alreadyExists?: boolean; planFull?: boolean } | void;
  onNavigateToDashboard: () => void;
  onNavigateBack: () => void;
  onNavigateToAdvisorChat: (advisorId: LifeAreaId) => void;
  onNavigateToGoalsMatrix: () => void;
  onNavigateToThirtyDayPlan?: () => void;
  theme?: 'light' | 'dark';
}

export const UnifiedAssessmentWorkspace: React.FC<UnifiedAssessmentWorkspaceProps> = ({
  activeTab,
  onSelectTab,
  weeklySessionKey,
  selectedAdvisorId,
  onSelectAdvisor,
  userProfile,
  assessmentMode,
  scores,
  answers,
  goals,
  completedAdvisors,
  completedDates,
  onUpdateProfile,
  onSaveAnswer,
  onFinishAdvisor,
  onSaveStationGoals,
  onResetAdvisor,
  onStartNewWeeklyAssessment,
  onCompleteAll,
  onAddGoal,
  onAddEisenhowerGoal,
  onAddThirtyDayPlanGoal,
  onNavigateToDashboard,
  onNavigateBack,
  onNavigateToAdvisorChat,
  onNavigateToGoalsMatrix,
  onNavigateToThirtyDayPlan,
  theme = 'light',
}) => {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F7F6F2] dark:bg-[#071318] transition-colors duration-300"
    >
      {/* Minimal RTL Segmented Sub-Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-0 print:hidden">
        <div
          role="tablist"
          aria-label="أقسام التقييم والاستشارة"
          className="flex w-full sm:w-auto sm:inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors"
        >
          <button
            type="button"
            role="tab"
            id="unified-assessment-tab-eval"
            aria-selected={activeTab === 'assessment'}
            onClick={() => onSelectTab('assessment')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              activeTab === 'assessment'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <ClipboardList className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">التقييم التأسيسي</span>
          </button>

          <button
            type="button"
            role="tab"
            id="unified-assessment-tab-chat"
            aria-selected={activeTab === 'free_chat'}
            onClick={() => onSelectTab('free_chat')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              activeTab === 'free_chat'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">استشارة حرة</span>
          </button>
        </div>
      </div>

      {/* Active Sub-View Content */}
      <div
        role="tabpanel"
        aria-labelledby={
          activeTab === 'assessment'
            ? 'unified-assessment-tab-eval'
            : 'unified-assessment-tab-chat'
        }
      >
        {activeTab === 'assessment' ? (
          <OnboardingScreen
            key={`onboarding_${weeklySessionKey}`}
            initialAdvisorId={selectedAdvisorId}
            assessmentMode={assessmentMode}
            assessmentSessionId={weeklySessionKey}
            answers={answers}
            userProfile={userProfile}
            onUpdateProfile={onUpdateProfile}
            onSaveAnswer={onSaveAnswer}
            onFinishAdvisor={onFinishAdvisor}
            onSaveStationGoals={onSaveStationGoals}
            onResetAdvisor={onResetAdvisor}
            onStartNewWeeklyAssessment={onStartNewWeeklyAssessment}
            onCompleteAll={onCompleteAll}
            onAddEisenhowerGoal={onAddEisenhowerGoal}
            completedAdvisors={completedAdvisors}
            completedDates={completedDates}
            onNavigateToDashboard={onNavigateToDashboard}
            onNavigateBack={onNavigateBack}
            onNavigateToAdvisorChat={onNavigateToAdvisorChat}
            theme={theme}
          />
        ) : (
          <AdvisorChatScreen
            key={`chat_${userProfile?.email || 'guest'}_${weeklySessionKey}`}
            currentAdvisorId={selectedAdvisorId}
            onSelectAdvisor={onSelectAdvisor}
            userProfile={userProfile}
            scores={scores}
            goals={goals}
            onAddGoal={onAddGoal}
            onAddEisenhowerGoal={onAddEisenhowerGoal}
            onAddThirtyDayPlanGoal={onAddThirtyDayPlanGoal}
            onNavigateToGoalsMatrix={onNavigateToGoalsMatrix}
            onNavigateToThirtyDayPlan={onNavigateToThirtyDayPlan}
            onBackToDashboard={onNavigateToDashboard}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};
