import { ADVISORS_LIST, SAMPLE_GOALS, SAMPLE_SCORES, SAMPLE_USER_PROFILE } from '../data/advisorsData';
import {
  AdvisorConfig,
  DirectorSummaryReport,
  EisenhowerGoalItem,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';

export interface StoredAppState {
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>; // key: `${advisorId}_${questionId}`
  goals: Record<LifeAreaId, string[]>;
  eisenhowerGoals?: EisenhowerGoalItem[];
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>; // timestamp of completion for weekly lock
  directorReport: DirectorSummaryReport | null;
  lastActiveScreen: 'landing' | 'login' | 'onboarding' | 'dashboard' | 'advisor_chat' | 'director_summary' | 'comparison' | 'goals_matrix';
  selectedAdvisorId: LifeAreaId;
}

const STORAGE_KEY = 'lifebalance_state_v1';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Checks if an advisor is locked for the current week (7 days lock)
 */
export const isAdvisorWeeklyLocked = (
  advisorId: string,
  completedDates?: Record<string, number>
): boolean => {
  if (!completedDates || !completedDates[advisorId]) return false;
  const completedAt = completedDates[advisorId];
  return Date.now() - completedAt < ONE_WEEK_MS;
};

/**
 * Calculates remaining days until next weekly evaluation opens
 */
export const getDaysUntilNextUnlock = (completedAt?: number): number => {
  if (!completedAt) return 0;
  const elapsed = Date.now() - completedAt;
  const remainingMs = ONE_WEEK_MS - elapsed;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
};

export const getDefaultInitialState = (): StoredAppState => {
  const initialScores: Record<string, number> = {};
  const initialGoals: Record<string, string[]> = {};

  ADVISORS_LIST.forEach((adv) => {
    initialScores[adv.id] = 0; // 0 for brand new user
    initialGoals[adv.id] = [];
  });

  return {
    userProfile: null,
    scores: initialScores as Record<LifeAreaId, number>,
    answers: {},
    goals: initialGoals as Record<LifeAreaId, string[]>,
    completedAdvisors: [],
    completedDates: {},
    directorReport: null,
    lastActiveScreen: 'landing',
    selectedAdvisorId: 'spiritual',
  };
};

export const loadStoredState = (): StoredAppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultInitialState();
    const parsed = JSON.parse(raw);
    // If the saved state contains old legacy sample answers or 8 completed areas automatically, reset cleanly
    if (
      (parsed.completedAdvisors && parsed.completedAdvisors.length === 8 && parsed.answers?.spiritual_q5) ||
      parsed.userProfile?.name?.includes('عبدالرحمن')
    ) {
      return getDefaultInitialState();
    }
    return {
      ...getDefaultInitialState(),
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to load local storage state:', e);
    return getDefaultInitialState();
  }
};

export const saveStoredState = (state: StoredAppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
};

export const loadSampleState = (): StoredAppState => {
  const sampleAnswers: Record<string, any> = {
    spiritual_q1: 9,
    spiritual_q2: 'opt1',
    spiritual_q3: 8,
    spiritual_q4: 'opt1',
    spiritual_q5: 'تشتت التركيز بسبب الإشعارات وقت الفجر',
    spiritual_q6: 9,
    spiritual_q7: ['m1', 'm2'],
    spiritual_q8: 'opt1',

    financial_q1: 5,
    financial_q2: 'opt3',
    financial_q3: 4,
    financial_q4: 'opt3',
    financial_q5: 'الوصول لصافي ادخار يعادل 6 أشهر وسداد بطاقتين ائتمانيتين',
    financial_q6: 6,
    financial_q7: ['m1', 'm2'],
    financial_q8: 'opt3',

    career_q1: 8,
    career_q2: 'opt2',
    career_q3: 8,
    career_q4: 'opt2',
    career_q5: 'قيادة التحول الرقمي وتأسيس وحدة استشارية',
    career_q6: 7,
    career_q7: ['m1', 'm4'],
    career_q8: 'opt1',

    personal_q1: 7,
    personal_q2: 'opt2',
    personal_q3: 6,
    personal_q4: 'opt2',
    personal_q5: 'التسويف في ممارسة الرياضة الصباحية',
    personal_q6: 6,
    personal_q7: ['m1', 'm2'],
    personal_q8: 'opt2',

    learning_q1: 8,
    learning_q2: 'opt2',
    learning_q3: 7,
    learning_q4: 'opt1',
    learning_q5: 'تطبيقات الذكاء الاصطناعي التوليدي والقيادة المتقدمة',
    learning_q6: 7,
    learning_q7: ['m1', 'm3'],
    learning_q8: 'opt1',

    family_q1: 7,
    family_q2: 'opt3',
    family_q3: 6,
    family_q4: 'opt3',
    family_q5: 'عشاء يومي بدون هواتف وقضاء عطلة نهاية أسبوع ممتعة',
    family_q6: 8,
    family_q7: ['m1', 'm2'],
    family_q8: 'opt2',

    social_q1: 6,
    social_q2: 'opt2',
    social_q3: 6,
    social_q4: 'opt2',
    social_q5: 'مجتمع أقران طموح يشاركني أهداف الريادة والابتكار',
    social_q6: 7,
    social_q7: ['m1', 'm4'],
    social_q8: 'opt1',

    health_q1: 5,
    health_q2: 'opt3',
    health_q3: 4,
    health_q4: 'opt3',
    health_q5: 'آلام الظهر والإرهاق المتكرر وقلة النوم العميق',
    health_q6: 5,
    health_q7: ['m1', 'm2', 'm4'],
    health_q8: 'opt2',
  };

  const sampleState: StoredAppState = {
    userProfile: SAMPLE_USER_PROFILE,
    scores: SAMPLE_SCORES,
    answers: sampleAnswers,
    goals: SAMPLE_GOALS,
    completedAdvisors: [
      'spiritual',
      'financial',
      'career',
      'personal',
      'learning',
      'family',
      'social',
      'health',
    ],
    directorReport: {
      overallDiagnosis:
        'تظهر منظومة حياتك تماسكاً روحياً ومهنياً لافتاً، حيث يمنحك الاستقرار القلبي والوضوح المهني قاعدة صلبة للانطلاق. مع ذلك، تعاني المنظومة من استنزاف في الجانب الصحي (4.8/10) والمالي (5.2/10)، وهو ما يخلق ضغطاً خفياً يؤثر مباشرة على جودة حضورك الأسري والاجتماعي. معالجة هذا التسريب الطاقوي ستطلق العنان لطاقتك الكاملة.',
      balanceIndexLabel: 'طاقة واعدة تحتاج حماية صحية ومالية',
      strongestSynergy: {
        title: 'السكينة الروحية تدعم الإنجاز المهني',
        description:
          'وضوح بوصلتك القيمية وسلامك القلبي يمنحانك هدوءاً في اتخاذ القرارات وحضوراً قيادياً مرموقاً في بيئة العمل.',
        domainsInvolved: ['الجانب الروحي', 'الجانب المهني'],
      },
      criticalBottleneck: {
        title: 'استنزاف النوم والإنهاك البدني',
        impact:
          'قلة النوم العميق وتأجيل الرياضة ينعكسان سلباً على المزاج الأسري ويقللان من قدرتك على الانضباط المالي والإنفاق الواعي.',
        recommendation:
          'تثبيت موعد النوم في الحادية عشرة مساءً وقطع الشاشات قبلها بـ 45 دقيقة كأولوية قصوى.',
        domain: 'الجانب الصحي',
      },
      keystoneHabits: [
        {
          name: 'طقس الإغلاق الرقمي الليلي والنوم 7 ساعات',
          triggerTime: '10:30 مساءً يومياً',
          targetDomains: ['الصحي', 'الأسري', 'الشخصي'],
          expectedImpact:
            'مضاعفة طاقة الصباح بنسبة 40% وإزالة الصداع وتحسين التفاعل الصباحي مع العائلة.',
        },
        {
          name: 'المشي الصباحي 20 دقيقة مع تدبر واستماع لبودكاست',
          triggerTime: '6:30 صباحاً',
          targetDomains: ['الصحي', 'التعليمي', 'الروحي'],
          expectedImpact:
            'تحفيز الإندورفين وإنهاء 8 كتب سنوياً مع صفاء ذهني قبل بدء العمل.',
        },
        {
          name: 'جلسة الأحد الأسبوعية للتخطيط المالي وتتبع النفقات',
          triggerTime: 'عصر كل أحد لمدة 20 دقيقة',
          targetDomains: ['المالي', 'الشخصي', 'المهني'],
          expectedImpact:
            'إيقاف التسرب المالي بنسبة 25% وبناء أول صندوق طوارئ خلال 90 يوماً.',
        },
      ],
      thirtyDayRoadmap: [
        {
          weekNumber: 1,
          weekTitle: 'أسبوع استعادة الطاقة والحماية البدنية',
          coreFocus: 'تثبيت روتين النوم العميق وشرب 3 لترات ماء يومياً ومشي 8000 خطوة.',
          actions: [
            'إبعاد الهاتف عن غرفة النوم عند العاشرة والنصف مساءً',
            'تحميل تطبيق لحساب الخطوات والالتزام بالمشي بعد العصر',
            'إلغاء 3 اشتراكات رقمية غير مستخدمة لوقف التسرب المالي فوراً',
          ],
        },
        {
          weekNumber: 2,
          weekTitle: 'أسبوع الانضباط المالي وتنقية الالتزامات',
          coreFocus: 'حصر الديون والبدء باستراتيجية كرة الثلج لبطاقتين ائتمانيتين.',
          actions: [
            'فتح حساب بنكي منفصل لصندوق الطوارئ بدون بطاقة مدى لتجنب السحب العفوي',
            'إعداد ميزانية الشهر القادم وتحديد سقف للطلبات والمطاعم',
            'جلسة شاي مسائية مع الأسرة بدون شاشات للاتفاق على أهداف الشهر',
          ],
        },
        {
          weekNumber: 3,
          weekTitle: 'أسبوع التمكين والحدود الشخصية',
          coreFocus: 'وضع حدود صحية في العمل لمنع الساعات الإضافية المجانية غير المنتجة.',
          actions: [
            'الاعتذار بذكاء عن الالتزامات الاجتماعية المستنزفة',
            'تخصيص 45 دقيقة يومياً للتعلم المركز في أدوات الذكاء الاصطناعي',
            'جلسة استشارية مع المستشار المهني م. طارق لصياغة أهداف الربع القادم',
          ],
        },
        {
          weekNumber: 4,
          weekTitle: 'أسبوع المراجعة وتثبيت التناغم الشامل',
          coreFocus: 'قياس التقدم وإعادة تقييم عجلة الحياة والاحتفال بالانتصارات الصغيرة.',
          actions: [
            'مقارنة درجات عجلة الحياة قبل وبعد الشهر الأول',
            'مكافأة ذاتية صحية (نزهة في الطبيعة أو كتاب ملهم)',
            'اعتماد روتين الشهر الثاني بمستهدفات متصاعدة',
          ],
        },
      ],
      directorGoldenRule:
        'التوازن ليس أن تعطي كل جانب نفس الساعات بالتساوي، بل أن تعطي كل جانب حقه بحضور كامل ووعي دون أن يطغى أحدهم فيدمر البقية.',
      generatedAt: new Date().toISOString(),
    },
    lastActiveScreen: 'dashboard',
    selectedAdvisorId: 'spiritual',
  };

  saveStoredState(sampleState);
  return sampleState;
};

// Calculate Area score from answers
export const calculateScoreForAdvisor = (
  advisor: AdvisorConfig,
  answers: Record<string, any>
): number => {
  let totalScore = 0;
  let count = 0;

  advisor.questions.forEach((q) => {
    const key = `${advisor.id}_${q.id}`;
    const val = answers[key];

    if (val === undefined || val === null || val === '') return;

    if (q.type === 'rating' && typeof val === 'number') {
      totalScore += val;
      count++;
    } else if (q.type === 'multiple_choice' && q.options) {
      const selectedOpt = q.options.find((o) => o.id === val);
      if (selectedOpt && selectedOpt.scoreWeight) {
        totalScore += selectedOpt.scoreWeight;
        count++;
      }
    } else if (q.type === 'multi_select' && Array.isArray(val)) {
      // selecting goals shows positive engagement
      const weight = Math.min(10, 5 + val.length * 1.5);
      totalScore += weight;
      count++;
    } else if (q.type === 'open_text' && typeof val === 'string' && val.trim().length > 5) {
      // thoughtful response
      totalScore += 8;
      count++;
    }
  });

  if (count === 0) return 5.0; // neutral default
  const avg = totalScore / count;
  return Number(Math.max(1, Math.min(10, avg)).toFixed(1));
};

// Quick synthesis of strengths and challenges based on questions answered
export const extractInsightsFromAnswers = (
  advisor: AdvisorConfig,
  score: number,
  answers: Record<string, any>
): { strengths: string[]; challenges: string[] } => {
  const strengths: string[] = [];
  const challenges: string[] = [];

  // Check specific answers
  advisor.questions.forEach((q) => {
    const val = answers[`${advisor.id}_${q.id}`];
    if (q.type === 'rating' && typeof val === 'number') {
      if (val >= 8) {
        strengths.push(`${q.title.replace(/^ما مدى |^إلى أي مدى |^كيف تقيم /i, '')}: تقييم مرتفع (${val}/10)`);
      } else if (val <= 5) {
        challenges.push(`${q.title.replace(/^ما مدى |^إلى أي مدى |^كيف تقيم /i, '')}: يحتاج لرفع المستوى (${val}/10)`);
      }
    } else if (q.type === 'open_text' && typeof val === 'string' && val.trim().length > 3) {
      challenges.push(`التحدي المذكور: "${val.slice(0, 70)}${val.length > 70 ? '...' : ''}"`);
    }
  });

  if (strengths.length === 0) {
    if (score >= 6) {
      strengths.push('وعي جيد بطبيعة هذا الجانب واستعداد للتطور');
    } else {
      strengths.push('الاعتراف الصادق بالحاجة للتغيير هي أول خطوة نحو التعافي');
    }
  }

  if (challenges.length === 0) {
    if (score >= 8) {
      challenges.push('الحفاظ على هذا المستوى الرفيع من الأداء دون تراخٍ');
    } else {
      challenges.push('تحويل النوايا إلى خطط أسبوعية محددة بالأرقام والمواعيد');
    }
  }

  return {
    strengths: strengths.slice(0, 3),
    challenges: challenges.slice(0, 3),
  };
};

const USERS_STORAGE_KEY = 'lifebalance_users_v1';

export const DEMO_USER: UserProfile = {
  name: 'ضيف تدبير',
  email: 'demo@tadbeer.ai',
  password: '123456',
  ageGroup: '25 - 34 سنة',
  currentFocus: 'تحقيق التوازن الشامل وتحديد الأولويات',
  registeredAt: new Date().toISOString(),
};

export const getStoredUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const parsed: UserProfile[] = raw ? JSON.parse(raw) : [];
    if (!parsed.some((u) => u.email?.toLowerCase() === DEMO_USER.email?.toLowerCase() || u.name === 'demo')) {
      parsed.push(DEMO_USER);
    }
    return parsed;
  } catch (e) {
    return [DEMO_USER];
  }
};

export const saveStoredUser = (user: UserProfile): void => {
  try {
    const users = getStoredUsers();
    const existingIndex = users.findIndex(
      (u) =>
        (user.email && u.email?.toLowerCase() === user.email.toLowerCase()) ||
        u.name.toLowerCase() === user.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save user account:', e);
  }
};

