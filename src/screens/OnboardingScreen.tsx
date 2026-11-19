import React, { useState, useEffect, useRef } from 'react';
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
  Brain,
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
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onNavigateToDashboard: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
  theme?: 'light' | 'dark';
}

/**
 * FormattedChatMessage
 * Parses markdown bold markers (**text**) into crisp strong elements,
 * ensuring no raw '**' characters clutter the chat bubbles.
 */
export const FormattedChatMessage: React.FC<{ text: string; isAdvisor: boolean }> = ({ text, isAdvisor }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const parts = line.split(/(\*\*[^*]+\*\*)/g);

        return (
          <p key={lineIdx} className="m-0">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                const boldContent = part.slice(2, -2);
                return (
                  <strong
                    key={partIdx}
                    className={`font-black ${
                      isAdvisor
                        ? 'text-[#0F172A] dark:text-white font-extrabold'
                        : 'text-white font-extrabold underline decoration-white/30'
                    }`}
                  >
                    {boldContent}
                  </strong>
                );
              }
              return <React.Fragment key={partIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
};

// Helper: Local client intelligence engine for all advisors (offline, static hosting, or fallback)
export function getClientAdvisorResponse(
  advisor: AdvisorConfig,
  text: string,
  stationNumber: number,
  _userScore?: number,
  stationTurnCount: number = 0
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
      score: 5,
      strengths: [],
      challenges: ['أزمة نفسية حادة تحتاج تدخلاً إنسانياً ومساندة عاجلة'],
      reasoning: `تدخل إنساني طارئ (Safety & Empathy Override): المستفيد يعبر عن ألم نفسي وإنهاك شديد وتفكير في الموت أو إيذاء النفس ("${text}"). تم فوراً تعليق وتجميد كافة مسارات التقييم، وتكريس كامل الحضور النفسي لاحتواء هذا الألم الوجودي الحاد، والتأكيد القاطع على قيمة حياته.`,
      summary: `تدخل إنساني طارئ واحتواء عاجل لأزمة نفسية حادة تتعلق بأمان المستفيد وحفظ حياته.`,
      advice: `حياتك غالية وألمك حقيقي ومسموع؛ أرجوك لا تبقَ وحدك في هذا الثقل وتواصل فوراً مع شخص تثق به أو مع جهة دعم نفسي ومختصين لمساندتك.`,
      reply: `أسمعك بكل جوارحي وبكل ألم واهتمام يا صديقنا العزيز، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأرجوك أن تتوقف لحظة وتلتقط أنفاسك بهدوء؛ اعلم أنني هنا معك ولست وحدك أبداً. الألم الهائل والتعب الشديد الذي تشعر به الآن ويجعلك تفكر في الموت هو صرخة لإنهاء هذا الوجع والضغط المرهق، وليست رغبة حقيقية في إنهاء وجودك ونفسك الغالية.\n\nحياتك لها قيمة عظيمة ومكانتك محفوظة حتى لو انطمست الرؤية في هذه اللحظة المظلمة. أرجوك من كل قلبي ألا تبقى وحدك مع هذه المشاعر الثقيلة؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب. أنا هنا معك وأريد لك السلامة والأمان.`,
    };
  }

  // 1. الذكاء الاستشاري التخصصي لأزمات المستشارين
  const isFinancialDistress = /(مفلس|طفران|معدم|ما عندي فلوس|ما عندي فلوس تكفي|ما عندي ولا ريال|ما معي فلوس|ما املك شيء|صفر حسابي|حسابي صفر|ما في فلوس|فقير|فقر|ضائقة مالية|أزمة مالية|ازمة مالية|أنا مفلس|انا مفلس|مفلسين|ديون|مديون|مديونية|قروض|قرض|سلف|سلفة|غرقان ديون|الديون ذبحتني|بطاقة ائتمانية|فيزا|اقساط|أقساط|سداد|متعثر|ايقاف خدمات|إيقاف خدمات|الراتب ما يكفي|راتبي يخلص بسرعة|راتبي طار|الراتب ينتهي|دخل ضعيف|خسرت فلوسي|خسارة في الاسهم|نصب علي|احتيال مالي|ضياع اموال|ما اقدر اوفر|ما اقدر ادخر)/i.test(msg);
  if (isFinancialDistress && (advisor.id === 'financial' || !coreMsg.includes('صلاة'))) {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: 4,
      strengths: ['شجاعة وشفافية في كشف الواقع المالي الحقيقي دون إنكار'],
      challenges: ['إيقاف نزيف المصاريف الاستهلاكية وترتيب أولويات سداد الالتزامات'],
      reasoning: `تحليل أزمة وضائقة مالية حادة لدى المستفيد ("${text}"): التدخل العملي الحكيم يقتضي فك الضغط النفسي فوراً، وتبيان أن الإفلاس المالي عارض إجرائي مؤقت، والبدء بإجراءات الإسعاف المالي الطارئ.`,
      summary: `استجابة فورية لأزمة الإفلاس والضائقة المالية والتركيز على خطة إسعاف مالي وإيقاف النزيف.`,
      advice: `الإفلاس مؤقت إذا تم ضبط البوصلة: أوقف أي صرف استهلاكي فوراً، احمِ أساسيات البقاء، ولا تقترض لسداد مصاريف استهلاكية.`,
      reply: `أسمعك بكل وضوح وجدية يا صديقنا العزيز، وأحيّيك على شجاعتك وصراحتك العالية. 🌿\n\nكلمة "أنا مفلس" أو الشعور بنفاد المال ليست نهاية المطاف؛ كم من أزمة مالية كانت هي الشرارة التي أطلقت وعياً وتخطيطاً غير مسبوق.\n\nكخبير مالي معك، أولى خطوات الإسعاف المالي العاجل للخروج من هذه الضائقة:\n1. **إيقاف النزيف فوراً**: جمّد أي مصروف غير حيوي تماماً.\n2. **تجميد وحصر الالتزامات**: اكتب كل التزام برأس بارد دون اقتراض استهلاكي جديد.\n3. **البحث عن تدفق نقدي سريع**: ركز على أي مهارة أو خدمة لتوفير سيولة إسعافية عاجلة.\n\nما هو أكبر التزام مالي أو ضغط يواجهك في هذه الأيام لنبدأ بحله معاً خطوة بخطوة؟`,
    };
  }

  const isHealthDistress = /(وزني زايد|سمنة|سمين|كرش|نحيف جدا|شهية مفتوحة|اكل عاطفي|أكل عاطفي|اكل بشراهة|اكل غير صحي|ما انام|أرق|ارق|قلة نوم|نومي ملخبط|اصحى تعبان|سهران|كوابيس|كسول|خامل|ما عندي طاقة|طاقتي صفر|جسمي مكسر|خمول|ارهاق مستمر|ألم في الظهر|صداع|مناعتي ضعيفة|تدخين|ادخن|شيشة|سكر|وجبات سريعة)/i.test(msg);
  if (isHealthDistress && advisor.id === 'health') {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: 4.5,
      strengths: ['استشعار نداءات الجسد وإدراك الحاجة لضبط نمط الحياة'],
      challenges: ['اضطراب النوم وضعف الطاقة البدنية وحاجة الجسم للحركة والترطيب'],
      reasoning: `تحليل نداء استغاثة صحي وبدني لدى المستفيد ("${text}"): التفكير الطبي الحكيم يقتضي احتواء الجسد برفق والبدء بمثلث الحيوية دون حميات قاسية أو إجهاد مفرط.`,
      summary: `احتواء طبي مباشر لمشكلات النوم أو الوزن أو الخمول وبناء روتين استعادة الطاقة.`,
      advice: `الجسد أمانة لا يتحمل الصدمات القاسية: ابدأ بضبط ساعة النوم ليلاً وشرب الماء ومشي 20 دقيقة خفيفة.`,
      reply: `سلامة قلبك وجسدك يا صديقنا العزيز، وأنا معك بكل حنو واهتمام. 🌿\n\nحين يشتكي الجسد من زيادة الوزن، أو قلة النوم، أو انعدام الطاقة، فهو لا يعاقبك، بل يرسل لك نداء استغاثة حقيقي بحاجته إلى إعادة ضبط نمط الحياة ورفع الحمل المرهق عنه.\n\nكطبيب ومرشد صحي معك، دعنا نبدأ بخطة إعادة الحيوية دون تعقيد:\n1. **ضبط مثلث الطاقة**: نوم منتظم (7-8 ساعات) هو العلاج الأول لاضطراب الهرمونات والشهية.\n2. **ترطيب الجسم**: شرب لترين من الماء يومياً ينعش الخلايا ويرفع التركيز فوراً.\n3. **حركة ميسرة**: 20 دقيقة مشي يومي دون ضغط تفعل المعجزات لمزاجك وحرق الدهون.\n\nما هي العادة الصحية التي تشعر أنك مستعد للبدء بها اليوم لاستعادة نشاطك؟`,
    };
  }

  // 2. مشاعر التعب الشديد والحزن والضيق
  const isGriefOrExhaustion = /(متعب|تعبان|تعبت|تعب|حزين|حزن|مكتئب|اكتئاب|ضايق|مخنوق|طفشان|محتار|تائه|ضياع|خائف|خوف|قلق|توتر|غضب|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|مرهق|إرهاق|ارهاق|ثقل|موجوع|وجع|ألم|الم|منهار|محبط|إحباط)/i.test(msg);
  if (isGriefOrExhaustion) {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: 5,
      strengths: ['القدرة على البوح والتعبير الصادق عن المشاعر'],
      challenges: ['تفريغ الضغوط النفسية المتراكمة وتخفيف وطأة الإنهاك الداخلي'],
      reasoning: `تحليل مشاعر الإنهاك والحزن والضيق النفسي لدى المستفيد: المشاعر المتألمة تحتاج إلى إنصات واحتواء إنساني دافئ قبل أي نصائح عملية.`,
      summary: `احتواء إنساني دافئ لمشاعر الحزن والتعب والضيق، وتقديم سند معنوي يخفف وطأة المشاعر.`,
      advice: `الحزن والإنهاك رسائل من الجسد والروح بحاجتهما للراحة والتفريغ؛ لا تكابر وامنح نفسك فرصة لالتقاط الأنفاس.`,
      reply: `سلامة قلبك وروحك يا صديقنا العزيز. يؤلمني حقاً أن تشعر بهذا الحزن أو التعب والثقل، لكن اعلم أن مرور الإنسان بفترات انطفاء وثقل هو أمر إنساني طبيعي جداً، ولست وحدك في هذا الشعور.\n\nخذ نفساً عميقاً ولا تقسُ على نفسك؛ أنا هنا معك بكامل حضوري لأسمعك وأفكر معك دون أي قيود أو أحكام. ما الذي حدث وجعلك تشعر بهذا الثقل المرهق اليوم؟ شاركني ما في قلبك.`,
    };
  }

  // 3. التحيات العامة والسؤال عن حال المستشار
  const isAskingHowAdvisorIs = /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(msg);
  const stationConfig = STATION_ASSESSMENT_CONFIG[advisor.id];
  const questionTitle = stationConfig?.consultation?.title || stationConfig?.initialDiagnostic?.title;

  if (isAskingHowAdvisorIs || isBareGreetingOnly) {
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: 6,
      strengths: [],
      challenges: [],
      reasoning: `تحليل حواري: المستفيد بدأ بالتحية أو السؤال عن حال المستشار ("${text}"). التجاوب الإنساني الذكي يقتضي مبادلته الترحيب، ثم توجيهه لسؤال المحطة (${stationNumber} من 8) دون اعتماد المحطة مسبقاً.`,
      summary: `الترحيب بالمستفيد واستكشاف واقعه في ${advTitle}.`,
      advice: `كامل حضوري معك في المحطة (${stationNumber} من 8)؛ شاركني واقعك لنشخص اتزانك بدقة.`,
      reply: `أهلاً ومرحباً بك يا صديقنا العزيز! أنا بخير وبأحسن حال وسعيد بوجودك معنا. 🌿\n\nكطبيب ومستشارك في ${advTitle}، دعنا نبدأ معاً بتشخيص هذا البعد${questionTitle ? `: "${questionTitle}"` : ''}.\nكيف تصف واقعك وعاداتك الحالية هنا بصراحة؟`,
    };
  }

  // 4. التدقيق التكيفي لإجابة المستفيد (Adaptive Doctor-Like Clinical Flow)
  const ratingMatch = msg.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i) || msg.match(/^(?:تقييمي:?\s*)?\d+(?:\.\d+)?/i);

  // إذا كانت الإجابة مبهمة أو مقتضبة جداً بدون تفاصيل كافية في أول محاورة (stationTurnCount === 0)
  // أو إذا أرسل مجرد رقم صامت دون سياق في المحاورة الأولى:
  // الطبيب الحقيقي لا ينهي المحطة بل يستوضح التفاصيل ويبقى station_completed: false!
  const isVagueOrShort = (!ratingMatch && msg.length < 25) || (Boolean(ratingMatch) && msg.length < 15);
  const needsClarification = isVagueOrShort && stationTurnCount < 1;

  if (needsClarification) {
    const config = STATION_ASSESSMENT_CONFIG[advisor.id];
    const followUp = config?.consultation?.followUpProbe || config?.initialDiagnostic?.followUpProbe || `لنتعمق من زاوية نوعية في ${advTitle}: ما هو أكبر موقف أو عائق واجهته مؤخراً يؤثر على استقرارك؟ وكيف تقيّم رضاك ومستواك الحالي من 1 إلى 10؟`;
    return {
      isQuestionOrInquiry: true,
      station_completed: false,
      score: ratingMatch ? Math.min(10, Math.max(1, parseFloat(ratingMatch[1] || '6'))) : 6,
      strengths: [],
      challenges: [],
      reasoning: `تحليل استشاري تكيفي (المحطة ${stationNumber} من 8: ${advTitle}): إجابة المستفيد الأولية مقتضبة أو مجرد تقييم صامت دون سياق ("${text}"). يقتضي الأسلوب الطبي الاستشاري التجاوب بإنصات ودفء، ثم طرح سؤال استيضاحي من زاوية نوعية جديدة لفهم عاداته وواقعه الفعلي قبل الاعتماد.`,
      summary: `متابعة استيضاحية تكيفية لجانب ${advTitle}.`,
      advice: `التشخيص الاستشاري الدقيق لواقعك وعاداتك هو نصف العلاج.`,
      reply: `أهلاً بك وأسمعك باهتمام يا صديقنا العزيز. 🌿\n\nكطبيب ومستشارك في ${advTitle}، لا أريد أن أعتمد تقييماً سريعاً دون أن أفهم واقعك وعاداتك الحقيقية.\n${followUp}`,
    };
  }

  // إذا كانت الإجابة كافية ومفصلة أو بعد سؤال المتابعة (stationTurnCount >= 1):
  // هنا فقط يعتمد الطبيب المحطة ويستخلص نقاط القوة والتحديات ويعيد station_completed: true!
  const scoreNum = ratingMatch
    ? Math.min(10, Math.max(1, parseFloat(ratingMatch[1] || '7.5')))
    : (_userScore || 7.5);

  const dynamicStrengths = [
    `وضوح وشفافية في تشخيص واقع وعادات ${advTitle}`,
    `استشعار أهمية التوازن والرغبة الصادقة في التطوير المستمر`
  ];
  const dynamicChallenges = [
    `تثبيت عادة يومية ميسرة في المربع الثاني لحماية ${advTitle}`,
    `تجنب الانشغال بالمهام الطارئة على حساب الأولويات الاستراتيجية`
  ];

  if (scoreNum <= 4) {
    return {
      isQuestionOrInquiry: false,
      station_completed: true,
      score: scoreNum,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `تشخيص سريري متكامل لمحطة (${stationNumber} من 8: ${advTitle}) بدرجة (${scoreNum}/10): المستفيد يمر بضغط أو فتور. تقديم احتواء دافئ وتوجيه استراتيجي لإعادة التوازن.`,
      summary: `اعتماد تشخيص محطة (${advTitle}) بدرجة ${scoreNum}/10 وتحديد خطوات التوازن.`,
      advice: `الاعتراف بالضغط الحالي هو أولى خطوات التعافي؛ خطوة يومية صغيرة تكفي لاستعادة التوازن.`,
      reply: `أحيّيك من قلبي على صدقك وشفافيتك العالية في تشخيص ${advTitle} يا صديقنا. 🌿\n\nمرورك بفترة تراجع أو ضغط بدرجة (${scoreNum} من 10) هو أمر طبيعي وسط تسارع متطلبات الحياة. هدفنا هنا ليس المحاكمة، بل تفكيك هذا الثقل معاً وبناء سكينتك واتزانك خطوة بخطوة.`,
    };
  } else if (scoreNum <= 7) {
    return {
      isQuestionOrInquiry: false,
      station_completed: true,
      score: scoreNum,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `تشخيص سريري متزن لمحطة (${stationNumber} من 8: ${advTitle}) بدرجة (${scoreNum}/10): رصد قاعدة استقرار طيبة مع وجود مساحة تطوير ملموسة.`,
      summary: `اعتماد تشخيص محطة (${advTitle}) بدرجة ${scoreNum}/10 وتحديد فرص التطوير.`,
      advice: `البناء على نقاط القوة الحالية وحماية وقتك وطاقتك من المشتتات العابرة.`,
      reply: `تشخيصك المتزن لواقعك بدرجة (${scoreNum} من 10) يعكس وعياً طيباً بقاعدتك الحالية في ${advTitle}. 🌿\n\nلديك أساس متين يمكنك البناء عليه لتعميق الأثر والوصول إلى مستويات أعلى من الرضا والاستقرار المستدام.`,
    };
  } else {
    return {
      isQuestionOrInquiry: false,
      station_completed: true,
      score: scoreNum,
      strengths: dynamicStrengths,
      challenges: dynamicChallenges,
      reasoning: `تشخيص سريري متقدم لمحطة (${stationNumber} من 8: ${advTitle}) بدرجة (${scoreNum}/10): رصد نضج وانسجام متميز في هذا البعد.`,
      summary: `اعتماد تشخيص محطة (${advTitle}) بدرجة ${scoreNum}/10 يبرز القوة والانسجام.`,
      advice: `الاستمرار على العادات الراسخة والبيئة المحفزة التي أوصلتك لهذا المستوى الممتاز.`,
      reply: `ما شاء الله، نتيجة ملهمة ومبهجة بدرجة (${scoreNum} من 10) تعكس صفاءً حقيقياً وعملاً متواصلاً في ${advTitle}! 🌟\n\nهذا الاستقرار والانسجام مكسب كبير لحياتك يستحق الحفاظ عليه ودعمه بعاداتك الجميلة.`,
    };
  }
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

  // Track turn count per advisor station for the adaptive clinical flow
  const [stationTurnCount, setStationTurnCount] = useState<Record<string, number>>({});

  // Dynamic insights per station extracted from live AI conversation (score, strengths, challenges)
  const [stationInsights, setStationInsights] = useState<Record<string, StationDynamicInsights>>({});

  const [inputText, setInputText] = useState('');
  const [expandedReasoningMap, setExpandedReasoningMap] = useState<Record<string, boolean>>({});
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

  const toggleReasoning = (messageId: string) => {
    setExpandedReasoningMap((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Chat conversation state per advisor
  const [chatMessages, setChatMessages] = useState<Record<string, EvaluationChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Initialize welcoming message for station
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    if (!chatMessages[advisorKey] || chatMessages[advisorKey].length === 0) {
      const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
      setChatMessages((prev) => ({ ...prev, [advisorKey]: [openingMsg] }));
      setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    }
  }, [currentAdvisorIndex, currentAdvisor]);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentAdvisorIndex]);

  // Finish and approve current advisor assessment manually
  const handleFinishCurrentAdvisor = () => {
    const calculatedScore = calculateScoreForAdvisor(currentAdvisor, answers);
    const scoreToSave = calculatedScore > 0 ? calculatedScore : 7.5;
    
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

  // Reset and restart evaluation for current advisor
  const handleResetCurrentAdvisor = () => {
    const advisorKey = currentAdvisor.id;
    setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
    setChatMessages((prev) => ({ ...prev, [advisorKey]: [openingMsg] }));
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

    // Increment station turn count
    setStationTurnCount((prev) => ({ ...prev, [advisorKey]: currentTurns + 1 }));

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
      let earnedScore = detectedScore || calculateScoreForAdvisor(currentAdvisor, answers) || 7.5;
      let dynamicStrengths: string[] = [];
      let dynamicChallenges: string[] = [];

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
        const local = getClientAdvisorResponse(
          currentAdvisor,
          text,
          stationNumber,
          earnedScore,
          currentTurns
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
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      // CRITICAL: Only trigger station completion and show modal when AI EXPLICITLY returns station_completed === true!
      if (isStationCompleted) {
        // Save the dynamic earned score
        onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, earnedScore);
        
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
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#0F6E6E]/10 dark:bg-[#22D3EE]/20 text-[#0F6E6E] dark:text-[#22D3EE] border border-[#0F6E6E]/20 dark:border-[#22D3EE]/30">
                  8 محطات متتالية
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
                className={`group relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none text-center ${
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

            {/* Quick approve button if not locked yet */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleFinishCurrentAdvisor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="اعتماد النتيجة الفورية"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="flex items-center gap-1">
                  <span>اعتماد</span>
                  <span dir="ltr" className="font-mono">({currentAdvisorScore > 0 ? currentAdvisorScore : 7} / 10)</span>
                </span>
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
                  {/* Internal Reasoning Box - Hidden by default */}
                  {isAdvisor && msg.reasoning && (
                    <div className="space-y-1.5">
                      {expandedReasoningMap[msg.id] && (
                        <div className="animate-fadeIn">
                          <ReasoningBox reasoning={msg.reasoning} defaultExpanded={true} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleReasoning(msg.id)}
                        className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-amber-800/80 dark:text-amber-400/80 hover:text-amber-900 dark:hover:text-amber-300 transition-colors py-0.5 px-2 rounded-lg hover:bg-amber-500/10 cursor-pointer select-none"
                        title={expandedReasoningMap[msg.id] ? 'طي مسار التحليل العميق' : 'عرض مسار التفكير والتحليل الداخلي'}
                      >
                        <Brain className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>
                          {expandedReasoningMap[msg.id]
                            ? 'طي مسار التحليل العميق'
                            : 'مسار التفكير والتحليل العميق (مخفي)'}
                        </span>
                      </button>
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl shadow-xs border ${
                      isAdvisor
                        ? 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] text-[#0F172A] dark:text-[#F1F5F9] rounded-tr-xs'
                        : 'bg-[#0F6E6E] dark:bg-[#0891B2] border-transparent text-white rounded-tl-xs'
                    }`}
                  >
                    {/* Render Formatted Bold text without raw ** markers */}
                    <FormattedChatMessage text={msg.text} isAdvisor={isAdvisor} />

                    <span
                      className={`block text-[10px] mt-2 font-mono ${
                        isAdvisor ? 'text-[#64748B] dark:text-[#94A3B8]' : 'text-emerald-100/75'
                      }`}
                      dir="ltr"
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
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] text-xs font-bold transition-all shadow-xs cursor-pointer font-mono"
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
                <span>حوار استشاري تكيفي: المستشار يصغي لتفاصيلك ويتكيف معك لتشخيص اتزانك بإنصاف.</span>
              </span>
              <button
                type="button"
                onClick={handleFinishCurrentAdvisor}
                className="text-[#0F6E6E] dark:text-[#22D3EE] hover:underline font-bold cursor-pointer"
              >
                اعتماد وإنهاء المحطة فوراً ✓
              </button>
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
                  {currentActiveInsights.score > 0 ? currentActiveInsights.score : 7} <span className="text-base text-[#64748B] dark:text-[#94A3B8]">/ 10</span>
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
                    <li key={i}>{str.replace(/\*\*/g, '')}</li>
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
                    <li key={i}>{ch.replace(/\*\*/g, '')}</li>
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
