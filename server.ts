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
  score: number
) {
  const msg = message.toLowerCase().trim();
  const isGreeting = /^(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح|مساء|هلا|هاي|حيّاك|حيّك)/i.test(msg);

  // 1. Domain: Spiritual (د. سفيان الروحي)
  if (agentKey === 'spiritual') {
    if (isGreeting) {
      return {
        reply: `أهلاً ومرحباً بك يا ${userName}! أنا د. سفيان المستشار الروحي في منصة تدبير.\n\nيسعدني جداً أن نتحاور معاً حول سكينتك الداخلية، وتدبر يومك، وتناغم عبادتك مع وتيرة حياتك. كيف تشعر بروحانياتك وحضور قلبك هذه الأيام؟ تحدث معي بأريحية تامة.`,
        actionSteps: [
          'تخصيص 5 دقائق خلوة وتدبر صامت بعد صلاة الفجر',
          'قراءة صفحتين من القرآن الكريم بتأنٍ وتدبر يومياً'
        ],
        reflectionQuestion: 'ما هو العمل البسيط الذي يمنح قلبك أكبر قدر من الطمأنينة والسلام الداخلي؟'
      };
    }

    if (msg.includes('استغفار') || msg.includes('صلاة') || msg.includes('فقط') || msg.includes('ارتاح') || msg.includes('راحة')) {
      return {
        reply: `سؤالك في غاية الصدق والعمق يا ${userName}!\n\nبالتأكيد لا؛ الجانب الروحي أوسع وأشمل بكثير من مجرد أداء حركات الصلاة أو ترديد الاستغفار باللسان كواجب روتيني.\nالروحانية الحقيقية تعني:\n1. **حضور القلب والسكينة**: أن تجد في الصلاة ملاذاً وراحة وليس مجرد مهمة تقضيها.\n2. **التفكر والامتنان**: التوقف لدقائق في يومك لتتأمل في نعم الله والكون وتتخلص من التوتر والتسارع.\n3. **سلامة الصدر والأثر الأخلاقي**: التسامح، التحرر من الأحقاد، وبث الطمأنينة والإحسان لمن حولك.\n\nإذا كنت لا تشعر بالراحة، فغالباً لأنك تستعجل العبادة وسط دوامة الضغوط، أو لأن هناك هماً دنيوياً يملأ ذهنك. خذ نفساً عميقاً، ولا تجلد ذاتك، فالسكينة تأتي بالهدوء والتفريغ التدريجي.`,
        actionSteps: [
          'صلّ صلاة واحدة اليوم ببطء مضاعف مع إطالة السجود والتنفس بهدوء',
          'جلسة صمت وتأمل لمدة 5 دقائق خالية تماماً من الهاتف والتفكير في العمل'
        ],
        reflectionQuestion: 'ما هو الأمر الذي يشغل بالك الآن وتستطيع تفويضه لله ليرتاح قلبك؟'
      };
    }

    if (msg.includes('كيف') || msg.includes('لماذا') || msg.includes('اكون') || msg.includes('رأيك') || msg.includes('برايك')) {
      return {
        reply: `تسألني كيف يجب أن تكون برأيي يا ${userName}؟\n\nالجواب الحكيم: لا يُطلب منك أن تكون إنساناً خارقاً أو خالياً من التقصير. المطلوب منك فقط هو أن تكون **"صادقاً مع نفسك"**.\nالجانب الروحي ليس أداة للوم الذات، بل هو مساحة لتستعيد فيها إنسانيتك وسلامك وسط صخب العالم. لتكون متزناً روحياً:\n- ابدأ بعادة صغيرة واحدة لا تتركها أبداً (مثل ركعتي الضحى أو دعاء صادق عند النوم).\n- تذكر أن العبرة بجودة اللحظة وحضور القلب، لا بكثرة الأرقام وأنت مشتت.`,
        actionSteps: [
          'اختيار عادة روحية واحدة خفيفة والالتزام بها أسبوعاً كاملاً',
          'تدوين مخاوفك على ورقة لتفريغ الشحنات السلبية واستعادة الهدوء'
        ],
        reflectionQuestion: 'ما هي اللحظة أو العبادة التي تجد فيها نفسك أقرب ما تكون للصدق والطمأنينة؟'
      };
    }

    return {
      reply: `أسمعك بوعي تام يا ${userName}. ما تشعر به من تذبذب في المشاعر أو فتور هو أمر يمر به كل إنسان يبحث عن الاستقرار الروحي.\nالنفس كالطائر؛ تحتاج إلى التغذية الهادئة والمداومة على القليل الدائم. لا تتردد في مشاركتي أي هاجس أو تساؤل يدور في خلدك لنفككه معاً بخطوات عملية وسكينة تامة.`,
      actionSteps: [
        'المشي لمدة 15 دقيقة مع الاستماع لشيء يلهم روحك ويهدئ فكرك',
        'تخصيص وقت استراحة بين المهام لاستعادة التنفس الهادئ'
      ],
      reflectionQuestion: 'ما الذي يمنعك اليوم من الشعور بالسلام الداخلي؟'
    };
  }

  // 2. Domain: Financial (أ. فيصل المالي)
  if (agentKey === 'financial') {
    if (isGreeting) {
      return {
        reply: `مرحباً بك يا ${userName}! أنا أ. فيصل المستشار المالي لمنصة تدبير.\n\nهدفي أن نبني معاً وعياً مالياً حكيماً يضمن لك الأمان والنمو المستدام دون تضييق. ما الذي يشغل تفكيرك مالياً أو تود مراجعته معي اليوم؟`,
        actionSteps: [
          'تدوين كافة المصروفات اليومية لمدة أسبوع لرصد الهدر',
          'تحويل مبلغ تلقائي ثابت (حتى لو بسيط) لصندوق الادخار فور استلام الراتب'
        ],
        reflectionQuestion: 'هل تشعر أن قراراتك المالية الحالية تخدم أهدافك الاستراتيجية أم استهلاك اللحظة؟'
      };
    }

    if (msg.includes('ديون') || msg.includes('قرض') || msg.includes('بطاقة') || msg.includes('التزام')) {
      return {
        reply: `التعامل مع الالتزامات والديون يا ${userName} يتطلب خطة منهجية باردة وهادئة:\n1. حصر المبالغ الإجمالية وسعر الفائدة لكل بطاقة أو دين.\n2. تطبيق استراتيجية 'كرة الثلج': سداد أصغر دين أولاً لتحقيق انتصار نفسي سريع.\n3. إيقاف استخدام البطاقات الائتمانية في الشراء اليومي فوراً.\nكل دين يمكن التخلص منه إذا التزمت بمسار محكم دون هلع.`,
        actionSteps: [
          'إعداد جدول بسيط لحصر الديون مرتبة من الأصغر إلى الأكبر',
          'تجميد البطاقة الائتمانية والاعتماد على بطاقة مسبقة الدفع بميزانية محددة'
        ],
        reflectionQuestion: 'ما هي المصاريف غير الضرورية التي لو أوقفتها شهرياً ستعجل بسداد ديونك؟'
      };
    }

    return {
      reply: `وجهة نظر تستحق الوقوف عندها يا ${userName}. إدارة المال ليست مجرد أرقام، بل هي سلوك وعادات نفسية. عندما تضع حدوداً واضحة بين 'الاحتياجات' و'الرغبات اللحظية'، ستلاحظ أنك قادر على الادخار دون أن تشعر بالحرمان.`,
      actionSteps: [
        'تطبيق قاعدة الـ 24 ساعة قبل شراء أي سلعة غير ضرورية',
        'مراجعة الاشتراكات الرقمية المتكررة وإلغاء ما لا يُستخدم'
      ],
      reflectionQuestion: 'لو توقف دخلك الحالي لـ 3 أشهر، هل تملك صمام أمان يحميك؟'
    };
  }

  // 3. Domain: Health (ك. زياد الصحي)
  if (agentKey === 'health') {
    if (isGreeting) {
      return {
        reply: `أهلاً بك يا ${userName}! أنا كابتن زياد المستشار الصحي والبدني.\n\nصحتك وطاقتك الجسدية هي رأس مالك الحقيقي ووقود كل إنجازاتك. كيف تقيّم جودة نومك، نشاطك البدني، وغذائك في الآونة الأخيرة؟`,
        actionSteps: [
          'المشي السريع لمدة 20 دقيقة يومياً في الهواء الطلق',
          'شرب لترين من الماء وتثبيت موعد النوم والاستيقاظ'
        ],
        reflectionQuestion: 'ما هي العادة الصحية البسيطة التي لو التزمت بها ستشعر بفارق فوري في نشاطك اليومي؟'
      };
    }

    if (msg.includes('نوم') || msg.includes('تعب') || msg.includes('ارهاق') || msg.includes('كسل')) {
      return {
        reply: `الشعور بالخمول أو تذبذب النوم يا ${userName} هو إشارة واضحة من جسدك يطلب فيها إعادة الضبط.\nأهم رافعة للطاقة هي:\n1. التوقف عن استخدام الشاشات الزرقاء قبل النوم بـ 45 دقيقة.\n2. الخروج لرؤية ضوء الشمس الصباحي لمدة 10 دقائق لضبط ساعتك البيولوجية.\n3. تجنب الوجبات الدسمة المتأخرة والمنبهات بعد الساعة 4 عصراً.`,
        actionSteps: [
          'إبعاد الهاتف عن السرير عند موعد النوم الليلة',
          'شرب كوب ماء كبير فور الاستيقاظ لإنعاش الخلايا'
        ],
        reflectionQuestion: 'ما هو التغيير البسيط في روتين مسائك الذي سيساعدك على النوم أعمق؟'
      };
    }

    return {
      reply: `كلامك في محله يا ${userName}. اللياقة والصحة لا تعني قضاء ساعات طويلة في النادي الرياضي، بل تعني بناء نشاط حركي مستمر خلال اليوم ومقاومة الجلوس الممتد.`,
      actionSteps: [
        'الوقوف والحركة لمدة 3 دقائق كل ساعة أثناء العمل',
        'استبدال المشروبات الغازية بالماء المنعش'
      ],
      reflectionQuestion: 'كيف يمكنك جعل الحركة اليومية عادة ممتعة وليست واجباً ثقيلاً؟'
    };
  }

  // 4. Default persona for other domains
  const fallbackAdvisors: Record<string, { role: string; name: string }> = {
    career: { role: 'المستشار المهني', name: 'م. طارق المهني' },
    personal: { role: 'مستشارة التطوير الذاتي', name: 'أ. رنا الذاتية' },
    learning: { role: 'مستشار التعلم والنمو الفكري', name: 'د. ماجد الفكري' },
    family: { role: 'مستشارة العلاقات الأسرية', name: 'د. هدى الأسرية' },
    social: { role: 'مستشارة الذكاء الاجتماعي', name: 'أ. لمى الاجتماعية' },
  };

  const advInfo = fallbackAdvisors[agentKey] || { role: 'مستشار توازن الحياة', name: 'مستشار تدبير' };

  return {
    reply: `أهلاً بك يا ${userName}، معك ${advInfo.name} (${advInfo.role}).\n\nتأملت في رسالتك: "${message}".\nما تطرحه يعبر عن رغبة حقيقية في النمو والتطور. لتحقيق نقلة نوعية في هذا الجانب، نحتاج للتركيز على الخطوة الإجرائية التالية المباشرة بدلاً من حمل الهموم دفعة واحدة.`,
    actionSteps: [
      'تحديد إجراء واحد ملموس يمكنك تنفيذه خلال الـ 24 ساعة القادمة',
      'إسقاط هذا الهدف في المربع الثاني بمصفوفة أيزنهاور لمتابعته'
    ],
    reflectionQuestion: 'ما هي العقبة الحقيقية التي تحول بينك وبين تنفيذ هذه الخطوة اليوم؟'
  };
}

// Endpoint: Advisor Chat
app.post('/api/gemini/advisor-chat', async (req: Request, res: Response) => {
  try {
    const { advisor, userProfile, answers, goals, message, history, userName, userScore, userGoals, userAnswers } = req.body;

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

    // قراءة تعليمات الوكيل من ملف الـ Markdown الخاص به بدقة
    let systemInstruction = "أنت مساعد ذكي لنظام تدبير.";
    if (fs.existsSync(agentPath)) {
      systemInstruction = fs.readFileSync(agentPath, 'utf8');
    }

    // إذا لم يكن مفتاح Gemini متوفراً في البيئة، نستخدم محرك الاستجابة الذكي المدمج المعتمد على مواصفات الوكلاء
    if (!apiKey) {
      const localResponse = generateLocalAgentResponse(
        agentKey,
        message,
        effectiveUserProfile?.name || 'صديقنا',
        advisor,
        effectiveScore
      );
      return res.json(localResponse);
    }

    // إثراء التعليمات بسياق المستفيد وأسلوب الرد المطلوب
    systemInstruction += `

سياق المستفيد من منصة تدبير:
- الاسم: ${effectiveUserProfile?.name || 'صديقنا'}
- الدرجة الحالية في هذا الجانب: ${effectiveScore}/10
- التحديات الحالية: ${advisor?.challenges?.join('، ') || 'لم تُحدد بعد'}
- الأهداف الحالية: ${effectiveGoals?.join('، ') || 'لم تُحدد بعد'}
- إجابات التقييم السابقة: ${JSON.stringify(effectiveAnswers)}

مهمتك الإضافية:
1. التحدث باللغة العربية الفصحى الدافئة، الحكيمة والملهمة.
2. تقديم نصيحة عملية وتحديد خطوات إجرائية سريعة (Micro-habits).
3. إرجاع الرد بصيغة JSON مهيكلة:
{
  "reply": "نص الرد والإرشاد العملي الشامل والمشجع من الوكيل",
  "actionSteps": ["خطوة عملية 1", "خطوة عملية 2"],
  "reflectionQuestion": "سؤال تأملي ذكي للمستفيد"
}
`;

    const contents = [
      ...(Array.isArray(history)
        ? history.map((h: { role: string; content: string }) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          }))
        : []),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'نص الرد التفصيلي والمشجع من المستشار',
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
          required: ['reply', 'actionSteps'],
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
    console.error('Advisor Chat API fallback to local agent:', error?.message);
    const { advisor, userProfile, message, userName, userScore } = req.body;
    const agentKey = typeof advisor === 'string' ? advisor : (advisor?.id || 'financial');
    const localFallback = generateLocalAgentResponse(
      agentKey,
      message || '',
      userProfile?.name || userName || 'صديقنا',
      advisor,
      userScore || 5
    );
    return res.json(localFallback);
  }
});

// Endpoint: Director Summary (Cross-Domain Insights & Master Action Plan)
app.post('/api/gemini/director-summary', async (req: Request, res: Response) => {
  try {
    const { userProfile, scores, advisorSummaries, focusArea } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: 'مفتاح Gemini API غير مهيأ في البيئة.',
      });
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
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
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
    console.error('Director Summary error:', error);
    return res.status(500).json({
      error: 'تعذر توليد تقرير المنسق العام: ' + (error?.message || 'خطأ في معالجة النموذج'),
    });
  }
});

// Endpoint: Area Deep-Dive & AI Action Synthesis
app.post('/api/gemini/area-deepdive', async (req: Request, res: Response) => {
  try {
    const { advisorId, advisorTitle, score, answers, goals } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: 'مفتاح Gemini API غير مهيأ.',
      });
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
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
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
    console.error('Area Deep-dive error:', error);
    return res.status(500).json({
      error: 'فشل تحليل الجانب: ' + (error?.message || 'خطأ غير متوقع'),
    });
  }
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
