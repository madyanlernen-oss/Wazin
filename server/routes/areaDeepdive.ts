import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';

export const areaDeepdiveRouter = Router();

// In-memory short-lived cache (TTL 60s) for instant response on re-navigation
const areaDeepdiveCache = new Map<string, { data: any; timestamp: number }>();

function generateFallbackDeepdive(advisorTitle: string, score: number, userProfile: any) {
  const status = (userProfile?.employmentStatus || userProfile?.workStatus || '').trim();
  const isStudent = status === 'طالب جامعي' || status.includes('طالب');
  const safeScore = score > 0 ? (score > 10 ? Number((score / 10).toFixed(1)) : Number(score.toFixed(1))) : 5.0;

  const studentWins = advisorTitle?.includes('مال')
    ? [
        'اقتطاع رمزي (30 إلى 50 ريالاً) كحصالة أمان فور استلام المكافأة/المصروف',
        'تحديد سقف أسبوعي للمستلزمات والمقاهي لحماية المكافأة',
      ]
    : advisorTitle?.includes('روحي') || advisorTitle?.includes('سكينة')
    ? [
        'تخصيص 15 دقيقة هدوء صباحي بدون هاتف أو تشتت',
        'ركعتين بسكينة مع إطالة السجود والتنفس العميق',
      ]
    : [
        'تحديد إجراء واحد ملموس لا يتجاوز 10 دقائق لتطبيقه اليوم',
        'إدراج هذا الإجراء في المربع الثاني بمصفوفة أيزنهاور لحمايته من التسويف',
      ];

  return {
    assessmentSummary: `بناءً على تقييمك الحالي في ${advisorTitle || 'هذا الجانب'} بدرجة (${safeScore}/10)${isStudent ? ' في واقعك الأكاديمي والجامعي' : ''}، يتبين وجود رغبة واضحة للتطوير والانتقال لمستوى أكثر استقراراً ونضجاً.`,
    keyStrengths: [
      'الوعي الذاتي العالي بالحاجة للتحسين المستمر دون جلد للذات',
      'وضوح الرؤية الأولية للأهداف في هذا الجانب وخلو السجل من التعقيد',
    ],
    mainChallenges: [
      'تحدي المداومة والاستمرارية وسط تسارع الالتزامات والمشتتات',
      'الحاجة إلى بناء عادات صغيرة ثابتة بدلاً من الحماس المؤقت',
    ],
    quickWins: studentWins,
    strategicMilestone: `تحقيق نقلة نوعية واستقرار ملموس في ${advisorTitle || 'هذا الجانب'} خلال الـ 90 يوماً القادمة.`,
    source: 'fallback',
  };
}

// Endpoint: Area Deep-Dive & AI Action Synthesis
areaDeepdiveRouter.post('/area-deepdive', async (req: Request, res: Response) => {
  try {
    const { advisorTitle, score, answers, goals, userProfile } = req.body;

    const cacheKey = JSON.stringify({
      advisorTitle,
      score,
      status: userProfile?.employmentStatus || userProfile?.workStatus,
    });
    const cached = areaDeepdiveCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('[Area Deepdive] استجابة فورية من الذاكرة المؤقتة (Cache Hit < 1ms)');
      return res.json(cached.data);
    }

    const deepdiveWorkStatus = (userProfile?.employmentStatus || userProfile?.workStatus || '').trim();
    const deepdiveAgeGroup = (userProfile?.ageGroup || '').trim();
    const deepdiveIncomeSource = (userProfile?.incomeSource || '').trim();
    const deepdiveIncomeStability = (userProfile?.incomeStability || '').trim();

    const deepdiveUserContext = `
[سياق المستفيد الأساسي وتخصيص التحليل 🎯]:
- الاسم: ${userProfile?.name || 'المستفيد'}
${deepdiveWorkStatus ? `- حالة العمل: ${deepdiveWorkStatus}` : ''}
${deepdiveAgeGroup ? `- الفئة العمرية: ${deepdiveAgeGroup}` : ''}
${deepdiveIncomeSource ? `- مصدر الدخل: ${deepdiveIncomeSource}` : ''}
${deepdiveIncomeStability ? `- طبيعة واستقرار الدخل: ${deepdiveIncomeStability}` : ''}

⛔ قاعدة صارمة وملزمة في التحليل والتوصيات:
لا تطرح أي سؤال أو نصيحة لا تناسب حالته (مثلاً لا تسأل طالباً عن الراتب والأقساط، ولا تقدم نصائح استثمار معقدة لمن دخله مصروف، ولا تفترض دواماً وظيفياً لمن هو طالب أو متقاعد أو باحث عن عمل). وإن ذكر المستخدم ما يتعارض مع ملفه فاتبع كلامه في الحوار.
`;

    if (!GEMINI_API_KEY) {
      const localDeepdive = generateFallbackDeepdive(advisorTitle, score, userProfile);
      return res.json(localDeepdive);
    }

    const systemInstruction = `
${deepdiveUserContext}

أنت خبير استشاري متقدم في مجال "${advisorTitle}".
قم بتحليل إجابات المستخدم ودرجته (${score}/10) وأهدافه بدقة استشارية فائقة وبما يطابق واقع حالته.
قدم تحليلاً عملياً مشجعاً ومباشراً بصيغة JSON.
`;

    const prompt = `
${deepdiveUserContext}

الجانب: ${advisorTitle}
الدرجة الحالية: ${score}/10
الإجابات المعطاة: ${JSON.stringify(answers || {})}
الأهداف المحددة: ${JSON.stringify(goals || [])}
`;

    const candidateModel = GEMINI_MODEL && !GEMINI_MODEL.includes('2.5') ? GEMINI_MODEL : 'gemini-3.5-flash-lite';
    const startGemini = Date.now();

    const apiCall = ai.models.generateContent({
      model: candidateModel,
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('مهلة استجابة Gemini (3.5 ثوانٍ) تجاوزت الحد المسموح في التحليل العميق')), 3500)
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    const durationMs = Date.now() - startGemini;
    console.log(`[Area Deepdive] استجاب Gemini بنجاح في ${durationMs}ms`);

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.reply && (parsed.summary || parsed.advice)) {
      parsed.reply = [parsed.summary, parsed.advice].filter(Boolean).join('\n\n');
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    }
    parsed.source = 'gemini';

    areaDeepdiveCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    return res.json(parsed);
  } catch (error: any) {
    console.warn('[Area Deepdive] تعذر التحليل عبر Gemini، تفعيل التحليل الاستشاري البديل:', error?.message || error);
    const { advisorTitle, score, userProfile } = req.body;
    const localDeepdive = generateFallbackDeepdive(advisorTitle, score, userProfile);
    return res.json(localDeepdive);
  }
});
