import {
  ChatMessage,
  DirectorSummaryReport,
  EisenhowerGoalItem,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';
import {
  generateThirtyDayPlan,
  saveThirtyDayPlanToStorage,
} from './thirtyDayPlanGenerator';
import { saveStoredState, saveStoredUser, StoredAppState } from './storage';
import { INITIAL_EISENHOWER_GOALS } from '../components/eisenhower/initialGoals';

export const DEMO_STORAGE_FLAG_KEY = 'wazan_is_demo_mode';

export const DEMO_USER_PROFILE: UserProfile = {
  name: 'سعود المنصور',
  email: 'demo@wazan.com',
  ageGroup: '30-39',
  currentFocus: 'تحقيق توازن نوعي بين متطلبات العمل التقني، والسكينة الروحية، وجودة الحضور الأسري والصحي',
  registeredAt: '2026-01-15T08:00:00.000Z',
  employmentStatus: 'موظف قطاع خاص (دوام كامل)',
  workStatus: 'موظف قطاع خاص (دوام كامل)',
  hasDependents: 'نعم (أسرة مكونة من 4 أفراد)',
  incomeSource: 'راتب شهري أساسي + حوافز سنوية',
  incomeStability: 'نعم (دخل ثابت)',
  hasPassword: true,
};

// Realistic, non-uniform scores across all 8 life domains (Harmonious profile)
export const DEMO_SCORES: Record<LifeAreaId, number> = {
  spiritual: 8.9,
  financial: 8.4,
  career: 8.7,
  personal: 8.3,
  learning: 8.5,
  family: 8.6,
  social: 8.0,
  health: 8.1,
};

export const DEMO_COMPLETED_ADVISORS: LifeAreaId[] = [
  'spiritual',
  'financial',
  'career',
  'personal',
  'learning',
  'family',
  'social',
  'health',
];

export const DEMO_GOALS: Record<LifeAreaId, string[]> = {
  spiritual: [
    'خلوة تأملية يومية 15 دقيقة بعد صلاة الفجر',
    'قراءة وتدبر حزب من القرآن الكريم يومياً',
    'جلسة تفكر أسبوعية في الطبيعة',
  ],
  financial: [
    'تغذية صندوق الطوارئ ليصل لمصروف 6 أشهر (30,000 ريال)',
    'استقطاع 20% آلياً يوم نزول الراتب للصناديق الاستثمارية',
    'سداد بطاقتي الائتمان بالكامل لتجنب أي رسوم',
  ],
  career: [
    'تسليم المسودة النهائية لمشروع التحول الرقمي بالعمل',
    'أتمتة إعداد التقارير الأسبوعية بمساعدة الذكاء الاصطناعي',
    'عقد ورشة عمل لنقل المعرفة لفريق العمل',
  ],
  personal: [
    'تطبيق طقس الإغلاق الرقمي وقطع الشاشات قبل النوم بـ 45 دقيقة',
    'تدوين 3 نعم يومية في مذكرة الامتنان',
    'إيقاف إشعارات وسائل التواصل وقت العمل العميق',
  ],
  learning: [
    'دراسة 3 ساعات أسبوعياً في معمارية وتطبيقات الذكاء الاصطناعي',
    'قراءة 20 صفحة يومياً من كتاب القيادة الاستراتيجية',
    'حضور بودكاست معرفي مرتين أسبوعياً أثناء المشي',
  ],
  family: [
    'عشاء عائلي يومي بدون شاشات للتواصل العميق',
    'رحلة نهاية الأسبوع في الطبيعة مع الأبناء',
    'جلسة حوار أسبوعية هادئة مع شريك الحياة',
  ],
  social: [
    'صلة الرحم وزيارة الوالدين مرتين أسبوعياً بانتظام',
    'لقاء نوعي شهري مع شبكة من الرواد والمفكرين',
    'الاعتذار اللبق عن الجلسات المسائية المستنزفة',
  ],
  health: [
    'شرب 3 لترات ماء والمشي 8,000 خطوة يومياً',
    'تثبيت موعد النوم عند الحادية عشرة مساءً لضمان 7 ساعات راحة',
    'إجراء الفحص الدوري الشامل وتحاليل الضغط والسكر',
  ],
};

export const DEMO_DIRECTOR_REPORT: DirectorSummaryReport = {
  overallDiagnosis:
    'تظهر منظومة حياتك نضجاً وتناغماً استثنائياً؛ حيث توفر السكينة الروحية والوضوح المهني ركيزة قيادية صلبة لبقية جوانب حياتك. نقاط التوازن تعكس التزاماً واعياً، بينما يظل التحدي الأساسي هو حماية جودة النوم وأوقات التعافي البدني من تسلل ضغوط العمل السريعة.',
  balanceIndexLabel: 'منظومة متقدمة ومتناغمة (مستوى نضج قيادي)',
  strongestSynergy: {
    title: 'تكامل السكينة الروحية مع الإنتاجية المهنية',
    description:
      'وضوح بوصلتك القيمية وسلامك القلبي يمنحانك حضوراً ذهنياً فائقاً وقدرة عالية على اتخاذ القرارات الحاسمة بهدوء واتزان داخل بيئة العمل.',
    domainsInvolved: ['الجانب الروحي', 'الجانب المهني'],
  },
  criticalBottleneck: {
    title: 'حماية وقت التعافي والنوم العميق',
    impact:
      'تأخير موعد النوم بسبب مراجعة رسائل العمل يقلل من كفاءة التعافي العصبي بنسبة 25%، مما يفرض ضغطاً غير محسوس على المزاج الصباحي.',
    recommendation:
      'تثبيت طقس الإغلاق الرقمي في العاشرة والربع مساءً وجعل غرفة النوم خالية تماماً من الشاشات الذكية.',
    domain: 'الجانب الصحي',
  },
  keystoneHabits: [
    {
      name: 'طقس الإغلاق الرقمي الليلي لنوم 7 ساعات',
      triggerTime: '10:30 مساءً يومياً',
      targetDomains: ['الصحي', 'الأسري', 'الشخصي'],
      expectedImpact: 'رفع طاقة الصباح الذهنية بنسبة 35% والقضاء على إجهاد الظهيرة.',
    },
    {
      name: 'المشي الصباحي 25 دقيقة مع الاستماع لبودكاست نوعي',
      triggerTime: '6:30 صباحاً',
      targetDomains: ['الصحي', 'المعرفي', 'الروحي'],
      expectedImpact: 'تنشيط الدورة الدموية وإتمام 10 كتب سنوياً في التفكير الاستراتيجي.',
    },
    {
      name: 'جلسة الأحد الأسبوعية للميزانية وتتبع الأهداف',
      triggerTime: 'عصر كل أحد لمدة 20 دقيقة',
      targetDomains: ['المالي', 'الشخصي', 'المهني'],
      expectedImpact: 'الحفاظ على فائض ادخاري بنسبة 20% ومتابعة أهداف مصفوفة أيزنهاور.',
    },
  ],
  thirtyDayRoadmap: [
    {
      weekNumber: 1,
      weekTitle: 'أسبوع استعادة الطاقة والحماية البدنية',
      coreFocus: 'تثبيت روتين النوم العميق وشرب الماء المنعش ومشي 8000 خطوة يومياً.',
      actions: [
        'إبعاد الهاتف عن غرفة النوم عند العاشرة والنصف مساءً',
        'شرب 500 مل ماء فور الاستيقاظ والمشي الصباحي 20 دقيقة',
        'إلغاء 3 اشتراكات رقمية غير مستخدمة لوقف التسرب المالي',
      ],
    },
    {
      weekNumber: 2,
      weekTitle: 'أسبوع الانضباط المالي وتنقية الالتزامات',
      coreFocus: 'تأكيد أمر الاستقطاع الآلي لصندوق الطوارئ وتنظيم ميزانية الشهر.',
      actions: [
        'تفعيل الاستقطاع التلقائي بنسبة 20% لحساب الاستثمار والطوارئ',
        'جلسة عائلية مسائية بدون شاشات للاتفاق على أولويات الأسرة',
        'مراجعة أولويات العمل وتفويض مهمتين روتينيتين',
      ],
    },
    {
      weekNumber: 3,
      weekTitle: 'أسبوع التمكين والحدود الشخصية',
      coreFocus: 'وضع حدود واضحة لمنع استنزاف الساعات غير المنتجة وتطوير مهارات الذكاء الاصطناعي.',
      actions: [
        'الاعتذار بذكاء عن المناسبات الاجتماعية المرهقة لحماية وقت النوم',
        'تخصيص 45 دقيقة يومياً للتطبيق العملي في أدوات الذكاء الاصطناعي',
        'جلسة استشارية نوعية مع م. طارق المهني لترتيب الربع القادم',
      ],
    },
    {
      weekNumber: 4,
      weekTitle: 'أسبوع المراجعة وتثبيت التناغم الشامل',
      coreFocus: 'قياس التقدم وتجديد عجلة الحياة والاحتفاء بالانتصارات التراكمية.',
      actions: [
        'مقارنة درجات عجلة الحياة ورصد التحسن في الجانبين الصحي والمالي',
        'مكافأة ذاتية هادئة مع الأسرة في الطبيعة',
        'اعتماد خريطة الـ 30 يوماً القادمة بثقة واستدامة',
      ],
    },
  ],
  directorGoldenRule:
    'التوازن ليس أن تمنح كل جانب نفس الساعات الميكانيكية، بل أن تحضر في كل لحظة بوعي كامل وقلب حاضر دون أن يطغى جانب فيهدم ما بنيته في بقية الجوانب.',
  generatedAt: new Date().toISOString(),
};

// Rich pre-filled Eisenhower tasks across 4 quadrants
export const DEMO_EISENHOWER_GOALS: EisenhowerGoalItem[] = [
  ...INITIAL_EISENHOWER_GOALS,
  {
    id: 'demo_eisen_1',
    title: 'مراجعة أولويات اليوم (3 مهام أساسية) في دفتر التخطيط قبل فتح البريد',
    quadrant: 'q1_urgent_important',
    timeframe: 'daily',
    areaId: 'career',
    completed: true,
    source: 'advisor',
    advisorName: 'م. طارق المهني',
    isFocus: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo_eisen_2',
    title: 'سداد دفعة بطاقة الائتمان قبل تاريخ الاستحقاق لتفادي الرسوم',
    quadrant: 'q1_urgent_important',
    timeframe: 'weekly',
    areaId: 'financial',
    completed: true,
    source: 'advisor',
    advisorName: 'أ. كمال المالي',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'demo_eisen_3',
    title: 'المشي الصباحي 30 دقيقة 4 أيام أسبوعياً مع تدبر سورة الكهف',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'weekly',
    areaId: 'spiritual',
    completed: false,
    source: 'advisor',
    advisorName: 'د. سفيان الروحي',
    isFocus: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'demo_eisen_4',
    title: 'دراسة 3 ساعات أسبوعياً في نماذج الذكاء الاصطناعي التوليدي',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'monthly',
    areaId: 'learning',
    completed: false,
    source: 'advisor',
    advisorName: 'بروفيسور زياد المعرفي',
    isFocus: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_eisen_5',
    title: 'تخصيص أمر مستديم بنسبة 20% لصندوق الطوارئ والاستثمار الآمن',
    quadrant: 'q2_important_not_urgent',
    timeframe: 'monthly',
    areaId: 'financial',
    completed: true,
    source: 'user',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'demo_eisen_6',
    title: 'أتمتة شراء التموينات الدورية عبر تطبيقات التوصيل الذكية',
    quadrant: 'q3_urgent_not_important',
    timeframe: 'weekly',
    areaId: 'personal',
    completed: true,
    source: 'advisor',
    advisorName: 'د. ليلى الذاتية',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'demo_eisen_7',
    title: 'تقليص وقت التصفح العشوائي للهاتف بعد التاسعة مساءً بحد أقصى 20 دقيقة',
    quadrant: 'q4_not_urgent_not_important',
    timeframe: 'daily',
    areaId: 'personal',
    completed: false,
    source: 'advisor',
    advisorName: 'د. ليلى الذاتية',
    isFocus: true,
    createdAt: new Date().toISOString(),
  },
];

// Free Consultation rooms start clean (empty) with only the advisor's brief welcome message
export const DEMO_ADVISOR_CHATS: Record<string, ChatMessage[]> = {};

/**
 * Activates Demo Mode for live presentations / weekly task workflow:
 * - Basic profile is pre-filled so the presenter skips tedious signup.
 * - The current weekly assessment / check-in is ACTIVE and OPEN (0/8 completed) so the presenter can execute it live.
 * - Historical baseline data is preserved for comparison charts and previous-week analytics.
 */
export function activateDemoMode(): StoredAppState {
  const sampleAnswers: Record<string, any> = {};

  // Generate 30-day interactive plan with the first 12 days completed as historical momentum
  const plan = generateThirtyDayPlan(DEMO_SCORES);
  if (plan && Array.isArray(plan.days)) {
    plan.days = plan.days.map((day, idx) => {
      if (idx < 12) {
        return {
          ...day,
          isCompleted: true,
          completedAt: Date.now() - (12 - idx) * 86400000,
        };
      }
      return day;
    });
    plan.currentDay = 13;
    saveThirtyDayPlanToStorage(plan);
  }

  const demoState: StoredAppState = {
    userProfile: DEMO_USER_PROFILE,
    scores: {
      spiritual: 0,
      financial: 0,
      career: 0,
      personal: 0,
      learning: 0,
      family: 0,
      social: 0,
      health: 0,
    },
    answers: sampleAnswers,
    goals: {
      spiritual: [],
      financial: [],
      career: [],
      personal: [],
      learning: [],
      family: [],
      social: [],
      health: [],
    },
    eisenhowerGoals: DEMO_EISENHOWER_GOALS,
    completedAdvisors: [], // Start with 0/8 completed for live demonstration
    completedDates: {},
    hasCompletedBaseline: true, // Baseline is completed so user is in regular active weekly check-in mode
    assessmentMode: 'weekly_checkin',
    directorReport: null,
    lastActiveScreen: 'onboarding', // Take the presenter straight into the live interactive station
    selectedAdvisorId: 'spiritual',
    thirtyDayPlan: plan,
  };

  // Persist demo state
  saveStoredState(demoState);
  saveStoredUser(DEMO_USER_PROFILE);

  try {
    localStorage.setItem(DEMO_STORAGE_FLAG_KEY, 'true');
    localStorage.setItem('wazan_advisor_chats', JSON.stringify(DEMO_ADVISOR_CHATS));
    localStorage.setItem('wazan_eisenhower_goals', JSON.stringify(DEMO_EISENHOWER_GOALS));
    localStorage.setItem('wazan_eisenhower_timeframe', 'weekly');
    localStorage.setItem('wazan_ai_mode', 'balanced');
    // Clear any previous station cache so the spiritual station starts fresh
    localStorage.removeItem('wazan_advisor_spiritual_completed');
  } catch (err) {
    console.warn('Failed to save demo chats/goals to localStorage:', err);
  }

  return demoState;
}

/**
 * Checks whether Demo Mode is currently active
 */
export function isDemoModeActive(): boolean {
  try {
    return localStorage.getItem(DEMO_STORAGE_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Exits Demo Mode and clears the demo flag
 */
export function exitDemoMode(): void {
  try {
    localStorage.removeItem(DEMO_STORAGE_FLAG_KEY);
  } catch {
    // ignore
  }
}
