import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { VoiceInput } from '../components/VoiceInput';
import { ReasoningBox } from '../components/ReasoningBox';
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
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../types/lifeBalance';
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
}

interface OnboardingScreenProps {
  initialAdvisorId?: LifeAreaId;
  answers: Record<string, any>;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => void;
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onNavigateToDashboard: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
  theme?: 'light' | 'dark';
}

// Helper: Local client intelligence engine for all advisors (for offline, static hosting, or API fallback)
export function getClientAdvisorResponse(
  advisor: AdvisorConfig,
  text: string,
  currentStep: number,
  totalQuestions: number,
  _userScore?: number,
  currentQ?: any,
  isExplicitAnswer?: boolean
) {
  const msg = text.toLowerCase().trim();
  const advName = advisor.name;
  const advRole = advisor.role;
  const advTitle = advisor.title;

  // تنظيف الرسالة من التحيات التمهيدية لاستخراج الجوهر الحقيقي لكلام المستفيد
  // مثل: "اهلا انا مفلس" -> جوهر الرسالة: "انا مفلس"
  const salutationRegex = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i;
  const coreMsg = msg.replace(salutationRegex, '').trim();
  const isBareGreetingOnly = !coreMsg && /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(msg);

  // 0. بروتوكول استثناء طوارئ إنساني حاسم ومطلق (Safety & Empathy Override) - الأولوية القصوى المطلقة
  // يجب أن يلتقط فوراً أي فكرة عن الموت، الانتحار، إيذاء النفس، التعب الشديد من الحياة، أو الإحباط الوجودي الحاد
  const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(msg);

  if (isCrisisOrDeath) {
    return {
      isCrisis: true,
      isQuestionOrInquiry: true,
      reasoning: `تدخل إنساني طارئ (Safety & Empathy Override): المستفيد يعبر عن ألم نفسي وإنهاك شديد وتفكير في الموت أو إيذاء النفس ("${text}"). تم فوراً تعليق وتجميد كافة مسارات التقييم الأسبوعي والأسئلة الروتينية، وتكريس كامل الحضور النفسي لاحتواء هذا الألم الوجودي الحاد، والتأكيد القاطع على قيمة حياته، وتقديم الدعم الإنساني والمساندة العاجلة دون أي قوالب جامدة أو تأجيل.`,
      summary: `تدخل إنساني طارئ واحتواء عاجل لأزمة نفسية حادة تتعلق بأمان المستفيد وحفظ حياته.`,
      advice: `حياتك غالية وألمك حقيقي ومسموع؛ أرجوك لا تبقَ وحدك في هذا الثقل وتواصل فوراً مع شخص تثق به أو مع جهة دعم نفسي ومختصين لمساندتك.`,
      reply: `أسمعك بكل جوارحي وبكل ألم واهتمام يا صديقنا العزيز، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأرجوك أن تتوقف لحظة وتلتقط أنفاسك بهدوء؛ اعلم أنني هنا معك ولست وحدك أبداً. الألم الهائل والتعب الشديد الذي تشعر به الآن ويجعلك تفكر في الموت هو صرخة لإنهاء هذا الوجع والضغط المرهق، وليست رغبة حقيقية في إنهاء وجودك ونفسك الغالية.\n\nحياتك لها قيمة عظيمة ومكانتك محفوظة حتى لو انطمست الرؤية في هذه اللحظة المظلمة. أرجوك من كل قلبي ألا تبقى وحدك مع هذه المشاعر الثقيلة؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب. أنا هنا معك وأريد لك السلامة والأمان.`,
    };
  }

  // 1. الذكاء الاستشاري التخصصي المباشر لمشاكل كل مستشار (Domain Distress Intelligence)
  // إذا طرح المستفيد مشكلته التخصصية (مثل: "أنا مفلس"، "عاطل"، "وزني زايد"، "ما اصلي") يتم التفاعل معها فوراً
  const isFinancialDistress = /(مفلس|طفران|معدم|ما عندي فلوس|ما عندي فلوس تكفي|ما عندي ولا ريال|ما معي فلوس|ما املك شيء|صفر حسابي|حسابي صفر|ما في فلوس|فقير|فقر|ضائقة مالية|أزمة مالية|ازمة مالية|أنا مفلس|انا مفلس|مفلسين|ديون|مديون|مديونية|قروض|قرض|سلف|سلفة|غرقان ديون|الديون ذبحتني|بطاقة ائتمانية|فيزا|اقساط|أقساط|سداد|متعثر|ايقاف خدمات|إيقاف خدمات|الراتب ما يكفي|راتبي يخلص بسرعة|راتبي طار|الراتب ينتهي|دخل ضعيف|خسرت فلوسي|خسارة في الاسهم|نصب علي|احتيال مالي|ضياع اموال|ما اقدر اوفر|ما اقدر ادخر)/i.test(msg);
  if (isFinancialDistress && (advisor.id === 'financial' || !coreMsg.includes('صلاة'))) {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل أزمة وضائقة مالية حادة لدى المستفيد ("${text}"): المستفيد يصارح المستشار بحالة إفلاس أو نفاد سيولة أو تراكم ديون. التدخل العملي الحكيم يقتضي فك الضغط النفسي فوراً، وتبيان أن الإفلاس المالي عارض إجرائي مؤقت، والبدء بإجراءات الإسعاف المالي الطارئ: إيقاف النزيف الاستهلاكي، حماية مثلث البقاء، والبحث عن تدفق نقدي سريع دون أي تنظير جاف.`,
      summary: `استجابة فورية لأزمة الإفلاس والضائقة المالية والتركيز على خطة إسعاف مالي وإيقاف النزيف.`,
      advice: `الإفلاس مؤقت إذا تم ضبط البوصلة: أوقف أي صرف استهلاكي فوراً، احمِ أساسيات البقاء، ولا تقترض لسداد مصاريف استهلاكية.`,
      reply: `أسمعك بكل وضوح وجدية يا صديقنا العزيز، وأحيّيك على شجاعتك وصراحتك العالية. 🌿\n\nكلمة "أنا مفلس" أو الشعور بنفاد المال ليست نهاية المطاف ولا تحدد قيمتك أو مستقبلك؛ كم من أزمة مالية كانت هي الشرارة التي أطلقت وعياً وتخطيطاً غير مسبوق.\n\nكخبير مالي معك، أولى خطوات الإسعاف المالي العاجل للخروج من هذه الضائقة:\n1. **إيقاف النزيف فوراً**: جمّد أي مصروف غير حيوي تماماً، واقصر إنفاقك حالياً على مثلث البقاء (المسكن، الطعام الأساسي، والصحة).\n2. **تجميد وحصر الالتزامات**: اكتب كل التزام برأس بارد، وإياك أن تقترض لسداد مصاريف استهلاكية.\n3. **البحث عن تدفق نقدي سريع**: ركز على أي مهارة، خدمة، أو بيع مقتنيات غير ضرورية لتوفير سيولة إسعافية عاجلة.\n\nما هو أكبر التزام مالي أو ضغط يواجهك في هذه الأيام لنبدأ بحله معاً خطوة بخطوة؟`,
    };
  }

  const isHealthDistress = /(وزني زايد|سمنة|سمين|كرش|نحيف جدا|شهية مفتوحة|اكل عاطفي|أكل عاطفي|اكل بشراهة|اكل غير صحي|ما انام|أرق|ارق|قلة نوم|نومي ملخبط|اصحى تعبان|سهران|كوابيس|كسول|خامل|ما عندي طاقة|طاقتي صفر|جسمي مكسر|خمول|ارهاق مستمر|ألم في الظهر|صداع|مناعتي ضعيفة|تدخين|ادخن|شيشة|سكر|وجبات سريعة)/i.test(msg);
  if (isHealthDistress && advisor.id === 'health') {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل نداء استغاثة صحي وبدني لدى المستفيد ("${text}"): المستفيد يعاني من اضطراب في النوم أو زيادة الوزن أو خمول الطاقة. التفكير الطبي الحكيم يقتضي احتواء الجسد برفق والبدء بمثلث الحيوية دون حميات قاسية أو إجهاد مفرط.`,
      summary: `احتواء طبي مباشر لمشكلات النوم أو الوزن أو الخمول وبناء روتين استعادة الطاقة.`,
      advice: `الجسد أمانة لا يتحمل الصدمات القاسية: ابدأ بضبط ساعة النوم ليلاً وشرب الماء ومشي 20 دقيقة خفيفة.`,
      reply: `سلامة قلبك وجسدك يا صديقنا العزيز، وأنا معك بكل حنو واهتمام. 🌿\n\nحين يشتكي الجسد من زيادة الوزن، أو قلة النوم، أو انعدام الطاقة، فهو لا يعاقبك، بل يرسل لك نداء استغاثة حقيقي بحاجته إلى إعادة ضبط نمط الحياة ورفع الحمل المرهق عنه.\n\nكطبيب ومرشد صحي معك، دعنا نبدأ بخطة إعادة الحيوية دون تعقيد:\n1. **ضبط مثلث الطاقة**: نوم منتظم (7-8 ساعات) في غرفة مظلمة هو العلاج الأول لاضطراب الهرمونات والشهية.\n2. **ترطيب الجسم**: شرب لترين من الماء يومياً ينعش الخلايا ويطرد السموم ويرفع مستوى التركيز فوراً.\n3. **حركة ميسرة**: 20 دقيقة مشي يومي دون ضغط تفعل المعجزات لمزاجك وحرق الدهون.\n\nما هي العادة الصحية التي تشعر أنك مستعد للبدء بها اليوم لاستعادة نشاطك؟`,
    };
  }

  const isCareerDistress = /(عاطل|عاطلة|بدون وظيفة|ما لقيت وظيفة|مرفوض|رفضوني|خريج جديد|تائه مهنيا|ما ادري ايش اشتغل|ضياع مهني|احتراق وظيفي|مديري ظالم|بيئة عمل سامة|كرهت وظيفتي|دوامي متعب|ضغط العمل|ما في ترقية|راتبي قليل في الدوام|زملاء العمل|مضغوط بالدوام|انتاجيتي ضعيفة|تسويف بالعمل)/i.test(msg);
  if (isCareerDistress && advisor.id === 'career') {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل تحدي مهني وضغط وظيفي حاد لدى المستفيد ("${text}"): رصد مشاعر الإحباط من البطالة أو بيئة العمل السامة أو ضياع البوصلة المهنية. التوجيه يقتضي بناء وضوح استراتيجي وتطوير مهارة فارقة وحماية الطاقة من الاستنزاف.`,
      summary: `توجيه مهني استراتيجي لتجاوز البطالة أو الاحتراق الوظيفي وبناء مسار مهني قوي.`,
      advice: `المسار المهني ماراثون طويل: لا تربط قيمتك برفض وظيفي أو بيئة عمل مؤقتة، وابدأ ببناء مهارة ذات قيمة سوقية عالية.`,
      reply: `أشعر بحجم الضغط أو الإحباط الذي تحمله في صدرك يا صديقنا العزيز. 🌿\n\nسواء كنت تعاني من البطالة والبحث عن عمل، أو تشعر بالاحتراق في بيئة عمل مستنزفة، فاعلم أن هذه المرحلة الصعبة لا تحدد سقف إمكاناتك ولا ترسم مستقبلك المهني.\n\nكمستشار مهني معك، خطواتنا العملية لإعادة ترتيب مسارك:\n1. **حماية طاقتك النفسية**: افصل بين قيمتك الذاتية وبين ظروف الوظيفة الحالية أو الرفض المؤقت.\n2. **بناء مهارة فارقة (Deep Skill)**: ركز طاقتك على تطوير مهارة واحدة محددة ومطلوبة بشدة في سوق العمل تمنحك قوة تفاوضية.\n3. **تنظيم الأولويات بمصفوفة أيزنهاور**: خصص ساعة يومياً في المربع الثاني لتطوير ذاتك والتقديم المنظم بعيداً عن صخب المهام العاجلة.\n\nما هو أكبر عائق مهني تشعر أنه يقف بينك وبين الخطوة التالية؟`,
    };
  }

  const isSpiritualDistress = /(ما اصلي|تارك الصلاة|اقصر في الصلاة|قلبي قاسي|قسوة قلب|ما احس بالخشوع|فتور|تراجع روحي|ذنب|ذنوب|معاصي|تأنيب ضمير|ضائع روحيا|تائه روحيا|ما احس بالسلام|ما في سكينة|حيرة وجودية|وسواس|وساوس|ضيق في الصدر|روحي تعبانة|ما اقرا قران|هاجر القران)/i.test(msg);
  if (isSpiritualDistress && advisor.id === 'spiritual') {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل فتور روحي وحرقة قلبية لدى المستفيد ("${text}"): إدراك أن اعتراف المستفيد بالتقصير هو أصدق علامة على يقظة قلبه ورغبته في السكينة. التوجيه يتطلب احتواءه بالرحمة والرجاء وتسهيل العودة دون جلد للذات.`,
      summary: `احتواء روحي عميق لمشاعر التقصير والفتور وتيسير سبل العودة إلى السكينة الإيمانية.`,
      advice: `الروحانية ليست سباق أرقام: ركعتان بتؤدة وتدبر وسجدة خاشعة خير من أعمال كثيرة يثقلها التشتت والذنب.`,
      reply: `أسمعك بكل مودة وسلام يا صديقنا العزيز، وسلامة قلبك وروحك من هذا الضيق. 🌿\n\nإحساسك بالتقصير في الصلاة، أو خوفك من قسوة القلب والفتور، هو في ذاته أصدق دليل على أن في قلبك بذرة إيمان حية تبحث عن النور والسكينة.\n\nكمرشد روحي لك، اعلم أن الله أرحم بك من نفسك، والرجوع إلى السكينة لا يبدأ بجلد الذات بل بالرفق بها:\n1. **القليل الدائم**: لا تكلف نفسك ما لا تطيق دفعة واحدة؛ ابدأ بالحفاظ على الفريضة بهدوء وطمأنينة دون استعجال.\n2. **خلوة السكينة**: خصص 5 دقائق صمت ودعاء صادق تبث فيه لربك كل ما في صدرك؛ فالدعاء الصادق يغسل قسوة القلوب.\n3. **رفع الذنب بالعمل الصالح**: أتبع السيئة الحسنة تمحها، واعلم أن باب الرضا والسكينة مفتوح دائماً.\n\nما هو الأمر الذي لو فوضته لله اليوم لشعرت بروحك تتنفس بهدوء؟`,
    };
  }

  const isPersonalDistress = /(ثقتي بنفسي ضعيفة|ما عندي ثقة|احس اني فاشل|اكره نفسي|جلد الذات|اقارن نفسي بالناس|دونية|خجل شديد|خوف من الفشل|اسوف|تسويف|كسل|مشتت|ما اقدر التزم|ما عندي ارادة|ما عندي شغف|هدفي ضائع|فوضى في حياتي|حساس زيادة|ما اقدر اتحكم بمشاعري|عصبية|بكاء مستمر)/i.test(msg);
  if (isPersonalDistress && advisor.id === 'personal') {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل أزمة تقدير الذات والتسويف والتشتت الداخلي لدى المستفيد ("${text}"): التفكير النفسي الحكيم يقتضي احتضان المشاعر وكسر حلقة المقارنة وجلد الذات، والتركيز على التعاطف مع النفس وبناء الثقة من خلال إنجازات يومية صغيرة.`,
      summary: `مساندة نفسية لإعادة بناء تقدير الذات والتغلب على التسويف والمقارنات الهدامة.`,
      advice: `تقديرك لذاتك يُبنى يوماً بيوم: كفّ عن مقارنة بداياتك بمواسم حصاد غيرك، وحقق انتصاراً صغيراً اليوم تفتخر به.`,
      reply: `أسمع نبضات قلبك وحيرتك بكل حب واحتواء يا صديقنا العزيز. 🌿\n\nحين تشعر بضعف الثقة بالنفس، أو تجلد ذاتك لأنك تسوف وتفقد الشغف، تذكر أن هذا التعب ليس دليلاً على أنك شخص فاشل، بل هو إشارة إلى أنك حملت نفسك فوق طاقتها وربطت قيمتك بمعايير مرهقة ومقارنات ظالمة.\n\nكمرشدة وموجهة لذاتك معك:\n1. **إيقاف جلد الذات فوراً**: تحدث مع نفسك كما تتحدث مع صديق تحبه وتخاف عليه من الحزن.\n2. **تفكيك المهام الضخمة**: التسويف ينشأ من الخوف من ضخامة الهدف؛ قسّم هدفك إلى خطوات متناهية الصغر (Micro-steps) لا تتجاوز 10 دقائق.\n3. **الاحتفال بالنصر اليومي**: أنجز أمراً واحداً بسيطاً اليوم، ودع شعور الإنجاز يرمم ثقتك خطوة بخطوة.\n\nما هو الشيء الصغير الذي لو أنجزته اليوم سيجعلك تشعر بالرضا عن نفسك؟`,
    };
  }

  const isSocialDistress = /(وحيد|ما عندي اصدقاء|ما عندي ربع|معزول|عزلة اجتماعية|ما احد يسال عني|احس بالوحدة|ما عندي اصحاب|رهاب اجتماعي|اخاف من الناس|اخجل اتكلم|ارتبك في التجمعات|ما اعرف اسولف|انطوائي زيادة|اصدقائي استغلوني|خيانة صديق|غدر|ناس سامين|صداقة مزيفة)/i.test(msg);
  if (isSocialDistress && advisor.id === 'social') {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل ألم العزلة والوحدة أو الخذلان الاجتماعي لدى المستفيد ("${text}"): الإنسان كائن اجتماعي بطبعه، والوحدة أو الخوف من أحكام الناس يثقلان الروح. التفكير الاجتماعي الحكيم يقتضي بناء الثقة بالأمان الاجتماعي والبدء بعلاقات نوعية صغيرة.`,
      summary: `توجيه اجتماعي دافئ لاحتواء مشاعر الوحدة وتفكيك الرهاب الاجتماعي وبناء علاقات حقيقية.`,
      advice: `الجودة أهم من الكثرة: صديق واحد صادق ومخلص يشبهك في قيمك خير من عشرات العلاقات السطحية المستنزفة.`,
      reply: `أشعر بصدق بكل كلمة كتبتها وبثقل هذا الشعور في صدرك يا صديقنا العزيز. 🌿\n\nالوحدة، أو الشعور بأنك لا تجد الصديق الصادق الذي يفهمك، أو الخوف والارتباك وسط التجمعات، هو ألم إنساني يمر به الكثيرون في زمن طغت فيه العلاقات السطحية خلف الشاشات.\n\nكمرشد اجتماعي وصديق معك:\n1. **أنت لست منبوذاً ولا غريباً**: صعوبة تكوين الصداقات لا تعني أنك غير محبوب، بل تعني أنك تبحث عن عمق وصدق لا تجده في البيئات العابرة.\n2. **البحث في دوائر الشغف**: أفضل الصداقات تنشأ بشكل عفوي في أماكن الاهتمامات المشتركة (تطوع، دورات، نوادي قراءة أو رياضة)، وليس بالتصنع.\n3. **خطوة تواصل صغيرة**: لا تعزل نفسك تماماً؛ بادر بابتسامة أو كلمة طيبة مع شخص واحد ترتاح له في محيطك.\n\nما الذي يجعلك تشعر بالحذر أو التردد في التواصل مع الناس حالياً؟`,
    };
  }

  // 2. مشاعر التعب الشديد والحزن والضيق والفضفضة النفسية العامة (Exhaustion & Grief)
  const isGriefOrExhaustion = /(متعب|تعبان|تعبت|تعب|حزين|حزن|مكتئب|اكتئاب|ضايق|مخنوق|طفشان|محتار|تائه|ضياع|خائف|خوف|قلق|توتر|غضب|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|مرهق|إرهاق|ارهاق|ثقل|موجوع|وجع|ألم|الم|منهار|محبط|إحباط)/i.test(msg);

  if (isGriefOrExhaustion) {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل مشاعر الإنهاك والحزن والضيق النفسي لدى المستفيد: إدراك أن المشاعر المتألمة تحتاج إلى إنصات واحتواء إنساني دافئ قبل أي نصائح عملية، وكسر حلقة العزلة والضغط الداخلي.`,
      summary: `احتواء إنساني دافئ لمشاعر الحزن والتعب والضيق، وتقديم سند معنوي يخفف وطأة المشاعر.`,
      advice: `الحزن والإنهاك رسائل من الجسد والروح بحاجتهما للراحة والتفريغ؛ لا تكابر وامنح نفسك فرصة لالتقاط الأنفاس.`,
      reply: `سلامة قلبك وروحك يا صديقنا العزيز. يؤلمني حقاً أن تشعر بهذا الحزن أو التعب والثقل، لكن اعلم أن مرور الإنسان بفترات انطفاء وثقل هو أمر إنساني طبيعي جداً، ولست وحدك في هذا الشعور.\n\nخذ نفساً عميقاً ولا تقسُ على نفسك؛ أنا هنا معك بكامل حضوري لأسمعك وأفكر معك دون أي قيود أو أحكام. ما الذي حدث وجعلك تشعر بهذا الثقل المرهق اليوم؟ شاركني ما في قلبك.`,
    };
  }

  // 3. مشاعر الغضب والسب ولعن الحياة ("اسب", "العن", "اللعن", "الحياة")
  if (/(اسب|أسب|العن|اللعن|ألعن|السب|اللعنة|الشتيمة|اشتم|أشتم)/i.test(msg)) {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تفكيك مشاعر الغضب والألم الوجودي الكامن خلف الرغبة في التعبير الصادم ("${text}")، واحتواء الإنسان دون إطلاق أحكام مسبقة، وتبيان أن الرغبة في الصراخ أو السخط هي صرخة استغاثة تعبر عن ألم حقيقي، وتوجيه الطاقة نحو التفريغ الصحي الآمن دون تدمير الذات أو إثقال الروح.`,
      summary: `احتواء مباشر لمشاعر الغضب والألم والضغط النفسي الشديد دون أحكام، والتوجيه نحو التفريغ الآمن.`,
      advice: `تفريغ الغضب يكون بالبوح والتنفس واللجوء لمن بيده تدبير الأمر، فالسب واللعن لن يغيّر ما حدث بل يزيد القلب قسوة ومرارة.`,
      reply: `أشعر بحجم الألم والثقل الذي تحمله في صدرك يا صديقنا العزيز. حين تبلغ بنا الخيبة والتعب مداها، تتولد في دواخلنا رغبة عارمة في الصراخ واللعن كصرخة استغاثة للبحث عن متنفس.\n\nمن حقك تماماً أن تشعر بالألم والغضب، وأنا هنا لست لأحاكمك أو أملي عليك ما تشعر به، بل لأحتويك وأسمعك بصدق. لكن اعلم بقلبك أن سب الحياة أو لعن الأقدار لن يرفع الهم ولن يشفي الجرح، بل يترك في روحك مرارة مضاعفة.\n\nخذ نفساً عميقاً، وأفرغ ما في صدرك؛ ما هو الشيء الأكثر إيلاماً الذي يضغط على روحك الآن وتود لو تتخلص منه؟`,
    };
  }

  // 4. السؤال المباشر والصريح عن حال المستشار ("كيف حالك" / "كيفك" / "شلونك")
  const isAskingHowAdvisorIs = /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(msg);
  if (isAskingHowAdvisorIs) {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل حواري إنساني: المستفيد يسأل باهتمام وود عن حال المستشار ("${text}"). التفكير الحكيم يقتضي مبادلته التحية والاطمئنان الدافئ كمرشد ورفيق درب.`,
      summary: `تفاعل إنساني دافئ واطمئنان متبادل مع المستفيد في ${advTitle}.`,
      advice: `أنا بخير وصحة ممتازة وسعيد وممتن جداً بسؤالك الطيب! كامل حضوري وتركيزي معك لنرتقي معاً في كل أبعاد ${advTitle}.`,
      reply: `أهلاً وسهلاً بك يا صديقنا الحبيب! أنا بخير وبأحسن حال، وسعيد وممتن جداً بسؤالك الطيب عني ودفء حضورك. 🌿\n\nبصفتي ${advName} (${advRole})، أنا معك هنا بكامل حضوري وطاقتي لأصغي إليك وأفكر معك خطوة بخطوة في رحلتك نحو التوازن.\n\nكيف تشعر اليوم؟ وما الذي يشغل بالك لنبدأ به معاً؟`,
    };
  }

  // 5. التحيات العامة العفوية المجردة فقط (مثل "هلا", "مرحبا", "سلام", "أهلاً دكتور") بدون كلام إضافي
  if (isBareGreetingOnly) {
    return {
      isQuestionOrInquiry: true,
      reasoning: `تحية إنسانية عفوية من المستفيد ("${text}"): الترحيب الدافئ كمرشد ورفيق درب وفتح باب الحوار بأريحية تامة دون أي قوالب جامدة.`,
      summary: `الترحيب بالمستفيد واستكشاف ما يشغل باله في ${advTitle}.`,
      advice: `أهلاً بك دائماً؛ كامل الحضور والإصغاء معك لنبدأ بأي جانب تود التركيز عليه.`,
      reply: `أهلاً وسهلاً بك يا صديقنا العزيز! يسعدني جداً حضورك وتواصلك. 🌿\n\nمعك ${advName} (${advRole}). أنا هنا معك ومستعد للإصغاء والتفكير معك في كل ما يشغل بالك في ${advTitle}.\n\nكيف تسير أمورك اليوم؟ وما الذي تود أن نتناوله معاً؟`,
    };
  }

  // 5. الأسئلة والاستفسارات المباشرة (مع منع تطابق حرف الجر "من")
  const isDirectQuestion = msg.includes('؟') || msg.includes('?') || /(^|\s)(هل|كيف|لماذا|ليه|ماذا|ايش|وش|ما|من هو|من هي|من هم|من أنت|من انت|مين|من الذي|من التي|متى|أين|اين|كم|شو|شلون|شنو|جاوب|جاوبني|رد|رد علي|أنا أسألك|انا اسالك|ما رأيك|برأيك|ممكن)(\s|\?|؟|$)/i.test(msg);
  if (isDirectQuestion) {
    let specificReply = `سؤال وجيه ومهم جداً يا صديقنا. رداً على استفسارك المباشر بخصوص ${advTitle}:\n\nالاتزان الحقيقي لا يعني ألا نمر بأوقات صعبة، بل يعني أن نملك البصيرة والمرونة للتعامل معها بهدوء. ما طرحته يعكس وعيك ورغبتك في الفهم، والخطوة الأهم هي أن تأخذ الأمور بتدرج ورفق دون جلد للذات.`;
    if (advisor.id === 'spiritual') {
      specificReply = `سؤالك في صميم الروحانية والسكينة يا صديقنا. الإجابة المباشرة: الروحانية ليست قائمة واجبات جافة، بل هي سلام داخلي وحضور قلب وحسن ظن بالله. حين تتشابك عليك الأمور، الجأ إلى السكينة البسيطة: صلاة خاشعة، ودعاء صادق، وتفريغ لشتات الذهن.`;
    } else if (advisor.id === 'financial') {
      specificReply = `رداً على استفسارك المالي المباشر: القاعدة الذهبية هي ضبط النفقات العاطفية، وبناء صندوق طوارئ يمنحك الأمان النفسي، والتركيز على العادات المالية التراكمية اليومية قبل البحث عن حلول سريعة.`;
    } else if (advisor.id === 'health') {
      specificReply = `رداً على استفسارك الصحي المباشر: الطاقة والحيوية تنبع من أبسط العادات اليومية: نوم منتظم وعميق (7-8 ساعات)، شرب كميات كافية من الماء، وتخصيص 20 دقيقة حركة يومية. ابدأ بهذه الأساسيات وستلاحظ الفرق في تركيزك ومزاجك.`;
    } else if (advisor.id === 'career') {
      specificReply = `رداً على استفسارك المهني المباشر: النجاح المهني يتطلب وضوح البوصلة، والتركيز على بناء مهارة استثنائية (Deep Work) تمنحك قيمة سوقية حقيقية، مع تنظيم الأولويات وحماية وقتك من المهام الهامشية.`;
    }

    return {
      isQuestionOrInquiry: true,
      reasoning: `تحليل استفسار المستفيد المباشر في ${advTitle} ("${text}"): تقديم إجابة شافية وواضحة تركز على جوهر السؤال وتمنحه فهماً عملياً مباشراً.`,
      summary: `إجابة استشارية مباشرة وتفاعل حي مع سؤال المستفيد.`,
      advice: `الاتزان يبدأ بالوضوح والتركيز على خطوة واحدة قابلة للتطبيق اليوم.`,
      reply: specificReply,
    };
  }

  // 6. فحص هل المدخل إجابة تقييمية صريحة (درجة رقمية أو خيار محدد أو شريحة تفكير)
  const ratingMatch = msg.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i) || msg.match(/^(?:تقييمي:?\s*)?\d+(?:\.\d+)?/i);
  const isOptionMatch = Boolean(currentQ?.options?.some((o: any) => o.label?.toLowerCase().trim() === msg || o.id?.toLowerCase().trim() === msg));
  const isAnswer = isExplicitAnswer || Boolean(ratingMatch) || isOptionMatch || text.startsWith('تقييمي:');

  if (isAnswer) {
    if (ratingMatch) {
      const scoreNum = Math.min(10, Math.max(1, parseFloat(ratingMatch[1] || '5')));
      if (scoreNum <= 4) {
        return {
          isQuestionOrInquiry: false,
          reasoning: `تحليل تقييم مرحلي منخفض (${scoreNum}/10) في المحطة (${currentStep + 1} من ${totalQuestions}) بـ ${advTitle}: رصد معطيات الضغط أو الفتور، وتقديم احتواء نفسي دافئ يؤكد أن الصراحة في التقييم هي نقطة الانطلاق الأساسية لإعادة التوازن دون جلد الذات.`,
          summary: `تسجيل تقييم (${scoreNum}/10) في المحطة ${currentStep + 1} واحتواء التحدي بمرونة واهتمام.`,
          advice: `الاعتراف بالضغط الحالي هو أولى خطوات التعافي؛ خطوة يومية صغيرة تكفي لاستعادة التوازن.`,
          reply: `أحيّيك على صدقك وشفافيتك في مشاركة هذا التقييم (${scoreNum} من 10) يا صديقنا العزيز. مرورك بفترة تراجع أو ضغط في ${advTitle} هو أمر يمر به الكثيرون وسط تسارع الحياة وصعوباتها. هدفنا هنا ليس المحاكمة، بل تفكيك هذا الثقل معاً وبناء سكينتك واتزانك خطوة بخطوة.`,
        };
      } else if (scoreNum <= 7) {
        return {
          isQuestionOrInquiry: false,
          reasoning: `تحليل تقييم مرحلي متزن (${scoreNum}/10) في المحطة (${currentStep + 1} من ${totalQuestions}) بـ ${advTitle}: رصد وجود قاعدة استقرار جيدة مع وجود مساحة تطوير ملموسة لتعميق الأثر وتحقيق الاستدامة.`,
          summary: `تسجيل تقييم متزن (${scoreNum}/10) في المحطة ${currentStep + 1} وتحديد فرص التطوير.`,
          advice: `البناء على نقاط القوة الحالية وحماية وقتك وطاقتك من المشتتات العابرة.`,
          reply: `تقييمك المتزن (${scoreNum} من 10) يعكس وعياً طيباً بقاعدتك الحالية في ${advTitle}. لديك أساس جيد يمكنك البناء عليه لتعميق الأثر والوصول إلى مستويات أعلى من الرضا والاستقرار.`,
        };
      } else {
        return {
          isQuestionOrInquiry: false,
          reasoning: `تحليل تقييم مرحلي متقدم (${scoreNum}/10) في المحطة (${currentStep + 1} من ${totalQuestions}) بـ ${advTitle}: رصد نضج وانسجام متميز في هذا البعد، والتركيز على تعزيز الاستدامة وتجنب الانتكاس.`,
          summary: `تسجيل تقييم متقدم (${scoreNum}/10) في المحطة ${currentStep + 1} يبرز القوة والانسجام.`,
          advice: `الاستمرار على العادات الراسخة والبيئة المحفزة التي أوصلتك لهذا المستوى الممتاز.`,
          reply: `ما شاء الله، نتيجة ملهمة ومبهجة (${scoreNum} من 10) تعكس صفاءً حقيقياً وعملاً متواصلاً في ${advTitle}. هذا الاستقرار هو مكسب كبير لحياتك يستحق الحفاظ عليه ودعمه.`,
        };
      }
    }

    return {
      isQuestionOrInquiry: false,
      reasoning: `تحليل خيار المستفيد في المحطة (${currentStep + 1} من ${totalQuestions}) بـ ${advTitle}: تفكيك المعطى وربطه بمنهجية وازن لبناء عادات مستدامة.`,
      summary: `رصد إجابة المحطة ${currentStep + 1} من ${totalQuestions} بنجاح.`,
      advice: `خطوتك القادمة تصنع فرقاً حقيقياً إذا واصلت التركيز على العادات اليومية المستدامة.`,
      reply: `سجلت إجابتك بوعي وتقدير تام يا صديقنا؛ هذا الوضوح يمنحنا رؤية أدق لتوجيه مسارك نحو أقصى درجات الاتزان.`,
    };
  }

  // 7. الافتراضي للإجابات
  return {
    isQuestionOrInquiry: false,
    reasoning: `تحليل إجابة المستفيد على المحطة (${currentStep + 1} من ${totalQuestions}): رصد المعطيات وربطها بأبعاد ${advTitle} وتحديد أثرها على عجلة الحياة.`,
    summary: `رصد إجابة المحطة ${currentStep + 1} من ${totalQuestions} بنجاح.`,
    advice: `خطوتك القادمة تصنع فرقاً حقيقياً إذا واصلت التركيز على العادات اليومية المستدامة.`,
    reply: `أسمعك بكل تقدير واحتواء يا صديقنا، ورصدت ما شاركته بوعي تام.`,
  };
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  onSaveAnswer,
  onFinishAdvisor,
  onCompleteAll,
  completedAdvisors,
  completedDates,
  onNavigateToDashboard,
  onNavigateToAdvisorChat,
  theme: _theme = 'light',
}) => {
  const [currentAdvisorIndex, setCurrentAdvisorIndex] = useState(() => {
    const idx = ADVISORS_LIST.findIndex((a) => a.id === initialAdvisorId);
    return idx >= 0 ? idx : 0;
  });

  const [inputText, setInputText] = useState('');
  const [clinicMode, setClinicMode] = useState<'evaluation' | 'free_chat'>('evaluation');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAdvisorReplying, setIsAdvisorReplying] = useState(false);
  const [aiMode, setAiMode] = useState<AiModelMode>(() => {
    return (localStorage.getItem('wazan_ai_mode') as AiModelMode) || (localStorage.getItem('tadbeer_ai_mode') as AiModelMode) || 'balanced';
  });
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('wazan_ai_mode', mode);
  };

  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  // Chat conversation state per advisor
  const [chatMessages, setChatMessages] = useState<Record<string, EvaluationChatMessage[]>>({});
  // Step in the 3-phase weekly evaluation ritual:
  // 0: Welcome, Listening & Initial Rating (1-10)
  // 1: Exploring Core Obstacle / Challenge
  // 2: Weekly Diagnosis, Golden Prescription & Domain Locked
  const [advisorStep, setAdvisorStep] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const currentStep = advisorStep[currentAdvisor.id] || 0;

  // Determine if current advisor is completed / locked for this week
  const isCompleted = completedAdvisors.includes(currentAdvisor.id);
  const isLocked = isCompleted || isAdvisorWeeklyLocked(currentAdvisor.id, completedDates);

  // All 8 domains completed state
  const isAllCompleted = completedAdvisors.length >= 8;

  const totalQuestions = currentAdvisor.questions?.length || 8;
  const currentQuestion = currentAdvisor.questions?.[Math.min(currentStep, totalQuestions - 1)];

  // Initialize welcoming message for weekly clinic evaluation with Question 1 of 8
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    if (!chatMessages[advisorKey] || chatMessages[advisorKey].length === 0) {
      const q1 = currentAdvisor.questions?.[0] || {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب هذا الأسبوع؟',
        description: 'ما تقييمك لمستوى رضاك الحالي من 1 إلى 10؟',
      };
      const initialMsgs: EvaluationChatMessage[] = [
        {
          id: 'welcome',
          sender: 'advisor',
          text: `مرحباً بك يا ضيف وازن في عيادة التقييم الخاصة بـ "${currentAdvisor.title}" 🌿\n\nأنا ${currentAdvisor.name}، ${currentAdvisor.role}.\nسنخوض معاً تقييماً شاملاً يتكون من 8 محطات رئيسية لتشخيص هذا الجانب بعناية وبناء خطوات عملية متزنة.\n\n📌 **السؤال (1 من 8):**\n${q1.title}${q1.description ? `\n💡 ${q1.description}` : ''}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setChatMessages((prev) => ({ ...prev, [advisorKey]: initialMsgs }));
      setAdvisorStep((prev) => ({ ...prev, [advisorKey]: 0 }));
    }
  }, [currentAdvisorIndex, currentAdvisor]);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentAdvisorIndex]);

  // Finish and approve current advisor assessment immediately
  const handleFinishCurrentAdvisor = () => {
    const calculatedScore = calculateScoreForAdvisor(currentAdvisor, answers);
    const scoreToSave = calculatedScore > 0 ? calculatedScore : 7.5;
    onFinishAdvisor(currentAdvisor.id, scoreToSave);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
    setShowCelebration(true);
  };

  // Reset and restart evaluation for current advisor
  const handleResetCurrentAdvisor = () => {
    const advisorKey = currentAdvisor.id;
    setAdvisorStep((prev) => ({ ...prev, [advisorKey]: 0 }));
    const q1 = currentAdvisor.questions?.[0] || {
      title: 'كيف تصف حالك وشعورك العام في هذا الجانب هذا الأسبوع؟',
      description: 'ما تقييمك لمستوى رضاك الحالي من 1 إلى 10؟',
    };
    const initialMsgs: EvaluationChatMessage[] = [
      {
        id: `welcome_${Date.now()}`,
        sender: 'advisor',
        text: `مرحباً بك مجدداً في عيادة "${currentAdvisor.title}" 🌿\n\nأنا ${currentAdvisor.name}، ${currentAdvisor.role}.\nأنا معك لبدء التقييم من جديد بكل أريحية عبر محطاته الـ 8 الكاملة.\n\n📌 **السؤال (1 من 8):**\n${q1.title}${q1.description ? `\n💡 ${q1.description}` : ''}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatMessages((prev) => ({ ...prev, [advisorKey]: initialMsgs }));
  };

  // Move to next incomplete advisor
  const handleGoToNextAdvisor = () => {
    setShowCelebration(false);
    // Find next incomplete advisor index
    const nextIdx = ADVISORS_LIST.findIndex(
      (adv, i) => i > currentAdvisorIndex && !completedAdvisors.includes(adv.id)
    );
    if (nextIdx >= 0) {
      setCurrentAdvisorIndex(nextIdx);
    } else {
      // Find first incomplete anywhere
      const firstIncomplete = ADVISORS_LIST.findIndex(
        (adv) => !completedAdvisors.includes(adv.id)
      );
      if (firstIncomplete >= 0) {
        setCurrentAdvisorIndex(firstIncomplete);
      } else {
        // All completed!
        onCompleteAll();
      }
    }
  };

  // Handle user response with structured 8-question clinical assessment or direct conversation
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

    // تنظيف الرسالة من التحيات التمهيدية لاستخراج الجوهر الحقيقي
    const salutationRegex = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i;
    const coreText = text.toLowerCase().trim().replace(salutationRegex, '').trim();
    const isBareGreetingOnly = !coreText && /(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)/i.test(text.toLowerCase());

    // 0. بروتوكول استثناء طوارئ إنساني فوري (Safety & Empathy Override) - الأولوية المطلقة
    const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(text.toLowerCase());

    // 1. الذكاء الاستشاري التخصصي لمشاكل المستشارين (المفلس، العاطل، الوزن، الصلاة، التشتت...)
    const isDomainDistress = /(مفلس|طفران|معدم|ما عندي فلوس|صفر حسابي|ديون|مديون|قروض|سلف|الراتب ما يكفي|خسرت فلوسي|وزني زايد|سمنة|سمين|ما انام|أرق|كسول|خامل|ما عندي طاقة|جسمي مكسر|عاطل|عاطلة|بدون وظيفة|مرفوض|احتراق وظيفي|مديري ظالم|بيئة عمل سامة|كرهت وظيفتي|ما اصلي|قلبي قاسي|فتور|تراجع روحي|ذنب|ضائع روحيا|ثقتي بنفسي ضعيفة|احس اني فاشل|جلد الذات|اسوف|تسويف|ما اقدر اركز|انسى بسرعة|تشتت ذهني|مشاكل مع اهلي|خلافات عائلية|اهلي ما يفهموني|طلاق|وحيد|ما عندي اصدقاء|رهاب اجتماعي|اخاف من الناس|حياتي كلها متلخبطة)/i.test(text.toLowerCase());

    // 2. مشاعر التعب الشديد والحزن والضيق
    const isGriefOrExhaustion = /(متعب|تعبان|تعبت|تعب|حزين|حزن|مكتئب|اكتئاب|ضايق|مخنوق|طفشان|محتار|تائه|ضياع|خائف|خوف|قلق|توتر|غضب|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|مرهق|إرهاق|ارهاق|ثقل|موجوع|وجع|ألم|الم|منهار|محبط|إحباط)/i.test(text.toLowerCase());

    // 3. مشاعر الغضب والسب
    const isCurseOrAnger = /(اسب|أسب|العن|اللعن|ألعن|السب|اللعنة|الشتيمة|اشتم|أشتم)/i.test(text.toLowerCase());

    // 4. السؤال الصريح عن حال المستشار
    const isAskingHowAdvisorIs = /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(text.toLowerCase());

    // 5. الأسئلة والاستفسارات الحرة المباشرة
    const isDirectQuestion = text.includes('؟') || text.includes('?') || /(^|\s)(هل|كيف|لماذا|ليه|ماذا|ايش|وش|ما|من هو|من هي|من هم|من أنت|من انت|مين|من الذي|من التي|متى|أين|اين|كم|شو|شلون|شنو|جاوب|جاوبني|رد|رد علي|أنا أسألك|انا اسالك|ما رأيك|برأيك|ممكن)(\s|\?|؟|$)/i.test(text.toLowerCase());

    // أي من هذه الحالات يعتبر تفاعلاً حراً ولا يقدم إجابة تقييمية
    const isQuestionOrInquiry =
      isCrisisOrDeath ||
      isDomainDistress ||
      isGriefOrExhaustion ||
      isCurseOrAnger ||
      isAskingHowAdvisorIs ||
      isBareGreetingOnly ||
      isDirectQuestion ||
      clinicMode === 'free_chat';

    const currentQ = currentAdvisor.questions?.[currentStep] || currentAdvisor.questions?.[0];

    // 6. فحص هل المدخل إجابة صريحة على السؤال التقييمي الحالي (فقط إذا لم يكن محادثة حرة أو سؤالاً أو طوارئ)
    const ratingMatch = text.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i) || text.match(/^(?:تقييمي:?\s*)?\d+(?:\.\d+)?/i);
    const isOptionAnswer = Boolean(currentQ?.options?.some((o) => o.label?.trim() === text.trim() || o.id === text.trim()));
    const isEvaluationPrefix = text.startsWith('تقييمي:');
    const isDirectEvaluationAnswer = !isQuestionOrInquiry && (Boolean(ratingMatch) || isOptionAnswer || isEvaluationPrefix);

    // If it's an answer to the current evaluation question (NOT a question or free thought)
    let nextStep = currentStep;
    if (isDirectEvaluationAnswer && !isQuestionOrInquiry && currentStep < totalQuestions) {
      if (currentQ.type === 'rating' && ratingMatch) {
        const num = Math.min(10, Math.max(1, parseFloat(ratingMatch[1] || '5')));
        onSaveAnswer(currentAdvisor.id, currentQ.id, num);
      } else if (currentQ.type === 'multiple_choice') {
        const matchedOpt = currentQ.options?.find((o) => o.label === text || o.id === text);
        onSaveAnswer(currentAdvisor.id, currentQ.id, matchedOpt ? matchedOpt.id : text);
      } else if (currentQ.type === 'multi_select') {
        onSaveAnswer(currentAdvisor.id, currentQ.id, [text]);
      } else {
        onSaveAnswer(currentAdvisor.id, currentQ.id, text);
      }
      nextStep = currentStep + 1;
      setAdvisorStep((prev) => ({ ...prev, [advisorKey]: nextStep }));
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

      // Call AI Agent API
      let replyContent = '';
      let reasoningContent = '';
      let summaryContent = '';
      let adviceContent = '';

      try {
        const res = await fetch('/api/gemini/advisor-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisor: currentAdvisor,
            message: text,
            history,
            answers,
            userScore: calculateScoreForAdvisor(currentAdvisor, answers),
            aiMode,
            isEvaluationSession: !isQuestionOrInquiry && clinicMode === 'evaluation',
            evaluationStep: nextStep,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          reasoningContent = data.reasoning || '';
          summaryContent = data.summary || '';
          adviceContent = data.advice || '';
          replyContent = data.reply || adviceContent || summaryContent || '';

          // Defensive check if replyContent is a raw JSON string
          if (typeof replyContent === 'string' && (replyContent.startsWith('{') || replyContent.includes('"reasoning"'))) {
            try {
              const innerMatch = replyContent.match(/\{[\s\S]*\}/);
              if (innerMatch) {
                const inner = JSON.parse(innerMatch[0]);
                reasoningContent = inner.reasoning || reasoningContent;
                summaryContent = inner.summary || summaryContent;
                adviceContent = inner.advice || adviceContent;
                replyContent = inner.reply || inner.advice || inner.summary || '';
              }
            } catch {
              // keep
            }
          }
        }
      } catch (fetchErr) {
        console.warn('API call failed or offline, activating client intelligence engine:', fetchErr);
      }

      // If reply is empty, activate local client intelligence
      if (!replyContent) {
        const local = getClientAdvisorResponse(
          currentAdvisor,
          text,
          currentStep,
          totalQuestions,
          calculateScoreForAdvisor(currentAdvisor, answers),
          currentQ,
          isDirectEvaluationAnswer
        );
        reasoningContent = local.reasoning;
        summaryContent = local.summary;
        adviceContent = local.advice;
        replyContent = local.reply;
      }

      // If user was answering an evaluation question, advance smoothly to next question
      if (!isQuestionOrInquiry && isDirectEvaluationAnswer) {
        if (nextStep < totalQuestions) {
          const nextQ = currentAdvisor.questions[nextStep];
          replyContent += `\n\n📌 **السؤال (${nextStep + 1} من ${totalQuestions}):**\n${nextQ.title}${nextQ.description ? `\n💡 ${nextQ.description}` : ''}`;
        } else {
          // Completed all 8 questions!
          const finalScore = calculateScoreForAdvisor(currentAdvisor, answers);
          const scoreToSave = finalScore > 0 ? finalScore : 7.5;
          const goldenHabit = currentAdvisor.defaultGoals[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
          replyContent += `\n\n🎉 مبارك يا صديقنا! أكملت بنجاح كافة محطات التقييم الـ 8 في عيادة ${currentAdvisor.title}.\n\nرصدنا درجتك المعتمدة: (${scoreToSave.toFixed(1)} من 10).\n\n📌 **توصيتي الذهبية لهذا الأسبوع:**\n${goldenHabit}.\n\nتم اعتماد التقييم بنجاح في عجلة حياتك، وباب الحوار والاستشارة مفتوح معك دائماً لأي استفسارات أو تفاصيل إضافية.`;
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
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      // When ALL 8 questions are complete, record completion badge
      if (!isQuestionOrInquiry && nextStep >= totalQuestions) {
        const finalScore = calculateScoreForAdvisor(currentAdvisor, answers);
        const scoreToSave = finalScore > 0 ? finalScore : 7.5;
        onFinishAdvisor(currentAdvisor.id, scoreToSave);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.7 },
        });
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Advisor chat error in onboarding:', err);
      const local = getClientAdvisorResponse(
        currentAdvisor,
        text,
        currentStep,
        totalQuestions,
        calculateScoreForAdvisor(currentAdvisor, answers),
        currentQ
      );

      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'advisor',
        text: local.reply,
        reasoning: local.reasoning,
        summary: local.summary,
        advice: local.advice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));
    } finally {
      setIsAdvisorReplying(false);
    }
  };

  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const insights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);
  const activeConversation = chatMessages[currentAdvisor.id] || [];

  // Quick reflection suggestions derived safely from advisor data without ever crashing
  const quickReflectionPills = useMemo(() => {
    const questionOptions = currentAdvisor.questions?.flatMap((q) => q.options?.map((o) => o.label) || []) || [];
    const suggestions = currentAdvisor.suggestedQuestions || [];
    const goals = currentAdvisor.defaultGoals || [];
    const pills = [
      ...questionOptions.slice(0, 3),
      ...suggestions.slice(0, 2),
      ...goals.slice(0, 1),
    ];
    return pills.length > 0
      ? pills
      : [
          'ضيق الوقت وتسارع الروتين اليومي',
          'التشتت بكثرة المهام والأجهزة',
          'التسويف وصعوبة الالتزام بالعادة',
        ];
  }, [currentAdvisor]);

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
                <h3 className="text-base font-black">اكتملت خريطتك الأسبوعية المتكاملة (8 من 8)!</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  مكتمل ومقفل للأسبوع 🔒
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

      {/* Top Advisor Selector Tabs */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">جلسات التقييم الأسبوعي:</span>
            <span className="text-xs font-black text-[#0F6E6E] dark:text-[#22D3EE]">
              {currentAdvisor.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">
            <span>المكتمل: {completedAdvisors.length} من 8</span>
            <div className="w-20 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F6E6E] dark:bg-[#22D3EE] transition-all duration-300"
                style={{ width: `${(completedAdvisors.length / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Advisor Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ADVISORS_LIST.map((advisor, index) => {
            const isAdvCompleted = completedAdvisors.includes(advisor.id);
            const isCurrent = index === currentAdvisorIndex;

            return (
              <button
                key={advisor.id}
                onClick={() => {
                  setCurrentAdvisorIndex(index);
                  setShowCelebration(false);
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isCurrent
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-[#0F6E6E] dark:border-[#0891B2] shadow-xs'
                    : isAdvCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-[#F7F6F2] dark:bg-[#0B161C] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E343F] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                }`}
              >
                <span>{advisor.avatarSvg}</span>
                <span>{advisor.title}</span>
                {isAdvCompleted && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface (Clean AI Clinic Window) */}
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
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">{currentAdvisor.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clinic Mode Toggle (Evaluation 8 Stations vs Free Direct Consultation) */}
            <div className="flex items-center gap-1 p-0.5 bg-[#F7F6F2] dark:bg-[#071318] rounded-xl border border-[#E2E8F0] dark:border-[#1E343F]">
              <button
                type="button"
                onClick={() => setClinicMode('evaluation')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  clinicMode === 'evaluation'
                    ? 'bg-white dark:bg-[#0E1D24] text-[#0F6E6E] dark:text-[#22D3EE] shadow-xs border border-slate-200/80 dark:border-[#1E343F]'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                }`}
                title="تقييم إكلينيكي منظم عبر 8 محطات"
              >
                جلسة تقييم (8 محطات)
              </button>
              <button
                type="button"
                onClick={() => setClinicMode('free_chat')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  clinicMode === 'free_chat'
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white shadow-xs'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                }`}
                title="حوار حر واستشارة مباشرة بدون قيود"
              >
                حوار واستشارة حرة 💬
              </button>
            </div>

            {/* AI Model Mode Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm"
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
                      <span className="text-[9px] text-[#475569] dark:text-[#94A3B8]">اختر سرعة وعمق التحليل أثناء الحوار</span>
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
                            className={`w-full text-right p-2 rounded-xl transition-all flex items-start gap-2 border ${
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
                              <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] leading-tight mt-0.5">{mode.desc}</p>
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

            {/* Quick approve button if not locked yet */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleFinishCurrentAdvisor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="اعتماد النتيجة الفورية وإقفال الجلسة"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد ({currentAdvisorScore > 0 ? currentAdvisorScore : 7}/10)</span>
              </button>
            )}
          </div>
        </div>

        {/* Assessment Progress Bar OR Free Consultation Bar */}
        {clinicMode === 'evaluation' ? (
          <div className="px-6 py-2 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between gap-4 text-xs flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-[#0F6E6E] dark:text-[#22D3EE] text-[11px] sm:text-xs flex-shrink-0">
                {currentStep < totalQuestions ? `المحطة (${currentStep + 1} من ${totalQuestions})` : 'اكتملت الأسئلة الـ 8 بنجاح ✨'}
              </span>
              <span className="text-[11px] text-[#475569] dark:text-[#94A3B8] hidden sm:inline truncate">
                {currentStep < totalQuestions ? currentQuestion?.title : 'تم رصد واعتماد النتيجة الموثقة'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-24 sm:w-36 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0F6E6E] dark:bg-[#22D3EE] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round(((isCompleted ? totalQuestions : currentStep) / totalQuestions) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8]">
                {Math.min(100, Math.round(((isCompleted ? totalQuestions : currentStep) / totalQuestions) * 100))}%
              </span>
            </div>
          </div>
        ) : (
          <div className="px-6 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-4 text-xs flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="font-bold text-emerald-950 dark:text-emerald-300 text-xs flex-shrink-0">
                وضع الحوار والاستشارة الحرة مع {currentAdvisor.name} 🌿
              </span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-400 hidden sm:inline truncate">
                تفاعل مباشر وإنساني يجيب على أي سؤال أو مشاعر تشاركها دون قيود
              </span>
            </div>
            <button
              type="button"
              onClick={() => setClinicMode('evaluation')}
              className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-200 underline flex-shrink-0 cursor-pointer"
            >
              العودة للتقييم الأسبوعي
            </button>
          </div>
        )}

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
                  {/* Dedicated Reasoning Box for deep clinical/strategic thinking */}
                  {isAdvisor && msg.reasoning && (
                    <ReasoningBox reasoning={msg.reasoning} />
                  )}

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-line border ${
                      isAdvisor
                        ? 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] text-[#0F172A] dark:text-[#F1F5F9] rounded-tr-xs'
                        : 'bg-[#0F6E6E] dark:bg-[#0891B2] border-transparent text-white rounded-tl-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[10px] mt-1.5 font-medium ${
                        isAdvisor ? 'text-[#64748B] dark:text-[#94A3B8]' : 'text-emerald-100/75'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
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
              <div className="p-3 rounded-2xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#475569] dark:text-[#94A3B8] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE] animate-spin" />
                <span>{currentAdvisor.name} يستمع إليك ويصيغ توجيهه الطبي بعناية...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Completion Status Bar when evaluated (Open Mode enabled) */}
        {isCompleted && (
          <div className="px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-t border-emerald-200/90 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                تم رصد تقييم هذا الجانب ({currentAdvisorScore > 0 ? currentAdvisorScore : 7}/10)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200">
                الوضع المفتوح مفعل 🔓
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCurrentAdvisor}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-[#162734] text-emerald-900 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="إعادة بدء التقييم الإكلينيكي لهذا المستشار"
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
                <span>الجانب التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE CLINIC INPUT BAR (Always Open for Testing and Continuous Conversation) */}
        <>
          {/* Quick Choices bar dynamically adapting to current question type */}
          <div className="px-4 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-t border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[10px] font-black text-[#475569] dark:text-[#94A3B8] flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-[#0F6E6E] dark:text-[#22D3EE]" />
                {clinicMode === 'free_chat'
                  ? 'محاور واستفسارات مقترحة:'
                  : currentStep < totalQuestions && currentQuestion
                  ? (currentQuestion.type === 'rating'
                    ? 'اختر تقييمك (من 1 إلى 10):'
                    : currentQuestion.type === 'multiple_choice'
                    ? 'خيارات الإجابة المقترحة:'
                    : currentQuestion.type === 'multi_select'
                    ? 'خيارات مقترحة:'
                    : 'أفكار سريعة للإجابة:')
                  : 'استشارة وتطوير مستمر:'}
              </span>

              {/* Free Chat Quick Inquiries */}
              {clinicMode === 'free_chat' && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendAnswer('كيف أتغلب على الحزن والضيق الداخلي؟')}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    كيف أتغلب على الحزن والضيق؟ 🌿
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAnswer('ما هي الخطوة الأولى لتحقيق التوازن في هذا الجانب؟')}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    أول خطوة للتوازن 🎯
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAnswer('كيف أحمي طاقتي من التشتت والضغوط اليومية؟')}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    حماية طاقتي من الضغوط 🛡️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAnswer('كيف حالك يا دكتور؟')}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    كيف حالك يا دكتور؟ 👋
                  </button>
                </div>
              )}

              {/* If rating question: 1 to 10 pills */}
              {clinicMode === 'evaluation' && currentStep < totalQuestions && currentQuestion?.type === 'rating' && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSendAnswer(`تقييمي: ${num} من 10`)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              {/* If multiple choice question: show question options */}
              {currentStep < totalQuestions && currentQuestion?.type === 'multiple_choice' && currentQuestion.options && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSendAnswer(opt.label)}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* If multi_select question: show question options */}
              {currentStep < totalQuestions && currentQuestion?.type === 'multi_select' && currentQuestion.options && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSendAnswer(opt.label)}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* If open_text or open consultation: show quick suggestions */}
              {(currentStep >= totalQuestions || currentQuestion?.type === 'open_text') && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {quickReflectionPills.map((ch, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAnswer(ch)}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                    >
                      {ch}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSendAnswer('الحمد لله، الأمور تسير بهدوء ودون عوائق كبيرة')}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer"
                  >
                    الأمور مستقرة وهادئة 🌿
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Input Bar: Text + Mic + Send */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#0E1D24] border-t border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAnswer();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button for Voice Dictation (Speech to Text) */}
              <VoiceInput
                onTranscript={(transcript) =>
                  setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
                }
                disabled={isAdvisorReplying}
                showStatusBadge={false}
              />

              {/* Free Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isCompleted
                    ? 'اكتب استشارتك أو سؤالك للمستشار بحرية...'
                    : currentQuestion?.placeholder ||
                      (currentQuestion?.type === 'rating'
                        ? 'اكتب تقييمك (مثال: 8 من 10) أو اسأل المستشار أي سؤال...'
                        : 'اكتب إجابتك أو تحدث بصوتك، أو اسأل المستشار بحرية...')
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
                >
                  <Send className="w-5 h-5 -rotate-90" />
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[#475569] dark:text-[#94A3B8] px-1">
                <span className="flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                  جلسة أسبوعية مركزة من خطوتين: التقييم ثم التحدي لإصدار العادة وإقفال الجانب للأسبوع.
                </span>
                <button
                  type="button"
                  onClick={handleFinishCurrentAdvisor}
                  className="text-[#0F6E6E] dark:text-[#22D3EE] hover:underline font-bold cursor-pointer"
                >
                  اعتماد وإنهاء الجلسة فوراً ✓
                </button>
              </div>
            </div>
          </>
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
                اكتمل تقييم هذا الجانب بنجاح
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                أحسنت! أنهيت جولة {currentAdvisor.name}
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                تم اعتماد نتيجتك التقديرية في {currentAdvisor.title} وحفظ توصيتك الذهبية للأسبوع
              </p>
            </div>

            {/* Score Showcase */}
            <div className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[11px] text-[#475569] dark:text-[#94A3B8] block">درجة الجانب</span>
                <span
                  className="text-3xl font-black"
                  style={{ color: currentAdvisor.themeColor }}
                >
                  {currentAdvisorScore > 0 ? currentAdvisorScore : 7} <span className="text-base text-[#475569] dark:text-[#94A3B8]">/ 10</span>
                </span>
              </div>
              <div className="h-10 w-px bg-[#E2E8F0] dark:bg-[#1E343F]" />
              <div>
                <span className="text-[11px] text-[#475569] dark:text-[#94A3B8] block">المستوى التقديري</span>
                <span className="text-sm font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
                  {currentAdvisorScore >= 8
                    ? 'ممتاز ومتألق 🌟'
                    : currentAdvisorScore >= 6
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
                <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-0.5">
                  {(insights?.strengths || []).slice(0, 2).map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  فرص التحسين:
                </span>
                <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-0.5">
                  {(insights?.challenges || []).slice(0, 2).map((ch, i) => (
                    <li key={i}>{ch}</li>
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
                  {completedAdvisors.length >= 8
                    ? '🎉 عرض خريطتي المتكاملة (الداشبورد)'
                    : 'المستشار التالي ←'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
