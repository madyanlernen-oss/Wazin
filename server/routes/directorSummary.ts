import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';
import {
  getDomainArabicName,
  reconcileDirectorReportWithScores,
  sanitizeDirectorReportArabic,
} from '../../src/utils/arabicDomainLabels';

export const directorSummaryRouter = Router();

// In-memory short-lived cache (TTL 60s) for instant response on re-navigation
const directorSummaryCache = new Map<string, { data: any; timestamp: number }>();

// Helper: Generate structured fallback director report when Gemini is unavailable
export function generateFallbackDirectorReport(userProfile: any, scores: any, _advisorSummaries: any, _focusArea?: string) {
  const status = (userProfile?.employmentStatus || userProfile?.workStatus || '').trim();
  const isStudent = status === 'طالب جامعي' || status.includes('طالب');
  const studentIncomeTerm = userProfile?.incomeSource?.includes('مكافأة') ? 'المكافأة' : 'المصروف';

  const rawEntries = Object.entries(scores || {}) as [string, number][];
  const evaluatedEntries = rawEntries.filter(([, val]) => Number.isFinite(Number(val)) && Number(val) > 0);
  const scoreEntries = evaluatedEntries.length > 0 ? evaluatedEntries : rawEntries;
  const sorted = [...scoreEntries].sort((a, b) => Number(b[1]) - Number(a[1]));
  const bestRaw = sorted[0] || ['spiritual', 8];
  const worstRaw = sorted[sorted.length - 1] || ['health', 5];
  const bestScore = Number(bestRaw[1]) || 0;
  const bestLabel = getDomainArabicName(bestRaw[0]);
  const worstLabel = getDomainArabicName(worstRaw[0]);
  const avg = scoreEntries.length > 0
    ? (scoreEntries.reduce((acc, curr) => acc + Number(curr[1]), 0) / scoreEntries.length).toFixed(1)
    : '7.0';
  const avgNum = parseFloat(avg);
  const label = avgNum >= 8 ? 'تناغم قيادي متقدم 🌟' : avgNum >= 6.5 ? 'توازن واعد ومستقر 🚀' : 'مرحلة إعادة التأسيس والتركيز 🎯';
  const synergyTitle =
    bestScore >= 7.8
      ? `قوة ${bestLabel} كرافعة للنمو`
      : `استقرار ${bestLabel} كنقطة انطلاق`;
  const synergyDesc =
    bestScore >= 7.8
      ? `الأداء المتقدم في ${bestLabel} (${bestScore.toFixed(1)}/10) يمنحك مناعة نفسية ورؤية صلبة يمكن استثمارها لدعم المجالات الأخرى.`
      : `يمثل ${bestLabel} أعلى درجاتك الحالية في العجلة (${bestScore.toFixed(1)}/10)، ويمكن البناء على هذا الاستقرار النسبي لرفع باقي المجالات تدريجياً.`;
  const diagnosisLead =
    bestScore >= 7.8
      ? `يتبين وجود ركيزة قوية في ${bestLabel} تمنحك استقراراً وطاقة إيجابية`
      : `يمثل ${bestLabel} أعلى جوانبك الحالية نسبياً (${bestScore.toFixed(1)}/10) ويمكن البناء عليه بهدوء`;

  const studentHabits = [
    {
      name: 'طقس السكينة والبدء الواعي في المربع الثاني',
      triggerTime: 'الصباح الباكر',
      targetDomains: ['الروحي', 'الصحي', 'الشخصي'],
      expectedImpact: 'رفع التركيز الذهني بنسبة 40% وتصفية الذهن قبل بدء المحاضرات.',
    },
    {
      name: 'جلسة العمل والمذاكرة العميقة لمدة 45 دقيقة',
      triggerTime: 'العصر / المساء',
      targetDomains: ['المهني/الأكاديمي', 'المعرفي', 'الشخصي'],
      expectedImpact: 'إنجاز التكاليف الجامعية بجودة عالية وحماية وقت المساء للراحة.',
    },
    {
      name: 'خلوة التخطيط الأكاديمي وصمام الأمان الأسبوعي',
      triggerTime: 'عصر كل جمعة',
      targetDomains: ['المالي', 'المهني/الأكاديمي', 'الاجتماعي'],
      expectedImpact: `مراجعة ميزانية ${studentIncomeTerm} الأسبوعية وتأكيد حصالة الأمان وتفادي زنقة الاختبارات.`,
    },
  ];

  const generalHabits = [
    {
      name: 'طقس السكينة والبدء الواعي في المربع الثاني',
      triggerTime: 'الصباح الباكر',
      targetDomains: ['الروحي', 'الصحي', 'الشخصي'],
      expectedImpact: 'رفع التركيز الذهني بنسبة 40% وتقليل تشتت اليوم.',
    },
    {
      name: 'المراجعة الاستراتيجية المسائية لمدة 10 دقائق',
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
  ];

  const studentRoadmap = [
    {
      weekNumber: 1,
      weekTitle: 'إيقاف التشتت وتأسيس صمام الأمان',
      coreFocus: `حماية طاقة الدراسة واقتطاع مبلغ رمزي من ${studentIncomeTerm} كصمام أمان أول`,
      actions: ['تفريغ المهام الجامعية في المربع الثاني', 'تثبيت عادة 30 دقيقة هدوء صباحي بدون هاتف'],
    },
    {
      weekNumber: 2,
      weekTitle: 'ترسيخ وتيرة المذاكرة المنتظمة',
      coreFocus: 'بناء روتين جلسات المذاكرة المركزة المتقطعة لكسر التسويف الأكاديمي',
      actions: ['تثبيت موعد النوم والاستيقاظ', 'جلسة مذاكرة عميقة 45 دقيقة يومياً'],
    },
    {
      weekNumber: 3,
      weekTitle: 'التكامل بين الدراسة والحياة الاجتماعية',
      coreFocus: 'تعزيز العلاقات الإيجابية وحضور جلسات الأهل مع الحفاظ على الإنتاجية',
      actions: ['حجز وقت أسبوعي للدفء الأسري بدون شاشات', 'المشي 20 دقيقة لتجديد النشاط البدني'],
    },
    {
      weekNumber: 4,
      weekTitle: 'مراجعة الحصاد والتمكين الجامعي',
      coreFocus: 'إعادة تقييم عجلة الحياة وقياس الفارق ومضاعفة المكاسب الأكاديمية والذاتية',
      actions: ['تحديث الدرجات في منصة وزان', 'الاحتفاء بالتقدم وصياغة أولويات الشهر القادم'],
    },
  ];

  const generalRoadmap = [
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
      actions: ['تحديث الدرجات في منصة وزان', 'الاحتفاء بالتقدم وصياغة أهداف الشهر القادم'],
    },
  ];

  return reconcileDirectorReportWithScores({
    overallDiagnosis: `بناءً على قراءة عجلة حياتك بمعدل عام (${avg}/10)، ${diagnosisLead}. في المقابل، يمثل ${worstLabel} عنق الزجاجة الأبرز الذي يستوجب تركيزاً مباشراً لحمايته من التسويف وإدراجه في المربع 2 بمصفوفة أيزنهاور.`,
    balanceIndexLabel: label,
    strongestSynergy: {
      title: synergyTitle,
      description: synergyDesc,
      domainsInvolved: [bestLabel, 'التطوير الشخصي', 'إدارة الطاقة'],
    },
    criticalBottleneck: {
      title: `فجوة ${worstLabel} وأثرها التراكمي`,
      impact: `تراجع هذا الجانب إلى (${Number(worstRaw[1] || 5).toFixed(1)}/10) يشكل تسرباً غير مرئي للطاقة قد يحد من استدامة نتائجك في بقية المجالات.`,
      recommendation: `خصص 15 دقيقة يومياً لحماية هذا الجانب كعادة ثابتة في المربع 2 دون تسويف.`,
      domain: worstLabel,
    },
    keystoneHabits: isStudent ? studentHabits : generalHabits,
    thirtyDayRoadmap: isStudent ? studentRoadmap : generalRoadmap,
    directorGoldenRule: isStudent
      ? 'التوازن في المرحلة الجامعية لا يعني الكمال في كل مادة ولحظة، بل حماية بوصلة اليوم بين علم ينتفع به، وصمام أمان مالي ميسر، وسكينة قلب.'
      : 'التوازن ليس أن تمنح كل جانب نفس الوقت والجهد، بل أن تمنح كل جانب حقه في اللحظة المناسبة بحضور كامل.',
    source: 'fallback',
  }, scores);
}

// Endpoint: Director Summary (Cross-Domain Insights & Master Action Plan)
directorSummaryRouter.post('/director-summary', async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'بيانات الطلب غير صالحة، يجب أن تكون كائناً بصيغة JSON.' });
    }
    const { userProfile, scores, advisorSummaries, focusArea } = req.body;

    // Fast Cache Check (TTL 60s) for sub-second responses on re-checks
    const cacheKey = JSON.stringify({
      name: userProfile?.name,
      status: userProfile?.employmentStatus || userProfile?.workStatus,
      scores,
      focusArea,
    });
    const cached = directorSummaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('[Director Summary] استجابة فورية من الذاكرة المؤقتة (Cache Hit < 1ms)');
      return res.json(cached.data);
    }

    if (!GEMINI_API_KEY) {
      const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea);
      return res.json(fallback);
    }

    const workStatus = (userProfile?.employmentStatus || userProfile?.workStatus || 'غير محدد').trim();
    const ageGroup = (userProfile?.ageGroup || 'غير محدد').trim();
    const rawDependents = userProfile?.hasDependents;
    const dependentsText = rawDependents === 'نعم' || rawDependents === true ? 'نعم' : rawDependents === 'لا' || rawDependents === false ? 'لا' : (typeof rawDependents === 'string' ? rawDependents.trim() : '');
    const incomeSource = (userProfile?.incomeSource || '').trim();
    const incomeStability = (userProfile?.incomeStability || '').trim();

    const directorUserContext = `
[سياق المستفيد وخلفيته الحياتية الأساسية 🎯]:
- الاسم: ${userProfile?.name || 'المستخدم'}
- حالة العمل: ${workStatus}
- الفئة العمرية: ${ageGroup}
${dependentsText ? `- المعالون: ${dependentsText}` : ''}
${incomeSource ? `- مصدر الدخل الأساسي: ${incomeSource}` : ''}
${incomeStability ? `- طبيعة واستقرار الدخل: ${incomeStability}` : ''}

⛔ قاعدة صارمة وملزمة في تخصيص التقرير والخطط والعادات:
لا تطرح أي سؤال أو نصيحة أو توصية لا تناسب حالته (مثلاً لا تسأل طالباً عن الراتب والأقساط، ولا تقدم نصائح استثمار معقدة لمن دخله مصروف، ولا تبنِ خططاً مهنية لمتقاعد أو باحث عن عمل كأنهم موظفون). وإن ذكر المستخدم ما يتعارض مع ملفه فاتبع كلامه في التحليل.
`;

    const localizedScores = Object.fromEntries(
      Object.entries(scores || {}).map(([k, v]) => [getDomainArabicName(k), v])
    );
    const localizedAdvisorSummaries = Object.fromEntries(
      Object.entries(advisorSummaries || {}).map(([k, v]) => [getDomainArabicName(k), v])
    );
    const evaluatedScoreEntries = Object.entries(scores || {})
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a[1] - b[1]);
    const promptBottleneck = evaluatedScoreEntries[0];
    const promptStrongest = evaluatedScoreEntries[evaluatedScoreEntries.length - 1];

    const systemInstruction = `
${directorUserContext}

أنت "المنسق التكاملي العام (م. معتز)" في منصة "وزان".
مهمتك النظر في حياة المستفيد كمنظومة واحدة متكاملة وليست جزراً منعزلة.
أنت خبير في:
- تحليل التناغم والتأثير المتبادل بين مجالات الحياة الثمانية (الجانب الروحي والسكينة، الجانب المالي والاستقلال، الجانب المهني والوظيفي، الجانب الشخصي والوعي بالذات، الجانب التعليمي والمعرفي، الجانب الأسري والعائلي، الجانب الاجتماعي والعلاقات، الجانب الصحي والبدني).
- كشف الحلقات المفرغة التي يسحب فيها جانب ضعيف الجوانب الأخرى.
- تحديد "العادات المحورية" التي يؤدي تحسينها إلى انتعاش تلقائي في 3 مجالات أو أكثر دفعة واحدة.
- تصميم خطة عمل متكاملة لمدة 30 يوماً مقسمة أسبوعياً بنبرة قيادية حكيمة وواقعية ومحفزة للغاية.

⛔ قاعدة لغة ودقة الدرجات الإلزامية:
- اكتب جميع النصوص وعناوين المجالات باللغة العربية الخالصة الفصيحة، ويُمنع تماماً إدراج أي مفاتيح أو كلمات إنجليزية مثل (career, health, financial, Keystone Habits, Deep Study, Bottleneck) في المخرجات.
- التزم حرفياً بالدرجات الفعلية في عجلة الحياة: ${promptStrongest ? `أعلى جانب مقيّم حالياً هو "${getDomainArabicName(promptStrongest[0])}" بدرجة (${promptStrongest[1]}/10)، ` : ''}${promptBottleneck ? `وأدنى جانب (عنق الزجاجة) هو "${getDomainArabicName(promptBottleneck[0])}" بدرجة (${promptBottleneck[1]}/10).` : ''}
- إذا كانت أعلى درجة أقل من 7.8 (مثل 6.5/10)، صفه بواقعية ("استقرار نسبي" أو "الأعلى نسبياً") ولا تصفه أبداً بأنه "استثنائي" أو "استثناءً مطلقاً" أو "قوة خارقة".
- راعِ سلامة الإملاء واتصال حرف اللام بالاسم المعرّف (مثل «للجانب» لا «لـ الجانب»، و«الأسري» لا «الأسرى»، و«المربع 2» لا «(المربع (2)») وتجنب الأقواس الزائدة أو غير المتوازنة.
`;

    const prompt = `
${directorUserContext}

بيانات المستفيد الشاملة:
- الاسم: ${userProfile?.name || 'المستخدم'}
- حالة العمل: ${workStatus}
- العمر / المرحلة: ${ageGroup}
${incomeSource ? `- مصدر الدخل: ${incomeSource}` : ''}
${incomeStability ? `- طبيعة الدخل: ${incomeStability}` : ''}
- الأولوية الحالية: ${focusArea || 'تحقيق التوازن الشامل'}

درجات مجالات الحياة الثمانية (من 10):
${JSON.stringify(localizedScores, null, 2)}

ملخص إجابات وأهداف المجالات:
${JSON.stringify(localizedAdvisorSummaries, null, 2)}

يرجى إعداد التقرير التكاملي الشامل بصيغة JSON وفق المخطط المطلوب وباللغة العربية الكاملة دون أي كلمات أو مفاتيح إنجليزية.
`;

    // Strict 3800ms race timeout to guarantee sub-4s response time
    const startGemini = Date.now();
    const candidateModel = GEMINI_MODEL && !GEMINI_MODEL.includes('2.5') ? GEMINI_MODEL : 'gemini-3.5-flash-lite';

    const apiCall = ai.models.generateContent({
      model: candidateModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallDiagnosis: { type: Type.STRING },
            balanceIndexLabel: { type: Type.STRING },
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
            },
            directorGoldenRule: { type: Type.STRING },
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('مهلة الاستجابة (3.8 ثوانٍ) تجاوزت الحد المسموح في التقرير التكاملي')), 3800)
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    const durationMs = Date.now() - startGemini;
    console.log(`[Director Summary] استجاب Gemini بنجاح في ${durationMs}ms`);

    const rawParsed = JSON.parse(response.text || '{}');
    const parsed = reconcileDirectorReportWithScores(rawParsed, scores);
    if (!parsed.reply && (parsed.overallDiagnosis || parsed.directorGoldenRule)) {
      parsed.reply = [parsed.overallDiagnosis, parsed.directorGoldenRule].filter(Boolean).join('\n\n');
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.directorGoldenRule) parsed.actionSteps = [parsed.directorGoldenRule];
      else parsed.actionSteps = [];
    }
    parsed.source = 'gemini';

    // Save to Cache
    directorSummaryCache.set(cacheKey, { data: parsed, timestamp: Date.now() });

    return res.json(parsed);
  } catch (error: any) {
    console.warn('[Director Summary] تعذر إتمام التقرير عبر Gemini في الوقت المحدد، تفعيل المحرك التكاملي الاحتياطي:', error?.message || error);
    const { userProfile, scores, advisorSummaries, focusArea } = req.body;
    const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea);
    return res.json(fallback);
  }
});
