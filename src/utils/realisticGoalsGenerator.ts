import { LifeAreaId, UserProfile } from '../types/lifeBalance';
import { parseUserContext, ParsedUserContext } from './contextPersonalization';
import { extractEmergencyFundStatus } from './dialogueDeduplication';

export interface DialogueConstraints {
  workHours: number | null;
  sleepHours: number | null;
  hasLongWorkShift: boolean;
  hasShortSleep: boolean;
  compensatesOnWeekend: boolean;
  mentionsDebt: boolean;
  mentionsNoDebt: boolean;
  mentionsIncomeLeak: boolean;
  mentionsSavingDesire: boolean;
  mentionsIsolationOrFatigue: boolean;
  mentionsDistractionOrPhone: boolean;
  userProposedCommitments: string[];
  rawText: string;
}

/**
 * Extracts genuine user-written dialogue messages for a specific station from stored answers and live messages.
 */
export function extractUserDialogueTextsForArea(
  areaId: LifeAreaId | string,
  answers?: Record<string, any>,
  messages?: Array<{ sender?: string; role?: string; text?: string; content?: string }>
): string[] {
  const texts: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (raw: any) => {
    if (typeof raw !== 'string') return;
    const clean = raw.trim();
    if (!clean || clean.length < 3) return;
    if (/^(?:اعتمد\s*التقييم|نعم\s*اعتمد|تقييمي:\s*\d+(?:\.\d+)?\s*(?:من|\/)\s*10)$/i.test(clean)) return;
    if (!seen.has(clean)) {
      seen.add(clean);
      texts.push(clean);
    }
  };

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (!m) continue;
      if (m.sender === 'user' || m.role === 'user') {
        pushUnique(m.text ?? m.content);
      }
    }
  }

  if (answers && typeof answers === 'object') {
    const responseKeys = Object.keys(answers)
      .filter((k) => k.startsWith(`${areaId}_response_`) || k === `${areaId}_q5`)
      .sort((a, b) => {
        const na = parseInt(a.replace(/\D+/g, ''), 10) || 0;
        const nb = parseInt(b.replace(/\D+/g, ''), 10) || 0;
        return na - nb;
      });
    for (const key of responseKeys) {
      pushUnique(answers[key]);
    }
  }

  return texts;
}

/**
 * Parses realistic life/time/financial/health constraints directly from what the user actually said.
 */
export function parseDialogueConstraints(
  userTexts: string[],
  userProfile?: Partial<UserProfile> | null
): DialogueConstraints {
  const rawText = (userTexts || []).join(' ');
  const lower = rawText.toLowerCase();

  let workHours: number | null = null;
  const workMatch =
    rawText.match(/(?:أعمل|اعمل|دوام|أداوم|اداوم|عمل(?:ي)?|شغل(?:ي)?)\s*(?:لمدة\s*)?(\d{1,2})\s*ساع(?:ة|ات)/i) ||
    rawText.match(/(\d{1,2})\s*ساع(?:ة|ات)\s*(?:عمل|دوام|شغل)/i);
  if (workMatch) {
    const val = parseInt(workMatch[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 20) workHours = val;
  }

  let sleepHours: number | null = null;
  const sleepMatch =
    rawText.match(/(?:أنام|انام|نوم(?:ي)?)\s*(?:فقط\s*)?(\d{1,2})\s*ساع(?:ة|ات)/i) ||
    rawText.match(/(\d{1,2})\s*ساع(?:ة|ات)\s*نوم/i);
  if (sleepMatch) {
    const val = parseInt(sleepMatch[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 14) sleepHours = val;
  }

  const hasLongWorkShift =
    (workHours !== null && workHours >= 10) ||
    /(?:دوام\s*طويل|ساعات\s*عمل\s*طويلة|مناوبات|ورديات|ضغط\s*عمل\s*شديد)/i.test(lower);

  const hasShortSleep =
    (sleepHours !== null && sleepHours <= 5.5) ||
    /(?:قلة\s*نوم|نوم\s*قليل|لا\s*أنام|ما\s*أنام|سهر\s*شديد|أنام\s*ساعات\s*متقطعة)/i.test(lower);

  const compensatesOnWeekend =
    /(?:نهاية\s*الأسبوع|نهاية\s*الاسبوع|الويكند|العطلة|يوم\s*الجمعة|أعوض\s*النوم|اعوض\s*النوم|تعويض\s*النوم)/i.test(
      lower
    );

  const mentionsNoDebt =
    /(?:بدون\s*ديون|لا\s*(?:يوجد|توجد|يوجد\s*لدي|توجد\s*علي[ّ]?|يوجد\s*علي[ّ]?|لدي|عندي)\s*(?:أي\s*)?(?:ديون|أقساط)|ليس(?:ت)?\s*(?:لدي|عندي|علي[ّ]?)\s*(?:أي\s*)?(?:ديون|أقساط)|ما\s*(?:عندي|علي[ّ]?)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون|خلو\s*(?:سجلي\s*)?من\s*الديون)/i.test(
      lower
    );

  const mentionsDebt =
    !mentionsNoDebt &&
    /(?:قرض|قروض|بطاقة\s*ائتمان|بطاقات\s*ائتمان|فيزا|ماستركارد|أقساط|اقساط|تراكم\s*الديون|سداد\s*ديون|(?:لدي|عندي|علي|عليّ)\s*دين|(?<!لا\s+(?:توجد|يوجد)\s+)(?:لدي|عندي|علي|عليّ)\s*ديون)/i.test(
      lower
    );

  const mentionsIncomeLeak =
    /(?:تسرب|كماليات|ينفد|يخلص\s*بسرعة|لا\s*أدخر|لا\s*ادخر|عجز|ما\s*يكفي|بدون\s*ادخار)/i.test(
      lower
    );

  const mentionsSavingDesire =
    /(?:ادخار|أدخر|ادخر|أوفر|اوفر|توفير|صندوق\s*طوارئ|صمام\s*أمان|أتمتة)/i.test(lower);

  const mentionsIsolationOrFatigue =
    /(?:فتور|انعزال|عزلة|وحيد|وحدة|قطيعة|قلة\s*تواصل|تعب|إرهاق|ارهاق|انشغال|ضغط)/i.test(
      lower
    );

  const mentionsDistractionOrPhone =
    /(?:هاتف|جوال|شاشات|شاشة|مواقع\s*التواصل|تشتت|إشعارات|اشعارات)/i.test(lower);

  // Extract explicit micro-steps / proposals mentioned by the user
  const proposalPattern =
    /(?:^|\s)(?:سأخصص|ساخصص|سأبدأ|سابدا|سأجرب|ساجرب|سأحاول|ساحاول|سألتزم|سالتزم|سأنظم|سانظم|سأتواصل|ساتواصل|سأمشي|سامشي|سأقرأ|ساقرا|سأدخر|سادخر|سأوفر|ساوفر|سأغلق|ساغلق|أخطط|اخطط|أنوي|انوي|قررت)(?:\s|$)/i;
  const userProposedCommitments: string[] = [];
  for (const txt of userTexts || []) {
    const clean = txt.trim();
    if (
      clean.length >= 10 &&
      clean.length <= 160 &&
      !/^(?:أرغب في الاستمرار|اعتمد|نعم)/i.test(clean) &&
      proposalPattern.test(clean)
    ) {
      userProposedCommitments.push(clean);
    }
  }

  void userProfile;

  return {
    workHours,
    sleepHours,
    hasLongWorkShift,
    hasShortSleep,
    compensatesOnWeekend,
    mentionsDebt,
    mentionsNoDebt,
    mentionsIncomeLeak,
    mentionsSavingDesire,
    mentionsIsolationOrFatigue,
    mentionsDistractionOrPhone,
    userProposedCommitments,
    rawText,
  };
}

/**
 * Checks whether a candidate goal contradicts real constraints or fabricates unstated facts.
 */
export function isGoalConsistentWithReality(
  goal: string,
  areaId: LifeAreaId | string,
  constraints: DialogueConstraints,
  ctx: ParsedUserContext
): boolean {
  if (!goal || typeof goal !== 'string') return false;
  const clean = goal.trim();
  if (clean.length < 6) return false;

  // 1. Health anti-contradiction: never prescribe unrealistic fixed 7h/11pm sleep or heavy workouts under extreme work/short-sleep constraints
  if (areaId === 'health' && (constraints.hasLongWorkShift || constraints.hasShortSleep || constraints.compensatesOnWeekend)) {
    if (/(?:11\s*مساء|الحادية\s*عشرة|7\s*ساعات|8\s*ساعات|ثلاث\s*لترات|3\s*لترات|8[،,]?000\s*خطوة|جيم\s*يومياً)/i.test(clean)) {
      return false;
    }
  }

  // 2. Financial anti-fabrication: never assume credit cards, loans, or arbitrary SAR figures unless user stated them
  if (areaId === 'financial') {
    if (!constraints.mentionsDebt && /(?:بطاقة\s*ائتمان|بطاقتي\s*الائتمان|ائتمانية|قروض|فيزا)/i.test(clean)) {
      return false;
    }
    if (constraints.mentionsNoDebt && /(?:ديون|قرض|أقساط|اقساط|بطاقة\s*ائتمان)/i.test(clean) && !/(?:تجنب|خلو)/i.test(clean)) {
      return false;
    }
    // Reject fabricated fixed large currency amounts not present in user's own text
    const moneyMatches = clean.match(/\d[\d,،]*\s*(?:ريال|ألف|الف)/gi);
    if (moneyMatches) {
      for (const m of moneyMatches) {
        const digits = m.replace(/\D/g, '');
        if (digits && Number(digits) >= 500 && !constraints.rawText.includes(digits)) {
          return false;
        }
      }
    }
  }

  // 3. Family anti-fabrication: never assume spouse/children if user has no dependents and didn't mention them
  if (areaId === 'family' && !ctx.hasDependents) {
    if (/(?:أبناء|الأبناء|أطفال|أطفالك|شريك\s*الحياة|زوجتك|زوجك|زوجية)/i.test(clean) && !/(?:أبناء|أطفال|زوج)/i.test(constraints.rawText)) {
      return false;
    }
  }

  // 4. Social anti-fabrication: never prescribe fabricated twice-weekly visits or hours unless mentioned
  if (areaId === 'social') {
    if (/(?:مرتين\s*أسبوعياً|4\s*ساعات\s*شهرياً|الرواد\s*والمفكرين)/i.test(clean)) {
      return false;
    }
  }

  // 5. Career anti-mismatch for students / job seekers
  if (areaId === 'career') {
    if (ctx.isStudent && /(?:ترقية|منصب\s*قيادي|فريق\s*العمل|إدارة\s*فريق)/i.test(clean)) {
      return false;
    }
    if (ctx.isJobSeeker && /(?:بريد\s*العمل|مكتبك|فريق\s*العمل|ترقية)/i.test(clean)) {
      return false;
    }
  }

  return true;
}

function cleanUserProposalToGoal(proposal: string): string {
  return proposal
    .replace(/^(?:نعم[،,]?\s*|حسناً[،,]?\s*|بصراحة[،,]?\s*|طيب[،,]?\s*)/i, '')
    .replace(/[.!؟]+$/g, '')
    .trim();
}

export interface RealisticGoalsParams {
  areaId: LifeAreaId;
  userTexts: string[];
  userProfile?: Partial<UserProfile> | null;
  score: number;
  goldenRecommendation?: string;
  challenges?: string[];
  strengths?: string[];
}

/**
 * Generates 2-3 short, actionable, strictly non-contradictory & non-fabricated goals
 * grounded in what the user actually said and their real-life profile constraints.
 */
export function generateRealisticAreaGoals(params: RealisticGoalsParams): string[] {
  const {
    areaId,
    userTexts,
    userProfile,
    goldenRecommendation,
  } = params;

  const ctx = parseUserContext(userProfile);
  const constraints = parseDialogueConstraints(userTexts, userProfile);
  const candidates: string[] = [];

  // 1. Prioritize any explicit user commitment from the conversation
  if (constraints.userProposedCommitments.length > 0) {
    const latest = cleanUserProposalToGoal(
      constraints.userProposedCommitments[constraints.userProposedCommitments.length - 1]
    );
    if (latest.length >= 10 && latest.length <= 120) {
      candidates.push(latest);
    }
  }

  // 2. Include goldenRecommendation if realistic and concise (and avoid verbose wrapper sentences)
  if (goldenRecommendation && goldenRecommendation.trim().length >= 8) {
    const cleanGolden = goldenRecommendation
      .replace(/^تطبيق الخطة التي اقترحتها في الحوار:\s*"?/i, '')
      .replace(/"$/g, '')
      .trim();
    if (cleanGolden.length <= 120) {
      candidates.push(cleanGolden);
    }
  }

  // 3. Domain + constraint-specific realistic goal pools (never fabricate unstated facts)
  const domainPool: string[] = [];

  switch (areaId) {
    case 'health': {
      if (constraints.hasLongWorkShift || constraints.hasShortSleep || constraints.compensatesOnWeekend) {
        domainPool.push(
          constraints.sleepHours !== null
            ? `زيادة النوم تدريجياً بـ 20 إلى 30 دقيقة عن المعدل الحالي (${constraints.sleepHours} ساعات) في الأيام المتاحة`
            : 'إضافة 20 إلى 30 دقيقة نوم تدريجية حسب ساعات العمل المتاحة دون ضغط غير واقعي',
          'إبعاد الشاشات والمنبهات قبل وقت النوم الفعلي بنصف ساعة لتحسين جودة الساعات المتاحة',
          constraints.hasLongWorkShift
            ? 'أخذ استراحة تنفس وإطالة خفيفة 5 دقائق خلال ساعات العمل الطويلة'
            : 'حماية تعافي نهاية الأسبوع وتجنب السهر الإضافي قدر الإمكان'
        );
      } else if (constraints.mentionsDistractionOrPhone) {
        domainPool.push(
          'إيقاف الشاشات قبل النوم بـ 30 دقيقة لتهيئة الجسم لراحة أعمق',
          'المشي الخفيف لمدة 15 إلى 20 دقيقة في الأوقات المناسبة ليومك',
          'شرب الماء بانتظام طوال ساعات اليوم دون تكلف'
        );
      } else {
        domainPool.push(
          'إدخال 15 إلى 20 دقيقة حركة خفيفة أو مشي بما يناسب طاقتك وجدولك',
          'الانتباه لإشارات الإرهاق وتنظيم وقت الراحة المتاح تدريجياً',
          'الحفاظ على شرب الماء بانتظام خلال اليوم'
        );
      }
      break;
    }

    case 'financial': {
      if (constraints.mentionsDebt) {
        domainPool.push(
          'حصر الأقساط والالتزامات الشهرية بدقة وترتيب أولوية السداد',
          'التركيز على التدفق النقدي وتجنب أي التزامات أو أقساط جديدة حالياً',
          'بناء احتياطي طوارئ مصغر يتناسب مع المتبقي بعد الالتزامات'
        );
      } else if (ctx.isStudent) {
        domainPool.push(
          'تتبع المصاريف الجامعية واليومية أسبوعياً لحماية المكافأة أو المصروف حتى نهاية الشهر',
          'تجربة اقتطاع مبلغ رمزي ميسر فور استلام الدخل كصمام أمان أولي',
          'التمييز بين الاحتياجات الدراسية الأساسية والمصاريف الكمالية'
        );
      } else if (constraints.mentionsIncomeLeak) {
        domainPool.push(
          'تسجيل المصروفات اليومية لمدة 7 أيام لكشف مواضع التسرب الفعلية',
          'تحديد سقف أسبوعي للمصاريف المتغيرة والالتزام به بهدوء',
          'تجربة تحويل جزء ميسر إلى حساب منفصل فور نزول الدخل'
        );
      } else if (constraints.mentionsNoDebt || constraints.mentionsSavingDesire) {
        domainPool.push(
          'تخصيص جزء ميسر وثابت للادخار أو الطوارئ في حساب منفصل فور استلام الدخل',
          'مراجعة بنود الصرف الشهرية لحماية الفائض المتاح من التشتت',
          'تنمية احتياطي الطوارئ تدريجياً بما يتناسب مع التزاماتك'
        );
      } else {
        domainPool.push(
          'مراجعة الالتزامات الشهرية والتدفق النقدي لمعرفة الفائض الفعلي بدقة',
          'تدوين المصاريف المتكررة لأسبوع واحد قبل تحديد نسبة الادخار',
          'تخصيص صمام أمان ميسر يناسب ظروف دخلك الحالية'
        );
      }
      break;
    }

    case 'social': {
      if (constraints.hasLongWorkShift || constraints.mentionsIsolationOrFatigue) {
        domainPool.push(
          'إرسال رسالة اطمئنان قصيرة لأحد الأصدقاء المقربين هذا الأسبوع بما يناسب وقتك',
          'تخصيص 15 إلى 20 دقيقة اتصال أو لقاء خفيف عند توفر الطاقة ودون إجهاد',
          'تقليل المجاملات المستنزفة وحماية وقتك للدائرة القريبة المريحة'
        );
      } else {
        domainPool.push(
          'المبادرة بالتواصل الهادئ مع صديق مقرب هذا الأسبوع',
          'التركيز على جودة العلاقات المريحة بدلاً من كثرة التجمعات السطحية',
          'تخصيص وقت واضح ومعتدل للتواصل دون الضغط على جدولك اليومي'
        );
      }
      break;
    }

    case 'family': {
      if (ctx.hasDependents) {
        domainPool.push(
          'تخصيص وقت عائلي يومي قصير خالٍ من الهاتف مع الأسرة',
          'الإنصات الهادئ لاحتياجات الأسرة دون تشتت بمشاغل العمل',
          'ترتيب نشاط عائلي بسيط ومريح في الوقت المتاح أسبوعياً'
        );
      } else {
        domainPool.push(
          'المبادرة باتصال أو جلسة دافئة مع الأهل وفق وقتك المتاح أسبوعياً',
          'التركيز والحضور الذهني الهادئ أثناء الجلوس مع الأهل دون انشغال بالهاتف',
          'الحفاظ على تواصل لطيف ومنتظم يخفف فتور الانشغال اليومي'
        );
      }
      break;
    }

    case 'spiritual': {
      if (constraints.mentionsDistractionOrPhone || constraints.hasLongWorkShift) {
        domainPool.push(
          'تخصيص 5 إلى 10 دقائق هادئة يومياً بعيداً عن الهاتف لاستعادة حضور القلب',
          'ربط لحظة السكينة والذكر بوقت ثابت وخفيف يناسب ضغط يومك',
          'تخفيف تصفح الهاتف قبل النوم لحماية صفاء الذهن والطمأنينة'
        );
      } else {
        domainPool.push(
          'المحافظة على مساحة يومية قصيرة للهدوء والتأمل بقلب حاضر',
          'تخصيص وقت ثابت للأذكار أو القراءة الروحية دون تكلف',
          'تأمل النعم اليومية وتجديد السكينة وسط مشاغل الأسبوع'
        );
      }
      break;
    }

    case 'career': {
      if (ctx.isStudent) {
        domainPool.push(
          'تخصيص وقت منتظم لبناء مهارة عملية أو مشروع بسيط بجانب الدراسة',
          'تقسيم المهام الدراسية إلى جلسات تركيز قصيرة لتجنب التسويف',
          'توضيح الأولويات الأسبوعية بين المقررات والاستعداد لسوق العمل'
        );
      } else if (ctx.isJobSeeker) {
        domainPool.push(
          'تنظيم جدول أسبوعي واقعي لتحديث السيرة الذاتية والتقديم على الفرص المناسبة',
          'تخصيص وقت يومي محدد لتطوير مهارة مطلوبة في مجالك',
          'حماية الهدوء النفسي عبر تقسيم البحث عن عمل لخطوات يومية واضحة'
        );
      } else {
        domainPool.push(
          'تخصيص 30 إلى 45 دقيقة يومياً لأهم مهمة في يومك قبل تشتت المقاطعات',
          'ترتيب قائمة مهام اليوم في أولويات واضحة ومحددة العدد',
          constraints.hasLongWorkShift
            ? 'وضع فاصل واضح لالتقاط الأنفاس وتنظيم المهام وسط ساعات العمل الطويلة'
            : 'تخصيص وقت أسبوعي لتطوير مهارة مهنية تدعم نموك'
        );
      }
      break;
    }

    case 'learning': {
      if (ctx.isStudent) {
        domainPool.push(
          'مراجعة الدروس أولاً بأول عبر جلسات مركزة قصيرة بدلاً من التراكم',
          'تلخيص أهم الأفكار بأسلوبك الخاص بعد كل جلسة استذكار',
          'تقليل مشتتات الهاتف أثناء وقت المذاكرة الأساسي'
        );
      } else {
        domainPool.push(
          'تخصيص 15 إلى 20 دقيقة لقراءة أو تعلّم مهارة واحدة في الأوقات المتاحة',
          'التركيز على مصدر تعليمي واحد حتى إتمامه قبل الانتقال لغيره',
          'تحويل فكرة واحدة مما تتعلمه أسبوعياً إلى تطبيق عملي مباشر'
        );
      }
      break;
    }

    case 'personal':
    default: {
      domainPool.push(
        'الرفق بالذات والتركيز على خطوة يومية صغيرة قابلة للاستمرار دون لوم قاسٍ',
        'تحديد أولوية شخصية واحدة لهذا الأسبوع وحمايتها من التشتت',
        constraints.mentionsDistractionOrPhone || constraints.hasLongWorkShift
          ? 'تخصيص 10 دقائق هادئة لنفسك بعيداً عن الشاشات وضغط المهام'
          : 'وضع حدود هادئة وواضحة تحمي طاقتك النفسية والذهنية'
      );
      break;
    }
  }

  candidates.push(...domainPool);

  const selected: string[] = [];
  const seen = new Set<string>();

  for (const cand of candidates) {
    const trimmed = cand.trim();
    const norm = trimmed.toLowerCase().replace(/[.,!؟?،؛:"'()\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!norm || seen.has(norm)) continue;
    if (!isGoalConsistentWithReality(trimmed, areaId, constraints, ctx)) continue;

    seen.add(norm);
    selected.push(trimmed);
    if (selected.length >= 3) break;
  }

  return selected;
}

/**
 * Checks if a proposed Golden Recommendation is merely copying/quoting a user message verbatim
 * or written in colloquial first-person user voice rather than advisor-voiced guidance.
 */
export function isVerbatimUserCopy(
  candidate: string,
  userTexts: string[] = []
): boolean {
  if (!candidate || typeof candidate !== 'string') return true;
  const clean = candidate.trim();
  if (clean.length < 10) return true;

  // 1. Detect explicit quoting wrappers
  if (/تطبيق\s+الخطة\s+التي\s+اقترحتها/i.test(clean) || /[«"][^»"]{10,}[»"]/.test(clean)) {
    return true;
  }

  // 2. Detect colloquial/raw first-person user phrasing not suitable for an advisor recommendation
  if (/^(?:بصراحة|والله|يعني|صراحة|انا|أنا|عندي|لدي|أحياناً|احياناً|دايماً|ما\s*عندي|سأحاول\s*أن|ودي|ابغى|أبغى)/i.test(clean)) {
    return true;
  }

  // 3. Check exact or high token overlap against raw user utterances
  const normCand = clean
    .toLowerCase()
    .replace(/[.,!؟?،؛:"'()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const candWords = normCand.split(' ').filter((w) => w.length >= 2);
  if (candWords.length === 0) return true;

  for (const u of userTexts) {
    if (!u || typeof u !== 'string') continue;
    const normUser = u
      .toLowerCase()
      .replace(/[.,!؟?،؛:"'()\-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normUser || normUser.length < 10) continue;

    if (normCand === normUser || normUser.includes(normCand) || (normCand.includes(normUser) && normUser.length >= 18)) {
      return true;
    }

    const userWordSet = new Set(normUser.split(' ').filter((w) => w.length >= 2));
    let overlapCount = 0;
    for (const w of candWords) {
      if (userWordSet.has(w)) overlapCount++;
    }
    if (candWords.length >= 4 && overlapCount / candWords.length >= 0.7) {
      return true;
    }
  }

  return false;
}

export interface GoldenRecommendationParams {
  areaId: LifeAreaId | string;
  userTexts: string[];
  userProfile?: Partial<UserProfile> | null;
  score: number;
  advisorCandidate?: string;
}

/**
 * Produces a concise, actionable, advisor-voiced Golden Recommendation grounded in the dialogue,
 * profile context, and score — strictly preventing verbatim quoting or copying of user text.
 */
export function synthesizeGoldenRecommendation(
  params: GoldenRecommendationParams
): string {
  const {
    areaId,
    userTexts = [],
    userProfile,
    score,
    advisorCandidate,
  } = params;

  const ctx = parseUserContext(userProfile);
  const constraints = parseDialogueConstraints(userTexts, userProfile);
  const rawLower = constraints.rawText.toLowerCase();

  // Accept AI / advisor candidate ONLY if concise, realistic, non-generic, and not a verbatim user copy
  if (advisorCandidate && typeof advisorCandidate === 'string') {
    const cleaned = advisorCandidate
      .replace(/^💡\s*\*?\*?التوصية العلاجية الذهبية:?\*?\*?\s*/i, '')
      .replace(/[.!؟]+$/g, '')
      .trim();

    const isGenericFiller =
      /^(?:البدء\s*بخطوة\s*عملية\s*(?:واحدة\s*)?(?:صغيرة|محددة)|تحديد\s*خطوة\s*عملية\s*واحدة|ركز\s*على\s*خطوة|التوازن\s*يبدأ\s*بخطوة|ابدأ\s*بخطوة\s*صغيرة|حماية\s*وقتك\s*اليومي|التركيز\s*على\s*عادة\s*واحدة)/i.test(
        cleaned
      ) ||
      /(?:خطوة\s*عملية\s*واحدة\s*صغيرة\s*ومحددة\s*تعالج\s*التحدي|تعالج\s*التحدي\s*(?:الرئيسي|الأساسي)|التحدي\s*الذي\s*تحدثنا\s*عنه)/i.test(
        cleaned
      ) ||
      (score >= 7.5 &&
        /(?:تعالج\s*(?:التحدي|العجز)|تأسيس\s*أول\s*صمام|كسر\s*حاجز\s*البداية|تحديد\s*العجز)/i.test(
          cleaned
        ));
    if (
      cleaned.length >= 14 &&
      cleaned.length <= 200 &&
      !isGenericFiller &&
      !isVerbatimUserCopy(cleaned, userTexts) &&
      isGoalConsistentWithReality(cleaned, areaId, constraints, ctx)
    ) {
      return cleaned;
    }
  }

  // Synthesize crisp, advisor-voiced recommendation tailored to dialogue + constraints + score
  switch (areaId) {
    case 'spiritual': {
      const mentionsEveningCloseOrWrite = /(تسكير|أكتب|اكتب|نهاية\s*اليوم|قبل\s*النوم|توتر|سريع|بكرة)/i.test(rawLower);
      if (mentionsEveningCloseOrWrite) {
        return 'خصّص دقيقتين هادئتين قبل النوم لإغلاق مشاغل اليوم بذكرٍ مختصر أو جملة تسليم واحدة بعيداً عن الهاتف، لتصفو روحك دون إجهاد الكتابة المطوّلة.';
      }
      if (/(فجر|صباح)/i.test(rawLower)) {
        return 'ثبّت 10 دقائق هادئة بعد صلاة الفجر أو في مستهل صباحك للذكر والتأمل دون شاشات لترسيخ حضور القلب.';
      }
      if (constraints.mentionsDistractionOrPhone) {
        return 'احمِ لنفسك مساحة صمت وذكر يومية لمدة 10 دقائق بعيداً عن الهاتف والإشعارات في الوقت الأنسب ليومك.';
      }
      if (score >= 7.5) {
        return 'حافظ على وردك اليومي من السكينة وحضور القلب واجعله مرساةً ثابتة توازن إيقاع أسبوعك.';
      }
      return 'ابدأ يومياً بـ 5 دقائق هدوء وتأمل قلبي في وقت ثابت دون شاشات لترميم صفاء ذهنك وتجديد طمأنينتك.';
    }

    case 'financial': {
      const efStatus = extractEmergencyFundStatus(userTexts);
      const mentionsInvestmentOrSurplus =
        /(استثمار|أستثمر|استثمر|طويل\s*(?:ال)?مدى|أصول|محفظة|فائض|عائد|تنمية|توسع|تنويع|صناديق|نمو)/i.test(
          rawLower
        );

      if (score >= 7.5 && !constraints.mentionsDebt) {
        if (
          efStatus.hasFund &&
          efStatus.monthsCovered !== null &&
          efStatus.monthsCovered >= 1 &&
          efStatus.monthsCovered < 6
        ) {
          return mentionsInvestmentOrSurplus
            ? `استكمال صندوق الطوارئ من ${efStatus.monthsCovered} إلى 6 أشهر من نفقاتك الأساسية، مع توجيه جزء من الفائض الشهري إلى استثمار طويل المدى ومتوازن.`
            : `رفع تغطية صندوق الطوارئ القائم تدريجياً من ${efStatus.monthsCovered} إلى 6 أشهر، ثم توجيه الفائض الشهري نحو استثمار طويل المدى.`;
        }
        if (efStatus.hasFund && (efStatus.monthsCovered === null || efStatus.monthsCovered >= 6)) {
          return mentionsInvestmentOrSurplus
            ? 'الحفاظ على استقرار صندوق الطوارئ القائم، وتوجيه جزء منتظم من الفائض الشهري نحو مسار استثماري طويل المدى لتعظيم النمو.'
            : 'الارتقاء باستقرارك المالي القائم عبر تنويع قنوات الاستثمار طويل المدى من فائضك الشهري مع بقاء صندوق الطوارئ محمياً.';
        }
        if (mentionsInvestmentOrSurplus) {
          return 'تعزيز متانتك المالية عبر استكمال احتياطي الطوارئ لـ 6 أشهر وتوجيه جزء ثابت من الفائض الشهري نحو استثمار طويل المدى.';
        }
        return 'الانتقال من الاستقرار المالي الحالي إلى مرحلة النمو عبر استكمال تغطية صندوق الطوارئ لـ 6 أشهر وأتمتة استثمار الفائض على المدى الطويل.';
      }

      if (/(حصالة|صندوق\s*صغير|حساب\s*فرعي)/i.test(rawLower)) {
        return 'خصّص حصالة مستقلة أو حساباً فرعياً منفصلاً واقتطع فيه مبلغاً ميسراً فور استلام الدخل قبل أي صرف يومي.';
      }
      if (/(مطاعم|مطعم|طلبات|توصيل|مقاهي|كافيهات)/i.test(rawLower)) {
        return 'ضع سقفاً أسبوعياً محدداً لمصاريف المطاعم والطلبات الخارجية، وحوّل الفارق مباشرة إلى صمام الأمان.';
      }
      if (constraints.mentionsDebt) {
        return 'احصر أقساطك والتزاماتك الشهرية في قائمة واضحة، ووجّه أي هامش فائض لتسريع سداد الالتزام الأصغر أولاً مع حماية صمام أمان مصغر.';
      }
      if (ctx.isStudent) {
        return 'اقتطع مبلغاً رمزياً ميسراً فور استلام دخلك الجامعي في حساب أو حصالة منفصلة، وتتبع مصاريفك الأسبوعية لتفادي عجز نهاية الشهر.';
      }
      if (constraints.mentionsIncomeLeak) {
        return 'سجّل مصروفاتك اليومية لمدة 7 أيام لكشف مواضع التسرب الفعلية، وضع سقفاً واضحاً للبنود المتغيرة قبل اقتطاع الادخار.';
      }
      if (
        efStatus.hasFund &&
        efStatus.monthsCovered !== null &&
        efStatus.monthsCovered >= 1 &&
        efStatus.monthsCovered < 6
      ) {
        return `البناء على صندوق الطوارئ القائم (${efStatus.monthsCovered} أشهر) لاستكماله إلى 6 أشهر مع أتمتة تحويل شهري ثابت للفائض.`;
      }
      if (constraints.mentionsNoDebt && (constraints.mentionsSavingDesire || score >= 7.0)) {
        return 'فعّل تحويلاً ثابتاً وميسراً للادخار في حساب منفصل فور استلام الراتب لتنمية صندوق طوارئك باستقرار.';
      }
      return 'ابدأ بجرد التزاماتك الشهرية ومصروفاتك المتكررة لمدة أسبوع لتحديد الفائض الفعلي وبناء صمام أمان متدرج.';
    }

    case 'health': {
      if (constraints.hasLongWorkShift || constraints.hasShortSleep || constraints.compensatesOnWeekend) {
        return constraints.sleepHours !== null
          ? `اعمل على زيادة نومك تدريجياً بمقدار 20 إلى 30 دقيقة عن معدلك الحالي (${constraints.sleepHours} ساعات) في الأيام المتاحة، مع فصل الشاشات والمنبهات قبل النوم الفعلي بنصف ساعة.`
          : 'أضف 20 إلى 30 دقيقة نوم تدريجية متى سمح جدول عملك، وافصل الشاشات والمنبهات قبل النوم بنصف ساعة لرفع جودة راحتك.';
      }
      if (/(ماء|شرب|ترطيب)/i.test(rawLower)) {
        return 'ثبّت شرب كوبين من الماء فور الاستيقاظ وعلى مدار اليوم مع 15 دقيقة مشي خفيف وإبعاد الشاشات قبل النوم بنصف ساعة.';
      }
      if (constraints.mentionsDistractionOrPhone) {
        return 'اترك الهاتف خارج متناول يدك قبل النوم بـ 30 دقيقة وابدأ بمشي خفيف 15 دقيقة يومياً لاستعادة نشاطك البدني.';
      }
      if (score >= 7.5) {
        return 'حافظ على انتظام حركتك البدنية وشرب الماء يومياً مع الانتباه المبكر لإشارات الإرهاق قبل تراكمها.';
      }
      return 'ثبّت عادة بدنية ميسرة تبدأ بـ 15 دقيقة مشي يومي وشرب الماء بانتظام لتنشيط دورتك الدموية وطاقتك.';
    }

    case 'career': {
      if (score >= 7.5 && !ctx.isJobSeeker) {
        return ctx.isStudent
          ? 'استثمر تفوقك الدراسي في مشروع تطبيقي أو تدريب نوعي يبني محفظة أعمالك المهنية قبل التخرج.'
          : 'وجّه استقرارك المهني نحو تطوير مهارة قيادية أو مشروع استراتيجي نوعي يضاعف أثرك وقيمتك في المرحلة القادمة.';
      }
      if (ctx.isStudent) {
        return 'خصّص 30 دقيقة منتظمة أسبوعياً لتطبيق عملي أو مهارة تدعم تخصصك بجانب متطلبات المذاكرة.';
      }
      if (ctx.isJobSeeker) {
        return 'قسّم بحثك عن العمل إلى خطة أسبوعية هادئة تشمل تحديث السيرة الذاتية وتطوير مهارة مطلوبة دون استنزاف معنوياتك.';
      }
      if (constraints.hasLongWorkShift) {
        return 'احجز أول 30 دقيقة من دوامك لأهم مهمة قبل المقاطعات، واحرص على فواصل تنفس قصيرة لحماية تركيزك خلال ساعات العمل الطويلة.';
      }
      if (constraints.mentionsDistractionOrPhone) {
        return 'أغلق الإشعارات الجانبية واحجز 30 إلى 45 دقيقة يومياً للعمل العميق على أولويتك المهنية الأهم.';
      }
      return 'احمِ 45 دقيقة يومياً للعمل العميق على أولويتك المهنية الأهم بعيداً عن إشعارات البريد والرسائل.';
    }

    case 'personal': {
      if (score >= 7.5) {
        return 'استثمر توازنك النفسي الحالي في بناء هدف شخصي أو مسار إبداعي يعمّق رضاك ونموك الذاتي المستمر.';
      }
      if (constraints.mentionsDistractionOrPhone) {
        return 'احمِ 10 دقائق مسائية بعيداً عن الهاتف لتهدئة ذهنك ورصد إنجاز يومي صغير يعزز ثقتك دون ضغط.';
      }
      if (/(خجل|ارتباك|ثقة|مواجهة|تردد)/i.test(rawLower)) {
        return 'تدرّب أسبوعياً على موقف تعبير بسيط ومريح يعزز حضورك الشخصي مع تدوين نقطة قوة أو إنجاز يومي دون جلد للذات.';
      }
      if (/(جلد|لوم|مقارنة|قسوة|توتر)/i.test(rawLower)) {
        return 'استبدل قسوة لوم الذات بمراجعة مسائية هادئة ترصد خطوة إيجابية واحدة أنجزتها في يومك مهما بدت صغيرة.';
      }
      return 'احمِ طاقتك النفسية بوضع حد واحد واضح للمهام المستنزفة هذا الأسبوع، وابدأ يومك بـ 5 دقائق هدوء قبل أي ضغط.';
    }

    case 'learning': {
      if (score >= 7.5) {
        return 'حوّل حصيلتك المعرفية المستقرة إلى تطبيق عملي أو تلخيص أسبوعي تشاركه لترسيخ الإتقان ومضاعفة الأثر.';
      }
      if (constraints.mentionsDistractionOrPhone || /(مذاكرة|دراسة|محاضرات)/i.test(rawLower)) {
        return 'أبعد الهاتف عن متناول يدك أثناء المذاكرة وقسّم التعلّم إلى جلسات قصيرة مركزة مع تلخيص الفكرة الرئيسية بعد كل جلسة.';
      }
      if (/(بودكاست|صوتي|مشوار|سيارة)/i.test(rawLower)) {
        return 'استثمر أوقات التنقل والمشي في محتوى صوتي معرفي هادف مع تحويل فكرة واحدة أسبوعياً إلى تطبيق عملي.';
      }
      if (ctx.isStudent) {
        return 'أبعد الهاتف أثناء المذاكرة وقسّم المراجعة إلى جلسات قصيرة مركزة مع تلخيص أهم الأفكار بعد كل جلسة لمنع التراكم.';
      }
      return 'ثبّت 15 إلى 20 دقيقة يومياً للتعلّم في كتاب أو مسار واحد فقط حتى إتمامه، وحوّل فكرة واحدة كل أسبوع إلى تطبيق عملي.';
    }

    case 'family': {
      if (score >= 7.5) {
        return 'حافظ على دفء التواصل الأسري الحالي وأضف عادة أو جلسة نوعية أسبوعية تعمّق الترابط والذكريات المشتركة.';
      }
      if (constraints.mentionsDistractionOrPhone) {
        return 'أبقِ الهاتف بعيداً أثناء جلوسك مع أسرتك لتحويل الوقت المشترك إلى حضور قلبي وإنصات صافٍ يضاعف المودة.';
      }
      if (ctx.hasDependents) {
        return 'خصّص 20 دقيقة يومياً للحضور الذهني والإنصات مع أسرتك دون هواتف أو انشغال بمهام العمل.';
      }
      return 'حافظ على حضورك الهادئ مع أهلك وإبعاد الشاشات أثناء جلساتكم المشتركة لتعزيز دفء العلاقة.';
    }

    case 'social': {
      if (score >= 7.5) {
        return 'استثمر جودة علاقاتك الداعمة في مبادرات نوعية وتبادل معرفي مثمر يوسّع أثرك الإيجابي باستدامة.';
      }
      if (/(خجل|ارتباك|تردد)/i.test(rawLower)) {
        return 'ابدأ بخطوة تواصل خفيفة ومريحة أسبوعياً مع صديق موثوق عبر رسالة ودية أو لقاء قصير دون إلزام النفس بمناسبات مرهقة.';
      }
      if (constraints.mentionsIsolationOrFatigue || constraints.hasLongWorkShift) {
        return 'ابدأ بخطوة تواصل خفيفة هذا الأسبوع عبر رسالة اطمئنان أو اتصال قصير بأحد المقربين بما يناسب طاقتك ووقتك.';
      }
      return 'ركّز طاقتك على تعميق التواصل مع دائرتك القريبة المريحة والاعتذار بلباقة عن المجاملات المستنزفة.';
    }

    default:
      return 'حدّد إجراءً عملياً واحداً واضحاً يناسب التزاماتك الحالية وخصص له وقتاً ثابتاً هذا الأسبوع.';
  }
}

/**
 * Generates 2-3 short, actionable, dialogue-grounded advisor suggestions when the user
 * asks directly for suggestions (e.g. "لا أدري أعطيني اقتراحاتك").
 */
export function generateConcreteDomainSuggestions(
  areaId: LifeAreaId | string,
  userTexts: string[],
  userProfile?: Partial<UserProfile> | null,
  score: number = 6.0
): string[] {
  const validAreaId = (
    ['spiritual', 'financial', 'career', 'personal', 'learning', 'family', 'social', 'health'].includes(
      areaId
    )
      ? areaId
      : 'personal'
  ) as LifeAreaId;

  const suggestions = generateRealisticAreaGoals({
    areaId: validAreaId,
    userTexts,
    userProfile,
    score,
  });

  return suggestions.slice(0, 3);
}
