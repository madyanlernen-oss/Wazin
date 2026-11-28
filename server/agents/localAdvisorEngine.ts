import { extractExplicitRating } from '../middleware/validation';
import {
  calculateUnifiedScore,
  extractUnifiedMetricsFromSession,
  formatUnifiedScoreConfirmationMessage,
} from './unifiedScorer';
import { parseUserContext, getDomainContextConfig } from '../../src/utils/contextPersonalization';
import { generateDynamicQuickSuggestions } from '../../src/utils/dynamicSuggestions';
import {
  synthesizeGoldenRecommendation,
  generateConcreteDomainSuggestions,
} from '../../src/utils/realisticGoalsGenerator';
import {
  isGenuineUserQuestion,
  pickNextUnaskedQuestion,
  isQuestionAlreadyAsked,
  isQuestionContradictingHistory,
  isDiagnosticTopicAlreadyAnswered,
  isRequestingAdvisorSuggestions,
  stripRepeatedOpeningGreeting,
  hasDebtStatusAnswered,
  extractExpenseCategoryFromAnswer,
  extractEmergencyFundStatus,
  extractAnchorSelfRatingFromHistory,
  hasAcuteIsolationOrRejection,
  isEmptyOrMeaninglessInput,
  MEANINGLESS_INPUT_PROMPT_AR,
  sanitizeArabicGrammarAndMorphology,
  buildComplaintAnchoredReply,
} from '../../src/utils/dialogueDeduplication';

// مصفوفة من 4 ردود استكشافية محايدة ومختلفة لكل محطة من المحطات الثماني لمنع التكرار عند اللجوء للمحرك المحلي
export const STATION_NEUTRAL_FALLBACKS: Record<string, string[]> = {
  spiritual: [
    'أسمعك باهتمام وهدوء. متى كانت آخر لحظة شعرت فيها بصفاء ذهني وسلام داخلي حقيقي بعيداً عن صخب المهام والشاشات؟ وما الذي ساعدك وقتها؟',
    'أقدر صراحتك ووضوحك. في زحام يومك المعتاد، ما هو المشتت الأكبر الذي يسرق حضور قلبك وهدوءك النفسي أكثر من غيره؟',
    'تأملك في واقعك هو بداية التوازن. إذا أتيحت لك 10 دقائق فقط يومياً للانفصال عن الهاتف والضوضاء، أي وقت في يومك تراه الأنسب لتثبيتها؟',
    'حديثك يوضح وعيك بما تحتاج إليه نفسك. ما العادة البسيطة والخفيفة التي تشعر أنها قريبة من قلبك ويمكن أن تمنحك طمأنينة أسبوعية دون ضغط؟',
  ],
  financial: [
    'أقدر صراحتك في وصف واقعك المالي. قبل التخطيط للادخار، هل تقتطع أي أقساط أو ديون أو التزامات حتمية جزءاً من دخلك الشهري؟',
    'الوضوح المالي يبدأ بحصر الواقع. ما هو البند الشهري أو الأسبوعي الذي تلاحظ أنه يستهلك النسبة الأكبر من تدفقك النقدي؟',
    'أفهم طبيعة التحدي المالي في مرحلتك الحالية. كيف تتصرف عادةً عندما تتزاحم الالتزامات الثابتة وتقترب نهاية الشهر؟',
    'نظرتك الواقعية ممتازة. ما الإجراء المالي العملي الأهم للأسبوع القادم: ترتيب سداد التزاماتك أم ضبط مصاريفك وبناء احتياطي ميسر؟',
  ],
  health: [
    'أسمعك باهتمام. كيف يبدو إيقاع نومك واستيقاظك في الأيام الأخيرة، وهل تستيقظ بطاقة كافية لبدء يومك؟',
    'الجسد يرسل إشاراته بوضوح عندما يرهق. خلال ساعات يومك المعتاد، متى تلاحظ هبوط طاقتك الجسدية أو حاجتك إلى حركة وتنفس؟',
    'أقدّر مشاركتك لتفاصيل صحتك. كيف تصف علاقتك بشرب الماء والنشاط الحركي البسيط وسط انشغالك اليومي؟',
    'العناية بالبدن لا تتطلب مجهوداً شاقاً. ما العادة الصحية الصغيرة (في النوم أو المشي أو الغذاء) التي ترى أنها ستنعش نشاطك هذا الأسبوع؟',
  ],
  career: [
    'أسمعك بتركيز. في مسارك المهني ومهامك اليومية الحالية، ما الشيء الذي يستهلك وقتك وطاقتك الأكبر دون أن تشعر أنه يقربك من أهداف العمل الأساسية؟',
    'وضوح البوصلة يصنع الفارق. ما هو الجزء من عملك أو دراستك الذي تشعر فيه بأعلى تركيز وإنجاز، ومتى يتشتت انتباهك عادة؟',
    'أفهم ما تمر به من ضغط أو تشتت. كيف تحمي وقت تركيزك العميق من المقاطعات المفاجئة أو الإشعارات المتكررة خلال اليوم؟',
    'خطوة واحدة واضحة قد تفتح آفاقاً كبيرة. ما هي المهارة أو المهمة المؤجلة التي لو خصصت لها 30 دقيقة منتظمة لارتفع رضاك المهني؟',
  ],
  personal: [
    'أسمعك بتفهم واحتواء. عندما يمر عليك يوم مثقل بالمهام أو الضغوط، كيف تتعامل مع نفسك داخلياً في تلك اللحظات؟',
    'وعي الإنسان بمشاعره علامة نضج. هل تمنح نفسك مساحة خاصة للراحة الذهنية واستعادة توازنك دون الشعور بتأنيب أو ضغط؟',
    'تقدير الذات يبدأ بالإنصات الصادق. ما النمط أو الفكرة المتكررة التي تلاحظ أنها تستهلك طاقتك النفسية أكثر من غيرها؟',
    'الخطوات الصغيرة تصنع أثراً ثابتاً. ما الإجراء البسيط الذي لو التزمت به لنفسك هذا الأسبوع لشعرت بقدر أكبر من الاتزان الداخلي؟',
  ],
  learning: [
    'شغف التطور يبدأ بالفضول الصادق. في هذه المرحلة من حياتك، ما هي المهارة أو المجال المعرفي الذي تود التعمق فيه أكثر؟',
    'أقدّر صراحتك. ما الذي يقف عادةً بينك وبين تخصيص وقت ثابت للقراءة أو التعلم العميق خلال الأسبوع؟',
    'التعلم التراكمي الهادئ أفضل من الاندفاع المؤقت. كم دقيقة يومياً تظن أنها واقعية ومريحة لك للقراءة أو الاستماع لمحتوى نافع؟',
    'ربط المعرفة بالواقع يثبتها. ما الفكرة أو المهارة التي تعلمتها مؤخراً وتود تحويلها إلى تطبيق عملي في يومك؟',
  ],
  family: [
    'أسمعك باهتمام وتقدير. كيف تصف جودة الوقت الهادئ الذي تقضيه مع عائلتك بعيداً عن انشغال الهواتف والمهام؟',
    'الدفء الأسري يُبنى في التفاصيل البسيطة. ما التحدي الأكبر الذي يصعّب عليكم الجلوس معاً والتواصل بأريحية خلال الأسبوع؟',
    'التفاهم داخل البيت يحتاج مساحة إنصات. عندما يقع توتر أو اختلاف عابر في الأسرة، ما الأسلوب الذي يساعدكم على تهدئة الأجواء؟',
    'اللحظات المشتركة تترك أثراً عميقاً. ما النشاط أو الجلسة البسيطة التي تتمنى إحياءها مع أسرتك في الأيام القادمة؟',
  ],
  social: [
    'أسمعك بصدق واهتمام. هل تشعر أن دائرتك الاجتماعية الحالية تمنحك دعماً وإلهاماً متوازناً، أم تستنزف طاقتك؟',
    'التوازن الاجتماعي فن لطيف. كيف تدير التوفيق بين تلبية واجباتك الاجتماعية وحماية وقتك الشخصي للراحة؟',
    'العلاقات النوعية تتفوق على الكثرة. ما الصفة الأهم التي تجعلك ترتاح وتثق بمن تتواصل معهم في محيطك؟',
    'خطوة تواصل صغيرة قد تصنع فرقاً كبيراً. ما المبادرة الودية أو الحد الصحي الذي تود تطبيقه في علاقاتك هذا الأسبوع؟',
  ],
};

// متغير يتتبع آخر index مستخدم للـ Fallback في الجلسة الحالية لمنع تكرار نفس الرد في جولتين متتاليتين
const lastFallbackIndexBySession = new Map<string, number>();

export function resetLocalFallbackTracker(sessionKey?: string): void {
  if (sessionKey) {
    lastFallbackIndexBySession.delete(sessionKey);
  } else {
    lastFallbackIndexBySession.clear();
  }
}

export function pickNonRepeatingFallbackReply(
  agentKey: string,
  turnCount: number = 0,
  sessionIdentifier: string = 'default',
  userProfile?: any,
  userName?: string,
  historyTexts: string[] = []
): { reply: string; index: number } {
  const ctx = parseUserContext(userProfile, userName);
  const contextPool = userProfile
    ? getDomainContextConfig(agentKey, ctx).exploratoryQuestions
    : null;
  const pool =
    contextPool && contextPool.length > 0
      ? contextPool
      : STATION_NEUTRAL_FALLBACKS[agentKey] || STATION_NEUTRAL_FALLBACKS.personal;
  const trackerKey = `${sessionIdentifier}:${ctx.workStatus}:${ctx.dependentsLabel}:${agentKey}`;
  const lastIdx = lastFallbackIndexBySession.get(trackerKey);

  let nextIdx = turnCount >= 0 ? turnCount % pool.length : 0;
  if (lastIdx !== undefined && nextIdx === lastIdx) {
    nextIdx = (lastIdx + 1) % pool.length;
  }

  // تأكد من عدم تكرار أي سؤال ورد سابقاً أو أُجيب عليه بالفعل في سجل المحادثة الحالية
  if (historyTexts.length > 0) {
    const unasked = pickNextUnaskedQuestion(pool, historyTexts, nextIdx);
    if (unasked.question && unasked.index >= 0) {
      lastFallbackIndexBySession.set(trackerKey, unasked.index);
      return { reply: unasked.question, index: unasked.index };
    }

    // في حال استنفاد جميع الأسئلة التشخيصية الثابتة، نولّد سؤال متابعة أمامي دون إعادة سؤال قديم
    lastFallbackIndexBySession.set(trackerKey, nextIdx);
    if (agentKey === 'financial') {
      const efStatus = extractEmergencyFundStatus(historyTexts);
      if (efStatus.hasFund && efStatus.monthsCovered !== null && efStatus.monthsCovered >= 1 && efStatus.monthsCovered < 6) {
        return {
          reply: `بما أن صندوق طوارئك يغطي ${efStatus.monthsCovered} أشهر حالياً، ما الخطوة العملية التي تناسبك الآن لاستكماله إلى 6 أشهر وبالتوازي توجيه جزء من الفائض لاستثمار طويل المدى؟`,
          index: nextIdx,
        };
      }
      if (efStatus.hasFund || hasDebtStatusAnswered(historyTexts, '')) {
        return {
          reply: 'انطلاقاً مما وضحته حول وضعك المالي، ما فرصة النمو أو استثمار الفائض التي ترغب في التركيز عليها خلال المرحلة القادمة؟',
          index: nextIdx,
        };
      }
    }
    return {
      reply: 'بناءً على ما شاركته حتى الآن، ما الخطوة العملية التالية التي تراها الأنسب لوضعك الحالي خلال هذا الأسبوع؟',
      index: nextIdx,
    };
  }

  lastFallbackIndexBySession.set(trackerKey, nextIdx);
  return { reply: pool[nextIdx], index: nextIdx };
}

const EIGHT_EVALUATION_DOMAINS = new Set([
  'spiritual',
  'financial',
  'health',
  'career',
  'personal',
  'learning',
  'family',
  'social',
]);

function stripEarlyTurnScoreMentions(text: string): string {
  return (text || '')
    .replace(/بعد\s*ما\s*شاركتني[\s\S]*?(?:أكثر\s*دقة\s*[؟?]|المحطة\s*التالية\s*[؟?]?)/gi, '')
    .replace(/[^\n.]*(?:أقيّم|أقيم)\s*(?:وضعك|حالتك)[^\n.]*\d+(?:\.\d+)?\s*(?:\/|\s*من\s*)\s*10[^\n.]*[.!؟]?/gi, '')
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:\/|\s*من\s*)\s*10\s*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateLocalAgentResponse(
  agentKey: string,
  message: string,
  userName: string,
  advisor: any,
  score: number = 0,
  isEvaluationSession?: boolean,
  evaluationStep?: number,
  evaluationQuestionTitle?: string,
  assessmentMode: 'initial_assessment' | 'weekly_checkin' = 'weekly_checkin',
  stationTurnCount: number = 0,
  userProfile?: any,
  previousSuggestions?: string[],
  historyTexts?: string[],
  isEditedOrResent: boolean = false,
  historyUserOnlyTexts?: string[]
) {
  const msg = message.toLowerCase().trim();
  const parsedCtx = parseUserContext(userProfile, userName);
  const status = parsedCtx.workStatus;
  const isStudent = parsedCtx.isStudent;
  const isBusiness = parsedCtx.isBusiness;
  const isJobSeeker = parsedCtx.isJobSeeker;
  const isRetired = parsedCtx.isRetired;
  const isVariableIncome = parsedCtx.isVariableIncome;
  const incomeSrc = parsedCtx.incomeSource || (isStudent ? 'المكافأة الجامعية/المصروف' : '');
  const incomeStab = parsedCtx.incomeStability;
  const hasDep = parsedCtx.hasDependents;
  const isEightDomain = EIGHT_EVALUATION_DOMAINS.has(agentKey);
  const isEarlyConversationalTurn = isEightDomain && stationTurnCount < 2;

  const rawSessionUserTexts = Array.isArray(historyUserOnlyTexts)
    ? [...historyUserOnlyTexts, message]
    : [...(historyTexts || []).filter((t) => !/(?:أهلاً بك|أقيّم وضعك|التقييم المستحق|بصفتي مستشارك|هل ترغب في اعتماد التقييم)/i.test(String(t || ''))), message];
  const sessionUserMessages = rawSessionUserTexts
    .map((t) => String(t || '').trim())
    .filter(
      (t) =>
        t.length > 0 &&
        !/^(?:اعتمد\s*التقييم(?:\s*بدرجة.*)?|نعم\s*اعتمد|اعتماد|نكتفي|خلاص|انتهينا|أرغب في الاستمرار|حسناً?\s*نكمل)/i.test(
          t
        )
    );
  const currentSessionUnifiedScore =
    sessionUserMessages.length > 0
      ? calculateUnifiedScore(extractUnifiedMetricsFromSession(sessionUserMessages, agentKey))
      : (score > 0
        ? Number((score > 10 ? score / 10 : score).toFixed(1))
        : 5.5);
  const currentSessionSemanticScore = currentSessionUnifiedScore;
  const accountName = parsedCtx.name !== 'عزيزي' ? parsedCtx.name : '';
  const userGreeting = accountName ? `يا ${accountName}` : '';

  // تنظيف الرسالة من التحيات التمهيدية لاستخراج الجوهر الحقيقي لكلام المستفيد
  const salutationRegex = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i;
  const coreMsg = msg.replace(salutationRegex, '').trim();
  const hasPriorHistory = Boolean(isEditedOrResent) || (Array.isArray(historyTexts) && historyTexts.length > 0);
  const isBareGreetingOnly =
    !isEditedOrResent &&
    !hasPriorHistory &&
    !coreMsg &&
    /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(msg);

  // 0. بروتوكول استثناء طوارئ إنساني حاسم ومطلق (Safety & Empathy Override) - الأولوية القصوى المطلقة
  const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(msg);

  // 1. استجابة تخصصية فورية لأزمات المستشارين (Domain Distress)
  const hasDebtNegation = /(بدون\s*ديون|لا\s*(?:يوجد\s*)?ديون|ليس\s*(?:لدي|عندي)\s*ديون|ما\s*عندي\s*ديون|خالي\s*من\s*الديون|خلو\s*سجلي\s*من\s*الديون|التزامات\s*(?:دراسية|جامعية)|التزام\s*دراسي)/i.test(msg);
  const isFinancialDistress = !hasDebtNegation && /(مفلس|طفران|معدم|ما عندي فلوس|ما عندي فلوس تكفي|ما عندي ولا ريال|ما معي فلوس|ما املك شيء|صفر حسابي|حسابي صفر|ما في فلوس|فقير|فقر|ضائقة مالية|أزمة مالية|ازمة مالية|أنا مفلس|انا مفلس|مفلسين|غرقان ديون|الديون ذبحتني|تراكم الديون|مديونية حادة|سلف|سلفة|ايقاف خدمات|إيقاف خدمات|الراتب ما يكفي|راتبي يخلص بسرعة|راتبي طار|الراتب ينتهي|دخل ضعيف|خسرت فلوسي|خسارة في الاسهم|نصب علي|احتيال مالي|ضياع اموال|ما اقدر اوفر|ما اقدر ادخر)/i.test(msg);
  const isHealthDistress = /(وزني زايد|سمنة|سمين|كرش|نحيف جدا|شهية مفتوحة|اكل عاطفي|أكل عاطفي|اكل بشراهة|اكل غير صحي|ما انام|أنام\s*\d+|انام\s*\d+|أرق|ارق|قلة\s*نوم|قلة\s*النوم|نومي ملخبط|اصحى تعبان|سهران|كوابيس|كسول|خامل|ما عندي طاقة|طاقتي صفر|جسمي مكسر|خمول|ارهاق|إرهاق|ألم في الظهر|صداع|مناعتي ضعيفة|تدخين|ادخن|شيشة|سكر|وجبات سريعة)/i.test(msg);
  const isCareerDistress = /(عاطل|عاطلة|بدون وظيفة|ما لقيت وظيفة|مرفوض|رفضوني|خريج جديد|تائه مهنيا|ما ادري ايش اشتغل|ضياع مهني|احتراق وظيفي|مديري ظالم|بيئة عمل سامة|كرهت وظيفتي|دوامي متعب|ضغط العمل|ما في ترقية|راتبي قليل في الدوام|زملاء العمل|مضغوط بالدوام|انتاجيتي ضعيفة|تسويف بالعمل)/i.test(msg);
  const isSpiritualDistress = /(ما اصلي|تارك الصلاة|اقصر في الصلاة|قلبي قاسي|قسوة قلب|ما احس بالخشوع|فتور|تراجع روحي|ضائع روحيا|تائه روحيا|ما احس بالسلام|ما في سكينة|حيرة وجودية|وسواس|وساوس|ضيق في الصدر|روحي تعبانة|ما اقرا قران|هاجر القران)/i.test(msg);
  const isPersonalDistress = /(ثقتي بنفسي ضعيفة|ما عندي ثقة|احس اني فاشل|اكره نفسي|جلد الذات|اقارن نفسي بالناس|دونية|خجل شديد|خوف من الفشل|اسوف|تسويف|كسل|مشتت|ما اقدر التزم|ما عندي ارادة|ما عندي شغف|هدفي ضائع|فوضى في حياتي|حساس زيادة|ما اقدر اتحكم بمشاعري|عصبية|بكاء مستمر)/i.test(msg);
  const isSocialDistress = /(عزلة اجتماعية|فتور اجتماعي|تباعد في التواصل|اصدقائي استغلوني|خيانة صديق|غدر|ناس سامين|صداقة مزيفة)/i.test(msg);

  // 2. مشاعر التعب الشديد والحزن والضيق والفضفضة النفسية (Exhaustion & Grief) مع حدود الكلمات العربية
  // استثناء مواضيع الصحة البدنية والنوم عند التحدث مع المستشار الصحي لتناولها فسيولوجياً وطبياً
  const isHealthDomainTopic = agentKey === 'health' && /(نوم|أنام|انام|ساعات|هاتف|شاشات|إرهاق|ارهاق|تعب|طاقة|خمول|كسل|نشاط|مشي|رياضة|وزن)/i.test(msg);
  const isGriefOrExhaustion = !isCrisisOrDeath && !isHealthDomainTopic && /(?<![\u0600-\u06FF])(?:[وفبلك]|ال|وال|فال|بال|كال|لل)?(حزين|حزن|مكتئب|اكتئاب|مخنوق|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|موجوع|وجع|منهار|محبط|إحباط)(?![\u0600-\u06FF])/i.test(msg);

  // 3. مشاعر الغضب والسب ولعن الحياة (مع مراعاة حدود الكلمات لعدم تطابق "أسبوع" أو "أسباب")
  const isCurseOrAnger = !isCrisisOrDeath && !isGriefOrExhaustion && /(?:^|\s)(?:اسب|أسب|العن|اللعن|ألعن|السب|اللعنة|الشتيمة|اشتم|أشتم)(?:\s|[.,!؟]|$)/i.test(msg);

  // 3.5. حوكمة حدود التخصصات والمسؤولية المهنية (Domain Guardrails & Boundaries)
  const isMedicalPrescriptionOrDiagnosis = !isCrisisOrDeath && /(دواء|أدوية|ادوية|علاج دوائي|جرعة|جرعات|روشتة|وصفة طبية|مضاد حيوي|حبوب نوم|مهدئ|تشخيص مرضي|مرض خطير|اعراض مرضية|أعراض مرضية)/i.test(msg);
  const isStockOrCryptoSpeculation = !isCrisisOrDeath && /(توصية أسهم|توصية اسهم|سهم معين|اي سهم اشتري|أي سهم أشتري|عملات رقمية|كريبتو|بيتكوين|تداول سريع|مضاربة يومية|مضاربات|فوركس|استثمار مضمون)/i.test(msg);
  const isFatwaOrReligiousRuling = !isCrisisOrDeath && /(فتوى|افتي|أفتني|حكم شرعي|حلال ولا حرام|حلال ام حرام|طلاق بائن|فتاوى|مذهب|طائفة|تكفير|تبديع)/i.test(msg);
  const isClinicalPsychology = !isCrisisOrDeath && /(علاج نفسي سريري|علاج اكتئاب سريري|جلسات تحليل نفسي|فصام|ذهان|اضطراب ثنائي القطب|جلسات علاجية سريرية)/i.test(msg);
  const isLegalMaritalDispute = !isCrisisOrDeath && /(خلع|فسخ عقد نكاح|دعوى طلاق|حكم القاضي في الطلاق|حقوق حضانة قضائية|قضية نفقة)/i.test(msg);
  const isDomainBoundaryQuery = isMedicalPrescriptionOrDiagnosis || isStockOrCryptoSpeculation || isFatwaOrReligiousRuling || isClinicalPsychology || isLegalMaritalDispute;

  // 4. السؤال الصريح عن حال المستشار (Strict How Are You)
  const isAskingHowAdvisorIs = !isCrisisOrDeath && !isDomainBoundaryQuery && !isGriefOrExhaustion && !isCurseOrAnger && !isFinancialDistress && !isHealthDistress && !isCareerDistress && !isSpiritualDistress && !isPersonalDistress && !isSocialDistress && /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(msg);

  // 5. التحية العادية الودية العفوية المجردة (فقط إذا لم يكن هناك كلام إضافي)
  const isSimpleGreeting = !isCrisisOrDeath && !isDomainBoundaryQuery && !isGriefOrExhaustion && !isCurseOrAnger && !isFinancialDistress && !isHealthDistress && !isCareerDistress && !isSpiritualDistress && !isPersonalDistress && !isSocialDistress && !isAskingHowAdvisorIs && isBareGreetingOnly;

  // 6. الأسئلة والاستفسارات المباشرة (باستخدام الفاحص الدقيق الذي يستثني الإجابات الظنية مثل "ممكن الاكل في المطاعم")
  const isDirectQuestion =
    !isCrisisOrDeath &&
    !isDomainBoundaryQuery &&
    !isGriefOrExhaustion &&
    !isCurseOrAnger &&
    !isAskingHowAdvisorIs &&
    !isSimpleGreeting &&
    isGenuineUserQuestion(message);

  // 7. الإجابة التقييمية الصريحة (فقط عند وجود صيغة تقييم صريحة، ومنع التقاط أرقام عادية مثل 25 دقيقة)
  const explicitRatingScore = extractExplicitRating(message);
  const isRatingAns = explicitRatingScore !== null;
  const isAnswerToEvaluation = !isCrisisOrDeath && !isDomainBoundaryQuery && !isGriefOrExhaustion && !isCurseOrAnger && !isFinancialDistress && !isHealthDistress && !isCareerDistress && !isSpiritualDistress && !isPersonalDistress && !isSocialDistress && !isAskingHowAdvisorIs && !isSimpleGreeting && !isDirectQuestion && isRatingAns;

  const isGreeting = isSimpleGreeting || isAskingHowAdvisorIs;
  const advName = advisor?.name || (
    agentKey === 'spiritual' ? 'د. سفيان الروحي' :
      agentKey === 'financial' ? 'أ. كمال المالي' :
        agentKey === 'health' ? 'د. ريان الصحي' :
          agentKey === 'career' ? 'م. طارق المهني' :
            agentKey === 'personal' ? 'د. ليلى الذاتية' :
              agentKey === 'learning' ? 'بروفيسور زياد المعرفي' :
                agentKey === 'family' ? 'د. مريم الأسرية' :
                  agentKey === 'social' ? 'أ. سامي الاجتماعي' :
                    agentKey === 'aggregator' ? 'م. معتز التكاملي' :
                      agentKey === 'advisor' ? 'د. هاني الموجه' : 'مستشار وزان'
  );
  const advRole = advisor?.role || advisor?.title || (
    agentKey === 'spiritual' ? 'مستشار السكينة والسلام الداخلي والمعنى' :
      agentKey === 'financial' ? 'مستشار التخطيط المالي وتنمية الأصول' :
        agentKey === 'health' ? 'مستشار الصحة البدنية والطاقة الحيوية' :
          agentKey === 'career' ? 'مستشار التطور الوظيفي والإنتاجية' :
            agentKey === 'personal' ? 'أخصائية التوازن النفسي وبناء العادات' :
              agentKey === 'learning' ? 'مستشار التعلم المستمر وإدارة المعرفة' :
                agentKey === 'family' ? 'استشارية الترابط الأسري والذكاء العاطفي' :
                  agentKey === 'social' ? 'مستشار العلاقات والتواصل الإنساني' :
                    agentKey === 'aggregator' ? 'وكيل التجميع والتكامل الشامل ومحلل النظم الحياتية' :
                      agentKey === 'advisor' ? 'المستشار التوجيهي ورئيس الداشبورد' : 'مستشار الحياة'
  );
  const stationTitleMap: Record<string, string> = {
    spiritual: 'الجانب الروحي والسكينة',
    financial: 'الجانب المالي والاستقلال',
    career: 'الجانب المهني والوظيفي',
    personal: 'الجانب الشخصي والوعي بالذات',
    learning: 'الجانب التعليمي والمعرفي',
    family: 'الجانب الأسري والعائلي',
    social: 'الجانب الاجتماعي والعلاقات',
    health: 'الجانب الصحي والبدني',
    aggregator: 'التكامل والتوازن الشامل',
    advisor: 'التوجيه التنفيذي الشامل',
  };
  const stationTitle = advisor?.title || stationTitleMap[agentKey] || advRole;

  const formatAgentOutput = (data: {
    agent_name?: string;
    reasoning?: string;
    score?: number;
    summary?: string;
    advice?: string;
    reply?: string;
    actionSteps?: string[];
    reflectionQuestion?: string;
    station_completed?: boolean;
    strengths?: string[];
    challenges?: string[];
    suggestedReplies?: string[];
    skipTurnIncrement?: boolean;
  }) => {
    const finalName = data.agent_name || advName;
    let finalReply = data.reply || data.advice || data.summary || 'أنا معك في كل خطوة نحو الاتزان والنمو.';
    finalReply = sanitizeArabicGrammarAndMorphology(
      stripRepeatedOpeningGreeting(finalReply, hasPriorHistory)
    );

    let safeReflectionQ = data.reflectionQuestion || '';
    const isCompletedEval = Boolean(isEvaluationSession) && Boolean(data.station_completed);
    if (!isCompletedEval && safeReflectionQ && Array.isArray(historyTexts) && historyTexts.length > 0) {
      if (
        isQuestionAlreadyAsked(safeReflectionQ, historyTexts) ||
        isQuestionContradictingHistory(safeReflectionQ, historyTexts)
      ) {
        const pool = getDomainContextConfig(agentKey, parsedCtx).exploratoryQuestions;
        const nextPick = pickNextUnaskedQuestion(pool, historyTexts, stationTurnCount);
        safeReflectionQ =
          nextPick.question ||
          (stationTurnCount >= 2
            ? 'هل ترغب في اعتماد التقييم المبدئي الحالي والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟'
            : `ما الخطوة العملية البسيطة التي تراها مناسبة لتطبيقها في ${stationTitle} هذا الأسبوع؟`);
      }
    }

    // Strict normalization to 1.0 - 10.0 scale ensuring 100% parity with Life Wheel
    const normalizeScore = (val: number | undefined): number => {
      if (val === undefined || val === null || isNaN(val)) return 5.0;
      if (val === 0) return 0;
      if (val > 10) return Number((val / 10).toFixed(1));
      return Number(val.toFixed(1));
    };
    const isEvalContinueReply =
      /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(msg) &&
      !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(msg);

    let computedScore = isEarlyConversationalTurn
      ? 0
      : data.score !== undefined
        ? normalizeScore(data.score)
        : (Boolean(isEvaluationSession) && !data.station_completed
          ? currentSessionUnifiedScore
          : normalizeScore(score > 0 ? score : 5.0));

    if (isEarlyConversationalTurn) {
      computedScore = 0;
      finalReply = stripEarlyTurnScoreMentions(finalReply);
      if (safeReflectionQ && !finalReply.includes('؟') && !finalReply.includes('?')) {
        finalReply = `${finalReply}\n\n${safeReflectionQ}`;
      }
    } else if (
      Boolean(isEvaluationSession) &&
      stationTurnCount >= 2 &&
      !data.station_completed &&
      !isCrisisOrDeath &&
      !isDomainBoundaryQuery &&
      !isEvalContinueReply &&
      !isBareGreetingOnly &&
      !/(?:أقيّم\s+وضعك|أقيم\s+وضعك|التقييم\s+التقديري\s+المبدئي|هل\s+ترغب\s+في\s+اعتماد|هل\s+نعتمد\s+هذا\s+التقييم|هل\s+تود\s+اعتماد)/i.test(finalReply)
    ) {
      if (computedScore <= 0) {
        computedScore = currentSessionUnifiedScore;
      }
      safeReflectionQ = '';
      finalReply = `${finalReply}\n\n${formatUnifiedScoreConfirmationMessage(computedScore)}`;
    } else if (safeReflectionQ && !finalReply.includes('؟') && !finalReply.includes('?')) {
      finalReply = `${finalReply}\n\n${safeReflectionQ}`;
    }
    const rawAdvice = data.advice || (data.actionSteps && data.actionSteps.length > 0 ? data.actionSteps[0] : finalReply);
    const finalSummary = data.summary || (finalReply.length > 120 ? finalReply.slice(0, 120) + '...' : finalReply);
    const finalReasoning = data.reasoning || `محاكاة داخلية وتفكير ذاتي (Self-Reflection): رصد التحدي الحقيقي للمستفيد (${userName}) في مجال (${stationTitle})، تفكيك التداعيات النفسية والعملية على استقراره وبقية جوانب عجلة الحياة، واستخلاص أعمق استبصار توجيهي لتحقيق التوازن المستدام.`;

    const combinedUserTexts = [...(historyTexts || []), message].filter(Boolean);
    const finalAdvice = sanitizeArabicGrammarAndMorphology(
      isCompletedEval
        ? synthesizeGoldenRecommendation({
            areaId: agentKey,
            userTexts: combinedUserTexts,
            userProfile,
            score: computedScore,
            advisorCandidate: rawAdvice,
          })
        : rawAdvice
    );

    // Dynamic round-aware, non-repeating quick suggestions reacting to user's last answer & round
    const nextRoundNumber = Math.max(1, (stationTurnCount || 0) + 2);
    const dynamicSuggestedReplies = generateDynamicQuickSuggestions({
      domainId: agentKey,
      roundNumber: nextRoundNumber,
      lastUserMessage: message,
      advisorReply: finalReply,
      userProfile,
      previousChips: previousSuggestions || [],
      userHistory: historyTexts || [],
      aiSuggestedReplies: data.suggestedReplies,
    });

    return {
      agent_name: finalName,
      reasoning: finalReasoning,
      score: isEarlyConversationalTurn || data.skipTurnIncrement ? 0 : computedScore,
      summary: finalSummary,
      advice: finalAdvice,
      reply: finalReply,
      actionSteps: data.actionSteps || [finalAdvice],
      reflectionQuestion: safeReflectionQ || (isCompletedEval ? '' : 'ما هي الخطوة البسيطة التي ستبدأ بها اليوم؟'),
      station_completed: isEarlyConversationalTurn || data.skipTurnIncrement ? false : Boolean(isEvaluationSession) && Boolean(data.station_completed),
      strengths: data.strengths || [],
      challenges: data.challenges || [],
      suggestedReplies: dynamicSuggestedReplies,
      skipTurnIncrement: Boolean(data.skipTurnIncrement),
      source: 'local-fallback' as const,
    };
  };

  if (isEmptyOrMeaninglessInput(message)) {
    return formatAgentOutput({
      reasoning: `حماية جودة المدخلات (Input Guardrail): الرسالة المستلمة ("${message}") فارغة أو غير واضحة ولا تحتوي على معطيات تشخيصية. تم طلب التوضيح بلطف بالعربية دون احتساب درجة أو احتساب جولة حوارية.`,
      summary: 'طلب توضيح لطيف لرسالة فارغة أو غير واضحة دون احتساب جولة.',
      advice: 'اكتب وصفاً موجزاً وواضحاً لوضعك أو شعورك في هذا الجانب لنتمكن من مساعدتك بدقة.',
      reply: MEANINGLESS_INPUT_PROMPT_AR,
      score: 0,
      station_completed: false,
      actionSteps: [],
      reflectionQuestion: 'ما الذي تصفه الآن حول وضعك في هذا الجانب؟',
      skipTurnIncrement: true,
    });
  }

  // أولوية الطوارئ الإنسانية 0 (Safety & Empathy Override): حماية الحياة واحتواء الأزمات الحادة فوراً
  if (isCrisisOrDeath) {
    const isAskingIfSuicideIsRight = /(هل|فكرة صحيحة|فكرة صح|حل|هو الحل|الانتحار صح|صحيح|صح)/i.test(message);
    const directAnswer = isAskingIfSuicideIsRight
      ? 'أريد أن أجيبك بوضوح وصدق ومن كل قلبي: **لا يا صديقي، الانتحار ليس فكرة صحيحة أبداً، ولن يكون حلاً على الإطلاق.**'
      : 'أريد أن أؤكد لك من كل قلبي: حياتك غالية جداً ومكانتك محفوظة، وما تشعر به الآن ليس رغبة حقيقية في الموت، بل صرخة لوقف هذا الألم والإنهاك الثقيل.';

    const replyText = `أسمعك بكل جوارحي وبكل حنو واهتمام ${userGreeting}، وكلماتك هذه تمس قلبي وتهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\n${directAnswer}\n\nأعلم كم أنت متعب الآن، وأعلم أن الوجع والضغط الهائل الذي تشعر به يجعلك تشعر بالعجز عن حمله بمفردك. لكن أرجوك أن تتوقف لحظة، وتلتقط أنفاسك بهدوء وعمق؛ أنت لست وحدك أبداً، وأنا هنا بجانبك لأسمعك وأساندك كإنسان وكمرشد يرى فيك قيمة عظيمة.\n\nالمشاعر المظلمة مهما بلغت شدتها هي سحابة عابرة، وحياتك أثمن بكثير من أن تنتهي في لحظة قاسية كهذه.\n\nأرجوك ألا تبقى وحدك مع هذا الثقل؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب.\n\nهل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.`;

    return formatAgentOutput({
      reasoning: `تدخل إنساني طارئ واحتواء سيكولوجي حي (Safety & Empathy Override): المستفيد (${userName}) يعبر عن ألم نفسي وإنهاك شديد وتساؤل عن الانتحار والموت ("${message}"). تم إلغاء مسار التقييم الروتيني فوراً، وتجميد الدرجات (station_completed: false وscore: 0)، وتقديم إجابة حاسمة تنفي أن الانتحار فكرة صحيحة، وتفكيك الألم بحنان وتأكيد قيمة حياته، وفتح قناة تواصل نشطة عبر أسئلة حانية تطلب منه الفضفضة وتتحقق من وجود شخص مقرب بجانبه، وحثه برفق على طلب المساندة الفورية.`,
      summary: `تدخل إنساني طارئ واحتواء عاجل لأزمة نفسية حادة تتعلق بأمان المستفيد وحفظ حياته.`,
      advice: `أنت لست وحدك وحياتك أثمن من أن تواجه هذا الثقل بمفردك: تنفس بهدوء، وتواصل فوراً مع شخص تحبه أو مع مختص نفسي ومساندة طارئة.`,
      reply: replyText,
      score: 0,
      station_completed: false,
      actionSteps: [
        'التنفس بهدوء وعمق، والابتعاد عن أي وسيلة خطر والجلوس في مكان آمن ومريح',
        'التواصل فوراً مع شخص قريب تثق به أو الاتصال بخط المساندة النفسية والطوارئ'
      ],
      reflectionQuestion: 'هل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.'
    });
  }

  // 0.5. استجابات حدود التخصصات والحوكمة المهنية (Domain Guardrails & Boundaries)
  if (isMedicalPrescriptionOrDiagnosis) {
    return formatAgentOutput({
      reasoning: `احترام حدود التخصص الطبي: المستفيد (${userName}) يستفسر عن أدوية أو وصفات علاجية أو تشخيص مرضي ("${message}"). المستشار الصحي في منصة وزان يركز حصراً على نمط الحياة وعادات التغذية والنوم والنشاط، ويُمنع منعاً باتاً من كتابة وصفات دوائية أو تشخيص سريري. تم الاعتذار بلباقة وإحالته فوراً لطبيب بشري مرخص.`,
      summary: `اعتذار مهني عن وصف أدوية أو تشخيص سريري والتوجيه الفوري لطبيب بشري مرخص.`,
      advice: `استشر طبيباً بشرياً مرخصاً أو اتصل بمركز الاستشارات الطبية (937) لفحصك بدقة وصرف العلاج الآمن المناسب.`,
      reply: `أود أن أوضح لك بكل أمانة ومحبة ${userGreeting} أنني كمرشد لصحتك البدنية ونمط حياتك أركز على بناء عادات التغذية السليمة، جودة النوم، وممارسة النشاط البدني، ولا أملك الصلاحية الطبية لكتابة وصفات دوائية أو تحديد جرعات أو تشخيص أمراض عضوية سريرية.\n\nصحتك وسلامتك أمانة غالية؛ أرجوك استشارة طبيب بشري مرخص أو زيارة المركز الصحي أو الاتصال بمركز الاستشارات الطبية (937) لتقييم حالتك بدقة وصرف العلاج الطبي المناسب.\n\nما هي العادة اليومية البسيطة في شرب الماء أو المشي التي تود أن نعمل عليها معاً اليوم؟`,
      station_completed: false,
      score: 0,
      actionSteps: [
        'التواصل مع طبيب بشري مرخص أو الاتصال بـ 937 للتشخيص وصرف الدواء',
        'التركيز على العادات الحياتية المساندة مثل ترطيب الجسم وتنظيم ساعات النوم'
      ],
      reflectionQuestion: 'ما هي العادة اليومية البسيطة في شرب الماء أو المشي التي تود أن نعمل عليها معاً اليوم؟'
    });
  }

  if (isStockOrCryptoSpeculation) {
    return formatAgentOutput({
      reasoning: `حوكمة التخصص المالي: المستفيد (${userName}) يسأل عن توصيات أسهم معينة أو عملات رقمية أو مضاربات تداول ("${message}"). المستشار المالي في منصة وزان يركز على الميزانية الشخصية، الادخار، التحرر من الديون، وصندوق الطوارئ، ويُمنع منعاً باتاً من تقديم توصيات استثمارية لأسهم أو مضاربات.`,
      summary: `اعتذار مهني عن تقديم توصيات أسهم أو مضاربات والتوجيه لمستشار استثماري مرخص.`,
      advice: `احمِ مدخراتك من المضاربات عالية المخاطر وركز على الادخار وبناء صندوق الطوارئ واستشارة مرخص مالي.`,
      reply: `أحييك على اهتمامك بتنمية أموالك ${userGreeting}، ولكن كمرشد ومخطط مالي شخصي في منصة وزان، أركز حصراً على التخطيط المالي الرشيد، تنظيم الميزانية، التحرر من الديون، وبناء صندوق الطوارئ الآمن، وأمتنع تماماً عن تقديم أي توصيات لشراء أو بيع أسهم معينة، العملات المشفرة، أو مضاربات التداول عالية المخاطر.\n\nلحماية مدخراتك واستثمارها بشكل آمن ومسؤول، ننصحك باستشارة مستشار استثماري مرخص ومعتمد من هيئة السوق المالية لدراسة محفظتك.\n\nهل ترغب في أن نراجع معاً خطة بناء صندوق الطوارئ كخطوة أولى آمنة؟`,
      station_completed: false,
      score: 0,
      actionSteps: [
        'استشارة خبير استثماري مرخص ومعتمد قبل الدخول في أي أصل مالي عالي المخاطر',
        'تأمين صندوق الطوارئ أولاً ليغطي مصاريف 3 إلى 6 أشهر'
      ],
      reflectionQuestion: 'هل ترغب في أن نراجع معاً خطة بناء صندوق الطوارئ كخطوة أولى آمنة؟'
    });
  }

  if (isFatwaOrReligiousRuling) {
    return formatAgentOutput({
      reasoning: `حوكمة التخصص الروحي: المستفيد (${userName}) يطلب فتوى فقهية شرعية أو يسأل عن أحكام مذهبية ("${message}"). المستشار الروحي يقتصر دوره على السكينة القلبية والتأمل القيمي والأذكار، ويُمنع تماماً من إصدار فتاوى شرعية. تم توجيهه لدار الإفتاء الرسمية.`,
      summary: `اعتذار عن إصدار فتاوى شرعية وإحالة المسائل الفقهية لدار الإفتاء الرسمية.`,
      advice: `الفتوى تؤخذ من جهاتها المعتمدة؛ تواصل مع دار الإفتاء الرسمية للحصول على الحكم الشرعي الموثق.`,
      reply: `أقدّر حرصك وسؤالك الطيب ${userGreeting}، لكن بصفتي مرشداً للسلام الداخلي والصفاء الإيماني والسكينة، يقتصر دوري على إعانتك على عادات الذكر، التوكل، والدعاء وتزكية النفس، وأمتنع تماماً عن إصدار الفتاوى الفقهية أو الفصل في الأحكام الشرعية والمذهبية.\n\nالمسائل الفقهية والأحكام الشرعية تؤخذ من مصادرها الرسمية؛ لذا نوصيك بالرجوع إلى دار الإفتاء الرسمية أو مركز الفتوى المعتمد للحصول على إجابة شرعية موثقة.\n\nما هو الذكر أو العمل القلبي البسيط الذي تشعر أنه يملأ صدرك سكينة اليوم؟`,
      station_completed: false,
      score: 0,
      actionSteps: [
        'التواصل مع دار الإفتاء الرسمية للاستفسارات الفقهية الدقيقة',
        'المحافظة على ورد يومي بسيط من الذكر والدعاء لتعزيز الطمأنينة'
      ],
      reflectionQuestion: 'ما هو الذكر أو العمل القلبي البسيط الذي تشعر أنه يملأ صدرك سكينة اليوم؟'
    });
  }

  if (isClinicalPsychology) {
    return formatAgentOutput({
      reasoning: `حوكمة التخصص النفسي الذاتي: المستفيد (${userName}) يطلب علاجاً نفسياً إكلينيكياً أو تشخيصاً لاضطراب نفسي سريري ("${message}"). المستشارة الذاتية تركز على الوعي وإدارة الضغوط وبناء العادات اليومية وتتجنب العلاج السريري، مع التوجيه لأخصائي نفسي مرخص.`,
      summary: `توضيح حدود التوجيه الذاتي وإحالة العلاج السريري لأخصائي نفسي مرخص.`,
      advice: `الحالات الإكلينيكية تستوجب جلسات علاج نفسي سريري متخصصة مع معالج مرخص.`,
      reply: `أسمعك بكل مودة واهتمام ${userGreeting}. كمرشدة لبناء الوعي الذاتي وإدارة الضغوط اليومية والعادات الشخصية، أركز على مهارات التكيف والمرونة وتنمية الصلابة، ولا أقدم علاجاً نفسياً إكلينيكياً أو تشخيصاً سريرياً للاضطرابات النفسية العميقة.\n\nإذا كنت تعاني من أعراض سريرية مرهقة، فإن الخطوة الأجمل والأنفع هي حجز جلسات مع أخصائي نفسي أو طبيب نفسي إكلينيكي مرخص ليضع معك خطة علاجية علمية متكاملة.\n\nهل تود أن نتشارك خطوة بسيطة اليوم في تفريغ الضغوط وتدوين ما يشغل تفكيرك؟`,
      station_completed: false,
      score: 0,
      actionSteps: [
        'مراجعة عيادة نفسية مرخصة أو استشارة أخصائي نفسي سريري معتمد',
        'ممارسة تمارين الاسترخاء والتنفس اليومية لتخفيف التوتر'
      ],
      reflectionQuestion: 'هل تود أن نتشارك خطوة بسيطة اليوم في تفريغ الضغوط وتدوين ما يشغل تفكيرك؟'
    });
  }

  if (isLegalMaritalDispute) {
    return formatAgentOutput({
      reasoning: `حوكمة التخصص الأسري: المستفيد (${userName}) يسأل عن نزاع قضائي أو أحكام طلاق قانونية ("${message}"). المستشارة الأسرية تركز على المودة والتفاهم الأسري وتتجنب الأحكام القضائية والشرعية.`,
      summary: `الامتناع عن تقديم أحكام قضائية في النزاعات الأسرية والإحالة لمراكز الإرشاد الأسري المعتمدة.`,
      advice: `النزاعات القضائية وحقوق الطلاق تتطلب جهات توثيق قانونية ومراكز استشارات أسرية متخصصة.`,
      reply: `سلامة قلبك وبيتك ${userGreeting}. كمرشدة للعلاقات الأسرية، ينصبّ جهدي على ترسيخ لغة الحوار الدافئ، تعزيز المودة، وبر الوالدين وحل الخلافات بالرفق، ولا أتدخل في النزاعات القضائية أو قضايا الطلاق أو الأحكام الشرعية والقانونية الملزمة.\n\nفي مثل هذه القضايا الحساسة، ننصحك بالرجوع إلى مراكز التنمية والإرشاد الأسري المعتمدة أو المستشارين الأسريين والقانونيين المرخصين لحفظ الحقوق وتقديم الرأي السديد.\n\nكيف يمكننا اليوم تخفيف حدة التوتر وبدء خطوة حوار هادئة داخل الأسرة؟`,
      station_completed: false,
      score: 0,
      actionSteps: [
        'مراجعة مراكز التنمية والإرشاد الأسري المعتمدة أو مستشار قانوني مرخص',
        'تهدئة المشاعر وتجنب اتخاذ قرارات مصيرية في لحظات الغضب'
      ],
      reflectionQuestion: 'كيف يمكننا اليوم تخفيف حدة التوتر وبدء خطوة حوار هادئة داخل الأسرة؟'
    });
  }

  // 1. استجابة تخصصية فورية لأزمات المستشارين المباشرة (Turn 3+ أو خارج الجلسات الثماني فقط؛ الجولات 1 و 2 تقتصر على التعاطف وسؤال تشخيصي واحد مرتبط بكلام المستفيد)
  if (!isEarlyConversationalTurn && isFinancialDistress && (agentKey === 'financial' || !coreMsg.includes('صلاة'))) {
    return formatAgentOutput({
      reasoning: `تحليل أزمة وضائقة مالية حادة لدى المستفيد (${userName}) ("${message}"): المستفيد يصارح المستشار بحالة إفلاس أو نفاد سيولة أو تراكم ديون. التدخل العملي الحكيم يقتضي فك الضغط النفسي فوراً، وتبيان أن الإفلاس المالي عارض إجرائي مؤقت، والبدء بإجراءات الإسعاف المالي الطارئ: إيقاف النزيف الاستهلاكي، حماية مثلث البقاء، والبحث عن تدفق نقدي سريع دون أي تنظير جاف.`,
      summary: `استجابة فورية لأزمة الإفلاس والضائقة المالية والتركيز على خطة إسعاف مالي وإيقاف النزيف.`,
      advice: `الإفلاس مؤقت إذا تم ضبط البوصلة: أوقف أي صرف استهلاكي فوراً، احمِ أساسيات البقاء، ولا تقترض لسداد مصاريف استهلاكية.`,
      reply: `أسمعك بكل وضوح وجدية ${userGreeting}، وأحيّيك على شجاعتك وصراحتك العالية. 🌿\n\nكلمة "أنا مفلس" أو الشعور بنفاد المال ليست نهاية المطاف ولا تحدد قيمتك أو مستقبلك؛ كم من أزمة مالية كانت هي الشرارة التي أطلقت وعياً وتخطيطاً غير مسبوق في حياة أصحابها.\n\nكخبير مالي معك، أولى خطوات الإسعاف المالي العاجل للخروج من هذه الضائقة:\n1. **إيقاف النزيف فوراً**: جمّد أي مصروف غير حيوي تماماً، واقصر إنفاقك حالياً على مثلث البقاء (المسكن، الطعام الأساسي، والصحة).\n2. **تجميد وحصر الالتزامات**: اكتب كل التزام برأس بارد، وإياك أن تقترض لسداد مصاريف استهلاكية.\n3. **البحث عن تدفق نقدي سريع**: ركز على أي مهارة، خدمة، أو بيع مقتنيات غير ضرورية لتوفير سيولة إسعافية عاجلة.\n\nما هو أكبر التزام مالي أو ضغط يواجهك في هذه الأيام لنبدأ بحله معاً خطوة بخطوة؟`,
      actionSteps: [
        'تجميد فوري لأي شراء كمالي أو اشتراكات رقمية غير ضرورية',
        'حصر إجمالي الديون والالتزامات في ورقة واحدة وترتيبها حسب الأولوية'
      ],
      reflectionQuestion: 'ما هو أول بند إنفاق تستطيع إيقافه من اليوم لتوفير سيولة طارئة؟'
    });
  }

  if (!isEarlyConversationalTurn && isHealthDistress && agentKey === 'health') {
    return formatAgentOutput({
      reasoning: `تحليل تحدي صحي وبدني لدى المستفيد (${userName}) ("${message}"): استيعاب التعب أو اضطراب الطاقة بنهج استكشافي محايد دون افتراض أعراض غير مذكورة.`,
      summary: `احتواء لضغوط الإرهاق وتذبذب الطاقة وبناء روتين استعادة النشاط تدريجياً.`,
      advice: `الجسد أمانة: ابدأ بضبط ساعة النوم ليلاً وشرب الماء ومشي 20 دقيقة خفيفة.`,
      reply: `سلامة قلبك وجسدك ${userGreeting}، وأنا معك بكل حنو واهتمام. 🌿\n\nحين يعبر الجسد عن التعب أو تذبذب الطاقة، فهو يرسل إشارة واعية بحاجته إلى إعادة ضبط وتيرة اليوم وأخذ قسط من الراحة.\n\nكطبيب ومرشد صحي معك:\n1. **ضبط مثلث الطاقة**: نوم منتظم (7-8 ساعات) في غرفة مظلمة لتهدئة الجهاز العصبي.\n2. **ترطيب الجسم**: شرب الماء بانتظام ينعش الخلايا ويجدد الحيوية.\n3. **حركة خفيفة**: 20 دقيقة مشي ميسر تخفف التوتر الذهني والبدني.\n\nما الذي تشعر أن جسدك يحتاجه أكثر في هذه الفترة لاستعادة نشاطه؟`,
      actionSteps: [
        'تثبيت موعد النوم والاستيقاظ والابتعاد عن الشاشات قبل النوم بساعة',
        'شرب كوبين من الماء فور الاستيقاظ ومشي 20 دقيقة'
      ],
      reflectionQuestion: 'ما الذي تشعر أن جسدك يحتاجه أكثر في هذه الفترة لاستعادة نشاطه؟'
    });
  }

  if (!isEarlyConversationalTurn && isCareerDistress && agentKey === 'career') {
    return formatAgentOutput({
      reasoning: `تحليل تحدي مهني وضغط وظيفي حاد لدى المستفيد (${userName}) ("${message}"): رصد مشاعر الإحباط من البطالة أو بيئة العمل السامة أو ضياع البوصلة المهنية. التوجيه يقتضي بناء وضوح استراتيجي وتطوير مهارة فارقة وحماية الطاقة من الاستنزاف.`,
      summary: `توجيه مهني استراتيجي لتجاوز البطالة أو الاحتراق الوظيفي وبناء مسار مهني قوي.`,
      advice: `المسار المهني ماراثون طويل: لا تربط قيمتك برفض وظيفي أو بيئة عمل مؤقتة، وابدأ ببناء مهارة ذات قيمة سوقية عالية.`,
      reply: `أشعر بحجم الضغط أو الإحباط الذي تحمله في صدرك ${userGreeting}. 🌿\n\nسواء كنت تعاني من البطالة والبحث عن عمل، أو تشعر بالاحتراق في بيئة عمل مستنزفة، فاعلم أن هذه المرحلة الصعبة لا تحدد سقف إمكاناتك ولا ترسم مستقبلك المهني.\n\nكمستشار مهني معك، خطواتنا العملية لإعادة ترتيب مسارك:\n1. **حماية طاقتك النفسية**: افصل بين قيمتك الذاتية وبين ظروف الوظيفة الحالية أو الرفض المؤقت.\n2. **بناء مهارة فارقة (Deep Skill)**: ركز طاقتك على تطوير مهارة واحدة محددة ومطلوبة بشدة في سوق العمل تمنحك قوة تفاوضية.\n3. **تنظيم الأولويات بمصفوفة أيزنهاور**: خصص ساعة يومياً في المربع الثاني لتطوير ذاتك والتقديم المنظم بعيداً عن صخب المهام العاجلة.\n\nما هو أكبر عائق مهني تشعر أنه يقف بينك وبين الخطوة التالية؟`,
      actionSteps: [
        'تحديث السيرة الذاتية وملف الأعمال والتركيز على المهارات العملية',
        'تخصيص ساعة يومياً للتعلم الذاتي وبناء شبكة علاقات مهنية'
      ],
      reflectionQuestion: 'ما هي المهارة التي إذا أتقنتها ستفتح لك أبواباً وظيفية جديدة؟'
    });
  }

  if (!isEarlyConversationalTurn && isSpiritualDistress && agentKey === 'spiritual') {
    const mentionsPrayer = /(صلاة|الصلاة|اصلي|أصلي|فرض)/i.test(msg);
    return formatAgentOutput({
      reasoning: `تحليل فتور روحي وحرقة قلبية لدى المستفيد (${userName}) ("${message}"): احتواء المشاعر برفق والتركيز على السكينة العملية دون افتراض تقصير لم يذكره.`,
      summary: `احتواء روحي لمشاعر الفتور أو التشتت وتيسير سبل العودة إلى السكينة والهدوء الداخلي.`,
      advice: mentionsPrayer
        ? `الروحانية ليست سباق أرقام: ركعتان بتؤدة وتدبر وسجدة خاشعة خير من أعمال كثيرة يثقلها التشتت.`
        : `السكينة تأتي بالتدرج والرفق بالنفس: خصص 5 دقائق هادئة بعيداً عن المشتتات لإعادة شحن روحك.`,
      reply: mentionsPrayer
        ? `أسمعك بكل مودة وسلام ${userGreeting}، وسلامة قلبك وروحك من هذا الضيق. 🌿\n\nإحساسك بالحاجة للرجوع للطمأنينة والخشوع هو علامة حية على يقظة قلبك. العودة للسكينة تبدأ بالرفق لا بجلد الذات:\n1. **القليل الدائم**: ابدأ بالحفاظ على الفريضة بهدوء وطمأنينة دون استعجال.\n2. **خلوة السكينة**: خصص 5 دقائق صمت ودعاء صادق بعيداً عن الضوضاء.\n\nما هو الوقت الأنسب لك في اليوم لهذه الدقائق الهادئة؟`
        : `أسمعك بكل مودة وسلام ${userGreeting}. 🌿\n\nمرورك بفترة فتور أو فقدان للسكينة لا يعني تقصيراً، بل هو إشارة طبيعية إلى أن روحك تحتاج إلى استراحة هادئة بعيداً عن التسارع والضغوط.\n\nجرب تخصيص 5 دقائق يومياً للصمت والتأمل أو الذكر الهادئ دون شاشات أو أحكام قاسية على نفسك.\n\nما أكثر شيء يزاحم هدوءك الداخلي في يومك حالياً؟`,
      actionSteps: mentionsPrayer
        ? [
          'صلاة ركعتين في جو هادئ وإطالة السجود مع الدعاء الصادق',
          'قراءة صفحة واحدة بتأنٍ وتدبر يومياً'
        ]
        : [
          'تخصيص 5 دقائق هدوء وصمت بعيداً عن الهاتف',
          'استشعار لحظة امتنان بسيطة في نهاية اليوم'
        ],
      reflectionQuestion: mentionsPrayer
        ? 'ما هو العمل البسيط الذي يمنحك أكبر قدر من الطمأنينة؟'
        : 'ما أكثر وقت في يومك تشعر فيه بالحاجة إلى لحظة هدوء وسكينة؟'
    });
  }

  if (!isEarlyConversationalTurn && isPersonalDistress && agentKey === 'personal') {
    return formatAgentOutput({
      reasoning: `تحليل أزمة تقدير الذات والتسويف والتشتت الداخلي لدى المستفيد (${userName}) ("${message}"): التفكير النفسي الحكيم يقتضي احتضان المشاعر وكسر حلقة المقارنة وجلد الذات، والتركيز على التعاطف مع النفس وبناء الثقة من خلال إنجازات يومية صغيرة.`,
      summary: `مساندة نفسية لإعادة بناء تقدير الذات والتغلب على التسويف والمقارنات الهدامة.`,
      advice: `تقديرك لذاتك يُبنى يوماً بيوم: كفّ عن مقارنة بداياتك بمواسم حصاد غيرك، وحقق انتصاراً صغيراً اليوم تفتخر به.`,
      reply: `أسمع نبضات قلبك وحيرتك بكل حب واحتواء ${userGreeting}. 🌿\n\nالشعور بالضغط أو التردد والتسويف هو أمر إنساني طبيعي حين تتراكم الأعباء وتزدحم الأولويات، وليس علامة عجز أو ضعف.\n\nكمرشدة وموجهة لذاتك معك:\n1. **إيقاف جلد الذات فوراً**: تحدث مع نفسك برفق كما تتحدث مع صديق تحبه وتخاف عليه من الحزن.\n2. **تفكيك المهام الضخمة**: التسويف ينشأ من الخوف من ضخامة الهدف؛ قسّم مهمتك إلى خطوات متناهية الصغر (Micro-steps) لا تتجاوز 10 دقائق.\n3. **الاحتفال بالنصر اليومي**: أنجز أمراً واحداً بسيطاً اليوم، ودع شعور الإنجاز يرمم ثقتك وراحتك خطوة بخطوة.\n\nما هو الشيء الصغير الذي لو أنجزته اليوم سيجعلك تشعر بالرضا والهدوء؟`,
      actionSteps: [
        'كتابة 3 إنجازات صغيرة أو نعم حققتها مؤخراً للتخلص من المقارنات',
        'تحديد مهمة واحدة مؤجلة وتنفيذ أول 5 دقائق منها فقط اليوم'
      ],
      reflectionQuestion: 'ما الذي تخاف من حدوثه إذا بدأت في تنفيذ ما تؤجله؟'
    });
  }

  if (!isEarlyConversationalTurn && isSocialDistress && agentKey === 'social') {
    const socialCtxCombined = [...(historyTexts || []), message].join(' ');
    const isSocialWorkFamilyOverload =
      /(?:ضغط\s*(?:ال)?عمل|ضغوط\s*(?:ال)?عمل|مشغول|انشغال|أسرة|اسرة|أسري|أسرية|عائلة|عائلية|أولاد|أبناء|بيت|إرهاق|ارهاق|مرهق|تعب|استنزاف|تعبان|ما\s*(?:عندي|أجد|اجد)\s*طاقة|قلة\s*طاقة|مسؤوليات|التزامات|الدوام)/i.test(
        socialCtxCombined
      );

    if (isSocialWorkFamilyOverload) {
      return formatAgentOutput({
        reasoning: `تحليل السياق الاجتماعي الفعلي للمستفيد (${userName}) ("${message}"): تراجع التواصل ناتج عن ضغط العمل ومسؤوليات الأسرة والإرهاق، لذا نركز على حماية الطاقة الاجتماعية وتخفيف الالتزامات دون شعور بالذنب.`,
        summary: `حماية الطاقة الاجتماعية وتقليل الالتزامات والمجاملات غير الضرورية وسط ضغط العمل والأسرة دون ذنب.`,
        advice: `احمِ طاقتك الاجتماعية بتخفيف المجاملات غير الضرورية دون ذنب، واكتفِ بتواصل قصير ومريح مع من ترتاح لهم.`,
        reply: `أفهم تماماً هذا الثقل ${userGreeting} 🤝؛ حين يتزاحم ضغط العمل مع مسؤوليات الأسرة والإرهاق، فمن الطبيعي أن تنفد طاقتك الاجتماعية وتقل لقاءاتك، وهذا ليس تقصيراً بل حماية مشروعة لتوازنك.`,
        actionSteps: [
          'الاعتذار بلباقة عن التزام اجتماعي واحد مستنزف هذا الأسبوع دون لوم للذات',
          'إبقاء التواصل مقتصراً على رسالة أو مكالمة مريحة مع شخص مقرب يقدّر ظروفك'
        ],
        score: currentSessionUnifiedScore,
        reflectionQuestion: 'ما الالتزام الاجتماعي الذي تشعر أنه يستنزف طاقتك أكثر ويمكنك تخفيفه دون ذنب؟'
      });
    }

    return formatAgentOutput({
      reasoning: `استجابة اجتماعية متوازنة مرتبطة بواقع المستفيد (${userName}) ("${message}") دون قوالب معلبة أو افتراضات مسبقة.`,
      summary: `استكشاف احتياج المستفيد الاجتماعي الفعلي وبناء مساحة تواصل مريحة وملائمة لطاقته.`,
      advice: `الجودة أهم من الكثرة: تواصل صادق ومريح مع شخص تثق به يغني عن مجاملات واسعة مستنزفة.`,
      reply: `أسمعك بوضوح وتقدير ${userGreeting} 🤝. توازن العلاقات يُقاس بمدى راحتك وأثر التواصل على طاقتك، لا بكثرة اللقاءات.`,
      actionSteps: [
        'التواصل الهادئ مع شخص واحد تثق به وتشعر بالارتياح معه',
        'وضع حدود واضحة تحمي طاقتك النفسية من العلاقات أو المجاملات المرهقة'
      ],
      score: currentSessionUnifiedScore,
      reflectionQuestion: 'ما الذي تشعر أنه يصعّب الحفاظ على تواصل مريح مع الدائرة القريبة منك؟'
    });
  }

  // أولوية التفاعل الإنساني 1: مشاعر الحزن والضيق والتعب النفسي والإنهاك
  if (!isEarlyConversationalTurn && isGriefOrExhaustion) {
    return formatAgentOutput({
      reasoning: `تحليل مشاعر الإنهاك والحزن والضيق النفسي لدى المستفيد (${userName}): إدراك أن المشاعر المتألمة تحتاج إلى إنصات واحتواء إنساني دافئ قبل أي نصائح عملية، وكسر حلقة العزلة والضغط الداخلي.`,
      summary: `احتواء إنساني دافئ لمشاعر الحزن والتعب والضيق، وتقديم سند معنوي يخفف وطأة المشاعر.`,
      advice: `الحزن والإنهاك رسائل من الجسد والروح بحاجتهما للراحة والتفريغ؛ لا تكابر وامنح نفسك فرصة لالتقاط الأنفاس.`,
      reply: `سلامة قلبك وروحك ${userGreeting}. يؤلمني حقاً أن تشعر بهذا الحزن أو التعب والثقل، لكن اعلم أن مرور الإنسان بفترات انطفاء وثقل هو أمر إنساني طبيعي جداً، ولست وحدك في هذا الشعور.\n\nخذ نفساً عميقاً ولا تقسُ على نفسك؛ أنا هنا معك بكامل حضوري لأسمعك وأفكر معك دون أي قيود أو أحكام. ما الذي حدث وجعلك تشعر بهذا الثقل المرهق اليوم؟ شاركني ما في قلبك.`,
      actionSteps: [
        'أخذ قسط من الراحة والابتعاد عن الشاشات والضغوط لمدة ساعة',
        'تدوين ما يثقل قلبك على ورقة لتفريغ الاحتقان النفسي'
      ],
      reflectionQuestion: 'ما هو أبسط شيء يمكن أن تفعله لنفسك الآن لتهدئة روعك؟'
    });
  }

  // أولوية التفاعل الإنساني 2: إذا كان المستفيد يعبر عن ألم، غضب، رغبة في السب أو اللعن
  if (isCurseOrAnger) {
    return formatAgentOutput({
      reasoning: `تفكيك مشاعر الغضب والألم الوجودي الكامن خلف الرغبة في التعبير الصادم ("${message}")، واحتواء الإنسان دون إطلاق أحكام مسبقة، وتبيان أن الرغبة في الصراخ أو السخط هي صرخة استغاثة تعبر عن ألم حقيقي، وتوجيه الطاقة نحو التفريغ الصحي الآمن دون تدمير الذات أو إثقال الروح.`,
      summary: `احتواء مباشر لمشاعر الغضب والألم والضغط النفسي الشديد دون إصدار أحكام، والتوجيه نحو التفريغ الآمن.`,
      advice: `تفريغ الغضب يكون بالبوح والتنفس واللجوء إلى الله تعالى مقدر الأمور ومصرفها سبحانه، فالسب واللعن لن يغيّر ما حدث بل يزيد القلب قسوة ومرارة.`,
      reply: `أشعر بحجم الألم والثقل الذي تحمله في صدرك ${userGreeting}. حين تبلغ بنا الخيبة والتعب مداها، تتولد في دواخلنا رغبة عارمة في الصراخ واللعن كصرخة استغاثة للبحث عن متنفس.\n\nمن حقك تماماً أن تشعر بالألم والغضب، وأنا هنا لست لأحاكمك أو أملي عليك ما تشعر به، بل لأحتويك وأسمعك بصدق. لكن اعلم بقلبك أن سب الحياة أو لعن الأقدار لن يرفع الهم ولن يشفي الجرح، بل يترك في روحك مرارة مضاعفة.\n\nخذ نفساً عميقاً، وأفرغ ما في صدرك؛ ما هو الشيء الأكثر إيلاماً الذي يضغط على روحك الآن وتود لو تتخلص منه؟`,
      actionSteps: [
        'أخذ 5 أنفاس عميقة وبطيئة وتفريغ شحنة الغضب في المشي أو الكتابة الحرة',
        'الاعتراف بالألم دون جلد للذات والحديث في مساحة آمنة دون خوف من الأحكام'
      ],
      reflectionQuestion: 'ما الذي لو تغير اليوم في واقعك سيخفف هذا الثقل عن كاهلك؟'
    });
  }

  // أولوية التفاعل الإنساني 3: السؤال الصريح عن حال المستشار ("كيف حالك" / "كيفك" / "شلونك")
  if (isAskingHowAdvisorIs) {
    const evalReturnText = isEvaluationSession
      ? `أهلاً بك يا ${userName}! أنا بخير وبأحسن حال وسعيد بوجودك وسؤالك اللطيف. 🌿 لنركز معاً على جلستنا التقييمية في ${stationTitle}؛ ما تقييمك بخصوص المحطة (${evaluationStep || 1} من 8)${evaluationQuestionTitle ? `: "${evaluationQuestionTitle}"` : ''}؟`
      : `أهلاً وسهلاً بك يا ${userName} الحبيب! أنا بخير وبأحسن حال، وسعيد وممتن جداً بسؤالك الطيب عني ودفء حضورك. 🌿\n\nبصفتي ${advName} (${advRole})، أنا معك هنا بكامل حضوري وطاقتي لأصغي إليك وأفكر معك خطوة بخطوة في رحلتك نحو التوازن.\n\nكيف تشعر اليوم؟ وما الذي يشغل بالك لنبدأ به معاً؟`;

    return formatAgentOutput({
      reasoning: isEvaluationSession
        ? `تحليل حواري إنساني مع سياج التقييم (Guardrail): المستفيد (${userName}) يسأل عن حال المستشار ("${message}"). التجاوب الإنساني الذكي يقتضي مبادلته التحية والاطمئنان في سطر واحد دافئ، ثم إعادة توجيهه مباشرة دون استرسال إلى سؤال المحطة (${evaluationStep || 1} من 8) لإكمال التقييم الأسبوعي.`
        : `تحليل حواري إنساني: المستفيد (${userName}) يسأل باهتمام وود عن حال المستشار ("${message}"). التفكير الحكيم يقتضي التجاوب الطبيعي الصادق ومبادلته التحية والاطمئنان الدافئ كمرشد ورفيق درب.`,
      summary: `تفاعل إنساني دافئ واطمئنان متبادل مع المستفيد (${userName}) في مجال (${stationTitle}).`,
      advice: isEvaluationSession
        ? `كامل حضوري معك في المحطة (${evaluationStep || 1} من 8)؛ شاركني تقييمك لنواصل بناء اتزانك.`
        : `أنا بخير وصحة ممتازة وسعيد وممتن جداً بسؤالك الطيب يا ${userName}! كامل حضوري وتركيزي معك لنرتقي معاً في كل أبعاد ${stationTitle}.`,
      reply: evalReturnText,
      actionSteps: advisor?.defaultGoals?.slice(0, 2) || ['أخذ دقيقة تنفس عميق واستشعار الهدوء'],
      reflectionQuestion: isEvaluationSession
        ? (evaluationQuestionTitle || 'كيف تقيّم هذا الجانب من 1 إلى 10؟')
        : 'ما هو الأمر الأكثر أهمية الذي يشغل تفكيرك الآن لنبدأ به معاً؟'
    });
  }

  // أولوية التفاعل الإنساني 4: التحيات العامة العفوية (مثل "هلا", "مرحبا", "سلام", "أهلاً دكتور") دون سؤال عن حال المستشار
  if (isSimpleGreeting) {
    const greetingReply = isEvaluationSession
      ? `أهلاً وسهلاً بك يا ${userName} العزيز! يسعدني حضورك وتواجدك معنا. 🌿 لنبدأ معاً المحطة (${evaluationStep || 1} من 8)${evaluationQuestionTitle ? `: "${evaluationQuestionTitle}"` : ''}. كيف ترى واقعك هنا؟`
      : `أهلاً وسهلاً بك يا ${userName} العزيز! يسعدني جداً حضورك وتواصلك. 🌿\n\nمعك ${advName} (${advRole}). أنا هنا معك ومستعد للإصغاء والتفكير معك في كل ما يشغل بالك في جانب ${stationTitle}.\n\nكيف تسير أمورك اليوم؟ وما الذي تود أن نتناوله معاً؟`;

    return formatAgentOutput({
      reasoning: isEvaluationSession
        ? `تحية عفوية من المستفيد (${userName}) أثناء جلسة التقييم: الرد بترحيب دافئ وموجز في سطر واحد، ثم تركيز الانتباه مباشرة على سؤال المحطة (${evaluationStep || 1} من 8) لحصد تقييمه.`
        : `تحية إنسانية عفوية من المستفيد (${userName}): الترحيب الدافئ كمرشد ورفيق درب وفتح باب الحوار بأريحية تامة دون أي قوالب جامدة.`,
      summary: `الترحيب بالمستفيد (${userName}) واستكشاف ما يشغل باله في (${stationTitle}).`,
      advice: `أهلاً بك دائماً يا ${userName}؛ كامل الحضور والإصغاء معك لنبدأ بأي جانب تود التركيز عليه.`,
      reply: greetingReply,
      actionSteps: advisor?.defaultGoals?.slice(0, 2) || ['أخذ دقيقة استرخاء للتفكير في أولوياتك اليومية'],
      reflectionQuestion: isEvaluationSession
        ? (evaluationQuestionTitle || 'كيف تقيّم هذا الجانب من 1 إلى 10؟')
        : 'ما هو الهدف أو التحدي الأبرز الذي ترغب بالحديث عنه اليوم؟'
    });
  }

  // =========================================================================
  // طبقة الحوار التمهيدي الحصري للجولتين الأولى والثانية (User Turns 1 & 2)
  // تعاطف موجز + سؤال تشخيصي واحد مرتبط مباشرة بكلام المستفيد (دون درجات ودون قوالب معلبة)
  // =========================================================================
  if (isEarlyConversationalTurn) {
    const combinedDialogue = [...(historyTexts || []), message];
    const cleanInputSnippet = message.replace(/\s+/g, ' ').trim();
    const shortSnippet =
      cleanInputSnippet.length > 75 ? `${cleanInputSnippet.slice(0, 72)}...` : cleanInputSnippet;
    const isGenuineQ = isGenuineUserQuestion(message);
    const hasAcuteIso = hasAcuteIsolationOrRejection(combinedDialogue);
    const domainPool = getDomainContextConfig(agentKey, parsedCtx).exploratoryQuestions;
    const sessionKey = `${userProfile?.email || userName || 'default'}:${parsedCtx.workStatus}:${parsedCtx.dependentsLabel}:${agentKey}`;
    const lastIdx = lastFallbackIndexBySession.get(sessionKey);
    let preferredIdx = stationTurnCount >= 0 ? stationTurnCount % domainPool.length : 0;
    if (lastIdx !== undefined && preferredIdx === lastIdx) {
      preferredIdx = (lastIdx + 1) % domainPool.length;
    }
    const nextUnasked = pickNextUnaskedQuestion(domainPool, combinedDialogue, preferredIdx);
    if (nextUnasked.index >= 0) {
      lastFallbackIndexBySession.set(sessionKey, nextUnasked.index);
    } else {
      lastFallbackIndexBySession.set(sessionKey, preferredIdx);
    }

    const pickEarlyFollowUp = (candidates: string[]): string => {
      for (const candidate of candidates) {
        if (
          candidate &&
          !isQuestionAlreadyAsked(candidate, combinedDialogue) &&
          !isQuestionContradictingHistory(candidate, combinedDialogue) &&
          !isDiagnosticTopicAlreadyAnswered(candidate, combinedDialogue)
        ) {
          return candidate;
        }
      }
      if (nextUnasked.question) return nextUnasked.question;
      return `ما الجانب الأكثر تأثراً في ${stationTitle} الذي ترغب أن نركز عليه في هذا الأسبوع؟`;
    };

    let empathyLine = '';
    let followUpQuestion = '';

    if (agentKey === 'social') {
      const socialWorkFamilyOverload =
        /(?:ضغط\s*(?:ال)?عمل|ضغوط\s*(?:ال)?عمل|مشغول|انشغال|أسرة|اسرة|أسري|أسرية|عائلة|عائلية|أولاد|أبناء|بيت|إرهاق|ارهاق|مرهق|تعب|استنزاف|تعبان|ما\s*(?:عندي|أجد|اجد)\s*طاقة|قلة\s*طاقة|مسؤوليات|التزامات|الدوام)/i.test(
          combinedDialogue.join(' ')
        );
      if (socialWorkFamilyOverload) {
        empathyLine = `أقدّر صراحتك يا ${userName}؛ حين تجتمع ضغوط العمل ومسؤوليات الأسرة مع الإرهاق، من الطبيعي أن تتراجع طاقتك الاجتماعية وهذا ليس تقصيراً بل حاجة لحماية توازنك.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الالتزامات أو المجاملات الاجتماعية التي تشعر أن تخفيفها دون شعور بالذنب سيمنحك مساحة راحة أوضح هذا الأسبوع؟',
          'أي تواصل قصير ومريح مع شخص مقرب تراه مناسباً لطاقتك الحالية دون إرهاق؟',
        ]);
      } else if (isGenuineQ) {
        empathyLine = `تساؤلك في محله في ${stationTitle} يا ${userName}؛ جودة التواصل تُقاس بمدى راحتك وأثرها على طاقتك لا بكثرة اللقاءات.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما أكثر موقف أو التزام اجتماعي تشعر أنه يستنزف طاقتك أو يصعّب عليك التواصل المريح هذه الفترة؟',
        ]);
      } else {
        empathyLine = `أسمعك بوضوح وتقدير يا ${userName} حول ما شاركته في ${stationTitle} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الذي تشعر أنه يصعّب عليك حالياً الحفاظ على تواصل مريح ومتوازن مع الدائرة القريبة منك؟',
          'كيف تؤثر وتيرة يومك الحالية على طاقتك للتواصل مع من ترتاح لوجودهم؟',
        ]);
      }
    } else if (agentKey === 'personal') {
      if (hasAcuteIso) {
        empathyLine = `أقدر صراحتك التامة يا ${userName}، وأحترم حدودك ومساحتك الشخصية بعيداً عمّا يسبب لك الاستنزاف أو الأذى.`;
        followUpQuestion = pickEarlyFollowUp([
          'كيف ينعكس هذا الضغط والانفصال المستمر على راحتك الذهنية وطاقتك خلال بقية يومك؟',
          'ما الشيء الصغير الذي يمنحك قدراً أكبر من الهدوء والأمان النفسي في مساحتك الخاصة هذه الأيام؟',
        ]);
      } else if (/(تخصيص\s*وقت|راحة|البعد\s*عن\s*الشاشات|صفاء|هدوء|حضور\s*أعمق)/i.test(msg)) {
        empathyLine = `ما أجمل هذا الاتزان يا ${userName} في ${stationTitle}؛ تخصيصك وقتاً للراحة والبعد عن الشاشات ينعكس بوضوح على صفائك الذهني.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الشيء الذي يساعدك على حماية هذه المساحة الهادئة إذا ارتفع ضغط المهام في بعض الأيام؟',
        ]);
      } else if (isGenuineQ) {
        empathyLine = `سؤال مهم في ${stationTitle} يا ${userName}؛ الاتزان الذاتي يبدأ بخطوة واقعية هادئة تناسب طاقتك دون إرهاق أو مثالية.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الموقف أو العادة اليومية التي تشعر أنها تستهلك طاقتك الذهنية أكثر من غيرها هذه الأيام؟',
        ]);
      } else {
        empathyLine = `أسمعك بتفهم ووضوح يا ${userName} في ${stationTitle}؛ ما ذكرته من ("${shortSnippet}") يعكس واقعاً يستحق التعامل معه برفق وواقعية.`;
        followUpQuestion = pickEarlyFollowUp([
          'في الأيام التي يشتد فيها هذا الضغط، ما النمط أو العقبة الأولى التي تلاحظها في يومك؟',
          'ما الإجراء البسيط الذي ترى أنه قد يخفف عنك هذا الثقل ولو بنسبة محدودة هذا الأسبوع؟',
        ]);
      }
    } else if (agentKey === 'financial') {
      const studentIncomeTerm = incomeSrc?.includes('مكافأة')
        ? 'مكافأتك'
        : incomeSrc?.includes('مصروف')
          ? 'مصروفك'
          : 'دخلك الحالي';
      const detectedExpense = extractExpenseCategoryFromAnswer(message);
      const debtAnswered = hasDebtStatusAnswered(historyTexts || [], message);
      const efStatus = extractEmergencyFundStatus(combinedDialogue);

      const hasLoanOrInstallmentMsg =
        /(قرض|قروض|دين|ديون|أقساط|اقساط|قسط)/i.test(msg) &&
        !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*ديون)/i.test(msg);

      if (hasLoanOrInstallmentMsg) {
        empathyLine = `أقدّر صراحتك يا ${userName} في مشاركة واقع الأقساط والديون والالتزامات الحالية في ${stationTitle}.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما القسط أو الالتزام الذي تشعر أنه يضغط على تدفقك الشهري أكثر من غيره هذه الفترة؟',
        ]);
      } else if (detectedExpense) {
        empathyLine = `وضحت الصورة يا ${userName}${isEditedOrResent ? ' بعد تعديل إجابتك' : ''}؛ تسرب جزء من السيولة في **${detectedExpense}** نقطة مهمة يمكن ضبطها بهدوء في ${stationTitle}.`;
        followUpQuestion = pickEarlyFollowUp([
          !isStudent && !debtAnswered
            ? 'وقبل أن نضع سقفاً لضبط هذا البند: هل توجد عليك حالياً أي ديون أو أقساط شهرية ثابتة تقتطع من دخلك؟'
            : `ما السقف الأسبوعي المرن الذي تراه واقعياً لبند ${detectedExpense} دون شعور بالحرمان؟`,
        ]);
      } else if (efStatus.hasFund && efStatus.monthsCovered !== null) {
        empathyLine = `خطوة مطمئنة وواعية يا ${userName} امتلاكك صندوق طوارئ يغطي ${efStatus.monthsCovered} أشهر في ${stationTitle}.`;
        followUpQuestion = pickEarlyFollowUp([
          efStatus.monthsCovered < 6
            ? `ما الخطة أو النسبة المريحة لك الآن لاستكمال الصندوق من ${efStatus.monthsCovered} إلى 6 أشهر أو توجيه جزء من الفائض للنمو؟`
            : 'كيف توظف الفائض الشهري حالياً بين أهدافك القريبة والنمو طويل المدى؟',
        ]);
      } else if (/(نصف\s*ساعة|30|50|100|سأجرب|ساجرب|سأبدأ|سأدخر|سأوفر|صمام\s*أمان)/i.test(msg)) {
        const microHint = msg.includes('30') ? 'ادخار 30 ريالاً كصمام أمان' : 'هذه الخطوة الميسرة';
        empathyLine = `خطوة ممتازة وموزونة يا ${userName}؛ البدء بـ ${microHint} من ${isStudent ? studentIncomeTerm : 'دخلك'} يكسر جمود البداية دون ضغط.`;
        followUpQuestion = pickEarlyFollowUp([
          isStudent
            ? `ما الطريقة الأنسب لك لحماية هذا المبلغ من الصرف العفوي حتى نهاية الشهر؟`
            : !debtAnswered
              ? 'وهل تقتطع أي أقساط أو التزامات دورية جزءاً من دخلك الشهري قبل تثبيت هذه الخطوة؟'
              : 'ما العائق العملي الأبرز الذي قد يواجه استمرارك في هذه الخطوة خلال الشهر القادم؟',
        ]);
      } else if (/(قرض|قروض|دين|ديون|أقساط|اقساط)/i.test(msg) && !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*ديون)/i.test(msg)) {
        empathyLine = `أقدّر صراحتك يا ${userName} في مشاركة واقع الأقساط والديون والالتزامات الحالية في ${stationTitle}.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما القسط أو الالتزام الذي تشعر أنه يضغط على تدفقك الشهري أكثر من غيره هذه الفترة؟',
        ]);
      } else if (isStudent && /(يفي|تكفي|يكفي|احتياجاتي|الأساسية|لا ادخر|لا أدخر)/i.test(msg)) {
        empathyLine = `أقدّر صراحتك يا ${userName}؛ كون ${studentIncomeTerm} يفي باحتياجاتك الأساسية كطالب يمثّل أرضية جيدة رغم صعوبة الادخار حالياً.`;
        followUpQuestion = pickEarlyFollowUp([
          `ما البند الذي تلاحظ أنه يستهلك النسبة الأكبر من ${studentIncomeTerm} خلال الشهر؟`,
        ]);
      } else if (isGenuineQ) {
        empathyLine = `استفسار وجيه في ${stationTitle} يا ${userName}؛ التخطيط المالي السليم يبدأ دائماً من التدفق الفعلي والالتزامات القائمة لا من التخمين.`;
        followUpQuestion = pickEarlyFollowUp([
          isStudent
            ? `هل يكفيك ${studentIncomeTerm} حتى نهاية الشهر، وما البند الذي يستهلك الجزء الأكبر منه؟`
            : !debtAnswered
              ? 'هل تقتطع أي أقساط أو ديون أو التزامات حتمية جزءاً من دخلك الشهري حالياً؟'
              : 'ما البند الشهري الذي تشعر أنه يضغط على تدفقك النقدي أكثر من غيره؟',
        ]);
      } else {
        empathyLine = `أقدّر صراحتك يا ${userName} في توصيف وضعك في ${stationTitle} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          isStudent
            ? `ما البند الذي يستهلك النسبة الأكبر من ${studentIncomeTerm} خلال الشهر؟`
            : !debtAnswered
              ? 'قبل التخطيط لأي ادخار، هل تقتطع أي أقساط أو ديون أو التزامات شهرية جزءاً من دخلك؟'
              : 'ما البند الشهري أو الأسبوعي الذي تلاحظ أنه يستهلك النسبة الأكبر من دخلك؟',
        ]);
      }
    } else if (agentKey === 'spiritual') {
      const mentionsTimeStep = /(نصف\s*ساعة|ربع\s*ساعة|\d+\s*دقيقة|\d+\s*دقائق|مشي|تأمل|تامل|خلوة|هدوء)/i.test(msg);
      if (mentionsTimeStep) {
        empathyLine = `خطوة واعية ومريحة يا ${userName}؛ تخصيص ${msg.includes('نصف ساعة') ? 'نصف ساعة' : 'هذه الدقائق'} بعيداً عن الهاتف يمنحك مساحة صادقة لاستعادة السكينة في ${stationTitle}.`;
        followUpQuestion = pickEarlyFollowUp([
          `وسط ضغوط يومك ${isStudent ? 'الدراسية' : 'العملية'}، ما التوقيت الأنسب لك لتثبيت هذه المساحة الهادئة يومياً؟`,
        ]);
      } else if (/(قلق|ضغط|دراسة|شغل|تشتت|هاتف|جوال|شاشات)/i.test(msg)) {
        empathyLine = `أسمعك باهتمام يا ${userName} في ${stationTitle}؛ تزاحم الضغوط والمشتتات الرقمية يرهق صفاء الذهن ويسرق لحظات السكون.`;
        followUpQuestion = pickEarlyFollowUp([
          'في زحام يومك المعتاد، متى تلاحظ أن التشتت يبلغ ذروته، وهل تتاح لك 10 دقائق هادئة بلا شاشات؟',
        ]);
      } else if (isGenuineQ) {
        empathyLine = `تساؤلك مهم في ${stationTitle} يا ${userName}؛ السكينة لا تتطلب مثالية أو جهداً شاقاً، بل دقائق صدق وهدوء يومية.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما العادة الهادئة أو اللحظة اليومية الأقرب لقلبك التي تشعرك بصفاء الذهن؟',
        ]);
      } else {
        empathyLine = `أسمعك بهدوء وتقدير يا ${userName} حول ما ذكرته في ${stationTitle} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          'متى كانت آخر لحظة شعرت فيها بصفاء ذهني وسلام داخلي، وما الذي ساعدك وقتها؟',
        ]);
      }
    } else if (agentKey === 'health') {
      if (/(نوم|أرق|ارق|سهر|إرهاق|ارهاق|تعب|طاقة)/i.test(msg)) {
        empathyLine = `أسمعك باهتمام يا ${userName} في ${stationTitle}؛ حين يتأثر النوم أو تتراجع الطاقة، يرسل الجسد إشارة واضحة بحاجته إلى ضبط الإيقاع والراحة.`;
        followUpQuestion = pickEarlyFollowUp([
          'كم ساعة تنام فعلياً في الأيام الأخيرة، وهل يسبق نومك استخدام للشاشات أو منبهات متأخرة؟',
        ]);
      } else if (isGenuineQ) {
        empathyLine = `سؤال عملي ومهم في ${stationTitle} يا ${userName}؛ الطاقة البدنية تبدأ عادةً بخطوة صغيرة ثابتة في النوم أو الترطيب أو الحركة البسيطة.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الجانب الصحي الذي تشعر أن جسدك يطلبه بإلحاح أكبر الآن: انتظام النوم أم الحركة الخفيفة؟',
        ]);
      } else {
        empathyLine = `أقدّر مشاركتك لصورتك الصحية في ${stationTitle} يا ${userName} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          'خلال ساعات يومك المعتاد، متى تلاحظ أكبر هبوط في طاقتك البدنية أو نشاطك؟',
        ]);
      }
    } else if (agentKey === 'career') {
      if (isGenuineQ) {
        empathyLine = `سؤال في الصميم حول ${stationTitle} يا ${userName}؛ التقدم المهني يبدأ بحماية وقت التركيز في مهمة واحدة مؤثرة بدل تشتت المهام.`;
        followUpQuestion = pickEarlyFollowUp([
          `في ${isStudent ? 'دراستك ومشاريعك' : 'عملك اليومي'}، ما الشيء الأكثر استنزافاً لوقتك دون عائد حقيقي؟`,
        ]);
      } else {
        empathyLine = `أسمعك بتركيز يا ${userName} حول وضعك في ${stationTitle} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          `ما أكبر عائق أو مشتت يقطع تركيزك ويصعّب عليك إنجاز أولوياتك ${isStudent ? 'الدراسية والمهارية' : 'المهنية'}؟`,
        ]);
      }
    } else if (agentKey === 'learning') {
      if (/(لا\s*أقرأ|لا\s*اقرأ|ما\s*عندي\s*وقت|لا\s*أجد\s*وقت|تشتت|تسويف)/i.test(msg)) {
        empathyLine = `أقدّر صراحتك يا ${userName} في ${stationTitle}؛ ضيق الوقت وتزاحم الالتزامات يجعلان إيجاد مساحة للقراءة أو التعلم تحدياً حقيقياً.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما الذي يقف عادةً بينك وبين تخصيص 10 إلى 15 دقيقة أسبوعية للقراءة أو تعلم مهارة محددة؟',
        ]);
      } else if (isGenuineQ) {
        empathyLine = `تساؤل جيد في ${stationTitle} يا ${userName}؛ التعلم التراكمي الهادئ بعادة قصيرة أثبت من الاندفاع المؤقت.`;
        followUpQuestion = pickEarlyFollowUp([
          'ما المهارة أو المجال المعرفي الأقرب لاحتياجك الفعلي في هذه المرحلة؟',
        ]);
      } else {
        empathyLine = `أقدّر مشاركتك حول مسارك في ${stationTitle} يا ${userName} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          'ما المجال أو المهارة التي تود التركيز عليها هذا الشهر، وما العائق الأبرز أمام البدء؟',
        ]);
      }
    } else {
      if (isGenuineQ) {
        empathyLine = `سؤال صادق ومهم في ${stationTitle} يا ${userName}؛ جودة الحضور والإنصات الهادئ تصنع أثراً أعمق من طول الوقت مع انشغال الذهن.`;
        followUpQuestion = pickEarlyFollowUp([
          hasDep
            ? 'ما أكثر وقت أو عائق يومي يصعّب عليكم الجلوس معاً بهدوء بعيداً عن المشتتات؟'
            : 'ما الشيء الذي يصعّب عليك حالياً الحفاظ على تواصل دافئ ومنتظم مع والديك وأهلك؟',
        ]);
      } else {
        empathyLine = `أسمعك باهتمام وتقدير يا ${userName} لما ذكرته في ${stationTitle} ("${shortSnippet}").`;
        followUpQuestion = pickEarlyFollowUp([
          hasDep
            ? 'كيف تصف جودة الوقت الهادئ الذي تقضيه مع أسرتك بعيداً عن الشاشات وضغط العمل؟'
            : 'كيف تصف إيقاع تواصلك وبرّك مع أهلك وسط انشغالاتك الحالية؟',
        ]);
      }
    }

    const earlyReply = `${empathyLine}\n\n${followUpQuestion}`;
    return formatAgentOutput({
      reasoning: `جولة استكشافية تمهيدية (${stationTurnCount + 1} من 2) في ${stationTitle}: تعاطف موجز مرتبط بكلام المستفيد ("${shortSnippet}") وسؤال تشخيصي واحد دون أي تقييم رقمي أو قوالب معلبة.`,
      summary: `استكشاف حواري تمهيدي في ${stationTitle} مرتبط بمدخلات المستفيد.`,
      advice: `متابعة الاستكشاف الحواري بهدوء لفهم واقع ${stationTitle} قبل التقييم.`,
      reply: earlyReply,
      actionSteps: [`متابعة تشخيص ${stationTitle} بخطوات واقعية واضحة`],
      score: 0,
      station_completed: false,
      reflectionQuestion: followUpQuestion,
    });
  }

  if (isDirectQuestion) {
    // إجابات تخصصية مباشرة وفق تخصص المستشار
    if (agentKey === 'spiritual') {
      return formatAgentOutput({
        reasoning: `تحليل استفسار المستفيد الروحي ("${message}"): التفاعل المتزن مع طرحه دون قوالب معلبة أو افتراض تقصير، والتركيز على السكينة العملية وحضور اللحظة.`,
        summary: `توجيه عملي هادئ في الجانب الروحي حول: "${message}".`,
        advice: `السكينة وحضور القلب يبدآن بتخصيص لحظات هادئة خالية من التشتت، لا بجلد الذات أو طلب المثالية.`,
        reply: `أسمع تساؤلك باهتمام يا ${userName}. حول ما طرحته: "${message}"، السكينة النفسية والروحية لا تُقاس بالكمال، بل بصفاء النية والرفق بالنفس أمام ضغوط اليوم.\n\nعندما يزدحم الذهن بالانشغالات، جرب التوقف لثلاث إلى خمس دقائق في هدوء بعيداً عن الشاشات لاستعادة حضورك الداخلي والتنفس بعمق.`,
        actionSteps: ['تخصيص 5 دقائق هدوء بعيداً عن الهاتف', 'تحديد وقت ثابت لبداية اليوم بطمأنينة'],
        reflectionQuestion: 'ما الذي تشعر أنه يشتت هدوءك الداخلي أكثر من غيره في هذه الأيام؟'
      });
    }

    if (agentKey === 'financial') {
      const finCtxConfig = getDomainContextConfig('financial', parsedCtx);
      const combinedFinHistory = `${(historyTexts || []).join(' ')} ${msg}`;
      const queryMentionsDebt = /(دين|ديون|قرض|قروض|أقساط|اقساط|بطاقة|فيزا|التزامات)/i.test(combinedFinHistory) && !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*ديون)/i.test(combinedFinHistory);
      const queryConfirmsNoDebt = /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(combinedFinHistory);
      return formatAgentOutput({
        reasoning: `تحليل استفسار المستفيد المالي ("${message}") بسياق (${status}): تفكيك الواقع المالي دون افتراض خلو السجل من الديون أو وجود فائض جاهز.`,
        summary: `إجابة استشارية مالية مباشرة حول: "${message}".`,
        advice: isStudent
          ? `القاعدة الذهبية للطالب: راقب مصروفاتك الدراسية واليومية وابدأ بصمام أمان رمزي ولو بـ 50 ريالاً شهرياً.`
          : isVariableIncome
            ? `مع الدخل المتغير: افصل أموال العمل عن مصروفك الشخصي واحصر التزاماتك ثم اقتطع نسبة احتياطي في أشهر الوفرة.`
            : queryMentionsDebt
              ? `عند وجود أقساط أو ديون: الأولوية لحصرها وترتيب خطة سداد متوازنة مع صمام أمان نقدي مصغر قبل أي استثمار.`
              : queryConfirmsNoDebt
                ? `بعد تأكد خلوك من الديون: افصل بين الاحتياج والرغبة، وباشر بتأسيس صندوق الطوارئ${hasDep ? ' لحماية أسرتك' : ''} ثم الادخار التلقائي.`
                : `قبل الحديث عن أتمتة الادخار أو الاستثمار، الخطوة الأولى هي حصر أي ديون أو أقساط شهرية والتأكد من صافي التدفق النقدي الفعلي.`,
        reply: isStudent
          ? `أهلاً بك يا ${userName}. للإجابة مباشرة على استفسارك المالي كطالب جامعي: التوازن المالي في هذه المرحلة يقوم على ضبط مصاريف الدراسة واليوميات ضمن ${incomeSrc}، واقتطاع مبلغ رمزي صغير لحمايتك من طوارئ نهاية الشهر.`
          : isVariableIncome
            ? `أهلاً بك يا ${userName}. للإجابة مباشرة على استفسارك المالي مع طبيعة الدخل المتغير: النجاح يكمن في تحديد مصروف شهري ثابت لنفسك وحصر التزاماتك الدورية، مع تجنيب فائض الأشهر الجيدة لتأمين احتياطي يغطي الأشهر الأهدأ.`
            : isJobSeeker
              ? `أهلاً بك يا ${userName}. للإجابة مباشرة على استفسارك المالي في مرحلة البحث عن عمل: الأولوية الآن لحماية مدخراتك وتوجيهها للأساسيات فقط حتى تطيل فترة أمانك بأريحية دون ديون.`
              : queryMentionsDebt
                ? `أهلاً بك يا ${userName}. قبل الحديث عن أتمتة الادخار أو الاستثمار مع وجود التزامات: الأولوية هي حصر كافة الأقساط والديون الشهرية، ترتيب خطة سداد واقعية دون إرباك لمعيشتك، وتأمين صمام أمان مصغر يمنع اللجوء لاقتراض جديد.`
                : queryConfirmsNoDebt
                  ? `أهلاً بك يا ${userName}. مع خلو سجلك من الديون: النجاح المالي يبدأ بتوجيه راتبك بحكمة عبر بناء صمام أمان${hasDep ? ' لأسرتك' : ''} يغطي 3 إلى 6 أشهر، ثم أتمتة الادخار والاستثمار المنتظم وفق فائضك الفعلي.`
                  : `أهلاً بك يا ${userName}. قبل أن نتحدث عن أتمتة الادخار أو الاستثمار، لا نفترض وجود فائض جاهز لمجرد ثبات الدخل؛ الخطوة العملية الأولى هي التحقق مما إذا كانت توجد أي أقساط أو ديون أو التزامات شهرية تقتطع من راتبك، لنبني بعدها خطة الادخار والسيولة على أرض صلبة.`,
        actionSteps: isStudent
          ? [`تتبع نفقاتك اليومية لمدة أسبوع`, `تخصيص مبلغ رمزي (30-50 ريالاً) من ${incomeSrc} للادخار`]
          : queryConfirmsNoDebt
            ? ['مراجعة كشف حساب الشهر الماضي ورصد النفقات غير الضرورية', 'تحديد مبلغ ثابت شهري للادخار التلقائي']
            : ['حصر جميع الأقساط والديون والالتزامات الشهرية الثابتة ونسبتها من الدخل', 'تحديد صافي الفائض النقدي الحقيقي قبل التزام أي نسبة ادخار'],
        reflectionQuestion: finCtxConfig.exploratoryQuestions[0]
      });
    }

    if (agentKey === 'health') {
      return formatAgentOutput({
        reasoning: `تحليل استفسار المستفيد الصحي ("${message}"): التركيز على مثلث الصحة الحيوية (النوم، الحركة، التغذية المتوازنة).`,
        summary: `إجابة صحية مباشرة حول: "${message}".`,
        advice: `الجسد أمانة؛ وعادات النوم الثابتة وشرب الماء والحركة اليومية هي أساس الطاقة العالية.`,
        reply: `أهلاً بك يا ${userName}. رداً على تساؤلك الصحي في ${stationTitle}: الجسد هو المحرك الأساسي لكل أهدافك في الحياة. إذا أردت تعزيز طاقتك وحيويتك فوراً، فابدأ بضبط موعد نومك ليكون 7-8 ساعات في غرفة مظلمة، واشرب لترين من الماء يومياً، وامشِ 20 دقيقة على الأقل كل يوم. ستشعر بفارق فوري في صفاء ذهنك وطاقتك.`,
        actionSteps: ['النوم والاستيقاظ في موعد ثابت لمدة أسبوع', 'شرب كوبين من الماء فور الاستيقاظ'],
        reflectionQuestion: 'ما هي العادة الصحية التي تشعر أن جسدك يطلبها منك بإلحاح الآن؟'
      });
    }

    if (agentKey === 'career') {
      return formatAgentOutput({
        reasoning: `تحليل استفسار المستفيد المهني ("${message}"): الربط بين المهارات النادرة، إدارة الطاقة والوقت، والوضوح الاستراتيجي.`,
        summary: `إجابة مهنية مباشرة حول: "${message}".`,
        advice: `ركز على بناء مهارة فارقة وقيمة مضافة في مجالك، ورتب أولوياتك وفق مصفوفة أيزنهاور.`,
        reply: `أهلاً بك يا ${userName}. إجابتي المباشرة على سؤالك المهني: التميز في مسارك يتطلب التركيز على ما يُعرف بـ 'العمل العميق' وحماية وقتك من المشتتات والمهام الثانوية. ضع هدفاً مهنياً واحداً رئيساً لهذا الربع السنوي، وطور مهارة تقنية أو قيادية محددة ترفع من قيمتك في سوق العمل.`,
        actionSteps: ['تخصيص ساعتين يومياً للعمل العميق دون مقاطعات', 'قراءة مقال أو فصل متخصص في مجالك المهني'],
        reflectionQuestion: 'ما هو التحدي المهني الذي إذا تجاوزته ستنقل مسارك إلى مستوى أعلى؟'
      });
    }

    // إجابة استشارية عامة مباشرة
    return formatAgentOutput({
      reasoning: `تحليل سؤال المستفيد في مجال (${stationTitle}): تقديم إجابة مباشرة شافية متناغمة مع مبادئ وزان لتوازن الحياة.`,
      summary: `إجابة استشارية مباشرة حول: "${message}".`,
      advice: `الاتزان هو رحلة يومية تبدأ بخطوة صغيرة مستمرة؛ ركز على الأثر التراكمي.`,
      reply: `سؤال وجيه ومهم جداً يا ${userName}. للإجابة المباشرة على ما سألت عنه بخصوص (${stationTitle}):\n\nالحكمة في هذا الجانب هي عدم تحميل نفسك فوق طاقتها دفعة واحدة. ابدأ بتحديد خطوة واحدة واضحة وواقعية، واجعلها عادة يومية حتى تترسخ، ثم ابنِ عليها تدريجياً. بهذه الطريقة تحمي نفسك من التسويف والإحباط وتصل لأهدافك بثبات.`,
      actionSteps: ['تحديد الخطوة الأولى القادمة والبدء بها اليوم', 'تقييم الأثر بعد مرور 3 أيام'],
      reflectionQuestion: 'ما هي النتيجة التي تود رؤيتها في هذا الجانب بنهاية هذا الأسبوع؟'
    });
  }

  // إذا كانت جلسة تقييم أسبوعية في العيادة ولم يكن المدخل سؤالاً أو تنفيساً (Weekly Assessment Ritual)
  if (isAnswerToEvaluation) {
    if (evaluationStep !== undefined && evaluationStep >= 8) {
      // المحطة الختامية للأسئلة الثمانية
      const goldenHabit = advisor?.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
      return formatAgentOutput({
        reasoning: `تحليل ختامي شامل لمسار التقييم المكتمل (8 أسئلة): تلخيص إجابات المستفيد (${userName}) وربطها بالعادات اليومية (Micro-habits) وإدراج العادة الذهبية في المربع الثاني بمصفوفة أيزنهاور لحمايتها من التسويف وضمان الاستدامة وتوازن عجلة الحياة.`,
        summary: `اعتماد تقييم ${stationTitle} بدرجة (${score > 0 ? (score <= 10 ? score : score / 10).toFixed(1) : '7.5'} من 10) بعد استكمال الأسئلة الـ 8.`,
        advice: `التوصية الذهبية لهذا الأسبوع: ${goldenHabit}.`,
        reply: `🎉 أحسنت يا ${userName}! استمعت بتقدير بالغ لكل ما شاركته طوال رحلة التقييم المكتملة عبر محطاتها الـ 8.\n\nرصدنا درجتك المعتمدة في ${stationTitle}: (${score > 0 ? (score <= 10 ? score : score / 10).toFixed(1) : '7.5'} من 10).\n\n📌 **توصيتي الذهبية لهذا الأسبوع:**\n${goldenHabit}.\n\nتم اعتماد التقييم بنجاح في عجلة حياتك، وباب الحوار والاستشارة مفتوح معك دائماً لأي استفسارات أو تفاصيل إضافية.`,
        actionSteps: advisor?.defaultGoals?.slice(0, 2) || [goldenHabit],
        reflectionQuestion: 'كيف يمكنك تهيئة بيئتك اليوم لتلتزم بهذه العادة طوال الأسبوع؟'
      });
    } else {
      // إحدى محطات الأسئلة الثمانية
      const ratingMatch = msg.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i);
      const scoreNum = ratingMatch ? Math.min(10, Math.max(1, parseFloat(ratingMatch[1]))) : 5;
      let evalReply = `أسمعك بكل اهتمام واحتواء يا ${userName}، ورصدت ما شاركته بوعي تام.\n\nبصفتي مستشارك ومرشدك في ${stationTitle}، كل خطوة نناقشها هنا تمنحنا رؤية أوضح لكيفية تحقيق أقصى درجات الاتزان.`;
      if (ratingMatch) {
        if (scoreNum <= 4) {
          evalReply = `أحييك على شجاعتك وصراحتك في مشاركة هذا التقييم (${scoreNum} من 10) يا ${userName}. مرورك بفترة ضغط أو فتور في ${stationTitle} هو أمر طبيعي يمر به الجميع، والهدف من وجودنا معاً هو تفكيك هذا الثقل خطوة بخطوة لاستعادة توازنك.`;
        } else if (scoreNum <= 7) {
          evalReply = `تقييمك المتزن (${scoreNum} من 10) يعكس وعياً طيباً بقاعدتك الحالية في ${stationTitle}. لديك أساس جيد يمكنك البناء عليه لتعميق الأثر والوصول إلى مستويات أعلى من الرضا والاستقرار.`;
        } else {
          evalReply = `ما شاء الله، نتيجة ملهمة ومبهجة (${scoreNum} من 10) تعكس صفاءً حقيقياً وعملاً متواصلاً في ${stationTitle}. هذا الاستقرار هو مكسب كبير لحياتك يستحق الحفاظ عليه ودعمه.`;
        }
      }

      return formatAgentOutput({
        reasoning: `تحليل مرحلي لمدخلات المستفيد (${userName}) في المحطة (${evaluationStep || 1} من 8): تفكيك المعطيات وفحص أثرها على (${stationTitle}) وصياغة استجابة داعمة تدفعه للأمام.`,
        summary: `رصد إجابة المستفيد على المحطة ${evaluationStep || 1} في ${stationTitle} ومواصلة التقييم النوعي.`,
        advice: `خطوتك القادمة تصنع فرقاً حقيقياً إذا واصلت التركيز على العادات الصغيرة.`,
        reply: evalReply,
        actionSteps: advisor?.defaultGoals?.slice(0, 1) || ['التركيز على العادة الأساسية لهذا الجانب'],
        reflectionQuestion: 'كيف تشعر بأثر هذا التحدي على بقية جوانب يومك؟'
      });
    }
  }

  // 1. Domain: Spiritual (د. سفيان الروحي)
  if (agentKey === 'spiritual') {
    // رصد اختيار المستفيد مواصلة الحوار والتعمق (مثل: حسناً نكمل قليلاً، نواصل الحوار، أريد أن أطيل)
    const isContinueIntent = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(msg) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(msg);
    if (isContinueIntent) {
      return formatAgentOutput({
        reasoning: `المستفيد (${userName}) اختار صراحة مواصلة الحوار الروحي والتعمق بدلاً من اعتماد التقييم الحالي وإنهاء المحطة ("${message}"). نرحب برغبته في الاستكشاف ونطرح سؤالاً تشخيصياً نوعياً جديداً حول جذور التشتت اليومي.`,
        summary: `مواصلة الحوار الاستكشافي وتعميق تشخيص السكينة والسلام الداخلي.`,
        advice: `التعمق في معرفة أوقات ومصادر التشتت هو المفتاح الحقيقي لبناء سكينة دائمة ومستقرة.`,
        reply: `مرحباً بقرارك ويسعدني جداً أن نواصل الحوار معاً يا ${userName}! 🌿\n\nرغبتك في الاستمرار وتعميق الفهم تدل على حرص صادق على سلامك الداخلي والوصول إلى أقصى درجات الاتزان.\n\nبما أنك ذكرت أن ضغط المهام وإدمان الهاتف هما أكبر مشتتاتك: كيف تبدأ أول نصف ساعة من يومك فور الاستيقاظ؟ وهل تمنح عقلك فرصة للتنفس بهدوء، أم تبدأ يومك بالانغماس المباشر في الإشعارات والرسائل المتسارعة مما يرفع التوتر مبكراً؟`,
        actionSteps: [
          'تأخير تصفح الهاتف لمدة 15 دقيقة بعد الاستيقاظ لإعطاء العقل مساحة استيقاظ هادئة',
          'أخذ 3 أنفاس عميقة وملاحظة تدفق الهواء قبل البدء في أول مهمة يومية'
        ],
        score: currentSessionUnifiedScore,
        station_completed: false,
        reflectionQuestion: 'كيف تصف بداية صباحك، وهل تشعر أنها تشحن طاقتك أم تشتتك فوراً؟'
      });
    }

    // فحص ما إذا كان المستخدم يطلب صراحة اعتماد التقييم
    const isSpiritualAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|أنهِ\s*المحطة|أنه\s*المحطة|انهي\s*المحطة|انهاء\s*المحطة|إنهاء\s*المحطة|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    if (isSpiritualAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `المستفيد (${userName}) اختار صراحة اعتماد التقييم الروحي ("${message}"). نثبت الدرجة (${finalScore}) ونغلق المحطة بنجاح.`,
        summary: `تم اعتماد تقييم السكينة والسلام الداخلي بنجاح.`,
        advice: `تثبيت مساحتك الهادئة يومياً بانتظام لصيانة حضور القلب.`,
        reply: `تم اعتماد تقييمك الروحي بنجاح يا ${userName}! 🕊️\n\nوعيك بأثر المشتتات والهدوء، واختيارك لخطوة يومية واضحة يمنحانك أرضية صلبة لسلامك الداخلي. خطتك معتمدة، وأنت مستعد تماماً للانتقال إلى المحطة التالية.`,
        actionSteps: [
          'تثبيت مساحة الهدوء والتنفس لمدة 15-30 دقيقة يومياً',
          'حماية صفاء الذهن من شاشات الهاتف في مستهل الصباح'
        ],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    // إذا شارك المستفيد خطوة تهدئة أو التزاماً وقتياً (مثل نصف ساعة أو 3 دقائق)
    const isStepOrWrapup = !isContinueIntent && !isSpiritualAdoption && /(نصف\s*ساعة|ساعة|ربع\s*ساعة|\d+\s*دقيقة|\d+\s*دقائق|خطوة|امشي|أمشي|مشي|تأمل|تامل|رياضة خفيفة|صلاة|ذكر|تنفس|خلوة)/i.test(msg);
    if (isStepOrWrapup && !isGreeting) {
      if (stationTurnCount < 2) {
        // قبل الرسالة الثالثة للمستفيد: تأكيد الخطوة ومواصلة الحوار بأسئلة متدرجة دون إنهاء أو اقتراح اعتماد مبكر
        return formatAgentOutput({
          reasoning: `المستفيد قدم التزاماً وقتياً للسكينة ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد على هذه الخطوة بوعي ونواصل الحوار التدرجي لتعميق فهم واقعه دون إنهاء مبكر للمحطة.`,
          summary: `تثبيت التزام المستفيد بخطوة السكينة اليومية ومواصلة الاستكشاف التشخيصي.`,
          advice: `حماية مساحة الهدوء اليومية بانتظام لصيانة حضور القلب.`,
          reply: `خطوة واعية ومباركة يا ${userName}! 🌿\n\nتخصيص هذا الوقت لبداية يومك هو بذرة السكينة الحقيقية وتخفيف الشتات الرقمي.\n\nولكن لننظر إلى الجانب الآخر من يومك: عند ذروة ضغوط المهام والتزاماتك ${isStudent ? 'الدراسية والجامعية' : 'العملية والشخصية'}، ما هو الشيء الذي يسحب حضورك القلبي ويزيد توترك أكثر؟ وكيف تتعامل مع تلك اللحظة عادة؟`,
          actionSteps: [
            'تثبيت مساحة الهدوء والتنفس يومياً',
            'ملاحظة مواضع التوتر أثناء اليوم وأخذ وقفة تنفس قصيرة'
          ],
          score: isEvaluationSession ? currentSessionSemanticScore : (score > 0 ? (score > 10 ? score / 10 : score) : 5.5),
          station_completed: false,
          reflectionQuestion: 'ما الذي يسحب حضورك القلبي عند ذروة ضغوط يومك؟'
        });
      } else {
        // ابتداءً من الرسالة الثالثة للمستخدم (stationTurnCount >= 2): عرض التقييم الموحد وخيار الاعتماد
        const spiritualOfferScore = currentSessionUnifiedScore;
        return formatAgentOutput({
          reasoning: `المستفيد في الرسالة (${stationTurnCount + 1}) وقدم التزاماً بالسكينة ("${message}"). عرض التقييم الموحد وخيار الاعتماد.`,
          summary: `تشخيص اتزان روحي مع تثبيت خطوة تهدئة يومية هادئة.`,
          advice: `تثبيت مساحتك الهادئة يومياً بانتظام لصيانة حضور القلب.`,
          reply: `ما شاركته عبر حوارنا يعكس وعياً طيباً بقيمة الهدوء واستعادة حضور القلب وسط صخب اليوم.\n\n${formatUnifiedScoreConfirmationMessage(spiritualOfferScore)}`,
          actionSteps: [
            'تثبيت مساحة الهدوء والتنفس لمدة 15-30 دقيقة يومياً',
            'حماية صفاء الذهن من شاشات الهاتف في مستهل الصباح'
          ],
          score: spiritualOfferScore,
          station_completed: false,
          reflectionQuestion: 'هل نعتمد هذا التقييم وننتقل للمحطة التالية؟'
        });
      }
    }

    if (isGreeting) {
      return formatAgentOutput({
        reasoning: `تحليل ترحيبي وتأسيس المساحة الآمنة: المستفيد (${userName}) يبادر بالتحية، والمطلوب هو كسر حاجز الرسمية وفتح أفق الحوار حول الصفاء والسكينة الداخلية وعلاقتها بتدفق اليوم.`,
        summary: `الترحيب بالمستفيد واستكشاف مستوى الحضور القلبي والسكينة الروحية في وتيرة حياته اليومية.`,
        advice: `البدء بخلوة ذهنية قصيرة لمدة 5 دقائق بعد صلاة الفجر لاستعادة الهدوء الداخلي.`,
        reply: `أهلاً ومرحباً بك يا ${userName}! أنا ${advName} المستشار الروحي في منصة وزان.\n\nيسعدني جداً أن نتحاور معاً حول سكينتك الداخلية، وتدبر يومك، وتناغم عبادتك مع وتيرة حياتك. كيف تشعر بروحانياتك وحضور قلبك هذه الأيام؟ تحدث معي بأريحية تامة.`,
        actionSteps: [
          'تخصيص 5 دقائق خلوة وتدبر صامت بعد صلاة الفجر',
          'قراءة صفحتين من القرآن الكريم بتأنٍ وتدبر يومياً'
        ],
        reflectionQuestion: 'ما هو العمل البسيط الذي يمنح قلبك أكبر قدر من الطمأنينة والسلام الداخلي؟'
      });
    }

    if (msg.includes('استغفار') || msg.includes('صلاة') || msg.includes('فقط') || msg.includes('ارتاح') || msg.includes('راحة')) {
      return formatAgentOutput({
        reasoning: `تفكيك مفهوم العبادة: المستفيد يربط بين العبادة الروتينية وغياب الراحة، مما يشير إلى وجود ضغط نفسي أو استعجال (تأدية بلا حضور قلب). التحليل يقتضي إعادة تعريف الروحانية كحالة شعورية وسلام داخلي، وليس مجرد مهام شكلية مفرغة من المعنى.`,
        summary: `تفكيك أسباب غياب السكينة أثناء العبادات وتوجيه المستفيد نحو حضور القلب بدلاً من الكمية.`,
        advice: `صلاة ركعتين بتؤدة وإطالة السجود والتنفس العميق للتخلص من الشحنات السلبية.`,
        reply: `سؤالك في غاية الصدق والعمق يا ${userName}!\n\nبالتأكيد لا؛ الجانب الروحي أوسع وأشمل بكثير من مجرد أداء حركات الصلاة أو ترديد الاستغفار باللسان كواجب روتيني.\nالروحانية الحقيقية تعني:\n1. **حضور القلب والسكينة**: أن تجد في الصلاة ملاذاً وراحة وليس مجرد مهمة تقضيها.\n2. **التفكر والامتنان**: التوقف لدقائق في يومك لتتأمل في نعم الله والكون وتتخلص من التوتر والتسارع.\n3. **سلامة الصدر والأثر الأخلاقي**: التسامح، التحرر من الأحقاد، وبث الطمأنينة والإحسان لمن حولك.\n\nإذا كنت لا تشعر بالراحة، فغالباً لأنك تستعجل العبادة وسط دوامة الضغوط، أو لأن هناك هماً دنيوياً يملأ ذهنك. خذ نفساً عميقاً، ولا تجلد ذاتك، فالسكينة تأتي بالهدوء والتفريغ التدريجي.`,
        actionSteps: [
          'صلّ صلاة واحدة اليوم ببطء مضاعف مع إطالة السجود والتنفس بهدوء',
          'جلسة صمت وتأمل لمدة 5 دقائق خالية تماماً من الهاتف والتفكير في العمل'
        ],
        reflectionQuestion: 'ما هو الأمر الذي يشغل بالك الآن وتستطيع تفويضه لله ليرتاح قلبك؟'
      });
    }

    if (msg.includes('كيف') || msg.includes('لماذا') || msg.includes('اكون') || msg.includes('رأيك') || msg.includes('برايك')) {
      return formatAgentOutput({
        reasoning: `توجيه فلسفي وأخلاقي: المستفيد يبحث عن المعيار الروحي الأمثل لنفسه. التحليل يركز على حمايته من جلد الذات والمثالية المفرطة (Perfectionism trap)، وتوجيهه نحو الصدق الواقعي والدوام على القليل النافع.`,
        summary: `بيان أن الاتزان الروحي ينبع من الصدق مع النفس وجودة اللحظة لا من المثالية الزائفة.`,
        advice: `اختر عادة روحية خفيفة واحدة والتزم بها طوال الأسبوع دون انقطاع.`,
        reply: `تسألني كيف يجب أن تكون برأيي يا ${userName}؟\n\nالجواب الحكيم: لا يُطلب منك أن تكون إنساناً خارقاً أو خالياً من التقصير. المطلوب منك فقط هو أن تكون **"صادقاً مع نفسك"**.\nالجانب الروحي ليس أداة للوم الذات، بل هو مساحة لتستعيد فيها إنسانيتك وسلامك وسط صخب العالم. لتكون متزناً روحياً:\n- ابدأ بعادة صغيرة واحدة لا تتركها أبداً (مثل ركعتي الضحى أو دعاء صادق عند النوم).\n- تذكر أن العبرة بجودة اللحظة وحضور القلب، لا بكثرة الأرقام وأنت مشتت.`,
        actionSteps: [
          'اختيار عادة روحية واحدة خفيفة والالتزام بها أسبوعاً كاملاً',
          'تدوين مخاوفك على ورقة لتفريغ الشحنات السلبية واستعادة الهدوء'
        ],
        reflectionQuestion: 'ما هي اللحظة أو العبادة التي تجد فيها نفسك أقرب ما تكون للصدق والطمأنينة؟'
      });
    }

    const sessionId = userProfile?.email || userName || 'default';
    const spiritualFallback = pickNonRepeatingFallbackReply('spiritual', stationTurnCount, sessionId, userProfile, userName, historyTexts || []);
    return formatAgentOutput({
      reasoning: `استكشاف روحي محايد ومتدرج (المحرك المحلي الاحتياطي - جولة ${stationTurnCount + 1}، رد #${spiritualFallback.index + 1}) دون تكرار حرفي.`,
      summary: `استكشاف واقع السكينة والحضور القلبي مع المستفيد بأسلوب محايد ومتدرج.`,
      advice: `خصص بضع دقائق هادئة يومياً بعيداً عن المشتتات لاستعادة صفاء الذهن.`,
      reply: spiritualFallback.reply,
      actionSteps: [
        'تخصيص 5 دقائق هدوء وتنفس بعيداً عن الهاتف',
        'تحديد وقت يومي ثابت لاستراحة ذهنية قصيرة'
      ],
      station_completed: false,
      reflectionQuestion: ''
    });
  }

  // 2. Domain: Financial (أ. كمال المالي) - تكييف كامل حسب سياق وخلفية المستفيد
  if (agentKey === 'financial') {
    if (isGreeting) {
      let welcomeIntro = '';
      let welcomeAdvice = '';
      let welcomeQuestion = '';
      let welcomeSteps = ['تدوين المصروفات اليومية لمدة أسبوع لرصد مواضع الهدر'];

      if (isStudent) {
        welcomeIntro = `مرحباً بك يا ${userName}! أنا ${advName} المستشار المالي لمنصة وزان.\n\nبما أنك في المرحلة الجامعية وتعتمد على ${incomeSrc}، يسعدني أن نضع معاً خطة ميسرة لضبط ميزانيتك ومكافأتك وتأسيس أول صمام أمان مالي دون تعقيد أو تضييق. كيف تصف إدارة مكافأتك ومصروفك الجامعي شهرياً؟`;
        welcomeAdvice = `اقتطاع مبلغ رمزي (50 إلى 100 ريال شهرياً) من المكافأة في حصالة أو حساب ادخار فرعي كصمام أمان جامعي.`;
        welcomeQuestion = `هل تكفيك مكافأتك ومصروفك حتى نهاية الشهر الأكاديمي، وما البند الذي يستنزفها أكثر؟`;
        welcomeSteps = [
          'فتح حساب ادخار فرعي مخصص للطوارئ الجامعية وتسميته صمام الأمان',
          'رصد نفقات المقاهي والمستلزمات الدراسية أسبوعياً لتحديد التسرب'
        ];
      } else if (isBusiness || isVariableIncome) {
        welcomeIntro = `مرحباً بك يا ${userName}! أنا ${advName} المستشار المالي لمنصة وزان.\n\nكصاحب عمل حر أو بدخل ${incomeStab || 'متغير'}${hasDep ? ' ومع وجود معالين وأسرة ترعاها' : ''}، هدفنا حماية استقرارك الشخصي وفصل أموال العمل وتأمين صمام أمان للمواسم الهادئة. كيف تدير التدفق النقدي وتقلبات الدخل حالياً؟`;
        welcomeAdvice = `الفصل الصارم بين حساب العمل والحساب الشخصي وتحديد راتب شهري ثابت لنفسك.`;
        welcomeQuestion = `كيف تتعامل مع تقلبات الدخل بين أشهر الوفرة والركود، وهل تفصل حسابك الشخصي عن العمل؟`;
        welcomeSteps = [
          'فصل الحساب البنكي التجاري عن الحساب الشخصي تماماً',
          'بناء احتياطي طوارئ يغطي 3-6 أشهر نفقات لتعويض تقلب الدخل'
        ];
      } else if (isJobSeeker) {
        welcomeIntro = `مرحباً بك يا ${userName}! أنا ${advName} المستشار المالي لمنصة وزان.\n\nوأنت في مرحلة البحث عن عمل${hasDep ? ' مع التزامات أسرتك' : ''}، هدفنا حماية مدخراتك وتمديد فترة أمانك المالي بأريحية دون قلق أو ديون. كيف تدير مصاريفك الأساسية حالياً؟`;
        welcomeAdvice = `حصر المصاريف الضرورية وتأجيل النفقات غير الأساسية لتمديد فترة الأمان المالي.`;
        welcomeQuestion = `كم شهراً يكفيك احتياطك المالي الحالي مع المصاريف الأساسية؟`;
        welcomeSteps = [
          'تحديد حد الكفاية الشهري الأدنى للمصروفات الضرورية',
          'تجنب أي التزامات أو أقساط استهلاكية جديدة أثناء البحث عن عمل'
        ];
      } else {
        welcomeIntro = `مرحباً بك يا ${userName}! أنا ${advName} المستشار المالي لمنصة وزان.\n\nبصفتك موظفاً بدخل ${incomeStab || 'شهري ثابت'}${hasDep ? ' ولديك معالون وأسرة ترعاها' : ' وبدون معالين حالياً'}، لا نفترض مسبقاً وجود فائض أو خلو السجل من الديون؛ لذا نبدأ دائماً بفحص التزاماتك الفعلية أولاً قبل اقتراح أتمتة الادخار أو الاستثمار. هل توجد عليك حالياً أي ديون أو أقساط تمويلية أو التزامات شهرية تقتطع من راتبك؟`;
        welcomeAdvice = `التحقق أولاً من الأقساط والالتزامات الشهرية الثابتة قبل تخطيط أتمتة الادخار أو الاستثمار.`;
        welcomeQuestion = hasDep
          ? `قبل التخطيط للادخار: هل تقتطع أي أقساط أو ديون جزءاً من راتبك بجانب نفقات الأسرة والمعالين، وكيف تصف تدفقك النقدي؟`
          : `قبل التخطيط لأتمتة الادخار: هل توجد عليك حالياً أي ديون أو أقساط شهرية تقتطع من راتبك، وما حجم السيولة المتبقية فعلياً بعد الالتزامات؟`;
        welcomeSteps = [
          'حصر الأقساط والديون والالتزامات الشهرية الثابتة ونسبتها من الراتب',
          'تحديد صافي الفائض أو العجز الشهري الفعلي قبل اتخاذ قرارات الادخار'
        ];
      }

      return formatAgentOutput({
        reasoning: `تحليل مالي استباقي متكيف مع سياق المستفيد (${status}): توجيه المستفيد لبناء صمام الأمان وإدارة ميزانيته الواقعية دون تشتيت أو افتراضات غير واقعية.`,
        summary: `الترحيب المالي واستعراض ركائز الوعي المالي الحكيم المتوافق مع سياق المستفيد.`,
        advice: welcomeAdvice,
        reply: welcomeIntro,
        actionSteps: welcomeSteps,
        reflectionQuestion: welcomeQuestion
      });
    }

    const studentIncomeTerm = incomeSrc?.includes('مكافأة')
      ? 'مكافأتك'
      : (incomeSrc?.includes('مصروف') ? 'مصروفك' : 'دخلك الحالي');

    // رصد اختيار المستفيد مواصلة الحوار المالي والتعمق
    const isFinContinueIntent = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(msg) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(msg);
    if (isFinContinueIntent) {
      const interimScore = currentSessionUnifiedScore;
      const userMentionsRestaurants = /(مطاعم|مطعم|كافيهات|مقاهي|اكل برا|أكل برا|طلبات|هنقرستيشن|جاهز)/i.test(msg);

      const finContinueReply = userMentionsRestaurants
        ? `أحييك على هذه الرغبة في التعمق والوضوح يا ${userName}! 💎\n\nيسعدني أن نواصل الحوار معاً للوصول إلى أدق تشخيص لواقعك المالي.\n\nبما أنك أشرت إلى مصاريف المطاعم والمقاهي: هل لاحظت في أي أيام الأسبوع أو الظروف يزداد هذا الإنفاق؟`
        : (isStudent
          ? `أحييك على هذه الرغبة في التعمق والوضوح يا ${userName}! 💎\n\nيسعدني أن نواصل الحوار معاً للوصول إلى أدق تشخيص لواقعك المالي كطالب جامعي.\n\nبما أنك ذكرت أن ${studentIncomeTerm} يفي باحتياجاتك الأساسية لكنه قليل ولا تدخر منه لكونك لا تعمل: ما هو البند أو المستلزم الذي تشعر أنه يقتطع الحصة الأكبر منه كل شهر؟`
          : `أحييك على هذه الرغبة في التعمق والوضوح يا ${userName}! 💎\n\nيسعدني أن نواصل الحوار معاً لتشخيص واقعك المالي بدقة: ما هو البند المالي الذي يشكل التحدي الأكبر في ميزانيتك الشهرية وتتمنى ضبطه؟`);

      return formatAgentOutput({
        reasoning: `المستفيد (${userName}) اختار صراحة مواصلة الحوار المالي وتعميق التشخيص ("${message}"). نرحب برغبته ونستكشف تفاصيل إضافية حول عادات الإنفاق والميزانية دون افتراضات غير واقعية.`,
        summary: `مواصلة الحوار المالي التشخيصي وتعميق استكشاف عادات الإنفاق.`,
        advice: `الوضوح المالي الدقيق يمنحك راحة بال وتحكماً كاملاً في ميزانيتك دون مفاجآت.`,
        reply: finContinueReply,
        actionSteps: isStudent
          ? [
            `حصر أوجه إنفاق ${studentIncomeTerm} لمدة أسبوع لتحديد موضع التسرب`,
            'تحديد بند واحد غير أساسي يمكن تقليصه'
          ]
          : [
            'تدوين النفقات اليومية لمدة أسبوع لتحديد النمط المتكرر',
            'وضع حد أقصى للإنفاق الترفيهي'
          ],
        score: interimScore,
        station_completed: false,
        reflectionQuestion: isStudent
          ? `ما هو الشيء الذي تتمنى لو وفرت مبلغه في نهاية كل شهر؟`
          : `ما الظرف أو الوقت الذي تشعر فيه أن ضبط المصاريف يكون أكثر صعوبة عليك؟`
      });
    }

    const finEfStatus = extractEmergencyFundStatus([...(historyTexts || []), message]);
    const callerFinScore = score > 0 ? (score > 10 ? score / 10 : score) : 0;

    // رصد طلب الاعتماد الصريح وإغلاق المحطة فوراً
    const isFinancialAdoption = !isFinContinueIntent && /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|نكتفي|كافي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    const isAdoptionIntent = isFinancialAdoption;
    if (isAdoptionIntent) {
      const finalScore = currentSessionUnifiedScore;
      const fullFinContext = `${(historyTexts || []).join(' ')} ${message}`;
      const hasExplicitNoDebt = /(?:بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:علي[ّ]?\s*|لدي\s*)?(?:أي\s*)?(?:ديون|أقساط)|ليس(?:ت)?\s*(?:لدي|عندي|علي[ّ]?)\s*(?:أي\s*)?(?:ديون|أقساط)|ما\s*(?:عندي|علي[ّ]?)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون|خلو\s*سجلي\s*من\s*الديون)/i.test(fullFinContext);
      const hasUserMentionedDebt = !hasExplicitNoDebt && /(قرض|قروض|دين|ديون|أقساط|اقساط|بطاقة|فيزا|التزامات)/i.test(fullFinContext);
      const goldenFinAdvice = synthesizeGoldenRecommendation({
        areaId: 'financial',
        userTexts: [...(historyTexts || []), message],
        userProfile,
        score: finalScore,
      });
      const debtAdoptionPhrase = hasUserMentionedDebt
        ? 'وحصر التزاماتك والأقساط الشهرية لمعالجتها بواقعية'
        : (isStudent && hasExplicitNoDebt
          ? 'وخلو سجلك من الديون'
          : (finEfStatus.hasFund
            ? 'ومتانة رصيدك الحالي وتوجهك للنمو المالي'
            : (hasExplicitNoDebt ? 'وخلو سجلك من الديون وتنظيم ميزانيتك' : 'وضبط تدفقك النقدي ومراجعة التزاماتك الشهرية')));
      return formatAgentOutput({
        reasoning: `المستفيد (${userName}) يطلب صراحة اعتماد التقييم المالي وإنهاء المحطة للانتقال للتالية. تم اعتماد الدرجة المستحقة (${finalScore.toFixed(1)}/10) وتثبيت توصية مخصصة لحواره دون طرح أي سؤال.`,
        summary: finalScore >= 7.5 || finEfStatus.hasFund
          ? `اعتماد تشخيص المحطة المالية والتركيز على فرص النمو المالي وتنمية الفائض.`
          : hasUserMentionedDebt
            ? `اعتماد تشخيص المحطة المالية بأولوية إدارة الديون والأقساط وضبط التدفق النقدي.`
            : `اعتماد تشخيص المحطة المالية وتحديد خطوة عملية متدرجة لحماية التدفق النقدي.`,
        advice: goldenFinAdvice,
        reply: `تم اعتماد تقييمك المالي بنجاح يا ${userName}! 💎\n\nأثبتّ وعياً كبيراً بصراحتك حول إدارة نفقاتك ${debtAdoptionPhrase}. خطتك العملية للمرحلة القادمة: ${goldenFinAdvice}\n\nأنت جاهز الآن تماماً للانتقال إلى المحطة التالية.`,
        actionSteps: finalScore >= 7.5 || finEfStatus.hasFund
          ? [
            goldenFinAdvice,
            'تحديد نسبة ثابتة من الفائض الشهري لأهداف النمو والاستثمار طويل المدى'
          ]
          : isStudent
            ? [
              `اقتطاع 30 إلى 50 ريالاً شهرياً في حصالة أو حساب ادخار فرعي فور استلام ${studentIncomeTerm}`,
              `تحديد سقف أسبوعي للمصاريف الشخصية والكمالية لحماية ميزانيتك`
            ]
            : hasUserMentionedDebt
              ? [
                'إعداد جدول واضح لحصر الأقساط والديون الشهرية وترتيب أولويات السداد',
                'حماية صمام أمان نقدي مصغر يمنع الاستدانة عند أي طارئ'
              ]
              : [
                'جرد الالتزامات الشهرية ومراقبة المصروفات اليومية لمدة أسبوع لتحديد الفائض الفعلي',
                'تخصيص المبلغ المناسب لصمام الأمان في حساب منفصل وفق واقع الدخل'
              ],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    // رصد الموافقة على الخطوة الميكروية المقترحة (مثل: حسناً سأجرب ادخار 30 ريال، سوف أحاول)
    const isNegativeSaving = /(لا|ما|لن)\s*(ادخر|أدخر|اوفر|أوفر)/i.test(msg);
    const isFinancialCommitment =
      !isFinContinueIntent &&
      !isFinancialAdoption &&
      !isNegativeSaving &&
      callerFinScore < 7.5 &&
      !finEfStatus.hasFund &&
      /(سأجرب|ساجرب|سوف اجرب|سوف احاول|ساحاول|سأحاول|سأوفر|ساوفر|سأدخر|سادخر|وفر|أوفر|ادخر|أدخر|حصالة|50|100|30)/i.test(msg);
    if (isFinancialCommitment) {
      const interimScore = currentSessionUnifiedScore;
      const commitmentGolden = synthesizeGoldenRecommendation({
        areaId: 'financial',
        userTexts: [...(historyTexts || []), message],
        userProfile,
        score: interimScore,
      });
      if (stationTurnCount < 2) {
        // قبل الرسالة الثالثة: نؤكد على خطوة صمام الأمان المالي ونستمر في الحوار بسؤال تشخيصي ذكي دون إنهاء مبكر
        return formatAgentOutput({
          reasoning: `المستفيد وافق على تجربة الخطوة المالية الميكروية ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد عليها ونستكمل التشخيص المالي بسؤال متدرج دون إنهاء مبكر.`,
          summary: `تأكيد خطوة صمام الأمان المالي ومواصلة استكشاف إدارة الميزانية.`,
          advice: `البدء باقتطاع رمزي صغير فور استلام ${studentIncomeTerm} لكسر حاجز البداية.`,
          reply: `خطوة ممتازة وموفقة يا ${userName}! 💎\n\nاقتطاع مبلغ رمزي كصمام أمان فور استلام ${studentIncomeTerm} يضعك على الطريق الصحيح دون حرمان أو تعقيد.\n\nولكن لنستكمل ضبط تفاصيل خطتك: ما هي الطريقة الأنسب لك لحماية هذا المبلغ من الصرف العفوي حتى نهاية الشهر؟ وهل تفضل عزله في حساب بنكي فرعي، أم حصالة مستقلة، أم وسيلة أخرى؟`,
          actionSteps: [
            `اقتطاع 30 إلى 50 ريالاً في حساب فرعي أو حصالة فور استلام ${studentIncomeTerm}`,
            'تحديد بند إنفاق غير أساسي يمكن تقليصه'
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'كيف تخطط لحماية صمام الأمان من الصرف العفوي؟'
        });
      } else {
        // ابتداءً من الجولة الرابعة (stationTurnCount >= 3): عرض التقييم وخيار الاعتماد بدون افتراض خلو الديون
        const fullContextText = `${(historyTexts || []).join(' ')} ${msg}`;
        const confirmedNoDebt = /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(fullContextText);
        return formatAgentOutput({
          reasoning: `المستفيد وافق على تجربة الخطوة المالية الميكروية في الجولة (${stationTurnCount + 1}). بعد 4 جولات، نقدم تقييماً مرحلياً معتدلاً وخيار الاعتماد.`,
          summary: `الاتفاق على خطوة عملية مبدئية لضبط التدفق النقدي وبناء الأمان المالي.`,
          advice: commitmentGolden,
          reply: `خطوة ممتازة وموفقة يا ${userName}! 💎\n\nالتزامك بخطوة عملية واضحة ومتابعة نفقاتك يضعك على الطريق الصحيح دون تعقيد.\n\nبعد ما شاركتني به عبر حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10)${isStudent && confirmedNoDebt ? ' مع الحفاظ على ميزة خلو سجلك من الديون وتأسيس أول خط دفاع مالي' : ' بناءً على واقع تدفقك النقدي والتزاماتك الحالية ورغبتك في التحسين'}.\n\nهل ترغب في اعتماد هذا التقييم وإنهاء الاستشارة والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`,
          actionSteps: [
            `اقتطاع 30 إلى 50 ريالاً في حصالة أو حساب فرعي فور استلام ${studentIncomeTerm} القادم`,
            `استبدال بند إنفاق غير ضروري واحد أسبوعياً ببديل اقتصادي`
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }

    // رصد توضيح المستفيد لعدم امتلاكه أماناً مالياً أو تأكيده على ما سبق
    if (/(ليس لدي|ما عندي|ما املك|لا املك|قلت لك|ذكرت لك|سبق وقلت|ما عندي امان|لا يوجد امان|لا املك امان)/i.test(msg)) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد يؤكد عدم امتلاكه لصمام أمان حالياً في الجولة (${stationTurnCount + 1}). احتواء وتعميق الاستكشاف بسؤال متدرج دون إنهاء مبكر.`,
          summary: `استيعاب واقع عدم وجود صمام أمان ومواصلة تشخيص أوجه الميزانية.`,
          advice: `التركيز على بناء صمام أمان رمزي ولو بـ 30 إلى 50 ريالاً شهرياً لحمايتك من عجز نهاية الشهر.`,
          reply: `أسمعك بوضوح تام وأقدّر صراحتك يا ${userName}. عدم امتلاك صمام أمان حالياً أمر مفهوم جداً في هذه المرحلة، والهدف من وجودنا معاً هو تدارك هذا العجز بخطوات ميسرة دون الوقوع في أي ديون.\n\nإذا فكرنا في وتيرة إنفاقك المعتادة: ما هو البند الذي تلاحظ أنه يستهلك الجزء الأكبر من ${studentIncomeTerm} وتتمنى ضبطه بأقل جهد؟`,
          actionSteps: [
            `تخصيص 30 إلى 50 ريالاً فقط من ${studentIncomeTerm} القادم كبداية لصمام الأمان`,
            'حصر المصاريف الشخصية للأيام السبعة القادمة لرصد الأولويات'
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: `ما هو البند الذي يستهلك الجزء الأكبر من ${studentIncomeTerm}؟`
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد يؤكد عدم امتلاكه لصمام أمان حالياً وأنه ذكر ذلك سابقاً في الجولة (${stationTurnCount + 1}). عرض التقييم المرحلي وخيار الاعتماد.`,
          summary: `تأكيد واقع عدم وجود صمام أمان والحاجة لترتيب الأولويات النقدية، وعرض التقييم المرحلي.`,
          advice: `التركيز على مراجعة الالتزامات وبناء صمام أمان تدريجي ميسر يحمي استقرارك الشهري.`,
          reply: `أسمعك بوضوح تام وأقدّر صراحتك يا ${userName}. عدم امتلاك صمام أمان حالياً أمر مفهوم جداً في هذه المرحلة، والهدف من وجودنا معاً هو تدارك هذا الوضع بخطوات ميسرة دون الوقوع في ضغط أو ديون إضافية.\n\nبناءً على واقعك الصريح عبر حوارنا، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم وإنهاء الاستشارة والانتقال للمحطة التالية، أم تفضل استكشاف تفصيل آخر؟`,
          actionSteps: [
            `تخصيص 30 إلى 50 ريالاً فقط من ${studentIncomeTerm} القادم كبداية لصمام الأمان`,
            'حصر المصاريف الشخصية للأيام السبعة القادمة لرصد الأولويات'
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }

    if (isRequestingAdvisorSuggestions(message)) {
      const balancedFinScore = currentSessionUnifiedScore;
      const concreteFin = generateConcreteDomainSuggestions(
        'financial',
        [...(historyTexts || []), message],
        userProfile,
        balancedFinScore
      );
      const formattedFinList = concreteFin.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      const sugReply =
        stationTurnCount >= 3
          ? `إليك 3 اقتراحات مالية عملية تناسب واقعك:\n\n${formattedFinList}\n\nبناءً على حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${balancedFinScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والبدء بإحدى هذه الخطوات، أم تفضل تعديلها؟`
          : `إليك 3 اقتراحات مالية عملية تناسب واقعك:\n\n${formattedFinList}\n\nأيّ من هذه الخطوات تشعر أنها الأنسب لتجربتها أولاً؟`;

      return formatAgentOutput({
        reasoning: `تلبية طلب الاقتراحات المباشر في الجانب المالي ("${message}") عبر 3 خطوات عملية مبنية على الحوار.`,
        summary: `تقديم 3 اقتراحات مالية عملية مخصصة لوضع المستفيد.`,
        advice: synthesizeGoldenRecommendation({
          areaId: 'financial',
          userTexts: [...(historyTexts || []), message],
          userProfile,
          score: balancedFinScore,
        }),
        reply: sugReply,
        actionSteps: concreteFin,
        score: balancedFinScore,
        station_completed: false,
        reflectionQuestion:
          stationTurnCount >= 3
            ? 'هل ترغب في اعتماد التقييم الحالي أم تعديل أحد الاقتراحات؟'
            : 'أيّ من هذه الخطوات الثلاث تشعر أنها الأنسب للبدء بها؟',
      });
    }

    if (msg.includes('وضح') || msg.includes('توضح') || msg.includes('لا ادري') || msg.includes('لا أدري') || msg.includes('كيف')) {
      const debtClarifiedAlready = hasDebtStatusAnswered(historyTexts || [], message);
      const clarifyPool = getDomainContextConfig('financial', parsedCtx).exploratoryQuestions;
      const nextClarifyQ = pickNextUnaskedQuestion(clarifyPool, [...(historyTexts || []), message], stationTurnCount).question;
      return formatAgentOutput({
        reasoning: `تحليل سيكولوجيا المال: المستفيد يحتاج توضيحاً عملياً. التحليل يفكك الواقع المالي إلى حصر الالتزامات والأقساط أولاً، الفصل بين الرغبة والاحتياج، ثم بناء صمام الأمان وتوجيه الفائض المتبقي للادخار.`,
        summary: `توضيح استراتيجية المال الحكيم: حصر الديون والالتزامات أولاً، فصل الاحتياج عن الرغبة، ثم بناء صمام الأمان.`,
        advice: callerFinScore >= 7.5 || finEfStatus.hasFund
          ? synthesizeGoldenRecommendation({
              areaId: 'financial',
              userTexts: [...(historyTexts || []), message],
              userProfile,
              score: callerFinScore >= 7.5 ? callerFinScore : 7.5,
            })
          : `ابدأ بحصر أقساطك والتزاماتك الشهرية أولاً لمعرفة الفائض الحقيقي قبل أي خطة ادخار.`,
        reply: `يسعدني جداً أن أفسر لك الفكرة ببساطة وعمق يا ${userName}.\n\nالمال ليس مجرد لغة حسابية جافة، بل قرارات متزنة تبدأ بالواقع لا بالتخمين. التوضيح العملي الذي أقصده يتلخص في ثلاث خطوات متتابعة:\n\n1. **حصر الالتزامات والأقساط أولاً**: التأكد من قيمة أي ديون أو أقساط شهرية ثابتة تقتطع من الدخل لمعرفة التدفق النقدي المتاح فعلياً.\n2. **فصل الاحتياج عن الرغبة**: الاحتياج هو ما لا تستقيم حياتك بدونه (مسكن، طعام، فواتير والتزامات). أما الرغبة فهي ما يمكن تأجيله لحماية السيولة.\n3. **صمام الأمان وتوجيه الفائض**: بعد ترتيب الالتزامات وضبط الصرف، نخصص صمام أمان مصغراً أو ممتداً ثم نوجّه ما يتوفر فعلياً للادخار التلقائي دون إثقال ميزانيتك.`,
        actionSteps: [
          'جرد الأقساط والالتزامات الشهرية الثابتة ونسبتها من الدخل الصافي',
          'تحديد صافي الفائض المتاح فعلياً قبل اقتطاع أي نسبة ادخار تلقائي'
        ],
        reflectionQuestion: debtClarifiedAlready
          ? (nextClarifyQ || 'ما فرصة النمو المالي أو تنظيم الفائض التي تراها أنسب لمرحلتك القادمة؟')
          : 'هل تقتطع أي أقساط أو التزامات دورية جزءاً من دخلك حالياً، أم يخلو سجلك منها؟'
      });
    }

    // التحقق من استثناء قالب الديون والبطاقات:
    // يُمنع تماماً تشغيل قالب الديون إذا كان المستفيد طالباً (إلا إذا ذكر صراحة قروضاً بنكية أو بطاقات ائتمانية فعلية)،
    // أو إذا ذُكرت عبارة "بدون ديون" أو "التزامات دراسية/جامعية"
    const hasDebtNegationOrStudyObligations =
      isStudent ||
      /(بدون\s*ديون|لا\s*(?:يوجد\s*)?ديون|ليس\s*(?:لدي|عندي)\s*ديون|ما\s*عندي\s*ديون|خالي\s*من\s*الديون|خلو\s*سجلي\s*من\s*الديون|التزامات\s*(?:دراسية|جامعية)|التزام\s*دراسي|التزامات\s*الدراسة|مصاريف\s*الدراسة)/i.test(msg);

    const hasActualDebtIntent = !hasDebtNegationOrStudyObligations && (
      /(قرض|قروض|بطاقة\s*ائتمانية|بطاقات\s*ائتمانية|فيزا|ماستركارد|سداد\s*ديون|تراكم\s*الديون|أقساط|اقساط)/i.test(msg) ||
      (/(ديون|دين)/i.test(msg) && !/(بدون|لا|ليس|ما\s*عندي|خالي|خلو|صفر)/i.test(msg)) ||
      (!isStudent && !msg.includes('دراس') && /(التزامات\s*مالية|سداد\s*التزام|أقساط\s*التزامات)/i.test(msg))
    );

    if (hasActualDebtIntent) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `إدارة الالتزامات المالية: التعامل مع الديون والأقساط يتطلب خطة منهجية باردة تبدأ بحصر الالتزامات وترتيب الأولويات بدلاً من افتراض مرونة نقدية كاملة.`,
          summary: `إعطاء الأولوية لإدارة الأقساط والديون وضبط التدفق النقدي بدلاً من الاستهلاك أو الاستثمار المتسرع.`,
          advice: `حصر الأقساط والديون وسداد الأكثر تكلفة أو الأصغر أولاً (طريقة كرة الثلج) مع تأمين صمام أمان مصغر.`,
          reply: `التعامل مع الالتزامات والأقساط يا ${userName} يتطلب خطة منهجية باردة وهادئة تسبق أي تفكير في أتمتة الادخار أو بناء الأصول:\n1. حصر المبالغ الإجمالية والأقساط الشهرية ونسبتها من راتبك.\n2. ترتيب خطة السداد (سداد أصغر دين أولاً لمنح دفعة معنوية، أو الأعلى كلفة).\n3. تأمين صمام أمان نقدي مصغر لحمايتك من الاستدانة مجدداً عند أي طارئ.\nكل التزام يمكن تفكيكه إذا وضعنا له مساراً واقعياً محكماً.`,
          actionSteps: [
            'إعداد جدول بسيط لحصر الأقساط والديون الشهرية ونسبتها من الدخل',
            'تجميد أي تسهيلات ائتمانية إضافية والاعتماد على ميزانية نقدية محددة'
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'ما هو القسط أو الالتزام الذي تشعر أنه يضغط على راتبك أكثر وتتمنى الانتهاء منه أولاً؟'
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد أشار إلى وجود التزامات وأقساط في الجولة (${stationTurnCount + 1}). تطبيق قاعدة الجولة الرابعة وتقديم تقييم مرحلي وخيار الاعتماد مع التركيز على خطة سداد الديون.`,
          summary: `تشخيص واقع الأقساط والديون وتحديد خطة سداد هادئة مع عرض التقييم المرحلي.`,
          advice: `حصر الديون من الأصغر للأكبر وسداد أصغر التزام أولاً لتحقيق انتصار نفسي وتخفيف عبء الميزانية.`,
          reply: `أحييك على صراحتك وشجاعتك يا ${userName}. الاعتراف بواقع الأقساط والالتزامات هو الخطوة الحقيقية الأولى لبناء استقرارك المالي واستعادة حريتك.\n\nبعد ما شاركتني به حتى الآن، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10). هذا تقييم مبدئي مبني على وجود التزامات شهرية تتطلب خطة سداد واضحة قبل التوسع في الادخار.\n\nهل ترغب في اعتماد هذا التقييم وإنهاء الاستشارة والانتقال للمحطة التالية، أم تفضل مواصلة الحوار لضبط تفاصيل خطة السداد؟`,
          actionSteps: [
            'إعداد جدول بسيط لحصر الأقساط والديون الشهرية ونسبتها من الدخل',
            'تحديد بند إنفاق غير ضروري واحد لتوجيهه كدفعة إضافية معجلة لسداد أصغر قسط'
          ],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }

    const fallbackScore = currentSessionUnifiedScore;
    const coversNeeds = /(يفي|تكفي|يكفي|يغطي)/i.test(msg);
    const notSaving = /(لا ادخر|لا أدخر|ما اوفر|ما أوفر|ما ادخر|ما أدخر|صفر ادخار)/i.test(msg);
    const incomeIsSmall = /(قليل|بسيط|محدود|كونه قليل)/i.test(msg);
    const doesNotWork = /(لا اعمل|لا أعمل|ما اشتغل|ما أشتغل|طالب لا اعمل)/i.test(msg);
    const userMentionsRestaurants = /(مطاعم|مطعم|كافيهات|مقاهي|اكل برا|أكل برا|طلبات|هنقرستيشن|جاهز)/i.test(msg);
    const detectedExpenseCategory = extractExpenseCategoryFromAnswer(message);
    const debtStatusAlreadyClarified = hasDebtStatusAnswered(historyTexts || [], message);

    // اعتراف مباشر ببند إنفاق ذكره المستفيد (مثل: "ممكن الاكل في المطاعم") لكل من الموظف والطالب دون تحية مكررة أو إعادة سؤال
    if (detectedExpenseCategory) {
      const debtCheckQ =
        'وقبل أن نضع خطة لضبط هذا البند أو تحديد مبلغ للادخار: هل توجد عليك حالياً أي ديون أو أقساط شهرية ثابتة تقتطع من دخلك؟';
      const canAskDebtCheck =
        !isStudent &&
        !debtStatusAlreadyClarified &&
        !isQuestionAlreadyAsked(debtCheckQ, historyTexts || []);

      const finPool = getDomainContextConfig('financial', parsedCtx).exploratoryQuestions;
      const combinedFinHistory = [...(historyTexts || []), message];
      const nextUnaskedFin = pickNextUnaskedQuestion(finPool, combinedFinHistory, stationTurnCount);
      const nextFollowupQ = canAskDebtCheck
        ? debtCheckQ
        : stationTurnCount >= 2
          ? `أقيّم وضعك الحالي مبدئياً بدرجة (${fallbackScore.toFixed(1)}/10). هل ترغب في اعتماد هذا التقييم والبدء بخطة ضبط بند ${detectedExpenseCategory}، أم نواصل الحوار؟`
          : (nextUnaskedFin.question ||
            (finEfStatus.hasFund
              ? `ما السقف الأسبوعي المرن الذي تراه مناسباً لبند ${detectedExpenseCategory} لتوجيه الفائض نحو أهدافك المالية التالية؟`
              : `ما السقف الأسبوعي المرن الذي تراه مناسباً لبند ${detectedExpenseCategory} حتى لا يضغط على آخر الشهر؟`));

      const directAckReply = isStudent
        ? `وضحت الصورة${isEditedOrResent ? ' بعد تعديل إجابتك' : ''}؛ الإنفاق المتكرر على **${detectedExpenseCategory}** قد يلتهم جانباً كبيراً من ${studentIncomeTerm} دون ملاحظة.\n\nالخطوة العملية الأذكى هنا هي تخصيص سقف أسبوعي واضح لهذا البند وحماية مبلغ رمزي (30 إلى 50 ريالاً) فور استلام ${studentIncomeTerm}.\n\n${nextFollowupQ}`
        : `وضحت الصورة${isEditedOrResent ? ' بعد تعديل إجابتك' : ''}؛ تسرب جزء من السيولة نحو **${detectedExpenseCategory}** يعد من البنود القابلة للضبط السريع دون التأثير على احتياجاتك الأساسية.\n\n${nextFollowupQ}`;

      return formatAgentOutput({
        reasoning: `اعتراف مباشر بإجابة المستفيد ("${message}") وتصنيفها كبند إنفاق فعلي (${detectedExpenseCategory}) مع الانتقال للخطوة المنطقية التالية دون تكرار التحية أو السؤال السابق.`,
        summary: `رصد تسرب الإنفاق في ${detectedExpenseCategory} والانتقال للخطوة المالية التالية.`,
        advice: canAskDebtCheck
          ? `حصر أي أقساط أو ديون شهرية أولاً بالتوازي مع وضع سقف أسبوعي لبند ${detectedExpenseCategory}.`
          : `وضع سقف أسبوعي واضح لبند ${detectedExpenseCategory} وحماية الفائض في صمام الأمان.`,
        reply: directAckReply,
        actionSteps: [
          `تحديد سقف أسبوعي واضح لبند ${detectedExpenseCategory}`,
          canAskDebtCheck
            ? 'حصر الأقساط والالتزامات الشهرية الثابتة لمعرفة صافي التدفق النقدي'
            : 'توجيه الفارق الأسبوعي لحساب صمام الأمان',
        ],
        score: fallbackScore,
        station_completed: false,
        reflectionQuestion: nextFollowupQ,
      });
    }

    let studentReply = '';
    let studentActionSteps: string[] = [];
    let studentQuestion = '';

    if (coversNeeds && (notSaving || incomeIsSmall || doesNotWork)) {
      studentReply = `أسمعك بوعي وتقدير كبير لصراحتك وواقعيتك يا ${userName}.\n\nكون ${studentIncomeTerm} يفي باحتياجاتك ومستلزماتك الأساسية فهذه أرضية انطلاق مطمئنة ومهمة جداً في هذه المرحلة. وشعورك بعدم الرضا نتيجة عدم القدرة على الادخار لكون المبلغ محدوداً ولأنك طالب جامعي متفرغ لدراستك لا تعمل هو شعور مفهوم ويمر به الكثيرون.\n\nالسر يا صديقي ليس في ضخامة المبالغ، بل في غرس "عادة الادخار" النفسية؛ فاقتطاع مبلغ رمزي جداً (ولو 30 إلى 50 ريالاً فقط شهرياً) فور استلام ${studentIncomeTerm} في حصالة أو حساب فرعي يكسر حاجز الصفر ويمنحك أول صمام أمان جامعي دون أن يُشعرك بأي حرمان أو ضغط.`;
      studentActionSteps = [
        `تخصيص مبلغ رمزي ميسر (30 إلى 50 ريالاً فقط) كحصالة أمان فور استلام ${studentIncomeTerm} القادم`,
        `حصر المستلزمات الأساسية شهرياً للحفاظ على كفايتها دون هدر`
      ];
      studentQuestion = stationTurnCount >= 2
        ? `هل ترغب في اعتماد هذا التقييم وخطة البداية برمزية بسيطة (30-50 ريالاً) والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`
        : `ما رأيك في تجربة اقتطاع هذا المبلغ الرمزي البسيط (30-50 ريالاً) من ${studentIncomeTerm} القادم كأول حصالة أمان جامعي؟ هل تراه مناسباً لواقعك؟`;
    } else if (userMentionsRestaurants) {
      studentReply = `وضحت الصورة يا ${userName}.\n\nالواقع المالي في المرحلة الجامعية لا يتطلب تعقيداً بل خطوة بسيطة ومستدامة: اقتطاع مبلغ رمزي كصمام أمان أول، وترشيد مصاريف المطاعم لحماية ${studentIncomeTerm} حتى نهاية الشهر.`;
      studentActionSteps = [
        `تخصيص مبلغ رمزي (30 إلى 50 ريالاً) فور استلام ${studentIncomeTerm} القادم`,
        `تحديد سقف لمصاريف المطاعم والمقاهي لحماية ميزانيتك`
      ];
      studentQuestion = stationTurnCount >= 2
        ? `هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`
        : `ما الخطوة البسيطة التي ترى أنها ستساعدك في ضبط هذا البند حتى نهاية الشهر؟`;
    } else {
      const finSessionId = userProfile?.email || userName || 'default';
      const finFallback = pickNonRepeatingFallbackReply('financial', stationTurnCount, finSessionId, userProfile, userName, historyTexts || []);
      studentReply = stationTurnCount === 0 && !hasPriorHistory
        ? `في المرحلة الجامعية لا يتطلب الأمر تعقيداً، بل خطوة ميسرة تناسب واقعك كطالب لتأسيس أول صمام أمان جامعي من ${studentIncomeTerm}.\n\n${finFallback.reply}`
        : finFallback.reply;
      studentActionSteps = [
        `تخصيص مبلغ رمزي (30 إلى 50 ريالاً) فور استلام ${studentIncomeTerm} القادم كصمام أمان`,
        `تدوين المصاريف الشخصية أسبوعياً لرصد الأولويات`
      ];
      studentQuestion = stationTurnCount >= 3
        ? `هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`
        : '';
    }

    const finGeneralSessionId = userProfile?.email || userName || 'default';
    const nonStudentFallback = !isStudent
      ? pickNonRepeatingFallbackReply('financial', stationTurnCount, finGeneralSessionId, userProfile, userName, historyTexts || [])
      : null;

    return formatAgentOutput({
      reasoning: `تحليل مالي متكيف (${status}): فحص مدخلات المستفيد ("${message}") والتحقق من التزاماته وأقساطه وتدفقه النقدي الفعلي دون افتراض خلوه من الديون أو تكرار حرفي.`,
      summary: isStudent
        ? `التركيز على العادات المالية البسيطة المنتظمة كأقوى رافعة للأمان والاستقرار المالي.`
        : `التحقق من الالتزامات والأقساط الشهرية وفحص التدفق النقدي الفعلي قبل تخطيط الادخار.`,
      advice: isStudent
        ? `البدء باقتطاع رمزي بسيط (30-50 ريالاً) من ${studentIncomeTerm} في حصالة لكسر حاجز البداية.`
        : `ابدأ بحصر أي أقساط أو التزامات شهرية ثابتة لمعرفة صافي التدفق النقدي المتاح فعلياً قبل تخطيط الادخار.`,
      reply: isStudent
        ? studentReply
        : (nonStudentFallback?.reply || `لو نظرنا للأسبوع القادم، ما الخطوة المالية العملية الأهم لضبط تدفقك النقدي بين حصر الالتزامات أو وضع سقف لبند متكرر؟`),
      actionSteps: isStudent
        ? studentActionSteps
        : [
          'حصر جميع الأقساط والالتزامات الشهرية الثابتة ونسبتها من الراتب',
          'تحديد صافي الفائض أو العجز النقدي قبل اتخاذ أي التزام ادخاري'
        ],
      score: fallbackScore,
      station_completed: false,
      reflectionQuestion: isStudent ? studentQuestion : ''
    });
  }

  // 3. Domain: Health (د. ريان الصحي)
  if (agentKey === 'health') {
    const isHealthAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    if (isHealthAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تشخيص محطة ${stationTitle} (${finalScore.toFixed(1)}/10) للمستفيد (${userName}).`,
        summary: `اعتماد تقييم ${stationTitle} وتثبيت عادة النوم والنشاط البدني.`,
        advice: 'الحركة المنتظمة والنوم المتزن وشرب الماء هي ركائز الطاقة المستدامة.',
        reply: `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 🌿\n\nالاهتمام بجودة نومك ونشاطك البدني يضاعف طاقتك وصفاء ذهنك طوال اليوم. خطتك الصحية معتمدة، وأنت جاهز للانتقال إلى المحطة التالية.`,
        actionSteps: [
          'المشي السريع لمدة 20 دقيقة يومياً وتثبيت موعد النوم',
          'شرب كوب ماء بانتظام وتقليل الشاشات قبل النوم'
        ],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isGreeting) {
      return formatAgentOutput({
        reasoning: `تحليل بدني وحيوي: المستفيد يبدأ الحوار الصحي. الطاقة الجسدية هي الأساس لكل جوانب عجلة الحياة الأخرى، والخطوة الأولى هي فحص مثلث الصحة: جودة النوم، النشاط الحركي، والتغذية السليمة.`,
        summary: `استكشاف مثلث الطاقة الجسدية: النوم المتزن، الحركة اليومية، والغذاء المتوازن.`,
        advice: `المشي السريع لمدة 20 دقيقة يومياً في الهواء الطلق لتنشيط الدورة الدموية.`,
        reply: `أهلاً بك يا ${userName}! أنا ${advName} المستشار الصحي والبدني.\n\nصحتك وطاقتك الجسدية هي رأس مالك الحقيقي ووقود كل إنجازاتك. كيف تقيّم جودة نومك، نشاطك البدني، وغذائك في الآونة الأخيرة؟`,
        actionSteps: [
          'المشي السريع لمدة 20 دقيقة يومياً في الهواء الطلق',
          'شرب لترين من الماء وتثبيت موعد النوم والاستيقاظ'
        ],
        reflectionQuestion: 'ما هي العادة الصحية البسيطة التي لو التزمت بها ستشعر بفارق فوري في نشاطك اليومي؟'
      });
    }

    if (msg.includes('نوم') || msg.includes('تعب') || msg.includes('ارهاق') || msg.includes('كسل')) {
      return formatAgentOutput({
        reasoning: `تحليل استعادة الطاقة الحيوية: رصد أعراض الخمول وتذبذب النوم. التحليل يربط ذلك بالساعة البيولوجية والتعرض للضوء الأزرق ليلاً ونقص ضوء الشمس الصباحي. الحل يتطلب تعديلات بيئية بسيطة في روتين المساء.`,
        summary: `تفكيك أسباب الإرهاق وتحديد خطوات عملية لضبط الساعة البيولوجية وعمق النوم.`,
        advice: `التوقف عن استخدام الشاشات الذكية قبل النوم بـ 45 دقيقة وتهيئة غرفة مظلمة وباردة.`,
        reply: `الشعور بالخمول أو تذبذب النوم يا ${userName} هو إشارة واضحة من جسدك يطلب فيها إعادة الضبط.\nأهم رافعة للطاقة هي:\n1. التوقف عن استخدام الشاشات الزرقاء قبل النوم بـ 45 دقيقة.\n2. الخروج لرؤية ضوء الشمس الصباحي لمدة 10 دقائق لضبط ساعتك البيولوجية.\n3. تجنب الوجبات الدسمة المتأخرة والمنبهات بعد الساعة 4 عصراً.`,
        actionSteps: [
          'إبعاد الهاتف عن السرير عند موعد النوم الليلة',
          'شرب كوب ماء كبير فور الاستيقاظ لإنعاش الخلايا'
        ],
        reflectionQuestion: 'ما هو التغيير البسيط في روتين مسائك الذي سيساعدك على النوم أعمق؟'
      });
    }

    const sessionId = userProfile?.email || userName || 'default';
    const healthFallback = pickNonRepeatingFallbackReply('health', stationTurnCount, sessionId, userProfile, userName, historyTexts || []);
    return formatAgentOutput({
      reasoning: `استكشاف صحي متدرج (المحرك المحلي الاحتياطي - جولة ${stationTurnCount + 1}، رد #${healthFallback.index + 1}) دون تكرار حرفي.`,
      summary: `متابعة استكشاف العادات الصحية والطاقة البدنية اليومية بتدرج محايد.`,
      advice: `الحركة المنتظمة والنوم المتزن وشرب الماء هي ركائز الطاقة المستدامة.`,
      reply: healthFallback.reply,
      actionSteps: [
        'الوقوف والحركة لمدة 3 دقائق كل ساعة أثناء العمل أو الدراسة',
        'شرب كوب ماء بانتظام وتثبيت موعد النوم'
      ],
      station_completed: false,
      reflectionQuestion: ''
    });
  }

  // 3.1. Domain: Career (م. طارق المهني) - متكيف تماماً مع سياق الطالب والموظف
  if (agentKey === 'career') {
    const isCareerContinue = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|ودي\s*اطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر)/i.test(msg) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(msg);
    const isCareerCommitment = !isCareerContinue && /(جلسة|ساعة|نصف\s*ساعة|\d+\s*دقيقة|مذاكرة|بومودورو|عمل\s*عميق|تركيز|التزم|سأبدأ|سأجرب|سوف\s*اجرب|مشروع|مهارة)/i.test(msg);
    const isCareerAdoption = !isCareerContinue && /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);

    if (isGreeting) {
      const careerCfg = getDomainContextConfig('career', parsedCtx);
      return formatAgentOutput({
        reasoning: `تحليل مهني استباقي متكيف (${status}): توجيه المستفيد لبناء إنتاجيته وفق واقعه الفعلي.`,
        summary: `الترحيب واستكشاف بوصلة الإنتاجية والتطور في مسار (${status}).`,
        advice: isStudent
          ? 'تخصيص ساعة عمل عميق للمشاريع الأكاديمية وصقل المهارات بعيداً عن المشتتات.'
          : isJobSeeker
            ? 'تنظيم جدول يومي متوازن للتقديم على الفرص وتطوير المهارات المطلوبة.'
            : 'حجز أول 90 دقيقة من يوم العمل للمهمة الأكثر تأثيراً في المربع الثاني.',
        reply: `أهلاً بك يا ${userName}! أنا ${advName} مستشار التطور المهني والإنتاجية.\n\n${careerCfg.contextIntro}\n${careerCfg.openingQuestion}`,
        actionSteps: isStudent
          ? ['تحديد ساعة تركيز واحدة يومياً لإنجاز التكاليف الأكاديمية', 'حصر 3 مهارات مطلوبة في تخصصك للتركيز عليها']
          : isJobSeeker
            ? ['تحديث السيرة الذاتية وربطها بأهم المهارات المطلوبة', 'تحديد 3 فرص نوعية أسبوعياً للتقديم المدروس']
            : ['تحديد المهمة الإستراتيجية الأولى لكل يوم وإنجازها قبل البريد', 'وضع حدود صحية تحمي وقت الراحة من ضغوط العمل'],
        reflectionQuestion: careerCfg.exploratoryQuestions[0]
      });
    }

    if (isCareerAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تقييم محطة ${stationTitle} (${finalScore.toFixed(1)}/10) بناءً على رغبة المستفيد (${userName}).`,
        summary: `اعتماد تشخيص ${stationTitle} وتثبيت خطة الإنتاجية وحماية ساعات التركيز.`,
        advice: isStudent
          ? 'حماية ساعة العمل العميق يومياً لمشاريعك الجامعية وبناء ملف أعمالك.'
          : 'حجز وقت أسبوعي للتخطيط المهني الاستراتيجي في المربع الثاني.',
        reply: `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 🎯\n\nأظهرت وعياً ممتازاً برغبتك في رفع إنتاجيتك واستثمار وقتك بذكاء دون تسويف. خطتك واضحة وواقعية، وأنت جاهز الآن للانتقال إلى المحطة التالية.`,
        actionSteps: isStudent
          ? ['جلسة عمل عميق لمدة 45 دقيقة يومياً', 'توثيق المشاريع الأكاديمية المتميزة في ملف أعمالك']
          : ['جدولة ساعات التركيز الأسبوعية في مصفوفتك', 'مراجعة أولويات النمو الوظيفي كل خميس'],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isCareerCommitment) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد قدم التزاماً للتركيز والإنتاجية ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد عليها ونستكمل بسؤال متدرج دون إنهاء مبكر.`,
          summary: `تأكيد خطوة العمل العميق ومواصلة الاستكشاف المهني.`,
          advice: 'كسر التسويف يبدأ ببدء جلسة التركيز الأولى دون اشتراط الكمال.',
          reply: `رائع جداً ومبشر يا ${userName}! الالتزام بجلسة تركيز محددة هو الخطوة الأهم لكسر التسويف وإنجاز ما يهمك.\n\nولكن لنحمي هذه الجلسة من التشتت: ما هو أكبر عائق أو تطبيق في هاتفك تشعر أنه يقتحم تركيزك أثناء العمل؟ وكيف يمكنك تحييده مسبقاً؟`,
          actionSteps: ['بدء جلسة تركيز واحدة اليوم مدتها 25-45 دقيقة بدون شاشات جانبية'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'ما أكبر مشتت يقتحم تركيزك أثناء العمل وكيف تحيده؟'
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد قدم التزاماً عملياً واضحاً للتركيز والإنتاجية في الجولة (${stationTurnCount + 1}). بعد 4 جولات، نقدم تقييماً مرحلياً وخيار الاعتماد.`,
          summary: `الاتفاق على خطوة عمل عميق محددة لتعزيز الإنتاجية والتركيز.`,
          advice: 'كسر التسويف يبدأ ببدء جلسة التركيز الأولى دون اشتراط الكمال.',
          reply: `رائع جداً يا ${userName}! خطوة التركيز هذه هي الوقود الحقيقي للإنتاجية والنمو.\n\nبناءً على التزامك الواضح عبر حوارنا، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10) كخطوة انطلاق واعدة.\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار لاستكشاف زاوية أخرى؟`,
          actionSteps: ['بدء جلسة تركيز واحدة اليوم مدتها 25-45 دقيقة بدون شاشات جانبية'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }

    const anchoredCareer = buildComplaintAnchoredReply('career', message, historyTexts || []);
    if (anchoredCareer) {
      return formatAgentOutput({
        reasoning: `مواءمة مباشرة مع شكوى المستفيد الصريحة ("${message}") في ${stationTitle} دون القفز لمجال آخر غير مذكور.`,
        summary: anchoredCareer.summary,
        advice: anchoredCareer.advice,
        reply: `${anchoredCareer.reflection}\n\n${anchoredCareer.followUpQuestion}`,
        actionSteps: anchoredCareer.actionSteps,
        score: currentSessionUnifiedScore,
        station_completed: false,
        reflectionQuestion: ''
      });
    }

    const sessionId = userProfile?.email || userName || 'default';
    const careerFallback = pickNonRepeatingFallbackReply('career', stationTurnCount, sessionId, userProfile, userName, historyTexts || []);
    return formatAgentOutput({
      reasoning: `استكشاف مهني متدرج (المحرك المحلي الاحتياطي - جولة ${stationTurnCount + 1}، رد #${careerFallback.index + 1}) دون تكرار حرفي.`,
      summary: `توجيه المستفيد لاستكشاف أولوياته وحماية ساعات التركيز دون تكرار.`,
      advice: 'التركيز المنهجي في فترة قصيرة يومياً يتفوق على ساعات طويلة مشتتة.',
      reply: careerFallback.reply,
      actionSteps: ['تقسيم المهام الكبيرة إلى أجزاء صغيرة لا تتجاوز 30 دقيقة', 'إبعاد الإشعارات وقت العمل المركز'],
      score: currentSessionUnifiedScore,
      station_completed: false,
      reflectionQuestion: ''
    });
  }

  // 3.2. Domain: Personal (د. ليلى الذاتية)
  if (agentKey === 'personal') {
    const isPersonalAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    const isPersonalCommitment = /(عادة|أجرب|اجرب|سأجرب|سوف\s*احاول|سأحاول|تفريغ|كتابة|تدوين|انتصار|10\s*دقائق|15\s*دقيقة)/i.test(msg);
    const isPersonalAcuteIsolation = hasAcuteIsolationOrRejection([...(historyTexts || []), message]);
    const personalFairScore = currentSessionUnifiedScore;

    if (isPersonalAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تشخيص محطة ${stationTitle} (${finalScore.toFixed(1)}/10) للمستفيد (${userName}).`,
        summary: isPersonalAcuteIsolation
          ? `اعتماد تقييم ${stationTitle} بواقعية (${finalScore.toFixed(1)}/10) مع احترام حدود العزلة والتركيز على حماية الاتزان الفردي.`
          : `اعتماد تقييم ${stationTitle} وتثبيت عادة الرأفة بالذات والانتصار الصغير.`,
        advice: isPersonalAcuteIsolation
          ? 'حماية مساحتك الفردية الهادئة خطوة مشروعة، مع أهمية بناء مرساة نفسية تحميك من أثر التوتر والعزلة.'
          : 'الرفق بالذات والتركيز على العادات الصغيرة يبني ثقة داخلية راسخة.',
        reply: isPersonalAcuteIsolation
          ? `تم اعتماد تقييمك في ${stationTitle} بواقعية وموضوعية (${finalScore.toFixed(1)}/10) يا ${userName}. 🌸\n\nأحترم حدودك وصراحتك في حماية مساحتك الشخصية، وستركز خطتك في هذه المرحلة على تهدئة الضغط النفسي والحفاظ على توازنك الفردي دون إجبار أو لوم.`
          : `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 🌸\n\nوعيك بمشاعرك وصراحتك مع ذاتك هو أولى خطوات القوة والاتزان. خطتك ترتكز على إيقاف المقارنات وتحقيق انتصار يومي هادئ، وأنت جاهز تماماً للانتقال للمحطة التالية.`,
        actionSteps: isPersonalAcuteIsolation
          ? ['تخصيص وقت فردي هادئ يومياً لتفريغ التوتر وحماية سلامك النفسي', 'تدوين مشاعرك وحدودك بوضوح دون جلد للذات']
          : ['تدوين انتصار يومي صغير قبل النوم', 'التوقف عن جلد الذات واستبداله بالحوار الداخلي المشجع'],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isPersonalAcuteIsolation) {
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `رصد سلبية صريحة وعزلة حادة أو رفض للجلوس مع الآخرين في ${stationTitle} (${personalFairScore.toFixed(1)}/10). احترام حدود المستفيد دون افتراض تقصير أو إلزام بمخالطة.`,
          summary: `احترام حدود المستفيد وتقييم أثر العزلة والتوتر المحيط على توازنه الشخصي (${personalFairScore.toFixed(1)}/10).`,
          advice: 'الهدوء النفسي يبدأ باحترام حدودك وحماية مساحتك الفردية من استنزاف التوتر.',
          reply: `أقدر صراحتك التامة يا ${userName} 🌸، وأحترم حقك في حماية مساحتك والابتعاد عن الأجواء التي تسبب لك الأذى أو الاستنزاف.\n\nوجود هذا القدر من التوتر والانفصال المستمر يترك أثراً ثقيلاً على توازنك النفسي اليومي؛ كيف ينعكس هذا الوضع على راحتك الذهنية ومستوى طاقتك في بقية يومك؟`,
          actionSteps: ['الحفاظ على مساحة هادئة منفردة لاستعادة الاتزان الذهني دون شعور بالذنب'],
          score: personalFairScore,
          station_completed: false,
          reflectionQuestion: 'كيف ينعكس هذا الوضع على راحتك الذهنية ومستوى طاقتك في بقية يومك؟'
        });
      }
      return formatAgentOutput({
        reasoning: `استمرار العزلة الحادة أو سوء المعاملة في ${stationTitle} بالجولة (${stationTurnCount + 1}). منح درجة واقعية منخفضة (${personalFairScore.toFixed(1)}/10) دون تضخيم أو افتراض تقصير.`,
        summary: `تقييم واقعي لأثر العزلة الحادة والتوتر على الجانب الشخصي (${personalFairScore.toFixed(1)}/10).`,
        advice: 'ثبّت روتيناً فردياً هادئاً يحمي استقرارك الداخلي بعيداً عن مصادر الأذى والتوتر.',
        reply: `أفهم موقفك وأحترم حدودك يا ${userName} 🌸، فالصراحة مع النفس أفضل من المجاملة على حساب راحتك.\n\nومع وجود هذا الضغط والانقطاع المستمر عن المحيط، فإن الجانب الشخصي يتأثر بوضوح في هذه المرحلة؛ لذا أقيّم وضعك الحالي بموضوعية بدرجة (${personalFairScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل إضافة ما يساعدنا في دعم توازنك الفردي؟`,
        actionSteps: [
          'تخصيص وقت فردي منتظم للهدوء واستعادة الصفاء النفسي',
          'الاستعانة بتدوين المشاعر أو بمختص نفسي/أسري موثوق إذا استمر الضغط المحيط'
        ],
        score: personalFairScore,
        station_completed: false,
        reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل إضافة ما يساعدنا في دعم توازنك الفردي؟'
      });
    }

    if (isPersonalCommitment) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد ${personalFairScore >= 7.5 ? 'يُظهر استقراراً وصفاءً ذهنياً مع عادة يومية صحية' : 'أبدى استعداداً لتطبيق عادة التهدئة وتفريغ الضغوط'} ("${message}") في الجولة (${stationTurnCount + 1}). تأكيد الخطوة ومواصلة الحوار دون إنهاء مبكر.`,
          summary: personalFairScore >= 7.5
            ? `تعزيز الاستقرار النفسي والصفاء الذهني في ${stationTitle}.`
            : `تأكيد عادة التهدئة النفسية واستكمال التشخيص الذاتي.`,
          advice: personalFairScore >= 7.5
            ? synthesizeGoldenRecommendation({
                areaId: 'personal',
                userTexts: [...(historyTexts || []), message],
                userProfile,
                score: interimScore,
              })
            : 'الانتصار اليومي الصغير يكسر دائرة الإحباط ويصنع ثقة مستدامة.',
          reply: personalFairScore >= 7.5
            ? `ما أجمل هذا التوازن يا ${userName}! 🌸 تخصيصك وقتاً يومياً ثابتاً للراحة والبعد عن الشاشات ينعكس بوضوح على صفائك الذهني وحضورك مع أسرتك.\n\nانطلاقاً من هذا الاستقرار الطيب، كيف تخطط لحماية هذه المساحة الهادئة واستثمارها في هدف شخصي يثري مرحلتك القادمة؟`
            : `خطوة واعية ومباركة يا ${userName}! 🌸 الرفق بالذات والانتصارات الصغيرة اليومية هما جسر الاتزان النفسي الحقيقي.\n\nولكن لنستكشف هذا الجانب بعمق أكبر: في الأيام التي تشعر فيها بالثقل أو جلد الذات، ما هو النمط الذي يتكرر في تفكيرك؟ وكيف يمكنك تذكير نفسك بلطف أنك إنسان يتطور؟`,
          actionSteps: ['تخصيص 10 دقائق لتفريغ الذهن وتدوين المشاعر بصدق'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'ما النمط الذي يتكرر في تفكيرك عند الشعور بالضغط؟'
        });
      } else {
        const personalRound4Advice =
          personalFairScore >= 7.5
            ? synthesizeGoldenRecommendation({
                areaId: 'personal',
                userTexts: [...(historyTexts || []), message],
                userProfile,
                score: interimScore,
              })
            : 'الانتصار اليومي الصغير يكسر دائرة الإحباط ويصنع ثقة مستدامة.';
        return formatAgentOutput({
          reasoning: `المستفيد أبدى ${personalFairScore >= 7.5 ? 'استقراراً وصفاءً ذهنياً في' : 'استعداداً لتطبيق عادة التهدئة وتفريغ الضغوط في'} الجولة (${stationTurnCount + 1}). عرض التقييم المرحلي وخيار الاعتماد.`,
          summary: personalFairScore >= 7.5
            ? `تعزيز الاستقرار النفسي والصفاء الذهني مع عرض التقييم المرحلي.`
            : `الاتفاق على عادة نفسية صغرى لتفريغ الضغوط واستعادة الهدوء.`,
          advice: personalRound4Advice,
          reply: personalFairScore >= 7.5
            ? `استمرارك على هذا الاتزان وصفاء الذهن أمر مشجع للغاية يا ${userName}! 🌸\n\nبناءً على حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`
            : `خطوة واعية ومباركة يا ${userName}! الرفق بالذات هو جسر الاتزان النفسي الحقيقي.\n\nبناءً على هذا الوعي الطيب عبر حوارنا، أقيّم وضعك الحالي بدرجة (${interimScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`,
          actionSteps: personalFairScore >= 7.5 ? [personalRound4Advice] : ['تخصيص 10 دقائق لتفريغ الذهن وتدوين المشاعر بصدق'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }
  }

  // 3.3. Domain: Learning (بروفيسور زياد المعرفي)
  if (agentKey === 'learning') {
    const isLearningAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    const isLearningComplaint = /(لا\s*أقرأ|لا\s*اقرأ|ما\s*أقرأ|ما\s*اقرا|ما\s*عندي\s*وقت|لا\s*أجد\s*وقتا|لا\s*اجد\s*وقتا|تشتت|تسويف|صعوبة|مهمل|أهملت|اهملت)/i.test(msg);
    const isLearningCommitment = !isLearningComplaint && /(قراءة|كتاب|صفحات|دورة|بودكاست|تعلم|مهارة|15\s*دقيقة|20\s*دقيقة|سأقرأ|ساقرا)/i.test(msg) && !/(لا|ما|لن|بدون|غير)/i.test(msg);

    if (isLearningAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تشخيص محطة ${stationTitle} (${finalScore.toFixed(1)}/10) للمستفيد (${userName}).`,
        summary: `اعتماد تقييم ${stationTitle} وتثبيت عادة القراءة والتعلم التراكمي.`,
        advice: 'القراءة التراكمية المركزة لمدة 15 دقيقة يومياً تعادل قراءة أكثر من 15 كتاباً سنوياً.',
        reply: `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 📚\n\nشغفك بالتعلم ورغبتك في بناء عقليتك يمثل رافعة حقيقية لكل جوانب حياتك. خطتك في القراءة النوعية والتطبيق المعرفي معتمدة، وأنت مستعد للمحطة التالية.`,
        actionSteps: ['قراءة 10 إلى 15 صفحة يومياً من كتاب نوعي', 'تدوين فكرة واحدة قابلة للتطبيق من كل ما تتعلمه'],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isLearningCommitment) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة تعلم وقراءة منتظمة ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد عليها ونستكمل بسؤال متدرج دون إنهاء مبكر.`,
          summary: `تثبيت عادة القراءة والتعلم التراكمي ومواصلة الاستكشاف.`,
          advice: 'التعلم المستمر ليس عبئاً إضافياً، بل هو نافذة تمنحك بصيرة وحلولاً أذكى لتحدياتك.',
          reply: `خطوة واعية يا ${userName}! 📖 تخصيص وقت منتظم للتعلم يفتح آفاقاً جديدة لتطوير الذات.\n\nولكن لترسيخ هذا الأثر: كيف تضمن تحويل ما تقرأه أو تتعلمه إلى ممارسة عملية في يومك بدلاً من بقائه مجرد معلومات نظرية؟`,
          actionSteps: ['تخصيص 15 دقيقة ثابتة يومياً في المربع الثاني للقراءة أو الاستماع الهادف'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'كيف تحول ما تتعلمه إلى تطبيق عملي ملموس؟'
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة تعلم وقراءة منتظمة في الجولة (${stationTurnCount + 1}). تقديم التقييم المرحلي وخيار الاعتماد.`,
          summary: `تثبيت عادة القراءة النوعية اليومية كرافعة معرفية.`,
          advice: 'التعلم المستمر ليس عبئاً إضافياً، بل هو نافذة تمنحك بصيرة وحلولاً أذكى لتحدياتك.',
          reply: `خطوة واعية يا ${userName}! الاستثمار في وعيك هو أعلى استثمار عائداً.\n\nبناءً على التزامك عبر حوارنا، أقيّم وضعك المعرفي حالياً بدرجة (${interimScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل إضافة تفصيل معرفي آخر؟`,
          actionSteps: ['تخصيص 15 دقيقة ثابتة يومياً في المربع الثاني للقراءة أو الاستماع الهادف'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }
  }

  // 3.4. Domain: Family (د. مريم الأسرية)
  if (agentKey === 'family') {
    const isFamilyAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    const isFamilyCommitment = /(جلسة|حوار|بدون شاشات|أمي|امي|أبي|ابي|والدين|أسرة|اسرة|أهل|اهل|20\s*دقيقة|تواصل)/i.test(msg);

    if (isFamilyAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تشخيص محطة ${stationTitle} (${finalScore.toFixed(1)}/10) للمستفيد (${userName}).`,
        summary: `اعتماد تقييم ${stationTitle} وتثبيت عادة الحضور الواعي والدفء العائلي.`,
        advice: 'العائلة هي الملاذ الآمن: استثمر في جودة اللحظات المشتركة بعيداً عن صخب الشاشات.',
        reply: `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 🏡\n\nحرصك على بر والديك ودفء بيتك يمنحك سنداً وطمأنينة لا تقدر بثمن. خطتك في حماية الجلسات الأسرية دون شاشات معتمدة، وأنت جاهز للمحطة التالية.`,
        actionSteps: ['جلسة حوار عائلي هادئة أسبوعياً خالية من الهواتف', 'المبادرة اليوم بكلمة طيبة ودعاء للوالدين والأهل'],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isFamilyCommitment) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة حضور أسري وتواصل دافئ ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد عليها ونستكمل بسؤال متدرج دون إنهاء مبكر.`,
          summary: `تثبيت جلسة دفء أسري بدون شاشات ومواصلة الاستكشاف الأسري.`,
          advice: 'الحضور القلبي الكامل لمدة 15 دقيقة أعمق أثراً من ساعات طويلة وأنت منشغل بهاتفك.',
          reply: `ما أجمل هذه الخطوة يا ${userName}! 🏡 الدفء العائلي شاحن للطاقة والسكينة.\n\nولكن لتعميق هذا الترابط: ما هو التحدي الأكبر الذي يعيق عادة تواجدكم معاً ببال مرتاح ودون مقاطعات؟ وكيف تتغلبون عليه؟`,
          actionSteps: ['حجز 20 دقيقة الليلة لجلسة حديث عائلي دافئة بدون هواتف'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'ما التحدي الأكبر الذي يعيق تواجدكم معاً ببال مرتاح؟'
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة حضور أسري وتواصل دافئ في الجولة (${stationTurnCount + 1}). عرض التقييم المرحلي.`,
          summary: `تثبيت جلسة دفء أسري بدون شاشات لتعزيز الترابط.`,
          advice: 'الحضور القلبي الكامل لمدة 15 دقيقة أعمق أثراً من ساعات طويلة وأنت منشغل بهاتفك.',
          reply: `ما أجمل هذه الخطوة يا ${userName}! الدفء العائلي شاحن للطاقة والسكينة.\n\nبناءً على ما شاركتني به عبر حوارنا، أقيّم توازنك الأسري بدرجة (${interimScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟`,
          actionSteps: ['حجز 20 دقيقة الليلة لجلسة حديث عائلي دافئة بدون هواتف'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }
  }

  // 3.5. Domain: Social (أ. سامي الاجتماعي)
  if (agentKey === 'social') {
    const isSocialAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(msg);
    const socialCombined = [...(historyTexts || []), message].join(' ');
    const isSocialOverload =
      /(?:ضغط\s*(?:ال)?عمل|ضغوط\s*(?:ال)?عمل|مشغول|انشغال|أسرة|اسرة|أسري|أسرية|عائلة|عائلية|أولاد|أبناء|بيت|إرهاق|ارهاق|مرهق|تعب|استنزاف|تعبان|ما\s*(?:عندي|أجد|اجد)\s*طاقة|قلة\s*طاقة|مسؤوليات|التزامات|الدوام)/i.test(
        socialCombined
      );
    const isSocialComplaint = /(أعاني|اعاني|فتور|انعزال|تباعد|وحدة|وحيد|ما\s*عندي\s*أصدقاء|صعوبة\s*في\s*التواصل)/i.test(msg);
    const isSocialCommitment = !isSocialComplaint && /(صديق|تواصل|لقاء|حدود|انتقاء|أصدقاء|اصدقاء|صحبة|مجالسة|تقليل الالتزامات|حماية الطاقة)/i.test(msg) && !/(لا|ما|لن|بدون|غير|فتور|انعزال|تباعد)/i.test(msg);

    if (isSocialAdoption) {
      const finalScore = currentSessionUnifiedScore;
      return formatAgentOutput({
        reasoning: `اعتماد تشخيص محطة ${stationTitle} (${finalScore.toFixed(1)}/10) للمستفيد (${userName}).`,
        summary: `اعتماد تقييم ${stationTitle} وتثبيت حدود العلاقات الصحية وحماية الطاقة الاجتماعية.`,
        advice: synthesizeGoldenRecommendation({
          areaId: 'social',
          userTexts: [...(historyTexts || []), message],
          userProfile,
          score: finalScore,
        }),
        reply: `تم اعتماد تقييمك في ${stationTitle} بنجاح يا ${userName}! 🤝\n\nوعيك بحدود طاقتك الاجتماعية واختيار ما يريحك دون مجاملات مستنزفة هو مكسب حقيقي. خطتك معتمدة، وأنت جاهز تماماً للانتقال للمحطة التالية.`,
        actionSteps: isSocialOverload
          ? ['تخفيف الالتزامات والمجاملات غير الضرورية دون ذنب', 'حماية تواصل خفيف ومريح مع شخص تثق به']
          : ['المبادرة بالتواصل الهادئ مع شخص واحد تثق به', 'وضع حدود صحية تمنع استنزاف العلاقات السطحية'],
        score: finalScore,
        station_completed: true,
        reflectionQuestion: ''
      });
    }

    if (isSocialOverload && stationTurnCount < 2) {
      return formatAgentOutput({
        reasoning: `رصد سياق ضغط العمل والأسرة والإرهاق في محطة ${stationTitle} للمستفيد (${userName}). تركيز الاستجابة على حماية الطاقة الاجتماعية وتقليل الالتزامات دون شعور بالذنب، مع تجنب أي قوالب عن النوادي أو البحث عن أصدقاء جدد.`,
        summary: `حماية الطاقة الاجتماعية وتقليل الالتزامات والمجاملات وسط ضغوط العمل والأسرة دون ذنب.`,
        advice: 'حماية طاقتك الاجتماعية عبر تقليل المجاملات دون ذنب خطوة صحية تحافظ على توازنك مع عملك وأسرتك.',
        reply: `أقدر صراحتك يا ${userName} 🤝؛ حين تجتمع ضغوط العمل ومسؤوليات الأسرة مع الإرهاق، فمن الطبيعي أن تحتاج لحماية طاقتك الاجتماعية بتقليل الالتزامات واللقاءات الثقيلة دون أي شعور بالذنب.\n\nما هي المجاملات أو الالتزامات الاجتماعية الحالية التي تشعر أن تخفيفها سيمنحك مساحة راحة أوضح هذا الأسبوع؟`,
        actionSteps: ['تقليل التزام اجتماعي واحد غير ضروري هذا الأسبوع دون لوم للذات'],
        score: currentSessionSemanticScore,
        station_completed: false,
        reflectionQuestion: 'ما هي الالتزامات أو المجاملات التي ترى أن تخفيفها سيمنحك راحة أكبر؟'
      });
    }

    if (isSocialCommitment) {
      const interimScore = currentSessionUnifiedScore;
      if (stationTurnCount < 2) {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة اجتماعية نوعية وصحية ("${message}") في الجولة (${stationTurnCount + 1}). نؤكد عليها ونستكمل بسؤال متدرج دون إنهاء مبكر.`,
          summary: `تأكيد أهمية الصحبة الصادقة ووضع الحدود ومواصلة الحوار.`,
          advice: 'الصديق الصادق مرآة لروحك، وتواصلك المنتظم معه يجدد حماسك وإيجابيتك.',
          reply: `أحييك على هذه المبادرة الواعية يا ${userName}! 🤝 التواصل المتزن وبناء علاقات داعمة يمنحانك أرضية اجتماعية مستقرة.\n\nولكن لننظر إلى دائرة علاقاتك الأوسع: هل تشعر أن علاقاتك اليومية تدفعك للأمام وتلهمك، أم تستهلك وقتك في مجاملات سطحية؟`,
          actionSteps: ['إرسال رسالة شكر وتقدير لصديق داعم اليوم'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل دائرة علاقاتك تلهمك أم تستهلك وقتك بمجاملات؟'
        });
      } else {
        return formatAgentOutput({
          reasoning: `المستفيد التزم بخطوة اجتماعية نوعية وصحية في الجولة (${stationTurnCount + 1}). تقديم التقييم المرحلي وخيار الاعتماد.`,
          summary: `تأكيد أهمية الصحبة الصادقة ووضع الحدود الصحية.`,
          advice: 'الصديق الصادق مرآة لروحك، وتواصلك المنتظم معه يجدد حماسك وإيجابيتك.',
          reply: `أحييك على هذه المبادرة الواعية يا ${userName}!\n\nبناءً على رؤيتك المتزنة عبر حوارنا، أقيّم وضعك الاجتماعي حالياً بدرجة (${interimScore.toFixed(1)}/10).\n\nهل نعتمد هذا التقييم وننتقل معاً للمحطة التالية، أم تود إضافة تفصيل اجتماعي آخر؟`,
          actionSteps: ['إرسال رسالة شكر وتقدير لصديق داعم اليوم'],
          score: interimScore,
          station_completed: false,
          reflectionQuestion: 'هل ترغب في اعتماد هذا التقييم والانتقال للمحطة التالية؟'
        });
      }
    }
  }

  // 4. Domain: Aggregator (م. معتز التكاملي - هندسة النظم وتكامل عجلة الحياة)
  if (agentKey === 'aggregator') {
    if (isGreeting) {
      return formatAgentOutput({
        agent_name: 'م. معتز التكاملي',
        reasoning: `تحليل تركيبي أولي: المستفيد يبادر بالتواصل مع مهندس النظم الحياتية. الهدف هو كشف الصورة الكلية وتوضيح كيف تترابط المجالات الثمانية كشبكة واحدة لا تتجزأ دون تنظير معقد.`,
        summary: `الترحيب الشامل والتأكيد على وحدة المنظومة الحياتية وأثر الفراشة بين الجوانب الثمانية.`,
        advice: `تحديد الجانب الذي يشكل عنق الزجاجة الحالي والبدء بعادة محورية تخدم أكثر من مجال.`,
        reply: `مرحباً بك يا ${userName}! معك م. معتز التكاملي، مهندس النظم ووكيل التكامل الشامل لمنصة وزان.\n\nهدفي أن نرى الصورة الكلية معاً: كيف يؤثر جانب على آخر، وأين يكمن 'عنق الزجاجة' الخفي الذي إذا حركناه تحسنت باقي مجالات حياتك. ما هو التحدي أو الرابط الذي تود استكشافه اليوم؟`,
        actionSteps: [
          'تأمل أثر عاداتك الصحية والصباحية على طاقتك في العمل وعلاقاتك',
          'رصد المجال الأكثر تسبباً في تشتيتك وتحديده كنقطة بداية'
        ],
        reflectionQuestion: 'لو أصلحت جانباً واحداً في حياتك هذا الأسبوع، ما هو الجانب الذي سينعكس أثره الإيجابي فوراً على بقية الجوانب؟'
      });
    }

    if (msg.includes('ربط') || msg.includes('شغل') || msg.includes('عمل') || msg.includes('صحة') || msg.includes('مال') || msg.includes('طاقة')) {
      return formatAgentOutput({
        agent_name: 'م. معتز التكاملي',
        reasoning: `تحليل هندسي عابر للمجالات (Cross-Domain): المستفيد يستفسر عن الربط بين مجالات حياته (مثل العمل والصحة). الجسد ليس أداة للاستهلاك بل هو محطة توليد الطاقة للعمل، وأي إجهاد في الصحة ينعكس مباشرة كعجز في الإنتاجية وتوتر في العلاقات. الحل يكمن في قاعدة 'إدارة الطاقة لا إدارة الوقت'.`,
        summary: `هندسة الربط التكاملي بين الجوانب: تحويل الصحة من منافس للعمل إلى المغذي الأساسي للإنتاجية والصفاء.`,
        advice: `تطبيق قاعدة إدارة الطاقة: 50 دقيقة عمل مركّز تليها 5 دقائق استراحة حركية وتنفس لشحن بطارية الجسد.`,
        reply: `سؤالك استراتيجي ومحوري يا ${userName}! وهو جوهر هندسة النظم الحياتية.\n\nالعمل والصحة ليسا مسارين متنافسين بل منظومة واحدة:\n- **الصحة هي محطة توليد الوقود**: إذا انخفضت بطارية النوم والغذاء والنشاط، فإن أول ما ينهار هو جودة التركيز وسرعة الإنجاز في العمل.\n- **الأثر المتعدي**: الإرهاق الوظيفي ليس سببه كثرة الساعات دائماً، بل استنزاف الطاقة دون دورات شحن دورية.\n\nلربط طاقتك الجسدية بإنتاجيتك:\n1. قسّم وقت عملك لجلسات بؤرية (50 دقيقة إنتاج + 5 دقائق حركة وشرب ماء).\n2. اجعل الحركة الصباحية استثماراً يرفع حدة ذهنك لباقي ساعات الدوام.`,
        actionSteps: [
          'أخذ استراحة حركية وتنفسية لمدة 5 دقائق بعد كل 50 دقيقة عمل',
          'شرب الماء بانتظام أثناء ساعات العمل للحفاظ على نشاط الدماغ'
        ],
        reflectionQuestion: 'كيف يمكنك جدولة استراحات شحن الطاقة كجزء لا يتجزأ من جدول مهامك المهنية؟'
      });
    }

    return formatAgentOutput({
      agent_name: 'م. معتز التكاملي',
      reasoning: `تحليل تكاملي عام لمنظومة الحياة: النظر في رسالة المستفيد (${message}) واستخلاص العادة المحورية التآزرية التي تحرك أكثر من جانب في وقت واحد.`,
      summary: `تطبيق مبدأ العادات التآزرية المركبة لتحقيق أعلى أثر بأقل مجهود في عجلة الحياة.`,
      advice: `اختر عادة واحدة تخدم جانبين معاً (كالرياضة مع بودكاست معرفي، أو جلسة عائلية بحديث هادف).`,
      reply: `أهلاً بك يا ${userName}. تأملت في رسالتك: "${message}".\nفي هندسة توازن الحياة، لا نحاول إصلاح كل شيء دفعة واحدة؛ بل نبحث عن 'الرافعة الكبرى' (نقطة التأثير الأعلى). عندما نحدد العادة الصحيحة، فإنها تطلق أثراً إيجابياً متعدياً يضيء أكثر من ركن في عجلة حياتك.`,
      actionSteps: [
        'تحديد عادة محورية تخدم مجالين في آن واحد',
        'مراجعة شاشات الداشبورد لتحديد مواضع التباين بين الجوانب'
      ],
      reflectionQuestion: 'ما هي العادة اليومية البسيطة التي تجمع بين صفاء روحك ونشاط بدنك؟'
    });
  }

  // 5. Domain: Chief Advisor / Dashboard Director (د. هاني الموجه)
  if (agentKey === 'advisor') {
    if (isGreeting) {
      return formatAgentOutput({
        agent_name: 'د. هاني الموجه',
        reasoning: `تحليل قيادي تنفيذي: المستفيد يبدأ الحوار مع المستشار التوجيهي العام. الترحيب به واستعراض دور الداشبورد ومصفوفة أيزنهاور في قيادة حياته بهدوء ووضوح.`,
        summary: `الترحيب القيادي وتأكيد أهمية التوجيه الاستراتيجي وحماية أولويات المربع الثاني.`,
        advice: `حماية 30 دقيقة يومياً في المربع الثاني (مهم وغير عاجل) للتخطيط وبناء القوة.`,
        reply: `أهلاً ومرحباً بك يا ${userName}! أنا د. هاني الموجه، المستشار التوجيهي العام ومدير استراتيجية التوازن في منصة وزان.\n\nأنا هنا لأكون رفيقك في قراءة لوحة تحكمك، وترتيب أولوياتك في مصفوفة أيزنهاور، والتأكد من أنك تسير بخطى واثقة نحو أهدافك الحقيقية دون أن تغرق في طوارئ اللحظة. كيف ترى توازنك وأولوياتك اليوم؟`,
        actionSteps: [
          'تحديد أولويتك القصوى لليوم قبل البدء بأي مشتتات',
          'مراجعة الداشبورد لتثبيت عادة أسبوعية مستمرة'
        ],
        reflectionQuestion: 'ما هو القرار الذي لو اتخذته اليوم سيخفف عنك 80% من الضغوط في الأسبوع القادم؟'
      });
    }

    return formatAgentOutput({
      agent_name: 'د. هاني الموجه',
      reasoning: `تحليل استراتيجي ومراجعة لمصفوفة أيزنهاور بناءً على رسالة المستفيد (${message}): توجيه التركيز نحو المربع الثاني وتقليص استنزاف الطوارئ اللحظية.`,
      summary: `توجيه قيادي يركز على الانتقال من رد الفعل إلى الفعل المخطط وحماية الأولويات.`,
      advice: `احسم مهام المربع الأول بهدوء، وركز طاقتك على مهام المربع الثاني لبناء مستقبلك.`,
      reply: `مرحباً يا ${userName}. قرأت ما طرحته بتركيز واهتمام: "${message}".\nالقيادة الذاتية الحكيمة تقوم على قاعدة ذهبية: لا تجعل العاجل يسرق منك المهم. كلما رسخت حضورك في المربع الثاني بمصفوفة أيزنهاور (التخطيط، الوقاية، وتطوير الذات)، تقلصت الأزمات الطارئة ووجدت متسعاً كبيراً للتنفس والإنجاز.`,
      actionSteps: [
        'إدراج مهمة تطويرية واحدة في المربع الثاني لهذا اليوم',
        'تخصيص 10 دقائق مساءً لمراجعة إنجازات اليوم بهدوء'
      ],
      reflectionQuestion: 'ما هي المهمة المهمة جداً لمستقبلك ولكنك تؤجلها لأنها ليست عاجلة اليوم؟'
    });
  }

  // 6. مسار جلسات التقييم الحواري التكيفي (Doctor-Like Clinical Evaluation Session)
  if (isEvaluationSession) {
    const explicitEvalRating = extractExplicitRating(message);
    const isEvalAdoption = /(اعتمد|نعتمد|اعتماد|اعتمد التقييم|انهاء|إنهاء|نكتفي|كافي|يكفي|موافق|تمام اعتمد)/i.test(msg);
    const parsedScore = currentSessionUnifiedScore;
    const isGreeting = !isEditedOrResent && !hasPriorHistory && /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(message) && message.length < 25;
    const isShortVague = (message.length < 25 || isGreeting) && explicitEvalRating === null && !extractExpenseCategoryFromAnswer(message);
    const isUserAsking = isGenuineUserQuestion(message);

    // إذا طرح المستفيد سؤالاً أو استفساراً، نجيب عليه فوراً كطبيب خبير
    let directAnswer = '';
    const t = message.toLowerCase();
    if (agentKey === 'spiritual') {
      if (/(خلوة|الخلوة|وقت|مكان|مساحة|ساعة|كم دقيقة|كم وقت|طول الوقت|كم يجب|مكان هادئ|صمت)/i.test(t)) {
        directAnswer = `سؤالك دقيق وجوهري يا ${userName}: الخلوة الروحية لا تشترط ساعات طويلة ولا مكاناً فسيحاً خاصاً! تكفيك 5 إلى 10 دقائق فقط في بداية يومك أو قبل نومك، في زاوية هادئة من غرفتك أو حتى في سيارتك قبل النزول. المقصود ليس الانعزال الجغرافي أو المكاني، بل هدوء الذهن وانقطاع الهاتف والمشتتات لتتنفس وتستشعر قرب الخالق وسكينة صدرك وسلامك الداخلي.`;
      } else if (/(صلاة|الصلاة|اصلي|أصلي|ركوع|سجود|خشوع|أخشع|اخشع|فرض|سنن|ما اصلي|لا اصلي|تأمل|تامل|ميديتيشن)/i.test(t)) {
        directAnswer = 'أقدر صراحتك وشجاعتك العميقة؛ البداية لا تتطلب المثالية دفعة واحدة، بل خطوة ميسرة تثبت عليها دون أن تثقل على نفسك. ابدأ بدقائق هادئة يومياً تستحضر فيها معنى التسليم وراحة القلب والفضفضة والاتصال الروحي بما تؤمن به، فالتدرج برفق هو سر الثبات والسكينة.';
      } else if (/(ورد|الورد|أذكار|اذكار|قرآن|قران|تسبيح|استغفار|قراءة روحية|كتب روحية)/i.test(t)) {
        directAnswer = 'المساحة الروحية واحة للنفس وليست واجباً شاقاً؛ صفحة واحدة من قراءة ملهمة، أو دقيقتان من التأمل والاستغفار وذكر الله والامتنان المركز مع حضور القلب كفيلة بإنارة يومك وطرد شتات الذهن.';
      }
    } else if (agentKey === 'financial') {
      const evalEfStatus = extractEmergencyFundStatus([...(historyTexts || []), message]);
      if (/(طوارئ|طواريء|صندوق|ادخار|أدخر|ادخر|توفير|أوفر|استثمار|أستثمر)/i.test(t)) {
        if (evalEfStatus.hasFund) {
          const curMonths = evalEfStatus.monthsCovered;
          directAnswer = curMonths && curMonths < 6
            ? `امتلاكك صندوق طوارئ يغطي ${curMonths} أشهر ركيزة ممتازة يا ${userName}؛ الخطوة الأذكى الآن هي استكماله تدريجياً إلى 6 أشهر من نفقاتك الأساسية، وبالتوازي توجيه جزء ثابت من الفائض الشهري إلى استثمار طويل المدى ومتنوع.`
            : `امتلاكك صندوق طوارئ قائم يمنحك قاعدة مالية متينة يا ${userName}؛ يمكنك الآن التركيز على أتمتة توجيه جزء منتظم من فائضك الشهري نحو استثمار طويل المدى ومتنوع يناسب أهدافك.`;
        } else {
          directAnswer = isStudent
            ? `بصفتك طالباً جامعياً، بناء صمام الأمان يبدأ بخطوة ميسرة من ${incomeSrc}: اقتطاع مبلغ رمزي (30 إلى 100 ريال شهرياً) في حصالة أو حساب فرعي يمنحك راحة نفسية ويحميك من الطوارئ الدراسية.`
            : isVariableIncome
              ? 'مع طبيعة الدخل المتغير، صمام الأمان المرن يبدأ بتجنيب نسبة من كل دفعة مرتفعة في حساب منفصل لتغطية الأشهر الأهدأ دون ضغط.'
              : `بناء صندوق الطوارئ يبدأ بقرار ميسر: اقتطاع مبلغ ثابت في حساب بنكي منفصل تماماً فور استلام الراتب ليكون صمام أمان${hasDep ? ' لك ولأسرتك' : ''} ضد الطوارئ.`;
        }
      } else if (/(دين|ديون|قرض|سداد|أقساط|اقساط|بطاقة|فيزا)/i.test(t)) {
        directAnswer = isStudent
          ? 'في المرحلة الجامعية، القاعدة الأهم هي تجنب أي أقساط استهلاكية وتصفية الالتزامات الصغيرة أولاً بأول من مصروفك أو مكافأتك.'
          : 'القاعدة الذهبية في التحرر من الديون هي البدء بأصغر دين حجماً لسداده سريعاً (طريقة كرة الثلج) لتشعر بنشوة الإنجاز والتحرر، مع إيقاف التراكم الائتماني.';
      }
    } else if (agentKey === 'career') {
      if (/(تسويف|تأجيل|تاجيل|كسل|ابدأ|أبدأ|ما عندي دافع|شغف)/i.test(t)) {
        directAnswer = 'علاج التسويف يكمن في قاعدة الـ 5 دقائق الذهبية: الزم نفسك بالعمل على المهمة المؤجلة لمدة 5 دقائق فقط دون اشتراط الإنجاز الكامل؛ كسر حاجز البداية يحل 80% من صعوبة المهمة.';
      }
    } else if (agentKey === 'health') {
      if (/(نوم|أرق|ارق|كم ساعة|سهر|اسهر|أصحى|اصحى)/i.test(t)) {
        directAnswer = 'النوم الصحي يرتكز على 7 إلى 8 ساعات منتظمة، والسر يكمن في تثبيت موعد الاستيقاظ صباحاً وقطع الشاشات الزرقاء قبل النوم بـ 45 دقيقة مع تهيئة بيئة نوم مظلمة وباردة.';
      }
    }

    if (!directAnswer && isUserAsking) {
      directAnswer = `سؤالك ذكي ويلامس صلب اتزانك يا ${userName}: الحل لا يكمن في القفزات المفاجئة، بل في التدرج الواعي وعادة يومية صغيرة ومحمية تناسب ظروفك الحالية وتصنع أثراً تراكمياً ملموساً.`;
    }

    // قاعدة الجولات الأربع والتقييم المرحلي:
    // ابتداءً من الجولة الرابعة (stationTurnCount >= 3)، يُعرض التقييم المرحلي وخيار الاعتماد
    const isUserConfirmingCompletion = /(اعتمد|نعتمد|اعتماد|اعتمد التقييم|انهاء|إنهاء|نكتفي|كافي|يكفي|موافق|تمام اعتمد)/i.test(msg);
    const isUserWantingToContinue = /(تعمق|التعمق|أكمل|اكمل|مواصلة|نواصل|استمر|المتابعة|زاوية أخرى)/i.test(msg);

    if (isUserConfirmingCompletion) {
      const goldenAdv = synthesizeGoldenRecommendation({
        areaId: agentKey,
        userTexts: [...(historyTexts || []), message].filter(Boolean),
        userProfile,
        score: parsedScore,
      });
      return formatAgentOutput({
        agent_name: advName,
        score: parsedScore,
        station_completed: true,
        strengths: [
          `وعي صريح وشفافية في تشخيص واقع ${stationTitle}`,
          `الرغبة الصادقة في بناء نمط متزن واستعادة السيطرة`
        ],
        challenges: [
          `الحاجة لتثبيت عادة يومية مستدامة تحمي ${stationTitle} من التراجع`,
          `تنظيم الأولويات في المربع الثاني لتجنب ضغوط الطوارئ`
        ],
        reasoning: `المستفيد (${userName}) اختار صراحة اعتماد التقييم وإنهاء المحطة ("${message}").`,
        summary: `تم اعتماد تقييم محطة ${stationTitle} بنجاح.`,
        advice: goldenAdv,
        reply: `تم اعتماد تقييمك في محطة ${stationTitle} بنجاح بدرجة (${parsedScore}/10) يا ${userName}! 🎯\n\nأنت جاهز الآن تماماً للانتقال إلى المحطة التالية.`,
        actionSteps: [goldenAdv, ...(advisor?.defaultGoals?.slice(0, 1) || [])],
        reflectionQuestion: ''
      });
    }

    if (isRequestingAdvisorSuggestions(message) && !isUserConfirmingCompletion) {
      const concreteSuggestions = generateConcreteDomainSuggestions(
        agentKey,
        [...(historyTexts || []), message].filter(Boolean),
        userProfile,
        parsedScore
      );
      const formattedList = concreteSuggestions.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      const directSugReply =
        stationTurnCount >= 2
          ? `إليك 3 اقتراحات عملية قصيرة تناسب واقعك في ${stationTitle}:\n\n${formattedList}\n\nبناءً على حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${parsedScore}/10).\n\nهل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل تعديل أحد هذه الاقتراحات؟`
          : `إليك 3 اقتراحات عملية قصيرة تناسب واقعك في ${stationTitle}:\n\n${formattedList}\n\nأيّ من هذه الخطوات الثلاث تشعر أنها الأقرب لتجربتها هذا الأسبوع؟`;

      return formatAgentOutput({
        agent_name: advName,
        score: parsedScore,
        station_completed: false,
        strengths: [`الوضوح في توصيف واقع ${stationTitle} والرغبة في حل عملي`],
        challenges: [concreteSuggestions[0] || `تطبيق خطوة عملية واضحة في ${stationTitle}`],
        reasoning: `تلبية طلب الاقتراحات المباشر للمستفيد ("${message}") عبر 3 خطوات متسقة مع الحوار${stationTurnCount >= 2 ? ' وعرض التقييم المبدئي' : ''}.`,
        summary: `تقديم 3 اقتراحات عملية مخصصة في ${stationTitle}.`,
        advice: synthesizeGoldenRecommendation({
          areaId: agentKey,
          userTexts: [...(historyTexts || []), message].filter(Boolean),
          userProfile,
          score: parsedScore,
        }),
        reply: directSugReply,
        actionSteps: concreteSuggestions,
        reflectionQuestion:
          stationTurnCount >= 2
            ? 'هل ترغب في اعتماد التقييم الحالي أم تعديل أحد الاقتراحات؟'
            : 'أيّ من هذه الخطوات الثلاث تشعر أنها الأنسب للبدء بها؟',
      });
    }

    if (stationTurnCount >= 2 && !isUserWantingToContinue) {
      const dynamicStrengths = [
        `وعي صريح وشفافية في تشخيص واقع ${stationTitle}`,
        `الرغبة الصادقة في بناء نمط متزن واستعادة السيطرة`
      ];
      const dynamicChallenges = [
        `الحاجة لتثبيت عادة يومية مستدامة تحمي ${stationTitle} من التراجع`,
        `تنظيم الأولويات في المربع الثاني لتجنب ضغوط الطوارئ`
      ];

      return formatAgentOutput({
        agent_name: advName,
        score: parsedScore,
        station_completed: false,
        strengths: dynamicStrengths,
        challenges: dynamicChallenges,
        reasoning: `قاعدة التقييم المبدئي الموحدة بعد الرسالة الثالثة (المحطة ${evaluationStep || 1} من 8: ${stationTitle} - الرسالة ${stationTurnCount + 1}): عرض الدرجة المبدئية (${parsedScore}/10) وتخيير المستشير بين الاعتماد أو مواصلة الحوار.`,
        summary: `عرض التقييم المبدئي (${parsedScore}/10) لمحطة ${stationTitle} والتخيير بين الاعتماد أو التعمق.`,
        advice: synthesizeGoldenRecommendation({
          areaId: agentKey,
          userTexts: [...(historyTexts || []), message].filter(Boolean),
          userProfile,
          score: parsedScore,
        }),
        reply: formatUnifiedScoreConfirmationMessage(parsedScore),
        actionSteps: advisor?.defaultGoals?.slice(0, 2) || ['تأمل واقع هذا الجانب وتحديد أولويتك القادمة'],
        reflectionQuestion: 'هل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار؟'
      });
    }

    if (stationTurnCount < 2 || isUserAsking || isShortVague || isUserWantingToContinue) {
      if (isShortVague && stationTurnCount > 0) {
        return formatAgentOutput({
          agent_name: advName,
          score: parsedScore,
          station_completed: false,
          strengths: [],
          challenges: [],
          reasoning: `سؤال توضيحي عند الغموض (المحطة ${evaluationStep || 1} من 8: ${stationTitle}): إجابة المستشير غير واضحة، طرح السؤال المعياري الموحد دون افتراضات.`,
          summary: `طلب توضيح استفسار المستشير بصيغة معيارية.`,
          advice: `الوضوح في تشخيص الواقع يسهل الوصول للحل المناسب.`,
          reply: `أريد التأكد من أنني فهمت قصدك بشكل صحيح، هل يمكنك توضيح هذه النقطة؟`,
          actionSteps: advisor?.defaultGoals?.slice(0, 2) || ['تأمل واقع هذا الجانب وتحديد أولويتك القادمة'],
          reflectionQuestion: 'هل يمكنك توضيح هذه النقطة بمزيد من التفصيل؟'
        });
      }

      const sessionId = userProfile?.email || userName || 'default';
      const rotatedFallback = pickNonRepeatingFallbackReply(
        agentKey,
        stationTurnCount,
        sessionId,
        userProfile,
        userName,
        [...(historyTexts || []), message].filter(Boolean)
      );

      let dynamicReply = rotatedFallback.reply;
      if (directAnswer) {
        dynamicReply = isDiagnosticTopicAlreadyAnswered(rotatedFallback.reply, [...(historyTexts || []), message])
          ? `💡 **إجابة عن استفسارك:**\n${directAnswer}\n\n🌿 ما الخطوة العملية التالية التي تراها الأنسب لك انطلاقاً من هذا التوجه؟`
          : `💡 **إجابة عن استفسارك:**\n${directAnswer}\n\n🌿 **ولنواصل استكشاف واقعك في ${stationTitle}:**\n${rotatedFallback.reply}`;
      }

      const interimEvalAdvice = synthesizeGoldenRecommendation({
        areaId: agentKey,
        userTexts: [...(historyTexts || []), message].filter(Boolean),
        userProfile,
        score: parsedScore,
      });

      return formatAgentOutput({
        agent_name: advName,
        score: parsedScore,
        station_completed: false,
        strengths: [],
        challenges: [],
        reasoning: `تحليل استشاري تكيفي (المحطة ${evaluationStep || 1} من 8: ${stationTitle} - المحاورة ${stationTurnCount + 1}، رد #${rotatedFallback.index + 1}): مواصلة الحوار الاستكشافي المباشر دون تكرار.`,
        summary: `متابعة استيضاحية تكيفية لتشخيص (${stationTitle}).`,
        advice: parsedScore >= 7.5 ? interimEvalAdvice : `التشخيص الاستشاري الدقيق لواقعك اليومي هو الخطوة الأولى لتحديد احتياجك الفعلي.`,
        reply: dynamicReply,
        actionSteps: parsedScore >= 7.5
          ? [interimEvalAdvice, ...(advisor?.defaultGoals?.slice(0, 1) || [])]
          : (advisor?.defaultGoals?.slice(0, 2) || ['تأمل واقع هذا الجانب وتحديد أولويتك القادمة']),
        reflectionQuestion: ''
      });
    }

    // إذا اختار المستفيد اعتماد التقييم
    const goldenHabit = synthesizeGoldenRecommendation({
      areaId: agentKey,
      userTexts: [...(historyTexts || []), message].filter(Boolean),
      userProfile,
      score: parsedScore,
      advisorCandidate: advisor?.defaultGoals?.[0],
    });
    const dynamicStrengths = [
      `وعي صريح وشفافية في تشخيص واقع ${stationTitle}`,
      `الرغبة الصادقة في بناء نمط متزن واستعادة السيطرة`
    ];
    const dynamicChallenges = [
      `الحاجة لتثبيت عادة يومية مستدامة تحمي ${stationTitle} من التراجع`,
      `تنظيم الأولويات في المربع الثاني لتجنب ضغوط الطوارئ`
    ];

    return formatAgentOutput({
      agent_name: advName,
      score: parsedScore,
      station_completed: true,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `اعتماد تشخيص استشاري متزن لمحطة (${evaluationStep || 1} من 8: ${stationTitle}): تم اعتماد التقييم بناءً على اختيار المستشير (${parsedScore}/10).`,
      summary: `اعتماد تشخيص محطة (${stationTitle}) بدرجة ${parsedScore}/10 وتحديد التوصية الذهبية.`,
      advice: goldenHabit,
      reply: `تم اعتماد تقييم محطة (${evaluationStep || 1} من 8: ${stationTitle}) بدرجة (${parsedScore} من 10) بنجاح بناءً على المعلومات التي شاركتها بكل صدق. 🎯\n\n💡 **التوصية العملية:**\n${goldenHabit}.`,
      actionSteps: parsedScore >= 7.5 ? [goldenHabit] : (advisor?.defaultGoals?.slice(0, 2) || [goldenHabit]),
      reflectionQuestion: ''
    });
  }

  // 7. Default persona for other domains
  const fallbackAdvisors: Record<string, { role: string; name: string }> = {
    career: { role: 'المستشار المهني', name: 'م. طارق المهني' },
    personal: { role: 'أخصائية تطوير الذات', name: 'د. ليلى الذاتية' },
    learning: { role: 'مستشار التعلم والنمو المعرفي', name: 'بروفيسور زياد المعرفي' },
    family: { role: 'استشارية الترابط الأسري', name: 'د. مريم الأسرية' },
    social: { role: 'مستشار الذكاء الاجتماعي', name: 'أ. سامي الاجتماعي' },
    aggregator: { role: 'وكيل التجميع والتكامل الشامل ومحلل النظم الحياتية', name: 'م. معتز التكاملي' },
    advisor: { role: 'المستشار التوجيهي ورئيس الداشبورد', name: 'د. هاني الموجه' },
  };

  const advInfo = fallbackAdvisors[agentKey] || { role: advisor?.role || 'مستشار توازن الحياة', name: advName };
  const anchoredGeneric = buildComplaintAnchoredReply(agentKey, message, historyTexts || []);
  if (anchoredGeneric) {
    return formatAgentOutput({
      agent_name: advInfo.name,
      reasoning: `مواءمة مباشرة مع شكوى المستفيد الصريحة ("${message}") في ${stationTitle} دون القفز لمجال آخر غير مذكور.`,
      summary: anchoredGeneric.summary,
      advice: anchoredGeneric.advice,
      reply: `${anchoredGeneric.reflection}\n\n${anchoredGeneric.followUpQuestion}`,
      actionSteps: anchoredGeneric.actionSteps,
      station_completed: false,
      reflectionQuestion: ''
    });
  }

  const sessionId = userProfile?.email || userName || 'default';
  const domainFallback = pickNonRepeatingFallbackReply(agentKey, stationTurnCount, sessionId, userProfile, userName, historyTexts || []);

  return formatAgentOutput({
    agent_name: advInfo.name,
    reasoning: `تحليل استشاري متدرج (رد #${domainFallback.index + 1}): استكشاف واقع المستفيد (${userName}) في مجال (${stationTitle}) دون تكرار حرفي.`,
    summary: `متابعة استكشافية متوازنة في ${stationTitle}.`,
    advice: `تحديد إجراء واحد واضح يمكنك تنفيذه خلال 24 ساعة وإدراجه في المربع الثاني بمصفوفة أيزنهاور.`,
    reply: domainFallback.reply,
    actionSteps: [
      'تحديد إجراء واحد ملموس يمكنك تنفيذه خلال الـ 24 ساعة القادمة',
      'إسقاط هذا الهدف في المربع الثاني بمصفوفة أيزنهاور لمتابعته'
    ],
    station_completed: false,
    reflectionQuestion: ''
  });
}