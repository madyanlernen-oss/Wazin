export type LifeAreaId =
  | 'spiritual'
  | 'financial'
  | 'career'
  | 'personal'
  | 'learning'
  | 'family'
  | 'social'
  | 'health';

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
  tailwindColor: string; // 'emerald'
  gradient: string;
  avatarSvg: string;
  questions: Question[]; // Exactly 8 questions
  defaultGoals: string[];
  suggestedQuestions: string[];
}

export interface UserProfile {
  name: string;
  email?: string;
  password?: string;
  ageGroup: string;
  currentFocus: string;
  registeredAt: string;
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

export interface AreaAnalysis {
  assessmentSummary: string;
  keyStrengths: string[];
  mainChallenges: string[];
  quickWins: string[];
  strategicMilestone: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'advisor' | 'director';
  content: string;
  timestamp: string;
  actionSteps?: string[];
  reflectionQuestion?: string;
}
