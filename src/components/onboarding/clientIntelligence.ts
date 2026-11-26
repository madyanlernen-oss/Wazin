import { AdvisorConfig, LifeAreaId, UserProfile } from '../../types/lifeBalance';
import { isolateNumbersInText } from '../FormattedChatMessage';
import { parseUserContext, getDomainContextConfig } from '../../utils/contextPersonalization';
import { generateDynamicQuickSuggestions } from '../../utils/dynamicSuggestions';
import {
  synthesizeGoldenRecommendation,
  generateConcreteDomainSuggestions,
} from '../../utils/realisticGoalsGenerator';
import {
  isGenuineUserQuestion,
  pickNextUnaskedQuestion,
  stripRepeatedOpeningGreeting,
  hasDebtStatusAnswered,
  extractExpenseCategoryFromAnswer,
  isQuestionAlreadyAsked,
  isRequestingAdvisorSuggestions,
  extractAnchorSelfRatingFromHistory,
  hasAcuteIsolationOrRejection,
} from '../../utils/dialogueDeduplication';

export interface EvaluationChatMessage {
  id: string;
  sender: 'advisor' | 'user';
  text: string;
  timestamp: string;
  reasoning?: string;
  summary?: string;
  advice?: string;
  isCrisis?: boolean;
  ignoredForTurnCount?: boolean;
  suggestedReplies?: string[];
  source?: 'gemini' | 'groq' | 'local-fallback';
}

export interface StationDynamicInsights {
  score: number;
  strengths: string[];
  challenges: string[];
  goldenRecommendation?: string;
}

// متغير يتتبع آخر index مستخدم للـ Fallback في الجلسة الحالية لمنع التكرار الحرفي في جولتين متتاليتين
const lastClientFallbackIndexBySession = new Map<string, number>();

export function resetClientFallbackTracker(sessionKey?: string): void {
  if (sessionKey) {
    lastClientFallbackIndexBySession.delete(sessionKey);
  } else {
    lastClientFallbackIndexBySession.clear();
  }
}

/**
 * يستخرج درجة التقييم الصريحة (1-10) فقط عند وجود صيغة تقييم واضحة،
 * ويمنع تماماً التقاط أرقام عادية مثل "25 دقيقة" أو "ساعتين" أو "30 ريال".
 */
export function extractExplicitRating(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  const explicitPhraseMatch = text.match(
    /(?:تقييمي|أقيّم نفسي|اقيم نفسي|درجتي|أعطيه|اعطيه)\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i
  );
  if (explicitPhraseMatch) {
    const val = parseFloat(explicitPhraseMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  const fromTenMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i);
  if (fromTenMatch) {
    const val = parseFloat(fromTenMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  const labelOnlyMatch = text.match(
    /(?:تقييمي|أقيّم نفسي|اقيم نفسي|درجتي|أعطيه|اعطيه)\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*(?:دقيقة|دقائق|ساعة|ساعات|ريال|يوم|أيام|شهر|أشهر|سنة|سنوات|%))/i
  );
  if (labelOnlyMatch) {
    const val = parseFloat(labelOnlyMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  return null;
}

// Helper: Psychometric semantic scoring engine (Linguistic sentiment & distress analysis with decimal precision)
export function calculateSemanticScore(
  text: string,
  historyTexts: string[] = [],
  explicitScore?: number
): number {
  if (explicitScore !== undefined && explicitScore >= 1 && explicitScore <= 10) {
    return Number(explicitScore.toFixed(1));
  }

  const anchorRating = extractAnchorSelfRatingFromHistory(historyTexts);
  const allText = [text, ...historyTexts].join(' ').toLowerCase();
  const cleanedForNegativeCheck = allText.replace(
    /(?:بعيد[اً ]*عن|البعد\s*عن|إبعاد|ابعد|تجنب|دون|بدون|بلا|تخلصت\s*من|تجاوزت|لا\s*(?:أشعر|اشعر|يوجد|توجد)\s*(?:ب|ل)?)\s*(?:الشاشات|الهاتف|الجوال|التوتر|الضغط|القلق|الإرهاق|الارهاق|التشتت|السهر|اللوم|المقاطعات)/gi,
    ' '
  );
  const hasAcuteIsolation = hasAcuteIsolationOrRejection([text, ...historyTexts]);

  // 1. Severe breakdown & collapse (1.5 - 3.0)
  const severeNegativePatterns = [
    /(مدمر|محطم|كارثي|كارثة|صفر|ضياع تام|ضائع كليا|لا املك شيء|مفلس تماما|غارق ديون|غرقان ديون|لا اصلي ابدا|تارك الصلاة|ما اصلي نهائيا|انعدام|طاقتي صفر|نومي مدمر|ما انام ابدا|فاشل جدا|اكره حياتي|مكتئب جدا|منهار|مخنوق تماما|مفيش امل|منعدم|مديونية خانقة|صفر ريال)/i,
  ];

  // 2. Strong negative & high struggle (2.6 - 3.8 for isolation/mistreatment, 2.7 - 3.6 overall)
  const strongNegativePatterns = [
    /(سيء جدا|سلبي جدا|غير راض ابدا|ضياع|يضيع بسرعة|الوقت يضيع|ما في فايدة|ما اقدر|عاجز|مستنزف|قلق دائم|خوف مستمر|توتر شديد|سهر مستمر|ارق شديد|خمول مستمر|كسل شديد|تراكم|تسويف دائم|ديون كثيرة|راتب لا يكفي|ما اقدر اوفر|عزلة تامة|وحيد تماما|فجوة كبيرة|مشاكل مستمرة|نزاع دائم|تعبت من الوضع|مخنوق|تعبان كثير|فاقد السيطرة|بدون هدف|ما اصلي|اقصر بالصلاة|سلبي تماما|سلبي جدا|لا أجلس مع|لا اجلس مع|لا أريد الجلوس|لا اريد الجلوس|سوء معاملة|سوء المعاملة|لا أشعر بأي فائدة|لا فائدة من وجودهم)/i,
  ];

  // 3. Moderate negative, fluctuation, & exhaustion (4.0 - 5.5 alone, balanced to 6.6-7.3 when strong positive baseline exists)
  const moderateNegativePatterns = [
    /(تشتت|يشتت|تشتيت|تسويف|تأجيل|مشتت|فتور|تراجع|تذبذب|متذبذب|متقلب|تقلب|غير مستقر|غير منتظم|صعوبة|ضغط|مضغوط|مرهق|تعبان|متعب|إرهاق|ارهاق|استنزاف|مشغول|انشغال|قلق|توتر|تقصير|أقصر|اقصر|روتين|ملل|ما عندي وقت|سطحية|خمول|سهر|ضيق وقت|خجل|يوم .* ويوم|أحيانا ألتزم|مرة ألتزم|أغرق في الهاتف|انقطاع)/i,
  ];

  // 4. Moderate positive & improving (6.1 - 7.3)
  const moderatePositivePatterns = [
    /(مقبول|جيد نوعا ما|احاول|أحاول|اتحسن|أتحسن|خطوة طيبة|وعي|راض نسبيا|ماشي الحال|استقرار متوسط|احيانا ملتزم|بديت اتعلم|علاقة طيبة|احسن من قبل|تطور بسيط|في تحسن|جيدة|مرتاح|قريب|نتفاهم)/i,
  ];

  // 5. Strong positive & stable across all 8 domains (7.5 - 9.0)
  const strongPositivePatterns = [
    /(ممتاز|جيد جدا|سكينة|طمأنينة|ورد يومي|صلاة في وقتها|خشوع|انضباط مالي|ادخار منتظم|صندوق طوارئ|فائض شهري|راتبي مستقر|انجاز عالي|شغف|تطور مستمر|تصالح مع الذات|قراءة مستمرة|قراءة يومية|تعلم دائم|ترابط اسري|حوار دافئ|اصدقاء اوفياء|علاقات داعمة|نوم عميق|نوم منتظم|نوم مريح|نشاط وحيوية|رياضة مستمرة|رياضة يومية|راحة بال|كثير من الوقت|الكثير من الوقت|وقت كبير|أمنحهم|أعطيهم وقت|دائماً معهم|نجلس معاً كثيراً|تواصل دافئ|وقت\s*(?:يومي\s*)?ثابت|تخصيص\s*وقت|البعد\s*عن\s*الشاشات|بعيد[اً ]*عن\s*الشاشات|بدون\s*(?:هاتف|شاشات)|صفاء\s*(?:ذهني|الذهن|البال)|هدوء\s*(?:نفسي|داخلي|ذهني)|اتزان\s*(?:نفسي|داخلي)|توازن\s*(?:نفسي|داخلي|جيد|ممتاز)|راحة\s*ذهنية|مستقر\s*(?:نفسياً|داخلياً|ذهنياً)|استقرار\s*(?:نفسي|داخلي)|حضور\s*(?:أعمق|اعمق|ذهني|كامل|دافئ)|عمل\s*عميق|روتين\s*صحي|ألتزم\s*(?:يومياً|بانتظام)|بانتظام\s*يومياً)/i,
  ];

  // 6. Outstanding (8.6 - 9.0)
  const outstandingPositivePatterns = [
    /(مثالي|استثنائي|فوق الممتاز|شغف عالي جدا|سلام داخلي عميق|استقلال مالي|حرية مالية|انتاجية استثنائية|ثقة مطلقة|عطاء ملهم|صحة حديدية|انجاز عظيم)/i,
  ];

  // Length & character variance for realistic decimal precision
  const charHash = allText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = (charHash % 9) * 0.1; // 0.0 - 0.8

  const hasSevere = severeNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasStrongNeg = strongNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasModerateNeg = moderateNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasStrongPos = strongPositivePatterns.some((p) => p.test(allText));
  const hasOutstandingPos = outstandingPositivePatterns.some((p) => p.test(allText));
  const hasModeratePos = moderatePositivePatterns.some((p) => p.test(allText));

  let calculated = 5.2;

  if (hasAcuteIsolation) {
    // Acute isolation/mistreatment -> realistic low score (2.6 - 3.5), never pulled up toward ~4.8 by solo coping
    calculated = 2.6 + (charHash % 10) * 0.1;
  } else if (anchorRating !== null && anchorRating >= 6.8 && !hasSevere && !hasStrongNeg) {
    calculated = hasModerateNeg
      ? Math.max(6.5, Math.min(7.5, anchorRating - 0.8))
      : Math.max(7.5, Math.min(9.0, anchorRating));
  } else if (hasSevere) {
    calculated = 1.8 + variance * 0.8;
  } else if (hasStrongNeg) {
    calculated = 2.7 + variance * 0.9;
  } else if ((hasStrongPos || hasOutstandingPos) && hasModerateNeg) {
    calculated = 6.6 + (variance % 8) * 0.1;
  } else if (hasModerateNeg) {
    // Fluctuating / exhausted -> 4.0 to 5.4
    calculated = 4.0 + (charHash % 15) * 0.1;
  } else if (hasOutstandingPos) {
    calculated = 8.6 + (charHash % 5) * 0.1;
  } else if (hasStrongPos) {
    // Positive & stable -> 7.6 to 9.0
    calculated = 7.6 + (charHash % 15) * 0.1;
  } else if (hasModeratePos) {
    calculated = 6.2 + variance * 0.9;
  }

  return Number(Math.max(1.5, Math.min(9.8, calculated)).toFixed(1));
}

// Helper: Specialized consultative FAQ and Q&A responder for common user inquiries per domain
export function answerUserInquiry(
  advisorId: string,
  text: string,
  userProfile?: UserProfile | null
): string | null {
  const t = text.toLowerCase().trim();
  const clientName = userProfile?.name?.trim() || 'عزيزي';
  const status = (userProfile?.employmentStatus || userProfile?.workStatus || '').trim();
  const isStudent = status === 'طالب جامعي' || status.includes('طالب');
  const isBusiness =
    status === 'صاحب عمل/مستقل' ||
    status === 'صاحب عمل' ||
    status === 'مستقل' ||
    status.includes('صاحب عمل') ||
    status.includes('مستقل');

  // 1. الجانب الروحي والسكينة (د. سفيان الروحي)
  if (advisorId === 'spiritual') {
    // التحقق أولاً مما إذا كان المستفيد يقترح مدة/خطوة عملية (مثل "نصف ساعة يوميا ما رايك")
    if (/(نصف\s*ساعة|ساعة|ربع\s*ساعة|\d+\s*دقيقة|\d+\s*دقائق|وقت محدد)/i.test(t) && /(ممكن|رأيك|رايك|تنصح|ينفع|أخصص|اخصص|أبدأ|ابدأ|يوميا|يومياً)/i.test(t)) {
      return `اقتراحك ممتاز وواقعي جداً يا ${clientName}؛ تخصيص هذا الوقت يومياً (أو حتى 15 إلى 30 دقيقة مستمرة) كخلوة هادئة ومساحة لصفاء الذهن واستحضار السكينة بعيداً عن المشتتات والشاشات يمثل خطوة تحولية تصنع اتزاناً حقيقياً ليومك وتثبت حضور قلبك.`;
    }
    if (/(خلوة|الخلوة|مكان خاص|أين أخلو|اين اخلو|كم يجب|مكان هادئ|صمت)/i.test(t)) {
      return `سؤالك دقيق وجوهري يا ${clientName}: الخلوة الروحية لا تشترط ساعات طويلة ولا مكاناً فسيحاً خاصاً! تكفيك 5 إلى 10 دقائق فقط في بداية يومك أو قبل نومك، في زاوية هادئة من غرفتك أو حتى في سيارتك قبل النزول. المقصود ليس الانعزال الجغرافي أو المكاني، بل هدوء الذهن وانقطاع الهاتف والمشتتات لتتنفس وتستشعر قرب الخالق وسكينة صدرك وسلامك الداخلي.`;
    }
    if (/(صلاة|الصلاة|اصلي|أصلي|ركوع|سجود|خشوع|أخشع|اخشع|فرض|سنن|ما اصلي|لا اصلي|تأمل|تامل|ميديتيشن)/i.test(t)) {
      return 'أقدر صراحتك وشجاعتك العميقة؛ البداية لا تتطلب المثالية دفعة واحدة، بل خطوة ميسرة تثبت عليها دون أن تثقل على نفسك. ابدأ بدقائق هادئة يومياً تستحضر فيها معنى التسليم وراحة القلب والفضفضة والاتصال الروحي بما تؤمن به، فالتدرج برفق هو سر الثبات والسكينة.';
    }
    if (/(ورد|الورد|أذكار|اذكار|قرآن|قران|تسبيح|استغفار|قراءة روحية|كتب روحية)/i.test(t)) {
      return 'المساحة الروحية واحة للنفس وليست واجباً شاقاً؛ صفحة واحدة من قراءة ملهمة، أو دقيقتان من التأمل والاستغفار وذكر الله والامتنان المركز مع حضور القلب كفيلة بإنارة يومك وطرد شتات الذهن.';
    }
    if (/(دعاء|أدعو|ادعو|استجابة|قلق|تعبان|ضيق|مناجاة)/i.test(t)) {
      return 'الدعاء والمناجاة هما حديث القلب الصادق؛ لا تتكلف ألفاظاً، بل تحدث بضعفك واحتياجك كما تتحدث مع أعظم سند لك في هذا الكون، والسكينة تبدأ فور أن تسلّم همك لخالقك وتثق برعايته.';
    }
  }

  // 2. الجانب المالي (أ. كمال المالي) - تكييف النصائح بدقة حسب سياق المستفيد
  if (advisorId === 'financial') {
    const confirmsNoDebt = /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(t);
    const mentionsDebt = /(دين|ديون|قرض|قروض|أقساط|اقساط|بطاقة|فيزا|التزامات)/i.test(t) && !confirmsNoDebt;
    if (/(دين|ديون|قرض|سداد|أقساط|اقساط|بطاقة|فيزا)/i.test(t) && !confirmsNoDebt) {
      if (isStudent) {
        return 'في المرحلة الجامعية، القاعدة الذهبية هي تجنب أي شراء بالأقساط الاستهلاكية أو الاقتراض لمجاراة الأقران؛ وإذا كانت هناك التزامات صغيرة فابدأ بسدادها أولاً بأول من المكافأة لتستعيد حريتك المالية.';
      }
      return 'القاعدة الذهبية عند وجود ديون أو أقساط هي البدء بحصرها جميعاً وترتيب السداد (الأصغر حجماً لتحقيق إنجاز سريع أو الأعلى كلفة) مع تأمين صمام أمان نقدي مصغر قبل التفكير في أتمتة الادخار أو الاستثمار.';
    }
    if (/(طوارئ|طواريء|صندوق|ادخار|أدخر|ادخر|توفير|أوفر|استثمار|أصول)/i.test(t)) {
      if (isStudent) {
        return 'بصفتك طالباً جامعياً، صمام الأمان يبدأ بقرار ميسر: اقتطاع مبلغ رمزي صغير (50 إلى 100 ريال شهرياً) من مكافأتك أو مصروفك في حساب أو حصالة منفصلة؛ هذا المبلغ البسيط يمنحك راحة نفسية ويحميك من أي ضائقة طارئة دون أن يثقل على دراستك.';
      }
      if (isBusiness) {
        return 'كرائد أعمال أو صاحب عمل حر، وبعد حصر التزاماتك الثابتة، صمام الأمان يحتاج أن يكون مزدوجاً: احتياطي طوارئ تجاري للشركة لـ 3-6 أشهر نفقات تشغيلية، واحتياطي طوارئ شخصي للمعيشة في حساب منفصل تماماً.';
      }
      if (confirmsNoDebt && !mentionsDebt) {
        return 'مع خلو سجلك من الديون، بناء صندوق الطوارئ يبدأ بقرار ميسر: اقتطاع مبلغ ثابت في حساب بنكي منفصل تماماً لـ 3 إلى 6 أشهر من نفقاتك قبل التوسع في الاستثمار وتنمية الأصول.';
      }
      return 'قبل تخطيط أتمتة الادخار أو الاستثمار، الخطوة الأولى هي التأكد من حجم أي أقساط أو التزامات شهرية تقتطع من راتبك؛ وبقدر الفائض الحقيقي المتبقي تبدأ ببناء صمام أمان مصغر أو ممتد يحميك من اللجوء للاقتراض.';
    }
    if (/(ميزانية|راتب|مصاريف|يتسرب|وين يروح|أين يذهب|مكافأة|مكافاه|مصروف)/i.test(t)) {
      if (isStudent) {
        return 'لإدارة المكافأة أو المصروف كطالب: قسّم دخلك بمرونة: 60% للمستلزمات الدراسية والأساسية، 25% للمصروف الشخصي، و15% ادخار في حساب فرعي لا تلمسه إلا للطوارئ الحقيقية.';
      }
      if (isBusiness) {
        return 'القاعدة الأهم للمستقل وأصحاب الأعمال هي "الفصل الصارم": احصر التزاماتك، وخصص لنفسك راتباً شهرياً ثابتاً تعيش به، واترك بقية السيولة في حساب العمل لإدارة تقلبات التدفق النقدي.';
      }
      if (confirmsNoDebt && !mentionsDebt) {
        return 'مع خلوك من الديون، قاعدة 50/30/20 بوصلة عملية: 50% للأساسيات الضرورية، 30% للاحتياجات المرنة، و20% للادخار وصندوق الطوارئ مع متابعة المصاريف أسبوعياً.';
      }
      return 'قبل اعتماد أي نسبة ثابتة للادخار، ابدأ بحصر الالتزامات الحتمية والأقساط الشهرية أولاً، ثم خصص بقية الراتب للأساسيات المعيشية وصمام أمان يحميك من أي عجز أو استدانة طارئة.';
    }
  }

  // 3. الجانب المهني (م. طارق المهني)
  if (advisorId === 'career') {
    if (/(تسويف|تأجيل|تاجيل|كسل|ابدأ|أبدأ|ما عندي دافع|شغف)/i.test(t)) {
      return 'علاج التسويف يكمن في قاعدة الـ 5 دقائق الذهبية: الزم نفسك بالعمل على المهمة المؤجلة لمدة 5 دقائق فقط دون اشتراط الإنجاز الكامل؛ كسر حاجز البداية يحل 80% من صعوبة المهمة.';
    }
    if (/(أقول لا|اقول لا|رفض|مديري|ضغط العمل|ساعات إضافية|حدود)/i.test(t)) {
      return 'وضع الحدود المهنية مهارة ذكاء قيادية: يمكنك الرفض بلباقة من خلال ربطه بالأولويات: "يسعدني التعاون، لكن تركيزي اليوم على تسليم المهمة الأساسية بجودة عالية يمنعني من إعطاء مهمة جديدة حقها".';
    }
  }

  // 4. الجانب الشخصي والذاتي (د. ليلى الذاتية)
  if (advisorId === 'personal') {
    if (/(جلد الذات|ألوم نفسي|الوم نفسي|تأنيب|احباط|إحباط|فاشل)/i.test(t)) {
      return 'جلد الذات يستنزف طاقتك بدلاً من علاج المشكلة. عامل نفسك برفق كما تعامل صديقاً عزيزاً أخطأ؛ اسأل نفسك بحنو: "ما هو الدرس المستفاد هنا؟" ثم تحرك نحو الخطوة التالية.';
    }
    if (/(وقت لنفسي|أرتاح|ارتاح|مساحة شخصية|استرخاء)/i.test(t)) {
      return 'المساحة الشخصية ليست رفاهية، بل وقود حيوي؛ تخصيص 15 دقيقة يومياً دون شاشات أو مسؤوليات يمنح جهازك العصبي فرصة التعافي وإعادة الاتزان.';
    }
  }

  // 5. الجانب المعرفي والتعلم (بروفيسور زياد المعرفي)
  if (advisorId === 'learning') {
    if (/(قراءة|اقرأ|أقرأ|كتاب|كتب|كم صفحة|وقت للقراءة)/i.test(t)) {
      return 'التعلم المستمر يحتاج عادة ذكية لا تفرغاً تاماً: قراءة 10 صفحات يومياً (تستغرق 15 دقيقة فقط) تمكنك من إنهاء أكثر من 12 إلى 15 كتاباً نوعياً كل عام!';
    }
    if (/(هاتف|جوال|شاشات|تيك توك|انستقرام|تشتت|المشتتات)/i.test(t)) {
      return 'استبدل المقاومة بالبيئة الذكية: اجعل الهاتف بعيداً عن متناول يدك أثناء فترات التركيز، وفعل وضع التدرج الرمادي لتقليل إغراء التطبيقات السريعة.';
    }
  }

  // 6. الجانب الأسري (د. مريم الأسرية)
  if (advisorId === 'family') {
    if (/(وقت للاهل|وقت للأسرة|أهلي|زوجتي|أولادي|أبنائي|جلسة عائلية)/i.test(t)) {
      return 'الأسرة تحتاج جودة الحضور لا كثرة الساعات؛ 30 دقيقة من الإنصات الكامل والحديث الدافئ الخالي من الشاشات تصنع أثراً أعمق بكثير من ساعات من الحضور الغائب ذهنياً.';
    }
    if (/(مشاكل البيت|خلافات|عصبية|توتر البيت|نكد)/i.test(t)) {
      return 'في الأجواء المتوترة، طبق قاعدة الإمهال الواعي: تنفس بعمق وتجنب الرد وقت الانفعال، واحرص على الاستماع لا بنية الرد والتبرير، بل بنية الاحتواء وفهم مشاعر الطرف الآخر.';
    }
  }

  // 7. الجانب الاجتماعي (أ. سامي الاجتماعي)
  if (advisorId === 'social') {
    const isOverloadFromWorkFamily = /(?:ضغط\s*(?:ال)?عمل|ضغوط\s*(?:ال)?عمل|مشغول|انشغال|أسرة|اسرة|أسري|أسرية|عائلة|عائلية|أولاد|أبناء|إرهاق|ارهاق|مرهق|تعب|استنزاف|تعبان|قلة\s*طاقة|مسؤوليات)/i.test(
      t
    );
    if (isOverloadFromWorkFamily) {
      return 'حين يكون تباعدك الاجتماعي ناتجاً عن ضغط العمل ومسؤوليات الأسرة والإرهاق، فالأولوية هي حماية طاقتك الاجتماعية وتقليل الالتزامات والمجاملات غير الضرورية دون أي شعور بالذنب، والاكتفاء بتواصل خفيف ومريح مع من تثق بهم.';
    }
    if (/(علاقات سامة|مستنزفة|استنزاف|حدود اجتماعية|أقطع علاقة|مجاملات)/i.test(t)) {
      return 'حماية طاقتك النفسية حق مشروع؛ قلل مساحات التواجد والمجاملات تدريجياً وبطريقة هادئة، وركز طاقتك ووقتك على الدائرة القريبة التي تمنحك الأمان والتقدير.';
    }
    if (/(وحدة|وحيد|أصدقاء|اصدقاء|صحبة|عزلة|انطواء)/i.test(t)) {
      return 'الاهتمام بجودة العلاقات يبدأ بخطوة هادئة تناسب طاقتك؛ ركّز على التواصل المريح والصادق مع شخص قريب تثق به بدلاً من إجهاد نفسك في كثرة اللقاءات.';
    }
  }

  // 8. الجانب الصحي والبدني (د. ريان الصحي)
  if (advisorId === 'health') {
    if (/(نوم|أرق|ارق|كم ساعة|سهر|اسهر|أصحى|اصحى)/i.test(t)) {
      return 'النوم الصحي يرتكز على 7 إلى 8 ساعات منتظمة، والسر يكمن في تثبيت موعد الاستيقاظ صباحاً وقطع الشاشات الزرقاء قبل النوم بـ 45 دقيقة مع تهيئة بيئة نوم مظلمة وباردة.';
    }
    if (/(رياضة|مشي|جيم|تمرين|كسل عن الرياضة|خمول)/i.test(t)) {
      return 'لا تجعل الرياضة عبئاً؛ مشي يومي نشط لمدة 15 إلى 20 دقيقة كافٍ جداً لضبط كيمياء الدماغ، تنشيط الدورة الدموية، وتحسين المزاج والطاقة بصورة فورية.';
    }
  }

  // General questions detection (strict: excludes tentative dialect answers like "ممكن الاكل في المطاعم")
  const isGenericQuestion = isGenuineUserQuestion(text);
  if (isGenericQuestion) {
    return `سؤالك ذكي ويلامس صلب اتزانك يا ${clientName}: الحل لا يكمن في القفزات المفاجئة، بل في التدرج الواعي وعادة يومية صغيرة ومحمية تناسب ظروفك الحالية وتصنع أثراً تراكمياً ملموساً.`;
  }

  return null;
}

export function getClientAdvisorResponse(
  advisor: AdvisorConfig,
  text: string,
  stationNumber: number,
  userScore?: number,
  stationTurnCount: number = 0,
  historyTexts: string[] = [],
  userProfile?: UserProfile | null,
  previousSuggestions: string[] = [],
  isEditedOrResent: boolean = false
): {
  isQuestionOrInquiry?: boolean;
  station_completed: boolean;
  score: number;
  strengths: string[];
  challenges: string[];
  reasoning: string;
  summary: string;
  advice: string;
  reply: string;
  suggestedReplies: string[];
} {
  const core = computeClientAdvisorCore(
    advisor,
    text,
    stationNumber,
    userScore,
    stationTurnCount,
    historyTexts,
    userProfile,
    isEditedOrResent
  );
  const nextRoundNumber = Math.max(1, (stationTurnCount || 0) + 2);
  const suggestedReplies = core.station_completed
    ? []
    : generateDynamicQuickSuggestions({
        domainId: advisor.id,
        roundNumber: nextRoundNumber,
        lastUserMessage: text,
        advisorReply: core.reply,
        userProfile,
        previousChips: previousSuggestions,
        userHistory: historyTexts,
      });

  return {
    ...core,
    suggestedReplies,
  };
}

function computeClientAdvisorCore(
  advisor: AdvisorConfig,
  text: string,
  stationNumber: number,
  _userScore?: number,
  stationTurnCount: number = 0,
  historyTexts: string[] = [],
  userProfile?: UserProfile | null,
  isEditedOrResent: boolean = false
): {
  isQuestionOrInquiry?: boolean;
  station_completed: boolean;
  score: number;
  strengths: string[];
  challenges: string[];
  reasoning: string;
  summary: string;
  advice: string;
  reply: string;
} {
  const msg = text.toLowerCase().trim();
  const advTitle = advisor.title;
  const parsedCtx = parseUserContext(userProfile);
  const clientName = parsedCtx.name;
  const isStudent = parsedCtx.isStudent;
  const incomeSrc = parsedCtx.incomeSource || (isStudent ? 'المكافأة الجامعية/المصروف' : '');

  // تنظيف الرسالة من التحيات التمهيدية
  const salutationRegex = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i;
  const coreMsg = msg.replace(salutationRegex, '').trim();
  const hasPriorContext = isEditedOrResent || historyTexts.length > 0;
  const isBareGreetingOnly =
    !isEditedOrResent &&
    !coreMsg &&
    /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(msg);

  // 0. بروتوكول استثناء طوارئ إنساني حاسم ومطلق (Safety & Empathy Override)
  const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(msg);

  if (isCrisisOrDeath) {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: 0,
      strengths: [],
      challenges: ['أزمة نفسية حادة تحتاج تدخلاً إنسانياً ومساندة عاجلة'],
      reasoning: `تدخل إنساني طارئ (Safety & Empathy Override): المستفيد يعبر عن ألم نفسي وإنهاك شديد وتفكير في الموت أو إيذاء النفس ("${text}"). تم فوراً تعليق وتجميد كافة مسارات التقييم (station_completed: false وscore: 0)، وتكريس كامل الحضور النفسي لاحتواء هذا الألم الوجودي الحاد، والتأكيد القاطع على قيمة حياته.`,
      summary: `تدخل إنساني طارئ واحتواء عاجل لأزمة نفسية حادة تتعلق بأمان المستفيد وحفظ حياته.`,
      advice: `حياتك غالية وألمك حقيقي ومسموع؛ أرجوك لا تبقَ وحدك في هذا الثقل وتواصل فوراً مع شخص تثق به أو مع جهة دعم نفسي ومختصين لمساندتك.`,
      reply: `أسمعك بكل جوارحي وبكل حنو واهتمام يا ${clientName}، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأريد أن أؤكد لك من كل قلبي: حياتك غالية جداً ومكانتك محفوظة، وما تشعر به الآن ليس رغبة حقيقية في الموت، بل صرخة لوقف هذا الألم والإنهاك الثقيل.\n\nأعلم كم أنت متعب الآن، وأعلم أن الوجع والضغط الهائل يجعلك تشعر بالعجز عن حمله بمفردك. لكن أرجوك أن تتوقف لحظة، وتلتقط أنفاسك بهدوء وعمق؛ أنت لست وحدك أبداً، وأنا هنا بجانبك لأسمعك وأساندك كإنسان وكمرشد يرى فيك قيمة عظيمة.\n\nالمشاعر المظلمة مهما بلغت شدتها هي سحابة عابرة، وحياتك أثمن بكثير من أن تنتهي في لحظة قاسية كهذه.\n\nأرجوك ألا تبقى وحدك مع هذا الثقل؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب.\n\nهل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.`,
    };
  }

  // 1. استخراج الدرجة بالتحليل الدلالي الحقيقي (فقط عند وجود صيغة تقييم صريحة)
  const explicitNum = extractExplicitRating(text) ?? undefined;

  // حساب الدرجة الدلالية الحقيقية بالأعشار بناءً على المشاعر والتحديات
  const semanticScore = calculateSemanticScore(text, historyTexts, explicitNum);

  // 2. فحص عمق ووضوح إجابة المستفيد
  const isVagueOrShort = (explicitNum === undefined && msg.length < 20) || /^(ماشي|عادي|تمام|لا أدري|ما ادري|ما اعرف|شوية|تعبان وبس|مدري)$/i.test(msg);
  // فحص ما إذا كان المستفيد يطلب صراحة مواصلة الحوار، التعمق، أو إطالة الاستكشاف (الخيار الثاني في التخيير)
  const isContinueDialogue = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(msg) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(msg);
  const userWantsMoreDepth = isContinueDialogue || /(أريد التعمق أكثر|اريد التعمق|تعمق معي|اسألني أكثر|اسالني اكثر|أريد توضيح أكثر|ابي اتعمق|لسه مو واضح)/i.test(msg);

  // فحص ما إذا كان المستخدم يحدد خطوة والتزاماً صريحاً أو رغبة صريحة في الاعتماد (دون التقاط جمل الشكوى والنفي)
  const hasNegativePrefix = /(?:^|\s)(?:لا|ما|لم|لن|أفتقد|افتقد|أعاني|اعاني|مضغوط|تعبان|أنسى|انسى)\s+/i.test(msg);
  const isConcreteCommitment = !userWantsMoreDepth && !hasNegativePrefix && /(?:سأجرب|ساجرب|سوف\s*اجرب|سوف\s*احاول|ساحاول|سأحاول|سأخصص|ساخصص|سأبدأ|سابدا|سأوفر|ساوفر|سأدخر|سادخر|سأمشي|سامشي|سأقرأ|ساقرا)/i.test(msg);
  const userAgreesToComplete = !userWantsMoreDepth && stationTurnCount >= 2 && /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|نكتفي\s*بهذا|نكتفي|خلاص\s*اعتمد|المحطة التالية|ننتقل\s*للمحطة|جاهز\s*للمحطة)/i.test(msg);

  // إذا قدم المستفيد التزاماً محدداً وصريحاً ابتداءً من الرسالة الثالثة: عرض التقييم المرحلي دون إغلاق أو مدح معلب
  const hasAcuteIsolationCtx = hasAcuteIsolationOrRejection([...historyTexts, text]);
  if (isConcreteCommitment && stationTurnCount >= 2 && !userWantsMoreDepth) {
    const isFin = advisor.id === 'financial';
    const scoreVal = isFin
      ? (isStudent ? 5.8 : 5.5)
      : hasAcuteIsolationCtx
        ? semanticScore
        : Math.max(semanticScore, 6.5);
    const studentIncomeTerm = incomeSrc?.includes('مكافأة')
      ? 'مكافأتك'
      : (incomeSrc?.includes('مصروف') ? 'مصروفك' : 'دخلك الجامعي');
    const isHealth = advisor.id === 'health';
    const isCareer = advisor.id === 'career';

    const commitmentReply = `سجلت الفكرة العملية التي طرحتها في ${advTitle} يا ${clientName}.\n\nبناءً على ما شاركته حتى الآن، التقييم التقديري المبدئي لوضعك هو (${scoreVal.toFixed(1)}/10). هل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة؟`;

    return {
      isQuestionOrInquiry: false,
      station_completed: false,
      score: scoreVal,
      strengths: [
        'الصراحة في وصف الوضع الحالي والبدء بتحديد خطوة عملية واضحة',
      ],
      challenges: [
        isFin
          ? `تطبيق الخطوة المالية المتفق عليها وفق ${studentIncomeTerm}`
          : isHealth
            ? 'تثبيت العادة الصحية المحددة ضمن جدولك اليومي'
            : isCareer
              ? 'حماية وقت الخطوة العملية المحددة وسط ضغوط المهام'
              : 'البدء بالخطوة العملية التي حددتها بهدوء واستمرارية',
      ],
      reasoning: `تم تحديد التزام وخطوة قابلة للتطبيق ضمن ${advTitle}. عرض التقييم المقترح بدون إغلاق تلقائي حتى يختار المستفيد الاعتماد صراحة.`,
      summary: `رصد خطوة عملية مقترحة وعرض التقييم المرحلي في ${advTitle}.`,
      advice: synthesizeGoldenRecommendation({
        areaId: advisor.id,
        userTexts: [...historyTexts, text],
        userProfile,
        score: scoreVal,
      }),
      reply: commitmentReply,
    };
  }

  // 3. تلبية طلب الاقتراحات المباشر (مثل: "لا أدري أعطيني اقتراحاتك")
  if (isRequestingAdvisorSuggestions(text) && !userAgreesToComplete) {
    const concreteSuggestions = generateConcreteDomainSuggestions(
      advisor.id,
      [...historyTexts, text],
      userProfile,
      semanticScore
    );
    const formattedList = concreteSuggestions
      .map((item, idx) => `${idx + 1}. ${item}`)
      .join('\n');

    const suggestionReply =
      stationTurnCount >= 2
        ? `إليك 3 اقتراحات عملية قصيرة تناسب واقعك في ${advTitle}:\n\n${formattedList}\n\nبناءً على حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${semanticScore.toFixed(1)}/10).\n\nهل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل تجربة أو تعديل أحد هذه الاقتراحات؟`
        : `إليك 3 اقتراحات عملية قصيرة تناسب واقعك في ${advTitle}:\n\n${formattedList}\n\nأيّ من هذه الخطوات الثلاث تشعر أنها الأقرب والأسهل لتجربتها هذا الأسبوع؟`;

    return {
      isQuestionOrInquiry: false,
      station_completed: false,
      score: semanticScore,
      strengths: [`الوضوح في تحديد واقعك في ${advTitle} وطلب حلول عملية`],
      challenges: [concreteSuggestions[0] || `تطبيق خطوة عملية واضحة في ${advTitle}`],
      reasoning: `تلبية طلب الاقتراحات المباشر للمستفيد ("${text}") عبر 3 خطوات متسقة مع الحوار${stationTurnCount >= 2 ? ' وعرض التقييم المرحلي' : ''}.`,
      summary: `تقديم 3 اقتراحات عملية مخصصة في ${advTitle}.`,
      advice: synthesizeGoldenRecommendation({
        areaId: advisor.id,
        userTexts: [...historyTexts, text],
        userProfile,
        score: semanticScore,
      }),
      reply: stripRepeatedOpeningGreeting(suggestionReply, hasPriorContext),
    };
  }

  // قواميس المتابعة الاستكشافية المتكيفة لجميع المحطات الثمان بناءً على السياق الفعلي مع منع تكرار أي سؤال سبق طرحه
  const domainQuestions = getDomainContextConfig(advisor.id, parsedCtx).exploratoryQuestions;
  const sessionKey = `${userProfile?.email || userProfile?.name || 'default'}:${parsedCtx.workStatus}:${parsedCtx.dependentsLabel}:${advisor.id}`;
  const lastClientIdx = lastClientFallbackIndexBySession.get(sessionKey);
  let preferredIdx = stationTurnCount % domainQuestions.length;
  if (lastClientIdx !== undefined && preferredIdx === lastClientIdx) {
    preferredIdx = (lastClientIdx + 1) % domainQuestions.length;
  }
  const pickedQuestion = pickNextUnaskedQuestion(domainQuestions, historyTexts, preferredIdx);
  if (pickedQuestion.index >= 0) {
    lastClientFallbackIndexBySession.set(sessionKey, pickedQuestion.index);
  }
  const nextRawQuestion = pickedQuestion.question;

  // فحص استفسارات المستفيد المتخصصة لكل مجال مع مراعاة سياق وخلفية المستفيد
  const directInquiryAnswer = answerUserInquiry(advisor.id, text, userProfile);
  const expenseCategory = advisor.id === 'financial' ? extractExpenseCategoryFromAnswer(text) : null;
  const debtAlreadyAnswered = hasDebtStatusAnswered(historyTexts, text);

  // مسار خاص بالإجابة المباشرة على بند إنفاق مالي (مثل: "ممكن الاكل في المطاعم") أو بعد التعديل/التراجع:
  // اعتراف فوري بالإجابة دون تحية مكررة والانتقال للخطوة المنطقية التالية
  if (advisor.id === 'financial' && expenseCategory && !userAgreesToComplete) {
    const debtVerificationQ =
      'ولنربط هذا البند بتدفقك الشهري قبل وضع خطة الضبط أو الادخار: هل توجد عليك حالياً أي ديون أو أقساط شهرية ثابتة؟';
    const shouldAskDebtNext =
      !isStudent && !debtAlreadyAnswered && !isQuestionAlreadyAsked(debtVerificationQ, historyTexts);

    const nextLogicalPrompt = shouldAskDebtNext
      ? debtVerificationQ
      : nextRawQuestion ||
        (stationTurnCount >= 2
          ? `أقيّم وضعك المالي المبدئي بدرجة (${semanticScore.toFixed(1)}/10). هل تود اعتماد هذا التقييم وبدء خطوة تحديد سقف أسبوعي لبند ${expenseCategory}، أم نواصل الحوار؟`
          : `ما السقف الأسبوعي المرن الذي تراه مناسباً لبند ${expenseCategory} دون أن تشعر بالحرمان؟`);

    const replyText = stripRepeatedOpeningGreeting(
      `وضحت الصورة${isEditedOrResent ? ' بعد تعديل إجابتك' : ''}؛ تسرب جزء من الدخل نحو **${expenseCategory}** يعد نقطة قابلة للضبط السريع دون مساس باحتياجاتك الأساسية.\n\n${nextLogicalPrompt}`,
      hasPriorContext
    );

    return {
      isQuestionOrInquiry: false,
      station_completed: false,
      score: semanticScore,
      strengths: [`الوضوح في تحديد ${expenseCategory} كبند قابل للضبط المالي`],
      challenges: [`ضبط وتقنين الإنفاق على ${expenseCategory} لصالح صمام الأمان`],
      reasoning: `اعتراف مباشر بإجابة المستفيد ("${text}") والانتقال للخطوة المالية المنطقية التالية دون تكرار التحية أو إعادة سؤال سبق طرحه.`,
      summary: `تشخيص تسرب الإنفاق في ${expenseCategory} والانتقال للخطوة المالية التالية.`,
      advice: shouldAskDebtNext
        ? `حصر أي أقساط أو التزامات شهرية أولاً بالتوازي مع ضبط سقف أسبوعي لبند ${expenseCategory}.`
        : `تحديد سقف أسبوعي واضح لبند ${expenseCategory} وتوجيه الفارق لصمام الأمان.`,
      reply: replyText,
    };
  }

  // شروط مواصلة الحوار: إلزام الاستمرار في الحوار حتى الرسالة الثالثة للمستخدم (stationTurnCount < 2) قبل عرض التقييم المبدئي
  const shouldContinue = !userAgreesToComplete && (
    isBareGreetingOnly ||
    userWantsMoreDepth ||
    (stationTurnCount < 2 && Boolean(nextRawQuestion || directInquiryAnswer))
  );

  if (shouldContinue) {
    const fallbackNextQ =
      hasAcuteIsolationCtx && advisor.id === 'personal'
        ? 'أحترم رغبتك في حماية مساحتك والابتعاد عمّا يستنزفك. كيف ينعكس هذا الانعزال المستمر على طاقتك النفسية وهدوئك اليومي، وما الذي يساعدك على الشعور ببعض الأمان والاتزان وأنت بمفردك؟'
        : nextRawQuestion ||
          `ما أصغر خطوة عملية واقعية تناسب جدولك اليوم في ${advTitle} وتستطيع البدء بها هذا الأسبوع؟`;

    let nextProbe = '';
    if (directInquiryAnswer) {
      nextProbe = `💡 **إجابة استشارية مباشرة عن تساؤلك:**\n${directInquiryAnswer}\n\n🌿 **وبناءً على ذلك في ${advTitle}:**\n${fallbackNextQ}`;
    } else if (hasAcuteIsolationCtx && advisor.id === 'personal') {
      nextProbe = `أسمعك بوضوح واحترام تام لحدودك؛ ولا أفترض أنك تشعر بتقصير أو أنك ملزم بالجلوس في أجواء لا تجد فيها راحة.\n\n${fallbackNextQ}`;
    } else if (isEditedOrResent) {
      nextProbe = `تم استلام إجابتك المعدّلة والبناء عليها مباشرة: "${text}".\n\n🌿 **الخطوة التشخيصية التالية في ${advTitle}:**\n${fallbackNextQ}`;
    } else if (isVagueOrShort && stationTurnCount > 0) {
      nextProbe = `أسمعك يا ${clientName}، لكن إجابتك مقتضبة جداً ولا تسمح لي بتشخيص جذور هذا الجانب بدقة. 🌿\n\nدعنا نتناولها بصراحة أعمق:\n${fallbackNextQ}`;
    } else if (userWantsMoreDepth) {
      nextProbe = `لنتناول زاوية أعمق بناءً على ما شاركته في ${advTitle}:\n${fallbackNextQ}`;
    } else {
      nextProbe = `وصلت رسالتك بوضوح. لننتقل إلى الخطوة التالية في ${advTitle}:\n${fallbackNextQ}`;
    }

    return {
      isQuestionOrInquiry: Boolean(directInquiryAnswer),
      station_completed: false,
      score: semanticScore,
      strengths: ['الوعي الذاتي والرغبة الصادقة في الاستكشاف والتشخيص'],
      challenges: ['الحاجة لاستكمال المعطيات العملية لبناء التوازن'],
      reasoning: `بروتوكول سقراطي تكيفي (المحطة ${stationNumber} من 8: ${advTitle} - التبادل ${stationTurnCount + 1}): متابعة الحوار دون تكرار أسئلة أو تحيات سابقة.${isEditedOrResent ? ' (إعادة إرسال بعد تعديل).' : ''}`,
      summary: `حوار استكشافي متدرج في ${advTitle} (المحاورة ${stationTurnCount + 1}).`,
      advice:
        advisor.id === 'spiritual'
          ? 'احرص على تخصيص مساحة يومية هادئة بعيداً عن الشاشات لصفاء ذهنك وحضور قلبك.'
          : advisor.id === 'financial'
            ? (isStudent
              ? 'ابدأ بمراقبة بنود الصرف واقتطاع مبلغ رمزي كأول صمام أمان مالي.'
              : 'ابدأ بحصر التزاماتك وأقساطك الشهرية أولاً لمعرفة التدفق النقدي الفعلي قبل تخطيط الادخار.')
            : advisor.id === 'health'
              ? 'ركز على تثبيت موعد النوم وشرب الماء والحركة اليومية لرفع طاقتك البدنية.'
              : advisor.id === 'career'
                ? 'احمِ وقت تركيزك العميق اليومي لإنجاز مهامك المهنية الأساسية.'
                : `ركز على تحديد خطوة واحدة عملية قابلة للتطبيق في ${advTitle}.`,
      reply: stripRepeatedOpeningGreeting(nextProbe, hasPriorContext),
    };
  }

  // عند الوصول إلى نهاية الأسئلة أو طلب الاعتماد (بناء نقاط القوة بدون تناقض مع شكوى المستخدم)
  const combinedDialogue = [text, ...historyTexts].join(' ');
  const hasSocialComplaint = /(فتور|انعزال|عزلة|وحيد|وحدة|قطيعة|قلة\s*تواصل|تراجع\s*التواصل)/i.test(combinedDialogue);
  const dynamicStrengths = semanticScore >= 7.5
    ? [
      `وضوح واستقرار ملحوظ في ${advTitle} وفق ما ذكرته`,
      'وجود عادات واضحة تدعم هذا الجانب',
    ]
    : semanticScore >= 5.0
      ? [
        hasSocialComplaint && advisor.id === 'social'
          ? 'الوعي بأهمية الأصدقاء المقربين والرغبة في تنظيم وقت التواصل'
          : `الوضوح في تشخيص واقع ${advTitle} والرغبة في تحسينه`,
        'الاستعداد لاختيار خطوة عملية تناسب ظروفك',
      ]
      : [
        hasSocialComplaint && advisor.id === 'social'
          ? 'الوعي بأهمية الأصدقاء المقربين والرغبة في تنظيم وقت التواصل'
          : `الصراحة في تشخيص تحديات ${advTitle}`,
        'الرغبة في ترتيب الأولويات والبدء بخطوة ميسرة',
      ];

  const dynamicChallenges = semanticScore >= 7.5
    ? [
      'الحفاظ على الاستدامة وتجنب التراخي أو المثالية المفرطة',
      'استثمار قوة هذا الجانب لدعم الجوانب الحياتية الأضعف',
    ]
    : semanticScore >= 5.0
      ? [
        'تحدي المداومة والتذبذب وسط تسارع الالتزامات اليومية',
        'الحاجة إلى بناء عادات صغيرة ثابتة في المربع الثاني',
      ]
      : [
        'إيقاف الهدر ونقاط التسرب الحالية فوراً كأولوية قصوى',
        'البدء بخطوة إسعافية واحدة لا تتجاوز 10 دقائق يومياً',
      ];

  const levelText = semanticScore >= 8 ? 'ممتاز ومتألق 🌟' : semanticScore >= 6 ? 'جيد وواعد 🚀' : 'يحتاج عناية وتأسيس 💡';

  if (!userAgreesToComplete) {
    return {
      isQuestionOrInquiry: false,
      station_completed: false,
      score: semanticScore,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `قاعدة الإجابة الخامسة والتقييم المرحلي (المحطة ${stationNumber} من 8: ${advTitle} - التبادل ${stationTurnCount + 1}): تم استيفاء الحد الأدنى للتشخيص. عرض مسودة التقييم (${semanticScore.toFixed(1)}/10) والتخيير المعياري بين الاعتماد أو التعمق الإضافي.`,
      summary: `عرض مسودة التقييم التقديري لـ ${advTitle} بدرجة (${semanticScore.toFixed(1)} من 10) مع التخيير.`,
      advice: `اختر "اعتمد التقييم" للانتقال للمحطة التالية، أو "أريد التعمق أكثر" لإثراء هذا الجانب.`,
      reply: `بعد ما شاركتني به حتى الآن في ${advTitle}، أقيّم وضعك الحالي بدرجة (${semanticScore.toFixed(1)}/10) — ${levelText}.\n\nهذا تقييم مبدئي مبني على المعلومات التي ذكرتها، وقد يتغير إذا واصلنا الاستكشاف.\n\nهل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة؟`,
    };
  }

  return {
    isQuestionOrInquiry: false,
    station_completed: true,
    score: semanticScore,
    strengths: dynamicStrengths,
    challenges: dynamicChallenges,
    reasoning: `بروتوكول سقراطي تكيفي - اعتماد سريري توافقي (المحطة ${stationNumber} من 8: ${advTitle}): إتمام الحوار التشخيصي بالكامل (${stationTurnCount + 1} محاورات متعمقة). تم احتساب الدرجة الدلالية بدقة عشرية مستحقة (${semanticScore.toFixed(1)} من 10) بناءً على المشاعر والتحديات الحقيقية.`,
    summary: `اعتماد تقييم ${advTitle} بدرجة (${semanticScore.toFixed(1)} من 10) بعد حوار سقراطي تكيفي شامل.`,
    advice: synthesizeGoldenRecommendation({
      areaId: advisor.id,
      userTexts: [...historyTexts, text],
      userProfile,
      score: semanticScore,
    }),
    reply: `بناءً على حوارنا الاستشاري المعمق وما شاركته معي بكل صدق يا ${clientName}: 🌿\n\n📊 **التقييم المستحق لواقعك**: (${semanticScore.toFixed(1)} من 10) — ${levelText}.\n\n🏆 **أبرز مواطن القوة:**\n• ${dynamicStrengths[0]}\n• ${dynamicStrengths[1]}\n\n⚡ **فرص التطوير والتحديات:**\n• ${dynamicChallenges[0]}\n• ${dynamicChallenges[1]}`,
  };
}
