import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';

export const areaDeepdiveRouter = Router();

// Endpoint: Area Deep-Dive & AI Action Synthesis
areaDeepdiveRouter.post('/area-deepdive', async (req: Request, res: Response) => {
  try {
    const { advisorTitle, score, answers, goals, userProfile } = req.body;

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

    const response = await ai.models.generateContent({
      model: (GEMINI_MODEL && !GEMINI_MODEL.includes('2.5') ? GEMINI_MODEL : 'gemini-flash-lite-latest'),
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
