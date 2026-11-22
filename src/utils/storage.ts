import { ADVISORS_LIST, SAMPLE_GOALS, SAMPLE_SCORES, SAMPLE_USER_PROFILE } from '../data/advisorsData';
import {
  AdvisorConfig,
  DirectorSummaryReport,
  EisenhowerGoalItem,
  LifeAreaId,
  Screen,
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
  hasCompletedBaseline?: boolean;
  assessmentMode?: 'initial_assessment' | 'weekly_checkin';
  directorReport: DirectorSummaryReport | null;
  lastActiveScreen: Screen;
  selectedAdvisorId: LifeAreaId;
}

export const PRIMARY_STORAGE_KEY = 'wazan_state_v1';
export const LEGACY_STORAGE_KEYS = ['wazan_state_v1', 'lifebalance_state_v1', 'tadbeer_state_v1'];
const STORAGE_KEY = PRIMARY_STORAGE_KEY;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One-time migration on app start:
 * If an old tadbeer_* key exists in localStorage and the new wazan_* key does not,
 * copies the value to the new key, then removes the old key.
 */
export function migrateLegacyStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const prefixOld = 'tadbeer_';
    const prefixNew = 'wazan_';

    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefixOld)) {
        keysToMigrate.push(key);
      }
    }

    for (const oldKey of keysToMigrate) {
      const newKey = prefixNew + oldKey.slice(prefixOld.length);
      const existingNewVal = localStorage.getItem(newKey);
      const oldVal = localStorage.getItem(oldKey);

      if (existingNewVal === null && oldVal !== null) {
        localStorage.setItem(newKey, oldVal);
      }
      localStorage.removeItem(oldKey);
    }
  } catch (err) {
    console.warn('Storage migration skipped or failed:', err);
  } finally {
    cleanupStoredUserPasswords();
  }
}

/**
 * One-time cleanup on app start:
 * Removes any plaintext `password` fields from stored user accounts and saved state
 * in localStorage, replacing them with a safe `hasPassword: true` boolean indicator.
 */
export function cleanupStoredUserPasswords(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // 1. Clean user collections across all legacy and current keys
    for (const key of LEGACY_USERS_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            let modified = false;
            const sanitized = parsed
              .filter((item: any) => {
                // إزالة أي حسابات وهمية تم إنشاؤها عبر خطأ النموذج الأولي السابق
                if (item?.email && (item.email.includes('@jsjhdc.com') || item.email.includes('dwjwrjv'))) {
                  modified = true;
                  return false;
                }
                return true;
              })
              .map((item: any) => {
                if (item && typeof item === 'object' && 'password' in item) {
                  modified = true;
                  const hasPassword = Boolean(
                    item.hasPassword || (item.password && String(item.password).trim().length > 0)
                  );
                  const { password: _p, ...clean } = item;
                  return { ...clean, hasPassword };
                }
                return item;
              });
            if (modified) {
              localStorage.setItem(key, JSON.stringify(sanitized));
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Clean app state user profile if password was persisted or if bogus test account was active
    for (const stateKey of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(stateKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.userProfile) {
            if (parsed.userProfile.email && (parsed.userProfile.email.includes('@jsjhdc.com') || parsed.userProfile.email.includes('dwjwrjv'))) {
              parsed.userProfile = null;
              localStorage.setItem(stateKey, JSON.stringify(parsed));
            } else if ('password' in parsed.userProfile) {
              const hasPassword = Boolean(
                parsed.userProfile.hasPassword ||
                (parsed.userProfile.password && String(parsed.userProfile.password).trim().length > 0)
              );
              const { password: _p, ...cleanProfile } = parsed.userProfile;
              parsed.userProfile = { ...cleanProfile, hasPassword };
              localStorage.setItem(stateKey, JSON.stringify(parsed));
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Reset legacy completedAdvisors (8/8) so weekly assessment starts fresh and uncompleted
    for (const stateKey of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(stateKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.completedAdvisors) && parsed.completedAdvisors.length >= 8) {
            parsed.completedAdvisors = [];
            parsed.completedDates = {};
            parsed.answers = {};
            localStorage.setItem(stateKey, JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }
      }
    }

    // 4. Always clear old assessment caches (chats, insights, and current advisor)
    try {
      localStorage.removeItem('wazan_eval_insights');
      localStorage.removeItem('wazan_eval_chats');
      localStorage.removeItem('wazan_current_eval_advisor');
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Password cleanup skipped or failed:', err);
  }
}

/**
 * Checks if an advisor is locked for the current week (7 days lock)
 * In development, testing, and continuous weekly cycles, allowReassessment defaults to true
 * to allow non-blocking inspection and dynamic re-evaluation.
 */
export const isAdvisorWeeklyLocked = (
  advisorId: string,
  completedDates?: Record<string, number>,
  allowReassessment: boolean = true
): boolean => {
  if (allowReassessment) return false;
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
    migrateLegacyStorage();
    let raw: string | null = null;
    let sourceKey = STORAGE_KEY;

    for (const key of LEGACY_STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val) {
        raw = val;
        sourceKey = key;
        break;
      }
    }

    if (!raw) return getDefaultInitialState();
    const parsed = JSON.parse(raw);

    // Reset legacy demo profiles if found
    if (
      parsed.userProfile?.name?.includes('عبدالرحمن') ||
      parsed.userProfile?.email?.toLowerCase() === 'demo@tadbeer.ai'
    ) {
      return getDefaultInitialState();
    }
    // Migrate old demo email ending with .ai or legacy domain to demo@wazan.com
    if (
      parsed.userProfile?.email?.toLowerCase() === 'demo@wazan.ai' ||
      parsed.userProfile?.email?.toLowerCase() === 'demo@tadbeer.ai'
    ) {
      parsed.userProfile.email = 'demo@wazan.com';
    }

    const merged = {
      ...getDefaultInitialState(),
      ...parsed,
    };

    // Ensure weekly assessment starts fresh with no saved previous answers
    if (merged.completedAdvisors && (merged.completedAdvisors.length === 0 || merged.completedAdvisors.length >= 8)) {
      merged.completedAdvisors = [];
      merged.completedDates = {};
      merged.answers = {};
    }

    // Ensure state is written to primary wazan key if loaded from a legacy key
    if (sourceKey !== STORAGE_KEY) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
    }

    return merged;
  } catch (e) {
    console.error('Failed to load local storage state:', e);
    return getDefaultInitialState();
  }
};

export const saveStoredState = (state: StoredAppState): void => {
  try {
    let stateToSave = state;
    if (state.userProfile && 'password' in state.userProfile) {
      const { password, ...cleanProfile } = state.userProfile;
      stateToSave = {
        ...state,
        userProfile: {
          ...cleanProfile,
          hasPassword: Boolean(
            state.userProfile.hasPassword ||
              (password && String(password).trim().length > 0)
          ),
        },
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
};

export const resetStoredState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
    const extraWazanKeys = [
      'wazan_advisor_chats',
      'wazan_eval_chats',
      'wazan_eval_insights',
      'wazan_eisenhower_goals',
      'wazan_eisenhower_timeframe',
      'wazan_current_eval_advisor',
      'wazan_added_goals',
      'wazan_added_hani_goals',
      'wazan_ai_mode',
    ];
    extraWazanKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch (e) {
    console.error('Failed to reset storage:', e);
  }
};

export const SAMPLE_EISENHOWER_GOALS: EisenhowerGoalItem[] = [
  {
    id: 'eisen_1',
    title: 'تثبيت موعد النوم عند 11 مساءً وقطع الشاشات قبلها بـ 45 دقيقة',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'daily',
    areaId: 'health',
    completed: false,
    source: 'advisor',
    advisorName: 'د. ليلى الصحية',
  },
  {
    id: 'eisen_2',
    title: 'جلسة الأحد الأسبوعية للتخطيط المالي وتتبع النفقات',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'weekly',
    areaId: 'financial',
    completed: true,
    source: 'advisor',
    advisorName: 'أ. كمال المالي',
  },
  {
    id: 'eisen_3',
    title: 'عشاء عائلي يومي بدون هواتف للتواصل العميق',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'daily',
    areaId: 'family',
    completed: false,
    source: 'advisor',
    advisorName: 'أ. مريم الأسرية',
  },
  {
    id: 'eisen_4',
    title: 'سداد دفعة بطاقة الائتمان قبل موعد الاستحقاق',
    quadrant: 'q1_urgent_important',
    timeframe: 'weekly',
    areaId: 'financial',
    completed: false,
    source: 'advisor',
    advisorName: 'أ. كمال المالي',
  },
  {
    id: 'eisen_5',
    title: 'تخصيص 30 دقيقة لقراءة كتاب تطبيقات الذكاء الاصطناعي',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'daily',
    areaId: 'learning',
    completed: false,
    source: 'advisor',
    advisorName: 'د. زياد المعرفي',
  },
];

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
    answers: {},
    goals: SAMPLE_GOALS,
    eisenhowerGoals: SAMPLE_EISENHOWER_GOALS,
    completedAdvisors: [],
    completedDates: {},
    hasCompletedBaseline: false,
    assessmentMode: 'weekly_checkin',
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
          name: 'المشي الصباحي 20 دقيقة مع تأمل واستماع لبودكاست',
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
  // If an exact clinical score was already recorded for this advisor, return it directly
  const recordedScore = answers[`${advisor.id}_score`];
  if (typeof recordedScore === 'number' && recordedScore >= 1 && recordedScore <= 10) {
    return Number(recordedScore.toFixed(1));
  }

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
      const weight = Math.min(10, 5 + val.length * 1.5);
      totalScore += weight;
      count++;
    } else if (q.type === 'open_text' && typeof val === 'string' && val.trim().length > 5) {
      // Analyze text sentiment instead of blind hardcoding
      const isNegative = /(سلبي|ضياع|يضيع|تعب|مشاكل|قلق|توتر|ديون|تسويف|خمول|فشل|محبط|مدمر|صفر)/i.test(val);
      const isPositive = /(ممتاز|سكينة|طمأنينة|ورد|انجاز|وفرة|ادخار|شغف|رياضة)/i.test(val);
      totalScore += isNegative ? 3.2 : isPositive ? 8.2 : 5.8;
      count++;
    }
  });

  // Check any text responses recorded during the evaluation
  Object.keys(answers).forEach((k) => {
    if (k.startsWith(`${advisor.id}_response_`) && typeof answers[k] === 'string') {
      const resp = answers[k];
      const isNegative = /(سلبي|ضياع|يضيع|تعب|مشاكل|قلق|توتر|ديون|تسويف|خمول|فشل|محبط|مدمر|صفر)/i.test(resp);
      const isPositive = /(ممتاز|سكينة|طمأنينة|ورد|انجاز|وفرة|ادخار|شغف|رياضة)/i.test(resp);
      totalScore += isNegative ? 2.8 : isPositive ? 8.2 : 5.4;
      count++;
    }
  });

  if (count === 0) return 6.0;
  const avg = totalScore / count;
  return Number(Math.max(1.5, Math.min(9.8, avg)).toFixed(1));
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
    const cleanTitle = q.title
      .replace(/^ما مدى |^إلى أي مدى |^كيف تقيم |^ما هو |^ما هي |^كيف تصف /i, '')
      .replace(/[؟?]+$/g, '')
      .trim();

    if (q.type === 'rating' && typeof val === 'number') {
      if (val >= 8) {
        strengths.push(`${cleanTitle}: تقييم مرتفع (${val}/10)`);
      } else if (val <= 5) {
        challenges.push(`${cleanTitle}: يحتاج لرفع المستوى (${val}/10)`);
      }
    } else if (q.type === 'open_text' && typeof val === 'string' && val.trim().length > 3) {
      const cleanVal = val.replace(/[؟?]+$/g, '').trim();
      challenges.push(`التحدي المذكور: "${cleanVal.slice(0, 70)}${cleanVal.length > 70 ? '...' : ''}"`);
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

export const PRIMARY_USERS_KEY = 'wazan_users_v1';
export const LEGACY_USERS_KEYS = ['wazan_users_v1', 'lifebalance_users_v1', 'tadbeer_users_v1'];
const USERS_STORAGE_KEY = PRIMARY_USERS_KEY;

export const DEMO_USER: UserProfile = {
  name: 'سعود المنصور',
  email: 'demo@wazan.com',
  password: '123456',
  ageGroup: '30 - 39 سنة',
  currentFocus: 'تحقيق التوازن الشامل والارتقاء بالأداء المهني والصحي',
  registeredAt: new Date().toISOString(),
};

export const getStoredUsers = (): UserProfile[] => {
  try {
    migrateLegacyStorage();
    let raw: string | null = null;
    let sourceKey = USERS_STORAGE_KEY;

    for (const key of LEGACY_USERS_KEYS) {
      const val = localStorage.getItem(key);
      if (val) {
        raw = val;
        sourceKey = key;
        break;
      }
    }

    const parsed: UserProfile[] = raw ? JSON.parse(raw) : [];

    // Filter out bogus test accounts and strip password from parsed users and set hasPassword
    const sanitizedList: UserProfile[] = parsed
      .filter((u) => !u.email?.includes('@jsjhdc.com') && !u.email?.includes('dwjwrjv'))
      .map((u) => {
        const hasPassword = Boolean(
          u.hasPassword || (u.password && String(u.password).trim().length > 0)
        );
        const { password: _p, ...clean } = u;
        return { ...clean, hasPassword };
      });

    const demoIdx = sanitizedList.findIndex(
      (u) =>
        u.email?.toLowerCase() === 'demo@wazan.com' ||
        u.email?.toLowerCase() === 'demo@wazan.ai' ||
        u.email?.toLowerCase() === 'demo@tadbeer.ai' ||
        u.name === 'demo' ||
        u.name === 'wazan' ||
        u.name === 'سعود المنصور'
    );

    // DEMO_USER has password in code constant, but never written to localStorage
    const safeDemoUser: UserProfile = {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      hasPassword: true,
      ageGroup: DEMO_USER.ageGroup,
      currentFocus: DEMO_USER.currentFocus,
      registeredAt: DEMO_USER.registeredAt,
    };

    if (demoIdx >= 0) {
      sanitizedList[demoIdx] = { ...sanitizedList[demoIdx], ...safeDemoUser };
    } else {
      sanitizedList.push(safeDemoUser);
    }

    // Standardize saved users under primary wazan key without plaintext passwords
    if (sourceKey !== USERS_STORAGE_KEY || raw?.includes('"password"')) {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(sanitizedList));
      } catch {
        // ignore
      }
    }

    return sanitizedList;
  } catch (e) {
    const safeDemoUser: UserProfile = {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      hasPassword: true,
      ageGroup: DEMO_USER.ageGroup,
      currentFocus: DEMO_USER.currentFocus,
      registeredAt: DEMO_USER.registeredAt,
    };
    return [safeDemoUser];
  }
};

export const saveStoredUser = (user: UserProfile): void => {
  try {
    // Normalize demo email if legacy domain is passed
    if (
      user.email?.toLowerCase() === 'demo@wazan.ai' ||
      user.email?.toLowerCase() === 'demo@tadbeer.ai'
    ) {
      user.email = 'demo@wazan.com';
    }

    const hasPassword = Boolean(
      user.hasPassword ||
        (typeof user.password === 'string' && user.password.trim().length > 0)
    );

    const { password: _p, ...cleanUser } = user;
    const safeUser: UserProfile = {
      ...cleanUser,
      hasPassword,
      password: undefined,
    };

    const users = getStoredUsers();
    const existingIndex = users.findIndex(
      (u) =>
        (safeUser.email && u.email?.toLowerCase() === safeUser.email.toLowerCase()) ||
        u.name.toLowerCase() === safeUser.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...safeUser };
    } else {
      users.push(safeUser);
    }

    // Ensure absolutely NO user in array has plaintext password when saved
    const safeUsersToSave = users.map((u) => {
      const { password: _pwd, ...sanitized } = u;
      return sanitized;
    });

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(safeUsersToSave));
  } catch (e) {
    console.error('Failed to save user account:', e);
  }
};

export const CREDENTIALS_STORAGE_KEY = 'wazan_credentials_store_v1';

/**
 * توليد تجزئة آمنة لكلمة المرور (Secure Client-side Password Hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = `${password.trim()}__wazan_secure_salt_2026__`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(salted);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

/**
 * جلب سجل بيانات الاعتماد المشفرة
 */
export function getStoredCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * حفظ تجزئة كلمة المرور لمستخدم مسجل
 */
export function saveUserCredential(identifier: string, hash: string): void {
  try {
    const creds = getStoredCredentials();
    creds[identifier.toLowerCase().trim()] = hash;
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error('Failed to save user credential:', e);
  }
}

/**
 * التحقق الحقيقي من صحة كلمة المرور
 */
export async function verifyUserPassword(identifier: string, password: string): Promise<boolean> {
  const cleanId = identifier.trim().toLowerCase();
  const pass = password.trim();

  // الحساب التجريبي الافتراضي (سعود المنصور)
  const isDemo =
    cleanId === 'demo' ||
    cleanId === 'wazan' ||
    cleanId === 'demo@wazan.com' ||
    cleanId === 'demo@wazan.ai' ||
    cleanId === 'demo@tadbeer.ai' ||
    cleanId === 'سعود المنصور';

  if (isDemo) {
    return pass === '123456';
  }

  const users = getStoredUsers();
  const user = users.find(
    (u) =>
      (u.email && u.email.toLowerCase() === cleanId) ||
      u.name.toLowerCase() === cleanId
  );

  // إذا كان المستخدم غير موجود أصلاً في النظام، يُرفض فوراً
  if (!user) {
    return false;
  }

  const creds = getStoredCredentials();
  const userEmailKey = (user.email || '').toLowerCase().trim();
  const userNameKey = user.name.toLowerCase().trim();
  const storedHash = creds[userEmailKey] || creds[userNameKey] || creds[cleanId];

  // إذا وُجدت تجزئة لكلمة المرور مسجلة مسبقاً، يجب تطابقها
  if (storedHash) {
    const computedHash = await hashPassword(pass);
    return computedHash === storedHash;
  }

  // إذا كان الحساب مسجلاً مسبقاً بدون تجزئة، يتم حفظ كلمة المرور الآن إن كانت 3 خانات فأكثر
  if (pass.length >= 3) {
    const newHash = await hashPassword(pass);
    if (userEmailKey) saveUserCredential(userEmailKey, newHash);
    saveUserCredential(userNameKey, newHash);
    return true;
  }

  return false;
}

/**
 * حذف مستخدم
 */
export function removeStoredUser(identifier: string): void {
  try {
    const cleanId = identifier.trim().toLowerCase();
    const users = getStoredUsers();
    const filtered = users.filter(
      (u) =>
        u.email?.toLowerCase() !== cleanId &&
        u.name.toLowerCase() !== cleanId
    );
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));

    const creds = getStoredCredentials();
    delete creds[cleanId];
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error('Failed to remove stored user:', e);
  }
}


