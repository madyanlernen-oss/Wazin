import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';
import {
  getDomainArabicName,
  reconcileDirectorReportWithScores,
} from '../../src/utils/arabicDomainLabels';
import {
  buildDirectorGroundingPromptText,
  generateEvidenceGroundedDirectorReport,
  reconcileSectionQuadrantsAndHabits,
} from '../../src/utils/directorEvidenceSynthesizer';

export const directorSummaryRouter = Router();

// In-memory short-lived cache (TTL 60s) for instant response on re-navigation
const directorSummaryCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Generates an evidence-grounded Director Summary report from actual station conversations,
 * answers, goals, and scores whenever the live LLM is unavailable or omitted.
 */
export function generateFallbackDirectorReport(
  userProfile: any,
  scores: any,
  advisorSummaries: any,
  focusArea?: string,
  extraContext?: {
    answers?: Record<string, any> | null;
    goals?: Record<string, string[]> | null;
    conversationHistories?: Record<string, any[]> | null;
    stationInsights?: Record<string, any> | null;
  }
) {
  const report = generateEvidenceGroundedDirectorReport({
    userProfile,
    scores,
    answers: extraContext?.answers || null,
    goals: extraContext?.goals || null,
    conversationHistories: extraContext?.conversationHistories || null,
    stationInsights: extraContext?.stationInsights || null,
    advisorSummaries,
    focusArea,
  });

  return reconcileDirectorReportWithScores(
    {
      ...report,
      source: 'fallback',
    },
    scores
  );
}

// Endpoint: Director Summary (Cross-Domain Insights & Master Action Plan)
directorSummaryRouter.post('/director-summary', async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'بيانات الطلب غير صالحة، يجب أن تكون كائناً بصيغة JSON.' });
    }
    const {
      userProfile,
      scores,
      answers,
      goals,
      advisorSummaries,
      conversationHistories,
      stationInsights,
      focusArea,
    } = req.body;

    // Fast Cache Check (TTL 60s) scoped to full grounding payload
    const cacheKey = JSON.stringify({
      name: userProfile?.name,
      status: userProfile?.employmentStatus || userProfile?.workStatus,
      scores,
      focusArea,
      advisorSummaries,
      stationInsights,
      convLen: conversationHistories
        ? Object.entries(conversationHistories).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        : [],
    });
    const cached = directorSummaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('[Director Summary] استجابة فورية من الذاكرة المؤقتة (Cache Hit < 1ms)');
      return res.json(cached.data);
    }

    const groundingInput = {
      userProfile,
      scores,
      answers,
      goals,
      advisorSummaries,
      conversationHistories,
      stationInsights,
      focusArea,
    };

    if (!GEMINI_API_KEY) {
      const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea, {
        answers,
        goals,
        conversationHistories,
        stationInsights,
      });
      return res.json(fallback);
    }

    const workStatus = (userProfile?.employmentStatus || userProfile?.workStatus || 'غير محدد').trim();
    const ageGroup = (userProfile?.ageGroup || 'غير محدد').trim();
    const rawDependents = userProfile?.hasDependents;
    const dependentsText =
      rawDependents === 'نعم' || rawDependents === true
        ? 'نعم'
        : rawDependents === 'لا' || rawDependents === false
          ? 'لا'
          : typeof rawDependents === 'string'
            ? rawDependents.trim()
            : '';
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
`;

    const evaluatedScoreEntries = Object.entries(scores || {})
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a[1] - b[1]);
    const promptBottleneck = evaluatedScoreEntries[0];
    const promptStrongest = evaluatedScoreEntries[evaluatedScoreEntries.length - 1];
    const promptAvg =
      evaluatedScoreEntries.length > 0
        ? (
            evaluatedScoreEntries.reduce((acc, [, v]) => acc + v, 0) /
            evaluatedScoreEntries.length
          ).toFixed(1)
        : '5.0';

    const groundedEvidenceText = buildDirectorGroundingPromptText(groundingInput);

    const systemInstruction = `
${directorUserContext}

أنت "المنسق العام للتوازن الذكي (م. معتز)" — المخطط الاستراتيجي الأعلى لمنظومة الحياة في منصة "وزان".
مهمتك: تركيب وبناء مخطط تحوّل عملي شامل لـ 30 يوماً استناداً حصراً إلى سجل محادثات المستفيد الفعلي، وإجاباته المحددة، وتوصياته الذهبية عبر الجوانب الثمانية جميعها (وليس الدرجات الرقمية وحدها).

⛔ القواعد الصارمة ضد القوالب الجاهزة (CRITICAL ANTI-GENERIC RULES):
1. ممنوع القوالب المعلبة: يُمنع منعاً باتاً استخدام نصائح عامة مكررة مثل ("ادرس 45 دقيقة"، "ارفع التركيز بنسبة 40%"، "خصص 15 دقيقة لهذا الجانب"، "نظم وقتك") ما لم تكن مشتقة حرفياً من كلمات المستفيد نفسه!
2. التخصيص المبني على الأدلة (Evidence-Based Personalization): يجب أن يشير كل تحليل جانب وكل عادة محورية وكل مهمة صراحةً إلى التفاصيل الحقيقية التي ذكرها المستفيد في المحطات الثماني (مثل تخصصه، عمله أو مشروعه، عملته أو هدفه الادخاري، مشتتاته الفعلية، ديناميكيات أسرته، أو عاداته الجسدية).
3. ممنوع الافتراضات غير المذكورة: لا تخترع أبداً تفاصيل أو أدوات أو عملات أو مهن لم يذكرها المستفيد صراحة. وإن كانت محطة ما بلا حوار نصي مفصل بعد، اذكر ذلك بوضوح ولا تختلق لها أحداثاً.
4. جودة الحوار والتنسيق الإلزامية في التقرير (Global Quality Rules):
   - الخطاب المباشر بضمير المخاطب (أنت): خاطب المستخدم مباشرة وبأسلوب دافئ متسق في جميع الأقسام ("ذكرتَ في هذه المحطة"، "تحديك الأساسي"، "نقطة قوتك")؛ ⛔ يُمنع منعاً باتاً التحول لضمير الغائب ("صرّح المستفيد"، "أوضح المستفيد"، "المستفيد").
   - فصل المشكلة عن الحل: حقل التحدي الجوهري في كل جانب وفي عنق الزجاجة يصف المشكلة أو العائق الفعلي فقط (لا تضع التوصية أو الحل داخل التحدي!). ونقاط القوة تستند لعادات وأقوال حقيقية بدون عبارات مكررة ("الوضوح والصراحة في تشخيص واقع...").
   - منع التكرار وتطابق الأوقات: يجب أن تكون العادات المحورية (3–4 عادات) في مجالات رئيسية مختلفة وبخطوات غير مكررة، وأن يناسب التوقيت المحدد طبيعة العادة منطقياً (مثلاً: عادات الادخار والميزانية توضع عند استلام الدخل أو المراجعة الأسبوعية، وليس قبل النوم!).
   - توحيد مربعات أيزنهاور بين القسم 2 والقسم 5: يُمنع تصنيف أي مهمة بناء مهارة أو تعلّم أو تكوين عادة على أنها Q3؛ استخدم Q2 (مهم وغير عاجل) أو Q1 (عاجل ومهم) عند الحالات الحرجة فقط، وطابق التصنيف بين القسمين بدقة.
   - سلامة اللغة العربية وتمام الكلمات: اكتب بلغة عربية فصيحة وسليمة صرفياً ("بكل هدوء" لا "بكل هادئ"، "للجانب" لا "لـ الجانب"، "الأسري" لا "الأسرى")، واكتب جملاً كاملة دون بتر الكلمات، وامنع تماماً إدراج مفاتيح إنجليزية مثل (career, health, financial, learning, spiritual, personal, family, social, Keystone Habits, Bottleneck).
   - مصدر الحقيقة الوحيد للدرجات: التزم حرفياً بالدرجات الفعلية: المعدل العام (${promptAvg}/10)${promptStrongest ? `، وأعلى جانب هو "${getDomainArabicName(promptStrongest[0])}" (${promptStrongest[1]}/10)` : ''}${promptBottleneck ? `، وأدنى جانب (عنق الزجاجة) هو "${getDomainArabicName(promptBottleneck[0])}" (${promptBottleneck[1]}/10)` : ''}. وإذا كانت أعلى درجة أقل من 7.8، صفه بواقعية ("استقرار نسبي") لا "استثنائي".

هيكل المخرجات المطلوب تغطيته بالكامل داخل كائن JSON:
1. التشخيص الاستراتيجي الشامل: overallBalanceScore، وbalanceIndexLabel (اسم المرحلة)، وoverallDiagnosis، وrootCauseChain (سرد دقيق يشرح سلسلة السبب والنتيجة التي تربط الجوانب الثمانية من واقع كلامه).
2. التحليل الدقيق للجوانب الثمانية (domainBreakdown — مصفوفة إلزامية من جميع الجوانب الـ 8 دون استثناء):
   - domainTitle (الاسم العربي للجانب)
   - score (الدرجة)
   - groundedReality (ملخص ما قاله المستفيد فعلاً في هذه المحطة: التحدي الفعلي + موطن القوة)
   - crossDomainImpact (كيف يغذي هذا الجانب أو يستنزف جانباً آخر من حياته)
   - actionableTask (مهمة ملموسة ومخصصة من واقع جلسته)
   - eisenhowerQuadrant (أحد القيم: "Q1: عاجل ومهم" أو "Q2: مهم وغير عاجل" أو "Q3: تقليص أو تفويض")
   - planWeek (رقم الأسبوع المقترح من 1 إلى 4)
   - planFrequency ("يومي" أو "أسبوعي")
3. أقوى نقطة ارتكاز وعنق الزجاجة الأبرز:
   - strongestSynergy (كيفية توظيف أعلى جانب والأشخاص/العادات التي ذكرها فيه لرفع الجوانب الأضعف)
   - criticalBottleneck (أدنى جانب وبروتوكول إنقاذ عملي ومخصص له بدون قوالب جاهزة)
4. العادات المحورية ذات الأثر المضاعف (keystoneHabits — من 3 إلى 4 عادات):
   - name، وtriggerTime (التوقيت المحدد بناءً على جدوله الفعلي)، وexactStep (الخطوة العملية الدقيقة باستخدام أهدافه وكلماته الفعلية)، وtargetDomains (الجوانب التي ترفعها دفعة واحدة)، وexpectedImpact.
5. قائمة المهام الجاهزة للترقية (readyToPromoteQueue — أهم 6 إلى 8 مهام مستخرجة من الجوانب الثمانية مرتبة ضمن "Q1" و"Q2" مع معلم أسبوعي واقعي) وخارطة الـ 30 يوماً (thirtyDayRoadmap لـ 4 أسابيع) والوصية الذهبية (directorGoldenRule).
`;

    const prompt = `
${directorUserContext}
- الأولوية الحالية: ${focusArea || 'تحقيق التوازن الشامل'}

[السجل الفعلي الكامل للمستفيد عبر المحطات الثمانية (الدرجات، المحادثات، نقاط القوة، التحديات، والتوصيات الذهبية)]:
${groundedEvidenceText}

يرجى إعداد التقرير الاستراتيجي الشامل والمخصص بصيغة JSON وفق المخطط المطلوب مع الالتزام التام بالقواعد المضادة للقوالب الجاهزة.
`;

    const startGemini = Date.now();
    const candidateModel =
      GEMINI_MODEL && !GEMINI_MODEL.includes('2.5') ? GEMINI_MODEL : 'gemini-3.5-flash-lite';

    const apiCall = ai.models.generateContent({
      model: candidateModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallBalanceScore: { type: Type.NUMBER },
            overallDiagnosis: { type: Type.STRING },
            balanceIndexLabel: { type: Type.STRING },
            rootCauseChain: { type: Type.STRING },
            domainBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  domainTitle: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  groundedReality: { type: Type.STRING },
                  crossDomainImpact: { type: Type.STRING },
                  actionableTask: { type: Type.STRING },
                  eisenhowerQuadrant: { type: Type.STRING },
                  planWeek: { type: Type.INTEGER },
                  planFrequency: { type: Type.STRING },
                },
                required: [
                  'domainTitle',
                  'score',
                  'groundedReality',
                  'crossDomainImpact',
                  'actionableTask',
                  'eisenhowerQuadrant',
                  'planWeek',
                  'planFrequency',
                ],
              },
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
                  exactStep: { type: Type.STRING },
                  targetDomains: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  expectedImpact: { type: Type.STRING },
                },
                required: ['name', 'triggerTime', 'exactStep', 'targetDomains', 'expectedImpact'],
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
            readyToPromoteQueue: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  domainTitle: { type: Type.STRING },
                  quadrant: { type: Type.STRING },
                  weekNumber: { type: Type.INTEGER },
                  frequency: { type: Type.STRING },
                  milestone: { type: Type.STRING },
                },
                required: [
                  'id',
                  'title',
                  'domainTitle',
                  'quadrant',
                  'weekNumber',
                  'frequency',
                  'milestone',
                ],
              },
            },
            directorGoldenRule: { type: Type.STRING },
          },
          required: [
            'overallBalanceScore',
            'overallDiagnosis',
            'balanceIndexLabel',
            'rootCauseChain',
            'domainBreakdown',
            'strongestSynergy',
            'criticalBottleneck',
            'keystoneHabits',
            'thirtyDayRoadmap',
            'readyToPromoteQueue',
            'directorGoldenRule',
          ],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('مهلة الاستجابة (11 ثانية) تجاوزت الحد المسموح في التقرير التكاملي')),
        11000
      )
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    const durationMs = Date.now() - startGemini;
    console.log(`[Director Summary] استجاب Gemini بنجاح في ${durationMs}ms`);

    const rawParsed = JSON.parse(response.text || '{}');
    const groundedDefaults = generateEvidenceGroundedDirectorReport(groundingInput);
    const mergedRaw = reconcileSectionQuadrantsAndHabits(
      {
        ...groundedDefaults,
        ...rawParsed,
        domainBreakdown:
          Array.isArray(rawParsed.domainBreakdown) && rawParsed.domainBreakdown.length >= 8
            ? rawParsed.domainBreakdown
            : groundedDefaults.domainBreakdown,
        readyToPromoteQueue:
          Array.isArray(rawParsed.readyToPromoteQueue) && rawParsed.readyToPromoteQueue.length >= 4
            ? rawParsed.readyToPromoteQueue
            : groundedDefaults.readyToPromoteQueue,
      },
      workStatus.includes('طالب')
    );

    const parsed = reconcileDirectorReportWithScores(mergedRaw, scores);
    if (!parsed.reply && (parsed.overallDiagnosis || parsed.directorGoldenRule)) {
      parsed.reply = [parsed.overallDiagnosis, parsed.rootCauseChain, parsed.directorGoldenRule]
        .filter(Boolean)
        .join('\n\n');
    }
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.directorGoldenRule) parsed.actionSteps = [parsed.directorGoldenRule];
      else parsed.actionSteps = [];
    }
    parsed.source = 'gemini';

    directorSummaryCache.set(cacheKey, { data: parsed, timestamp: Date.now() });

    return res.json(parsed);
  } catch (error: any) {
    console.warn(
      '[Director Summary] تعذر إتمام التقرير عبر Gemini في الوقت المحدد، تفعيل المحرك التكاملي المبني على الأدلة:',
      error?.message || error
    );
    const {
      userProfile,
      scores,
      answers,
      goals,
      advisorSummaries,
      conversationHistories,
      stationInsights,
      focusArea,
    } = req.body;
    const fallback = generateFallbackDirectorReport(userProfile, scores, advisorSummaries, focusArea, {
      answers,
      goals,
      conversationHistories,
      stationInsights,
    });
    return res.json(fallback);
  }
});
