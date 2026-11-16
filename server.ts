import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Smart contextual local agent responses matching Agents/*.md personas
function generateLocalAgentResponse(
  agentKey: string,
  message: string,
  userName: string,
  advisor: any,
  score: number = 0,
  isEvaluationSession?: boolean,
  evaluationStep?: number
) {
  const msg = message.toLowerCase().trim();
  const isGreeting = /^(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح|مساء|هلا|هاي|حيّاك|حيّك)/i.test(msg);
  const advName = advisor?.name || (
    agentKey === 'spiritual' ? 'د. سفيان الروحي' :
    agentKey === 'financial' ? 'أ. كمال المالي' :
    agentKey === 'health' ? 'د. ريان الصحي' :
    agentKey === 'career' ? 'م. طارق المهني' :
    agentKey === 'personal' ? 'د. ليلى الذاتية' :
    agentKey === 'learning' ? 'بروفيسور زياد المعرفي' :
    agentKey === 'family' ? 'د. مريم الأسرية' :
    agentKey === 'social' ? 'أ. سامي الاجتماعي' : 'مستشار تدبير'
  );
  const advRole = advisor?.role || advisor?.title || 'مستشار الحياة';

  const formatAgentOutput = (data: {
    agent_name?: string;
    reasoning?: string;
    score?: number;
    summary?: string;
    advice?: string;
    reply?: string;
    actionSteps?: string[];
    reflectionQuestion?: string;
  }) => {
    const finalName = data.agent_name || advName;
    const finalReply = data.reply || data.advice || data.summary || 'أنا معك في كل خطوة نحو الاتزان والنمو.';
    const finalAdvice = data.advice || (data.actionSteps && data.actionSteps.length > 0 ? data.actionSteps[0] : finalReply);
    const finalSummary = data.summary || (finalReply.length > 120 ? finalReply.slice(0, 120) + '...' : finalReply);
    const finalReasoning = data.reasoning || `تحليل تفكيري معمق لحالة المستفيد (${userName}) في مجال (${advRole}): فحص الاحتياج النفسي والعملي وربطه بالأهداف المرحلية لعجلة الحياة، واستخلاص العادة المحورية الأكثر ملاءمة لقدراته وطاقته الحالية دون إجهاد.`;
    const computedScore = data.score !== undefined ? data.score : (score > 0 ? Math.round(score <= 10 ? score * 10 : score) : 70);

    return {
      agent_name: finalName,
      reasoning: finalReasoning,
      score: computedScore,
      summary: finalSummary,
      advice: finalAdvice,
      reply: finalReply,
      actionSteps: data.actionSteps || [finalAdvice],
      reflectionQuestion: data.reflectionQuestion || 'ما هي الخطوة البسيطة التي ستبدأ بها اليوم؟'
    };
  };

  // إذا كانت جلسة تقييم أسبوعية في العيادة (Weekly Assessment Ritual)
  if (isEvaluationSession) {
    if (evaluationStep === 1) {
      // المحطة 1: الاستماع للتقييم والشعور وسؤال العائق الأكبر
      return formatAgentOutput({
        reasoning: `تحليل أولي لمدخلات المستفيد (${userName}): الاستماع لمستوى المشاعر والرضا عن الجانب (${advRole})، ورصد وتيرة الأسبوع. الخطوة المنطقية الآن هي استكشاف العائق الأكبر أو التحدي النفسي والعملي لتحديده بدقة وتفكيكه دون إطلاق أحكام مسبقة.`,
        summary: `رصد التقييم والشعور العام للمستفيد في الجانب ${advRole} والبدء في استكشاف التحدي الأبرز.`,
        advice: `شاركني بأريحية تامة عن التحدي أو العائق الأكبر الذي أثر على سكينتك أو تركيزك في هذا الجانب هذا الأسبوع.`,
        reply: `أسمعك بكل اهتمام واحتواء يا ${userName}، ورصدت تقييمك ومشاعرك بوعي تام.\n\nكطبيب ومرشد لك في ${advRole}، أرى أن كل مرحلة تمر بها تحمل رسالة مهمة. بالنظر إلى وتيرة أسبوعك المنصرم، ما هو أكبر تحدٍ أو عائق نفسي أو عملي واجهك وشعرت أنه يسحب من طاقتك وتركيزك في هذا الجانب؟`,
        actionSteps: advisor?.defaultGoals?.slice(0, 1) || ['تحديد العائق الرئيسي للتعامل معه بمرونة'],
        reflectionQuestion: 'ما الذي يجعلك تشعر أن هذا العائق يستحق التركيز عليه الآن؟'
      });
    } else if (evaluationStep === 2) {
      // المحطة الختامية: التشخيص الأسبوعي والعادة الذهبية ورصد التقييم
      const goldenHabit = advisor?.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
      return formatAgentOutput({
        reasoning: `تحليل ختامي لجلسة التقييم الأسبوعي: ربط العائق المرصود بالعادات اليومية (Micro-habits) وإدراج العادة الذهبية في المربع الثاني بمصفوفة أيزنهاور لحمايتها من التسويف وضمان الاستدامة وتوازن عجلة الحياة.`,
        summary: `اعتماد تقييم الجانب ${advRole} بدرجة (${score > 0 ? score.toFixed(1) : '7.0'} من 10) واعتماد العادة الذهبية للأسبوع.`,
        advice: `التوصية الذهبية لهذا الأسبوع: ${goldenHabit}.`,
        reply: `✅ أحسنت يا ${userName}. استمعت بتقدير لكل ما شاركته في جلستنا التقييمية لهذا الأسبوع.\n\nرصدنا درجتك المعتمدة في ${advRole}: (${score > 0 ? score.toFixed(1) : '7.0'} من 10).\n\n📌 **توصيتي الذهبية لهذا الأسبوع:**\n${goldenHabit}.\n\nتم اعتماد التقييم بنجاح، وباب الحوار والاستشارة مفتوح معك دائماً لأي استفسارات أو تفاصيل إضافية. يمكنك الانتقال للجانب التالي أو استئناف الحديث معي في أي وقت.`,
        actionSteps: advisor?.defaultGoals?.slice(0, 2) || [goldenHabit],
        reflectionQuestion: 'كيف يمكنك تهيئة بيئتك اليوم لتلتزم بهذه العادة طوال الأسبوع؟'
      });
    }
  }

  // 1. Domain: Spiritual (د. سفيان الروحي)
  if (agentKey === 'spiritual') {
    if (isGreeting) {
      return formatAgentOutput({
        reasoning: `تحليل ترحيبي وتأسيس المساحة الآمنة: المستفيد (${userName}) يبادر بالتحية، والمطلوب هو كسر حاجز الرسمية وفتح أفق الحوار حول الصفاء والسكينة الداخلية وعلاقتها بتدفق اليوم.`,
        summary: `الترحيب بالمستفيد واستكشاف مستوى الحضور القلبي والسكينة الروحية في وتيرة حياته اليومية.`,
        advice: `البدء بخلوة ذهنية قصيرة لمدة 5 دقائق بعد صلاة الفجر لاستعادة الهدوء الداخلي.`,
        reply: `أهلاً ومرحباً بك يا ${userName}! أنا ${advName} المستشار الروحي في منصة تدبير.\n\nيسعدني جداً أن نتحاور معاً حول سكينتك الداخلية، وتدبر يومك، وتناغم عبادتك مع وتيرة حياتك. كيف تشعر بروحانياتك وحضور قلبك هذه الأيام؟ تحدث معي بأريحية تامة.`,
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

    return formatAgentOutput({
      reasoning: `تحليل عام للمدخلات الروحية: رصد رغبة المستفيد في السلام الداخلي ومقارنتها بضغوطات العصر. الحل يكمن في تغذية النفس بالاستراحات الواعية والمشي الذهني الهادئ.`,
      summary: `تأكيد أهمية التغذية الهادئة للنفس والمداومة على القليل الدائم لتحقيق التوازن الروحي.`,
      advice: `اجعل العبادة استراحة للنفس من ضغوط العمل والحياة وليس واجباً إضافياً.`,
      reply: `أسمعك بوعي تام يا ${userName}. ما طرحته: "${message}" يعكس تساؤلاً مشروعاً في رحلة البحث عن الاتزان الروحي.\nالنفس كالطائر؛ تحتاج إلى التغذية الهادئة والمداومة على القليل الدائم. لا تجعل العبادة عبئاً ثقيلاً، بل اجعلها استراحة تتنفس بها من ضغوط العالم.`,
      actionSteps: [
        'المشي لمدة 15 دقيقة مع الاستماع لشيء يلهم روحك ويهدئ فكرك',
        'تخصيص وقت استراحة بين المهام لاستعادة التنفس الهادئ'
      ],
      reflectionQuestion: 'ما الذي يمنعك اليوم من الشعور بالسلام الداخلي؟'
    });
  }

  // 2. Domain: Financial (أ. كمال المالي)
  if (agentKey === 'financial') {
    if (isGreeting) {
      return formatAgentOutput({
        reasoning: `تحليل مالي استباقي: المستفيد يبدأ الحوار المالي، والهدف هو توجيهه لتقييم سلوكه الإنفاقي وتأسيس صمام الأمان المالي دون التسبب في قلق أو شعور بالحرمان.`,
        summary: `الترحيب المالي واستعراض ركائز الوعي المالي الحكيم والنمو المستدام.`,
        advice: `تدوين كافة المصروفات اليومية لمدة أسبوع لرصد مواضع الهدر المالي.`,
        reply: `مرحباً بك يا ${userName}! أنا ${advName} المستشار المالي لمنصة تدبير.\n\nهدفي أن نبني معاً وعياً مالياً حكيماً يضمن لك الأمان والنمو المستدام دون تضييق. ما الذي يشغل تفكيرك مالياً أو تود مراجعته معي اليوم؟`,
        actionSteps: [
          'تدوين كافة المصروفات اليومية لمدة أسبوع لرصد الهدر',
          'تحويل مبلغ تلقائي ثابت (حتى لو بسيط) لصندوق الادخار فور استلام الراتب'
        ],
        reflectionQuestion: 'هل تشعر أن قراراتك المالية الحالية تخدم أهدافك الاستراتيجية أم استهلاك اللحظة؟'
      });
    }

    if (msg.includes('وضح') || msg.includes('توضح') || msg.includes('لا ادري') || msg.includes('لا أدري') || msg.includes('كيف')) {
      return formatAgentOutput({
        reasoning: `تحليل سيكولوجيا المال: المستفيد يحتاج توضيحاً عملياً. التحليل يفكك السلوك المالي إلى 3 ركائز: الفصل النفسي بين الرغبة والاحتياج، بناء صمام الأمان (صندوق الطوارئ)، وأتمتة الادخار قبل الاستهلاك.`,
        summary: `توضيح استراتيجية المال الحكيم: فصل الاحتياج عن الرغبة، صندوق الطوارئ، والأتمتة الذكية.`,
        advice: `خفض بند واحد من المصاريف الاستهلاكية بنسبة 20% هذا الشهر وتوجيهه للادخار.`,
        reply: `يسعدني جداً أن أفسر لك الفكرة ببساطة وعمق يا ${userName}.\n\nالمال ليس مجرد لغة حسابية جافة، بل هو انعكاس لقراراتنا النفسية اليومية. التوضيح العملي الذي أقصده يتلخص في ثلاث ركائز رئيسية:\n\n1. **فصل الاحتياج عن الرغبة**: الاحتياج هو ما لا تستقيم حياتك بدونه (مسكن، طعام، فواتير أساسية). أما الرغبة فهي ما يمنحك متعة لحظية لكن تأجيله لا يضرك.\n2. **صمام الأمان (صندوق الطوارئ)**: أن تملك مبلغاً يكفيك لـ 3 إلى 6 أشهر في حساب منفصل يمنحك حرية نفسية هائلة ولا يجعلك رهينة لأي ضغط وظيفي أو طارئ مفاجئ.\n3. **الأتمتة الذكية**: ادخر واستثمر فور نزول الدخل تلقائياً، ثم عِش بما تبقى، بدلاً من أن تنفق وتنتظر ما يفيض.`,
        actionSteps: [
          'تحديد بند واحد من المصاريف الاستهلاكية وتخفيضه بنسبة 20% هذا الشهر',
          'فتح حساب ادخار فرعي منفصل تماماً عن بطاقة الشراء اليومية'
        ],
        reflectionQuestion: 'إذا راجعت مشترياتك في الشهر الماضي، ما هو الشيء الذي اشتريته واكتشفت أنك لم تكن بحاجته حقاً؟'
      });
    }

    if (msg.includes('ديون') || msg.includes('قرض') || msg.includes('بطاقة') || msg.includes('التزام')) {
      return formatAgentOutput({
        reasoning: `إدارة الالتزامات المالية: التعامل مع الديون والبطاقات يتطلب استراتيجية باردة ومحكمة لتقليل التوتر النفسي. الحل يبدأ بحصر الأرقام بدقة وتطبيق طريقة كرة الثلج لسداد الأصغر أولاً لمنح دفعة معنوية.`,
        summary: `خطة التخلص من الديون عبر استراتيجية كرة الثلج وإيقاف الاقتراض الاستهلاكي.`,
        advice: `حصر الديون من الأصغر للأكبر وسداد أصغر التزام أولاً لتحقيق انتصار نفسي.`,
        reply: `التعامل مع الالتزامات والديون يا ${userName} يتطلب خطة منهجية باردة وهادئة:\n1. حصر المبالغ الإجمالية وسعر الفائدة لكل بطاقة أو دين.\n2. تطبيق استراتيجية 'كرة الثلج': سداد أصغر دين أولاً لتحقيق انتصار نفسي سريع.\n3. إيقاف استخدام البطاقات الائتمانية في الشراء اليومي فوراً.\nكل دين يمكن التخلص منه إذا التزمت بمسار محكم دون هلع.`,
        actionSteps: [
          'إعداد جدول بسيط لحصر الديون مرتبة من الأصغر إلى الأكبر',
          'تجميد البطاقة الائتمانية والاعتماد على بطاقة مسبقة الدفع بميزانية محددة'
        ],
        reflectionQuestion: 'ما هي المصاريف غير الضرورية التي لو أوقفتها شهرياً ستعجل بسداد ديونك؟'
      });
    }

    return formatAgentOutput({
      reasoning: `تحليل مالي عام: فحص مدخلات المستفيد (${message}) وربطها بالانضباط المالي والالتزام بالعادات الصغيرة المنتظمة.`,
      summary: `التركيز على العادات المالية البسيطة المنتظمة كأقوى رافعة للأمان والاستقرار المالي.`,
      advice: `تطبيق قاعدة التريث لمدة 24 ساعة قبل شراء أي سلعة غير ضرورية.`,
      reply: `أفهم مقصدك تماماً يا ${userName}. عندما ننظر في رسالتك: "${message}"، نجد أن التحدي الحقيقي في المال ليس معرفة القواعد، بل الالتزام بالعادات الصغيرة المنتظمة.`,
      actionSteps: [
        'تطبيق قاعدة الـ 24 ساعة قبل شراء أي سلعة غير ضرورية',
        'مراجعة الاشتراكات الرقمية المتكررة وإلغاء ما لا يُستخدم'
      ],
      reflectionQuestion: 'لو توقف دخلك الحالي لـ 3 أشهر، هل تملك صمام أمان يحميك؟'
    });
  }

  // 3. Domain: Health (د. ريان الصحي)
  if (agentKey === 'health') {
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

    return formatAgentOutput({
      reasoning: `تحليل اللياقة اليومية المستدامة: التأكيد على أن الصحة البدنية لا تتطلب بالضرورة تمارينات شاقة، بل تقوم على الحركة المستمرة وقطع فترات الخمول والجلوس الممتد.`,
      summary: `بناء نشاط حركي يومي متصل ومقاومة الجلوس الممتد لرفع اللياقة والنشاط.`,
      advice: `الوقوف والحركة لمدة 3 دقائق كل ساعة أثناء العمل المكتبي.`,
      reply: `كلامك في محله يا ${userName}. اللياقة والصحة لا تعني قضاء ساعات طويلة في النادي الرياضي، بل تعني بناء نشاط حركي مستمر خلال اليوم ومقاومة الجلوس الممتد.`,
      actionSteps: [
        'الوقوف والحركة لمدة 3 دقائق كل ساعة أثناء العمل',
        'استبدال المشروبات الغازية بالماء المنعش'
      ],
      reflectionQuestion: 'كيف يمكنك جعل الحركة اليومية عادة ممتعة وليست واجباً ثقيلاً؟'
    });
  }

  // 4. Default persona for other domains
  const fallbackAdvisors: Record<string, { role: string; name: string }> = {
    career: { role: 'المستشار المهني', name: 'م. طارق المهني' },
    personal: { role: 'أخصائية تطوير الذات', name: 'د. ليلى الذاتية' },
    learning: { role: 'مستشار التعلم والنمو المعرفي', name: 'بروفيسور زياد المعرفي' },
    family: { role: 'استشارية الترابط الأسري', name: 'د. مريم الأسرية' },
    social: { role: 'مستشار الذكاء الاجتماعي', name: 'أ. سامي الاجتماعي' },
  };

  const advInfo = fallbackAdvisors[agentKey] || { role: advisor?.role || 'مستشار توازن الحياة', name: advName };

  return formatAgentOutput({
    agent_name: advInfo.name,
    reasoning: `تحليل استشاري متعدد الأبعاد: دراسة مدخلات المستفيد (${userName}) في مجال (${advInfo.role}) ومقارنتها بمؤشرات عجلة الحياة. التفكير المنطقي يقتضي تجزئة الهدف الكبير إلى إجراء يومي ملموس يمكن البدء به خلال 24 ساعة.`,
    summary: `تحويل الطموح والهموم المتراكمة في جانب ${advInfo.role} إلى إجراء تنفيذي ملموس يدرج في مصفوفة أيزنهاور.`,
    advice: `تحديد إجراء واحد واضح يمكنك تنفيذه خلال 24 ساعة وإدراجه في المربع الثاني بمصفوفة أيزنهاور.`,
    reply: `أهلاً بك يا ${userName}، معك ${advInfo.name} (${advInfo.role}).\n\nتأملت في رسالتك: "${message}".\nما تطرحه يعبر عن رغبة حقيقية في النمو والتطور. لتحقيق نقلة نوعية في هذا الجانب، نحتاج للتركيز على الخطوة الإجرائية التالية المباشرة بدلاً من حمل الهموم دفعة واحدة.`,
    actionSteps: [
      'تحديد إجراء واحد ملموس يمكنك تنفيذه خلال الـ 24 ساعة القادمة',
      'إسقاط هذا الهدف في المربع الثاني بمصفوفة أيزنهاور لمتابعته'
    ],
    reflectionQuestion: 'ما هي العقبة الحقيقية التي تحول بينك وبين تنفيذ هذه الخطوة اليوم؟'
  });
}

// Endpoint: Advisor Chat
app.post('/api/gemini/advisor-chat', async (req: Request, res: Response) => {
  try {
    const {
      advisor,
      userProfile,
      answers,
      goals,
      message,
      history,
      userName,
      userScore,
      userGoals,
      userAnswers,
      aiMode,
      isEvaluationSession,
      evaluationStep,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    const effectiveUserProfile = userProfile || { name: userName || 'صديقنا' };
    const effectiveAnswers = answers || userAnswers || {};
    const effectiveGoals = goals || userGoals || [];
    const effectiveScore = userScore !== undefined ? userScore : (advisor?.score || 0);

    // تحديد ملف الوكيل بناءً على الاختيار القادم من الطلب
    const agentFileMap: Record<string, string> = {
      financial: '01-financial.md',
      health: '02-health.md',
      spiritual: '03-spiritual.md',
      career: '04-career.md',
      personal: '05-personal.md',
      learning: '06-learning.md',
      family: '07-family.md',
      social: '08-social.md',
      aggregator: '09-aggregator.md',
      advisor: '10-advisor.md'
    };

    // استخدام اسم الوكيل أو افتراضياً الخبير المالي
    const agentKey = typeof advisor === 'string' ? advisor : (advisor?.id || 'financial');
    const selectedFile = agentFileMap[agentKey] || '01-financial.md';
    let agentPath = path.join(process.cwd(), 'agents', selectedFile);
    if (!fs.existsSync(agentPath)) {
      agentPath = path.join(process.cwd(), 'Agents', selectedFile);
    }

    // قراءة تعليمات الوكيل من ملف الـ Markdown الخاص به بدقة وتجريدها من القوالب القديمة
    let agentRoleDescription = "أنت مساعد ذكي ومستشار شخصي في منصة تدبير لتوازن الحياة.";
    if (fs.existsSync(agentPath)) {
      const rawDoc = fs.readFileSync(agentPath, 'utf8');
      agentRoleDescription = rawDoc.replace(/يجب أن تكون إجابتك دائماً بصيغة JSON[\s\S]*/, '').trim();
    }

    const advisorName = advisor?.name || (typeof advisor === 'string' ? advisor : 'مستشار تدبير');
    const advisorRole = advisor?.role || advisor?.title || 'مستشار الحياة';

    // إذا لم يكن مفتاح Gemini متوفراً في البيئة، نستخدم محرك الاستجابة الذكي المدمج المعتمد على مواصفات الوكلاء
    if (!apiKey) {
      const localResponse = generateLocalAgentResponse(
        agentKey,
        message,
        effectiveUserProfile?.name || 'صديقنا',
        advisor,
        effectiveScore,
        isEvaluationSession,
        evaluationStep
      );
      return res.json(localResponse);
    }

    // تحديد توجيهات النمط المختار من Gemini (سريع، متوازن، أو تفكير عميق استراتيجي)
    let modeGuideline = '';
    if (aiMode === 'fast') {
      modeGuideline = `
[النمط المختار: الوضع السريع ⚡ - Fast & Agile Response]
- المستفيد اختار النمط السريع: أجب بتركيز وإيجاز ذكي وبلا إطناب.
- ادخل في جوهر الموضوع مباشرة، وقدم خطوات تنفيذية سريعة جداً يمكن تطبيقها فوراً.
`;
    } else if (aiMode === 'deep') {
      modeGuideline = `
[النمط المختار: وضع التفكير والتحليل العميق 🧠 - Deep Strategic Thinker]
- المستفيد اختار نمط التفكير العميق: قم بتحليل سيكولوجي واستراتيجي مفكك وشامل.
- لا تقدم حلولاً سطحية، بل اربط التحدي بالدوافع الباطنة، وكاشفه بنقاط العمى (Blind spots) وبأثر هذا التحدي على بقية مجالات حياته.
- قدم رؤية استراتيجية بعيدة المدى، وخطوات نوعية تحويلية، وسؤالاً تأملياً فلسفياً عميقاً يوسع وعيه.
`;
    } else {
      modeGuideline = `
[النمط المختار: الوضع المتوازن ⚖️ - Balanced Advisor Mode]
- وازن بذكاء بين سرعة الفهم وعمق التوجيه الإرشادي العملي.
`;
    }

    let clinicSpecialGuideline = '';
    if (isEvaluationSession) {
      if (evaluationStep === 1) {
        clinicSpecialGuideline = `
[المحطة الأولى من التقييم الأسبوعي الإكلينيكي 🌿]
- أنت طبيب ومستشار نفسي يستقبل المستفيد في جلسته الأسبوعية.
- استمع لما شاركه عن تقييمه ومشاعره برفق، وتفاعل معه بإنسانية وعمق.
- اسأله سؤالاً واحداً فقط لاستكشاف التحدي أو العائق الأكبر الذي أثر عليه هذا الأسبوع في هذا الجانب.
- لا تسأل أسئلة متعددة ولا تستجوبه، بل اجعله يشعر بالأمان والاحتواء.
`;
      } else if (evaluationStep === 2) {
        clinicSpecialGuideline = `
[المحطة الختامية للتقييم الأسبوعي الإكلينيكي 🌿]
- هذه الجلسة الختامية للتقييم الأسبوعي لهذا الجانب.
- لخص ما سمعته منه، واعتمد درجته لهذا الأسبوع (${effectiveScore}/10).
- قدم له التوصية والعادة الذهبية الواحدة لأسبوعه.
- أخبره أن التقييم تم رصده بنجاح، وأن باب الحوار مفتوح معه دائماً لأي استفسارات أو تفاصيل إضافية.
`;
      } else {
        clinicSpecialGuideline = `
[حوار استشاري وتعمق إضافي مع المستشار 💬]
- تفاعل مباشرة مع سؤال المستفيد أو ما يطرحه الآن، وقدم له إجابة واعية وحلولاً عملية.
`;
      }
    }

    // إثراء التعليمات بسياق المستفيد وشخصية الوكيل المستقلة وأسلوب الرد المطلوب
    const systemInstruction = `
${agentRoleDescription}

أنت الآن تخوض محادثة تفاعلية حية ومباشرة بصفتك: "${advisorName}" (${advisorRole}) ضمن منصة تدبير.
أنت شخصية مستقلة، عميقة الفكر، حكيمة ودافئة، وتفكر مع المستفيد كمرشد وشريك حقيقي.

${modeGuideline}
${clinicSpecialGuideline}

قواعد الحوار والتفكير مع المستفيد:
1. استمع لكل كلمة كتبها المستفيد وفكر معه في سياق مشاعره وحيرته وأفكاره.
2. لا تكرر إجابات نمطية أو عامة أبداً، بل تجاوب مباشرة مع سؤاله الأخير في سياق المحادثة الجارية.
3. تحدث باللغة العربية الفصحى الراقية، الواضحة، والملهمة.
4. قدّم نصيحة جوهرية عملية مصحوبة بخطوتين إجرائيتين سريعتين (Micro-habits) يمكن البدء بهما فوراً.
5. اختم بسؤال تأملي ذكي يفتح للمستفيد أفقاً جديداً في إدراك ذاته وإدارة حياته.

سياق المستفيد من منصة تدبير:
- الاسم: ${effectiveUserProfile?.name || 'صديقنا'}
- الدرجة الحالية في هذا الجانب: ${effectiveScore}/10
- التحديات المرصودة: ${advisor?.challenges?.join('، ') || 'لم تُحدد بعد'}
- الأهداف الحالية: ${effectiveGoals?.join('، ') || 'لم تُحدد بعد'}
- إجابات التقييم السابقة: ${JSON.stringify(effectiveAnswers)}

أرجع الرد دائماً بصيغة JSON مهيكلة وفق المخطط التالي:
{
  "agent_name": "${advisorName}",
  "reasoning": "تحليل عميق وخطوات تفكير منطقية وسيكولوجية مرتبطة بحالة المستفيد ومشاعره وأهدافه في عجلة الحياة...",
  "score": ${effectiveScore},
  "summary": "ملخص الوضع بناءً على البيانات والمحادثة",
  "advice": "نصيحة عملية سريعة وموجهة",
  "reply": "نص الرد الحواري المشخصن والتفاعلي المباشر من المستشار متفاعلاً مع ما قاله المستفيد",
  "actionSteps": ["خطوة عملية أولى", "خطوة عملية ثانية"],
  "reflectionQuestion": "سؤال تأملي ذكي للمستفيد"
}
`;

    // تطهير وبناء تسلسل المحادثة التفاعلية بما يتوافق بدقة مع متطلبات Google GenAI
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (!h) continue;
        const role: 'user' | 'model' =
          h.role === 'model' || h.role === 'advisor' || h.sender === 'advisor' || h.sender === 'model'
            ? 'model'
            : 'user';

        let text = '';
        if (typeof h === 'string') {
          text = h;
        } else if (typeof h.content === 'string') {
          text = h.content;
        } else if (typeof h.text === 'string') {
          text = h.text;
        } else if (Array.isArray(h.parts) && h.parts.length > 0) {
          text = h.parts
            .map((p: any) => (typeof p === 'string' ? p : p?.text || ''))
            .filter(Boolean)
            .join('\n');
        }

        text = text.trim();
        if (!text) continue;

        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          // دمج الرسائل المتتالية من نفس الطرف لضمان التبادل المنتظم
          contents[contents.length - 1].parts[0].text += `\n\n${text}`;
        } else {
          contents.push({
            role,
            parts: [{ text }],
          });
        }
      }
    }

    // إضافة رسالة المستخدم الحالية
    const currentMsgText = message.trim();
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${currentMsgText}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: currentMsgText }],
      });
    }

    // متطلبات Gemini: يجب أن تبدأ المحادثة دائماً بـ user
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'مرحباً، أود بدء الجلسة الاستشارية معك.' }],
      });
    }

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agent_name: {
              type: Type.STRING,
              description: 'اسم الوكيل أو المستشار',
            },
            reasoning: {
              type: Type.STRING,
              description: 'تحليل عميق وخطوات تفكير منطقية مرتبطة بحالة المستخدم وأهدافه في عجلة الحياة',
            },
            score: {
              type: Type.NUMBER,
              description: 'درجة أو تقييم رقمي',
            },
            summary: {
              type: Type.STRING,
              description: 'ملخص الوضع بناءً على البيانات',
            },
            advice: {
              type: Type.STRING,
              description: 'نصيحة عملية سريعة وموجهة',
            },
            reply: {
              type: Type.STRING,
              description: 'نص الرد التفصيلي والمشجع من المستشار المتحدث مباشرة للمستفيد',
            },
            actionSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'خطوات إجرائية سريعة يمكن إضافتها لقائمة الأهداف',
            },
            reflectionQuestion: {
              type: Type.STRING,
              description: 'سؤال تأملي ذكي للمستفيد',
            },
          },
          required: ['reasoning', 'advice', 'reply', 'actionSteps'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.agent_name = parsed.agent_name || advisorName;
    parsed.reasoning = parsed.reasoning || '';
    parsed.summary = parsed.summary || '';
    parsed.advice = parsed.advice || '';
    parsed.score = parsed.score !== undefined ? parsed.score : effectiveScore;
    if (!parsed.reply && (parsed.advice || parsed.summary)) {
      parsed.reply = parsed.advice || parsed.summary;
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    }
    return res.json(parsed);
  } catch (error: any) {
    console.error('Advisor Chat Gemini error:', error?.message || error);
    const { advisor, userProfile, message, userName, userScore, isEvaluationSession, evaluationStep } = req.body;
    const agentKey = typeof advisor === 'string' ? advisor : (advisor?.id || 'financial');
    const localFallback = generateLocalAgentResponse(
      agentKey,
      message || '',
      userProfile?.name || userName || 'صديقنا',
      advisor,
      userScore || 5,
      isEvaluationSession,
      evaluationStep
    );
    return res.json(localFallback);
  }
});

// Helper: Generate structured fallback director report when Gemini is unavailable
function generateFallbackDirectorReport(userProfile: any, scores: any, advisorSummaries: any, focusArea: string) {
  const scoreEntries = Object.entries(scores || {}) as [string, number][];
  const sorted = scoreEntries.sort((a, b) => b[1] - a[1]);
  const best = sorted[0] || ['الروحي', 8];
  const worst = sorted[sorted.length - 1] || ['الصحي', 5];
  const avg = scoreEntries.length > 0
    ? (scoreEntries.reduce((acc, curr) => acc + curr[1], 0) / scoreEntries.length).toFixed(1)
    : '7.0';
  const avgNum = parseFloat(avg);
  const label = avgNum >= 8 ? 'تناغم قيادي متقدم 🌟' : avgNum >= 6.5 ? 'توازن واعد ومستقر 🚀' : 'مرحلة إعادة التأسيس والتركيز 🎯';

  return {
    overallDiagnosis: `بناءً على قراءة عجلة حياتك بمعدل عام (${avg}/10)، يتبين وجود ركيزة قوية في جانب (${best[0]}) تمنحك استقراراً وطاقة إيجابية. في المقابل، يمثل جانب (${worst[0]}) عنق الزجاجة الأبرز الذي يستوجب تركيزاً مباشراً لحمايته من التسويف وإدراجه في المربع الثاني بمصفوفة أيزنهاور.`,
    balanceIndexLabel: label,
    strongestSynergy: {
      title: `قوة ${best[0]} كرافعة للنمو`,
      description: `الأداء المتقدم في هذا الجانب يمنحك مناعة نفسية ورؤية صلبة يمكن استثمارها لدعم المجالات الأخرى.`,
      domainsInvolved: [String(best[0]), 'التطوير الشخصي', 'إدارة الطاقة'],
    },
    criticalBottleneck: {
      title: `فجوة ${worst[0]} وأثرها التراكمي`,
      impact: `تراجع هذا الجانب يشكل تسرباً غير مرئي للطاقة قد يحد من استدامة نتائجك في بقية المجالات.`,
      recommendation: `خصص 15 دقيقة يومياً لحماية هذا الجانب كعادة ثابتة في المربع الثاني دون تسويف.`,
      domain: String(worst[0]),
    },
    keystoneHabits: [
      {
        name: 'طقس السكينة والبدء الواعي (المربع 2)',
        triggerTime: 'الصباح الباكر',
        targetDomains: ['الروحي', 'الصحي', 'الشخصي'],
        expectedImpact: 'رفع التركيز الذهني بنسبة 40% وتقليل تشتت اليوم.',
      },
      {
        name: 'المراجعة الاستراتيجية المسائية (10 دقائق)',
        triggerTime: 'نهاية اليوم',
        targetDomains: ['المهني', 'المالي', 'الأسري'],
        expectedImpact: 'إغلاق دوائر المهام المفتوحة وتحقيق راحة نفسية واستقرار.',
      },
      {
        name: 'خلوة التخطيط الأسبوعي',
        triggerTime: 'عصر كل جمعة',
        targetDomains: ['المالي', 'المهني', 'الاجتماعي'],
        expectedImpact: 'ترتيب أولويات الأسبوع القادم مسبقاً وتفادي الطوارئ الزائفة.',
      },
    ],
    thirtyDayRoadmap: [
      {
        weekNumber: 1,
        weekTitle: 'إيقاف الهدر وضبط النزيف',
        coreFocus: 'تحديد نقاط التسرب في الوقت والطاقة والمال ومعالجتها فوراً',
        actions: ['تفريغ الذهن في قائمة المربع الثاني', 'إيقاف المشتتات الرقمية غير الضرورية'],
      },
      {
        weekNumber: 2,
        weekTitle: 'ترسيخ العادات المحورية',
        coreFocus: 'بناء روتين صباحي ومسائي ثابت لا يتجاوز 15 دقيقة',
        actions: ['تثبيت موعد الاستيقاظ والنوم', 'تخصيص وقت الخلوة الذهنية اليومية'],
      },
      {
        weekNumber: 3,
        weekTitle: 'التكامل بين العمل والحياة',
        coreFocus: 'تعزيز جودة الحضور الأسري والروحي مع الحفاظ على الإنتاجية',
        actions: ['تحديد ساعات فاصلة بين العمل والمنزل', 'ممارسة الامتنان والتواصل الإيجابي'],
      },
      {
        weekNumber: 4,
        weekTitle: 'مراجعة الحصاد والتمكين',
        coreFocus: 'إعادة تقييم عجلة الحياة وقياس الفارق ومضاعفة المكاسب',
        actions: ['تحديث الدرجات في منصة تدبير', 'الاحتفاء بالتقدم وصياغة أهداف الشهر القادم'],
      },
    ],
    directorGoldenRule: 'التوازن ليس أن تمنح كل جانب نفس الوقت والجهد، بل أن تمنح كل جانب حقه في اللحظة المناسبة بحضور كامل.',
  };
}

// Endpoint: Director Summary (Cross-Domain Insights & Master Action Plan)
app.post('/api/gemini/director-summary', async (req: Request, res: Response) => {
  try {
    const { userProfile, scores, advisorSummaries, focusArea } = req.body;

    if (!apiKey) {
      const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea);
      return res.json(fallback);
    }

    const systemInstruction = `
أنت "المنسق العام للتوازن الذكي" (Master Life Director) في منصة "LifeBalance AI".
مهمتك النظر في حياة المستفيد كمنظومة واحدة متكاملة (Holistic Life Ecosystem) وليست جزر منعزلة.
أنت خبير في:
- تحليل التناغم والتأثير المتبادل بين مجالات الحياة الثمانية (الروحي، المالي، المهني، الشخصي، التعليمي، الأسري، الاجتماعي، الصحي).
- كشف الحلقات المفرغة (Vicious Cycles) التي يسحب فيها جانب ضعيف الجوانب الأخرى.
- تحديد "العادات المحورية" (Keystone Habits) التي يؤدي تحسينها إلى انتعاش تلقائي في 3 مجالات أو أكثر دفعة واحدة.
- تصميم خطة عمل متكاملة لمدة 30 يوماً مقسمة أسبوعياً بنبرة قيادية حكيمة وواقعية ومحفزة للغاية.

اللغة: عربية فصيحة، راقية، دقيقة، عميقة، وموجهة للعمل.
`;

    const prompt = `
بيانات المستفيد الشاملة:
- الاسم: ${userProfile?.name || 'المستخدم'}
- العمر / المرحلة: ${userProfile?.ageGroup || 'غير محدد'}
- الأولوية الحالية: ${focusArea || 'تحقيق التوازن الشامل'}

درجات مجالات الحياة الثمانية (من 10):
${JSON.stringify(scores || {}, null, 2)}

ملخص إجابات وأهداف المجالات:
${JSON.stringify(advisorSummaries || {}, null, 2)}

يرجى إعداد التقرير التكاملي الشامل بصيغة JSON وفق المخطط المطلوب.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallDiagnosis: {
              type: Type.STRING,
              description: 'التشخيص الاستراتيجي العام لحالة التوازن الحالية (3-4 فقرات ثرية)',
            },
            balanceIndexLabel: {
              type: Type.STRING,
              description: 'عنوان وصفي لحالة التوازن (مثل: متأهب للانطلاق، واعد يحتاج تركيز، متوازن استراتيجياً)',
            },
            strongestSynergy: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                domainsInvolved: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['title', 'description', 'domainsInvolved'],
              description: 'أقوى نقطة تناغم إيجابية بين مجالين أو أكثر تدعم المستفيد',
            },
            criticalBottleneck: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                impact: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                domain: { type: Type.STRING },
              },
              required: ['title', 'impact', 'recommendation', 'domain'],
              description: 'عنق الزجاجة الأبرز الذي يعطل بقية الجوانب وحله العاجل',
            },
            keystoneHabits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  triggerTime: { type: Type.STRING },
                  targetDomains: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  expectedImpact: { type: Type.STRING },
                },
                required: ['name', 'triggerTime', 'targetDomains', 'expectedImpact'],
              },
              description: '3 عادات محورية مركبة تؤثر على جوانب متعددة معاً',
            },
            thirtyDayRoadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  weekNumber: { type: Type.INTEGER },
                  weekTitle: { type: Type.STRING },
                  coreFocus: { type: Type.STRING },
                  actions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['weekNumber', 'weekTitle', 'coreFocus', 'actions'],
              },
              description: 'خطة عمل لمدة 4 أسابيع متتالية',
            },
            directorGoldenRule: {
              type: Type.STRING,
              description: 'وصية ذهبية ملهمة وخاتمة من المدير التنفيذي للحياة',
            },
          },
          required: [
            'overallDiagnosis',
            'balanceIndexLabel',
            'strongestSynergy',
            'criticalBottleneck',
            'keystoneHabits',
            'thirtyDayRoadmap',
            'directorGoldenRule',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.reply && (parsed.summary || parsed.advice)) {
      parsed.reply = [parsed.summary, parsed.advice].filter(Boolean).join('\n\n');
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    }
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Director Summary Gemini API unavailable, using intelligent local synthesis:', error?.message || error);
    const { userProfile, scores, advisorSummaries, focusArea } = req.body;
    const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea);
    return res.json(fallback);
  }
});

// Endpoint: Area Deep-Dive & AI Action Synthesis
app.post('/api/gemini/area-deepdive', async (req: Request, res: Response) => {
  try {
    const { advisorId, advisorTitle, score, answers, goals } = req.body;

    if (!apiKey) {
      const localDeepdive = {
        assessmentSummary: `بناءً على تقييمك الحالي في ${advisorTitle || 'هذا الجانب'} بدرجة (${score || 5}/10)، يتبين وجود رغبة واضحة للتطوير والانتقال لمستوى أكثر استقراراً ونضجاً.`,
        keyStrengths: [
          'الوعي الذاتي العالي بالحاجة للتحسين المستمر',
          'وضوح الرؤية الأولية للأهداف في هذا الجانب',
        ],
        mainChallenges: [
          'تحدي المداومة والاستمرارية وسط تسارع الالتزامات اليومية',
          'الحاجة إلى بناء عادات صغيرة ثابتة بدلاً من الحماس المؤقت',
        ],
        quickWins: [
          'تحديد إجراء واحد ملموس لا يتجاوز 10 دقائق لتطبيقه اليوم',
          'إدراج هذا الإجراء في المربع الثاني بمصفوفة أيزنهاور لحمايته من التسويف',
        ],
        strategicMilestone: `تحقيق نقلة نوعية واستقرار ملموس في ${advisorTitle || 'هذا الجانب'} خلال الـ 90 يوماً القادمة.`,
      };
      return res.json(localDeepdive);
    }

    const systemInstruction = `
أنت خبير استشاري متقدم في مجال "${advisorTitle}".
قم بتحليل إجابات المستخدم ودرجته (${score}/10) وأهدافه بدقة استشارية فائقة.
قدم تحليلاً عملياً مشجعاً ومباشراً بصيغة JSON.
`;

    const prompt = `
الدرجة الحالية: ${score}/10
الإجابات المعطاة: ${JSON.stringify(answers || {})}
الأهداف المحددة: ${JSON.stringify(goals || [])}
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessmentSummary: { type: Type.STRING },
            keyStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            mainChallenges: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            quickWins: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            strategicMilestone: { type: Type.STRING },
          },
          required: ['assessmentSummary', 'keyStrengths', 'mainChallenges', 'quickWins', 'strategicMilestone'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.reply && (parsed.summary || parsed.advice)) {
      parsed.reply = [parsed.summary, parsed.advice].filter(Boolean).join('\n\n');
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    }
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Area Deep-dive Gemini API unavailable, using local synthesis:', error?.message || error);
    const { advisorTitle, score } = req.body;
    const localDeepdive = {
      assessmentSummary: `بناءً على تقييمك الحالي في ${advisorTitle || 'هذا الجانب'} بدرجة (${score || 5}/10)، يتبين وجود رغبة واضحة للتطوير والانتقال لمستوى أكثر استقراراً ونضجاً.`,
      keyStrengths: [
        'الوعي الذاتي العالي بالحاجة للتحسين المستمر',
        'وضوح الرؤية الأولية للأهداف في هذا الجانب',
      ],
      mainChallenges: [
        'تحدي المداومة والاستمرارية وسط تسارع الالتزامات اليومية',
        'الحاجة إلى بناء عادات صغيرة ثابتة بدلاً من الحماس المؤقت',
      ],
      quickWins: [
        'تحديد إجراء واحد ملموس لا يتجاوز 10 دقائق لتطبيقه اليوم',
        'إدراج هذا الإجراء في المربع الثاني بمصفوفة أيزنهاور لحمايته من التسويف',
      ],
      strategicMilestone: `تحقيق نقلة نوعية واستقرار ملموس في ${advisorTitle || 'هذا الجانب'} خلال الـ 90 يوماً القادمة.`,
    };
    return res.json(localDeepdive);
  }
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LifeBalance AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
