/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TadbeerLogo } from './components/TadbeerLogo';
import { LandingScreen } from './screens/LandingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AdvisorChatScreen } from './screens/AdvisorChatScreen';
import { DirectorSummaryScreen } from './screens/DirectorSummaryScreen';
import { ComparisonScreen } from './screens/ComparisonScreen';
import { EisenhowerMatrixScreen } from './screens/EisenhowerMatrixScreen';
import { Menu, Sun, Moon } from 'lucide-react';
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
    'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix'
  >('landing');

  // Track whether user clicked 'login' or 'signup' from top buttons
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [selectedAdvisorId, setSelectedAdvisorId] = useState<LifeAreaId>(
    () => appState.selectedAdvisorId || 'spiritual'
  );

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Theme state: 'light' | 'dark', persisted to localStorage & synced to <html>
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('wazan_theme');
      if (stored === 'dark' || stored === 'light') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('wazan_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

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

  // Handler: Load Sample Profile
  const handleLoadSample = () => {
    const sample = loadSampleState();
    setAppState(sample);
    setActiveScreen('dashboard');
  };

  // Handler: Login Success (loads realistic sample state for demo user سعود المنصور, or clean state for new users)
  const handleLoginSuccess = (profile: UserProfile) => {
    // Normalize demo email if ending with .ai to .com
    if (profile.email?.toLowerCase() === 'demo@wazan.ai') {
      profile.email = 'demo@wazan.com';
    }
    saveStoredUser(profile);
    const isDemo =
      profile.email?.toLowerCase() === 'demo@wazan.com' ||
      profile.email?.toLowerCase() === 'demo@wazan.ai' ||
      profile.email?.toLowerCase() === 'demo@tadbeer.ai' ||
      profile.name?.toLowerCase() === 'demo' ||
      profile.name?.toLowerCase() === 'wazan' ||
      profile.name?.includes('سعود') ||
      profile.name?.includes('ضيف');

    if (isDemo) {
      const sample = loadSampleState();
      sample.userProfile = profile;
      setAppState(sample);
      saveStoredState(sample);
    } else {
      const fresh = getDefaultInitialState();
      setAppState({
        ...fresh,
        userProfile: profile,
      });
      saveStoredState({
        ...fresh,
        userProfile: profile,
      });
    }
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

      const newCompletedDates = {
        ...(prev.completedDates || {}),
        [advisorId]: Date.now(),
      };

      return {
        ...prev,
        completedAdvisors: newCompleted,
        completedDates: newCompletedDates,
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

  // Handler: Automatically add advisor action to Eisenhower Matrix (Quadrant 2)
  const handleAddEisenhowerGoal = (title: string, advisorName: string, areaId: LifeAreaId) => {
    setAppState((prev) => {
      const existing = prev.eisenhowerGoals && prev.eisenhowerGoals.length > 0 ? prev.eisenhowerGoals : [];
      const newGoal = {
        id: `eisen_${Date.now()}`,
        title,
        quadrant: 'q2_important_not_urgent' as const,
        timeframe: 'weekly' as const,
        areaId,
        completed: false,
        source: 'advisor' as const,
        advisorName,
      };
      return {
        ...prev,
        eisenhowerGoals: [newGoal, ...existing],
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
    const fresh = getDefaultInitialState();
    setAppState(fresh);
    saveStoredState(fresh);
    setActiveScreen('landing');
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
    goals_matrix: 'أهدافي (مصفوفة أيزنهاور)',
    comparison: 'المقارنة والتحليلات',
  };

  // If on landing or login screen, render with clean top navbar
  const isAuthOrLanding = !appState.userProfile || activeScreen === 'landing' || activeScreen === 'login';

  if (isAuthOrLanding) {
    return (
      <div className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 font-['Tajawal',sans-serif] selection:bg-[#0B6E72]/20 selection:text-[#0B6E72] transition-colors duration-300">
        {/* Top App Bar */}
        <Navbar
          currentScreen={activeScreen}
          onNavigate={(screen) => setActiveScreen(screen)}
          onNavigateToAuth={handleNavigateToAuth}
          userProfile={appState.userProfile}
          onSignOut={handleSignOut}
          onReset={handleResetProfile}
          completedCount={appState.completedAdvisors.length}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Screen Content */}
        <main className="transition-all duration-300">
          {activeScreen === 'landing' && (
            <LandingScreen
              onLoadSample={handleLoadSample}
              onNavigateToAuth={handleNavigateToAuth}
              theme={theme}
            />
          )}

          {activeScreen === 'login' && (
            <AuthScreen
              initialMode={authMode}
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => setActiveScreen('landing')}
              theme={theme}
            />
          )}
        </main>
      </div>
    );
  }

  // Inside Authenticated App: Sidebar on the side ("على جنب")
  return (
    <div className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 font-['Tajawal',sans-serif] selection:bg-[#0B6E72]/20 selection:text-[#0B6E72] flex flex-row transition-colors duration-300">
      {/* Sidebar on the right in RTL */}
      <Sidebar
        currentScreen={activeScreen as 'dashboard' | 'onboarding' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix'}
        onNavigate={(screen) => setActiveScreen(screen)}
        userProfile={appState.userProfile}
        onSignOut={handleSignOut}
        onReset={handleResetProfile}
        completedCount={appState.completedAdvisors.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header with Menu Toggle */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-[#eae3d5] dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-slate-800 text-[#1b605b] dark:text-cyan-400 border border-[#ded7c8] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-black text-[#1d2e2b] dark:text-white">
              {screenTitles[activeScreen] || 'وازن'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[#eae3d5] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#1b605b] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
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
              theme={theme}
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
              completedDates={appState.completedDates}
              onNavigateToDashboard={() => setActiveScreen('dashboard')}
              onNavigateToAdvisorChat={(advisorId) => {
                setSelectedAdvisorId(advisorId);
                setActiveScreen('advisor_chat');
              }}
              theme={theme}
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
              onAddEisenhowerGoal={handleAddEisenhowerGoal}
              onBackToDashboard={() => setActiveScreen('dashboard')}
              theme={theme}
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
              theme={theme}
            />
          )}

          {activeScreen === 'comparison' && (
            <ComparisonScreen
              userProfile={appState.userProfile}
              onNavigateToDashboard={() => setActiveScreen('dashboard')}
              theme={theme}
            />
          )}

          {activeScreen === 'goals_matrix' && (
            <EisenhowerMatrixScreen
              goals={appState.eisenhowerGoals}
              onUpdateGoals={(updated) =>
                setAppState((prev) => ({ ...prev, eisenhowerGoals: updated }))
              }
              theme={theme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
