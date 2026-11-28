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
import {
  extractGroundedStrengthsAndChallenges,
  isConfirmationOrMetaUtterance,
  normalizeArabicDialogueText,
  truncateArabicAtWordBoundary,
} from './dialogueDeduplication';

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

function cleanExcerpt(text: string, maxLen: number = 95): string {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/["«»]/g, '')
    .trim();
  return truncateArabicAtWordBoundary(cleaned, maxLen);
}

function extractMessagesFromAnyHistory(entries: any[]): string[] {
  if (!Array.isArray(entries)) return [];
  const out: string[] = [];
  for (const item of entries) {
    if (!item) continue;
    if (typeof item === 'string') {
      if (!isConfirmationOrMetaUtterance(item)) out.push(item.trim());
      continue;
    }
    const role = String(item.sender || item.role || '').toLowerCase();
    if (role && role !== 'user') continue;
    if (item.ignoredForTurnCount || String(item.id || '').startsWith('user_confirm_')) continue;
    const raw = String(item.text || item.content || '').trim();
    if (raw && !isConfirmationOrMetaUtterance(raw)) {
      out.push(raw);
    }
  }
  return Array.from(new Set(out));
}

/**
 * Extracts structured, verbatim-grounded evidence for every one of the 8 life domains.
 * Strictly filters out confirmation/approval turns and separates Core Challenges (problems)
 * from Goals/Recommendations (solutions).
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
    // Single Source of Truth: always canonical numeric score from Wheel of Life scores
    const score = Number(scores[domainId] || 0);

    // 1. Conversation history substantive user messages
    const historyMsgs = extractMessagesFromAnyHistory(histories[domainId] || []);

    // 2. Stored answers for this domain (excluding score/confirmation entries)
    const answerMsgs: string[] = [];
    for (const [k, v] of Object.entries(answers)) {
      if (k === domainId || k.startsWith(`${domainId}_response_`)) {
        if (typeof v === 'string' && !isConfirmationOrMetaUtterance(v)) {
          answerMsgs.push(v.trim());
        } else if (v && typeof v === 'object') {
          for (const [subK, subV] of Object.entries(v)) {
            if (!subK.includes('score') && typeof subV === 'string' && !isConfirmationOrMetaUtterance(subV)) {
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

    if (typeof summaryEntry === 'string' && !isConfirmationOrMetaUtterance(summaryEntry)) {
      summaryMsgs.push(summaryEntry.trim());
    } else if (summaryEntry && typeof summaryEntry === 'object') {
      if (Array.isArray(summaryEntry.userMessages)) {
        summaryMsgs.push(...extractMessagesFromAnyHistory(summaryEntry.userMessages));
      }
      if (typeof summaryEntry.summary === 'string' && !isConfirmationOrMetaUtterance(summaryEntry.summary)) {
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

    const domainInsight = insights[domainId] || {};
    const domainGoals = Array.from(
      new Set(
        [
          ...(Array.isArray(goals[domainId]) ? goals[domainId] : []),
          ...summaryGoals,
        ].filter((g) => typeof g === 'string' && g.trim().length > 0)
      )
    );

    const userMessages = Array.from(new Set([...historyMsgs, ...answerMsgs, ...summaryMsgs]));
    const goldenRecommendation = String(
      domainInsight.goldenRecommendation || summaryGolden || ''
    ).trim();

    const grounded = extractGroundedStrengthsAndChallenges(
      domainId,
      domainTitle,
      userMessages,
      score
    );

    // Filter out generic boilerplate strengths or solution sentences mistakenly stored as challenges
    const isGenericBoilerplateStrength = (s: string) =>
      /^(?:الوضوح\s+والصراحة\s+في\s+تشخيص\s+واقع|الصراحة\s+(?:في\s+)?توصيف\s+واقع|الوعي\s+بأهمية\s+جانب)/i.test(
        s.trim()
      );
    const isSolutionPhrasing = (c: string) =>
      goldenRecommendation && normalizeArabicDialogueText(c) === normalizeArabicDialogueText(goldenRecommendation);

    const rawStrengths = [
      ...(Array.isArray(domainInsight.strengths) ? domainInsight.strengths : []),
      ...summaryStrengths,
    ].filter((s) => typeof s === 'string' && s.trim() && !isGenericBoilerplateStrength(s));

    const rawChallenges = [
      ...(Array.isArray(domainInsight.challenges) ? domainInsight.challenges : []),
      ...summaryChallenges,
    ].filter((c) => typeof c === 'string' && c.trim() && !isSolutionPhrasing(c));

    const strengths = Array.from(
      new Set(rawStrengths.length > 0 ? rawStrengths : grounded.strengths)
    );
    const challenges = Array.from(
      new Set(rawChallenges.length > 0 ? rawChallenges : grounded.challenges)
    );

    return {
      domainId,
      domainTitle,
      score,
      userMessages,
      strengths,
      challenges,
      goals: domainGoals,
      goldenRecommendation,
      combinedEvidenceText: [
        ...userMessages,
        ...challenges,
        ...strengths,
        ...domainGoals,
        goldenRecommendation,
      ].join(' '),
    };
  });
}

function buildGroundedPromptContextForLLM(
  evidences: DomainEvidenceSummary[],
  scores: Record<string, number>
): string {
  return evidences
    .map((ev) => {
      const canonical = ev.score > 0 ? ev.score : Number(scores[ev.domainId] || 0);
      const displayScore = `${canonical.toFixed(1)}/10`;
      const msgsBlock =
        ev.userMessages.length > 0
          ? ev.userMessages.map((m, idx) => `    ${idx + 1}) "${cleanExcerpt(m, 160)}"`).join('\n')
          : '    (لم تُسجل رسائل حوارية جوهرية في هذه المحطة — اعتمد على الدرجة والأهداف المسجلة فقط دون اختلاق)';
      return `• ${ev.domainTitle} (الدرجة الموثقة — مصدر الحقيقة الوحيد: ${displayScore}):
  - ما ذكرته فعلياً في الجلسة (مصفّى من رسائل التأكيد):
${msgsBlock}
  - نقاط القوة المستخلصة: ${ev.strengths.join(' | ')}
  - التحدي الفعلي (المشكلة فقط): ${ev.challenges.join(' | ')}
  - التوصية والأهداف المقترحة (الحل): ${ev.goldenRecommendation || (ev.goals.length > 0 ? ev.goals.join(' | ') : 'لم تُثبت أهداف بعد')}`;
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
  const careerEv = byId.get('career');
  const learningEv = byId.get('learning');
  const personalEv = byId.get('personal');
  const familyEv = byId.get('family');
  const socialEv = byId.get('social');
  const spiritualEv = byId.get('spiritual');

  if (ev.domainId === 'health') {
    if (/(نوم|سهر|ارهاق|إرهاق|تعب|خمول|شاشات)/i.test(txt) && (careerEv || learningEv)) {
      const target = (careerEv?.score || 10) <= (learningEv?.score || 10) ? careerEv! : learningEv!;
      return `تذبذب النوم أو الطاقة البدنية لديك ينعكس مباشرة على تركيزك وإنجازك في ${target.domainTitle} (${target.score.toFixed(1)}/10).`;
    }
    if (ev.score >= 7.5 && weakest.domainId !== 'health') {
      return `مستوى نشاطك البدني الحالي يمنحك قدرة أعلى على تحمّل ضغوط ${weakest.domainTitle}.`;
    }
  }

  if (ev.domainId === 'career') {
    if (/(ساعات|دوام|ضغط|احتراق|مهام|تسويف)/i.test(txt) && personalEv && familyEv) {
      const drained = personalEv.score <= familyEv.score ? personalEv : familyEv;
      return `امتداد ضغط ساعات العمل والمسؤوليات المهنية يضغط على المساحة المتاحة لك في ${drained.domainTitle} (${drained.score.toFixed(1)}/10).`;
    }
  }

  if (ev.domainId === 'spiritual') {
    if (ev.score >= 7.0 && personalEv) {
      return `رصيدك الروحي والسكينة هنا يشكّلان قاعدة تهدئة تخفف التوتر داخل ${personalEv.domainTitle}.`;
    }
    if (ev.score < 5.5 && personalEv) {
      return `تراجع السكينة والحضور القلبي لديك يزيد قابلية التشتت الذهني داخل ${personalEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'financial') {
    if (/(ديون|قسط|أقساط|عجز|ضغط|لا يكفي|ما يكفي|ادخار|مقاهي)/i.test(txt) && personalEv) {
      return `انشغال بالك بالتدفق المالي أو المصاريف المتكررة يرفع الحمل النفسي داخل ${personalEv.domainTitle}.`;
    }
    if (ev.score >= 7.0 && familyEv) {
      return `استقرارك المالي الحالي يقلل التوترات المعيشية ويدعم هدوء ${familyEv.domainTitle}.`;
    }
  }

  if (ev.domainId === 'personal') {
    if (/(فراغ|هوايات|جلد الذات|تشتت|توتر|انعزال)/i.test(txt) && socialEv) {
      return `الفراغ أو الضغط النفسي في هذا البعد يرتبط بتراجع المبادرة والطاقة لديك في ${socialEv.domainTitle} (${socialEv.score.toFixed(1)}/10).`;
    }
  }

  if (ev.domainId === 'learning' && careerEv) {
    return ev.score >= 6.5
      ? `رصيدك المعرفي الحالي يرفع كفاءتك وجاهزيتك في ${careerEv.domainTitle}.`
      : `تقطع التطوير المعرفي يبطئ التقدم والوضوح لديك في ${careerEv.domainTitle}.`;
  }

  if (ev.domainId === 'family' && personalEv) {
    return ev.score >= 7.0
      ? `الدفء والتماسك الأسري في بيتك يمثلان مظلة أمان نفسية تسند ${personalEv.domainTitle}.`
      : `تذبذب التواصل داخل البيت يسحب جزءاً من صفاء ذهنك المطلوب في ${personalEv.domainTitle}.`;
  }

  if (ev.domainId === 'social' && personalEv) {
    return ev.score >= 7.0
      ? `وجود محيط اجتماعي داعم يغذي مرونتك النفسية في ${personalEv.domainTitle}.`
      : `قلة التواصل الداعم أو العزلة في محيطك تزيد الثقل النفسي الفردي في ${personalEv.domainTitle}.`;
  }

  if (ev.domainId === strongest.domainId) {
    return `بصفته أعلى جوانبك تقييماً (${ev.score.toFixed(1)}/10)، يمثل مصدراً جاهزاً لمدّ ${weakest.domainTitle} بالزخم العملي.`;
  }
  return ev.score < 5.5
    ? `تراجع هذا البعد (${ev.score.toFixed(1)}/10) يسحب من طاقتك ويحد من استقرار بقية مجالات يومك المرتبطة به.`
    : `يحافظ هذا البعد لديك على مستوى متوازن نسبياً (${ev.score.toFixed(1)}/10) ويمكن توظيفه لدعم ${weakest.domainTitle}.`;
}

/**
 * Unified Eisenhower Matrix Classifier used identically by Section 2 & Section 5.
 * STRICT RULE: Never classifies skill-building, learning, or habit-formation tasks as Q3.
 */
export function classifyUnifiedEisenhowerQuadrant(
  score: number,
  taskText: string
): {
  quadrantCode: 'Q1' | 'Q2';
  quadrantLabel: 'Q1: عاجل ومهم' | 'Q2: مهم وغير عاجل';
} {
  const urgentScore = score > 0 && score < 5.0;
  const urgentCrisisKeyword = /(ديون|أقساط|نزيف|عجز\s*مالي|انهيار|ساعات\s*(?:عمل|دوام)\s*طويلة|ثالثة\s*فجراً|احتراق)/i.test(
    taskText
  );
  if (urgentScore || urgentCrisisKeyword) {
    return { quadrantCode: 'Q1', quadrantLabel: 'Q1: عاجل ومهم' };
  }
  return { quadrantCode: 'Q2', quadrantLabel: 'Q2: مهم وغير عاجل' };
}

interface UnifiedDomainActionPlan {
  ev: DomainEvidenceSummary;
  task: string;
  quadrantCode: 'Q1' | 'Q2';
  quadrantLabel: 'Q1: عاجل ومهم' | 'Q2: مهم وغير عاجل';
  week: number;
  frequency: 'يومي' | 'أسبوعي';
}

function buildUnifiedDomainPlan(
  ev: DomainEvidenceSummary,
  rankFromLowest: number
): UnifiedDomainActionPlan {
  let task = '';
  if (ev.goals.length > 0) {
    task = ev.goals[0];
  } else if (ev.goldenRecommendation) {
    task = ev.goldenRecommendation;
  } else if (ev.userMessages.length > 0) {
    const snippet = cleanExcerpt(ev.userMessages[ev.userMessages.length - 1], 75);
    task = `معالجة ما ذكرته حول (${snippet}) بخطوة عملية مباشرة في ${ev.domainTitle}`;
  } else {
    task = `تثبيت خطوة عملية محددة لرفع استقرار ${ev.domainTitle} بما يناسب جدولك`;
  }

  const { quadrantCode, quadrantLabel } = classifyUnifiedEisenhowerQuadrant(ev.score, task);
  const week =
    quadrantCode === 'Q1'
      ? 1
      : rankFromLowest < 2
        ? 1
        : rankFromLowest < 4
          ? 2
          : rankFromLowest < 6
            ? 3
            : 4;
  const frequency: 'يومي' | 'أسبوعي' =
    /(أسبوع|جمعة|سبت|شهري|ميزانية|فواتير|زيارة|درس\s*واحد|مكالمة)/i.test(task)
      ? 'أسبوعي'
      : 'يومي';

  return {
    ev,
    task,
    quadrantCode,
    quadrantLabel,
    week,
    frequency,
  };
}

/**
 * Matches each keystone habit's logical time slot strictly to its domain and action nature
 * (e.g., financial/savings habits NEVER assigned before sleep).
 */
export function inferLogicalTimeSlotForHabit(
  domainTitleOrId: string,
  stepText: string,
  isStudent: boolean
): string {
  const combined = `${domainTitleOrId} ${stepText}`;

  // 1. Sleep / night / phone curfew -> Pre-sleep
  if (/(نوم|سهر|سرير|فراش|قبل\s*النوم|شاشات|مساء|ليلاً)/i.test(combined)) {
    return 'في الساعة الأخيرة قبل النوم';
  }

  // 2. Financial savings, budgeting, income -> Payday / Weekly budget review (NEVER before sleep!)
  if (
    /(مالي|ادخار|توفير|أوفر|أدخر|مصروف|مكافأة|راتب|مقاهي|مطاعم|أقساط|ديون|ميزانية)/i.test(
      combined
    )
  ) {
    return 'عند استلام الدخل والمراجعة المالية الأسبوعية';
  }

  // 3. Morning spiritual / deep-focus / start-of-day work/study -> Morning
  if (
    /(الروحي|صباح|فجر|ورد|قرآن|مذاكرة|عمل|دوام|مشروع|هندسة|تركيز)/i.test(combined)
  ) {
    return isStudent ? 'قبل بدء المحاضرات الصباحية' : 'في مستهل الصباح قبل زحام المهام';
  }

  // 4. Learning / hobbies / exercise / family / social -> Post-work/study or Weekend
  if (/(اجتماعي|أصدقاء|صديق|تواصل|مكالمة|أسبوعي|جمعة|سبت)/i.test(combined)) {
    return 'في عطلة نهاية الأسبوع أو المساء الهادئ';
  }

  return isStudent ? 'بعد الانتهاء من اليوم الجامعي' : 'عند خط الفصل بين العمل والمساء';
}

/**
 * Enforces strictly distinct primary domains, unique normalized steps,
 * and logical time slots across all Keystone Habits.
 */
export function deduplicateAndValidateKeystoneHabits(
  habits: KeystoneHabit[],
  isStudent: boolean
): KeystoneHabit[] {
  const seenPrimaryDomains = new Set<string>();
  const seenSteps = new Set<string>();
  const cleaned: KeystoneHabit[] = [];

  for (const h of habits) {
    const step = String(h.exactStep || h.name || '').trim();
    const normStep = normalizeArabicDialogueText(step);
    const primaryDomain = getDomainArabicName(
      (Array.isArray(h.targetDomains) && h.targetDomains[0]) || ''
    );

    if (!step || seenSteps.has(normStep)) continue;
    if (primaryDomain !== 'الجانب الحياتي' && seenPrimaryDomains.has(primaryDomain)) continue;

    seenSteps.add(normStep);
    if (primaryDomain !== 'الجانب الحياتي') seenPrimaryDomains.add(primaryDomain);

    const validatedTime = inferLogicalTimeSlotForHabit(
      `${primaryDomain} ${h.name || ''}`,
      step,
      isStudent
    );

    cleaned.push({
      ...h,
      triggerTime: validatedTime,
      targetDomains: Array.from(
        new Set((h.targetDomains || []).map((d) => getDomainArabicName(d)))
      ).slice(0, 3),
    });

    if (cleaned.length >= 4) break;
  }

  return cleaned;
}

/**
 * Reconciles Section 2 (domainBreakdown) and Section 5 (readyToPromoteQueue)
 * so quadrants and tasks match identically across both sections and no skill/habit is Q3.
 */
export function reconcileSectionQuadrantsAndHabits<T extends Record<string, any>>(
  report: T,
  isStudent: boolean
): T {
  const next: Record<string, any> = { ...report };

  if (Array.isArray(next.domainBreakdown)) {
    next.domainBreakdown = next.domainBreakdown.map((d: any) => {
      const { quadrantLabel } = classifyUnifiedEisenhowerQuadrant(
        Number(d?.score || 0),
        String(d?.actionableTask || '')
      );
      return {
        ...d,
        domainTitle: getDomainArabicName(d?.domainTitle || ''),
        eisenhowerQuadrant: quadrantLabel,
      };
    });
  }

  if (Array.isArray(next.readyToPromoteQueue) && Array.isArray(next.domainBreakdown)) {
    const breakdownByDomain = new Map<string, any>(
      next.domainBreakdown.map((d: any) => [getDomainArabicName(d.domainTitle), d])
    );
    next.readyToPromoteQueue = next.readyToPromoteQueue.map((item: any) => {
      const domName = getDomainArabicName(item?.domainTitle || '');
      const matched = breakdownByDomain.get(domName);
      if (matched) {
        const quadCode: 'Q1' | 'Q2' = String(matched.eisenhowerQuadrant).startsWith('Q1')
          ? 'Q1'
          : 'Q2';
        return {
          ...item,
          domainTitle: domName,
          quadrant: quadCode,
          weekNumber: matched.planWeek || item.weekNumber,
          frequency: matched.planFrequency || item.frequency,
        };
      }
      const { quadrantCode } = classifyUnifiedEisenhowerQuadrant(5.5, String(item?.title || ''));
      return {
        ...item,
        domainTitle: domName,
        quadrant: quadrantCode,
      };
    });
  }

  if (Array.isArray(next.keystoneHabits)) {
    next.keystoneHabits = deduplicateAndValidateKeystoneHabits(next.keystoneHabits, isStudent);
  }

  return next as T;
}

/**
 * Builds a complete, anti-generic, evidence-grounded Director Summary report
 * strictly using the canonical numeric scores, filtered substantive dialogue,
 * unified Q1/Q2 classification, deduplicated habits, and unified second-person tone.
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

  // Build unified domain action plans (single source for BOTH Section 2 and Section 5)
  const rankMap = new Map<LifeAreaId, number>();
  [...evidences]
    .sort((a, b) => (a.score || 5.5) - (b.score || 5.5))
    .forEach((ev, idx) => rankMap.set(ev.domainId, idx));

  const unifiedPlans = evidences.map((ev) =>
    buildUnifiedDomainPlan(ev, rankMap.get(ev.domainId) ?? 0)
  );
  const planByDomainId = new Map(unifiedPlans.map((p) => [p.ev.domainId, p]));

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
  const isStudent = status.includes('طالب');

  // Section 1: Root-Cause Chain (strict second-person voice, no confirmation quotes)
  const bottleneckFact =
    bottleneck.userMessages[0]
      ? `ما ذكرتَه حول «${cleanExcerpt(bottleneck.userMessages[0], 85)}»`
      : `تراجع تقييمك فيه إلى (${bottleneck.score.toFixed(1)}/10)`;
  const secondFact =
    secondWeakest.domainId !== bottleneck.domainId && secondWeakest.userMessages[0]
      ? `، وما أشرتَ إليه في ${secondWeakest.domainTitle} بشأن «${cleanExcerpt(secondWeakest.userMessages[0], 75)}»`
      : '';
  const strongestFact =
    strongest.userMessages[0]
      ? `استناداً إلى ما أثبتَّه من ممارسة في ${strongest.domainTitle} («${cleanExcerpt(strongest.userMessages[0], 75)}»)`
      : `بالاستناد إلى استقرار ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10) كأعلى جوانبك الحالية`;

  const rootCauseChain = `تُظهر خريطة تفاعلك عبر المحطات الثمانية سلسلة تأثير مترابطة: في ${bottleneck.domainTitle} (${bottleneck.score.toFixed(1)}/10)، يؤدي ${bottleneckFact} إلى استنزاف في طاقتك اليومية ينعكس تلقائياً${secondFact}. في المقابل، يمكنك توظيف ${strongestFact} كمرساة تُعيد التوازن لبقية جوانب حياتك بالتدريج دون تشتت.`;

  const overallDiagnosis = `${userName ? `يا ${userName}، ` : ''}بناءً على قراءة واقعك الفعلي عبر الأبعاد الثمانية بمعدل توازن عام (${avgNum.toFixed(1)}/10) ضمن «${balanceIndexLabel}»، يبرز ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10) كأقوى نقطة ارتكاز لديك، بينما يشكّل ${bottleneck.domainTitle} (${bottleneck.score.toFixed(1)}/10) عنق الزجاجة الأهم حالياً.`;

  // Section 2: All 8 domains deep breakdown (Strict second-person voice & separated Problem vs Solution)
  const domainBreakdown: DomainDeepBreakdownItem[] = unifiedPlans.map((plan) => {
    const ev = plan.ev;
    const realityParts: string[] = [];
    if (ev.userMessages.length > 0) {
      realityParts.push(`ذكرتَ في هذه المحطة: «${cleanExcerpt(ev.userMessages[ev.userMessages.length - 1], 110)}»`);
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
          ? `رُصد تقييمك عند (${ev.score.toFixed(1)}/10) دون تفاصيل حوارية موسّعة في هذه المحطة.`
          : 'لم يبدأ الحوار التشخيصي الكامل في هذه المحطة بعد.'
      );
    }

    return {
      domainTitle: ev.domainTitle,
      score: ev.score,
      groundedReality: realityParts.join(' • '),
      crossDomainImpact: detectCrossDomainLink(ev, evidences, strongest, bottleneck),
      actionableTask: plan.task,
      eisenhowerQuadrant: plan.quadrantLabel,
      planWeek: plan.week,
      planFrequency: plan.frequency,
    };
  });

  // Section 3: Core Leverage & Primary Bottleneck (Core Challenge = Problem only; Recommendation = Rescue protocol)
  const leverageAnchorDetail =
    strongest.strengths[0] ||
    (strongest.userMessages[0]
      ? `ما شاركتَه حول «${cleanExcerpt(strongest.userMessages[0], 80)}»`
      : 'ثباتك النسبي في هذا الجانب');
  const strongestSynergy = {
    title:
      strongest.score >= 7.8
        ? `استثمار قوة ${strongest.domainTitle} لرفع بقية الجوانب`
        : `توظيف استقرار ${strongest.domainTitle} كنقطة انطلاق`,
    description: `انطلاقاً من ${leverageAnchorDetail} في ${strongest.domainTitle} (${strongest.score.toFixed(1)}/10)، يمكنك تحويل هذا الانضباط والهدوء إلى جسر عملي يدعم ${bottleneck.domainTitle}${secondWeakest.domainId !== bottleneck.domainId ? ` و${secondWeakest.domainTitle}` : ''} عبر ربط خطوتك الجديدة بروتينك المستقر هناك.`,
    domainsInvolved: Array.from(
      new Set([strongest.domainTitle, bottleneck.domainTitle, secondWeakest.domainTitle])
    ),
  };

  const bottleneckPlan = planByDomainId.get(bottleneck.domainId)!;
  const bottleneckProblemOnly =
    bottleneck.challenges[0] ||
    (bottleneck.userMessages[0]
      ? `الضغط الناتج عمّا ذكرتَه حول «${cleanExcerpt(bottleneck.userMessages[0], 85)}»`
      : `تراجع درجة هذا الجانب لديك إلى (${bottleneck.score.toFixed(1)}/10)`);
  const criticalBottleneck = {
    title: `بروتوكول إنقاذ ${bottleneck.domainTitle}`,
    impact: `${bottleneckProblemOnly} يستنزف من طاقتك اليومية ويزيد كلفة الثبات في بقية مجالات حياتك.`,
    recommendation: bottleneck.goldenRecommendation || bottleneckPlan.task,
    domain: bottleneck.domainTitle,
  };

  // Section 4: 3-4 Deduplicated Keystone Habits with logically matched Time Slots
  const prioritizedForHabits = [...pool]
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const rawHabits: KeystoneHabit[] = prioritizedForHabits.map((domEv, idx) => {
    const domPlan = planByDomainId.get(domEv.domainId)!;
    const secondTarget =
      idx === 0
        ? strongest.domainTitle
        : bottleneck.domainTitle !== domEv.domainTitle
          ? bottleneck.domainTitle
          : strongest.domainTitle;
    const thirdTarget =
      domEv.domainId === 'health' || domEv.domainId === 'spiritual'
        ? 'الجانب الشخصي والوعي بالذات'
        : 'الجانب الصحي والبدني';

    return {
      name: `عادة محورية لـ ${domEv.domainTitle}`,
      triggerTime: inferLogicalTimeSlotForHabit(domEv.domainTitle, domPlan.task, isStudent),
      exactStep: domPlan.task,
      targetDomains: Array.from(new Set([domEv.domainTitle, secondTarget, thirdTarget])).slice(0, 3),
      expectedImpact: `معالجة مباشرة للتحدي المذكور في ${domEv.domainTitle} مع أثر إيجابي ممتد على ${secondTarget}.`,
    };
  });

  const keystoneHabits = deduplicateAndValidateKeystoneHabits(rawHabits, isStudent);

  // Section 5: Ready-to-Promote Action Queue bound identically to Section 2 plans
  const prioritizedPlans = [...unifiedPlans].sort((a, b) => {
    const sa = a.ev.score > 0 ? a.ev.score : 5.5;
    const sb = b.ev.score > 0 ? b.ev.score : 5.5;
    return sa - sb;
  });

  const readyToPromoteQueue: PromotableActionItem[] = prioritizedPlans.slice(0, 7).map((plan, index) => ({
    id: `promote_${index + 1}`,
    title: plan.task,
    domainTitle: plan.ev.domainTitle,
    quadrant: plan.quadrantCode,
    weekNumber: plan.week,
    frequency: plan.frequency,
    milestone: `الأسبوع ${plan.week} (${plan.frequency}) — مرتبط بتقييم ${plan.ev.domainTitle}`,
  }));

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
          : [bottleneckPlan.task],
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
