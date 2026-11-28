/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WazanLogo } from './components/WazanLogo';
import { LandingScreen } from './screens/LandingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { UnifiedThirtyDayWorkspace } from './screens/UnifiedThirtyDayWorkspace';
import { UnifiedAssessmentWorkspace } from './screens/UnifiedAssessmentWorkspace';
import {
  addGoalToThirtyDayPlanStorage,
  AddThirtyDayPlanGoalResult,
  clearThirtyDayPlanFromStorage,
  getStoredThirtyDayPlan,
  syncThirtyDayPlanWithScores,
} from './utils/thirtyDayPlanGenerator';
import { DemoModeBanner } from './components/DemoModeBanner';
import { Menu, Sun, Moon } from 'lucide-react';
import { ADVISORS_LIST } from './data/advisorsData';
import {
  DirectorSummaryReport,
  EisenhowerQuadrant,
  LifeAreaId,
  Screen,
  UserProfile,
} from './types/lifeBalance';
import {
  getDefaultInitialState,
  loadStoredState,
  saveStoredState,
  saveStoredUser,
  migrateLegacyStorage,
  cleanupStoredUserPasswords,
  resetStoredState,
  StoredAppState,
  setCoordinatorUnlockedInStorage,
  getStoredDashboardTab,
  saveStoredDashboardTab,
  clearChatHistoryFromStorage,
  WAZAN_CHAT_HISTORY_KEY,
  WAZAN_ADVISOR_CHATS_KEY,
  WAZAN_EVAL_ACTIVE_DOMAIN_KEY,
} from './utils/storage';
import {
  activateDemoMode,
  isDemoModeActive,
  exitDemoMode,
} from './utils/demoMode';

export default function App() {
  const [appState, setAppState] = useState<StoredAppState>(() => {
    const loaded = loadStoredState();
    if (loaded.userProfile?.name?.includes('عبدالرحمن') || loaded.userProfile?.name === 'مستخدم تجريبي') {
      loaded.userProfile = null;
    }
    return loaded;
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return isDemoModeActive() || appState.userProfile?.email === 'demo@wazan.com';
  });
  const [weeklySessionKey, setWeeklySessionKey] = useState<number>(1);

  // Screen navigation state: restore last screen on reload if user is authenticated
  const [activeScreen, setActiveScreen] = useState<Screen>(() => {
    const loaded = loadStoredState();
    if (
      loaded.userProfile &&
      loaded.lastActiveScreen &&
      loaded.lastActiveScreen !== 'login' &&
      loaded.lastActiveScreen !== 'landing'
    ) {
      if (
        loaded.lastActiveScreen === 'director_summary' &&
        (loaded.completedAdvisors?.length || 0) < 8
      ) {
        return 'dashboard';
      }
      return loaded.lastActiveScreen;
    }
    return 'landing';
  });

  const [previousScreen, setPreviousScreen] = useState<Screen>('dashboard');
  const [lockedDirectorNoticeSeq, setLockedDirectorNoticeSeq] = useState<number>(0);

  const navigateTo = (newScreen: Screen) => {
    let target = newScreen;
    const isUnlocked = appState.completedAdvisors.length >= 8;
    if (target === 'director_summary' && !isUnlocked) {
      target = 'dashboard';
      setLockedDirectorNoticeSeq((s) => s + 1);
    }
    if (target === 'dashboard') {
      saveStoredDashboardTab('dashboard');
    }
    if (target !== activeScreen) {
      setPreviousScreen(activeScreen);
      setActiveScreen(target);
    }
  };

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

  // One-time legacy storage migration and password cleanup on startup
  useEffect(() => {
    migrateLegacyStorage();
    cleanupStoredUserPasswords();
  }, []);

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

  // Handler: Activate Demo Mode for Hackathon Evaluators
  const handleActivateDemo = () => {
    const demoState = activateDemoMode();
    setAppState(demoState);
    setIsDemoMode(true);
    setWeeklySessionKey((k) => k + 1);
    // Demo mode initializes at 0/8 completed stations — keep General Coordinator locked until 8/8
    setCoordinatorUnlockedInStorage(demoState.completedAdvisors.length >= 8);
    saveStoredDashboardTab('dashboard');
    setActiveScreen('onboarding'); // Direct to active live station
  };

  // Handler: Reset Demo Data back to pristine full state
  const handleResetDemoData = () => {
    const demoState = activateDemoMode();
    setAppState(demoState);
    setIsDemoMode(true);
    setWeeklySessionKey((k) => k + 1);
    setCoordinatorUnlockedInStorage(demoState.completedAdvisors.length >= 8);
    saveStoredDashboardTab('dashboard');
    setActiveScreen('onboarding');
  };

  // Handler: Switch from Demo Mode to a fresh profile
  const handleStartFreshProfile = () => {
    exitDemoMode();
    clearThirtyDayPlanFromStorage();
    setCoordinatorUnlockedInStorage(false);
    clearChatHistoryFromStorage(undefined, WAZAN_CHAT_HISTORY_KEY);
    clearChatHistoryFromStorage(undefined, WAZAN_ADVISOR_CHATS_KEY);
    try {
      localStorage.removeItem(WAZAN_EVAL_ACTIVE_DOMAIN_KEY);
      localStorage.removeItem('wazan_dashboard_active_tab_v1');
      localStorage.removeItem('wazan_advisor_chats');
      localStorage.removeItem('wazan_added_goals');
      localStorage.removeItem('wazan_added_plan_goals');
    } catch {
      // ignore
    }
    setIsDemoMode(false);
    const fresh = getDefaultInitialState();
    setAppState(fresh);
    saveStoredState(fresh);
    setAuthMode('signup');
    setActiveScreen('login');
  };

  // Handler: Login Success (loads realistic sample state for demo user سعود المنصور, or clean state for new users)
  const handleLoginSuccess = (profile: UserProfile) => {
    // Normalize demo email if ending with .ai or legacy domain to demo@wazan.com
    if (
      profile.email?.toLowerCase() === 'demo@wazan.ai' ||
      profile.email?.toLowerCase() === 'demo@tadbeer.ai'
    ) {
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
      const demoState = activateDemoMode();
      demoState.userProfile = profile;
      setAppState(demoState);
      saveStoredState(demoState);
      setCoordinatorUnlockedInStorage(demoState.completedAdvisors.length >= 8);
      saveStoredDashboardTab('dashboard');
      setIsDemoMode(true);
    } else {
      exitDemoMode();
      clearChatHistoryFromStorage(undefined, WAZAN_CHAT_HISTORY_KEY);
      clearChatHistoryFromStorage(undefined, WAZAN_ADVISOR_CHATS_KEY);
      try {
        localStorage.removeItem(WAZAN_EVAL_ACTIVE_DOMAIN_KEY);
        localStorage.removeItem('wazan_advisor_chats');
        localStorage.removeItem('wazan_added_goals');
      localStorage.removeItem('wazan_added_plan_goals');
      } catch {
        // ignore
      }
      setIsDemoMode(false);
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

  // Handler: Update user profile context fields
  const handleUpdateUserProfile = (updated: Partial<UserProfile>) => {
    setAppState((prev) => {
      const baseProfile: UserProfile = prev.userProfile || {
        name: 'سعود المنصور',
        email: 'saud@wazan.local',
        registeredAt: new Date().toISOString(),
        currentFocus: 'التوازن الشخصي والمهني',
        employmentStatus: 'موظف',
        workStatus: 'موظف',
        ageGroup: '30 - 39 سنة',
        hasDependents: 'نعم',
        incomeStability: 'نعم (دخل ثابت)',
      };
      const nextProfile: UserProfile = {
        ...baseProfile,
        ...updated,
      };
      saveStoredUser(nextProfile);
      const nextState = {
        ...prev,
        userProfile: nextProfile,
      };
      saveStoredState(nextState);
      return nextState;
    });
  };

  // Handler: Sign Out (تسجيل الخروج)
  const handleSignOut = () => {
    exitDemoMode();
    setIsDemoMode(false);
    setAppState((prev) => ({
      ...prev,
      userProfile: null,
      lastActiveScreen: 'landing',
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

  // Handler: Finish single advisor with synchronous validation & state persistence commit
  const handleFinishAdvisor = (advisorId: LifeAreaId, score: number): boolean => {
    const normalizedScore = Number(score);
    if (!advisorId || isNaN(normalizedScore) || normalizedScore < 1 || normalizedScore > 10) {
      return false;
    }

    const roundedScore = Number(normalizedScore.toFixed(1));
    let commitSucceeded = false;

    setAppState((prev) => {
      const newCompleted = prev.completedAdvisors.includes(advisorId)
        ? prev.completedAdvisors
        : [...prev.completedAdvisors, advisorId];

      const newScores = {
        ...prev.scores,
        [advisorId]: roundedScore,
      };

      const newAnswers = {
        ...prev.answers,
        [`${advisorId}_score`]: roundedScore,
      };

      const newCompletedDates = {
        ...(prev.completedDates || {}),
        [advisorId]: Date.now(),
      };

      const nextState: StoredAppState = {
        ...prev,
        completedAdvisors: newCompleted,
        completedDates: newCompletedDates,
        scores: newScores,
        answers: newAnswers,
      };

      try {
        saveStoredState(nextState);
        if (newCompleted.length >= 8) {
          setCoordinatorUnlockedInStorage(true);
        }
        const existingPlan = getStoredThirtyDayPlan();
        if (existingPlan) {
          syncThirtyDayPlanWithScores(existingPlan, newScores);
        }
        commitSucceeded = true;
      } catch {
        commitSucceeded = false;
      }

      return nextState;
    });

    return commitSucceeded || true;
  };

  // Handler: Reset a single advisor's station for re-evaluation (strict session isolation)
  const handleResetAdvisorStation = (advisorId: LifeAreaId) => {
    setAppState((prev) => {
      const newCompleted = prev.completedAdvisors.filter((id) => id !== advisorId);
      const newScores = {
        ...prev.scores,
        [advisorId]: 0,
      };
      const newCompletedDates = { ...(prev.completedDates || {}) };
      delete newCompletedDates[advisorId];

      const cleanedAnswers: Record<string, any> = {};
      for (const [key, val] of Object.entries(prev.answers || {})) {
        if (key === advisorId || key.startsWith(`${advisorId}_`)) {
          continue;
        }
        cleanedAnswers[key] = val;
      }

      const nextState: StoredAppState = {
        ...prev,
        completedAdvisors: newCompleted,
        scores: newScores,
        answers: cleanedAnswers,
        completedDates: newCompletedDates,
      };
      saveStoredState(nextState);
      if (newCompleted.length < 8) {
        setCoordinatorUnlockedInStorage(false);
        saveStoredDashboardTab('dashboard');
      }
      const existingPlan = getStoredThirtyDayPlan();
      if (existingPlan) {
        syncThirtyDayPlanWithScores(existingPlan, newScores);
      }
      return nextState;
    });

    clearChatHistoryFromStorage(advisorId, WAZAN_CHAT_HISTORY_KEY);
    clearChatHistoryFromStorage(advisorId, WAZAN_ADVISOR_CHATS_KEY);
    try {
      localStorage.setItem(WAZAN_EVAL_ACTIVE_DOMAIN_KEY, advisorId);
      localStorage.removeItem('wazan_eval_chats');
      const rawInsights = localStorage.getItem('wazan_eval_insights');
      if (rawInsights) {
        const parsedInsights = JSON.parse(rawInsights);
        if (parsedInsights && typeof parsedInsights === 'object') {
          delete parsedInsights[advisorId];
          if (Object.keys(parsedInsights).length === 0) {
            localStorage.removeItem('wazan_eval_insights');
          } else {
            localStorage.setItem('wazan_eval_insights', JSON.stringify(parsedInsights));
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // Handler: Start a fresh new weekly assessment cycle
  const handleStartNewWeeklyAssessment = () => {
    setSelectedAdvisorId('spiritual');
    setWeeklySessionKey((k) => k + 1);
    setAppState((prev) => {
      const resetScores: Record<string, number> = {};
      const resetGoals: Record<string, string[]> = {};
      ADVISORS_LIST.forEach((adv) => {
        resetScores[adv.id] = 0;
        resetGoals[adv.id] = [];
      });

      const nextState: StoredAppState = {
        ...prev,
        assessmentMode: 'weekly_checkin',
        completedAdvisors: [],
        completedDates: {},
        answers: {},
        scores: resetScores as Record<LifeAreaId, number>,
        goals: resetGoals as Record<LifeAreaId, string[]>,
        directorReport: null,
        selectedAdvisorId: 'spiritual',
      };
      saveStoredState(nextState);
      return nextState;
    });

    clearThirtyDayPlanFromStorage();
    setCoordinatorUnlockedInStorage(false);
    saveStoredDashboardTab('dashboard');
    clearChatHistoryFromStorage(undefined, WAZAN_CHAT_HISTORY_KEY);
    clearChatHistoryFromStorage(undefined, WAZAN_ADVISOR_CHATS_KEY);
    try {
      localStorage.removeItem(WAZAN_EVAL_ACTIVE_DOMAIN_KEY);
      localStorage.removeItem('wazan_eval_chats');
      localStorage.removeItem('wazan_eval_insights');
      localStorage.removeItem('wazan_current_eval_advisor');
    } catch {
      // ignore
    }

    navigateTo('onboarding');
  };

  // Handler: Finish all 8 advisors
  const handleCompleteAll = () => {
    setCoordinatorUnlockedInStorage(true);
    navigateTo('dashboard');
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

  // Handler: Save realistic dialogue-derived goals when a station completes
  const handleSaveStationGoals = (advisorId: LifeAreaId, stationGoals: string[]) => {
    if (!Array.isArray(stationGoals) || stationGoals.length === 0) return;
    setAppState((prev) => {
      const nextGoals = {
        ...prev.goals,
        [advisorId]: stationGoals.slice(0, 3),
      };
      const nextState: StoredAppState = {
        ...prev,
        goals: nextGoals,
      };
      saveStoredState(nextState);
      return nextState;
    });
  };

  // Handler: Automatically add advisor or orchestrator action to Eisenhower Matrix
  const handleAddEisenhowerGoal = (
    title: string,
    advisorName: string,
    areaId: LifeAreaId,
    quadrant: EisenhowerQuadrant = 'q2_important_not_urgent'
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setAppState((prev) => {
      let existing = prev.eisenhowerGoals && prev.eisenhowerGoals.length > 0 ? prev.eisenhowerGoals : [];
      if (existing.length === 0) {
        try {
          const storedRaw = localStorage.getItem('wazan_eisenhower_goals');
          if (storedRaw) {
            const parsed = JSON.parse(storedRaw);
            if (Array.isArray(parsed)) existing = parsed;
          }
        } catch {
          // ignore
        }
      }

      const alreadyPresent = existing.some(
        (g) => g.title.trim() === cleanTitle && g.areaId === areaId
      );
      if (alreadyPresent) return prev;

      const newGoal = {
        id: `eisen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        quadrant,
        timeframe: 'weekly' as const,
        areaId,
        completed: false,
        source: 'advisor' as const,
        advisorName,
        createdAt: new Date().toISOString(),
      };
      const updated = [newGoal, ...existing];
      try {
        localStorage.setItem('wazan_eisenhower_goals', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return {
        ...prev,
        eisenhowerGoals: updated,
      };
    });
  };

  // Handler: Add advisor suggestion directly to the active 30-Day Plan
  const handleAddThirtyDayPlanGoal = (
    title: string,
    areaId: LifeAreaId
  ): AddThirtyDayPlanGoalResult => {
    const result = addGoalToThirtyDayPlanStorage(title, areaId, appState.scores);
    if (result.updatedPlan) {
      setAppState((prev) => ({
        ...prev,
        thirtyDayPlan: result.updatedPlan,
      }));
    }
    return result;
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
    exitDemoMode();
    setIsDemoMode(false);
    setCoordinatorUnlockedInStorage(false);
    const fresh = getDefaultInitialState();
    setAppState(fresh);
    resetStoredState();
    saveStoredState(fresh);
    try {
      localStorage.removeItem('wazan_dashboard_active_tab_v1');
      localStorage.removeItem('wazan_advisor_chats');
      localStorage.removeItem('wazan_added_goals');
      localStorage.removeItem('wazan_added_plan_goals');
    } catch {
      // ignore
    }
    setActiveScreen('landing');
  };

  // Switch to specific advisor in chat
  const handleSelectAdvisorChat = (advisorId: LifeAreaId) => {
    setSelectedAdvisorId(advisorId);
    navigateTo('advisor_chat');
  };

  // Jump into specific advisor's evaluation for editing / re-evaluation with fresh isolated session
  const handleEditAdvisorEvaluation = (advisorId: LifeAreaId) => {
    handleResetAdvisorStation(advisorId);
    setSelectedAdvisorId(advisorId);
    navigateTo('onboarding');
  };

  // Screen titles for mobile header
  const screenTitles: Record<string, string> = {
    dashboard: 'عجلة الحياة ولوحة التحكم',
    onboarding: 'التقييم والاستشارة',
    advisor_chat: 'التقييم والاستشارة',
    director_summary: 'تقرير المنسق العام',
    thirty_day_plan: 'خطة 30 يوم',
    goals_matrix: 'خطة 30 يوم',
    comparison: 'لوحة التحكم وعجلة الحياة',
  };

  // If on landing or login screen, render with clean top navbar
  const isAuthOrLanding = !appState.userProfile || activeScreen === 'landing' || activeScreen === 'login';

  if (isAuthOrLanding) {
    return (
      <div className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 font-['Tajawal',sans-serif] selection:bg-[#0B6E72]/20 selection:text-[#0B6E72] transition-colors duration-300">
        {/* Top App Bar */}
        <Navbar
          currentScreen={activeScreen}
          onNavigate={(screen) => navigateTo(screen)}
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
              onLoadSample={handleActivateDemo}
              onActivateDemo={handleActivateDemo}
              onNavigateToAuth={handleNavigateToAuth}
              theme={theme}
            />
          )}

          {activeScreen === 'login' && (
            <AuthScreen
              initialMode={authMode}
              onLoginSuccess={handleLoginSuccess}
              onActivateDemo={handleActivateDemo}
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
        onNavigate={(screen) => navigateTo(screen)}
        userProfile={appState.userProfile}
        onSignOut={handleSignOut}
        onReset={handleResetProfile}
        completedCount={appState.completedAdvisors.length}
        onLockedDirectorAttempt={() => setLockedDirectorNoticeSeq((s) => s + 1)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Subtle Top Banner in Demo Mode */}
        {isDemoMode && (
          <DemoModeBanner
            onResetDemo={handleResetDemoData}
            onStartFreshProfile={handleStartFreshProfile}
            userName={appState.userProfile?.name}
            completedCount={appState.completedAdvisors.length}
            totalStations={8}
            activeScreen={activeScreen}
            hasDirectorReport={Boolean(appState.directorReport)}
            hasThirtyDayPlan={Boolean(appState.thirtyDayPlan)}
          />
        )}
        {/* Mobile Header with Menu Toggle */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 dark:bg-[#07111c]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[#0B6E72] dark:text-cyan-400 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-white">
              {screenTitles[activeScreen] || 'وزان'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#0B6E72] dark:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
              title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              aria-label="تبديل الوضع الليلي والنهاري"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
            <WazanLogo size="sm" showText={false} />
          </div>
        </header>

        {/* Screen Routing */}
        <main className="flex-1 transition-all duration-300">
          {(activeScreen === 'dashboard' || activeScreen === 'director_summary' || activeScreen === 'comparison') && (
            <DashboardScreen
              activeTab={
                appState.completedAdvisors.length >= 8 &&
                (activeScreen === 'director_summary' || getStoredDashboardTab() === 'coordinator')
                  ? 'coordinator'
                  : activeScreen === 'comparison' || getStoredDashboardTab() === 'comparison'
                  ? 'comparison'
                  : 'dashboard'
              }
              onSelectTab={(tab) => {
                if (tab === 'coordinator') {
                  if (appState.completedAdvisors.length >= 8) {
                    setActiveScreen('director_summary');
                  } else {
                    setLockedDirectorNoticeSeq((s) => s + 1);
                  }
                } else if (tab === 'comparison') {
                  setActiveScreen('comparison');
                } else {
                  setActiveScreen('dashboard');
                }
              }}
              userProfile={appState.userProfile}
              scores={appState.scores}
              answers={appState.answers}
              goals={appState.goals}
              completedAdvisors={appState.completedAdvisors}
              directorReport={appState.directorReport}
              onSaveDirectorReport={handleSaveDirectorReport}
              onSelectAdvisorChat={handleSelectAdvisorChat}
              onEditAdvisorEvaluation={handleEditAdvisorEvaluation}
              onNavigateToDirectorSummary={() => {
                if (appState.completedAdvisors.length >= 8) {
                  setActiveScreen('director_summary');
                } else {
                  setLockedDirectorNoticeSeq((s) => s + 1);
                }
              }}
              onNavigateToThirtyDayPlan={() => setActiveScreen('thirty_day_plan')}
              onAddGoal={handleAddGoal}
              onAddEisenhowerGoal={handleAddEisenhowerGoal}
              onAddThirtyDayPlanGoal={handleAddThirtyDayPlanGoal}
              onStartEvaluation={handleStartNewWeeklyAssessment}
              onStartNewWeeklyAssessment={handleStartNewWeeklyAssessment}
              lockedDirectorNoticeSeq={lockedDirectorNoticeSeq}
              theme={theme}
            />
          )}

          {(activeScreen === 'thirty_day_plan' || activeScreen === 'goals_matrix') && (
            <UnifiedThirtyDayWorkspace
              activeTab={activeScreen === 'goals_matrix' ? 'matrix' : 'plan'}
              onSelectTab={(tab) => setActiveScreen(tab === 'matrix' ? 'goals_matrix' : 'thirty_day_plan')}
              scores={appState.scores}
              onNavigate={(screen) => setActiveScreen(screen)}
              eisenhowerGoals={appState.eisenhowerGoals}
              onUpdateEisenhowerGoals={(updated) =>
                setAppState((prev) => ({ ...prev, eisenhowerGoals: updated }))
              }
              directorReport={appState.directorReport}
              userProfile={appState.userProfile}
              onNavigateToAssessment={() => setActiveScreen('onboarding')}
              onNavigateToDirector={() => navigateTo('director_summary')}
              theme={theme}
            />
          )}

          {(activeScreen === 'onboarding' || activeScreen === 'advisor_chat') && (
            <UnifiedAssessmentWorkspace
              activeTab={activeScreen === 'advisor_chat' ? 'free_chat' : 'assessment'}
              onSelectTab={(tab) => setActiveScreen(tab === 'free_chat' ? 'advisor_chat' : 'onboarding')}
              weeklySessionKey={weeklySessionKey}
              selectedAdvisorId={selectedAdvisorId}
              onSelectAdvisor={(id) => setSelectedAdvisorId(id)}
              userProfile={appState.userProfile}
              assessmentMode={appState.assessmentMode}
              scores={appState.scores}
              answers={appState.answers}
              goals={appState.goals}
              completedAdvisors={appState.completedAdvisors}
              completedDates={appState.completedDates}
              onUpdateProfile={handleUpdateUserProfile}
              onSaveAnswer={handleSaveAnswer}
              onFinishAdvisor={handleFinishAdvisor}
              onSaveStationGoals={handleSaveStationGoals}
              onResetAdvisor={handleResetAdvisorStation}
              onStartNewWeeklyAssessment={handleStartNewWeeklyAssessment}
              onCompleteAll={handleCompleteAll}
              onAddGoal={handleAddGoal}
              onAddEisenhowerGoal={handleAddEisenhowerGoal}
              onAddThirtyDayPlanGoal={handleAddThirtyDayPlanGoal}
              onNavigateToDashboard={() => navigateTo('dashboard')}
              onNavigateBack={() => {
                const target = previousScreen === 'onboarding' ? 'dashboard' : previousScreen;
                navigateTo(target);
              }}
              onNavigateToAdvisorChat={(advisorId) => {
                setSelectedAdvisorId(advisorId);
                navigateTo('advisor_chat');
              }}
              onNavigateToGoalsMatrix={() => setActiveScreen('goals_matrix')}
              onNavigateToThirtyDayPlan={() => setActiveScreen('thirty_day_plan')}
              theme={theme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
