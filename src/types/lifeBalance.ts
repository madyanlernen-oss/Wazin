export type LifeAreaId =
  | 'spiritual'
  | 'financial'
  | 'career'
  | 'personal'
  | 'learning'
  | 'family'
  | 'social'
  | 'health';

export type Screen =
  | 'landing'
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'thirty_day_plan'
  | 'advisor_chat'
  | 'director_summary'
  | 'comparison'
  | 'goals_matrix';

export type AssessmentMode = 'initial_assessment' | 'weekly_checkin';

export type QuestionType = 'multiple_choice' | 'rating' | 'open_text' | 'multi_select';

export interface QuestionOption {
  id: string;
  label: string;
  scoreWeight?: number; // 1 to 10
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  options?: QuestionOption[];
  minRating?: number;
  maxRating?: number;
  ratingLabels?: {
    low: string;
    mid?: string;
    high: string;
  };
  placeholder?: string;
  helpTip?: string;
}

export interface AdvisorConfig {
  id: LifeAreaId;
  name: string;
  title: string;
  role: string;
  bio: string;
  tagline: string;
  badge: string;
  themeColor: string; // e.g. '#10b981'
  strongColor?: string; // e.g. '#047857' - Tailwind-700 / WCAG 2.2 AA compliant
  tailwindColor: string; // 'emerald'
  gradient: string;
  avatarSvg: string;
  questions: Question[]; // Exactly 8 questions
  defaultGoals: string[];
  suggestedQuestions: string[];
}

export type EisenhowerQuadrant =
  | 'q1_urgent_important'
  | 'q2_important_not_urgent'
  | 'q3_urgent_not_important'
  | 'q4_not_urgent_not_important';

export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface EisenhowerGoalItem {
  id: string;
  title: string;
  quadrant: EisenhowerQuadrant;
  timeframe: GoalTimeframe;
  areaId: LifeAreaId;
  completed: boolean;
  source: 'advisor' | 'user';
  advisorName?: string;
  createdAt?: string;
  isFocus?: boolean;
}

export interface UserProfile {
  name: string;
  email?: string;
  password?: string;
  hasPassword?: boolean;
  ageGroup: string;
  currentFocus: string;
  registeredAt: string;
  employmentStatus?: string; // e.g. 'طالب جامعي' | 'موظف' | 'صاحب عمل/مستقل' | 'متقاعد' | 'باحث عن عمل' | 'غير ذلك'
  workStatus?: string;
  hasDependents?: string; // e.g. 'نعم' | 'لا'
  incomeSource?: string; // e.g. 'مصروف من الأسرة' | 'مكافأة جامعية/منحة' | 'عمل جزئي' | 'غير ذلك' (للطالب)
  incomeStability?: string; // e.g. 'نعم (دخل ثابت)' | 'لا (دخل متغير)' (للموظف/صاحب العمل)
}

export interface KeystoneHabit {
  name: string;
  triggerTime: string;
  targetDomains: string[];
  expectedImpact: string;
}

export interface ThirtyDayWeek {
  weekNumber: number;
  weekTitle: string;
  coreFocus: string;
  actions: string[];
}

export interface DirectorSummaryReport {
  overallDiagnosis: string;
  balanceIndexLabel: string;
  strongestSynergy: {
    title: string;
    description: string;
    domainsInvolved: string[];
  };
  criticalBottleneck: {
    title: string;
    impact: string;
    recommendation: string;
    domain: string;
  };
  keystoneHabits: KeystoneHabit[];
  thirtyDayRoadmap: ThirtyDayWeek[];
  directorGoldenRule: string;
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'advisor' | 'director';
  content: string;
  timestamp: string;
  actionSteps?: string[];
  reflectionQuestion?: string;
  reasoning?: string;
  summary?: string;
  advice?: string;
  isCrisis?: boolean;
  suggestedReplies?: string[];
  offeredScore?: number | null;
  ignoredForTurnCount?: boolean;
  source?: 'gemini' | 'groq' | 'local-fallback';
}

export interface MonthData {
  month: string;
  monthName: string;
  averageScore: number;
  highlight: string;
  completedTasks: number;
  topArea: string;
  bottleneckArea: string;
  scores: Record<LifeAreaId, number>;
}

export interface WeekData {
  weekNumber: number;
  startDate?: string;
  dateRange: string;
  balanceScore: number;
  weeklyHabitCompletion: number; // percentage
  reflection: string;
  wins: string[];
  challenges: string[];
}

export interface DayPlanTask {
  dayNumber: number; // 1 to 30
  domainId: LifeAreaId;
  domainTitle: string;
  domainIcon?: string;
  weekNumber: number; // 1 to 5 (5: الختام)
  weekTitle: string;
  defaultSuggestions: string[]; // 3 smart suggestions
  selectedTask: string;
  customTask?: string;
  isCustomSelected?: boolean;
  isCompleted: boolean;
  completedAt?: number;
  estimatedMinutes?: number;
}

export interface ThirtyDayPlanState {
  createdAt: number;
  startDateStr: string;
  focusDomains: LifeAreaId[]; // 3 priority domains
  days: DayPlanTask[];
  currentDay: number;
}


