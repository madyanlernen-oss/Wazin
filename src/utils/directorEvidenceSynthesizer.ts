import {
  DirectorSummaryReport,
  DomainDeepBreakdownItem,
  KeystoneHabit,
  LifeAreaId,
  PromotableActionItem,
  ThirtyDayWeek,
} from '../types/lifeBalance';
import {
  DOMAIN_ARABIC_NAMES,
  getDomainArabicName,
  prefixLamArabic,
} from './arabicDomainLabels';
import { isEmptyOrMeaninglessInput } from './dialogueDeduplication';

const ALL_DOMAINS: LifeAreaId[] = [
  'spiritual',
  'financial',
  'career',
  'personal',
  'learning',
  'family',
  'social',
  'health',
];

export interface DomainEvidenceSummary {
  domainId: LifeAreaId;
  domainTitle: string;
  score: number;
  userMessages: string[];
  strengths: string[];
  challenges: string[];
  goals: string[];
  goldenRecommendation: string;
  combinedEvidenceText: string;
}

export interface DirectorSynthesisInput {
  userProfile?: any;
  scores?: Record<string, number> | null;
  answers?: Record<string, any> | null;
  goals?: Record<string, string[]> | null;
  conversationHistories?: Record<string, any[]> | null;
  stationInsights?: Record<string, any> | null;
  advisorSummaries?: Record<string, any> | null;
  focusArea?: string;
}

function isTrivialBoilerplateUtterance(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return true;
  if (isEmptyOrMeaninglessInput(t)) return true;
  if (
    /^(?:اعتمد\s*التقييم(?:\s*بدرجة.*)?|نعم\s*اعتمد|اعتماد|نكتفي|خلاص|انتهينا|أرغب\s*في\s*الاستمرار|حسناً?\s*نكمل|مرحباً?|أهلاً?|السلام\s*عليكم)$/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

function cleanExcerpt(text: string, maxLen: number = 90): string {
  const cleaned = (text || '')
    .replace(/\s+/g, ' ')
    .replace(/["«»]/g, '')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 3).trim() + '...';
}

function extractMessagesFromAnyHistory(entries: any[]): string[] {
  if (!Array.isArray(entries)) return [];
  const out: string[] = [];
  for (const item of entries) {
    if (!item) continue;
    if (typeof item === 'string') {
      if (!isTrivialBoilerplateUtterance(item)) out.push(item.trim());
      continue;
    }
    const role = String(item.sender || item.role || '').toLowerCase();
    if (role && role !== 'user') continue;
    if (item.ignoredForTurnCount) continue;
    const raw = String(item.text || item.content || '').trim();
    if (raw && !isTrivialBoilerplateUtterance(raw)) {
      out.push(raw);
    }
  }
  return Array.from(new Set(out));
}

/**
 * Extracts structured, verbatim-grounded evidence for every one of the 8 life domains.
 */
export function extractAllDomainsEvidence(
  input: DirectorSynthesisInput
): DomainEvidenceSummary[] {
  const scores = input.scores || {};
  const answers = input.answers || {};
  const goals = input.goals || {};
  const histories = input.conversationHistories || {};
  const insights = input.stationInsights || {};
  const advisorSummaries = input.advisorSummaries || {};

  return ALL_DOMAINS.map((domainId) => {
    const domainTitle = DOMAIN_ARABIC_NAMES[domainId];
    const score = Number(scores[domainId] || 0);

    // 1. Conversation history messages
    const historyMsgs = extractMessagesFromAnyHistory(histories[domainId] || []);

    // 2. Stored answers for this domain
    const answerMsgs: string[] = [];
    for (const [k, v] of Object.entries(answers)) {
      if (k === domainId || k.startsWith(`${domainId}_response_`)) {
        if (typeof v === 'string' && !isTrivialBoilerplateUtterance(v)) {
          answerMsgs.push(v.trim());
        } else if (v && typeof v === 'object') {
          for (const [subK, subV] of Object.entries(v)) {
            if (!subK.includes('score') && typeof subV === 'string' && !isTrivialBoilerplateUtterance(subV)) {
              answerMsgs.push(subV.trim());
            }
          }
        }
      }
    }

    // 3. Advisor summaries passed from UI or API
    const summaryEntry = advisorSummaries[domainTitle] || advisorSummaries[domainId];
    const summaryMsgs: string[] = [];
    const summaryGoals: string[] = [];
    let summaryGolden = '';
    const summaryStrengths: string[] = [];
    const summaryChallenges: string[] = [];

    if (typeof summaryEntry === 'string' && !isTrivialBoilerplateUtterance(summaryEntry)) {
      summaryMsgs.push(summaryEntry.trim());
    } else if (summaryEntry && typeof summaryEntry === 'object') {
      if (Array.isArray(summaryEntry.userMessages)) {
        summaryMsgs.push(...extractMessagesFromAnyHistory(summaryEntry.userMessages));
      }
      if (typeof summaryEntry.summary === 'string' && !isTrivialBoilerplateUtterance(summaryEntry.summary)) {
        summaryMsgs.push(summaryEntry.summary.trim());
      }
      if (Array.isArray(summaryEntry.goals)) {
        summaryGoals.push(...summaryEntry.goals.filter((g: any) => typeof g === 'string' && g.trim()));
      }
      if (typeof summaryEntry.goldenRecommendation === 'string') {
        summaryGolden = summaryEntry.goldenRecommendation.trim();
      }
      if (Array.isArray(summaryEntry.strengths)) {
        summaryStrengths.push(...summaryEntry.strengths.filter((s: any) => typeof s === 'string' && s.trim()));
      }
      if (Array.isArray(summaryEntry.challenges)) {
        summaryChallenges.push(...summaryEntry.challenges.filter((c: any) => typeof c === 'string' && c.trim()));
      }
    }

    // 4. Insights & goals
    const domainInsight = insights[domainId] || {};
    const domainGoals = Array.from(
      new Set([
        ...(Array.isArray(goals[domainId]) ? goals[domainId] : []),
        ...summaryGoals,
      ].filter((g) => typeof g === 'string' && g.trim().length > 0))
    );

    const userMessages = Array.from(new Set([...historyMsgs, ...answerMsgs, ...summaryMsgs]));
    const strengths = Array.from(
      new Set([
        ...(Array.isArray(domainInsight.strengths) ? domainInsight.strengths : []),
        ...summaryStrengths,
      ].filter(Boolean))
    );
    const challenges = Array.from(
      new Set([
        ...(Array.isArray(domainInsight.challenges) ? domainInsight.challenges : []),
        ...summaryChallenges,
      ].filter(Boolean))
    );
    const goldenRecommendation = String(
      domainInsight.goldenRecommendation || summaryGolden || ''
    ).trim();

    return {
      domainId,
      domainTitle,
      score,
      userMessages,
      strengths,
      challenges,
      goals: domainGoals,
      goldenRecommendation,
      combinedEvidenceText: [...userMessages, ...challenges, ...strengths, ...domainGoals, goldenRecommendation].join(' '),
    };
  });
}

function buildGroundedPromptContextForLLM(
  evidences: DomainEvidenceSummary[],
  scores: Record<string, number>
): string {
  return evidences
    .map((ev) => {
      const displayScore = ev.score > 0 ? `${ev.score.toFixed(1)}/10` : `${Number(scores[ev.domainId] || 0).toFixed(1)}/10`;
      const msgsBlock =
        ev.userMessages.length > 0
          ? ev.userMessages.map((m, idx) => `    ${idx + 1}) "${cleanExcerpt(m, 160)}"`).join('\n')
          : '    (لم تُسجل رسائل حوارية مفصلة في هذه المحطة — اعتمد على الدرجة والأهداف المسجلة فقط دون اختلاق)';
      return `• ${ev.domainTitle} (الدرجة الفعلية: ${displayScore}):
  - ما صرّح به المستفيد فعلياً:
${msgsBlock}
  - نقاط القوة المرصودة: ${ev.strengths.length > 0 ? ev.strengths.join(' | ') : 'غير محددة نصياً'}
  - التحديات المرصودة: ${ev.challenges.length > 0 ? ev.challenges.join(' | ') : 'غير محددة نصياً'}
  - التوصية الذهبية / الأهداف: ${ev.goldenRecommendation || (ev.goals.length > 0 ? ev.goals.join(' | ') : 'لم تُثبت أهداف بعد')}`;
    })
    .join('\n\n');
}

export function buildDirectorGroundingPromptText(input: DirectorSynthesisInput): string {
  const evidences = extractAllDomainsEvidence(input);
  return buildGroundedPromptContextForLLM(evidences, input.scores || {});
}

function detectCrossDomainLink(
  ev: DomainEvidenceSummary,
  allEvidences: DomainEvidenceSummary[],
  strongest: DomainEvidenceSummary,
  weakest: DomainEvidenceSummary
): string {
  const txt = ev.combinedEvidenceText;
  const byId = new Map(allEvidences.map((e) => [e.domainId, e]));
  const healthEv = byId.get('health');
  const careerEv = byId.get('career');
  const learningEv = byId.get('learning');
  const personalEv = byId.get('personal');
  const familyEv = byId.get('family');
  const socialEv = byId.get('social');
  const spiritualEv = byId.get('spiritual');
  const financialEv = byId.get('financial');

  if (ev.domainId === 'health') {
    if (/(نوم|سهر|ارهاق|إرهاق|تعب|خمول|شاشات)/i.test(txt) && (careerEv || learningEv)) {
      const target = (careerEv?.score || 10) <= (learningEv?.score || 10) ? careerEv! : learningEv!;
      return `تذبذب النوم أو الطاقة البدنية المذكور هنا ينعكس مباشرة على التركيز والإنجاز في ${target.domainTitle} (${target.score.toFixed(1)}/10).`;
    }
    if (ev.score >= 7.5 && weakest.domainId !== 'health') {
      return `مستوى النشاط الجسدي الحالي يمنحك قدرة أعلى على تحمل ضغوط ${weakest.domainTitle}.`;
    }
  }

  if (ev.domainId === 'career') {
    if (/(ساعات|دوام|ضغط|احتراق|مهام|تسويف)/i.test(txt) && personalEv && familyEv) {
      const drained = personalEv.score <= familyEv.score ? personalEv : familyEv;
      return `امتداد ضغط ساعات العمل والمسؤوليات المهنية يضغط على المساحة المتاحة ${prefixLamArabic(drained.domainTitle)} (${drained.score.toFixed(1)}/10).`;
    }
  }

  if (ev.domainId === 'spiritual') {
    if (ev.score >= 7.0 && personalEv) {
      return `الرصيد الروحي والسكينة هنا يشكّلان قاعدة تهدئة تخفف التوتر داخل ${personalEv.domainTitle}.`;
    }
    if (ev.score < 5.5 && personalEv) {
      return `تراجع السكينة والحضور القلبي يزيد من قابلية التشتت الذهني داخل ${personalEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'financial') {
    if (/(ديون|قسط|أقساط|عجز|ضغط|لا يكفي|ما يكفي|ادخار)/i.test(txt) && personalEv) {
      return `انشغال البال بالتدفق المالي يرفع الحمل النفسي داخل ${personalEv.domainTitle} ويزيد التوتر اليومي.`;
    }
    if (ev.score >= 7.0 && familyEv) {
      return `الاستقرار المالي الحالي يقلل التوترات المعيشية ويدعم هدوء ${familyEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'personal') {
    if (/(فراغ|هوايات|جلد الذات|تشتت|توتر|انعزال)/i.test(txt) && socialEv) {
      return `العبء النفسي أو الفراغ المذكور في هذا الجانب يرتبط بتراجع المبادرة والطاقة في ${socialEv.domainTitle} (${socialEv.score.toFixed(1)}/10).`;
    }
  }

  if (ev.domainId === 'learning') {
    if (careerEv) {
      return ev.score >= 6.5
        ? `الرصيد المعرفي الحالي يرفع كفاءتك وجاهزيتك في ${careerEv.domainTitle}.`
        : `تقطع القراءة أو التطوير المعرفي يبطئ التقدم والوضوح داخل ${careerEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'family') {
    if (spiritualEv && personalEv) {
      return ev.score >= 7.0
        ? `الدفء والتماسك الأسري يمثلان مظلة أمان نفسية تسند ${personalEv.domainTitle}.`
        : `تذبذب التواصل داخل البيت يسحب جزءاً من صفاء الذهن المطلوب في ${personalEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'social') {
    if (personalEv) {
      return ev.score >= 7.0
        ? `وجود محيط اجتماعي داعم يغذي المرونة النفسية داخل ${personalEv.domainTitle}.`
        : `قلة التواصل الداعم أو العزلة في المحيط تزيد الثقل الفردي داخل ${personalEv.domainTitle}.`;
    }
  }

  if (ev.domainId === strongest.domainId) {
    return `بصفته أعلى جوانبك تقييماً (${ev.score.toFixed(1)}/10)، يمثل مصدراً جاهزاً لمدّ ${weakest.domainTitle} بالزخم العملي.`;
  }
  return ev.score < 5.5
    ? `تراجع هذا البعد (${ev.score.toFixed(1)}/10) يسحب طاقة التركيز ويحد من استقرار بقية المجالات المرتبطة به.`
    : `يحافظ هذا البعد على مستوى متوازن نسبياً (${ev.score.toFixed(1)}/10) ويمكن توظيفه لدعم ${weakest.domainTitle}.`;
}

function buildDomainGroundedTask(
  ev: DomainEvidenceSummary
): {
  task: string;
  quadrant: 'Q1: عاجل ومهم' | 'Q2: مهم وغير عاجل' | 'Q3: تقليص أو تفويض';
  week: number;
  frequency: 'يومي' | 'أسبوعي';
} {
  const urgentIssue = ev.score > 0 && ev.score < 5.0;
  const trimIssue = /(مجاملات|استنزاف|مقاطعات|هاتف|شاشات|تشتت|سهر)/i.test(ev.combinedEvidenceText) && ev.score >= 5.0 && ev.score < 6.5;

  let task = '';
  if (ev.goals.length > 0) {
    task = ev.goals[0];
  } else if (ev.goldenRecommendation && !/(البدء\s*بخطوة\s*عملية\s*واحدة|تخصيص\s*15\s*دقيقة)/i.test(ev.goldenRecommendation)) {
    task = ev.goldenRecommendation;
  } else if (ev.userMessages.length > 0) {
    const snippet = cleanExcerpt(ev.userMessages[ev.userMessages.length - 1], 75);
    task = `معالجة ما ذكرته حول (${snippet}) بخطوة عملية مباشرة تناسب يومك في ${ev.domainTitle}`;
  } else {
    task = `تثبيت خطوة عملية محددة لرفع استقرار ${ev.domainTitle} انطلاقاً من واقعك الحالي`;
  }

  const quadrant: 'Q1: عاجل ومهم' | 'Q2: مهم وغير عاجل' | 'Q3: تقليص أو تفويض' = urgentIssue
    ? 'Q1: عاجل ومهم'
    : trimIssue
      ? 'Q3: تقليص أو تفويض'
      : 'Q2: مهم وغير عاجل';

  const week = urgentIssue ? 1 : ev.score < 6.5 ? 2 : ev.score < 7.5 ? 3 : 4;
  const frequency: 'يومي' | 'أسبوعي' =
    /(أسبوع|جمعة|سبت|شهري|ميزانية|فواتير|زيارة)/i.test(task) ? 'أسبوعي' : 'يومي';

  return { task, quadrant, week, frequency };
}

/**
 * Builds a complete, anti-generic, evidence-grounded Director Summary report
 * directly from all 8 domains' conversation histories, answers, goals, and scores.
 */
export function generateEvidenceGroundedDirectorReport(
  input: DirectorSynthesisInput
): DirectorSummaryReport {
  const evidences = extractAllDomainsEvidence(input);
  const evaluated = evidences.filter((e) => e.score > 0);
  const pool = evaluated.length > 0 ? evaluated : evidences;
  const sortedDesc = [...pool].sort((a, b) => b.score - a.score);
  const strongest = sortedDesc[0] || evidences[0];
  const bottleneck = sortedDesc[sortedDesc.length - 1] || evidences[evidences.length - 1];
  const secondWeakest = sortedDesc.length > 1 ? sortedDesc[sortedDesc.length - 2] : bottleneck;

  const avgNum =
    evaluated.length > 0
      ? Number((evaluated.reduce((sum, e) => sum + e.score, 0) / evaluated.length).toFixed(1))
      : 5.0;
  const balanceIndexLabel =
    avgNum >= 8.0
      ? 'مرحلة التناغم والنمو المستدام'
      : avgNum >= 6.5
        ? 'مرحلة البناء المتوازن وتوسيع نقطة الارتكاز'
        : 'مرحلة إعادة التأسيس ومعالجة عنق الزجاجة';

  const userName = String(input.userProfile?.name || '').trim();
  const status = String(input.userProfile?.employmentStatus || input.userProfile?.workStatus || '').trim();

  // Build Root-Cause Chain from actual user statements
  const bottleneckFact =
    bottleneck.userMessages[0]
      ? `ما ذكرته حول «${cleanExcerpt(bottleneck.userMessages[0], 85)}»`
      : `تراجع تقييمه إلى (${bottleneck.score.toFixed(1)}/10)`;
  const secondFact =
    secondWeakest.domainId !== bottleneck.domainId && secondWeakest.userMessages[0]
      ? `، وما أشرت إليه في ${secondWeakest.domainTitle} بشأن «${cleanExcerpt(secondWeakest.userMessages[0], 75)}»`
      : '';
  const strongestFact =
    strongest.userMessages[0]
      ? `استناداً إلى ما أثبتّه من وعي وممارسة في ${strongest.domainTitle} («${cleanExcerpt(strongest.userMessages[0], 75)}»)`
      : `بالاستناد إلى استقرار ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10) كأعلى جوانبك الحالية`;

  const rootCauseChain = `تُظهر خريطة تفاعلك عبر المحطات الثمانية سلسلة تأثير واضحة: في ${bottleneck.domainTitle} (${bottleneck.score.toFixed(1)}/10)، يؤدي ${bottleneckFact} إلى استنزاف في الطاقة اليومية ينعكس تلقائياً${secondFact}. في المقابل، يمكنك توظيف ${strongestFact} كمرساة تُعيد التوازن لبقية الجوانب بالتدريج دون تشتت.`;

  const overallDiagnosis = `${userName ? `يا ${userName}، ` : ''}بناءً على قراءة واقعك الفعلي عبر الأبعاد الثمانية بمعدل توازن عام (${avgNum.toFixed(1)}/10) ضمن «${balanceIndexLabel}»، يبرز ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10) كأقوى نقطة ارتكاز لديك، بينما يشكّل ${bottleneck.domainTitle} (${bottleneck.score.toFixed(1)}/10) عنق الزجاجة الأهم حالياً.`;

  // Section 2: All 8 domains deep breakdown
  const domainBreakdown: DomainDeepBreakdownItem[] = evidences.map((ev) => {
    const built = buildDomainGroundedTask(ev);
    const realityParts: string[] = [];
    if (ev.userMessages.length > 0) {
      realityParts.push(`صرّح المستفيد بواقع: «${cleanExcerpt(ev.userMessages.slice(-1)[0], 110)}»`);
    }
    if (ev.challenges.length > 0) {
      realityParts.push(`التحدي الأساسي: ${ev.challenges[0]}`);
    }
    if (ev.strengths.length > 0) {
      realityParts.push(`نقطة القوة: ${ev.strengths[0]}`);
    }
    if (realityParts.length === 0) {
      realityParts.push(
        ev.score > 0
          ? `تم رصد التقييم عند (${ev.score.toFixed(1)}/10) دون تفاصيل حوارية موسعة في هذه المحطة.`
          : 'لم يبدأ الحوار التشخيصي الكامل في هذه المحطة بعد.'
      );
    }

    return {
      domainTitle: ev.domainTitle,
      score: ev.score,
      groundedReality: realityParts.join(' • '),
      crossDomainImpact: detectCrossDomainLink(ev, evidences, strongest, bottleneck),
      actionableTask: built.task,
      eisenhowerQuadrant: built.quadrant,
      planWeek: built.week,
      planFrequency: built.frequency,
    };
  });

  // Section 3: Core Leverage & Primary Bottleneck
  const leverageAnchorDetail =
    strongest.strengths[0] ||
    (strongest.userMessages[0] ? `«${cleanExcerpt(strongest.userMessages[0], 80)}»` : 'العادة المستقرة في هذا الجانب');
  const strongestSynergy = {
    title:
      strongest.score >= 7.8
        ? `استثمار قوة ${strongest.domainTitle} لرفع بقية الجوانب`
        : `توظيف استقرار ${strongest.domainTitle} كنقطة انطلاق`,
    description: `بناءً على ${leverageAnchorDetail} في ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10)، يمكن تحويل الانضباط والهدوء المحقق هناك إلى جسر يدعم ${bottleneck.domainTitle}${secondWeakest.domainId !== bottleneck.domainId ? ` و${secondWeakest.domainTitle}` : ''} عبر ربط خطوتك الجديدة مباشرة بروتينك المستقر في هذا الجانب.`,
    domainsInvolved: Array.from(
      new Set([strongest.domainTitle, bottleneck.domainTitle, secondWeakest.domainTitle])
    ),
  };

  const bottleneckTask = buildDomainGroundedTask(bottleneck);
  const bottleneckChallengeText =
    bottleneck.challenges[0] ||
    (bottleneck.userMessages[0]
      ? `الضغط المرتبط بـ «${cleanExcerpt(bottleneck.userMessages[0], 85)}»`
      : `تراجع درجة هذا الجانب إلى (${bottleneck.score.toFixed(1)}/10)`);
  const criticalBottleneck = {
    title: `بروتوكول إنقاذ ${bottleneck.domainTitle}`,
    impact: `${bottleneckChallengeText} يسحب الطاقة اللازمة للاستقرار العام ويجعل الحفاظ على بقية الجوانب أكثر كلفة ذهنياً.`,
    recommendation: bottleneck.goldenRecommendation || bottleneckTask.task,
    domain: bottleneck.domainTitle,
  };

  // Section 4: 3-4 Tailored Keystone Habits grounded in actual schedule & words
  const isStudent = status.includes('طالب');
  const scheduleMorning = isStudent ? 'قبل بدء المحاضرات الصباحية' : 'في مستهل الصباح قبل زحام المهام';
  const scheduleMid = isStudent ? 'بعد الانتهاء من اليوم الجامعي' : 'عند خط الفصل بين العمل والمساء';
  const scheduleEvening = 'في الساعة الأخيرة قبل النوم';

  const topWeakThree = [...pool].sort((a, b) => a.score - b.score).slice(0, 3);
  const h1Domain = topWeakThree[0] || bottleneck;
  const h2Domain = topWeakThree[1] || secondWeakest;
  const h3Domain = topWeakThree[2] || strongest;

  const h1Step = buildDomainGroundedTask(h1Domain).task;
  const h2Step = buildDomainGroundedTask(h2Domain).task;
  const h3Step = buildDomainGroundedTask(h3Domain).task;

  const keystoneHabits: KeystoneHabit[] = [
    {
      name: `عادة تثبيت المسار في ${h1Domain.domainTitle}`,
      triggerTime: scheduleMorning,
      exactStep: h1Step,
      targetDomains: Array.from(new Set([h1Domain.domainTitle, strongest.domainTitle, 'الجانب الشخصي والوعي بالذات'])).slice(0, 3),
      expectedImpact: `معالجة مباشرة لأبرز ما ورد في ${h1Domain.domainTitle} ومنع تراكم الضغط على بقية اليوم.`,
    },
    {
      name: `نقطة الضبط اليومية لـ ${h2Domain.domainTitle}`,
      triggerTime: scheduleMid,
      exactStep: h2Step,
      targetDomains: Array.from(new Set([h2Domain.domainTitle, h1Domain.domainTitle, 'الجانب المهني والوظيفي'])).slice(0, 3),
      expectedImpact: `حماية التوازن العملي بين التزامات ${h2Domain.domainTitle} وراحتك الشخصية.`,
    },
    {
      name: `عادة الإغلاق الهادئ ودعم ${h3Domain.domainTitle}`,
      triggerTime: scheduleEvening,
      exactStep: h3Step,
      targetDomains: Array.from(new Set([h3Domain.domainTitle, 'الجانب الصحي والبدني', 'الجانب الروحي والسكينة'])).slice(0, 3),
      expectedImpact: `تهدئة الذهن وتثبيت استمرارية الجوانب الإيجابية لدعم بقية العجلة.`,
    },
  ];

  // Add a 4th keystone habit when 4+ domains have concrete goals/statements
  if (sortedDesc.length >= 4) {
    const fourthDom = sortedDesc[sortedDesc.length - 4];
    const fourthTask = buildDomainGroundedTask(fourthDom).task;
    keystoneHabits.push({
      name: `مراجعة التوازن الأسبوعي في ${fourthDom.domainTitle}`,
      triggerTime: 'نهاية كل أسبوع (الجمعة أو السبت)',
      exactStep: fourthTask,
      targetDomains: Array.from(new Set([fourthDom.domainTitle, bottleneck.domainTitle, strongest.domainTitle])).slice(0, 3),
      expectedImpact: `ضمان متابعة التقدم الفعلي وتفادي عودة عنق الزجاجة في الأسابيع القادمة.`,
    });
  }

  // Section 5: Ready-to-Promote Action Queue (Top 6-8 high-impact tasks grouped by Q1 / Q2)
  const prioritizedDomains = [...evidences].sort((a, b) => {
    const sa = a.score > 0 ? a.score : 5.5;
    const sb = b.score > 0 ? b.score : 5.5;
    return sa - sb;
  });

  const readyToPromoteQueue: PromotableActionItem[] = prioritizedDomains.slice(0, 7).map((ev, index) => {
    const built = buildDomainGroundedTask(ev);
    const normalizedQuadrant: 'Q1' | 'Q2' = built.quadrant.startsWith('Q1') ? 'Q1' : 'Q2';
    const weekNumber = Math.min(4, Math.floor(index / 2) + 1);
    return {
      id: `promote_${index + 1}`,
      title: built.task,
      domainTitle: ev.domainTitle,
      quadrant: normalizedQuadrant,
      weekNumber,
      frequency: built.frequency,
      milestone: `الأسبوع ${weekNumber} (${built.frequency}) — مرتبط بتقييم ${ev.domainTitle}`,
    };
  });

  // Ensure at least 1 Q1 task and balanced Q2 tasks
  if (readyToPromoteQueue.length > 0 && !readyToPromoteQueue.some((i) => i.quadrant === 'Q1')) {
    readyToPromoteQueue[0].quadrant = 'Q1';
  }

  const thirtyDayRoadmap: ThirtyDayWeek[] = [1, 2, 3, 4].map((wk) => {
    const weekItems = readyToPromoteQueue.filter((item) => item.weekNumber === wk);
    const fallbackWeekFocus =
      wk === 1
        ? `معالجة عنق الزجاجة الأبرز في ${bottleneck.domainTitle}`
        : wk === 2
          ? `توسيع الاستقرار نحو ${secondWeakest.domainTitle}`
          : wk === 3
            ? `تعزيز التكامل بالبناء على ${strongest.domainTitle}`
            : 'تقييم التحسن عبر الجوانب الثمانية وتثبيت المكاسب';
    return {
      weekNumber: wk,
      weekTitle:
        wk === 1
          ? `الأسبوع 1: احتواء ${bottleneck.domainTitle}`
          : wk === 2
            ? `الأسبوع 2: تثبيت عادات ${secondWeakest.domainTitle}`
            : wk === 3
              ? 'الأسبوع 3: تعميق التناغم بين الجوانب'
              : 'الأسبوع 4: حصاد الشهر ومعايرة العجلة',
      coreFocus: fallbackWeekFocus,
      actions:
        weekItems.length > 0
          ? weekItems.map((i) => `${i.title} (${i.domainTitle})`)
          : [`تطبيق ${buildDomainGroundedTask(bottleneck).task}`],
    };
  });

  return {
    overallBalanceScore: avgNum,
    overallDiagnosis,
    balanceIndexLabel,
    rootCauseChain,
    domainBreakdown,
    strongestSynergy,
    criticalBottleneck,
    keystoneHabits,
    thirtyDayRoadmap,
    readyToPromoteQueue,
    directorGoldenRule: `توازنك يبدأ من خطوة صادقة تلائم واقعك في ${bottleneck.domainTitle} وتستند إلى رسوخك في ${strongest.domainTitle}.`,
    generatedAt: new Date().toISOString(),
  };
}
