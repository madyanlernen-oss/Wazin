import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { VoiceInput } from '../components/VoiceInput';
import { FormattedChatMessage, isolateNumbersInText } from '../components/FormattedChatMessage';
import { CrisisSupportCard, isCrisisMessage } from '../components/CrisisSupportCard';
import {
  Send,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Check,
  User,
  Lightbulb,
  ChevronDown,
  MessageSquare,
  ArrowLeft,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../types/lifeBalance';
import {
  STATION_ASSESSMENT_CONFIG,
  StationAssessmentConfig,
} from '../data/assessmentQuestions';
import {
  calculateScoreForAdvisor,
  extractInsightsFromAnswers,
  isAdvisorWeeklyLocked,
} from '../utils/storage';
import { AI_MODES, AiModelMode } from './AdvisorChatScreen';

interface EvaluationChatMessage {
  id: string;
  sender: 'advisor' | 'user';
  text: string;
  timestamp: string;
  reasoning?: string;
  summary?: string;
  advice?: string;
  isCrisis?: boolean;
  source?: 'gemini' | 'groq' | 'local-fallback';
}

interface StationDynamicInsights {
  score: number;
  strengths: string[];
  challenges: string[];
}

interface OnboardingScreenProps {
  initialAdvisorId?: LifeAreaId;
  answers: Record<string, any>;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => void;
  onResetAdvisor?: (advisorId: LifeAreaId) => void;
  onStartNewWeeklyAssessment?: () => void;
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onNavigateToDashboard: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
  onAddEisenhowerGoal?: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  theme?: 'light' | 'dark';
}

// Helper: Local client intelligence engine for all advisors (offline, static hosting, or fallback)

// Helper: Psychometric semantic scoring engine (Linguistic sentiment & distress analysis with decimal precision)
export function calculateSemanticScore(
  text: string,
  historyTexts: string[] = [],
  explicitScore?: number
): number {
  if (explicitScore !== undefined && explicitScore >= 1 && explicitScore <= 10) {
    return Number(explicitScore.toFixed(1));
  }

  const allText = [text, ...historyTexts].join(' ').toLowerCase();

  // 1. Severe breakdown & collapse (1.5 - 3.0)
  const severeNegativePatterns = [
    /(مدمر|محطم|كارثي|كارثة|صفر|ضياع تام|ضائع كليا|لا املك شيء|مفلس تماما|غارق ديون|غرقان ديون|لا اصلي ابدا|تارك الصلاة|ما اصلي نهائيا|انعدام|طاقتي صفر|نومي مدمر|ما انام ابدا|فاشل جدا|اكره حياتي|مكتئب جدا|منهار|مخنوق تماما|مفيش امل|منعدم|مديونية خانقة|صفر ريال)/i
  ];

  // 2. Strong negative & high struggle (3.1 - 4.4)
  const strongNegativePatterns = [
    /(سيء جدا|سلبي جدا|غير راض ابدا|ضياع|يضيع بسرعة|الوقت يضيع|ما في فايدة|ما اقدر|عاجز|مستنزف|قلق دائم|خوف مستمر|توتر شديد|سهر مستمر|ارق شديد|خمول مستمر|كسل شديد|تراكم|تسويف دائم|ديون كثيرة|راتب لا يكفي|ما اقدر اوفر|عزلة تامة|وحيد تماما|فجوة كبيرة|مشاكل مستمرة|نزاع دائم|تعبت من الوضع|مخنوق|تعبان كثير|فاقد السيطرة|بدون هدف|ما اصلي|اقصر بالصلاة|سلبي تماما|سلبي جدا)/i
  ];

  // 3. Moderate negative & inconsistency (4.5 - 5.6)
  const moderateNegativePatterns = [
    /(تشتت|تسويف|تأجيل|مشتت|فتور|تراجع|تذبذب|صعوبة|ضغط|مرهق|تعبان|متعب|مشغول|انشغال|قلق|توتر|تقصير|أقصر|اقصر|روتين|ملل|ما عندي وقت|سطحية|خمول|سهر|ضيق وقت)/i
  ];

  // 4. Moderate positive & improving (6.1 - 7.3)
  const moderatePositivePatterns = [
    /(مقبول|جيد نوعا ما|احاول|أحاول|اتحسن|أتحسن|خطوة طيبة|وعي|راض نسبيا|ماشي الحال|استقرار متوسط|احيانا ملتزم|بديت اتعلم|علاقة طيبة|احسن من قبل|تطور بسيط|في تحسن)/i
  ];

  // 5. Strong positive & balanced (7.6 - 8.8)
  const strongPositivePatterns = [
    /(ممتاز|جيد جدا|سكينة|طمأنينة|ورد يومي|صلاة في وقتها|خشوع|انضباط مالي|ادخار منتظم|صندوق طوارئ|انجاز عالي|شغف|تطور مستمر|تصالح مع الذات|قراءة مستمرة|تعلم دائم|ترابط اسري|حوار دافئ|اصدقاء اوفياء|نوم عميق|نشاط وحيوية|رياضة مستمرة|راحة بال)/i
  ];

  // 6. Outstanding (8.9 - 9.7)
  const outstandingPositivePatterns = [
    /(مثالي|استثنائي|فوق الممتاز|شغف عالي جدا|سلام داخلي عميق|استقلال مالي|حرية مالية|انتاجية استثنائية|ثقة مطلقة|عطاء ملهم|صحة حديدية|انجاز عظيم)/i
  ];

  // Length & character variance for realistic decimal precision
  const charHash = allText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = (charHash % 9) * 0.1; // 0.0 - 0.8

  let calculated = 5.2;

  if (severeNegativePatterns.some((p) => p.test(allText))) {
    calculated = 1.8 + variance * 0.8;
  } else if (strongNegativePatterns.some((p) => p.test(allText))) {
    calculated = 2.8 + variance * 0.9;
  } else if (moderateNegativePatterns.some((p) => p.test(allText))) {
    calculated = 4.3 + variance * 0.9;
  } else if (outstandingPositivePatterns.some((p) => p.test(allText))) {
    calculated = 9.0 + (variance % 6) * 0.12;
  } else if (strongPositivePatterns.some((p) => p.test(allText))) {
    calculated = 7.7 + variance * 0.9;
  } else if (moderatePositivePatterns.some((p) => p.test(allText))) {
    calculated = 6.2 + variance * 0.9;
  }

  return Number(Math.max(1.5, Math.min(9.8, calculated)).toFixed(1));
}

// Helper: Specialized consultative FAQ and Q&A responder for common user inquiries per domain
function answerUserInquiry(advisorId: string, text: string): string | null {
  const t = text.toLowerCase().trim();

  // 1. الجانب الروحي والسكينة (د. سفيان الروحي)
  if (advisorId === 'spiritual') {
    if (/(خلوة|الخلوة|وقت|مكان|مساحة|ساعة|كم دقيقة|كم وقت|طول الوقت|كم يجب|مكان هادئ|صمت)/i.test(t)) {
      return 'سؤالك دقيق وجوهري يا صديقنا: الخلوة الروحية لا تشترط ساعات طويلة ولا مكاناً فسيحاً خاصاً! تكفيك 5 إلى 10 دقائق فقط في بداية يومك أو قبل نومك، في زاوية هادئة من غرفتك أو حتى في سيارتك قبل النزول. المقصود ليس الانعزال الجغرافي أو المكاني، بل هدوء الذهن وانقطاع الهاتف والمشتتات لتتنفس وتستشعر قرب الخالق وسكينة صدرك وسلامك الداخلي.';
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

  // 2. الجانب المالي (أ. كمال المالي)
  if (advisorId === 'financial') {
    if (/(طوارئ|طواريء|صندوق|ادخار|أدخر|ادخر|توفير|أوفر)/i.test(t)) {
      return 'بناء صندوق الطوارئ يبدأ بقرار ميسر: اقتطاع مبلغ صغير في حساب بنكي منفصل تماماً (يبدأ براتب شهر واحد كهدف أولي أو حتى مبلغ رمزي شهرياً)، ليكون صمام أمان يحميك من الديون المفاجئة.';
    }
    if (/(دين|ديون|قرض|سداد|أقساط|اقساط|بطاقة|فيزا)/i.test(t)) {
      return 'القاعدة الذهبية في التحرر من الديون هي البدء بأصغر دين حجماً لسداده سريعاً (طريقة كرة الثلج) لتشعر بنشوة الإنجاز والتحرر، مع التجميد الفوري لكافة بطاقات الائتمان.';
    }
    if (/(ميزانية|راتب|مصاريف|يتسرب|وين يروح|أين يذهب)/i.test(t)) {
      return 'قاعدة 50/30/20 هي البوصلة الأبسط: 50% للأساسيات الضرورية، 30% للاحتياجات المرنة، و20% للادخار وصندوق الطوارئ مع تسجيل المصاريف أسبوعياً لتحديد مزاريب التسرب.';
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
    if (/(وحدة|وحيد|أصدقاء|اصدقاء|صحبة|عزلة|انطواء)/i.test(t)) {
      return 'العلاقات الصادقة تُبنى حول الاهتمامات والقيم المشتركة؛ جرب الانضمام لمجتمع قراءة، تطوع، أو نشاط رياضي، فالصحبة الملهمة تأتي عبر الأنشطة ذات المعنى.';
    }
    if (/(علاقات سامة|مستنزفة|استنزاف|حدود اجتماعية|أقطع علاقة)/i.test(t)) {
      return 'حماية طاقتك النفسية حق مشروع؛ قلل مساحات التواجد والمجاملات تدريجياً وبطريقة هادئة، وركز طاقتك ووقتك على الدائرة القريبة التي تمنحك الأمان والتقدير.';
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

  // General questions detection
  const isGenericQuestion = /[؟?]/.test(text) || /(^|\s)(كم|كيف|هل|ماذا|ليه|ليش|وش|شو|ايش|متى|ينفع|ممكن|تنصحني|رايك|رأيك)/i.test(text);
  if (isGenericQuestion) {
    return 'سؤالك ذكي ويلامس صلب اتزانك يا صديقنا: الحل لا يكمن في القفزات المفاجئة، بل في التدرج الواعي وعادة يومية صغيرة ومحمية تناسب ظروفك الحالية وتصنع أثراً تراكمياً ملموساً.';
  }

  return null;
}

export function getClientAdvisorResponse(
  advisor: AdvisorConfig,
  text: string,
  stationNumber: number,
  _userScore?: number,
  stationTurnCount: number = 0,
  historyTexts: string[] = []
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

  // تنظيف الرسالة من التحيات التمهيدية
  const salutationRegex = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i;
  const coreMsg = msg.replace(salutationRegex, '').trim();
  const isBareGreetingOnly = !coreMsg && /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(msg);

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
      reply: `أسمعك بكل جوارحي وبكل حنو واهتمام يا صديقنا العزيز، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأريد أن أؤكد لك من كل قلبي: حياتك غالية جداً ومكانتك محفوظة، وما تشعر به الآن ليس رغبة حقيقية في الموت، بل صرخة لوقف هذا الألم والإنهاك الثقيل.\n\nأعلم كم أنت متعب الآن، وأعلم أن الوجع والضغط الهائل يجعلك تشعر بالعجز عن حمله بمفردك. لكن أرجوك أن تتوقف لحظة، وتلتقط أنفاسك بهدوء وعمق؛ أنت لست وحدك أبداً، وأنا هنا بجانبك لأسمعك وأساندك كإنسان وكمرشد يرى فيك قيمة عظيمة.\n\nالمشاعر المظلمة مهما بلغت شدتها هي سحابة عابرة، وحياتك أثمن بكثير من أن تنتهي في لحظة قاسية كهذه.\n\nأرجوك ألا تبقى وحدك مع هذا الثقل؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب.\n\nهل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.`,
    };
  }

  // 1. استخراج الدرجة بالتحليل الدلالي الحقيقي (Semantic Decimal Scoring)
  const ratingMatch = msg.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)?\s*10)?$/i) || msg.match(/^(?:تقييمي:?\s*)?\d+(?:\.\d+)?/i);
  const explicitNum = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[0].replace(/[^\d.]/g, '')) : undefined;
  
  // حساب الدرجة الدلالية الحقيقية بالأعشار بناءً على المشاعر والتحديات
  const semanticScore = calculateSemanticScore(text, historyTexts, explicitNum);

  // 2. فحص عمق ووضوح إجابة المستفيد
  const isVagueOrShort = (!explicitNum && msg.length < 20) || /^(ماشي|عادي|تمام|لا أدري|ما ادري|ما اعرف|شوية|تعبان وبس|مدري)$/i.test(msg);
  const userWantsMoreDepth = /(أريد التعمق أكثر|اريد التعمق|تعمق معي|اسألني أكثر|اسالني اكثر|أريد توضيح أكثر|ابي اتعمق|لسه مو واضح)/i.test(msg);
  const userAgreesToComplete = /(اعتمد التقييم|اعتمد|اعتماد|موافق|نعم دقيقة|تمام اعتمد|نكتفي بهذا|خلاص اعتمد|اعتمدها)/i.test(msg);

  // قواميس المتابعة الاستكشافية لكل مجال (Adaptive Domain Inquiries)
  const EXTENDED_DOMAIN_QUESTIONS: Record<string, string[]> = {
    spiritual: [
      'أين يضيع الوقت والصفاء تحديداً يا صديقنا؟ هل تلتهمه الشاشات والهاتف، أم تسارع ضغوط الحياة؟ وكيف ينعكس هذا الضياع على هدوء عقلك وسكينة روحك في خلواتك؟',
      'صف لي علاقتك بصلاتك أو تأملك الروحي ومساحة اتصالك اليومية بما تؤمن به: هل تشعر فيها بالسكينة وحضور القلب أم تؤديها كواجب سريع يسرقه شتات الذهن؟ وما أكبر عائق يحول بينك وبين صفاء داخلك؟',
      'سلامة قلبك من هذا الثقل. ما هو منبع هذا القلق أو التعب تحديداً؟ وهل تملك في يومك مساحة خلوة هادئة، أو دعاء، أو تأمل يساعدك على تفريغ الضغوط واستعادة سكينة صدرك؟',
      'كيف ينعكس هذا التشتت على صفائك النفسي وأولوياتك في الحياة؟ وهل تشعر بأنك تفقد بوصلتك الداخلية حين تغيب عنك لحظات السكون والاتصال القلبي؟',
      'ما هي العادة الروحية البسيطة (مثل 5 إلى 10 دقائق خلوة صامتة، أو لحظات امتنان وتأمل هادئ) التي تشعر أنك لو ثبتّها ستعيد ترتيب سلامك الداخلي بالكامل؟',
      'إذا تأملت في أسبوعك الماضي، ما الموقف الذي شعرت فيه بأقصى درجات الضغط الروحي أو النفسي؟ وما الذي كان ينقصك في تلك اللحظة لتستعيد توازنك؟',
      'كيف ترى أثر التسامح وتفريغ الأحقاد والضغائن في قلبك؟ هل تحمل عتباً أو ثقلاً من علاقات سابقة يستنزف طاقتك وسلامك الداخلي؟',
      'ما هي رؤيتك لمعنى الغاية العليا والرسالة في حياتك؟ هل تشعر أن يومك يخدم معنى حقيقياً يمنحك الرضا، أم تدور في حلقة روتينية مفرغة؟',
      'لو أردنا الاتفاق على خطوة روحية واحدة نلتزم بها هذا الأسبوع، ما الممارسة الروحية أو العمل القلبي الأقرب لسلام روحك الآن؟'
    ],
    financial: [
      'ثقل الالتزامات المالية مرهق حتماً. كم التزاماً يضغط عليك حالياً؟ وهل تملك خطة واضحة لترتيب أولويات السداد، أم تشعر بالتخبط؟',
      'تسرب الدخل مشكلة شائعة جداً. أين يذهب الجزء الأكبر من دخلك دون أن تشعر؟ وهل لديك صندوق طوارئ مرصود يحميك من المفاجآت؟',
      'هل تسجل مصاريفك بانتظام وتعرف بدقة أين تذهب أموالك، أم تعتمد على التقدير الذهني؟ وما البند الأكثر استنزافاً لميزانيتك؟',
      'كيف يؤثر هذا الضغط المالي على راحة بالك وقراراتك اليومية وعلاقاتك بمن حولك؟ وهل يسبب لك أرقاً أو قلقاً مستمراً من المستقبل؟',
      'ما هي الخطوة المالية العاجلة التي لو نفذتها هذا الشهر (مثل وقف بطاقة ائتمان أو إلغاء اشتراكات) ستوقف النزيف المالي فوراً؟',
      'هل تملك مصدراً إضافياً للدخل أو مهارة قابلة للتحويل إلى تدفق نقدي، أم تعتمد كلياً على مصدر دخل واحد؟',
      'كيف تتصرف أمام إغراءات الشراء العاطفي والعروض الترويجية؟ هل تمنح نفسك قاعدة الـ 48 ساعة قبل أي شراء غير ضروري؟',
      'لو وضعنا هدفاً مالياً للأشهر الثلاثة القادمة، ما هو الرقم أو الالتزام الذي تتمنى التحرر منه أولاً؟'
    ],
    career: [
      'التسويف هو في الغالب عرض لخوف من الفشل، أو غياب الوضوح في الهدف، أو إرهاق متراكم. ما المهمة التي تؤجلها دائماً وتثقل تفكيرك؟ وما الذي يمنعك من بدء أول 5 دقائق منها الآن؟',
      'الاحتراق المهني يستنزف الروح قبل الجسد. هل الضغط ناتج عن حجم المهام أم غياب التقدير والعلاقات المرهقة؟ وكيف تحمي حدودك الشخصية بعد انتهاء ساعات العمل؟',
      'ما هي المهارة الفارقة التي لو أتقنتها خلال الأشهر القادمة لرفعت قيمتك السوقية وأحدثت قفزة في مسارك؟',
      'كيف ينعكس هذا الواقع الوظيفي على شغفك وطاقتك الحيوية حين تصحو كل صباح؟ هل تشعر بأنك تبني مستقبلاً أم تستنزف طاقتك في حلقة مفرغة؟',
      'كيف تقيّم تنظيمك لأولويات العمل بمصفوفة أيزنهاور؟ هل وقتك يضيع في طوارئ الآخرين على حساب مهامك الاستراتيجية العميقة؟',
      'هل بيئة عملك الحالية تساعدك على النمو والابتكار، أم تفرض عليك نمط البقاء ومجاراة الروتين؟',
      'ما هو أكبر انتصار مهني حققته في مسيرتك حتى الآن وتستمد منه دافع الثقة بقدرتك على الإنجاز؟',
      'ما هو القرار المهني الشجاع الذي تؤجله منذ فترة وتشعر أن وقت حسمه قد حان؟'
    ],
    personal: [
      'جلد الذات يستنزف طاقتك بدلاً من علاج المشكلة. كيف تتحدث مع نفسك حين تخفق؟ وهل تمنح نفسك حق الخطأ الإنساني والتعلم منه برفق كما تعامل صديقاً تحبه؟',
      'المساحة الشخصية هي وقود استمرارك. كم دقيقة تخصص لنفسك يومياً للاسترخاء وإعادة الشحن دون أي مهام أو شاشات؟',
      'مقارنة نفسك بالآخرين تسرق رضاك. ما الإنجاز أو النعمة الشخصية التي حققتها مؤخراً وتتجاهل الاحتفاء بها؟',
      'كيف تتعامل مع مشاعر الغضب أو القلق حين تداهمك؟ هل تكبتها حتى تنفجر، أم تفرغها بوعي وأمان؟',
      'ما هو القرار الشخصي المؤجل الذي تشعر أن شجاعة اتخاذه ستزيح حملاً ثقيلاً عن كاهلك اليوم؟',
      'هل تملك حدوداً شخصية واضحة تستطيع من خلالها قول "لا" بلباقة لما يستنزف وقتك وطاقتك النفسية؟',
      'كيف تصف مستوى ثقتك بنفسك في اتخاذ القرارات المصيرية دون انتظار موافقة أو تصفيق من حولك؟',
      'لو اخترنا عادة شخصية واحدة تصنع لك سلاماً داخلياً هذا الأسبوع، ماذا ستكون؟'
    ],
    learning: [
      'المشتتات الرقمية تسحب ساعات ثمينة من عمرك بصمت. كم ساعة تقضيها يومياً على الهاتف؟ وهل جربت استبدال 30 دقيقة منها بقراءة كتاب أو استماع لمحتوى معرفي عميق؟',
      'العلم يفتح آفاق الحياة. ما هو آخر كتاب أو مجال جديد استثمرت فيه وقتك وعقلك؟ وما الفكرة التي بقيت معك منه؟',
      'التعلم لا يحتاج ساعات طويلة متواصلة، بل عادة 15 دقيقة يومياً تصنع معجزات. ما المجال الذي تحلم بتعلمه لو توفر لك وقت ميسر؟',
      'كيف ينعكس غياب أو حضور التغذية العقلية على شعورك بالنمو الذاتي؟ هل تشعر بركود ذهني وتكرار، أم بتجدد وتطور مستمر؟',
      'ما المهارة التطبيقية التي تود أن تلتزم بتعلمها وتطبيقها عملياً خلال الأيام القادمة؟',
      'كيف تدير المعرفة التي تتعلمها؟ هل تدوّن الأفكار وتطبقها، أم تكتفي بجمع الكتب والدورات دون أثر عملي؟',
      'ما هو الفضول الفكري الأكبر الذي يشغل بالك هذه الأيام وتتمنى أن تفهمه بعمق؟',
      'ما رأيك في حجز 20 دقيقة خالية من الشاشات تماماً يومياً مخصصة للقراءة الهادئة؟'
    ],
    family: [
      'الغياب الذهني أخطر من الغياب الجسدي. هل تجلس مع أسرتك بحضور كامل وإنصات دون انشغال بالهاتف؟ وما آخر مرة قضيتم وقتاً عائلياً دافئاً وممتعاً معاً؟',
      'الخلافات الأسرية ترهق القلب. ما السبب المتكرر للتوتر داخل البيت؟ وهل يغلب على الحوار الاستماع للاحتواء أم التبرير والدفاع؟',
      'العلاقات الأسرية هي السكن الأول. ما الخطوة البسيطة التي لو فعلتها اليوم لأدخلت سروراً حقيقياً على قلب أهلك أو شريك حياتك؟',
      'كيف ينعكس هذا الواقع على دفء منزلك وسكينتك النفسية؟ هل بيتك هو الملاذ الذي تلجأ إليه للراحة، أم ساحة ضغط إضافية؟',
      'ما هو التغيير الإيجابي في أسلوب تواصلك الذي تشعر أن أسرتك تنتظره منك بفارغ الصبر؟',
      'هل تملك لغة حوار صريحة وآمنة للتعبير عن مشاعرك داخل الأسرة دون خوف من الأحكام؟',
      'كيف توازن بين التزاماتك الخارجية وبين حق أسرتك في وقت نوعي غير مستنزف؟',
      'لو حددنا جلسة أسبوعية دافئة مع أسرتك خالية من الهواتف، ما النشاط المشترك الذي يسعدكم جميعاً؟'
    ],
    social: [
      'الشعور بالوحدة ثقيل جداً. هل هذه العزلة ناتجة عن خيبات سابقة جعلتك تتردد في الوثوق بالآخرين، أم لعدم وجود بيئة تشبه اهتماماتك؟',
      'العلاقات السطحية والمجاملات الزائدة تسحب الطاقة. هل لديك صديق واحد على الأقل تستطيع الحديث معه بعفويتك دون أقنعة؟ وكيف يمكنك وضع حدود صحية للعلاقات المستنزفة؟',
      'كيف تقيّم جودة حضورك الاجتماعي حالياً؟ وهل تشعر بأن محيطك يلهمك ويدفعك للأمام أم يثبط عزيمتك؟',
      'كيف يؤثر ذلك على شعورك بالدعم والمساندة؟ هل تشعر بأن لديك شبكة أمان إنسانية تقف معك في أوقات الشدة، أم تواجه الحياة وحيداً؟',
      'ما المبادرة الاجتماعية الصغيرة التي تستطيع القيام بها اليوم لتجديد تواصلك مع شخص وفيّ ومخلص؟',
      'هل تجد صعوبة في فتح أحاديث جديدة أو الاندماج في التجمعات؟ وما الذي يثير قلقك تحديداً؟',
      'كيف يمكنك الانضمام لمجتمع أو مبادرة تطوعية تشاركك نفس الشغف وتفتح لك دائرة علاقات ملهمة؟',
      'لو اخترت شخصاً واحداً ذا أثر إيجابي لتتواصل معه وتلتقيه هذا الأسبوع، من سيكون؟'
    ],
    health: [
      'اضطراب النوم يدمر التركيز والمناعة والمزاج. كم ساعة تنام عادة في الليل؟ وما الذي يسهرك في الغالب (التفكير والقلق، أم الهاتف والشاشات حتى الفجر)؟',
      'الخمول يغذي الاكتئاب وثقل النفس. هل تمارس أي نشاط بدني كالمشي اليومي؟ وما أسهل خطوة حركية مدتها 15 دقيقة تستطيع إضافتها لجدولك اليوم؟',
      'نوعية الغذاء تؤثر مباشرة على كيمياء الدماغ والطاقة. هل نظامك الغذائي متوازن وتشرب ماءً كافياً، أم يعتمد على الوجبات السريعة والسكريات لتعويض التعب؟',
      'كيف ينعكس هذا الإرهاق البدني واضطراب العادات على إنتاجيتك في العمل وصفاء ذهنك؟ كم تخسر من طاقتك اليومية بسبب ذلك؟',
      'ما العادة الصحية البسيطة جداً (مثل كوبين ماء صباحاً أو النوم قبل منتصف الليل) التي يمكنك البدء بها الليلة؟',
      'متى كانت آخر مرة قمت فيها بفحص طبي عام أو استمعت بصدق لعلامات التعب التي يرسلها جسدك؟',
      'هل تستهلك المنبهات والكافيين بكثرة لتعويض قلة النوم، مما يضاعف توتر جهازك العصبي؟',
      'ما هي العادة الغذائية التي تشعر أن جسدك يرجوك للتخلص منها فوراً لاستعادة نشاطك؟'
    ],
  };

  const domainQuestions = EXTENDED_DOMAIN_QUESTIONS[advisor.id] || EXTENDED_DOMAIN_QUESTIONS.spiritual;
  const currentQuestionIdx = Math.min(stationTurnCount, domainQuestions.length - 1);
  const nextRawQuestion = domainQuestions[currentQuestionIdx];

  const MIN_DIAGNOSTIC_TURNS = 5;
  const directInquiryAnswer = answerUserInquiry(advisor.id, text);
  const isUserAskingQuestion = Boolean(directInquiryAnswer) || /[؟?]/.test(msg) || /(^|\s)(كم|كيف|هل|ماذا|ليه|ليش|وش|شو|ايش|متى|ينفع|ممكن|تنصحني|رايك|رأيك)/i.test(msg);

  // شروط الاستمرار في الحوار السقراطي:
  // 1. ما دام الحوار لم يستوفِ الحد الأدنى التشخيصي التأسيسي (أقل من 5 أسئلة/تبادلات)
  // 2. إذا طرح المستخدم سؤالاً أو استفساراً (يجب الإجابة عليه ومواصلة التشخيص دون إغلاق المحطة)
  // 3. إذا كانت إجابة المستخدم مقتضبة أو مبهمة جداً وتحتاج لاستيضاح أعمق
  // 4. إذا طلب المستخدم التعمق أكثر
  // ولا يتم الإغلاق أبداً قبل 5 تبادلات أو أثناء وجود تساؤل معلق:
  const shouldContinueInquiry = (
    stationTurnCount < MIN_DIAGNOSTIC_TURNS ||
    isUserAskingQuestion ||
    isVagueOrShort ||
    userWantsMoreDepth
  ) && (!userAgreesToComplete || stationTurnCount < MIN_DIAGNOSTIC_TURNS) && stationTurnCount < 10;

  if (shouldContinueInquiry) {
    let nextProbe = nextRawQuestion;

    if (directInquiryAnswer) {
      nextProbe = `💡 **إجابة استشارية مباشرة عن تساؤلك:**\n${directInquiryAnswer}\n\n🌿 **والآن لنواصل تشخيص واقعك في ${advTitle} بدقة (المحاورة ${stationTurnCount + 1} من 5+):**\n${nextRawQuestion}`;
    } else if (isVagueOrShort && stationTurnCount > 0) {
      nextProbe = `أسمعك يا صديقنا، لكن إجابتك مقتضبة جداً ولا تسمح لي كطبيب بتشخيص جذور هذا الجانب بدقة. 🌿\n\nدعنا نتناولها بصراحة أعمق (المحاورة ${stationTurnCount + 1} من 5+):\n${nextRawQuestion}`;
    } else if (userWantsMoreDepth) {
      nextProbe = `أحييك على رغبتك الصادقة في التعمق والوضوح! هذا يثبت وعيك وحرصك على اتزانك. 🌿\n\nلنتناول زاوية أعمق (المحاورة ${stationTurnCount + 1} من 5+):\n${nextRawQuestion}`;
    } else if (userAgreesToComplete && stationTurnCount < MIN_DIAGNOSTIC_TURNS) {
      nextProbe = `أقدر رغبتك في حسم التقييم يا صديقنا العزيز، ولكن كطبيب ومستشار مؤتمن في هذا التقييم التأسيسي الأول، نحتاج لاستيفاء 5 محاور أساسية على الأقل لنبني عليها خطتك بدقة متناهية. 🌿\n\nدعنا نتناول هذا المحور الحيوي (المحاورة ${stationTurnCount + 1} من 5+):\n${nextRawQuestion}`;
    } else {
      nextProbe = `أسمعك بتركيز وتفهم واهتمام. لننتقل إلى زاوية تشخيصية مكملة في ${advTitle} (المحاورة ${stationTurnCount + 1} من 5+):\n${nextRawQuestion}`;
    }

    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: semanticScore,
      strengths: [],
      challenges: [],
      reasoning: `بروتوكول سقراطي تكيفي (المحطة ${stationNumber} من 8: ${advTitle} - التبادل ${stationTurnCount + 1} من 5+): متابعة الحوار الاستكشافي المتعمق. ${directInquiryAnswer ? 'تم رصد وإجابة استفسار المستفيد مباشرة.' : ''} الدرجة المحسوبة دلالياً: ${semanticScore.toFixed(1)}/10. لا يتم الإغلاق لضمان استيفاء المعطيات التشخيصية.`,
      summary: `مواصلة الحوار السقراطي الاستكشاري في ${advTitle}.`,
      advice: `التشخيص الدقيق والاستماع لواقعك هو أساس خطة التوازن الناجحة.`,
      reply: `${nextProbe}`,
    };
  }

  // --- مرحلة الاعتماد والتوافق (Consensual Diagnostic Wrap-up) ---
  const dynamicStrengths: string[] = [];
  const dynamicChallenges: string[] = [];

  if (semanticScore <= 3.5) {
    dynamicStrengths.push('شجاعة استثنائية وشفافية نادرة في الاعتراف بالواقع السلبي دون تجميل');
    dynamicStrengths.push('رغبة حقيقية ونقاء فطري في البحث عن مخرج واستعادة السيطرة');
    dynamicChallenges.push(`حالة هبوط حاد في ${advTitle} تتطلب تدخلاً إسعافياً عاجلاً لوقف التدهور`);
    dynamicChallenges.push('تجنب جلد الذات والبدء فوراً بعادة يومية واحدة متناهية الصغر (Micro-habit)');
  } else if (semanticScore <= 6.0) {
    dynamicStrengths.push(`وعي طيب بالتحديات ورغبة واضحة في تصحيح مسار ${advTitle}`);
    dynamicStrengths.push('وجود محاولات جيدة تحتاج لتنظيم وحماية من المشتتات');
    dynamicChallenges.push(`التشتت والتسويف يسرقان الطاقة ويمنعان استقرار ${advTitle}`);
    dynamicChallenges.push('تخصيص وقت محمي يومياً في المربع الثاني لحماية أولوياتك من الطوارئ العابرة');
  } else {
    dynamicStrengths.push(`استقرار عالٍ وأرضية صلبة تعكس وعياً وعادات متوازنة في ${advTitle}`);
    dynamicStrengths.push('قدرة ممتازة على التناغم وحماية السكينة والإنتاجية');
    dynamicChallenges.push('الحفاظ على هذا المستوى الملهم وحمايته من التراجع وسط تسارع ضغوط الحياة');
    dynamicChallenges.push('نقل هذا الأثر الإيجابي لبقية جوانب عجلة الحياة لتعميق الاتزان الشامل');
  }

  const levelText = semanticScore <= 3.5 ? 'مستوى حرج يحتاج رعاية وإسعافاً عاجلاً' : semanticScore <= 6.0 ? 'مستوى متوسط يواجه ضغوطاً وقابل لقفزة نوعية' : 'مستوى متميز وملهم يعكس اتزاناً عالياً';

  // إذا تم استيفاء 5 أسئلة ولكن المستخدم لم يطلب صراحة الاعتماد ولم يصل للحد الأقصى (8 أسئلة):
  // الطبيب يعرض مسودة التقييم ويخيره بين الاعتماد أو الاستفاضة
  if (!userAgreesToComplete && stationTurnCount < 8) {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: semanticScore,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `بروتوكول سقراطي تكيفي (المحطة ${stationNumber} من 8: ${advTitle} - التبادل ${stationTurnCount + 1}): تم استيفاء الحد الأدنى للتشخيص (${stationTurnCount + 1} محاورات). عرض مسودة التقييم (${semanticScore.toFixed(1)}/10) والتخيير بين الاعتماد أو التعمق الإضافي.`,
      summary: `جاهزية اعتماد تقييم ${advTitle} بدرجة (${semanticScore.toFixed(1)} من 10) مع إتاحة الاستفاضة.`,
      advice: `التوازن يبدأ بخطوة واضحة ومستمرة.`,
      reply: `أشكرك من قلبي على صراحتك وعمق إجاباتك طوال محاوراتنا السابقة يا صديقنا العزيز! 🌿\n\nلقد تشكّلت لدي الآن رؤية سريرية واضحة جداً لواقعك في **${advTitle}**:\n📊 **التقييم المستحق لواقعك**: (${semanticScore.toFixed(1)} من 10) — ${levelText}.\n\n🏆 **أبرز مواطن القوة المرصودة:**\n• ${dynamicStrengths[0]}\n• ${dynamicStrengths[1]}\n\n⚡ **فرص التطوير والتحديات:**\n• ${dynamicChallenges[0]}\n• ${dynamicChallenges[1]}\n\nهل تود أن **نعتمد هذا التقييم رسمياً** وننطلق للمحطة التالية، أم ترغب في التحدث عن زاوية أخرى في هذا الجانب؟`,
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
    advice: semanticScore <= 3.5
      ? 'الاعتراف بالواقع هو نصف الشفاء؛ لا تكلف نفسك ما لا تطيق وابدأ اليوم بخطوة إسعافية واحدة صغيرة.'
      : semanticScore <= 6.0
      ? 'لديك أساس طيب يمكنك البناء عليه؛ خطوة يومية صغيرة ومستمرة تصنع تحولاً جذرياً.'
      : 'حافظ على هذا الاتزان الجميل فهو رأس مالك الحقيقي أمام تقلبات الحياة.',
    reply: `بناءً على حوارنا الاستشاري المعمق وما شاركته معي بكل صدق يا صديقنا العزيز: 🌿\n\n📊 **التقييم المستحق لواقعك**: (${semanticScore.toFixed(1)} من 10) — ${levelText}.\n\n🏆 **أبرز مواطن القوة:**\n• ${dynamicStrengths[0]}\n• ${dynamicStrengths[1]}\n\n⚡ **فرص التطوير والتحديات:**\n• ${dynamicChallenges[0]}\n• ${dynamicChallenges[1]}`,
  };
}
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  onSaveAnswer,
  onFinishAdvisor,
  onResetAdvisor,
  onStartNewWeeklyAssessment,
  onCompleteAll,
  completedAdvisors,
  onAddEisenhowerGoal,
  completedDates,
  onNavigateToDashboard,
  onNavigateToAdvisorChat,
  theme: _theme = 'light',
}) => {
  const [currentAdvisorIndex, setCurrentAdvisorIndex] = useState(() => {
    const idx = ADVISORS_LIST.findIndex((a) => a.id === initialAdvisorId);
    return idx >= 0 ? idx : 0;
  });

  // Track turn count per advisor station for the adaptive clinical flow
  const [stationTurnCount, setStationTurnCount] = useState<Record<string, number>>({});

  // Dynamic insights per station in memory only (never saved to localStorage across sessions)
  const [stationInsights, setStationInsights] = useState<Record<string, StationDynamicInsights>>({});

  const [inputText, setInputText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAdvisorReplying, setIsAdvisorReplying] = useState(false);
  const [aiMode, setAiMode] = useState<AiModelMode>(() => {
    const primary = localStorage.getItem('wazan_ai_mode') as AiModelMode | null;
    if (primary) return primary;
    return 'balanced';
  });
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('wazan_ai_mode', mode);
  };

  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  // Chat conversation state per advisor in memory only (never saved to localStorage across sessions)
  const [chatMessages, setChatMessages] = useState<Record<string, EvaluationChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Proactively purge any residual evaluation caches from localStorage on mount & when uncompleted
  useEffect(() => {
    try {
      localStorage.removeItem('wazan_eval_chats');
      localStorage.removeItem('wazan_eval_insights');
      localStorage.removeItem('wazan_current_eval_advisor');
    } catch {
      // ignore
    }
  }, []);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const stationNumber = currentAdvisorIndex + 1; // 1 to 8

  const currentStationConfig: StationAssessmentConfig =
    STATION_ASSESSMENT_CONFIG[currentAdvisor.id] || {
      areaId: currentAdvisor.id,
      stationNumber,
      advisorName: currentAdvisor.name,
      advisorRole: currentAdvisor.role,
      avatarSvg: currentAdvisor.avatarSvg,
      themeColor: currentAdvisor.themeColor,
      badge: currentAdvisor.badge,
      consultation: {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب ومستوى رضاك عنه في هذه الأيام؟',
        description: 'صف واقعك برفق وشاركنا ما إذا كان هناك عائق تشعر أنه يؤثر على استقرارك...',
        placeholder: 'صف حالك ورضاك في هذا الجانب بصراحة...',
        followUpProbe: 'أقدّر شفافيتك يا صديقنا. لنصل لتشخيص دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟',
        suggestedResponses: ['مستقر وممتاز (8/10)', 'متوسط وسط بعض الضغوط (6/10)', 'يحتاج إعادة تنظيم وعناية (4/10)'],
      },
      initialDiagnostic: {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب ومستوى رضاك عنه؟',
        description: 'ما هو التحدي الأبرز وما تقييمك لمستواك من 1 إلى 10؟',
        placeholder: 'صف حالك ورضاك في هذا الجانب بصراحة...',
        followUpProbe: 'أقدّر شفافيتك يا صديقنا. لنصل لتشخيص تأسيسي دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟',
        suggestedResponses: ['مستقر وممتاز', 'متوسط وسط بعض الضغوط', 'يحتاج إعادة تنظيم وعناية'],
      },
      weeklyCheckin: {
        title: 'كيف كان حالك في هذا الجانب خلال الأسبوع الماضي؟',
        description: 'اختر تقييمك للأسبوع المنصرم من 1 إلى 10',
        placeholder: 'أسبوع هادئ ومنجز / ضغوط وتشتت...',
        suggestedResponses: ['أداء ممتاز (8/10)', 'متوسط مقبول (6/10)', 'تحديات وضغوط (4/10)'],
      },
    };

  // Determine if current advisor is completed / locked
  const isCompleted = completedAdvisors.includes(currentAdvisor.id);
  const isLocked = isCompleted || isAdvisorWeeklyLocked(currentAdvisor.id, completedDates);

  // All 8 domains completed state
  const isAllCompleted = completedAdvisors.length >= 8;

  // Accurate progress calculation
  const completedCount = completedAdvisors.length;
  const progressPercent = Math.min(100, Math.round((completedCount / 8) * 100));

  // Helper to build opening doctor consultation message for current station
  const getOpeningMessage = (
    advisor: AdvisorConfig,
    stConfig: StationAssessmentConfig,
    stationNum: number
  ): EvaluationChatMessage => {
    const consult = stConfig.consultation || stConfig.initialDiagnostic;
    const text = `أهلاً بك يا صديقنا في محطة التقييم والاستشارة الحوارية 🩺\n\nأنا **${advisor.name}**، ${advisor.role}.\nسنقف معاً في هذا الجانب لنستكشف واقعك برفق ووعي لنبني عليه توازنك المستدام.\n\n📌 **سؤال الاستشارة والتشخيص (المحطة ${stationNum} من 8):**\n${consult.title}\n\n💡 ${consult.description}`;

    return {
      id: `welcome_${advisor.id}_${Date.now()}`,
      sender: 'advisor',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  useEffect(() => {
    if (completedAdvisors.length === 0) {
      const firstAdvisor = ADVISORS_LIST[0];
      const firstStationConfig = STATION_ASSESSMENT_CONFIG[firstAdvisor.id] || currentStationConfig;
      const initialOpeningMsg = getOpeningMessage(firstAdvisor, firstStationConfig, 1);
      setChatMessages({ [firstAdvisor.id]: [initialOpeningMsg] });
      setStationInsights({});
      setStationTurnCount({ [firstAdvisor.id]: 0 });
      setCurrentAdvisorIndex(0);
    }
  }, [completedAdvisors.length]);

  // 1) Initialize welcoming message for station (مع مراقبة chatMessages[currentAdvisor.id] وحماية من الحلقات اللانهائية)
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    const currentMsgs = chatMessages[advisorKey];
    if (!currentMsgs || currentMsgs.length === 0) {
      const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
      setChatMessages((prev) => {
        if (prev[advisorKey] && prev[advisorKey].length > 0) return prev;
        return { ...prev, [advisorKey]: [openingMsg] };
      });
      setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    }
  }, [currentAdvisorIndex, currentAdvisor, chatMessages[currentAdvisor.id]]);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentAdvisorIndex]);

  // Reopen and restart evaluation for current advisor station
  const handleReopenStation = () => {
    const advisorKey = currentAdvisor.id;
    setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
    setChatMessages((prev) => ({ ...prev, [advisorKey]: [openingMsg] }));
    setStationInsights((prev) => {
      const copy = { ...prev };
      delete copy[advisorKey];
      return copy;
    });
    if (onResetAdvisor) {
      onResetAdvisor(advisorKey);
    }
  };

  // Reset and restart evaluation for current advisor
  const handleResetCurrentAdvisor = () => {
    handleReopenStation();
  };

  // Fallback programmatic finish (only used if explicitly invoked after active conversation)
  const handleFinishCurrentAdvisor = () => {
    const calculatedScore = calculateScoreForAdvisor(currentAdvisor, answers);
    const scoreToSave = calculatedScore > 0 ? calculatedScore : 5.0;
    
    // Save dynamic insights if not already set
    if (!stationInsights[currentAdvisor.id]) {
      const fallbackInsights = extractInsightsFromAnswers(currentAdvisor, scoreToSave, answers);
      setStationInsights((prev) => ({
        ...prev,
        [currentAdvisor.id]: {
          score: scoreToSave,
          strengths: fallbackInsights?.strengths || ['رغبة حقيقية في تطوير هذا الجانب وتثبيت التوازن'],
          challenges: fallbackInsights?.challenges || ['حماية وقتك والتركيز على العادات اليومية في المربع الثاني'],
        },
      }));
    }
    
    onFinishAdvisor(currentAdvisor.id, scoreToSave);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
    setShowCelebration(true);
  };

  // Move to next incomplete advisor
  const handleGoToNextAdvisor = () => {
    setShowCelebration(false);
    const nextIdx = ADVISORS_LIST.findIndex(
      (adv, i) => i > currentAdvisorIndex && !completedAdvisors.includes(adv.id)
    );
    if (nextIdx >= 0) {
      setCurrentAdvisorIndex(nextIdx);
    } else {
      const firstIncomplete = ADVISORS_LIST.findIndex(
        (adv) => !completedAdvisors.includes(adv.id)
      );
      if (firstIncomplete >= 0) {
        setCurrentAdvisorIndex(firstIncomplete);
      } else {
        onCompleteAll();
      }
    }
  };

  // Handle user answer: Only completes when AI advisor explicitly returns station_completed === true!
  const handleSendAnswer = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAdvisorReplying) return;

    const advisorKey = currentAdvisor.id;
    const userMsg: EvaluationChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setInputText('');
    const currentList = chatMessages[advisorKey] || [];
    const currentTurns = stationTurnCount[advisorKey] || 0;

    // Detect numeric score (1 to 10) if present in user message
    const ratingMatch = text.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i) || text.match(/^(?:تقييمي:?\s*)?\d+(?:\.\d+)?/i);
    let detectedScore: number | null = null;
    if (ratingMatch) {
      const rawNum = parseFloat(ratingMatch[1] || ratingMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(rawNum) && rawNum >= 1 && rawNum <= 10) {
        detectedScore = rawNum;
      }
    }

    // Save answer turn in state
    if (detectedScore !== null) {
      onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, detectedScore);
    } else {
      onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_response_${currentTurns}`, text);
    }

    // Increment station turn count only for genuine diagnostic exchanges (not crisis emergency safety triggers)
    const isCrisisOrDeathMsg = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(text);
    if (!isCrisisOrDeathMsg) {
      setStationTurnCount((prev) => ({ ...prev, [advisorKey]: currentTurns + 1 }));
    }

    // Display user message immediately
    setChatMessages((prev) => ({
      ...prev,
      [advisorKey]: [...currentList, userMsg],
    }));

    setIsAdvisorReplying(true);

    try {
      const history = currentList.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      let replyContent = '';
      let reasoningContent = '';
      let summaryContent = '';
      let adviceContent = '';
      let isStationCompleted = false;
      // حساب الدرجة الدلالية الحقيقية بالأعشار من النص المكتوب وتاريخ الحوار
      const historyTextsArray = currentList.map((m) => m.text);
      let earnedScore = calculateSemanticScore(text, historyTextsArray, detectedScore || undefined);
      let dynamicStrengths: string[] = [];
      let dynamicChallenges: string[] = [];
      let responseSource: 'gemini' | 'groq' | 'local-fallback' = 'gemini';

      try {
        const res = await fetch('/api/gemini/advisor-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisor: currentAdvisor,
            message: text,
            history,
            answers,
            userScore: earnedScore,
            aiMode,
            isEvaluationSession: true,
            evaluationStep: stationNumber,
            evaluationQuestionTitle: currentStationConfig.consultation?.title || currentStationConfig.initialDiagnostic?.title,
            stationTurnCount: currentTurns,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          responseSource = data.source || 'gemini';
          reasoningContent = data.reasoning || '';
          summaryContent = data.summary || '';
          adviceContent = data.advice || '';
          replyContent = data.reply || adviceContent || summaryContent || '';
          isStationCompleted = Boolean(data.station_completed);
          
          if (data.score !== undefined && !isNaN(Number(data.score))) {
            const raw = Number(data.score);
            earnedScore = raw > 10 ? Math.round(raw / 10) : raw;
          }
          if (Array.isArray(data.strengths) && data.strengths.length > 0) {
            dynamicStrengths = data.strengths;
          }
          if (Array.isArray(data.challenges) && data.challenges.length > 0) {
            dynamicChallenges = data.challenges;
          }

          if (typeof replyContent === 'string' && (replyContent.startsWith('{') || replyContent.includes('"reasoning"'))) {
            try {
              const innerMatch = replyContent.match(/\{[\s\S]*\}/);
              if (innerMatch) {
                const inner = JSON.parse(innerMatch[0]);
                reasoningContent = inner.reasoning || reasoningContent;
                summaryContent = inner.summary || summaryContent;
                adviceContent = inner.advice || adviceContent;
                replyContent = inner.reply || inner.advice || inner.summary || '';
                if (inner.station_completed !== undefined) {
                  isStationCompleted = Boolean(inner.station_completed);
                }
                if (inner.score !== undefined && !isNaN(Number(inner.score))) {
                  const raw = Number(inner.score);
                  earnedScore = raw > 10 ? Math.round(raw / 10) : raw;
                }
                if (Array.isArray(inner.strengths) && inner.strengths.length > 0) dynamicStrengths = inner.strengths;
                if (Array.isArray(inner.challenges) && inner.challenges.length > 0) dynamicChallenges = inner.challenges;
              }
            } catch {
              // keep
            }
          }
        }
      } catch (fetchErr) {
        console.warn('API call failed or offline, activating client intelligence engine:', fetchErr);
      }

      if (!replyContent) {
        responseSource = 'local-fallback';
        const local = getClientAdvisorResponse(
          currentAdvisor,
          text,
          stationNumber,
          earnedScore,
          currentTurns,
          historyTextsArray
        );
        reasoningContent = local.reasoning;
        summaryContent = local.summary;
        adviceContent = local.advice;
        replyContent = local.reply;
        isStationCompleted = Boolean(local.station_completed);
        if (local.score !== undefined) earnedScore = local.score;
        if (local.strengths && local.strengths.length > 0) dynamicStrengths = local.strengths;
        if (local.challenges && local.challenges.length > 0) dynamicChallenges = local.challenges;
      }

      // If station completed by AI advisor:
      if (isStationCompleted) {
        const goldenHabit = currentAdvisor.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
        if (!replyContent.includes('تم اعتماد تقييم المحطة')) {
          replyContent += `\n\n✨ **تم اعتماد تقييم المحطة (${stationNumber} من 8 - ${currentAdvisor.title}):**\nالدرجة المسجلة: (${earnedScore.toFixed(1)} من 10).\n\n💡 **التوصية العلاجية الذهبية:**\n${goldenHabit}.\n\nتم تحديث عجلة حياتك بنجاح!`;
        }
      }

      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'advisor',
        text: replyContent,
        reasoning: reasoningContent,
        summary: summaryContent,
        advice: adviceContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCrisis: isCrisisMessage(replyContent) || isCrisisMessage(text),
        source: responseSource,
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      // CRITICAL: Only trigger station completion and show modal when AI EXPLICITLY returns station_completed === true!
      if (isStationCompleted) {
        // Save the dynamic earned score
        onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, earnedScore);

        // Auto-feed the golden habit into Eisenhower Matrix (Quadrant 2)
        const goldenHabit = currentAdvisor.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
        if (onAddEisenhowerGoal) {
          onAddEisenhowerGoal(goldenHabit, currentAdvisor.name, currentAdvisor.id);
        }
        
        // Save dynamic insights extracted from the conversation
        const fallbackInsights = extractInsightsFromAnswers(currentAdvisor, earnedScore, answers);
        setStationInsights((prev) => ({
          ...prev,
          [currentAdvisor.id]: {
            score: earnedScore,
            strengths: dynamicStrengths.length > 0 ? dynamicStrengths : (fallbackInsights?.strengths || ['وعي طيب وشفافية في تشخيص واقع هذا الجانب']),
            challenges: dynamicChallenges.length > 0 ? dynamicChallenges : (fallbackInsights?.challenges || ['بناء عادة يومية مستدامة لحماية اتزانك']),
          },
        }));

        onFinishAdvisor(currentAdvisor.id, earnedScore);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.7 },
        });
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Advisor chat error in onboarding:', err);
    } finally {
      setIsAdvisorReplying(false);
    }
  };

  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const staticFallbackInsights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);
  const activeConversation = chatMessages[currentAdvisor.id] || [];

  const currentActiveInsights = stationInsights[currentAdvisor.id] || {
    score: currentAdvisorScore > 0 ? currentAdvisorScore : 7.5,
    strengths: (staticFallbackInsights?.strengths || []).slice(0, 2),
    challenges: (staticFallbackInsights?.challenges || []).slice(0, 2),
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300">
      {/* All 8 Domains Completed Milestone Banner */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-[#0F6E6E] to-[#0A4B4B] dark:from-[#0E1D24] dark:to-[#16333F] text-white rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300 border border-teal-500/30 dark:border-[#1E343F] transition-colors">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              🌟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">اكتملت خريطتك المتكاملة (8 من 8)!</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  مكتمل وموثق بنجاح 🔒
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                تم رسم عجلة الحياة وتحديث مصفوفة أيزنهاور وصياغة تقرير المنسق العام بالكامل.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F6E6E] dark:bg-[#22D3EE] dark:hover:bg-cyan-300 dark:text-[#071318] font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <span>استعراض خريطتي ولوحة التحكم</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Station Selector & Adaptive Doctor Consultation Header */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors space-y-4">
        {/* Clean Doctor Consultation Title & Global Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E2E8F0] dark:border-[#1E343F]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0F6E6E]/10 dark:bg-[#22D3EE]/15 text-[#0F6E6E] dark:text-[#22D3EE] flex items-center justify-center text-xl flex-shrink-0">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  جلسة الاستشارة والتقييم الحواري التكيفي
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0F6E6E]/15 dark:bg-[#22D3EE]/20 text-[#0F6E6E] dark:text-[#22D3EE] border border-[#0F6E6E]/30 dark:border-[#22D3EE]/40 flex items-center gap-1 shadow-xs">
                  <span>التقييم التأسيسي الشامل</span>
                  <span>•</span>
                  <span>8 محطات سريرية</span>
                </span>
              </div>
              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-0.5">
                حوار سريري استشاري هادئ؛ استمع لمستشارك وشارك واقعك برفق لنشخص اتزانك خطوة بخطوة.
              </p>
            </div>
          </div>

          {/* Accurate Completion Progress Indicator */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F6F2] dark:bg-[#112028] border border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 self-start sm:self-auto">
            <span className="text-xs font-bold text-[#334155] dark:text-[#CBD5E1]">المكتمل:</span>
            <span dir="ltr" className="font-mono text-xs font-black px-1.5 py-0.5 rounded-md bg-white dark:bg-[#071318] text-[#0F6E6E] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-[#1E343F]">
              {completedCount} / 8
            </span>
            <div className="w-20 sm:w-28 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F6E6E] dark:bg-[#22D3EE] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span dir="ltr" className="font-mono text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* 8 Advisor Station Tabs - Balanced Grid (No Clipping of 5th Domain) */}
        <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-8 gap-1.5 sm:gap-2">
          {ADVISORS_LIST.map((advisor, index) => {
            const isAdvCompleted = completedAdvisors.includes(advisor.id);
            const isCurrent = index === currentAdvisorIndex;

            return (
              <button
                key={advisor.id}
                type="button"
                onClick={() => {
                  setCurrentAdvisorIndex(index);
                  setShowCelebration(false);
                }}
                className={`group relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none text-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
                  isCurrent
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] dark:border-[#0891B2] shadow-sm ring-2 ring-[#0F6E6E]/20 dark:ring-[#22D3EE]/30'
                    : isAdvCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                    : 'bg-[#F7F6F2] dark:bg-[#0B161C] text-[#334155] dark:text-[#CBD5E1] border-[#E2E8F0] dark:border-[#1E343F] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-white dark:hover:bg-[#162734]'
                }`}
                title={`المحطة ${index + 1}: ${advisor.title}`}
              >
                <span className="text-sm flex-shrink-0">{advisor.avatarSvg}</span>
                <span className="truncate">{advisor.title.replace('الجانب ', '')}</span>
                {isAdvCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <span
                    dir="ltr"
                    className={`text-[9px] font-mono px-1 rounded-sm ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Assessment Window */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[680px] transition-colors">
        {/* Advisor Header Bar */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between bg-white dark:bg-[#0E1D24] flex-shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 relative"
              style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
            >
              {currentAdvisor.avatarSvg}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0E1D24]"
                style={{ backgroundColor: currentAdvisor.themeColor }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {currentAdvisor.name}
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: currentAdvisor.themeColor,
                    borderColor: `${currentAdvisor.themeColor}35`,
                    backgroundColor: `${currentAdvisor.themeColor}10`,
                  }}
                >
                  {currentAdvisor.badge}
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />
                    تم التقييم بنجاح
                  </span>
                )}
              </div>
              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-0.5">{currentAdvisor.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Model Mode Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm cursor-pointer"
                style={{
                  backgroundColor: currentModeConfig.bgColor,
                  borderColor: `${currentModeConfig.color}40`,
                  color: currentModeConfig.color,
                }}
                title="تغيير نمط تفكير الذكاء الاصطناعي"
              >
                <currentModeConfig.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-black">{currentModeConfig.title}</span>
                <span className="sm:hidden font-black">{currentModeConfig.shortTitle}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showModeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModeDropdown(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#0E1D24] rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-[#E2E8F0] dark:border-[#1E343F] mb-1">
                      <span className="text-[11px] font-black text-[#0F172A] dark:text-[#F1F5F9] block">مستوى تفكير الذكاء الاصطناعي</span>
                      <span className="text-[9px] text-[#334155] dark:text-[#CBD5E1]">اختر سرعة وعمق التحليل أثناء الحوار</span>
                    </div>

                    <div className="space-y-1">
                      {AI_MODES.map((mode) => {
                        const isSelected = mode.id === aiMode;
                        const IconComponent = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              handleSelectAiMode(mode.id);
                              setShowModeDropdown(false);
                            }}
                            className={`w-full text-right p-2 rounded-xl transition-all flex items-start gap-2 border cursor-pointer ${
                              isSelected
                                ? 'border-[#0F6E6E] dark:border-[#22D3EE] shadow-xs'
                                : 'border-transparent hover:bg-[#F7F6F2] dark:hover:bg-[#162734]'
                            }`}
                            style={isSelected ? { backgroundColor: mode.bgColor } : {}}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${mode.color}15`, color: mode.color }}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">{mode.title}</span>
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                                >
                                  {mode.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#334155] dark:text-[#CBD5E1] leading-tight mt-0.5">{mode.desc}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reopen station button if completed */}
            {isCompleted && (
              <button
                type="button"
                onClick={handleReopenStation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="إعادة فتح هذه المحطة وإلغاء اعتمادها لإعادة التقييم"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                <span className="hidden sm:inline">إعادة فتح المحطة</span>
                <span className="sm:hidden">إعادة فتح</span>
              </button>
            )}

            {/* Start New Weekly Assessment button */}
            {onStartNewWeeklyAssessment && (
              <button
                type="button"
                onClick={() => {
                  const firstAdvisor = ADVISORS_LIST[0];
                  const firstStationConfig = STATION_ASSESSMENT_CONFIG[firstAdvisor.id] || currentStationConfig;
                  const initialOpeningMsg = getOpeningMessage(firstAdvisor, firstStationConfig, 1);
                  setChatMessages({ [firstAdvisor.id]: [initialOpeningMsg] });
                  setStationInsights({});
                  setStationTurnCount({ [firstAdvisor.id]: 0 });
                  setCurrentAdvisorIndex(0);
                  try {
                    localStorage.removeItem('wazan_eval_chats');
                    localStorage.removeItem('wazan_eval_insights');
                    localStorage.removeItem('wazan_current_eval_advisor');
                  } catch {
                    // ignore
                  }
                  if (onStartNewWeeklyAssessment) {
                    onStartNewWeeklyAssessment();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F6F2] dark:bg-[#162734] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="بدء دورة تقييم أسبوعي جديدة لكافة الأبعاد"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                <span className="hidden sm:inline">بدء تقييم أسبوعي جديد</span>
                <span className="sm:hidden">تقييم جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Assessment Progress Bar */}
        <div className="px-6 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between gap-4 text-xs flex-shrink-0 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-[#0F6E6E] dark:text-[#22D3EE] text-xs flex-shrink-0 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>المحطة</span>
              <span dir="ltr" className="font-mono">({stationNumber} / 8)</span>:
              <span>{currentAdvisor.title}</span>
            </span>
            <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] hidden sm:inline truncate">
              استشارة سريرية تفاعلية • تشخيص واقعك وبناء توازنك بدقة
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-24 sm:w-36 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0F6E6E] dark:bg-[#22D3EE] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] font-mono" dir="ltr">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F7F6F2]/60 dark:bg-[#071318]/90 transition-colors">
          {activeConversation.map((msg) => {
            const isAdvisor = msg.sender === 'advisor';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isAdvisor ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs ${
                    isAdvisor ? 'border-black/5 dark:border-white/10' : 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-transparent'
                  }`}
                  style={isAdvisor ? { backgroundColor: `${currentAdvisor.themeColor}20` } : {}}
                >
                  {isAdvisor ? currentAdvisor.avatarSvg : <User className="w-4 h-4" />}
                </div>

                <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                  <div
                    className={`p-4 rounded-2xl shadow-xs border ${
                      isAdvisor
                        ? 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] text-[#0F172A] dark:text-[#F1F5F9] rounded-tr-xs'
                        : 'bg-[#0F6E6E] dark:bg-[#0891B2] border-transparent text-white rounded-tl-xs'
                    }`}
                  >
                    {/* Render Formatted Bold text without raw ** markers */}
                    <FormattedChatMessage text={msg.text} isAdvisor={isAdvisor} />

                    {isAdvisor && msg.source === 'local-fallback' && (
                      <div className="mt-1.5 flex items-center">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                          رد احتياطي
                        </span>
                      </div>
                    )}

                    <span
                      className={`block text-[10px] mt-2 font-mono ${
                        isAdvisor ? 'text-[#64748B] dark:text-[#94A3B8]' : 'text-emerald-100/75'
                      }`}
                      dir="ltr"
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Render Crisis Support Card if crisis response detected */}
                  {isAdvisor && (msg.isCrisis || isCrisisMessage(msg.text)) && (
                    <CrisisSupportCard />
                  )}
                </div>
              </div>
            );
          })}

          {isAdvisorReplying && (
            <div className="flex gap-3 max-w-3xl mr-auto items-center animate-pulse">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs"
                style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
              >
                {currentAdvisor.avatarSvg}
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#334155] dark:text-[#CBD5E1] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE] animate-spin" />
                <span>{currentAdvisor.name} يستمع إليك ويصيغ تشخيصه الطبي بعناية...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Completion Status Bar when evaluated */}
        {isCompleted && (
          <div className="px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-t border-emerald-200/90 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                <span>تم رصد تقييم المحطة</span>
                <span dir="ltr" className="font-mono font-bold">
                  ({stationNumber} / 8)
                </span>
                <span dir="ltr" className="font-mono font-bold">
                  ({currentActiveInsights.score > 0 ? currentActiveInsights.score : 7} / 10)
                </span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200">
                معتمد وموثق 🔒
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCurrentAdvisor}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-[#162734] text-emerald-900 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="إعادة بدء التقييم لهذا الجانب"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة التقييم</span>
              </button>
              {onNavigateToAdvisorChat && (
                <button
                  type="button"
                  onClick={() => onNavigateToAdvisorChat(currentAdvisor.id)}
                  className="px-2.5 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>غرفة الاستشارة</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGoToNextAdvisor}
                className="px-3 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>المحطة التالية</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input Bar & Dynamic Quick Choices */}
        <div className="border-t border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">

          {/* Socratic Interactive Consensus & Depth Controls (Only visible after at least 5 diagnostic inquiries) */}
          {!isCompleted && (stationTurnCount[currentAdvisor.id] || 0) >= 5 && (
            <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-2 flex-wrap transition-colors">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>المستشار جاهز لتقديم التشخيص، أو التعمق أكثر بحسب رغبتك:</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendAnswer('أريد التعمق أكثر وسؤالك عن جوانب أخرى')}
                  className="px-3 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>🔍 أريد التعمق أكثر</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAnswer('اعتمد التقييم')}
                  className="px-3.5 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#22D3EE] dark:hover:bg-cyan-300 text-white dark:text-[#071318] text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>✅ اعتمد التقييم</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Choices bar */}
          <div className="px-4 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[11px] font-black text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                <span>اختر تقييمك (من 1 إلى 10):</span>
              </span>

              {/* 1 to 10 Rating Pills */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSendAnswer(`تقييمي: ${num} من 10`)}
                    className="min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] hover:bg-emerald-50/50 dark:hover:bg-cyan-950/30 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer font-mono flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
                    dir="ltr"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Suggested Clinical Responses */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {(currentStationConfig.consultation?.suggestedResponses || currentStationConfig.initialDiagnostic?.suggestedResponses || []).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendAnswer(chip)}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Bar: Text + Mic + Send */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#0E1D24] transition-colors">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAnswer();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button for Voice Dictation */}
              <VoiceInput
                currentValue={inputText}
                onTranscript={(transcript) => setInputText(transcript)}
                disabled={isAdvisorReplying}
                showStatusBadge={true}
                resetKey={currentAdvisorIndex}
              />

              {/* Free Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isCompleted
                    ? 'اكتب استشارتك أو سؤالك للمستشار بحرية...'
                    : (currentStationConfig.consultation?.placeholder || currentStationConfig.initialDiagnostic?.placeholder || 'صف حالك ورضاك في هذا الجانب بصراحة...')
                }
                className="flex-1 bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0F6E6E] dark:focus:border-[#22D3EE] focus:ring-1 focus:ring-[#0F6E6E] dark:focus:ring-[#22D3EE] transition-all"
                dir="rtl"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isAdvisorReplying}
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: currentAdvisor.themeColor || '#0F6E6E' }}
                title="إرسال"
              >
                <Send className="w-5 h-5 -rotate-90" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-[#334155] dark:text-[#CBD5E1] px-1">
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                <span>حوار استشاري أسبوعي: يتم احتساب درجة البعد وتأكيد اكتمال المحطة تلقائياً من خلال الحوار الفعلي مع المستشار.</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Modal when an Advisor's evaluation completes */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-center space-y-6 transition-colors">
            <div
              className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
            >
              {currentAdvisor.avatarSvg}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="flex items-center gap-1">
                  <span>اكتمل تقييم المحطة</span>
                  <span dir="ltr" className="font-mono">{stationNumber} / 8</span>
                  <span>بنجاح</span>
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                أحسنت! أنهيت محطة {currentAdvisor.name}
              </h3>
              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-1">
                تم اعتماد نتيجتك التقديرية في {currentAdvisor.title} وتوثيق توصيتك الذهبية
              </p>
            </div>

            {/* Score Showcase */}
            <div className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] block">درجة الجانب</span>
                <span
                  className="text-3xl font-black font-mono"
                  style={{ color: currentAdvisor.themeColor }}
                  dir="ltr"
                >
                  {Number(currentActiveInsights.score > 0 ? currentActiveInsights.score : 7.5).toFixed(1)} <span className="text-base text-[#64748B] dark:text-[#94A3B8]">/ 10</span>
                </span>
              </div>
              <div className="h-10 w-px bg-[#E2E8F0] dark:bg-[#1E343F]" />
              <div>
                <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] block">المستوى التقديري</span>
                <span className="text-sm font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                  {currentActiveInsights.score >= 8
                    ? 'ممتاز ومتألق 🌟'
                    : currentActiveInsights.score >= 6
                    ? 'جيد وواعد 🚀'
                    : 'يحتاج عناية وتركيز 💡'}
                </span>
              </div>
            </div>

            {/* Quick Strengths and Challenges bullets */}
            <div className="text-right space-y-3 bg-[#F7F6F2] dark:bg-[#071318] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-xs">
              <div>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  أبرز مواطن القوة:
                </span>
                <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-1">
                  {currentActiveInsights.strengths.slice(0, 3).map((str, i) => (
                    <li key={i}>{isolateNumbersInText(str.replace(/\*\*/g, ''))}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  فرص التحسين:
                </span>
                <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-1">
                  {currentActiveInsights.challenges.slice(0, 3).map((ch, i) => (
                    <li key={i}>{isolateNumbersInText(ch.replace(/\*\*/g, ''))}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Continue CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {onNavigateToAdvisorChat && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCelebration(false);
                    onNavigateToAdvisorChat(currentAdvisor.id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-[#0E1D24] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-[#0F172A] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#1E343F] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>حوار مفتوح مع المستشار</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGoToNextAdvisor}
                className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-xs transition-all hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: currentAdvisor.themeColor,
                }}
              >
                <span>
                  {(completedAdvisors.length >= 7 || stationNumber === 8)
                    ? '🎉 عرض خريطتي المتكاملة (الداشبورد)'
                    : 'المحطة التالية ←'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
