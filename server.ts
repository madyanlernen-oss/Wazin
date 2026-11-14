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

// Endpoint: Advisor Chat
app.post('/api/gemini/advisor-chat', async (req: Request, res: Response) => {
  try {
    const { advisor, userProfile, answers, goals, message, history, userName, userScore, userGoals, userAnswers } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'مفتاح Gemini API غير مهيأ. يرجى التحقق من إعدادات المفاتيح.',
      });
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
    console.error('Advisor Chat error:', error);
    return res.status(500).json({
      error: 'تعذر الاتصال بالمستشار الذكي حالياً: ' + (error?.message || 'خطأ غير متوقع'),
    });
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
