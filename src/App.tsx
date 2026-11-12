/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TadbeerLogo } from './components/TadbeerLogo';
import { LandingScreen } from './screens/LandingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AdvisorChatScreen } from './screens/AdvisorChatScreen';
import { DirectorSummaryScreen } from './screens/DirectorSummaryScreen';
import { Menu } from 'lucide-react';
import {
  DirectorSummaryReport,
  LifeAreaId,
  UserProfile,
} from './types/lifeBalance';
import {
  getDefaultInitialState,
  loadSampleState,
  loadStoredState,
  saveStoredState,
  saveStoredUser,
  StoredAppState,
} from './utils/storage';

export default function App() {
  const [appState, setAppState] = useState<StoredAppState>(() => {
    const loaded = loadStoredState();
    if (loaded.userProfile?.name?.includes('عبدالرحمن') || loaded.userProfile?.name === 'مستخدم تجريبي') {
      loaded.userProfile = null;
    }
    return {
      ...loaded,
      userProfile: null, // Start clean on landing screen
    };
  });

  // Screen navigation state
  const [activeScreen, setActiveScreen] = useState<
    'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary'
  >('landing');

  // Track whether user clicked 'login' or 'signup' from top buttons
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [selectedAdvisorId, setSelectedAdvisorId] = useState<LifeAreaId>(
    () => appState.selectedAdvisorId || 'spiritual'
  );

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-save state
  useEffect(() => {
    saveStoredState({
      ...appState,
      lastActiveScreen: activeScreen,
      selectedAdvisorId,
    });
  }, [appState, activeScreen, selectedAdvisorId]);

  // Navigate to dedicated login or signup page
  const handleNavigateToAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setActiveScreen('login');
  };

  // Handler: Start Onboarding with fresh profile
  const handleStartOnboarding = (profile: UserProfile) => {
    saveStoredUser(profile);
    const fresh = getDefaultInitialState();
    setAppState({
      ...fresh,
      userProfile: profile,
    });
    setActiveScreen('onboarding');
  };

  // Handler: Load Sample Profile
  const handleLoadSample = () => {
    const sample = loadSampleState();
    setAppState(sample);
    setActiveScreen('dashboard');
  };

  // Handler: Login Success (Ensures clean state for new user: 0/8 completed, no pre-filled answers)
  const handleLoginSuccess = (profile: UserProfile) => {
    saveStoredUser(profile);
    const fresh = getDefaultInitialState();
    setAppState({
      ...fresh,
      userProfile: profile,
    });
    setActiveScreen('dashboard');
  };

  // Handler: Sign Out (تسجيل الخروج)
  const handleSignOut = () => {
    setAppState((prev) => ({
      ...prev,
      userProfile: null,
    }));
    setActiveScreen('landing');
  };

  // Handler: Save question answer
  const handleSaveAnswer = (advisorId: LifeAreaId, questionId: string, value: any) => {
    setAppState((prev) => {
      const newAnswers = {
        ...prev.answers,
        [`${advisorId}_${questionId}`]: value,
      };
      return {
        ...prev,
        answers: newAnswers,
      };
    });
  };

  // Handler: Finish single advisor
  const handleFinishAdvisor = (advisorId: LifeAreaId, score: number) => {
    setAppState((prev) => {
      const newCompleted = prev.completedAdvisors.includes(advisorId)
        ? prev.completedAdvisors
        : [...prev.completedAdvisors, advisorId];

      const newScores = {
        ...prev.scores,
        [advisorId]: score,
      };

      return {
        ...prev,
        completedAdvisors: newCompleted,
        scores: newScores,
      };
    });
  };

  // Handler: Finish all 8 advisors
  const handleCompleteAll = () => {
    setActiveScreen('dashboard');
  };

  // Handler: Add custom goal to area
  const handleAddGoal = (advisorId: LifeAreaId, goal: string) => {
    setAppState((prev) => {
      const currentList = prev.goals[advisorId] || [];
      if (currentList.includes(goal)) return prev;
      return {
        ...prev,
        goals: {
          ...prev.goals,
          [advisorId]: [goal, ...currentList],
        },
      };
    });
  };

  // Handler: Save AI Director Report
  const handleSaveDirectorReport = (report: DirectorSummaryReport) => {
    setAppState((prev) => ({
      ...prev,
      directorReport: report,
    }));
  };

  // Handler: Reset Profile
  const handleResetProfile = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين التقييم والبدء من جديد؟')) {
      const fresh = getDefaultInitialState();
      setAppState(fresh);
      saveStoredState(fresh);
      setActiveScreen('landing');
    }
  };

  // Switch to specific advisor in chat
  const handleSelectAdvisorChat = (advisorId: LifeAreaId) => {
    setSelectedAdvisorId(advisorId);
    setActiveScreen('advisor_chat');
  };

  // Jump into specific advisor's questionnaire
  const handleEditAdvisorEvaluation = (advisorId: LifeAreaId) => {
    setSelectedAdvisorId(advisorId);
    setActiveScreen('onboarding');
  };

  // Screen titles for mobile header
  const screenTitles: Record<string, string> = {
    dashboard: 'عجلة الحياة ولوحة التحكم',
    onboarding: 'تقييم أبعاد الحياة',
    advisor_chat: 'استشارة المستشارين',
    director_summary: 'تقرير المنسق العام',
  };

  // If on landing or login screen, render with clean top navbar
  const isAuthOrLanding = !appState.userProfile || activeScreen === 'landing' || activeScreen === 'login';

  if (isAuthOrLanding) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#1D2E2B] font-['Tajawal',sans-serif] selection:bg-[#1b605b]/20 selection:text-[#1b605b]">
        {/* Top App Bar */}
        <Navbar
          currentScreen={activeScreen}
          onNavigate={(screen) => setActiveScreen(screen)}
          onNavigateToAuth={handleNavigateToAuth}
          userProfile={appState.userProfile}
          onSignOut={handleSignOut}
          onReset={handleResetProfile}
          completedCount={appState.completedAdvisors.length}
        />

        {/* Screen Content */}
        <main className="transition-all duration-300">
          {activeScreen === 'landing' && (
            <LandingScreen
              onLoadSample={handleLoadSample}
              onNavigateToAuth={handleNavigateToAuth}
            />
          )}

          {activeScreen === 'login' && (
            <AuthScreen
              initialMode={authMode}
              onLoginSuccess={handleLoginSuccess}
              onQuickDemoLogin={handleLoadSample}
              onCancel={() => setActiveScreen('landing')}
            />
          )}
        </main>
      </div>
    );
  }

  // Inside Authenticated App: Sidebar on the side ("على جنب")
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D2E2B] font-['Tajawal',sans-serif] selection:bg-[#1b605b]/20 selection:text-[#1b605b] flex flex-row">
      {/* Sidebar on the right in RTL */}
      <Sidebar
        currentScreen={activeScreen as 'dashboard' | 'onboarding' | 'advisor_chat' | 'director_summary'}
        onNavigate={(screen) => setActiveScreen(screen)}
        userProfile={appState.userProfile}
        onSignOut={handleSignOut}
        onReset={handleResetProfile}
        completedCount={appState.completedAdvisors.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header with Menu Toggle */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#eae3d5] px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#FAF7F2] text-[#1b605b] border border-[#ded7c8] hover:bg-white transition-colors"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-black text-[#1d2e2b]">
              {screenTitles[activeScreen] || 'تدبير'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TadbeerLogo size="sm" showText={false} />
          </div>
        </header>

        {/* Screen Routing */}
        <main className="flex-1 transition-all duration-300">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              userProfile={appState.userProfile}
              scores={appState.scores}
              answers={appState.answers}
              goals={appState.goals}
              completedAdvisors={appState.completedAdvisors}
              onSelectAdvisorChat={handleSelectAdvisorChat}
              onEditAdvisorEvaluation={handleEditAdvisorEvaluation}
              onNavigateToDirectorSummary={() => setActiveScreen('director_summary')}
              onAddGoal={handleAddGoal}
              onStartEvaluation={() => setActiveScreen('onboarding')}
            />
          )}

          {activeScreen === 'onboarding' && (
            <OnboardingScreen
              initialAdvisorId={selectedAdvisorId}
              answers={appState.answers}
              onSaveAnswer={handleSaveAnswer}
              onFinishAdvisor={handleFinishAdvisor}
              onCompleteAll={handleCompleteAll}
              completedAdvisors={appState.completedAdvisors}
              onNavigateToDashboard={() => setActiveScreen('dashboard')}
            />
          )}

          {activeScreen === 'advisor_chat' && (
            <AdvisorChatScreen
              currentAdvisorId={selectedAdvisorId}
              onSelectAdvisor={(id) => setSelectedAdvisorId(id)}
              userProfile={appState.userProfile}
              scores={appState.scores}
              answers={appState.answers}
              goals={appState.goals}
              onAddGoal={handleAddGoal}
              onBackToDashboard={() => setActiveScreen('dashboard')}
            />
          )}

          {activeScreen === 'director_summary' && (
            <DirectorSummaryScreen
              userProfile={appState.userProfile}
              scores={appState.scores}
              answers={appState.answers}
              goals={appState.goals}
              report={appState.directorReport}
              onSaveReport={handleSaveDirectorReport}
              onBackToDashboard={() => setActiveScreen('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
