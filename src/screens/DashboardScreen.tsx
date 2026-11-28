import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  MessageSquare,
  ClipboardEdit,
  ArrowLeft,
  Plus,
  Compass,
  CheckCircle,
  Play,
  HelpCircle,
  Check,
  Zap,
  AlertOctagon,
  Layers,
  RotateCcw,
  Lock,
  LayoutDashboard,
  GitCompare,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { RadarChart } from '../components/RadarChart';
import {
  localizeDomainText,
  prefixLamArabic,
  reconcileDirectorReportWithScores,
} from '../utils/arabicDomainLabels';
import { YearlyAndWeeklyAnalytics } from '../components/YearlyAndWeeklyAnalytics';
import { DirectorSummaryReport, LifeAreaId, UserProfile } from '../types/lifeBalance';
import {
  extractInsightsFromAnswers,
  getStoredDashboardTab,
  saveStoredDashboardTab,
  setCoordinatorUnlockedInStorage,
} from '../utils/storage';
import {
  extractUserDialogueTextsForArea,
  generateRealisticAreaGoals,
} from '../utils/realisticGoalsGenerator';
import { isolateNumbersInText } from '../components/FormattedChatMessage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DirectorSummaryScreen } from './DirectorSummaryScreen';
import { ComparisonScreen } from './ComparisonScreen';

export type DashboardTab = 'dashboard' | 'comparison' | 'coordinator';

interface DashboardScreenProps {
  initialTab?: DashboardTab;
  activeTab?: DashboardTab;
  onSelectTab?: (tab: DashboardTab) => void;
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  completedAdvisors?: LifeAreaId[];
  directorReport?: DirectorSummaryReport | null;
  onSaveDirectorReport?: (report: DirectorSummaryReport) => void;
  onSelectAdvisorChat: (advisorId: LifeAreaId) => void;
  onEditAdvisorEvaluation: (advisorId: LifeAreaId) => void;
  onNavigateToDirectorSummary?: () => void;
  onNavigateToThirtyDayPlan?: () => void;
  onAddGoal: (advisorId: LifeAreaId, goal: string) => void;
  onAddEisenhowerGoal?: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  onStartEvaluation?: () => void;
  onStartNewWeeklyAssessment?: () => void;
  lockedDirectorNoticeSeq?: number;
  theme?: 'light' | 'dark';
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  initialTab = 'dashboard',
  activeTab,
  onSelectTab,
  userProfile,
  scores,
  answers,
  goals,
  completedAdvisors = [],
  directorReport,
  onSaveDirectorReport,
  onSelectAdvisorChat,
  onEditAdvisorEvaluation,
  onNavigateToDirectorSummary,
  onNavigateToThirtyDayPlan,
  onAddGoal,
  onAddEisenhowerGoal,
  onStartEvaluation,
  onStartNewWeeklyAssessment,
  lockedDirectorNoticeSeq = 0,
  theme = 'light',
}) => {
  const completedCount = completedAdvisors.length;
  const isAssessmentComplete = completedCount >= 8;
  const isBrandNewUser = completedCount === 0;

  // Keep storage synchronized strictly with actual 8/8 completion state
  React.useEffect(() => {
    setCoordinatorUnlockedInStorage(isAssessmentComplete);
    if (!isAssessmentComplete && getStoredDashboardTab() === 'coordinator') {
      saveStoredDashboardTab('dashboard');
    }
  }, [isAssessmentComplete]);

  const [internalTab, setInternalTab] = useState<DashboardTab>(() => {
    const saved = getStoredDashboardTab();
    if (saved === 'coordinator' && completedAdvisors.length >= 8) return 'coordinator';
    if (saved === 'comparison') return 'comparison';
    if (initialTab === 'comparison') return 'comparison';
    if (initialTab === 'coordinator' && completedAdvisors.length >= 8) return 'coordinator';
    return 'dashboard';
  });
  const rawTab = activeTab !== undefined ? activeTab : internalTab;
  const currentTab: DashboardTab =
    rawTab === 'coordinator'
      ? isAssessmentComplete
        ? 'coordinator'
        : 'dashboard'
      : rawTab === 'comparison'
      ? 'comparison'
      : 'dashboard';

  const [selectedAreaId, setSelectedAreaId] = useState<LifeAreaId | null>('spiritual');
  const [newGoalInput, setNewGoalInput] = useState<{ [key: string]: string }>({});
  const [showAddGoalFor, setShowAddGoalFor] = useState<LifeAreaId | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addedHaniGoals, setAddedHaniGoals] = useState<Record<string, boolean>>({});
  const [completedHaniGoals, setCompletedHaniGoals] = useState<Record<string, boolean>>({});
  const [showWeeklyResetConfirm, setShowWeeklyResetConfirm] = useState(false);
  const toastTimeoutRef = useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showLockedCoordinatorToast = () => {
    const remaining = Math.max(0, 8 - completedCount);
    const remainingText =
      remaining === 1 ? 'محطة واحدة متبقية' : remaining === 2 ? 'محطتان متبقيتان' : `${remaining} محطات متبقية`;
    setToastMessage(
      `🔒 رؤية المنسق العام مُغلقة حالياً: يُفتح بعد إكمال التقييم (${completedCount} / 8 — ${remainingText}).`
    );
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4500);
  };

  // Surface locked hint toast when user clicks locked Coordinator link from Sidebar or another screen
  const prevLockSeqRef = useRef(lockedDirectorNoticeSeq);
  React.useEffect(() => {
    if (lockedDirectorNoticeSeq > prevLockSeqRef.current) {
      prevLockSeqRef.current = lockedDirectorNoticeSeq;
      if (!isAssessmentComplete) {
        showLockedCoordinatorToast();
      }
    }
  }, [lockedDirectorNoticeSeq, isAssessmentComplete]);

  const handleTabChange = (tab: DashboardTab) => {
    if (tab === 'coordinator' && !isAssessmentComplete) {
      showLockedCoordinatorToast();
      return;
    }

    saveStoredDashboardTab(tab);
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const handleNavigateToCoordinatorView = () => {
    if (!isAssessmentComplete) {
      showLockedCoordinatorToast();
      return;
    }

    saveStoredDashboardTab('coordinator');
    handleTabChange('coordinator');
    if (onNavigateToDirectorSummary) {
      onNavigateToDirectorSummary();
    }
  };

  // Compute Overall Balance Score for evaluated areas only
  const evaluatedScores = completedAdvisors.map((id) => scores[id] || 0);
  const totalScoreSum = evaluatedScores.reduce((sum, sc) => sum + sc, 0);
  const averageBalanceScore = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '0.0';
  const balancePercentage = Math.round((completedCount / 8) * 100);

  // Diagnosis label
  const getDiagnosisLabel = () => {
    if (isBrandNewUser) return 'مستخدم جديد - بانتظار بدء التقييم 🌱';
    const avg = parseFloat(averageBalanceScore);
    if (avg >= 8.0) return 'توازن استثنائي متقدم 🌟';
    if (avg >= 6.5) return 'توازن واعد ومستقر 🚀';
    if (avg >= 5.0) return 'توازن في مرحلة التأسيس 💡';
    return 'يحتاج إلى تدخل وإعادة تنظيم ⚠️';
  };

  const handleAddGoalSubmit = (areaId: LifeAreaId) => {
    const text = (newGoalInput[areaId] || '').trim();
    if (!text) return;
    onAddGoal(areaId, text);
    setNewGoalInput((prev) => ({ ...prev, [areaId]: '' }));
    setShowAddGoalFor(null);
  };

  // Sort areas by score to identify bottleneck and strongest
  const sortedCompletedAreas = [...ADVISORS_LIST]
    .filter((a) => completedAdvisors.includes(a.id))
    .sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0));

  const bottleneckAdvisor = sortedCompletedAreas[0] || ADVISORS_LIST.find((a) => a.id === 'health') || ADVISORS_LIST[0];
  const bottleneckScore = scores[bottleneckAdvisor.id] || 0;
  const strongestAdvisor = sortedCompletedAreas[sortedCompletedAreas.length - 1] || ADVISORS_LIST.find((a) => a.id === 'spiritual') || ADVISORS_LIST[0];

  // Dr. Hani's immediate 24-hour executive recommendation
  const isStudent =
    userProfile?.workStatus?.includes('طالب') ||
    userProfile?.employmentStatus?.includes('طالب');

  const getDrHaniImmediateAction = () => {
    if (isBrandNewUser) {
      return {
        title: 'الانطلاق نحو المحطة الاستكشافية الأولى',
        text: 'مرحباً بك في منصة وزان! خطوتك الأولى الحكيمة خلال الـ 24 ساعة القادمة هي بدء المحطة الاستكشافية الأولى لتقييم أبعاد حياتك، لتكوين رادار توازنك الخاص بدقة وهدوء دون أي ضغط.',
        areaId: 'spiritual' as LifeAreaId,
        areaTitle: 'الجانب الروحي والسكينة',
        actionLabel: 'بدء التقييم التأسيسي الآن (0 / 8)',
      };
    }

    switch (bottleneckAdvisor.id) {
      case 'health':
        return {
          title: `حماية طاقة الجسد وضبط النوم (${bottleneckAdvisor.title})`,
          text: 'يوصي د. هاني بالبدء فوراً بضبط مثلث الطاقة: حدد موعداً ثابتاً لإغلاق الشاشات الليلة قبل النوم بساعة وشرب لترين من الماء لرفع مناعتك واستعادة نشاطك.',
          areaId: 'health' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'financial':
        if (isStudent) {
          return {
            title: `تأسيس حصالة أمان جامعي (${bottleneckAdvisor.title})`,
            text: 'يوصي د. هاني باقتطاع رمزي (30 - 50 ريالاً) فوراً كصمام أمان جامعي لحماية مكافأتك ومصروفك حتى نهاية الشهر دون التورط في أي ديون أو التزامات مرهقة.',
            areaId: 'financial' as LifeAreaId,
            areaTitle: bottleneckAdvisor.title,
            actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
          };
        }
        return {
          title: `وقف النزيف الاستهلاكي (${bottleneckAdvisor.title})`,
          text: 'يوصي د. هاني بتجميد أي شراء استهلاكي غير ضروري وتخصيص 15 دقيقة الليلة لتدوين الالتزامات المالية وترتيبها كأولوية في المربع الثاني.',
          areaId: 'financial' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'spiritual':
        return {
          title: `حماية خلوة السكينة الصباحية (${bottleneckAdvisor.title})`,
          text: 'يوجه د. هاني بحماية 10 دقائق صمت ودعاء وورد قرآني في الصباح لضبط بوصلة اليوم وبناء حصانة ضد التوتر وزحام المهام.',
          areaId: 'spiritual' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'personal':
        return {
          title: `تحقيق انتصار يومي صغير (${bottleneckAdvisor.title})`,
          text: 'يوجه د. هاني بإيقاف جلد الذات والمقارنات فوراً، وإنجاز مهمة واحدة مؤجلة لا تتجاوز 15 دقيقة اليوم لاستعادة الشعور بالثقة والإنجاز.',
          areaId: 'personal' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'career':
        return {
          title: `حجز ساعة العمل العميق (${bottleneckAdvisor.title})`,
          text: 'يوجه د. هاني بحجز ساعة عمل عميق واحدة اليوم لحماية أولوياتك الإستراتيجية بعيداً عن صخب البريد والمهام العاجلة غير المنتجة.',
          areaId: 'career' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'family':
        return {
          title: `جلسة دفء عائلي بدون شاشات (${bottleneckAdvisor.title})`,
          text: 'يوصي د. هاني بحجز 20 دقيقة الليلة لجلسة حوار هادئة ومودة مع الأسرة أو الوالدين خالية تماماً من الهواتف والشاشات.',
          areaId: 'family' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'social':
        return {
          title: `تواصل إيجابي مع صديق داعم (${bottleneckAdvisor.title})`,
          text: 'يوجه د. هاني بالمبادرة اليوم بالتواصل مع صديق واحد مخلص يشاركك قيمك، ووضع حدود صحية تمنع استنزاف العلاقات السطحية.',
          areaId: 'social' as LifeAreaId,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
      case 'learning':
      default:
        return {
          title: `قراءة نوعية مركزة (${bottleneckAdvisor.title})`,
          text: 'يوجه د. هاني بتخصيص 15 دقيقة اليوم لقراءة صفحات من كتاب ذي قيمة عالية يفتح لك أفقاً جديداً في تخصصك أو وعيك.',
          areaId: bottleneckAdvisor.id,
          areaTitle: bottleneckAdvisor.title,
          actionLabel: 'إضافة للمربع الثاني (مهم وغير عاجل)',
        };
    }
  };

  const drHaniAction = getDrHaniImmediateAction();

  const handleAddHaniGoal = () => {
    if (isBrandNewUser) {
      if (onStartEvaluation) onStartEvaluation();
      return;
    }
    if (onAddEisenhowerGoal) {
      onAddEisenhowerGoal(drHaniAction.title, 'د. هاني الموجه', drHaniAction.areaId);
    }
    onAddGoal(drHaniAction.areaId, drHaniAction.title);
    setAddedHaniGoals((prev) => ({ ...prev, [drHaniAction.title]: true }));
    setToastMessage(`تمت إضافة توجيه د. هاني إلى المربع الثاني (مهم وغير عاجل) بمصفوفتك بنجاح 🎯`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCompleteHaniActionToday = () => {
    setCompletedHaniGoals((prev) => ({ ...prev, [drHaniAction.title]: true }));
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    setToastMessage(`مبارك! أنجزت خطوتك اليومية الفورية بنجاح 🌟 استمر على هذه الوتيرة الهادئة والمستدامة.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  // Moataz Panoramic Holistic Report Data (reconciled with actual Life Wheel scores & pure Arabic)
  const reconciledReport = directorReport
    ? reconcileDirectorReportWithScores(directorReport, scores)
    : null;
  const strongestScore = scores[strongestAdvisor.id] || 0;
  const moatazOverallDiagnosis = localizeDomainText(
    reconciledReport?.overallDiagnosis || (
      completedCount > 0
        ? `بناءً على قراءة عجلة حياتك بمعدل عام (${averageBalanceScore} / 10)، ${strongestScore >= 7.8
          ? `يتبين وجود ركيزة قوية في ${strongestAdvisor.title} تمنحك استقراراً وطاقة إيجابية`
          : `يمثل ${strongestAdvisor.title} أعلى جوانبك الحالية نسبياً (${strongestScore.toFixed(1)} / 10) ويمكن البناء عليه بهدوء`
        }. في المقابل، يمثل ${bottleneckAdvisor.title} عنق الزجاجة الأبرز الذي يستوجب حماية المربع 2 بمصفوفة أيزنهاور لتفادي تسرب الطاقة.`
        : ''
    )
  );

  const rawBottleneck = reconciledReport?.criticalBottleneck || {
    title: `فجوة ${bottleneckAdvisor.title} وأثرها التراكمي`,
    impact: `تراجع هذا الجانب إلى (${bottleneckScore.toFixed(1)} / 10) يمثل ضغطاً غير مرئي يؤثر على صفاء ذهنك وطاقتك اليومية.`,
    recommendation: `ابدأ بعادة صغرى واحدة لا تتجاوز 15 دقيقة مخصصة ${prefixLamArabic(bottleneckAdvisor.title)} وضعها في المربع 2 بمصفوفة أيزنهاور.`,
    domain: bottleneckAdvisor.title,
  };
  const moatazBottleneck = {
    ...rawBottleneck,
    title: localizeDomainText(rawBottleneck.title),
    impact: localizeDomainText(rawBottleneck.impact),
    recommendation: localizeDomainText(rawBottleneck.recommendation),
    domain: localizeDomainText(rawBottleneck.domain),
  };

  const rawKeystoneHabit = reconciledReport?.keystoneHabits?.[0] || {
    name: `طقس التوازن الصباحي لحماية ${bottleneckAdvisor.title}`,
    triggerTime: 'يومياً لمدة 15 دقيقة في المربع 2',
    targetDomains: [bottleneckAdvisor.title, 'الجانب الصحي والبدني', 'الجانب الشخصي والوعي بالذات'],
    expectedImpact: 'شحن الطاقة الذهنية والبدنية وتفادي ضغوط اللحظة الأخيرة.',
  };
  const moatazKeystoneHabit = {
    ...rawKeystoneHabit,
    name: localizeDomainText(rawKeystoneHabit.name),
    triggerTime: localizeDomainText(rawKeystoneHabit.triggerTime),
    targetDomains: (rawKeystoneHabit.targetDomains || []).map(localizeDomainText),
    expectedImpact: localizeDomainText(rawKeystoneHabit.expectedImpact),
  };

  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 space-y-6 sm:space-y-8 bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 transition-colors duration-300"
    >
      {/* Prominent RTL Segmented Tab Switcher */}
      <div className="print:hidden">
        <div
          role="tablist"
          aria-label="أقسام لوحة التحكم وعجلة الحياة"
          className="flex flex-wrap sm:inline-flex w-full sm:w-auto items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#0B161C] border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors"
        >
          {/* Tab 1: عجلة الحياة والملخص (Default active) */}
          <button
            type="button"
            role="tab"
            id="dashboard-tab-overview"
            aria-selected={currentTab === 'dashboard'}
            onClick={() => handleTabChange('dashboard')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              currentTab === 'dashboard'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">عجلة الحياة والملخص</span>
          </button>

          {/* Tab 2: المقارنة والتحليلات */}
          <button
            type="button"
            role="tab"
            id="dashboard-tab-comparison"
            aria-selected={currentTab === 'comparison'}
            onClick={() => handleTabChange('comparison')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              currentTab === 'comparison'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold'
            }`}
          >
            <GitCompare className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">المقارنة والتحليلات</span>
          </button>

          {/* Tab 3: رؤية المنسق العام (Locked when incomplete, Unlocked when complete) */}
          <button
            type="button"
            role="tab"
            id="dashboard-tab-coordinator"
            aria-selected={currentTab === 'coordinator'}
            aria-disabled={!isAssessmentComplete}
            onClick={() => handleTabChange('coordinator')}
            title={
              !isAssessmentComplete
                ? `يُفتح بعد إكمال التقييم (${completedCount} / 8)`
                : 'رؤية المنسق العام والتحليل التكاملي الشامل'
            }
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
              !isAssessmentComplete
                ? 'opacity-65 cursor-not-allowed bg-slate-50 dark:bg-[#0E1D24] text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:opacity-85'
                : currentTab === 'coordinator'
                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white font-black shadow-xs cursor-pointer'
                : 'text-[#334155] dark:text-slate-300 hover:text-[#0F6E6E] dark:hover:text-cyan-300 hover:bg-slate-100/80 dark:hover:bg-[#112028] font-bold cursor-pointer'
            }`}
          >
            {!isAssessmentComplete ? (
              <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : (
              <Compass className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">رؤية المنسق العام</span>
            {!isAssessmentComplete && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80 whitespace-nowrap">
                يُفتح بعد إكمال التقييم
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1 Content: لوحة التحكم وعجلة الحياة */}
      {currentTab === 'dashboard' && (
        <div
          role="tabpanel"
          aria-labelledby="dashboard-tab-overview"
          className="space-y-8 animate-in fade-in duration-200"
        >
          {/* Welcome & Overall Balance Banner */}
          <div className="relative overflow-hidden bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
            <div className="absolute top-0 left-0 w-80 h-80 bg-[#0B6E72]/5 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-[#0B6E72] dark:text-cyan-400">
                  <span>{isBrandNewUser ? 'حساب جديد' : 'لوحة التحكم'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E72] dark:bg-cyan-400"></span>
                  <span className="text-[#0B6E72] dark:text-cyan-300 font-extrabold">{getDiagnosisLabel()}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white transition-colors">
                  مرحباً بك، {userProfile?.name?.trim() || 'عزيزي'} 👋
                </h1>

                <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 max-w-2xl leading-relaxed transition-colors">
                  {isBrandNewUser
                    ? 'أنت في بداية رحلتك مع وزان. لم تقم بأي تقييم حتى الآن. انقر على الزر لبدء جولة التقييم مع المستشارين ورسم عجلة حياتك الخاصة.'
                    : 'هنا تجتمع أبعاد حياتك الثمانية بنظام وزان. انقر على أي مجال في عجلة الحياة لاستعراض بطاقته أو المتابعة في التقييم.'}
                </p>
              </div>

              {/* Action Trigger Box */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#112028] border border-[#0B6E72]/20 dark:border-cyan-500/30 flex items-center justify-center shadow-xs">
                    <span className="text-2xl font-black text-[#0B6E72] dark:text-cyan-300 tabular-nums" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                      {isBrandNewUser ? '0 / 8' : averageBalanceScore}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-semibold">
                      {isBrandNewUser ? 'إنجاز التقييم' : 'مؤشر التوازن العام'}
                    </span>
                    <span className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400">
                      {isBrandNewUser ? (
                        'بانتظار البدء'
                      ) : (
                        <span>
                          <span dir="ltr" className="inline-block font-sans font-bold tabular-nums" style={{ unicodeBidi: 'isolate' }}>{balancePercentage}%</span> اكتمال المنظومة
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {isBrandNewUser ? (
                  <button
                    type="button"
                    onClick={onStartEvaluation}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-black text-xs sm:text-sm shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-950/50 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      ابدأ رحلة تقييم مجالات حياتك (<span dir="ltr" style={{ unicodeBidi: 'isolate' }}>0/8</span>)
                    </span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNavigateToCoordinatorView}
                      aria-disabled={!isAssessmentComplete}
                      title={!isAssessmentComplete ? `يُفتح بعد إكمال التقييم (${completedCount} / 8)` : undefined}
                      className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-extrabold text-xs sm:text-sm transition-all ${
                        !isAssessmentComplete
                          ? 'bg-slate-100 dark:bg-[#0E1D24] border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80'
                          : 'bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-950/50 hover:shadow-lg hover:scale-[1.02] group cursor-pointer'
                      }`}
                    >
                      {!isAssessmentComplete ? (
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#ffd67a] dark:text-amber-300" />
                      )}
                      <span>تقرير المنسق العام التكاملي</span>
                      {!isAssessmentComplete ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80 whitespace-nowrap">
                          يُفتح بعد إكمال التقييم
                        </span>
                      ) : (
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      )}
                    </button>
                    {onStartNewWeeklyAssessment && (
                      <button
                        type="button"
                        onClick={() => setShowWeeklyResetConfirm(true)}
                        className="flex items-center gap-1.5 px-4 py-4 rounded-2xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0B6E72] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] font-bold text-xs sm:text-sm shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] transition-all cursor-pointer"
                        title="بدء دورة تقييم أسبوعي جديدة وإعادة فحص المحطات"
                      >
                        <RotateCcw className="w-4 h-4 text-[#0B6E72] dark:text-[#22D3EE]" />
                        <span>بدء تقييم أسبوعي جديد</span>
                      </button>
                    )}
              </div>
            )}
          </div>
        </div>

        {/* New user step highlight */}
        {isBrandNewUser && (
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B6E72] dark:bg-[#0E7490] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="text-[#0F172A] dark:text-white font-bold">
                الخطوة الأولى: قم بزيارة كل مستشار لتقييم جانبه والإجابة عن أسئلته النوعية.
              </span>
            </div>
            <button
              type="button"
              onClick={onStartEvaluation}
              className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline flex items-center gap-1 self-start sm:self-center cursor-pointer"
            >
              <span>انطلق للتقييم الآن</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )
        }
      </div >

      {/* Dr. Hani Immediate Executive Guidance Card (توجيه تنفيذي فوري للـ 24 ساعة القادمة) */}
      < div
        className="relative overflow-hidden bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-cyan-500/10 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/40 border-2 border-emerald-300/80 dark:border-emerald-800/80 rounded-3xl p-6 sm:p-7 shadow-xs transition-all text-right"
        dir="rtl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  د. هاني الموجه 🧭 (المستشار التوجيهي ورئيس الداشبورد)
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold">
                  توجيه الـ 24 ساعة القادمة
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                {drHaniAction.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 max-w-3xl leading-relaxed">
                {isolateNumbersInText(drHaniAction.text)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
            {isBrandNewUser ? (
              <button
                type="button"
                onClick={onStartEvaluation}
                className="px-5 py-3 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isolateNumbersInText(drHaniAction.actionLabel)}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCompleteHaniActionToday}
                  disabled={completedHaniGoals[drHaniAction.title]}
                  className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${completedHaniGoals[drHaniAction.title]
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                    }`}
                  title="تسجيل إنجاز هذه الخطوة اليومية الفورية الآن"
                >
                  <Check className="w-4 h-4" />
                  <span>{completedHaniGoals[drHaniAction.title] ? 'تم إنجازها اليوم بنجاح 🌟' : 'تم إنجازها اليوم ✅'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddHaniGoal}
                  className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] ${addedHaniGoals[drHaniAction.title]
                    ? 'bg-teal-800 text-white'
                    : 'bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white'
                    }`}
                  title="إدراج الخطوة مباشرة ضمن المربع الثاني بمصفوفة أيزنهاور"
                >
                  {addedHaniGoals[drHaniAction.title] ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>أُضيفت لمصفوفتي بنجاح</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{drHaniAction.actionLabel}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Main Section: Interactive Radar Life Wheel + Inspector */}
      < div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" >
        {/* Radar Chart Centerpiece */}
        < div className="lg:col-span-7 bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center transition-colors" >
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-white flex items-center gap-2 transition-colors">
                <Compass className="w-5 h-5 text-[#0B6E72] dark:text-cyan-400" />
                <span>عجلة الحياة التفاعلية</span>
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 transition-colors">
                {isBrandNewUser
                  ? 'العجلة تبدأ الآن فارغة وستمتلئ تلقائياً مع تقييم كل جانب من الجوانب الثمانية'
                  : 'انقر على أي زاوية لاستعراض تفاصيل الجانب أو الانتقال لاستشارة المستشار'}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-50 dark:bg-[#0B161C] text-[#0B6E72] dark:text-cyan-400 border border-slate-200/80 dark:border-slate-800">
              <span dir="ltr" className="font-mono" style={{ unicodeBidi: 'isolate' }}>{completedCount} / 8</span> مكتمل
            </span>
          </div>

          <RadarChart
            scores={scores}
            onSelectArea={(areaId) => setSelectedAreaId(areaId)}
            selectedAreaId={selectedAreaId}
            size={440}
            theme={theme}
          />
        </div >

        {/* Selected Area Deep Preview Box */}
        < div className="lg:col-span-5 bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5 transition-colors" >
          {(() => {
            const activeArea = ADVISORS_LIST.find((a) => a.id === selectedAreaId) || ADVISORS_LIST[0];
            const isCompleted = completedAdvisors.includes(activeArea.id);
            const areaScore = scores[activeArea.id] || 0;
            const activeUserTexts = extractUserDialogueTextsForArea(activeArea.id, answers);
            const areaInsights = isCompleted
              ? extractInsightsFromAnswers(activeArea, areaScore, answers, activeUserTexts, userProfile)
              : null;
            const areaGoals = goals[activeArea.id] || [];
            const suggestedAreaGoals = isCompleted
              ? generateRealisticAreaGoals({
                areaId: activeArea.id,
                userTexts: activeUserTexts,
                userProfile,
                score: areaScore,
                challenges: areaInsights?.challenges,
                strengths: areaInsights?.strengths,
              }).filter((g) => !areaGoals.includes(g))
              : [];

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                      style={{ backgroundColor: `${activeArea.themeColor}15` }}
                    >
                      {activeArea.avatarSvg}
                    </div>
                    <div>
                      <h3 className="font-black text-[#0F172A] dark:text-white text-base transition-colors">
                        {activeArea.title}
                      </h3>
                      <p className="text-xs font-semibold" style={{ color: activeArea.themeColor }}>
                        {activeArea.name} ({activeArea.badge})
                      </p>
                    </div>
                  </div>

                  <div className="text-left" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    <span
                      className="text-2xl font-black tabular-nums"
                      style={{ color: activeArea.themeColor }}
                    >
                      {isCompleted ? areaScore.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-slate-400"> / 10</span>
                  </div>
                </div>

                {/* State: Not yet evaluated */}
                {!isCompleted ? (
                  <div className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-[#0B6E72] dark:text-cyan-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">لم يتم تقييم هذا الجانب بعد</h4>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
                        أجب عن الأسئلة الخاصة بـ {activeArea.name} لاكتشاف نقاط قوتك وحساب درجتك
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                      className="py-2.5 px-5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>بدء تقييم {activeArea.title}</span>
                    </button>
                  </div>
                ) : (
                  /* Strengths & Challenges */
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        نقاط القوة المستخلصة:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#334155] dark:text-slate-300">
                        {(areaInsights?.strengths || []).map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{isolateNumbersInText(str)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-amber-700 dark:text-[#FBBF24] flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-[#FBBF24]" />
                        التحديات ونقاط التطوير:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#334155] dark:text-slate-300">
                        {(areaInsights?.challenges || []).map((ch, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{isolateNumbersInText(ch)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Goals */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
                      أهداف هذا الجانب ({areaGoals.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddGoalFor(showAddGoalFor === activeArea.id ? null : activeArea.id)}
                      className="text-[11px] font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة هدف</span>
                    </button>
                  </div>

                  {showAddGoalFor === activeArea.id && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newGoalInput[activeArea.id] || ''}
                        onChange={(e) =>
                          setNewGoalInput((prev) => ({ ...prev, [activeArea.id]: e.target.value }))
                        }
                        placeholder="اكتب هدفاً عملياً جديداً..."
                        className="flex-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGoalSubmit(activeArea.id)}
                        className="px-3 py-1.5 bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        حفظ
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {areaGoals.length === 0 ? (
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 italic">
                        {isCompleted
                          ? 'لم تعتمد أهدافاً يدوية بعد؛ يمكنك اعتماد التوصيات المستخلصة من حوارك أدناه أو إضافة هدف خاص.'
                          : 'لا توجد أهداف مضافة بعد لهذا الجانب.'}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {areaGoals.map((goal, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 bg-slate-50 dark:bg-[#0B161C] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-[#334155] dark:text-slate-300"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400 mt-0.5 flex-shrink-0" />
                            <span>{isolateNumbersInText(goal)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Realistic dialogue-derived goal suggestions ready for 1-click adoption */}
                    {isCompleted && suggestedAreaGoals.length > 0 && (
                      <div className="pt-1.5 space-y-1.5">
                        <span className="text-[11px] font-bold text-[#0B6E72] dark:text-cyan-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>توصيات واقعية مقترحة من حوارك:</span>
                        </span>
                        {suggestedAreaGoals.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 bg-teal-50/60 dark:bg-cyan-950/30 p-2 rounded-xl border border-teal-200/70 dark:border-cyan-800/50 text-[11px] text-[#334155] dark:text-slate-300"
                          >
                            <span className="leading-relaxed">{isolateNumbersInText(rec)}</span>
                            <button
                              type="button"
                              onClick={() => onAddGoal(activeArea.id, rec)}
                              className="flex-shrink-0 px-2 py-1 rounded-lg bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] text-white text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              + اعتماد
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(activeArea.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: activeArea.themeColor }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>استشارة {activeArea.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                    className="py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ClipboardEdit className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400" />
                    <span>{isCompleted ? 'تعديل الإجابات' : 'بدء التقييم'}</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div >
      </div >

      {/* Moataz Panoramic Holistic Report Card (تقرير م. معتز التكاملي وخارطة 30 يوماً) */}
      <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors text-right" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-2xl shadow-xs">
              🧩
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                  م. معتز التكاملي (المنسق العام للتوازن الشامل)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200">
                  تشخيص استراتيجي
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">
                التشخيص التكاملي الشامل وخارطة طريق 30 يوماً
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNavigateToCoordinatorView}
            aria-disabled={!isAssessmentComplete}
            title={!isAssessmentComplete ? `يُفتح بعد إكمال التقييم (${completedCount} / 8)` : undefined}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-xs transition-all flex items-center gap-2 self-start sm:self-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] ${
              !isAssessmentComplete
                ? 'bg-slate-50 dark:bg-[#0E1D24] border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80'
                : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 cursor-pointer'
            }`}
          >
            {!isAssessmentComplete ? (
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            )}
            <span>عرض التقرير التفاعلي الكامل</span>
            {!isAssessmentComplete ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80 whitespace-nowrap">
                يُفتح بعد إكمال التقييم
              </span>
            ) : (
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            )}
          </button>
        </div>

        {
          isBrandNewUser ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-[#0F172A] dark:text-white">
                بانتظار إتمام محطات عجلة الحياة لرسم التشخيص الشمولي
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                يقوم م. معتز التكاملي بتحليل تقاطعات أبعادك الثمانية، وكشف عنق الزجاجة الرئيسي، وتحديد العادة المحورية الأكثر تأثيراً، ورسم خارطة 30 يوماً فور إتمام التقييمات.
              </p>
              <button
                type="button"
                onClick={onStartEvaluation}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] text-white text-xs font-black shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72]"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>ابدأ التقييم التأسيسي الآن (<span dir="ltr" style={{ unicodeBidi: 'isolate' }}>0 / 8</span>)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Diagnosis & Bottleneck & Keystone Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Diagnosis */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#0B6E72] dark:text-cyan-400 font-bold text-xs">
                    <Compass className="w-4 h-4" />
                    <span>التشخيص العام للمنظومة</span>
                  </div>
                  <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                    {isolateNumbersInText(moatazOverallDiagnosis)}
                  </p>
                </div>

                {/* Critical Bottleneck */}
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <AlertOctagon className="w-4 h-4" />
                    <span>عنق الزجاجة الحياتي</span>
                  </div>
                  <h4 className="text-xs font-black text-rose-900 dark:text-rose-300">
                    {isolateNumbersInText(moatazBottleneck.title)}
                  </h4>
                  <p className="text-[11px] text-[#334155] dark:text-slate-300 leading-relaxed">
                    {isolateNumbersInText(moatazBottleneck.impact)}
                  </p>
                  <div className="pt-1 text-[11px] font-semibold text-rose-800 dark:text-rose-400">
                    💡 {isolateNumbersInText(moatazBottleneck.recommendation)}
                  </div>
                </div>

                {/* Keystone Habit */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    <span>العادة المحورية</span>
                  </div>
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                    {isolateNumbersInText(moatazKeystoneHabit.name)}
                  </h4>
                  <p className="text-[11px] text-[#334155] dark:text-slate-300 leading-relaxed">
                    {isolateNumbersInText(moatazKeystoneHabit.expectedImpact)}
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                      <span>⏰</span> {isolateNumbersInText(moatazKeystoneHabit.triggerTime)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 inline-flex items-center gap-1">
                      <span>⏱️</span> <span dir="ltr" className="font-mono" style={{ unicodeBidi: 'isolate' }}>15</span> دقيقة يومياً
                    </span>
                  </div>
                </div>
              </div>

              {/* 30-Day Smart Plan Direct Access */}
              <div className="pt-2">
                <div
                  onClick={onNavigateToThirtyDayPlan || handleNavigateToCoordinatorView}
                  className="p-4 rounded-2xl bg-gradient-to-r from-[#0B6E72]/10 via-teal-500/5 to-transparent dark:from-cyan-950/40 dark:via-teal-950/20 dark:to-transparent border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-[#0B6E72]/40 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B6E72]/15 dark:bg-cyan-500/20 text-[#0B6E72] dark:text-cyan-400 flex items-center justify-center text-xl flex-shrink-0">
                      📅
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-[#0F172A] dark:text-white">
                        خطتك الذكية لـ 30 يوماً
                      </h5>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                        خطة عمل تفاعلية شاملة مقسمة يوماً بيوم ومحطة بمحطة لمرافقتك نحو التوازن الحقيقي
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400 flex items-center gap-1.5 flex-shrink-0">
                    <span>فتح خطتي الذكية</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* 8 Area Cards Grid (Score, Strengths, Challenges, Goals) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0F172A] dark:text-white transition-colors">
              بطاقات مجالات الحياة الثمانية
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 transition-colors">
              استعراض مفصل لكل مجال مع درجاته ومواطن قوته وتحدياته وأهدافه المعتمدة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ADVISORS_LIST.map((advisor) => {
            const isCompleted = completedAdvisors.includes(advisor.id);
            const score = scores[advisor.id] || 0;
            const cardUserTexts = extractUserDialogueTextsForArea(advisor.id, answers);
            const areaInsights = isCompleted
              ? extractInsightsFromAnswers(advisor, score, answers, cardUserTexts, userProfile)
              : null;
            const areaGoals = goals[advisor.id] || [];
            const fallbackCardGoals =
              isCompleted && areaGoals.length === 0
                ? generateRealisticAreaGoals({
                  areaId: advisor.id,
                  userTexts: cardUserTexts,
                  userProfile,
                  score,
                  challenges: areaInsights?.challenges,
                  strengths: areaInsights?.strengths,
                })
                : [];
            const displayedCardGoals = areaGoals.length > 0 ? areaGoals : fallbackCardGoals;

            return (
              <div
                key={advisor.id}
                className="bg-white dark:bg-[#112028] border border-slate-200/90 hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-cyan-800/50 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-all duration-300 h-full relative overflow-hidden group"
              >
                {/* Accent Top Line */}
                <div
                  className="absolute top-0 right-0 left-0 h-1.5"
                  style={{ backgroundColor: advisor.themeColor }}
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5 dark:border-white/10"
                        style={{ backgroundColor: `${advisor.themeColor}15` }}
                      >
                        {advisor.avatarSvg}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-white transition-colors">
                          {advisor.title}
                        </h3>
                        <p className="text-[11px] font-semibold" style={{ color: advisor.themeColor }}>
                          {advisor.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-left" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                      <span className="text-xl font-black tabular-nums" style={{ color: advisor.themeColor }}>
                        {isCompleted ? score.toFixed(1) : '--'}
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400"> / 10</span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0B161C] rounded-full mt-3 overflow-hidden border border-slate-200/60 dark:border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: isCompleted ? `${(score / 10) * 100}%` : '0%',
                        backgroundColor: advisor.themeColor,
                      }}
                    />
                  </div>
                </div>

                {/* Strengths & Challenges OR Not Yet Evaluated Prompt */}
                <div className="space-y-3 text-[11px] flex-1 flex flex-col justify-between">
                  {!isCompleted ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 text-[#64748B] dark:text-slate-400 text-center space-y-1">
                      <span className="font-bold text-[#0F172A] dark:text-white block">بانتظار تقييمك</span>
                      <p className="text-[10px] text-[#64748B] dark:text-slate-400">لم تجب عن أسئلة هذا البُعد بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                          نقاط القوة:
                        </span>
                        <p className="text-[#334155] dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {isolateNumbersInText(areaInsights?.strengths?.[0] || 'وعي جيد بطبيعة هذا الجانب')}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-amber-700 dark:text-[#FBBF24] block mb-0.5">
                          التحديات:
                        </span>
                        <p className="text-[#334155] dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {isolateNumbersInText(areaInsights?.challenges?.[0] || 'تثبيت خطة أسبوعية واضحة')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Goals Count Pill */}
                  <div className="pt-1">
                    <span className="text-[#64748B] dark:text-slate-400 block mb-1">
                      {areaGoals.length > 0 ? `الأهداف المعتمدة (${areaGoals.length}):` : isCompleted ? `توصيات هذا الجانب (${displayedCardGoals.length}):` : 'الأهداف المعتمدة (0):'}
                    </span>
                    {displayedCardGoals.length === 0 ? (
                      <span className="text-[10px] text-[#94a3b8] dark:text-slate-500 italic">لا توجد أهداف بعد</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {displayedCardGoals.slice(0, 2).map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-[#0B161C] text-[#334155] dark:text-slate-300 text-[10px] border border-slate-200/80 dark:border-slate-800 line-clamp-1 block max-w-full"
                            title={g}
                          >
                            {isolateNumbersInText(g)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Aligned to Bottom Across Cards) */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(advisor.id)}
                    className="flex-1 py-2 px-3 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: advisor.themeColor }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>استشارة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(advisor.id)}
                    className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold flex items-center justify-center transition-all cursor-pointer"
                    title={isCompleted ? 'تعديل الإجابات' : 'بدء التقييم'}
                  >
                    <ClipboardEdit className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly and Weekly Longitudinal Analytics Component */}
      <YearlyAndWeeklyAnalytics />
        </div>
      )}

      {/* Tab 2 Content: المقارنة والتحليلات */}
      {currentTab === 'comparison' && (
        <div
          role="tabpanel"
          aria-labelledby="dashboard-tab-comparison"
          className="animate-in fade-in duration-200"
        >
          <ComparisonScreen
            userProfile={userProfile}
            onNavigateToDashboard={() => handleTabChange('dashboard')}
            theme={theme}
            embedded
          />
        </div>
      )}

      {/* Tab 3 Content: رؤية المنسق العام (Unlocked) */}
      {currentTab === 'coordinator' && isAssessmentComplete && (
        <div
          role="tabpanel"
          aria-labelledby="dashboard-tab-coordinator"
          className="animate-in fade-in duration-200"
        >
          <DirectorSummaryScreen
            userProfile={userProfile}
            scores={scores}
            answers={answers}
            goals={goals}
            report={directorReport || null}
            onSaveReport={onSaveDirectorReport || (() => {})}
            onBackToDashboard={() => handleTabChange('dashboard')}
            onNavigateToThirtyDayPlan={onNavigateToThirtyDayPlan}
            theme={theme}
            embedded
          />
        </div>
      )}

      {/* Tab 2 Content: رؤية المنسق العام (Locked Fallback Card) */}
      {currentTab === 'coordinator' && !isAssessmentComplete && (
        <div
          role="tabpanel"
          aria-labelledby="dashboard-tab-coordinator"
          className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#112028] border border-dashed border-amber-300 dark:border-amber-800/70 text-center space-y-4 max-w-xl mx-auto shadow-xs animate-in fade-in duration-200"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[#0F172A] dark:text-white">
              رؤية المنسق العام مُغلقة حالياً
            </h3>
            <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              تعتمد الرؤية التكاملية للمنسق العام على تقاطع درجات مجالات الحياة الثمانية معاً.
              أكمل تقييم محطاتك المتبقية لفتح التشخيص الاستراتيجي وخارطة التوازن تلقائياً.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onStartEvaluation && (
              <button
                type="button"
                onClick={onStartEvaluation}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>متابعة التقييم الآن ({completedCount} / 8)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleTabChange('dashboard')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0E1D24] border border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {
        toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-6 z-50 p-4 rounded-2xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200"
            dir="rtl"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )
      }

      {
        onStartNewWeeklyAssessment && (
          <ConfirmDialog
            open={showWeeklyResetConfirm}
            title="بدء تقييم أسبوعي جديد"
            description="سيتم تصفير التقييم الحالي والعودة فوراً إلى المحطة 1 من 8 (الجانب الروحي) ومسح رسائل المحادثات السابقة والدرجات غير المعتمدة. هل تريد المتابعة؟"
            confirmLabel="نعم، بدء تقييم جديد"
            cancelLabel="إلغاء"
            variant="warning"
            onCancel={() => setShowWeeklyResetConfirm(false)}
            onConfirm={() => {
              setShowWeeklyResetConfirm(false);
              onStartNewWeeklyAssessment();
            }}
          />
        )
      }
    </div >
  );
};
