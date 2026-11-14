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

// Helper: Smart local agent responses matching Agents/*.md personas
function generateLocalAgentResponse(
  agentKey: string,
  message: string,
  userName: string,
  advisor: any,
  score: number
) {
  const msg = message.toLowerCase().trim();
  const isGreeting = /^(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح|مساء|هلا|هاي|حيّاك|حيّك)/i.test(msg);

  const personaMap: Record<string, {
    title: string;
    advisorName: string;
    greetingReply: string;
    generalReply: string;
    actionSteps: string[];
    reflectionQuestion: string;
  }> = {
    spiritual: {
      title: 'الجانب الروحي',
      advisorName: 'د. سفيان الروحي',
      greetingReply: `أهلاً ومرحباً بك يا ${userName}! أنا د. سفيان المستشار الروحي في منصة تدبير.\n\nيسعدني جداً أن نتحاور معاً حول سكينتك الداخلية، وتدبر يومك، وتناغم عبادتك مع وتيرة حياتك. كيف تشعر بروحانياتك وحضور قلبك هذه الأيام؟ تحدث معي بأريحية تامة.`,
      generalReply: `تأملت في كلماتك بعناية يا ${userName}. التوازن الروحي هو النواة المركزية التي تمد بقية مجالات حياتك بالسكينة والتحمل. حتى في أشد أيامك ازدحاماً، دقيقة واحدة من الاستغفار الواعي أو التأمل الهادئ تصنع فارقاً شاسعاً في صفاء روحك.`,
      actionSteps: [
        'تخصيص 5 دقائق خلوة وتدبر صامت بعد صلاة الفجر',
        'قراءة صفحتين من القرآن الكريم بتأنٍ وتدبر يومياً'
      ],
      reflectionQuestion: 'ما هو العمل البسيط الذي يمنح قلبك أكبر قدر من الطمأنينة والسلام الداخلي؟'
    },
    financial: {
      title: 'الجانب المالي',
      advisorName: 'أ. فيصل المالي',
      greetingReply: `مرحباً بك يا ${userName}! أنا أ. فيصل المستشار المالي لمنصة تدبير.\n\nهدفي أن نبني معاً وعياً مالياً حكيماً يضمن لك الأمان والنمو المستدام دون تضييق. ما الذي يشغل تفكيرك مالياً أو تود مراجعته معي اليوم؟`,
      generalReply: `نظرت في مدخلاتك يا ${userName}. في إدارة المال، الوعي بنقاط التسرب الصغير أهم بكثير من حجم الدخل وحده. ضبط نفقات المربع الرابع الاستهلاكي يتيح لك بناء صندوق طوارئ صلب يمنحك راحة البال.`,
      actionSteps: [
        'تدوين كافة المصروفات اليومية لمدة أسبوع لرصد الهدر',
        'تحويل مبلغ تلقائي ثابت (حتى لو بسيط) لصندوق الادخار فور استلام الراتب'
      ],
      reflectionQuestion: 'هل تشعر أن قراراتك المالية الحالية تخدم أهدافك الاستراتيجية أم استهلاك اللحظة؟'
    },
    health: {
      title: 'الجانب الصحي',
      advisorName: 'ك. زياد الصحي',
      greetingReply: `أهلاً بك يا ${userName}! أنا كابتن زياد المستشار الصحي والبدني.\n\nصحتك وطاقتك الجسدية هي رأس مالك الحقيقي ووقود كل إنجازاتك. كيف تقيّم جودة نومك، نشاطك البدني، وغذائك في الآونة الأخيرة؟`,
      generalReply: `رسالتك واضحة يا ${userName}. الجسد أمانة ويعكس أدق عاداتنا اليومية. تحسين ثلاثية (النوم المنضبط قبل منتصف الليل + 8000 خطوة يومياً + شرب الماء) كفيل برفع طاقتك بنسبة تتجاوز 40% خلال أيام قليلة.`,
      actionSteps: [
        'المشي السريع لمدة 20 دقيقة يومياً في الهواء الطلق',
        'شرب لترين من الماء وتثبيت موعد النوم والاستيقاظ'
      ],
      reflectionQuestion: 'ما هي العادة الصحية البسيطة التي لو التزمت بها ستشعر بفارق فوري في نشاطك اليومي؟'
    },
    career: {
      title: 'الجانب المهني',
      advisorName: 'م. طارق المهني',
      greetingReply: `أهلاً ومرحباً يا ${userName}! أنا م. طارق المستشار المهني والإنتاجية.\n\nنهدف معاً لتحقيق أعلى درجات الأثر والنمو الوظيفي دون السقوط في فخ الاحتراق. ما هو التحدي المهني أو المشروع الأهم الذي تركز عليه حالياً؟`,
      generalReply: `أحسنت في طرح هذا الأمر يا ${userName}. الإنتاجية الحقيقية ليست بكثرة ساعات العمل، بل في حماية 'المربع الثاني' الاستراتيجي في مصفوفة أيزنهاور وعزل نفسك عن مقاطعات المهام التافهة.`,
      actionSteps: [
        'تحديد أهم 3 أولويات لإنجازها في الصباح الباكر قبل فتح الإشعارات',
        'تخصيص جلسة عمل عميق (Deep Work) لمدة 90 دقيقة بلا مشتتات'
      ],
      reflectionQuestion: 'ما هي المهمة النوعية التي إذا أتممتها هذا الأسبوع ستنقل مسارك المهني خطوة للأمام؟'
    },
    personal: {
      title: 'الجانب الشخصي',
      advisorName: 'أ. رنا الذاتية',
      greetingReply: `مرحباً بك من القلب يا ${userName}! أنا أ. رنا مستشارة التطوير الذاتي والراحة النفسية.\n\nالاعتناء بسلامك الداخلي وتفريغ التوتر أساس لاستمرار توازنك. كيف تشعر بمستوى الراحة والصفاء في يومك؟`,
      generalReply: `كلماتك تلامس جوهر التوازن يا ${userName}. حب الذات وإدارة الضغوط تتطلب وضع حدود واضحة مع ما يستنزف طاقتك النفسية، والحرص على تخصيص وقت يومي خالص لنفسك.`,
      actionSteps: [
        'تطبيق طقس التنفس العميق والاسترخاء لمدة 3 دقائق عند الشعور بالتوتر',
        'ممارسة هواية محببة أو نشاط ممتع لمدة 15 دقيقة يومياً'
      ],
      reflectionQuestion: 'ما هي المساحة الخاصة التي تحتاج لاستعادتها في جدولك لتتنفس بهدوء؟'
    },
    learning: {
      title: 'الجانب التعليمي',
      advisorName: 'د. ماجد الفكري',
      greetingReply: `أهلاً بك يا ${userName}! أنا د. ماجد مستشار التعلم المستمر والنمو الفكري.\n\nتطوير المهارات واكتساب المعرفة هو بوابتك للريادة في عالم سريع التغير. كيف تسير وتيرة قراءتك وتعلمك مؤخراً؟`,
      generalReply: `التعلم الذكي يا ${userName} يعتمد على التراكم الصغير المستمر (Compound Learning). 15 دقيقة قراءة يومية تعادل قراءة أكثر من 15 كتاباً نوعياً في العام الواحد!`,
      actionSteps: [
        'قراءة 10 صفحات يومياً من كتاب مركز في مجالك',
        'الاستماع لبودكاست نوعي في تخصصك أثناء المشي أو القيادة'
      ],
      reflectionQuestion: 'ما المهارة الجديدة التي تشعر أن تعلمها حالياً يمثل نقطة تحول في قدراتك؟'
    },
    family: {
      title: 'الجانب الأسري',
      advisorName: 'د. هدى الأسرية',
      greetingReply: `أهلاً بك يا ${userName}! أنا د. هدى مستشارة العلاقات الأسرية والتربية.\n\nالدفء الأسري هو الركيزة التي نلجأ إليها بعد تعب اليوم. كيف تقيّم جودة وحميمية الوقت الذي تقضيه مع أسرتك مؤخراً؟`,
      generalReply: `العلاقات الأسرية يا ${userName} تُبنى بلحظات الحضور الحقيقي وليس مجرد الوجود الشكلي في المنزل. جلسة شاي قصيرة بحضور ذهني وعاطفي كامل تصنع رابطاً عميقاً وأماناً لا يُعوض.`,
      actionSteps: [
        'تخصيص نصف ساعة يومياً للتحدث مع أهلك أو أبنائك بدون هواتف',
        'مبادرة باتصال أو زيارة بارّة لوالديك لتعزيز صلة الرحم'
      ],
      reflectionQuestion: 'كيف تجعل حضورك في البيت أكثر أثراً وحناناً لمن يحبونك؟'
    },
    social: {
      title: 'الجانب الاجتماعي',
      advisorName: 'أ. لمى الاجتماعية',
      greetingReply: `مرحباً بك يا ${userName}! أنا أ. لمى مستشارة الذكاء الاجتماعي والعلاقات.\n\nشبكة العلاقات الإيجابية والعطاء المجتمعي تصنع بهجة استثنائية في الحياة. كيف تجد دائرة معارفك وصداقاتك الحالية؟`,
      generalReply: `أنت في محيطك الاجتماعي مرآة لأقرب الناس إليك يا ${userName}. تصفية العلاقات من المحبطين والاقتراب من أصحاب الهمم العالية والقلوب النقية هو أعظم استثمار لعلاقاتك.`,
      actionSteps: [
        'التواصل مع صديق ملهم وصادق لم تلتقِ به منذ فترة',
        'المشاركة في مبادرة أو عمل تطوعي يعزز أثرك المجتمعي'
      ],
      reflectionQuestion: 'من هو الشخص الذي تشعر أن وجوده في حياتك يرفع من معنوياتك وطموحك؟'
    }
  };

  const persona = personaMap[agentKey] || personaMap.financial;

  return {
    reply: isGreeting ? persona.greetingReply : persona.generalReply,
    actionSteps: persona.actionSteps,
    reflectionQuestion: persona.reflectionQuestion
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
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
