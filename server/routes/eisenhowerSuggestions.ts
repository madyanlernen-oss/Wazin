import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';

export const eisenhowerSuggestionsRouter = Router();

// Endpoint: Agent 11 - Eisenhower Goal Suggestions (Synthesized from Agent 9 & Agent 10)
eisenhowerSuggestionsRouter.post('/eisenhower-suggestions', async (req: Request, res: Response) => {
  try {
    const { directorReport, scores, userProfile, currentGoals } = req.body;

    // Local fallback generator function
    const getLocalSuggestions = () => {
      const items: any[] = [];
      if (directorReport?.criticalBottleneck) {
        items.push({
          id: `sug_bot_${Date.now()}_1`,
          title: directorReport.criticalBottleneck.recommendation || `معالجة ${directorReport.criticalBottleneck.title} كأولوية قصوى`,
          quadrant: 'q2_important_not_urgent',
          quadrant_label: 'المربع 2 (جدول له - وقود التوازن)',
          domain: directorReport.criticalBottleneck.domain || 'الجانب الصحي',
          rationale: `رصد م. معتز التكاملي (وكيل 9) أن ${directorReport.criticalBottleneck.title} هو عنق الزجاجة الحياتي الأبرز؛ حله يرفع كفاءة بقية المنظومة.`,
          sourceAgent: 'agent_9_aggregator',
          sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
          sourceTypeLabel: 'علاج عنق الزجاجة الحياتي',
        });
      }

      if (directorReport?.keystoneHabits && directorReport.keystoneHabits.length > 0) {
        directorReport.keystoneHabits.slice(0, 2).forEach((h: any, i: number) => {
          items.push({
            id: `sug_key_${Date.now()}_${i + 2}`,
            title: h.name,
            quadrant: 'q2_important_not_urgent',
            quadrant_label: 'المربع 2 (جدول له - وقود التوازن)',
            domain: h.targetDomains?.[0] || 'الجانب الصحي',
            rationale: `عادة محورية تآزرية صاغها م. معتز تؤثر تزامناً في (${h.targetDomains?.join('، ') || 'عدة مجالات'}). موعدها: ${h.triggerTime}.`,
            sourceAgent: 'agent_9_aggregator',
            sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
            sourceTypeLabel: 'عادة محورية تآزرية',
          });
        });
      }

      items.push({
        id: `sug_drhani_${Date.now()}_4`,
        title: 'تثبيت موعد النوم في الحادية عشرة مساءً وقطع الشاشات قبلها بـ 45 دقيقة',
        quadrant: 'q2_important_not_urgent',
        quadrant_label: 'المربع 2 (جدول له - جوهر المنظومة)',
        domain: 'الجانب الصحي',
        rationale: 'توجيه قيادي من د. هاني الموجه (وكيل 10) لحماية طاقة الجسد ومنع استنزاف المربع الأول.',
        sourceAgent: 'agent_10_advisor',
        sourceAgentName: 'د. هاني الموجه (وكيل 10)',
        sourceTypeLabel: 'أولوية قيادية للمربع الثاني',
      });

      return {
        agent_name: 'وكيل اقتراح الخطط (مصفوفة أيزنهاور)',
        has_sufficient_context: Boolean(directorReport || scores),
        suggestions: items.slice(0, 5),
        reply: 'إليك أهم الأولويات والخطط الذكية المستخلصة بعناية من تحليلات م. معتز التكاملي ود. هاني الموجه. يمكنك طرحها مباشرة في مصفوفتك أو تخصيصها يدوياً.',
      };
    };

    if (!GEMINI_API_KEY) {
      return res.json(getLocalSuggestions());
    }

    const eisenhowerWorkStatus = (userProfile?.employmentStatus || userProfile?.workStatus || 'غير محدد').trim();
    const eisenhowerAgeGroup = (userProfile?.ageGroup || '').trim();
    const eisenhowerIncomeSource = (userProfile?.incomeSource || '').trim();
    const eisenhowerIncomeStability = (userProfile?.incomeStability || '').trim();

    const eisenhowerUserContext = `
[سياق المستفيد الأساسي وتخصيص المهام المقترحة 🎯]:
- الاسم: ${userProfile?.name || 'سعود'}
- حالة العمل: ${eisenhowerWorkStatus}
${eisenhowerAgeGroup ? `- الفئة العمرية: ${eisenhowerAgeGroup}` : ''}
${eisenhowerIncomeSource ? `- مصدر الدخل: ${eisenhowerIncomeSource}` : ''}
${eisenhowerIncomeStability ? `- طبيعة واستقرار الدخل: ${eisenhowerIncomeStability}` : ''}

⛔ قاعدة صارمة وملزمة في اقتراح المهام والخطط:
لا تقترح أي مهام أو خطط أو عادات تتعارض مع سياقه الحياتي وحالته (مثلاً لا تقترح مهام ترقية وظيفية أو دوام مكتبي لطالب أو متقاعد، ولا تقترح استثمارات مالية كبرى لطالب أو باحث عن عمل). وإن ذكر المستخدم ما يتعارض مع ملفه فاتبع كلامه.
`;

    const systemInstruction = `
${eisenhowerUserContext}

أنت "وكيل اقتراح الخطط في مصفوفة أيزنهاور (وكيل أهدافي 11)" في منصة "وزان" لتوازن الحياة.
تستند حصرياً إلى مخرجات وكيل 9 (م. معتز التكاملي - محلل النظم وعنق الزجاجة) ووكيل 10 (د. هاني الموجه - رئيس الداشبورد وحامي المربع الثاني) وبما يتوافق تماماً مع واقع وسياق المستفيد.
قواعدك الأساسية:
1. اقتراحات فقط (Suggestions Only): قدّم 3 إلى 5 اقتراحات مركزة وعملية للمربعات الأربعة تناسب واقع حالته.
2. التركيز الأكبر على "المربع الثاني" (مهم وغير عاجل) كوقود للتوازن المستدام.
3. الربط الصريح والواضح بسبب الاقتراح المشتق من تشخيص م. معتز (عنق الزجاجة، العادات المحورية) أو توجيه د. هاني.
4. إخراج كائن JSON فقط وفق المخطط المطلوب.
`;

    const prompt = `
${eisenhowerUserContext}

بيانات المستفيد ونتائج التحليل:
- الاسم: ${userProfile?.name || 'سعود'}
- حالة العمل: ${eisenhowerWorkStatus}
- تقرير المنسق العام (وكيل 9 م. معتز):
  * عنق الزجاجة: ${JSON.stringify(directorReport?.criticalBottleneck || 'غير محدد')}
  * العادات المحورية: ${JSON.stringify(directorReport?.keystoneHabits || [])}
  * خارطة 30 يوماً: ${JSON.stringify(directorReport?.thirtyDayRoadmap?.[0] || 'غير محدد')}
- الدرجات الحالية: ${JSON.stringify(scores || {})}
- الأهداف الحالية المسجلة مسبقاً (تجنب تكرارها): ${JSON.stringify(currentGoals?.map((g: any) => g.title) || [])}

اقترح من 3 إلى 5 مهام وخطط محددة وفق المخطط.
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
            agent_name: { type: Type.STRING },
            has_sufficient_context: { type: Type.BOOLEAN },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  quadrant: { type: Type.STRING, description: 'q1_urgent_important | q2_important_not_urgent | q3_urgent_not_important | q4_not_urgent_not_important' },
                  quadrant_label: { type: Type.STRING },
                  domain: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  sourceAgent: { type: Type.STRING },
                  sourceAgentName: { type: Type.STRING },
                  sourceTypeLabel: { type: Type.STRING },
                },
                required: ['title', 'quadrant', 'quadrant_label', 'domain', 'rationale', 'sourceAgentName'],
              },
            },
            reply: { type: Type.STRING },
          },
          required: ['agent_name', 'suggestions', 'reply'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.suggestions || parsed.suggestions.length === 0) {
      return res.json(getLocalSuggestions());
    }
    return res.json(parsed);
  } catch (err: any) {
    console.warn('Agent 11 suggestions API fallback to local:', err?.message || err);
    const { directorReport, scores } = req.body;
    // local fallback
    const items: any[] = [];
    if (directorReport?.criticalBottleneck) {
      items.push({
        id: `sug_bot_${Date.now()}_1`,
        title: directorReport.criticalBottleneck.recommendation || `معالجة ${directorReport.criticalBottleneck.title} كأولوية قصوى`,
        quadrant: 'q2_important_not_urgent',
        quadrant_label: 'المربع 2 (جدول له - وقود التوازن)',
        domain: directorReport.criticalBottleneck.domain || 'الجانب الصحي',
        rationale: `رصد م. معتز التكاملي (وكيل 9) أن ${directorReport.criticalBottleneck.title} هو عنق الزجاجة الحياتي؛ حله يرفع كفاءة بقية المنظومة.`,
        sourceAgent: 'agent_9_aggregator',
        sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
        sourceTypeLabel: 'علاج عنق الزجاجة الحياتي',
      });
    }
    return res.json({
      agent_name: 'وكيل اقتراح الخطط (مصفوفة أيزنهاور)',
      has_sufficient_context: Boolean(directorReport || scores),
      suggestions: items,
      reply: 'إليك أهم الأولويات والخطط الذكية المستخلصة بعناية من تحليلات م. معتز التكاملي ود. هاني الموجه.',
    });
  }
});
