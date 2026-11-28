import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GROQ_API_KEY, GROQ_MODEL, GEMINI_MODEL } from '../config/env';
import { AGENT_INFO_MAP } from '../config/constants';
import { loadAgentPrompt } from '../agents/agentLoader';
import { generateLocalAgentResponse } from '../agents/localAdvisorEngine';
import { parseUserContext, buildDomainContextDirectives, getDomainContextConfig } from '../../src/utils/contextPersonalization';
import { generateDynamicQuickSuggestions } from '../../src/utils/dynamicSuggestions';
import {
  extractAskedQuestionsFromHistory,
  isQuestionAlreadyAsked,
  isQuestionContradictingHistory,
  isDiagnosticTopicAlreadyAnswered,
  isRequestingAdvisorSuggestions,
  extractAnchorSelfRatingFromHistory,
  hasAcuteIsolationOrRejection,
  extractEmergencyFundStatus,
  hasDebtStatusAnswered,
  extractExpenseCategoryFromAnswer,
  pickNextUnaskedQuestion,
  stripRepeatedOpeningGreeting,
  isEmptyOrMeaninglessInput,
  MEANINGLESS_INPUT_PROMPT_AR,
  sanitizeArabicGrammarAndMorphology,
  truncateArabicAtWordBoundary,
  isConfirmationOrMetaUtterance,
  stripAllScoreRatingsFromText,
  syncReplyScoreWithCanonicalScore,
  extractGroundedStrengthsAndChallenges,
} from '../../src/utils/dialogueDeduplication';
import {
  generateRealisticAreaGoals,
  synthesizeGoldenRecommendation,
  generateConcreteDomainSuggestions,
} from '../../src/utils/realisticGoalsGenerator';
import {
  calculateSemanticScore,
  extractExplicitRating,
  processAndReconcileScore,
  sanitizeStrengths,
  sanitizeAdvisorReply,
} from '../middleware/validation';
import {
  calculateUnifiedScore,
  evaluateMetricsPayloadWithRetry,
  extractUnifiedMetricsFromSession,
  formatUnifiedScoreConfirmationMessage,
  UnifiedScoringMetrics,
} from '../agents/unifiedScorer';

export const advisorChatRouter = Router();

// In-memory short-lived cache (TTL 30s) for rapid sub-second repeated queries
const advisorChatCache = new Map<string, { data: any; timestamp: number }>();

function extractCleanJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    const braceStart = text.indexOf('{');
    const braceEnd = text.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    }
    throw new Error('تعذر استخراج كائن JSON صالح من استجابة النموذج');
  }
}

const EIGHT_EVALUATION_DOMAINS = new Set([
  'spiritual',
  'financial',
  'health',
  'career',
  'personal',
  'learning',
  'family',
  'social',
]);

function stripAccidentalScoreMentions(text: string): string {
  return stripAllScoreRatingsFromText(text);
}

async function evaluateSessionMetricsWithTool(params: {
  agentKey: string;
  stationTitle: string;
  sessionUserMessages: string[];
  abortSignal: AbortSignal;
}): Promise<{
  score: number | null;
  metrics: UnifiedScoringMetrics | null;
  needsClarification?: boolean;
  fallbackMessage?: string;
  source: 'gemini-eval' | 'groq-eval' | 'local-eval';
}> {
  const { agentKey, stationTitle, sessionUserMessages, abortSignal } = params;
  const meaningfulMessages = sessionUserMessages.filter((m) => !isEmptyOrMeaninglessInput(m));
  if (meaningfulMessages.length === 0) {
    return {
      score: null,
      metrics: null,
      needsClarification: true,
      fallbackMessage: MEANINGLESS_INPUT_PROMPT_AR,
      source: 'local-eval',
    };
  }
  const fallbackMetrics = extractUnifiedMetricsFromSession(meaningfulMessages, agentKey);

  if (abortSignal.aborted) {
    return {
      score: calculateUnifiedScore(fallbackMetrics),
      metrics: fallbackMetrics,
      source: 'local-eval',
    };
  }

  const isAcuteIso = hasAcuteIsolationOrRejection(sessionUserMessages);
  const calibrate = (validMetrics: UnifiedScoringMetrics): UnifiedScoringMetrics =>
    isAcuteIso
      ? {
          consistency: Math.min(3.5, validMetrics.consistency),
          energyImpact: Math.min(3.0, validMetrics.energyImpact),
          controlBoundaries: Math.min(3.5, validMetrics.controlBoundaries),
        }
      : validMetrics;

  const evalPrompt = `أنت أداة التقييم الموحدة الموضوعية في منصة وزان.
مهمتك استخراج 3 مؤشرات رقمية دقيقة فقط (من 0 إلى 10) بصيغة JSON صارمة، استناداً حصرياً إلى رسائل المستخدم في الجلسة الحالية ضمن محطة "${stationTitle}" (دون وراثة أي درجة سابقة ودون تخمين).

المؤشرات الثلاثة المطلوبة:
1. "consistency" (0-10): الانتظام الفعلي والعادات المطبقة حالياً (النوايا المستقبلية لا ترفع المؤشر).
2. "energyImpact" (0-10): أثر هذا الجانب على الطاقة والسكينة مقابل الإرهاق والاستنزاف.
3. "controlBoundaries" (0-10): السيطرة والفاعلية الشخصية ووضوح الحدود الصحية.

معايير المعايرة الموضوعية:
- العزلة الحادة، رفض الآخرين، سوء المعاملة، أو الانهيار الحاد: (2.0 إلى 3.5).
- التذبذب، الإرهاق، ضغط العمل والأسرة، أو قلة الانتظام: (4.0 إلى 5.5).
- أساس إيجابي واضح مع تحدٍّ فرعي بسيط (كتشتت الهاتف): (6.5 إلى 7.5).
- استقرار وانتظام واضحان، صفاء ذهني، أو احتياطي وأمان جيدان: (7.5 إلى 9.0).

رسائل المستفيد في هذه الجلسة فقط:
${sessionUserMessages.map((m, idx) => `${idx + 1}. "${m}"`).join('\n')}`;

  if (GEMINI_API_KEY && !abortSignal.aborted) {
    const model = GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const geminiRetryResult = await evaluateMetricsPayloadWithRetry(async (attempt) => {
      if (abortSignal.aborted) return null;
      let timeoutHandle: any;
      const attemptPrompt =
        attempt === 0
          ? evalPrompt
          : `${evalPrompt}\n\nتنبيه: أخرج كائن JSON صالحاً فقط يحتوي الحقول consistency و energyImpact و controlBoundaries بأرقام بين 0 و 10 بدون أي نص إضافي.`;
      const apiPromise = ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: attemptPrompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              consistency: { type: Type.NUMBER },
              energyImpact: { type: Type.NUMBER },
              controlBoundaries: { type: Type.NUMBER },
            },
            required: ['consistency', 'energyImpact', 'controlBoundaries'],
          },
        },
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Evaluation tool Gemini timeout')), 4500);
      });
      try {
        const res = await Promise.race([apiPromise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        return res?.text || '';
      } catch (err: any) {
        clearTimeout(timeoutHandle);
        console.warn('[Unified Scorer] تعذر استخراج المؤشرات عبر Gemini:', err?.message || err);
        throw err;
      }
    }, calibrate);

    if (geminiRetryResult.status === 'ok') {
      return {
        score: geminiRetryResult.score,
        metrics: geminiRetryResult.metrics,
        source: 'gemini-eval',
      };
    }
    if (geminiRetryResult.status === 'invalid_json') {
      return {
        score: null,
        metrics: null,
        needsClarification: true,
        fallbackMessage: geminiRetryResult.fallbackMessage,
        source: 'gemini-eval',
      };
    }
  }

  if (GROQ_API_KEY && !abortSignal.aborted) {
    const groqModel = GROQ_MODEL || 'llama-3.3-70b-versatile';
    const groqRetryResult = await evaluateMetricsPayloadWithRetry(async (attempt) => {
      if (abortSignal.aborted) return null;
      let groqTimeout: any;
      const attemptPrompt =
        attempt === 0
          ? evalPrompt
          : `${evalPrompt}\n\nReturn strictly valid JSON with numeric fields consistency, energyImpact, and controlBoundaries (0-10).`;
      const groqCall = fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: abortSignal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: 'system',
              content: 'Output valid JSON ONLY with keys consistency, energyImpact, controlBoundaries (numbers 0-10).',
            },
            { role: 'user', content: attemptPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });
      const groqTimeoutPromise = new Promise<never>((_, reject) => {
        groqTimeout = setTimeout(() => reject(new Error('Evaluation tool Groq timeout')), 3500);
      });
      try {
        const groqRes = await Promise.race([groqCall, groqTimeoutPromise]);
        clearTimeout(groqTimeout);
        if (!groqRes.ok) {
          throw new Error(`Groq eval HTTP ${groqRes.status}`);
        }
        const groqData = await groqRes.json();
        return groqData?.choices?.[0]?.message?.content || '';
      } catch (err: any) {
        clearTimeout(groqTimeout);
        console.warn('[Unified Scorer] تعذر استخراج المؤشرات عبر Groq:', err?.message || err);
        throw err;
      }
    }, calibrate);

    if (groqRetryResult.status === 'ok') {
      return {
        score: groqRetryResult.score,
        metrics: groqRetryResult.metrics,
        source: 'groq-eval',
      };
    }
    if (groqRetryResult.status === 'invalid_json') {
      return {
        score: null,
        metrics: null,
        needsClarification: true,
        fallbackMessage: groqRetryResult.fallbackMessage,
        source: 'groq-eval',
      };
    }
  }

  return {
    score: calculateUnifiedScore(fallbackMetrics),
    metrics: fallbackMetrics,
    source: 'local-eval',
  };
}

// Endpoint: Advisor Chat
advisorChatRouter.post('/advisor-chat', async (req: Request, res: Response) => {
  // 1) إلغاء استدعاءات الذكاء الاصطناعي فور إغلاق العميل للاتصال لتوفير الحصة
  const clientAbortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      console.log('[Advisor Chat] أغلق العميل الاتصال، إلغاء استدعاءات Gemini/Groq الجارية لتوفير الحصة...');
      clientAbortController.abort();
    }
  });

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'بيانات الطلب غير صالحة، يجب أن تكون كائناً بصيغة JSON.' });
  }

  const {
    advisor,
    agentKey: rawAgentKey,
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
    evaluationQuestionTitle,
    assessmentMode = 'weekly_checkin',
    stationTurnCount = 0,
    isEditedOrResent = false,
  } = req.body;

  // 1) التحقق من صحة حقل message (نص لا يتجاوز 2000 حرف، وتمرير الفارغ أو غير المفهوم لطبقة حماية المدخلات)
  if (typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({
      error: 'حقل الرسالة (message) مطلوب ويجب أن يكون نصاً لا يتجاوز 2000 حرف.',
    });
  }

  // 2) التحقق من صحة حقل history (مصفوفة أقصاها 40 عنصراً لتمرير سجل المحطة الكامل)
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history) || history.length > 40) {
      return res.status(400).json({
        error: 'سجل المحادثة (history) يجب أن يكون مصفوفة لا تتجاوز 40 عنصراً.',
      });
    }
    for (const item of history) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          error: 'عناصر سجل المحادثة (history) يجب أن تكون كائنات صالحة.',
        });
      }
    }
  }

  // 3) التحقق من أنواع بقية الحقول ورفض أي نوع غير متوقع برد 400
  if (advisor !== undefined && advisor !== null && typeof advisor !== 'string' && (typeof advisor !== 'object' || Array.isArray(advisor))) {
    return res.status(400).json({ error: 'نوع حقل advisor غير صالح، يجب أن يكون نصاً أو كائناً.' });
  }
  if (rawAgentKey !== undefined && rawAgentKey !== null && typeof rawAgentKey !== 'string') {
    return res.status(400).json({ error: 'نوع حقل agentKey غير صالح، يجب أن يكون نصاً.' });
  }
  if (userProfile !== undefined && userProfile !== null && (typeof userProfile !== 'object' || Array.isArray(userProfile))) {
    return res.status(400).json({ error: 'نوع حقل userProfile غير صالح، يجب أن يكون كائناً.' });
  }
  if (userName !== undefined && userName !== null && typeof userName !== 'string') {
    return res.status(400).json({ error: 'نوع حقل userName غير صالح، يجب أن يكون نصاً.' });
  }
  if (answers !== undefined && answers !== null && (typeof answers !== 'object' || Array.isArray(answers))) {
    return res.status(400).json({ error: 'نوع حقل answers غير صالح، يجب أن يكون كائناً.' });
  }
  if (userAnswers !== undefined && userAnswers !== null && (typeof userAnswers !== 'object' || Array.isArray(userAnswers))) {
    return res.status(400).json({ error: 'نوع حقل userAnswers غير صالح، يجب أن يكون كائناً.' });
  }
  if (goals !== undefined && goals !== null && typeof goals !== 'object') {
    return res.status(400).json({ error: 'نوع حقل goals غير صالح، يجب أن يكون مصفوفة أو كائناً.' });
  }
  if (userGoals !== undefined && userGoals !== null && typeof userGoals !== 'object') {
    return res.status(400).json({ error: 'نوع حقل userGoals غير صالح، يجب أن يكون مصفوفة أو كائناً.' });
  }
  if (userScore !== undefined && userScore !== null && typeof userScore !== 'number') {
    return res.status(400).json({ error: 'نوع حقل userScore غير صالح، يجب أن يكون رقماً.' });
  }
  if (aiMode !== undefined && aiMode !== null && typeof aiMode !== 'string' && typeof aiMode !== 'boolean') {
    return res.status(400).json({ error: 'نوع حقل aiMode غير صالح.' });
  }
  if (isEvaluationSession !== undefined && isEvaluationSession !== null && typeof isEvaluationSession !== 'boolean') {
    return res.status(400).json({ error: 'نوع حقل isEvaluationSession غير صالح، يجب أن يكون قيمة منطقية.' });
  }
  if (evaluationStep !== undefined && evaluationStep !== null && typeof evaluationStep !== 'number') {
    return res.status(400).json({ error: 'نوع حقل evaluationStep غير صالح، يجب أن يكون رقماً.' });
  }
  if (evaluationQuestionTitle !== undefined && evaluationQuestionTitle !== null && typeof evaluationQuestionTitle !== 'string') {
    return res.status(400).json({ error: 'نوع حقل evaluationQuestionTitle غير صالح، يجب أن يكون نصاً.' });
  }
  if (assessmentMode !== undefined && assessmentMode !== null && typeof assessmentMode !== 'string') {
    return res.status(400).json({ error: 'نوع حقل assessmentMode غير صالح، يجب أن يكون نصاً.' });
  }
  if (stationTurnCount !== undefined && stationTurnCount !== null && typeof stationTurnCount !== 'number') {
    return res.status(400).json({ error: 'نوع حقل stationTurnCount غير صالح، يجب أن يكون رقماً.' });
  }
  if (isEditedOrResent !== undefined && isEditedOrResent !== null && typeof isEditedOrResent !== 'boolean') {
    return res.status(400).json({ error: 'نوع حقل isEditedOrResent غير صالح، يجب أن يكون قيمة منطقية.' });
  }
  if (req.body.workStatus !== undefined && req.body.workStatus !== null && typeof req.body.workStatus !== 'string') {
    return res.status(400).json({ error: 'نوع حقل workStatus غير صالح، يجب أن يكون نصاً.' });
  }
  if (req.body.employmentStatus !== undefined && req.body.employmentStatus !== null && typeof req.body.employmentStatus !== 'string') {
    return res.status(400).json({ error: 'نوع حقل employmentStatus غير صالح، يجب أن يكون نصاً.' });
  }
  if (req.body.ageGroup !== undefined && req.body.ageGroup !== null && typeof req.body.ageGroup !== 'string') {
    return res.status(400).json({ error: 'نوع حقل ageGroup غير صالح، يجب أن يكون نصاً.' });
  }
  if (req.body.hasDependents !== undefined && req.body.hasDependents !== null && typeof req.body.hasDependents !== 'string' && typeof req.body.hasDependents !== 'boolean') {
    return res.status(400).json({ error: 'نوع حقل hasDependents غير صالح.' });
  }
  if (req.body.incomeSource !== undefined && req.body.incomeSource !== null && typeof req.body.incomeSource !== 'string') {
    return res.status(400).json({ error: 'نوع حقل incomeSource غير صالح، يجب أن يكون نصاً.' });
  }
  if (req.body.incomeStability !== undefined && req.body.incomeStability !== null && typeof req.body.incomeStability !== 'string') {
    return res.status(400).json({ error: 'نوع حقل incomeStability غير صالح، يجب أن يكون نصاً.' });
  }
  if (req.body.currentFocus !== undefined && req.body.currentFocus !== null && typeof req.body.currentFocus !== 'string') {
    return res.status(400).json({ error: 'نوع حقل currentFocus غير صالح، يجب أن يكون نصاً.' });
  }

  const effectiveUserProfile = {
    name: userName || 'عزيزي',
    ...(userProfile || {}),
    ...(req.body.ageGroup ? { ageGroup: req.body.ageGroup } : {}),
    ...(req.body.hasDependents !== undefined ? { hasDependents: req.body.hasDependents } : {}),
    ...(req.body.incomeSource ? { incomeSource: req.body.incomeSource } : {}),
    ...(req.body.incomeStability ? { incomeStability: req.body.incomeStability } : {}),
    ...(req.body.currentFocus ? { currentFocus: req.body.currentFocus } : {}),
    ...(req.body.workStatus && !userProfile?.employmentStatus ? { workStatus: req.body.workStatus } : {}),
    ...(req.body.employmentStatus ? { employmentStatus: req.body.employmentStatus } : {}),
  };

  // استخراج سياق المستفيد وخلفيته الحياتية (حالة العمل، الفئة العمرية، المعالون، الدخل، والاهتمام الحالي)
  let workStatus = (
    effectiveUserProfile?.employmentStatus ||
    effectiveUserProfile?.workStatus ||
    req.body?.workStatus ||
    req.body?.employmentStatus ||
    ''
  ).trim();

  const isDemoUser =
    req.body?.isDemo === true ||
    effectiveUserProfile?.email === 'demo@wazan.com' ||
    effectiveUserProfile?.name === 'سعود المنصور' ||
    req.body?.userName === 'سعود المنصور' ||
    userName === 'سعود المنصور';

  // الفالديشن: ارفض الطلب الذي لا يحتوي على employmentStatus بخطأ 400 واضح بالعربية، إلا في الدخول التجريبي فيُعامل كـ "غير محدد"
  if (!workStatus) {
    if (isDemoUser) {
      workStatus = 'غير محدد';
    } else {
      return res.status(400).json({
        error: 'حقل حالة العمل (employmentStatus) إلزامي في سياق المستفيد لتخصيص الاستشارة.',
      });
    }
  }

  // حماية المدخلات الفارغة أو غير المفهومة (مثل "..." أو حروف عشوائية) قبل احتساب الجولة أو استدعاء النموذج
  if (isEmptyOrMeaninglessInput(message)) {
    const earlyAgentKey =
      rawAgentKey || (typeof advisor === 'string' ? advisor : (advisor?.id || 'financial'));
    const earlyMeta = AGENT_INFO_MAP[earlyAgentKey] || {
      name: 'مستشار وزان',
      role: 'مستشار الحياة',
    };
    const earlyAdvisorName =
      advisor && typeof advisor === 'object' && advisor.name ? advisor.name : earlyMeta.name;
    const prevChips = Array.isArray(req.body.previousSuggestions)
      ? req.body.previousSuggestions
      : [];
    return res.json({
      agent_name: earlyAdvisorName,
      reasoning:
        'تم تفعيل حماية جودة المدخلات: الرسالة فارغة أو غير واضحة، لذا لم تُحتسب كجولة جديدة ولم يُصدر أي تقييم.',
      score: null,
      summary: 'طلب توضيح لطيف من المستفيد دون تقدم في عداد الجولات.',
      advice: 'شاركنا جملة قصيرة وواضحة تصف واقعك الحالي في هذا الجانب.',
      reply: MEANINGLESS_INPUT_PROMPT_AR,
      actionSteps: [],
      reflectionQuestion: 'ما الذي تود مشاركته بوضوح حول واقعك في هذا الجانب؟',
      station_completed: false,
      strengths: [],
      challenges: [],
      suggestedReplies: generateDynamicQuickSuggestions({
        domainId: earlyAgentKey,
        roundNumber: Math.max(1, (typeof stationTurnCount === 'number' ? stationTurnCount : 0) + 1),
        lastUserMessage: '',
        advisorReply: MEANINGLESS_INPUT_PROMPT_AR,
        userProfile: effectiveUserProfile,
        previousChips: prevChips,
        userHistory: [],
      }),
      skipTurnIncrement: true,
      turnIncremented: false,
      needsClarification: true,
      source: 'input-guardrail',
    });
  }

  const parsedCtx = parseUserContext({ ...effectiveUserProfile, employmentStatus: workStatus }, userName);

  let systemInstruction = '';
  let advisorName = 'مستشار وزان';

  const effectiveAnswers = answers || userAnswers || {};
  const effectiveGoals = goals || userGoals || [];
  const historyMsgTexts = Array.isArray(history) ? history.map((h: any) => h.content || '') : [];
  const historyUserOnlyTexts = Array.isArray(history)
    ? history
      .filter((h: any) => h && (h.role === 'user' || h.sender === 'user'))
      .map((h: any) => String(h.content || h.text || '').trim())
      .filter(Boolean)
    : [];
  const isAcuteIsolationContext = hasAcuteIsolationOrRejection([...historyUserOnlyTexts, message]);
  const isEvaluationMode = Boolean(isEvaluationSession);
  const isFreeConsultation = isEvaluationSession === false;
  const isEarlyContinueIntent =
    /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(message) &&
    !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(message);
  const isEarlyAdoptionIntent =
    !isEarlyContinueIntent &&
    /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(message);

  const parsedExplicitRating = extractExplicitRating(message);
  const anchorRatingFromHistory = extractAnchorSelfRatingFromHistory(Array.isArray(history) ? history : []);
  const explicitRatingInMsg = parsedExplicitRating !== null
    ? parsedExplicitRating
    : (isAcuteIsolationContext || isEvaluationMode
      ? undefined
      : (anchorRatingFromHistory !== null
        ? undefined
        : (userScore && userScore > 0 ? userScore : undefined)));

  // رابعاً: عند بدء أو إجراء استشارة تقييمية، يُحتسب التقييم من الصفر من رسائل الجلسة الحالية فقط دون وراثة درجة سابقة (مثل 4.5/10)
  let userSelfScore: number | undefined =
    parsedExplicitRating !== null
      ? parsedExplicitRating
      : (isAcuteIsolationContext ? undefined : (anchorRatingFromHistory ?? undefined));
  if (
    userSelfScore === undefined &&
    !isAcuteIsolationContext &&
    (!isEvaluationMode || (isEarlyAdoptionIntent && historyUserOnlyTexts.length === 0)) &&
    typeof userScore === 'number' &&
    userScore > 0
  ) {
    userSelfScore = userScore;
  }
  if (
    userSelfScore === undefined &&
    !isAcuteIsolationContext &&
    !isEvaluationMode &&
    effectiveAnswers &&
    typeof effectiveAnswers === 'object'
  ) {
    const areaAnswer = effectiveAnswers[req.body.agentKey || (typeof advisor === 'string' ? advisor : (advisor?.id || 'financial'))];
    if (typeof areaAnswer === 'number') userSelfScore = areaAnswer;
    else if (areaAnswer && typeof areaAnswer === 'object') {
      const numVal = areaAnswer.score || areaAnswer.rating;
      if (typeof numVal === 'number' && numVal > 0) userSelfScore = numVal;
    }
  }

  const semanticCalculated = calculateSemanticScore(message, historyUserOnlyTexts, explicitRatingInMsg);
  const effectiveScore = semanticCalculated;

  // استخدام اسم الوكيل أو افتراضياً الخبير المالي
  const agentKey = req.body.agentKey || (typeof advisor === 'string' ? advisor : (advisor?.id || 'financial'));
  const defaultMeta = AGENT_INFO_MAP[agentKey] || { name: 'مستشار وزان', role: 'مستشار الحياة' };

  // Fast In-Memory Cache (TTL 30s) for rapid sub-second repeated queries (scoped strictly to full user context & round chips)
  const prevChipsKey = Array.isArray(req.body.previousSuggestions)
    ? req.body.previousSuggestions.slice(-6).join('|')
    : '';
  const chatCacheKey = JSON.stringify({
    agentKey,
    msg: message.trim(),
    name: parsedCtx.name,
    workStatus: parsedCtx.workStatus,
    ageGroup: parsedCtx.ageGroup,
    dependents: parsedCtx.dependentsLabel,
    incomeSource: parsedCtx.incomeSource,
    incomeStability: parsedCtx.incomeStability,
    currentFocus: parsedCtx.currentFocus,
    turn: stationTurnCount,
    isEval: Boolean(isEvaluationSession),
    lastMsg: historyMsgTexts[historyMsgTexts.length - 1] || '',
    prevChips: prevChipsKey,
  });

  const safeHistoryArray = Array.isArray(history) ? history : [];
  const askedQuestionsFromHistory = extractAskedQuestionsFromHistory(safeHistoryArray);
  const hasPriorConversation =
    Boolean(isEditedOrResent) ||
    safeHistoryArray.some((h: any) => {
      const role = h?.role || h?.sender;
      const txt = String(h?.content || h?.text || '').trim();
      return (role === 'model' || role === 'advisor') && txt.length > 0;
    });

  const cachedResult = !isEditedOrResent ? advisorChatCache.get(chatCacheKey) : undefined;
  if (cachedResult && Date.now() - cachedResult.timestamp < 30000) {
    console.log(`[Advisor Chat] استجابة فورية من الذاكرة المؤقتة (Cache Hit < 1ms) لـ ${agentKey}`);
    return res.json(cachedResult.data);
  }

  // قراءة تعليمات الوكيل من ملف الـ Markdown الخاص به بدقة وتجريدها من القوالب القديمة
  const agentRoleDescription = loadAgentPrompt(agentKey);

  advisorName = (advisor && typeof advisor === 'object' && advisor.name) ? advisor.name : defaultMeta.name;
  const advisorRole = (advisor && typeof advisor === 'object' && (advisor.role || advisor.title)) ? (advisor.role || advisor.title) : defaultMeta.role;
  const stationTitleMap: Record<string, string> = {
    spiritual: 'الجانب الروحي والسكينة',
    financial: 'الجانب المالي والاستقلال',
    career: 'الجانب المهني والوظيفي',
    personal: 'الجانب الشخصي والوعي بالذات',
    learning: 'الجانب التعليمي والمعرفي',
    family: 'الجانب الأسري والعائلي',
    social: 'الجانب الاجتماعي والعلاقات',
    health: 'الجانب الصحي والبدني',
    aggregator: 'التكامل والتوازن الشامل',
    advisor: 'التوجيه التنفيذي الشامل',
  };
  const stationTitle = (advisor && typeof advisor === 'object' && advisor.title) ? advisor.title : (stationTitleMap[agentKey] || advisorRole);

  // فحص ما إذا كان المستخدم يطلب صراحة مواصلة الحوار، التعمق، أو إطالة النقاش (عدم إنهاء المحطة)
  const isContinueIntent = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار|المزيد|فهم\s*أكثر|فهم\s*اكثر|تقييم\s*أدق|تقييم\s*ادق)/i.test(message) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل\s*للمحطة|ننتقل\s*للتالية|المحطة التالية)/i.test(message);

  // فحص ما إذا كان المستخدم يطلب المضي قدماً أو يقدم التزاماً/خطوة عملية
  const isMoveForwardOrCommitment = !isContinueIntent && /(نصف\s+ساعة|ساعة|دقائق|دقيقة|خطوة|أمشي|امشي|مشي|تأمل|تامل|جاهز|ننتقل|المحطة التالية|اعتمد|اعتماد|سأجرب|ساجرب|سوف اجرب|سوف احاول|ساحاول|سأحاول)/i.test(message);
  // فحص ما إذا كان المستخدم يطلب صراحة اعتماد التقييم وإنهاء المحطة
  const isAdoptionIntent = !isContinueIntent && /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|كافي|نكتفي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(message);
  // فحص ما إذا كان المستخدم يوافق على الخطوة الميكروية المقترحة
  const isAcceptingMicroStep = !isContinueIntent && /(حسنا|سأجرب|ساجرب|سوف اجرب|سوف احاول|ساحاول|سأحاول|موافق|اتفقنا|بجرب|بحاول|وفر|أوفر|ادخر|أدخر|حصالة|50|100)/i.test(message);

  let offeredScoreFromLastAdvisor: number | null = null;
  if (isAdoptionIntent) {
    const lastModelMsg = Array.isArray(history)
      ? [...history].reverse().find((h: any) => h.role === 'model' || h.role === 'advisor' || h.sender === 'advisor' || h.sender === 'model')
      : null;
    const lastModelText = typeof lastModelMsg === 'string'
      ? lastModelMsg
      : (lastModelMsg?.content || lastModelMsg?.text || '');
    const proposedMatch = lastModelText.match(/(?:بدرجة|تقييمك|وضعك الحالي بدرجة|تقييم|درجة)\s*\(?([1-9](?:\.\d+)?|10)\s*(?:\/|\s*من\s*)10\)?/i);
    if (proposedMatch) {
      const extractedProposed = parseFloat(proposedMatch[1]);
      if (!isNaN(extractedProposed) && extractedProposed >= 1 && extractedProposed <= 10) {
        offeredScoreFromLastAdvisor = extractedProposed;
        if (userSelfScore === undefined || userSelfScore <= 0) {
          userSelfScore = extractedProposed;
        }
      }
    }
  }

  const isUserAsking = (/[؟?]/.test(message) || /(^|\s)(كم|كيف|هل|ماذا|ليه|ليش|وش|شو|ايش|متى|ينفع|تنصحني)(\s|$)/i.test(message)) && !isMoveForwardOrCommitment;
  // إغلاق المحطة غير مسموح به قبل الرسالة الثالثة للمستفيد (stationTurnCount < 2) ما لم يطلب الاعتماد صراحة
  const forcedIncomplete = Boolean(isEvaluationSession) && !isAdoptionIntent && (stationTurnCount < 2);
  const completionPhrasesRegex = /(أتممنا|انتهت\s+(?:هذه\s+)?المحطة|انتهينا\s+من\s+(?:هذه\s+)?المحطة|اكتملت\s+(?:هذه\s+)?المحطة|أنهينا\s+(?:هذه\s+)?المحطة|ختمنا\s+(?:هذه\s+)?المحطة|اكتمل\s+تقييم|أكملنا\s+تقييم|أتممنا\s+هذا\s+الجانب|أنهينا\s+هذا\s+الجانب|المحطة\s+التالية|ننتقل\s+(?:الآن\s+)?(?:إلى|ل)المحطة|اكتملت\s+محطة|أنجزنا\s+هذه\s+المحطة|أكملنا\s+هذه\s+المحطة|انتهت\s+هذه\s+المحطة|اكتملت\s+هذه\s+المحطة|أتممنا\s+تقييم)/i;

  const isEightDomain = EIGHT_EVALUATION_DOMAINS.has(agentKey);
  const isSafetyOrCrisisMsg = /(انتحار|الانتحار|انتحر|أنتحر|قتل نفسي|أقتل نفسي|ايذاء النفس|إيذاء نفسي|الموت|بالموت|للموت|ودي أموت|ودي اموت|لا اشعر باي سلام|لا اشعر بأي سلام|أكره حياتي|كرهت حياتي)/i.test(message);
  const isEarlyDialogueTurn = !isFreeConsultation && isEightDomain && stationTurnCount < 2 && !isAdoptionIntent && !isSafetyOrCrisisMsg;
  const isThirdOrLaterTurn = !isFreeConsultation && isEightDomain && stationTurnCount >= 2 && !isSafetyOrCrisisMsg;

  const sessionUserMessagesForEval = [...historyUserOnlyTexts, message]
    .map((t) => String(t || '').trim())
    .filter((t) => t.length > 0 && !isConfirmationOrMetaUtterance(t))
    .slice(-3);

  const evalToolPromise: Promise<{
    score: number | null;
    metrics: UnifiedScoringMetrics | null;
    needsClarification?: boolean;
    fallbackMessage?: string;
    source: 'gemini-eval' | 'groq-eval' | 'local-eval' | 'adopted-offered';
  }> | null = isThirdOrLaterTurn
    ? isAdoptionIntent && offeredScoreFromLastAdvisor !== null
      ? Promise.resolve({
          score: offeredScoreFromLastAdvisor,
          metrics: extractUnifiedMetricsFromSession(sessionUserMessagesForEval, agentKey),
          source: 'adopted-offered' as const,
        })
      : evaluateSessionMetricsWithTool({
          agentKey,
          stationTitle,
          sessionUserMessages: sessionUserMessagesForEval,
          abortSignal: clientAbortController.signal,
        })
    : null;

  // عزل سياق التقييم: منع تسريب أي درجات سابقة أو إجابات المحطة الحالية السابقة إلى موجه الـ LLM أثناء التقييم أو إعادة التقييم
  const sanitizedAnswersForPrompt: Record<string, any> = {};
  if (effectiveAnswers && typeof effectiveAnswers === 'object') {
    for (const [k, v] of Object.entries(effectiveAnswers)) {
      if (/(?:^|_)(?:score|self_rating)$/i.test(k)) continue;
      if (isEvaluationMode && (k === agentKey || k.startsWith(`${agentKey}_`))) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const cleanedObj: Record<string, any> = {};
        for (const [subK, subV] of Object.entries(v)) {
          if (/(?:^|_)(?:score|self_rating|rating)$/i.test(subK)) continue;
          cleanedObj[subK] = subV;
        }
        if (Object.keys(cleanedObj).length > 0) {
          sanitizedAnswersForPrompt[k] = cleanedObj;
        }
      } else {
        sanitizedAnswersForPrompt[k] = v;
      }
    }
  }

  // سادساً: سياق المحطات - استخراج ملخص مقتضب (سطر أو سطران) لأهم ما ذكره المستخدم في المحطات السابقة
  const pastStationsSnippets: string[] = [];
  if (effectiveAnswers && typeof effectiveAnswers === 'object') {
    const areaNames: Record<string, string> = {
      spiritual: 'الجانب الروحي',
      financial: 'الجانب المالي',
      health: 'الجانب الصحي',
      career: 'الجانب المهني',
      personal: 'الجانب النفسي',
      learning: 'الجانب المعرفي',
      family: 'الجانب الأسري',
      social: 'الجانب الاجتماعي',
    };

    for (const [key, val] of Object.entries(effectiveAnswers)) {
      if (
        key === agentKey ||
        key.startsWith(`${agentKey}_`) ||
        /(?:^|_)(?:score|self_rating)$/i.test(key)
      ) {
        continue;
      }
      const label = areaNames[key] || '';
      let userSnippet = '';
      if (typeof val === 'string' && val.trim().length > 5) {
        userSnippet = val.trim();
      } else if (val && typeof val === 'object') {
        const textValues = Object.entries(val)
          .filter(([k, v]) => typeof v === 'string' && (k.includes('response') || !k.includes('score')) && (v as string).trim().length > 5)
          .map(([, v]) => (v as string).trim());
        if (textValues.length > 0) {
          userSnippet = textValues[textValues.length - 1];
        }
      }
      if (userSnippet) {
        const shortText = truncateArabicAtWordBoundary(userSnippet, 65);
        pastStationsSnippets.push(`- في ${label || key}: ذكر المستفيد أنه "${shortText}".`);
      }
      if (pastStationsSnippets.length >= 2) break; // سطر أو سطران فقط
    }
  }

  const pastStationsContextText = pastStationsSnippets.length > 0
    ? `\n[سياق من محطات سابقة لمنع تكرار الأسئلة فقط — ⛔ ممنوع استخدامه للقفز إلى مجال آخر لم يذكره المستفيد في رسالته الحالية (كربط ضغط العمل بالإنفاق التعويضي أو المال)]:\n${pastStationsSnippets.join('\n')}\n`
    : '';

  // تحديد توجيهات النمط المختار من Gemini (سريع، متوازن، أو تفكير عميق استراتيجي)
  let modeGuideline = '';
  if (aiMode === 'fast') {
    modeGuideline = `
[النمط المختار: الوضع السريع ⚡ - Fast & Agile Response]
- المستفيد اختار النمط السريع: أجب بتركيز وإيجاز ذكي وبلا إطناب.
- ادخل في جوهر الموضوع مباشرة، واختم بسؤال سريع مستهدف يحرك الوعي والتنفيذ.
`;
  } else if (aiMode === 'deep') {
    modeGuideline = `
[النمط المختار: وضع التفكير والتحليل العميق 🧠 - Deep Strategic Thinker]
- المستفيد اختار نمط التفكير العميق: قم بتحليل استراتيجي رصين يلامس الواقع العملي.
- قدم رؤية واضحة، وخطوات نوعية تحويلية، واختم بسؤال تأملي ذكي يفتح له أفقاً جديداً في إدراك ذاته.
`;
  } else {
    modeGuideline = `
[النمط المختار: الوضع المتوازن ⚖️ - Balanced Advisor Mode]
- وازن بذكاء بين سرعة الفهم وعمق التوجيه الإرشادي العملي، واختم بسؤال تفاعلي ذكي يدعوه للتفكير والمشاركة.
`;
  }

  const clinicSpecialGuideline = `
[بروتوكول استثناء طوارئ إنساني حاسم ومطلق (Safety & Empathy Override) 🚨]
إذا أبدى المستفيد أي مشاعر حادة، أزمة نفسية، رغبة في إيذاء النفس، انتحار، تفكير في الموت، عدم الشعور بالأمان، أو يأس شديد (مثل "اريد الانتحار"، "افكر بالموت"، "لا اشعر بأي سلام"، "تعبت من الحياة"):
1. يُلغى فوراً وبشكل قاطع مسار التقييم الأسبوعي والأسئلة الثمانية دون أي تردد، واجعل "station_completed": false.
2. أجب مباشرة وصراحة وصدق على سؤال المستفيد وتساؤلاته الوجودية باحتواء عاطفي دافئ وحاسم ومن كل قلبك.
3. اختم دائماً بسؤال حانٍ يدعوه للحديث والتنفس ويتحقق من أمانه ووجود من يسانده.
4. شجعه برفق وحرص شديد على ألا يبقى وحده، وحثه على التواصل مع شخص مقرب أو الاتصال بخط مساندة ودعم نفسي طارئ في بلده.
`;

  // أولاً: حدود الأدوار والتخصص الحصري
  const roleBoundariesGuideline = `
[أولاً: حدود الأدوار والتخصص الحصري 🎯]
1. اختصاصك الحصري: أنت تتحدث بصفتك "${advisorName}" (${advisorRole})، واختصاصك الوحيد والمحصور هو (${stationTitle}) فقط، وفق ميثاقك.
2. ⛔ ممنوع منعاً باتاً:
   - ذكر أرقام المحطات أو ترتيبها (مثل: "لننتقل للجانب الرابع" أو "المحطة السابعة").
   - فتح موضوع أو طرح أسئلة تخص وكيلاً آخر (العلاقات للاجتماعي/الأسري، المال للمالي، الصحة للبدني، الروح للروحي، الوظيفة للمهني...).
3. إذا ذكر المستخدم موضوعاً خارج اختصاصك:
   - اعترف بما قاله في جملة واحدة فقط (مثال: "أقدّر أثر هذا التحدي عليك")، ثم عُد فوراً وبسلاسة إلى صميم تخصصك (${stationTitle}).
4. خصوصية المستشار الروحي (د. سفيان الروحي):
   - دورك مرشد للسكينة، التأمل القيمي، والسلام الداخلي، وحضور القلب، وخفض مشتتات النفس.
   - ⛔ احترام حدود التخصص: يُمنع منعاً باتاً تحويل الاستشارة الروحية إلى إدارة مهام، جداول إنتاجية، مصفوفات أداء، أو تنظيم عمل مكتبي؛ التزم حصراً بالمساحة الروحية والصفاء النفسي.
   - لست مرجعاً دينياً أو فقهياً: يُمنع إصدار الفتاوى أو الأحكام الشرعية أو الخوض في خلافات مذهبية؛ وإذا سألك المستخدم عن حكم شرعي، أحله باحترام للمختصين ودور الإفتاء، وركز معه على الأثر القلبي والسكينة.
`;

  // ثانياً: جودة الأسئلة والتشخيص المحايد
  const questionQualityGuideline = `
[ثانياً: جودة الأسئلة والتشخيص الرصين ❓]
1. سؤال واحد فقط ومنع الحلقات اللانهائية:
   - اطرح سؤالاً واحداً فقط في كل رد، يكون محدداً، عميقاً، ومرتبطاً ارتباطاً مباشراً بآخر عبارة قالها المستخدم.
   - في أول رسالتين للمستفيد (stationTurnCount < 2): استمر في التدرج الحواري التشخيصي وطرح سؤال واحد ذكي وعميق؛ ولا تتسرع في عرض اعتماد التقييم أو إنهاء المحطة. أما ابتداءً من الرسالة الثالثة للمستخدم (stationTurnCount >= 2)، اعرض التقييم المبدئي (X/10) وخياري الاعتماد أو المواصلة تلقائياً.
2. ممنوع التفسير النفسي غير المدعوم:
   - يُمنع منعاً باتاً تفسير مشاعر المستخدم أو افتراض أسباب نفسية باطنة لم يذكرها بلسانه (مثل: "خوفك من رؤية الحقيقة"، "صوت المثالية بداخلك"، "هروبك من الواقع").
   - اسأله بحياد تام: "ما الذي يجعلك تشعر بذلك؟" أو "كيف ينعكس هذا التحدي على يومك؟".
3. السؤال التوضيحي الموحد عند الغموض:
   - إذا كانت رسالة المستشير غير واضحة أو مقتضبة، فلا تخمّن مقصده ولا تفترض أسباباً، بل استخدم السؤال التالي نصاً:
     "أريد التأكد من أنني فهمت قصدك بشكل صحيح، هل يمكنك توضيح هذه النقطة؟"
`;

  // ثالثاً: الأسلوب ونبرة الصوت
  const styleAndToneGuideline = `
[ثالثاً: الأسلوب ونبرة الصوت والارتباط بالسياق 🌿]
1. سياسة استخدام اسم المستخدم:
   - يجوز استخدام اسم الحساب «${parsedCtx.name}» عند ملاءمة السياق بصورة طبيعية ومتباعدة فقط.
   - لا تجعل ذكر الاسم افتتاحية إلزامية لكل رد، ولا تكرره في كل رسالة، ولا تخترع أسماء أو ألقاباً أخرى.
2. تنويع الافتتاحية وتجنب التكرار:
   - نوّع الجملة الافتتاحية دائماً؛ ولا تبدأ أبداً ردين متتاليين بنفس العبارة (يُمنع تكرار "أحييك على..." أو أي قالب جاهز متكرر).
   - ابدأ بانعكاس طبيعي لكلمات المستفيد وما ذكره.
   - لا تكرر عبارات معلبة مثل "سؤالك في غاية الأهمية" عندما لا يكون هناك سؤال فعلي.
   - التزم بالإيجاز والتركيز في الردود دون إطناب إنشائي.
3. عدم الوعظ وانعكاس كلام المستفيد:
   - لا تعظ أو تلقِ دروساً ومحاضرات؛ اعكس كلمات المستخدم وعباراته أولاً، ثم اقترح خطوة واحدة صغيرة.
   - اذكر تفصيلين ملموسين ومحددين على الأقل من آخر رسالة كتبها المستخدم في سياق ردك.
4. تجنب كلمات الاتهام وإشعار الذنب والافتراضات غير المدعومة:
   - لا تستخدم كلمتي "تقصير" أو "ذنب" إلا إذا استخدمهما المستخدم أولاً بلسانه.
   - يُمنع افتراض أن المستشير مقصر أو مستعجل أو غير ملتزم أو اختلاق أحداث شخصية.
   - ⛔ يُمنع منعاً باتاً افتراض أو اختلاق بنود مصاريف أو عادات استهلاكية لم يذكرها المستفيد بلسانه (مثل افتراض "نفقات المطاعم"، "المقاهي"، أو "الشراء العاطفي" إذا لم يذكرها صراحة). التزم حصراً بما ذكره المستفيد واستخدم التسمية الدقيقة لمصدر دخله (مثلاً "مصروف من الأسرة" يُسمى "مصروفك" وليس "مكافأتك").
5. تقليل المدح والواقعية وتنوع الاستهلال:
   - تجنب البدء المتكرر بعبارات المجاملة المعلبة مثل ("أحييك يا..."، "أحييك على..."، "رائع يا..."). ادخل مباشرة في جوهر المعنى وتفاصيل كلام المستفيد بانعكاس هادئ وطبيعي.
   - ممنوع مدح خطة أو نية لم تُنفّذ بعد (تجنب عبارات: "استراتيجية ذهبية"، "انتصارك اليومي"، "أرقى صور النضج"...).
6. تجنب الكليشيهات المكررة:
   - تجنب العبارات المكررة بين الوكلاء مثل: ("ثقب التسريب"، "مفتاح السكينة"، "تعهد مقدس"، "بوصلة الروح")؛ ونوّع الصياغة بأسلوب طبيعي وعفوي.
7. لغة عربية بسيطة وقريبة:
   - اكتب بلغة عربية فصيحة، واضحة، وسلسة وقريبة من القلب.
   - تجنب المصطلحات الثقيلة والمترجمة (مثل: ديناميكية، بروتوكول، سيادة الذات، تموضع...).
8. منع التعميمات الزائفة:
   - لا تؤكد أن المستخدم مبدع أو متميز بتعميمات غير مثبتة (مثل: "أغلب المبدعين مثلك يعانون من ذلك").
`;

  // رابعاً وخامساً: الدرجة ونقاط القوة وإغلاق المحطة
  const scoringAndCompletionGuideline = `
[رابعاً وخامساً: الدرجة ونقاط القوة وقاعدة الإجابة الخامسة والتقييم المرحلي 📊]
1. الدرجة (score):
   - عند بدء استشارة جديدة لمحطة سبق تقييمها، ابدأ احتساب الدرجة من الصفر بناءً على رسائل الجلسة الحالية فقط، ولا ترث الدرجة السابقة (مثل 4.5/10) في التقييم المبدئي.
   - معايرة التقييم المبدئي في جميع المحطات (وخاصة الجانب الشخصي والوعي بالذات - د. ليلى): الإجابات الإيجابية والمستقرة (مثل تخصيص وقت يومي ثابت للراحة، البعد عن الشاشات، صفاء ذهني، وحضور أعمق مع الأسرة) تبدأ من 7.5 إلى 9.0/10؛ أما الإجابات المتقلبة أو المرهقة فتبقى في نطاق 4.0 إلى 5.5/10.
   - التزم بأن تكون الدرجة قريبة من تقييم المستخدم الذاتي في الجلسة الحالية (بفارق أقصاه ±1.0) إلا إذا ذكر أدلة واضحة على ممارسة فعلية مستمرة أو مشكلة خطيرة واقعية.
   - لا ترفع الدرجة بسبب نوايا أو خطط مستقبلية ("سأفعل"، "لن أجلد نفسي")؛ الخطط تُذكر كفرصة تطوير وليست دليل قدرة أو إنجاز قائم.
2. نقاط القوة (strengths):
   - صياغة معتدلة مبنية حصراً على ممارسة أو وعي حقيقي ذكره المستخدم فعلاً في حديثه؛ لا تستخدم "عالية" أو "كامل" إلا بدليل صريح.
   - ⛔ يُمنع منعاً باتاً كتابة نقاط قوة تتعارض مع شكوى المستخدم (مثلاً: لا تكتب "حضور اجتماعي متوازن" إذا اشتكى من الفتور والانعزال، بل اكتب "الوعي بأهمية الأصدقاء المقربين والرغبة في تنظيم وقت التواصل").
3. التوصية العلاجية الذهبية (advice و actionSteps[0]):
   - راجع سجل المحادثة الكامل لهذه المحطة؛ عند اكتمال المحطة أو اقتراح التوصية النهائية، صُغ في حقل "advice" خطوةً عملية واحدة مختصرة ومحددة بأسلوب المستشار المختص ومرتبطة بما طرحه المستخدم في الحوار: تعالج التحدي عند الدرجات المنخفضة أو المتوسطة، وتعكس فرص النمو والتوسع التي نوقشت في الحوار عند الدرجات المرتفعة (≥ 7.5/10 مثل استكمال صندوق الطوارئ من 4 إلى 6 أشهر وتوجيه جزء من الفائض لاستثمار طويل المدى)، ⛔ ويُمنع منعاً باتاً استخدام عبارات عامة معلبة مثل "البدء بخطوة عملية واحدة صغيرة ومحددة تعالج التحدي..." أو نسخ رسالة المستخدم الخام حرفياً.
4. تجنب المدح المعلب والافتراضات غير المدعومة:
   - لا تفترض أعراضاً لم يذكرها المستفيد (مثل زيادة الوزن، حرق الدهون، أو ضعف الثقة) ولا تمدحه على التزام بعادة لم يقم بها فعلياً.
   - التزم في الردود الاستكشافية بالحياد والاعتراف بضغط المستخدم وطرح سؤال مفتوح يخص المحطة الحالية دون افتراضات مسبقة.
5. قاعدة التقييم المبدئي الموحدة بعد الرسالة الثالثة للمستخدم (إلزامية صارمة عبر جميع المحطات الثماني):
   - خلال أول رسالتين فعليتين للمستفيد في المحطة (عندما stationTurnCount < 2):
     أ) ⛔ ممنوع منعاً باتاً إنهاء المحطة أو وضع station_completed: true، حتى لو ذكر رقماً أو التزاماً وقتياً (مثل 3 دقائق أو 30 ريال).
     ب) ⛔ ممنوع منعاً باتاً اقتراح إنهاء المحطة أو عرض نافذة اعتماد التقييم ("هل ترغب في اعتماد التقييم...").
     ج) استمر في الحوار بطرح أسئلة استكشافية متدرجة وذكية ومرتبطة بسياق المستفيد (طالب/موظف) لتعميق التشخيص.
   - ابتداءً من الرسالة الثالثة الفعلية للمستخدم (عندما stationTurnCount >= 2):
     أ) قدّم تقييماً مبدئياً واضحاً من 10 درجات في حقل score بناءً على الأدلة المتاحة في الجلسة الحالية، مع توضيح أنه تقييم مبدئي.
     ب) استخدم صيغة التخيير المعيارية الإلزامية في نص الرد (reply):
        «بعد ما شاركتني به حتى الآن، أقيّم وضعك الحالي بدرجة (X/10). هذا تقييم مبدئي مبني على المعلومات التي ذكرتها، وقد يتغير إذا واصلنا الاستكشاف.
        هل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة؟»
     ج) إذا اختار المستخدم الاعتماد ("اعتمد التقييم" أو "أنهِ المحطة"): ضع station_completed = true واختم بملخص وخطوة عملية مستمدة من كلامه دون أي سؤال استكشافي.
     د) إذا اختار المواصلة: ضع station_completed = false واستكمل بأسئلة محددة وضرورية فقط دون تكرار.
6. الاقتراحات السريعة التكيفية (suggestedReplies - إلزامي):
   - أنت الآن تعد ردوداً سريعة تفاعلية للمستخدم للإجابة في الجولة رقم (${(typeof stationTurnCount === 'number' ? stationTurnCount : 0) + 2}) بناءً مباشرة على آخر رسالة كتبها المستخدم ("${truncateArabicAtWordBoundary(String(message || '').replace(/"/g, "'"), 80)}").
   - قدّم في حقل "suggestedReplies" مصفوفة من 3 إلى 4 ردود سريعة مقترحة وقصيرة (كل رد أقل من 65 حرفاً وبصيغة المتكلم من زاوية المستخدم مثل: "أكثر ما يضغط علي هو..." أو "سأجرب بدء...").
   - اجعل زاوية الاقتراحات تتطور مع رقم الجولة: (الجولة 2: تعميق السبب أو المصدر، الجولة 3: اختبار القابلية وكشف العوائق، الجولات 4+: خطوة عملية دقيقة أو متابعة الثبات).
   - ⛔ يُمنع تماماً تكرار أي عبارة مطابقة لإجابة المستخدم الأخيرة أو إعادة أي من الاقتراحات السابقة التالية: ${Array.isArray(req.body.previousSuggestions) && req.body.previousSuggestions.length > 0 ? req.body.previousSuggestions.slice(-8).join(' | ') : 'لا يوجد'}.
`;

  let evaluationSessionGuideline = '';
  if (isEvaluationSession) {
    let stationStateGuideline = `المحطة في مرحلة الاستكشاف والتشخيص التدرجي (الرسالة ${stationTurnCount + 1} من 3+)؛ ⛔ يُمنع إنهاء المحطة أو اقتراح الاعتماد قبل الرسالة الثالثة، واطرح سؤالاً استكشافياً واحداً محدداً مرتبطاً بكلامه.`;
    if (isContinueIntent) {
      stationStateGuideline = `[المستفيد اختار صراحة مواصلة الحوار والتعمق ("${message}")]: المستفيد رفض إنهاء المحطة وفضّل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة وإطالة الاستكشاف. ⛔ يُمنع منعاً باتاً إنهاء المحطة أو وضع "station_completed": true! اجعل "station_completed": false حتماً. رحب برغبته في الاستمرار في جملة دافئة، ثم اطرح سؤالاً تشخيصياً نوعياً جديداً في صميم اختصاصك (${stationTitle}) لتعميق فهم واقعه.`;
    } else if (isAdoptionIntent) {
      stationStateGuideline = `[طلب اعتماد صريح للمحطة!] المستفيد يطلب صراحة وبشكل مباشر اعتماد التقييم وإنهاء المحطة والانتقال ("${message}"). يجب إلزامياً وضع "station_completed": true، وتقديم الدرجة والملخص التشخيصي والنصيحة الختامية دون طرح أي سؤال على الإطلاق! (يُمنع منعاً باتاً طرح أي سؤال جديد).`;
    } else if (stationTurnCount < 2) {
      stationStateGuideline = `المستفيد في الرسالة (${stationTurnCount + 1} من 3): ⛔ يُمنع منعاً باتاً إنهاء المحطة أو وضع station_completed: true، ويُمنع اقتراح إنهاء المحطة أو التخيير بالاعتماد حتى لو وافق على عادة أو خطوة أو ذكر رقماً. أكد على ما ذكره بذكاء واطرح سؤالاً استكشافياً تدرجياً جديداً في صميم واقعه.`;
    } else if (stationTurnCount >= 2) {
      stationStateGuideline = `بلغ المستفيد الرسالة الثالثة (أو أكثر)؛ يجب إلزامياً تطبيق قاعدة التقييم المبدئي الموحدة وعرض الدرجة (X/10) وصيغة التخيير المعيارية للاعتماد أو المواصلة، مع جعل station_completed: false ما لم يختر الاعتماد صراحة.`;
    }

    evaluationSessionGuideline = `
[بروتوكول جلسة الاستشارة والتقييم الحواري التكيفي 🌿]
المستفيد يخوض جلسة استشارية تقييمية لمحطة ${stationTitle} (${advisorName})${evaluationQuestionTitle ? ` - وسؤال المحطة: "${evaluationQuestionTitle}"` : ''}.
- عدد التبادلات الحوارية التي تمت حتى الآن في هذه المحطة (stationTurnCount): ${stationTurnCount}.
- حالة إتمام المحطة: ${stationStateGuideline}

⚠️ توجيهات حاسمة:
1. ⛔ لا تقل أبداً "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة" إلا إذا كان station_completed يساوي true فقط!
2. عند موافقة المستفيد على الخطوة أو بلوغ التبادل الخامس: يجب التوقف عن الاستكشاف وعرض صيغة التقييم المرحلي والتخيير بين الاعتماد أو المواصلة.
3. إذا اختار المستفيد الاعتماد ("اعتمد التقييم") أو وضعت station_completed = true: اختم بملخص تشخيصي وخطة صغيرة بجملتين واضحتين، ويُمنع منعاً باتاً طرح أي سؤال جديد!
`;
  } else {
    evaluationSessionGuideline = `
[بروتوكول جلسة الاستشارة الحرة المستمرة 💬]
المستفيد حالياً يتحدث معك (${advisorName}) داخل مساحة «استشارة حرة» مستقلة تماماً عن تقييم عجلة الحياة.
1. ⚠️ فصل كامل عن التقييم والدرجات:
   - يُمنع منعاً باتاً ذكر أي درجة رقمية (مثل X/10) أو الإشارة إلى تقييم المحطة أو طلب اعتماد التقييم أو إنهاء الجلسة.
   - يجب أن تكون قيمة "station_completed": false دائماً.
2. دورك كمستشار شخصي عملي ومباشر:
   - قدّم إجابة مركزة، عملية، ودافئة تعالج مباشرة التحدي الذي طرحه المستفيد اليوم في مجال (${stationTitle}) دون أسئلة تشخيصية مطوّلة أو مقدمات قالبية.
   - أدرج في حقل "actionSteps" من 1 إلى 3 مهام أو خطوات عملية قصيرة ومحددة وواضحة (كل خطوة جملة تنفيذية مختصرة من 5 إلى 12 كلمة) كلما كان ذلك مناسباً، ليتمكن المستفيد من إضافتها مباشرة إلى مصفوفة أيزنهاور أو خطة الـ 30 يوماً.
   - اختم عند الحاجة بسؤال متابعة لطيف ومختصر لفتح باب الاستمرار دون فرض استبيان تقييمي.
`;
  }

  // استخراج سياق المستفيد وخلفيته الحياتية من الكائن الموحّد parsedCtx
  const userContextBlock = `
[سياق المستفيد وخلفيته الحياتية الأساسية 🎯]:
- الاسم: ${parsedCtx.name}
- الوضع الحالي / حالة العمل: ${parsedCtx.workStatus}
${parsedCtx.ageGroup ? `- الفئة العمرية: ${parsedCtx.ageGroup}` : ''}
- المعالون (أسرة أو أطفال): ${parsedCtx.dependentsLabel}
${parsedCtx.incomeSource ? `- مصدر الدخل الأساسي: ${parsedCtx.incomeSource}` : ''}
${parsedCtx.incomeStability ? `- طبيعة واستقرار الدخل: ${parsedCtx.incomeStability}` : ''}
${parsedCtx.currentFocus ? `- التركيز والتفاصيل الإضافية: ${parsedCtx.currentFocus}` : ''}

⛔ قاعدة صارمة وملزمة في تخصيص الحوار والأسئلة والنصائح:
لا تطرح أي سؤال أو نصيحة لا تناسب حالته (مثلاً لا تسأل طالباً عن الراتب والأقساط، ولا تقدم نصائح استثمار معقدة لمن دخله مصروف، ولا تفترض دخلاً ثابتاً لمن دخله متغير أو باحث عن عمل، ولا تفترض وجود أطفال/زوج لمن اختار "بدون معالين"، ولا تقدم نصائح ترقية وظيفية لمتقاعد أو طالب، وفي الجانب المالي لا تفترض أبداً أن الموظف بدخل ثابت وبدون معالين خالٍ من الديون أو لديه فائض جاهز للادخار والاستثمار قبل سؤاله أولاً عن الديون والأقساط والالتزامات الشهرية). كيّف كل سؤال ومثال في جميع جولات الحوار ليطابق هذا السياق الحياتي بدقة. وإن ذكر المستخدم ما يتعارض مع ملفه فاتبع كلامه في الحوار.
`;

  // سابعاً: سياق المحطة الحالية - استخراج ملخص مقتضب من سطرين لأهم ما ذكره المستخدم في هذه المحطة لربط السياق والحديث
  const userUtterancesInStation: string[] = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h) continue;
      const role = h.role || h.sender;
      if (role === 'user') {
        let t = '';
        if (typeof h === 'string') t = h;
        else if (typeof h.content === 'string') t = h.content;
        else if (typeof h.text === 'string') t = h.text;
        t = t.trim();
        if (t && t.length > 3 && !isConfirmationOrMetaUtterance(t)) {
          userUtterancesInStation.push(t);
        }
      }
    }
  }
  if (message && message.trim().length > 3 && !isConfirmationOrMetaUtterance(message)) {
    userUtterancesInStation.push(message.trim());
  }

  let stationSummaryContextText = '';
  if (userUtterancesInStation.length > 0) {
    const summaryStatements = userUtterancesInStation.slice(-3).map((s) => {
      const clean = truncateArabicAtWordBoundary(s, 70);
      return `  * "${clean}"`;
    });
    stationSummaryContextText = `\n[ملخص سريع لما ذكره المستفيد في هذه المحطة لربط السياق]:\n${summaryStatements.slice(-2).join('\n')}\n`;
  }

  const domainSpecificContextGuideline = buildDomainContextDirectives(agentKey, parsedCtx);

  const efStatusInDialogue = extractEmergencyFundStatus([...safeHistoryArray, message]);
  const debtAnsweredInDialogue = hasDebtStatusAnswered(safeHistoryArray, message);
  const expenseAnsweredInDialogue = [...historyUserOnlyTexts, message].some(
    (u) => extractExpenseCategoryFromAnswer(u) !== null
  );
  const answeredDiagnosticFacts: string[] = [];
  if (efStatusInDialogue.answered) {
    answeredDiagnosticFacts.push(
      efStatusInDialogue.hasFund
        ? `- صندوق الطوارئ: أجاب المستفيد بالفعل بامتلاك صندوق/احتياطي طوارئ${efStatusInDialogue.monthsCovered ? ` يغطي ${efStatusInDialogue.monthsCovered} أشهر` : ''}. ⛔ يُمنع تماماً إعادة سؤال "هل لديك صندوق طوارئ؟" أو "كم شهراً يغطي؟" أو سؤاله عن تأسيسه من الصفر.`
        : '- صندوق الطوارئ: أوضح المستفيد بالفعل عدم امتلاك صندوق طوارئ حالياً. ⛔ يُمنع إعادة سؤال هل لديك صندوق طوارئ.'
    );
  }
  if (debtAnsweredInDialogue) {
    answeredDiagnosticFacts.push(
      '- الديون والأقساط: أوضح المستفيد بالفعل موقفه من الديون/الأقساط في رسائله السابقة. ⛔ يُمنع إعادة السؤال هل توجد عليك ديون أو أقساط.'
    );
  }
  if (expenseAnsweredInDialogue) {
    answeredDiagnosticFacts.push(
      '- بنود الصرف والتسرب: حدّد المستفيد بالفعل بند الصرف الأساسي. ⛔ يُمنع إعادة سؤال ما البند الذي يستهلك دخلك.'
    );
  }

  const antiRepeatDialogueGuideline = `
[قواعد حاسمة لمنع التكرار ومسار التعديل والاستئناف 🚫]:
1. يُمنع منعاً باتاً إعادة طرح أي سؤال سبق طرحه أو أجاب عنه المستخدم في سجل المحادثة الحالية، وخاصة سؤال صندوق الطوارئ أو أي سؤال تشخيصي ثابت تم توضيحه مسبقاً.
${askedQuestionsFromHistory.length > 0 ? `- أسئلة طُرحت سابقاً في هذه المحادثة (ممنوع تكرارها أو إعادة صياغتها):\n${askedQuestionsFromHistory.slice(-6).map((q) => `  * "${q}"`).join('\n')}` : '- لا توجد أسئلة سابقة مطروحة بعد.'}
${answeredDiagnosticFacts.length > 0 ? `- حقائق تشخيصية أجاب عنها المستفيد بالفعل (ممنوع إعادة السؤال عنها):\n${answeredDiagnosticFacts.join('\n')}` : ''}
2. تعامل مع آخر رسالة كتبها المستفيد ("${truncateArabicAtWordBoundary(String(message || '').replace(/"/g, "'"), 120)}") كإجابة مؤكدة ومباشرة على السؤال السابق، حتى لو بدأها بصيغة ظنية مثل "ممكن..." (مثال: "ممكن الاكل في المطاعم" هي إجابة فعلية عن بند الصرف وليس سؤالاً عاماً). اعترف بما ذكره مباشرة في أول جملة وابنِ عليه للانتقال إلى الخطوة المنطقية التالية (مثل استكمال النمو أو اقتراح خطوة عملية أو عرض التقييم المرحلي).
${hasPriorConversation ? `3. ⛔ محظور في هذا الرد البدء بتحية افتتاحية متكررة (مثل: "أهلاً بك..." أو "مرحباً بك..." أو إعادة تقديم نفسك).${isEditedOrResent ? ' المستفيد أعاد إرسال/تعديل إجابته عبر "تراجع / تعديل"، فادخل مباشرة في الاعتراف بالإجابة والانتقال للخطوة التالية.' : ''}` : ''}
4. ⛔ اتساق الدرجات والأسئلة مع البداية الإيجابية: إذا بدأ المستفيد بتقييم مرتفع (مثل 8/10) أو وصف إيجابي واضح (مثل منحه عائلته الكثير من الوقت)، لا تخفّض الدرجة إلى أقل من 5/10 لمجرد تحدٍّ فرعي (كتشتت الهاتف أو الخجل)، بل اجعلها متوازنة (6.5 إلى 7.5). ويُمنع طرح سؤال يناقض ما أثبته (كأن تسأله ما الذي يمنعه من قضاء وقت أطول مع عائلته بعد تأكيده منحه لهم الكثير من الوقت).
5. إذا طلب المستفيد اقتراحات مباشرة (مثل "لا أدري أعطيني اقتراحاتك")، قدّم له 2-3 اقتراحات عملية قصيرة ومباشرة مبنية على حواره في نفس الرد قبل عرض درجة التقييم المبدئي.
6. التوصية الذهبية (advice) عند الاكتمال يجب أن تلخص الإجراء العملي المتفق عليه في الحوار بأسلوب المستشار دون عبارات قالبية عامة ودون نسخ كلام المستفيد داخل علامات تنصيص.
7. ⛔ عدالة التقييم عند السلبية الواضحة أو العزلة الحادة (خصوصاً في الجانب الشخصي): إذا عبّر المستفيد بصراحة واستمرار عن العزلة التامة أو رفض الجلوس مع الأسرة/الآخرين أو سوء المعاملة المستمر، امنحه درجة منخفضة واقعية (2.5 إلى 3.8 من 10) دون تجميل أو رفعها لنحو 4.8 بذريعة التوازن أو وجود نشاط فردي كالمشي منفرداً. ويُمنع افتراض شعوره بـ"التقصير تجاه معاليه" أو طرح أسئلة تفترض جلوسه معهم؛ احترم حدوده بهدوء وناقش أثر العزلة على توازنه الشخصي.
8. ⛔ تخصيص "التوصية العلاجية الذهبية" للدرجات المرتفعة (≥ 7.5/10): عندما تكون الدرجة 7.5 فأعلى، صُغ حقل "advice" ليعكس فرص النمو والتوسع التي نوقشت في الحوار (مثل: استكمال صندوق الطوارئ من 4 إلى 6 أشهر وتوجيه جزء من الفائض لاستثمار طويل المدى)، ويُمنع استخدام عبارات عامة خاصة بمعالجة التحديات مثل "البدء بخطوة عملية واحدة صغيرة ومحددة تعالج التحدي...".
`;

  const enforceAntiRepeatOnReply = (
    rawReply: string,
    isCompleted: boolean,
    reconciledScore: number
  ): string => {
    let cleaned = stripRepeatedOpeningGreeting(rawReply || '', hasPriorConversation);
    if (!isCompleted && isRequestingAdvisorSuggestions(message)) {
      const hasNumberedOrBulleted = /(?:^|\n)\s*(?:[1-3][.)]|[-•])\s+\S+/m.test(cleaned);
      if (!hasNumberedOrBulleted) {
        const concrete = generateConcreteDomainSuggestions(
          agentKey,
          [...historyUserOnlyTexts, message],
          effectiveUserProfile,
          reconciledScore
        );
        const listBlock = concrete.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
        cleaned = `إليك 3 اقتراحات عملية قصيرة تناسب واقعك:\n\n${listBlock}\n\n${cleaned}`;
      }
    }
    if (isCompleted || (askedQuestionsFromHistory.length === 0 && safeHistoryArray.length === 0 && !message)) {
      return cleaned;
    }

    const combinedHistoryForCheck = [...safeHistoryArray, message];
    const domainPool = getDomainContextConfig(agentKey, parsedCtx).exploratoryQuestions;
    const questionMatches = cleaned.match(/[^.!؟?\n]+[؟?]/g) || [];
    if (questionMatches.length > 0) {
      const buildSmartReplacement = (): string => {
        const nextPick = pickNextUnaskedQuestion(domainPool, combinedHistoryForCheck, stationTurnCount);
        if (nextPick.question) return nextPick.question;
        if (stationTurnCount >= 2) {
          return 'هل ترغب في اعتماد التقييم المبدئي الحالي والانتقال للمحطة التالية، أم تفضل مواصلة الحوار؟';
        }
        if (agentKey === 'financial' && (efStatusInDialogue.hasFund || reconciledScore >= 7.5)) {
          if (
            efStatusInDialogue.hasFund &&
            efStatusInDialogue.monthsCovered !== null &&
            efStatusInDialogue.monthsCovered >= 1 &&
            efStatusInDialogue.monthsCovered < 6
          ) {
            return `بما أن صندوق طوارئك يغطي ${efStatusInDialogue.monthsCovered} أشهر حالياً، كيف تخطط لاستكماله إلى 6 أشهر وبالتوازي توجيه جزء من الفائض لاستثمار طويل المدى؟`;
          }
          return 'انطلاقاً من هذا الاستقرار المالي، أي مسار لنمو الفائض أو الاستثمار طويل المدى تود التركيز عليه في المرحلة القادمة؟';
        }
        return `ما الخطوة العملية البسيطة التي تراها مناسبة لتطبيقها في ${stationTitle} هذا الأسبوع؟`;
      };

      const lastQ = questionMatches[questionMatches.length - 1].trim();
      if (
        isQuestionAlreadyAsked(lastQ, askedQuestionsFromHistory) ||
        isQuestionContradictingHistory(lastQ, combinedHistoryForCheck) ||
        isDiagnosticTopicAlreadyAnswered(lastQ, combinedHistoryForCheck)
      ) {
        cleaned = cleaned.replace(lastQ, buildSmartReplacement()).trim();
      }
    }
    if (isEarlyDialogueTurn || isFreeConsultation) {
      return stripAccidentalScoreMentions(cleaned);
    }
    if (
      Boolean(isEvaluationSession) &&
      !isCompleted &&
      !isContinueIntent &&
      stationTurnCount >= 2 &&
      !/(?:أقيّم\s+وضعك|أقيم\s+وضعك|تقييم\s*مبدئي|هل\s+ترغب\s+في\s+اعتماد|هل\s+نعتمد\s+هذا\s+التقييم)/i.test(cleaned)
    ) {
      cleaned = `${cleaned}\n\n${formatUnifiedScoreConfirmationMessage(reconciledScore)}`;
    }
    return cleaned;
  };

  const earlyDialoguePersonaGuideline = `
[طبقة الحوار التمهيدية الحصرية للجولتين 1 و 2 (Decoupled Conversational Layer) 🎯]
- أنت الآن في الرسالة (${stationTurnCount + 1} من 2)؛ مهمتك الوحيدة والحصرية هي:
  1. التعاطف الموجز والدافئ (جملة إلى جملتين) المرتبط مباشرة بالكلمات والتفاصيل التي ذكرها المستفيد فعلاً.
  2. طرح سؤال تشخيصي واحد محدد ومرتبط ارتباطاً مباشراً بكلامه الحالي (دون تكرار سؤال سابق ودون تناقض).
- ⛔ محظورات مطلقة في الجولتين 1 و 2:
  - يُمنع منعاً باتاً كتابة أو حساب أي درجة رقمية (مثل X/10) أو عبارة "أقيّم وضعك".
  - يُمنع اقتراح إنهاء المحطة أو اعتماد التقييم أو سرد قوائم نصائح/خطوات طويلة معلبة.
  - في الجانب الاجتماعي (أ. سامي): إذا ذكر المستفيد ضغط العمل أو الأسرة أو الإرهاق، يُمنع تماماً افتراض "الوحدة أو الرهاب أو الارتباك في التجمعات أو صعوبة تكوين الصداقات".
`;

  const mandatoryQualityAndPrecisionRules = `
[قواعد الجودة والدقة الحوارية الإلزامية لجميع المستشارين 🚨]:
1. الارتباط المباشر بالشكوى (Direct Complaint Alignment — ممنوع القفز المبكر):
   - اجعل ردك وسؤالك القادم مرتبطين ارتباطاً مباشراً وحرفياً بالمشكلة أو الشكوى التي صرّح بها المستفيد في رسالته الأخيرة (مثل: عدم وجود أصدقاء، غياب الهوايات، ساعات العمل الطويلة، أو الشعور بالفراغ الشخصي).
   - ⛔ محظور منعاً باتاً القفز أو الربط بمجال حياتي آخر لم يذكره المستفيد صراحة في كلامه (مثلاً: يُمنع ربط الإرهاق الوظيفي أو ساعات العمل الطويلة بـ«الإنفاق التعويضي» أو الأمور المالية، ولا تفترض مشكلات غير مذكورة) ما لم يصرح المستفيد بذلك بنفسه.
2. الحياد التام عند المدخلات العشوائية أو غير المفهومة (Strict Neutrality on Gibberish / Random Inputs):
   - إذا أرسل المستفيد مدخلاً غير مفهوم أو عشوائياً أو ضحكاً وأرقاماً عشوائية أو رموزاً وإيموجي فقط (مثل: «ههههه 123456» أو حروف عشوائية):
     * استجب بإيجاز ولطف لطلب التوضيح فقط (مثل دعوته لمشاركة ما يدور في باله بكلمات واضحة لبدء التقييم/الحوار).
     * ⛔ محظور منعاً باتاً في هذه الحالة:
       - لا تفترض أي نية نفسية (مثل: «أنت تمزح لإخفاء التوتر أو التشتت»).
       - لا تذكر أو تمنح أي درجة رقمية إطلاقاً (اجعل score: null و needsClarification: true).
       - لا تختلق أو تذكر أي تفاصيل غير مصرح بها عن المستفيد (مثل: لا تذكر «عملك التقني» أو أي مهنة محددة ما لم يصرح المستفيد بها بنفسه).
3. سلامة اللغة العربية ودقتها الصرفية والنحوية (Arabic Linguistic Accuracy):
   - التزم في جميع ردودك بصحة اللغة العربية نحواً وصرفاً وإملاءً وبصياغة طبيعية دافئة وموجزة (مثلاً استخدم الصيغ الصحيحة: «بكل هدوء» وليس «بكل هادئ»، «بكل دفء» وليس «بكل دافئ»، «بكل صدق» وليس «بكل صادق»).
`;

  // إثراء التعليمات بسياق المستفيد وشخصية الوكيل المستقلة وأسلوب الرد المطلوب
  systemInstruction = `
${userContextBlock}
${domainSpecificContextGuideline}
${antiRepeatDialogueGuideline}
${mandatoryQualityAndPrecisionRules}

${agentRoleDescription}

 أنت الآن في محادثة استشارية حية بصفتك: "${advisorName}" (${advisorRole}) لمحطة "${stationTitle}" ضمن منصة وزان.
تحدث كشخصية واعية، حكيمة ودافئة، تفهم بذكاء الإنسان أمامها وتفكر معه بصدق ورصانة.

${modeGuideline}
${clinicSpecialGuideline}
${roleBoundariesGuideline}
${isFreeConsultation ? '' : questionQualityGuideline}
${styleAndToneGuideline}
${isFreeConsultation ? '' : (isEarlyDialogueTurn ? earlyDialoguePersonaGuideline : `${scoringAndCompletionGuideline}
${isThirdOrLaterTurn ? '\n⛔ قاعدة الفصل الحواري (Turn 3+): لا تكتب أي درجة رقمية (مثل X/10) في نص الرد، فستتولى أداة التقييم الموحدة حساب الدرجة برمجياً وإرفاقها.\n' : ''}`)}
${evaluationSessionGuideline}

سياق المستفيد من منصة وزان:
- الاسم: ${parsedCtx.name}
- حالة العمل: ${parsedCtx.workStatus}
${parsedCtx.ageGroup ? `- الفئة العمرية: ${parsedCtx.ageGroup}` : ''}
- المعالون: ${parsedCtx.dependentsLabel}
${parsedCtx.incomeSource ? `- مصدر الدخل: ${parsedCtx.incomeSource}` : ''}
${parsedCtx.incomeStability ? `- طبيعة الدخل: ${parsedCtx.incomeStability}` : ''}
${parsedCtx.currentFocus ? `- التركيز الحالي: ${parsedCtx.currentFocus}` : ''}
${isEightDomain || isEvaluationMode || isFreeConsultation ? '' : `- الدرجة الحالية: ${effectiveScore}/10 ${userSelfScore !== undefined ? `(التقييم الذاتي للمستفيد: ${userSelfScore}/10)` : ''}`}
- التحديات المرصودة: ${advisor?.challenges?.join('، ') || 'لم تُحدد بعد'}
- الأهداف: ${effectiveGoals?.join('، ') || 'لم تُحدد بعد'}
${isFreeConsultation ? '' : (Object.keys(sanitizedAnswersForPrompt).length > 0 ? `- إجابات مساعدة من سياق المستفيد (دون درجات): ${JSON.stringify(sanitizedAnswersForPrompt)}` : '')}
${isFreeConsultation ? '' : pastStationsContextText}${stationSummaryContextText}
${isFreeConsultation ? '[تذكير ملزم]: هذه استشارة حرة ومستمرة لا تؤثر على التقييم؛ التزم بـ station_completed: false، ولا تذكر أي درجات، وقدم نصيحة عملية موجزة مع 1 إلى 3 خطوات تنفيذية مختصرة في actionSteps.' : `[تذكير ختامي ملزم حول عدد التبادلات والمحطة]:
- عدد التبادلات الحالية التي تمت في هذه المحطة (stationTurnCount): ${stationTurnCount}.
${forcedIncomplete ? `- ⛔ المحطة ما زالت في مرحلة التشخيص (station_completed: false حتماً): لا تقل أبداً "أتممنا المحطة" أو "انتهت المحطة"، واختم ردك بسؤال تشخيصي محدد واحد مرتبط بآخر ما قاله.` : ''}`}
`;

  // تطهير وبناء تسلسل المحادثة التفاعلية بما يتوافق بدقة مع متطلبات Google GenAI
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  // تمرير سجل المحادثة الكامل للمحطة (حتى 40 رسالة) لتعميق الذاكرة الحوارية واستخلاص التوصية العلاجية الذهبية ونقاط القوة بدقة
  const recentHistory = Array.isArray(history) ? history.slice(-40) : [];
  for (const h of recentHistory) {
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

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('مفتاح GEMINI_API_KEY غير متوفر في متغيرات البيئة.');
    }

    // اختيار النماذج العاملة والمجربة ديناميكياً مع إعطاء الأولوية لأسرع نموذج مستقر (gemini-3.5-flash-lite) ومقاومة 503/404
    const userGeminiModel = GEMINI_MODEL;
    const candidateModels = Array.from(
      new Set(
        [
          'gemini-3.5-flash-lite',
          userGeminiModel,
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-3.1-flash-lite',
        ].filter(Boolean) as string[]
      )
    );

    const schemaProperties: Record<string, any> = {
      agent_name: {
        type: Type.STRING,
        description: 'اسم الوكيل أو المستشار',
      },
      reasoning: {
        type: Type.STRING,
        description: 'تحليل عميق وخطوات تفكير منطقية مرتبطة بحالة المستخدم وأهدافه في عجلة الحياة',
      },
      ...(isEightDomain
        ? {}
        : {
            score: {
              type: Type.NUMBER,
              description: 'درجة أو تقييم رقمي',
            },
          }),
      summary: {
        type: Type.STRING,
        description: 'ملخص الوضع بناءً على البيانات',
      },
      advice: {
        type: Type.STRING,
        description: 'التوصية العلاجية الذهبية: عند اكتمال المحطة اذكر العادة أو الخطة المحددة التي اقترحها المستخدم بنفسه خلال الحوار وليس حكمة عامة',
      },
      reply: {
        type: Type.STRING,
        description: 'نص الرد التفصيلي والمشجع من المستشار المتحدث مباشرة للمستفيد',
      },
      actionSteps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'خطوات إجرائية سريعة مستمدة من كلام المستخدم يمكن إضافتها لقائمة الأهداف',
      },
      reflectionQuestion: {
        type: Type.STRING,
        description: 'سؤال تأملي ذكي للمستفيد',
      },
      station_completed: {
        type: Type.BOOLEAN,
        description: 'true only if the user has provided clear, sufficient answers covering their real state and the doctor is ready to finalize this station; false if the user gave a greeting, vague response, or more diagnostic exploration is needed',
      },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '1 to 3 realistic strengths strictly consistent with user complaints (never contradict complaints)',
      },
      challenges: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '1 to 3 improvement opportunities/challenges extracted from what the user actually said in this session',
      },
      suggestedReplies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '3 to 4 concise, clickable quick replies (written in first person from the user perspective, < 65 chars each) tailored specifically to the latest advisor question, the user previous message, and current round number without repeating prior chips',
      },
    };

    const requestConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: schemaProperties,
        required: ['reasoning', 'advice', 'reply', 'actionSteps'],
      },
    };

    // 1) مهلة 10 ثوانٍ لكل استدعاء، وتمرير إشارة فورية للنموذج التالي عند أي فشل 503/400/404
    const callSingleModel = async (
      model: string,
      abortState: { aborted: boolean },
      onEarlyError?: () => void
    ): Promise<{ response: any; model: string; durationMs: number }> => {
      let attempt = 0;
      while (attempt <= 1) {
        if (abortState.aborted || clientAbortController.signal.aborted) {
          throw new Error(`تم تجاوز النموذج ${model} لسبق نموذج آخر أو إلغاء الطلب من العميل`);
        }
        const attemptStart = Date.now();
        let timeoutHandle: any;

        try {
          const apiCall = ai.models.generateContent({
            model,
            contents,
            config: requestConfig,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error(`تجاوزت مهلة استجابة Gemini API (10 ثوانٍ) للنموذج: ${model}`));
            }, 10000);

            const onClientAbort = () => {
              clearTimeout(timeoutHandle);
              reject(new Error('أغلق العميل الاتصال'));
            };
            if (clientAbortController.signal.aborted) {
              onClientAbort();
            } else {
              clientAbortController.signal.addEventListener('abort', onClientAbort, { once: true });
            }
          });

          const res = await Promise.race([apiCall, timeoutPromise]);
          clearTimeout(timeoutHandle);

          const durationMs = Date.now() - attemptStart;
          // 7) اطبع في Logs زمن كل استدعاء بالمللي ثانية واسم النموذج الذي نجح
          console.log(`[Advisor Chat] استجاب النموذج "${model}" بنجاح في ${durationMs}ms`);
          return { response: res, model, durationMs };
        } catch (err: any) {
          clearTimeout(timeoutHandle);
          const durationMs = Date.now() - attemptStart;
          console.error(
            `[Advisor Chat] فشل النموذج "${model}" بعد ${durationMs}ms (محاولة ${attempt + 1}/2):`,
            err?.message || err
          );

          if (abortState.aborted || clientAbortController.signal.aborted) {
            throw err;
          }

          // أطلق النموذج الاحتياطي فوراً بالتوازي دون انتظار إعادة المحاولة أو المؤقت التخميني
          if (onEarlyError) {
            onEarlyError();
          }

          const errStr = JSON.stringify(err?.message || err || '');
          const status = err?.status || err?.code;
          const is503 =
            status === 503 ||
            status === 429 ||
            errStr.includes('503') ||
            errStr.includes('429') ||
            errStr.includes('high demand') ||
            errStr.includes('RESOURCE_EXHAUSTED') ||
            errStr.includes('UNAVAILABLE');

          // 2) إعادة المحاولة عند 503 مرة واحدة فقط وبانتظار 400ms
          if (is503 && attempt === 0) {
            attempt++;
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }

          throw err;
        }
      }
      throw new Error(`فشل النموذج ${model} بعد استنفاد المحاولات`);
    };

    // 3) النماذج بالتوازي بدل التتابع: عند فشل النموذج الأول أو تأخره أكثر من ثانيتين، أطلق النموذج البديل بالتوازي واستخدم أول رد ناجح وألغِ الباقي
    const abortState = { aborted: false };
    const winningResult = await new Promise<{ response: any; model: string; durationMs: number }>(
      (resolve, reject) => {
        let completedCount = 0;
        let hasResolved = false;

        // سقف الأمان الإجمالي 12 ثانية لجميع نماذج ومحاولات Gemini API
        const safetyCeilingTimer = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            abortState.aborted = true;
            reject(new Error('تجاوزت مهلة سقف الأمان لـ Gemini API (12 ثانية)'));
          }
        }, 12000);

        const clientAbortHandler = () => {
          if (!hasResolved) {
            hasResolved = true;
            abortState.aborted = true;
            clearTimeout(safetyCeilingTimer);
            reject(new Error('أغلق العميل الاتصال'));
          }
        };
        if (clientAbortController.signal.aborted) {
          clientAbortHandler();
        } else {
          clientAbortController.signal.addEventListener('abort', clientAbortHandler, { once: true });
        }

        const launchModel = (idx: number) => {
          if (idx >= candidateModels.length || hasResolved || clientAbortController.signal.aborted) return;
          const currentModel = candidateModels[idx];
          let nextLaunched = false;
          let speculativeTimer: any;

          const triggerNext = () => {
            if (!nextLaunched && idx + 1 < candidateModels.length && !hasResolved && !clientAbortController.signal.aborted) {
              nextLaunched = true;
              launchModel(idx + 1);
            }
          };

          // إتاحة ثانيتين للنموذج الأول قبل إطلاق النموذج البديل بالتوازي (دون إلغاء الأول) لضمان عدم السقوط في المحرك المحلي
          speculativeTimer = setTimeout(triggerNext, 2000);

          callSingleModel(currentModel, abortState, triggerNext)
            .then((result) => {
              clearTimeout(speculativeTimer);
              if (!hasResolved) {
                hasResolved = true;
                abortState.aborted = true;
                clearTimeout(safetyCeilingTimer);
                resolve(result);
              }
            })
            .catch(() => {
              clearTimeout(speculativeTimer);
              triggerNext();
              completedCount++;
              if (completedCount === candidateModels.length && !hasResolved) {
                clearTimeout(safetyCeilingTimer);
                reject(new Error('جميع نماذج Gemini فشلت أو تجاوزت المهلة المحددة.'));
              }
            });
        };

        launchModel(0);
      }
    );

    const response = winningResult.response;
    const parsed = extractCleanJson(response.text || '{}');
    parsed.agent_name = parsed.agent_name || advisorName;
    parsed.reasoning = parsed.reasoning || '';
    parsed.summary = parsed.summary || '';
    parsed.advice = parsed.advice || '';
    parsed.score = parsed.score !== undefined ? parsed.score : effectiveScore;
    // لا تُغلق المحطة تلقائياً أبداً إلا إذا طلب المستخدم الاعتماد صراحة
    parsed.station_completed = Boolean(isEvaluationSession) && Boolean(isAdoptionIntent);
    if (forcedIncomplete || isContinueIntent) {
      parsed.station_completed = false;
    }
    if (!parsed.station_completed && typeof parsed.reply === 'string') {
      parsed.reply = parsed.reply
        .replace(/✨?\s*\*?\*?تم اعتماد تقييم[^\n]*\*?\*?/gi, '')
        .replace(/تم اعتماد تقييمك[^\n.]*[.!؟]?/gi, '')
        .trim();
    }

    if (!parsed.reply && (parsed.advice || parsed.summary)) {
      parsed.reply = parsed.advice || parsed.summary;
    }

    // 3) كحماية إضافية: إذا فُرض station_completed=false والرد يحتوي عبارات الإنهاء (أتممنا، انتهت المحطة، اكتملت)، أعد توليد الرد مرة واحدة مع تعليمة صريحة بعدم الإنهاء
    if (forcedIncomplete && (completionPhrasesRegex.test(parsed.reply || '') || completionPhrasesRegex.test(parsed.advice || ''))) {
      console.warn(`[Advisor Chat] رُصدت عبارات إنهاء مع فرض station_completed=false في رد Gemini (stationTurnCount=${stationTurnCount}). إعادة توليد الرد مرة واحدة بتعليمة صريحة بعدم الإنهاء...`);
      try {
        const retryInstruction = `${systemInstruction}

⚠️ تنبيه إلزامي صارم بخصوص إعادة التوليد:
الرد السابق الذي تم توليده احتوى خطأً على عبارة إنهاء للمحطة (مثل "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت")، بينما المحطة لم تكتمل بعد وما زلنا في مرحلة الاستكشاف قبل الرسالة الثالثة (عدد التبادلات الحالية: ${stationTurnCount}).
- لا تقل أبداً في ردك "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة" أو أي عبارة ختامية.
- اجعل "station_completed": false حتماً.
- إذا كان المستفيد قد طرح سؤالاً، أجب عليه باحتواء ووضوح أولاً.
- اختم ردك حتماً بطرح سؤال تشخيصي جديد وموجه لاستكشاف زاوية أخرى في (${stationTitle}) لتعميق فهم حالة المستفيد.`;

        const retryConfig = {
          ...requestConfig,
          systemInstruction: retryInstruction,
        };

        const retryResponse = await ai.models.generateContent({
          model: winningResult.model,
          contents,
          config: retryConfig,
        });

        if (retryResponse.text) {
          const reParsed = extractCleanJson(retryResponse.text);
          if (reParsed && (reParsed.reply || reParsed.advice)) {
            parsed.reply = reParsed.reply || reParsed.advice;
            if (reParsed.reasoning) parsed.reasoning = reParsed.reasoning;
            if (reParsed.summary) parsed.summary = reParsed.summary;
            if (reParsed.advice) parsed.advice = reParsed.advice;
            if (reParsed.score !== undefined) parsed.score = reParsed.score;
            if (Array.isArray(reParsed.actionSteps)) parsed.actionSteps = reParsed.actionSteps;
            if (reParsed.reflectionQuestion) parsed.reflectionQuestion = reParsed.reflectionQuestion;
            parsed.station_completed = false;
          }
        }
      } catch (retryErr: any) {
        console.error('[Advisor Chat] تعذرت إعادة توليد الرد عبر Gemini:', retryErr?.message || retryErr);
      }

      // تنظيف نهائي إن بقيت أي عبارة إنهاء
      if (completionPhrasesRegex.test(parsed.reply || '')) {
        parsed.reply = (parsed.reply || '')
          .replace(/(?:وبهذا\s+)?(?:نكون\s+قد\s+)?(?:أتممنا|انتهت|اكتملت|أنهينا|ختمنا)\s+(?:هذه\s+)?المحطة[^\n.]*[.\n]?/gi, '')
          .replace(/(?:وبهذا\s+)?(?:نكون\s+قد\s+)?(?:أتممنا|أنهينا|ختمنا)\s+(?:تقييم\s+)?هذا\s+الجانب[^\n.]*[.\n]?/gi, '')
          .replace(/(?:دعنا\s+)?ننتقل\s+(?:الآن\s+)?(?:إلى|ل)المحطة\s+التالية[^\n.]*[.\n]?/gi, '')
          .replace(/أتممنا\s+المحطة[^\n.]*[.\n]?/gi, '')
          .replace(/انتهت\s+المحطة[^\n.]*[.\n]?/gi, '')
          .replace(/اكتملت\s+المحطة[^\n.]*[.\n]?/gi, '')
          .trim();
        if (!/[؟?]/.test(parsed.reply)) {
          parsed.reply += `\n\n🌿 ولنواصل استكشاف هذا الجانب بعمق: ما أكبر عائق أو تفصيل ترغب في مشاركته معي هنا؟`;
        }
      }
    }
    parsed.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    parsed.challenges = Array.isArray(parsed.challenges) ? parsed.challenges : [];
    if (!parsed.reply && (parsed.advice || parsed.summary)) {
      parsed.reply = parsed.advice || parsed.summary;
    }

    // رابعاً وثالثاً وخامساً: فصل الحوار عن التقييم الموحد
    if (isFreeConsultation) {
      parsed.station_completed = false;
      parsed.strengths = [];
      parsed.challenges = [];
      parsed.score = null;
      parsed.reply = stripAccidentalScoreMentions(
        enforceAntiRepeatOnReply(
          sanitizeAdvisorReply(parsed.reply || '', false),
          false,
          0
        )
      );
      if (Array.isArray(parsed.actionSteps)) {
        parsed.actionSteps = parsed.actionSteps
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .slice(0, 3);
      }
    } else if (isEarlyDialogueTurn) {
      parsed.station_completed = false;
      parsed.strengths = [];
      parsed.challenges = [];
      parsed.score = null;
      parsed.reply = stripAccidentalScoreMentions(
        enforceAntiRepeatOnReply(
          sanitizeAdvisorReply(parsed.reply || '', false),
          false,
          0
        )
      );
    } else if (isThirdOrLaterTurn && evalToolPromise) {
      const evalOutcome = await evalToolPromise;
      if (evalOutcome.needsClarification || evalOutcome.score === null) {
        parsed.score = null;
        parsed.station_completed = false;
        parsed.needsClarification = true;
        parsed.turnIncremented = false;
        parsed.evaluationSource = evalOutcome.source;
        parsed.reply = evalOutcome.fallbackMessage || MEANINGLESS_INPUT_PROMPT_AR;
        parsed.strengths = [];
        parsed.challenges = [];
        parsed.source = 'gemini';
        return res.json(parsed);
      }
      parsed.score = evalOutcome.score;
      parsed.evaluationMetrics = evalOutcome.metrics;
      parsed.evaluationSource = evalOutcome.source;
      parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyUserOnlyTexts);
      parsed.reply = syncReplyScoreWithCanonicalScore(
        enforceAntiRepeatOnReply(
          sanitizeAdvisorReply(stripAccidentalScoreMentions(parsed.reply || ''), parsed.station_completed),
          Boolean(parsed.station_completed),
          parsed.score
        ),
        parsed.score
      );
      if (
        parsed.station_completed ||
        parsed.score >= 7.5 ||
        /(?:البدء\s*بخطوة\s*عملية\s*واحدة\s*(?:صغيرة|محددة)|تعالج\s*التحدي)/i.test(parsed.advice || '')
      ) {
        parsed.advice = synthesizeGoldenRecommendation({
          areaId: agentKey,
          userTexts: [...historyUserOnlyTexts, message],
          userProfile: effectiveUserProfile,
          score: parsed.score,
          advisorCandidate: parsed.advice,
        });
      }
    } else {
      const rawModelScore = parsed.score !== undefined ? parsed.score : effectiveScore;
      parsed.score = processAndReconcileScore(rawModelScore, userSelfScore, message, historyUserOnlyTexts, effectiveScore);
      parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyUserOnlyTexts);
      parsed.reply = syncReplyScoreWithCanonicalScore(
        enforceAntiRepeatOnReply(
          sanitizeAdvisorReply(stripAccidentalScoreMentions(parsed.reply || ''), parsed.station_completed),
          Boolean(parsed.station_completed),
          parsed.score
        ),
        parsed.score
      );
      if (
        parsed.station_completed ||
        parsed.score >= 7.5 ||
        /(?:البدء\s*بخطوة\s*عملية\s*واحدة\s*(?:صغيرة|محددة)|تعالج\s*التحدي)/i.test(parsed.advice || '')
      ) {
        parsed.advice = synthesizeGoldenRecommendation({
          areaId: agentKey,
          userTexts: [...historyUserOnlyTexts, message],
          userProfile: effectiveUserProfile,
          score: parsed.score,
          advisorCandidate: parsed.advice,
        });
      }
    }

    if (parsed.advice) parsed.advice = sanitizeArabicGrammarAndMorphology(parsed.advice);
    if (parsed.summary) parsed.summary = sanitizeArabicGrammarAndMorphology(parsed.summary);
    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    } else if (Array.isArray(parsed.actionSteps)) {
      parsed.actionSteps = parsed.actionSteps.map((s: any) =>
        typeof s === 'string' ? sanitizeArabicGrammarAndMorphology(s) : s
      );
    }
    const nextRoundNumGemini = Math.max(1, (typeof stationTurnCount === 'number' ? stationTurnCount : 0) + 2);
    parsed.suggestedReplies = generateDynamicQuickSuggestions({
      domainId: agentKey,
      roundNumber: nextRoundNumGemini,
      lastUserMessage: message,
      advisorReply: parsed.reply || '',
      userProfile: effectiveUserProfile,
      previousChips: Array.isArray(req.body.previousSuggestions) ? req.body.previousSuggestions : [],
      userHistory: historyMsgTexts,
      aiSuggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : [],
    });
    // 3) إضافة حقل source: "gemini"
    parsed.source = 'gemini';
    advisorChatCache.set(chatCacheKey, { data: parsed, timestamp: Date.now() });
    return res.json(parsed);
  } catch (error: any) {
    if (clientAbortController.signal.aborted) {
      console.log('[Advisor Chat] تم إيقاف الطلب بعد إغلاق اتصال العميل.');
      return;
    }
    console.warn('[Advisor Chat] تعذر إتمام الرد عبر Gemini، فحص مزود Groq الاحتياطي...', error?.message || error);

    // 1) استخدام متغيرات البيئة GROQ_API_KEY و GROQ_MODEL (الافتراضي llama-3.3-70b-versatile) دون كتابة أي مفتاح
    const groqApiKey = GROQ_API_KEY;
    if (groqApiKey && !clientAbortController.signal.aborted) {
      const groqModel = GROQ_MODEL || 'llama-3.3-70b-versatile';
      const groqStart = Date.now();

      try {
        const groqMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

        // 2) استدعاء Groq بنفس systemInstruction وآخر 12 رسالة من history، مع response_format: { type: "json_object" }
        const groqSystemPrompt = `${systemInstruction || ''}

IMPORTANT: You must respond in valid JSON format with all text fields written strictly in Arabic (العربية الدافئة الواضحة) using the following fields:
{
  "agent_name": "${advisorName}",
  "reasoning": "تحليل واستبصار عميق وخطوات تفكير منطقية",${isEightDomain ? '' : `\n  "score": ${effectiveScore},`}
  "summary": "ملخص الوضع",
  "advice": "نصيحة عملية سريعة وموجهة",
  "reply": "نص الرد الحواري المشخصن والتفاعلي المباشر من المستشار باللغة العربية",
  "actionSteps": ["خطوة عملية أولى", "خطوة عملية ثانية"],
  "reflectionQuestion": "سؤال تأملي ذكي للمستفيد باللغة العربية",
  "station_completed": false,
  "strengths": ["نقاط القوة"],
  "challenges": ["فرصة تطوير من كلامه"],
  "suggestedReplies": ["رد سريع مخصص ١ يبني على إجابة المستخدم", "رد سريع مخصص ٢", "رد سريع مخصص ٣"]
}`;

        groqMessages.push({ role: 'system', content: groqSystemPrompt });

        const recentHistory = Array.isArray(history) ? history.slice(-40) : [];
        for (const h of recentHistory) {
          if (!h) continue;
          const role =
            h.role === 'model' || h.role === 'advisor' || h.sender === 'advisor' || h.sender === 'model'
              ? 'assistant'
              : 'user';

          let text = '';
          if (typeof h === 'string') text = h;
          else if (typeof h.content === 'string') text = h.content;
          else if (typeof h.text === 'string') text = h.text;
          else if (Array.isArray(h.parts) && h.parts.length > 0) {
            text = h.parts
              .map((p: any) => (typeof p === 'string' ? p : p?.text || ''))
              .filter(Boolean)
              .join('\n');
          }
          text = text.trim();
          if (!text) continue;

          groqMessages.push({ role, content: text });
        }

        groqMessages.push({ role: 'user', content: String(message || '').trim() });

        const groqCall = fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: clientAbortController.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            response_format: { type: 'json_object' },
            temperature: 0.6,
          }),
        });

        const groqTimeoutPromise = new Promise<globalThis.Response>((_, reject) =>
          setTimeout(() => reject(new Error('مهلة استجابة مزود Groq (5 ثوانٍ) تجاوزت الحد المسموح')), 5000)
        );

        const groqRes: globalThis.Response = await Promise.race([groqCall, groqTimeoutPromise]);

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          throw new Error(`Groq API error ${groqRes.status}: ${errText}`);
        }

        const groqData = await groqRes.json();
        const contentStr = groqData.choices?.[0]?.message?.content || '{}';
        const parsed = extractCleanJson(contentStr);

        const durationMs = Date.now() - groqStart;
        // 5) اطبع في Logs اسم المزوّد وزمن الاستجابة بالمللي ثانية
        console.log(`[Advisor Chat] استجاب مزود Groq (${groqModel}) بنجاح في ${durationMs}ms`);

        // 3) تحويل الرد إلى نفس الشكل المتوقع
        parsed.agent_name = parsed.agent_name || advisorName;
        parsed.reasoning = parsed.reasoning || '';
        parsed.summary = parsed.summary || '';
        parsed.advice = parsed.advice || '';
        parsed.score = parsed.score !== undefined ? parsed.score : effectiveScore;
        parsed.station_completed = Boolean(isEvaluationSession) && Boolean(isAdoptionIntent);

        if (forcedIncomplete || isContinueIntent) {
          parsed.station_completed = false;
        }
        if (!parsed.station_completed && typeof parsed.reply === 'string') {
          parsed.reply = parsed.reply
            .replace(/✨?\s*\*?\*?تم اعتماد تقييم[^\n]*\*?\*?/gi, '')
            .replace(/تم اعتماد تقييمك[^\n.]*[.!؟]?/gi, '')
            .trim();
        }

        if (!parsed.reply && (parsed.advice || parsed.summary)) {
          parsed.reply = parsed.advice || parsed.summary;
        }

        // 3) كحماية إضافية: إذا فُرض station_completed=false والرد يحتوي عبارات الإنهاء (أتممنا، انتهت المحطة، اكتملت)، أعد توليد الرد مرة واحدة مع تعليمة صريحة بعدم الإنهاء
        if (forcedIncomplete && (completionPhrasesRegex.test(parsed.reply || '') || completionPhrasesRegex.test(parsed.advice || ''))) {
          console.warn(`[Advisor Chat] رُصدت عبارات إنهاء مع فرض station_completed=false في رد Groq (stationTurnCount=${stationTurnCount}). إعادة توليد الرد مرة واحدة بتعليمة صريحة بعدم الإنهاء...`);
          try {
            const retryGroqMessages = [...groqMessages];
            retryGroqMessages.push({
              role: 'system',
              content: `⚠️ تنبيه تصحيحي إلزامي عاجل:
الرد السابق احتوى خطأً على عبارة إنهاء للمحطة (مثل "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت") بينما المحطة لم تكتمل بعد وما زلنا في مرحلة الاستكشاف قبل الرسالة الثالثة (عدد التبادلات الحالية: ${stationTurnCount}).
- لا تقل أبداً في ردك "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة".
- اجعل "station_completed": false حتماً.
- إذا سأل المستفيد أجب على سؤاله باحتواء أولاً.
- اختم ردك بطرح سؤال تشخيصي جديد وموجه في (${stationTitle}) لتعميق فهم حالة المستفيد.`,
            });

            const retryGroqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              signal: clientAbortController.signal,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${groqApiKey}`,
              },
              body: JSON.stringify({
                model: groqModel,
                messages: retryGroqMessages,
                response_format: { type: 'json_object' },
                temperature: 0.6,
              }),
            });

            if (retryGroqRes.ok) {
              const retryGroqData = await retryGroqRes.json();
              const retryContent = retryGroqData.choices?.[0]?.message?.content;
              if (retryContent) {
                const reParsed = JSON.parse(retryContent);
                if (reParsed && (reParsed.reply || reParsed.advice)) {
                  parsed.reply = reParsed.reply || reParsed.advice;
                  if (reParsed.reasoning) parsed.reasoning = reParsed.reasoning;
                  if (reParsed.summary) parsed.summary = reParsed.summary;
                  if (reParsed.advice) parsed.advice = reParsed.advice;
                  if (reParsed.score !== undefined) parsed.score = reParsed.score;
                  if (Array.isArray(reParsed.actionSteps)) parsed.actionSteps = reParsed.actionSteps;
                  if (reParsed.reflectionQuestion) parsed.reflectionQuestion = reParsed.reflectionQuestion;
                  parsed.station_completed = false;
                }
              }
            }
          } catch (retryGroqErr: any) {
            console.error('[Advisor Chat] تعذرت إعادة توليد الرد عبر Groq:', retryGroqErr?.message || retryGroqErr);
          }

          if (completionPhrasesRegex.test(parsed.reply || '')) {
            parsed.reply = (parsed.reply || '')
              .replace(/(?:وبهذا\s+)?(?:نكون\s+قد\s+)?(?:أتممنا|انتهت|اكتملت|أنهينا|ختمنا)\s+(?:هذه\s+)?المحطة[^\n.]*[.\n]?/gi, '')
              .replace(/(?:وبهذا\s+)?(?:نكون\s+قد\s+)?(?:أتممنا|أنهينا|ختمنا)\s+(?:تقييم\s+)?هذا\s+الجانب[^\n.]*[.\n]?/gi, '')
              .replace(/(?:دعنا\s+)?ننتقل\s+(?:الآن\s+)?(?:إلى|ل)المحطة\s+التالية[^\n.]*[.\n]?/gi, '')
              .replace(/أتممنا\s+المحطة[^\n.]*[.\n]?/gi, '')
              .replace(/انتهت\s+المحطة[^\n.]*[.\n]?/gi, '')
              .replace(/اكتملت\s+المحطة[^\n.]*[.\n]?/gi, '')
              .trim();
            if (!/[؟?]/.test(parsed.reply)) {
              parsed.reply += `\n\n🌿 ولنواصل استكشاف هذا الجانب بعمق: ما أكبر عائق أو تفصيل ترغب في مشاركته معي هنا؟`;
            }
          }
        }

        parsed.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
        parsed.challenges = Array.isArray(parsed.challenges) ? parsed.challenges : [];
        if (!parsed.reply && (parsed.advice || parsed.summary)) {
          parsed.reply = parsed.advice || parsed.summary;
        }

        // رابعاً وثالثاً وخامساً: فصل الحوار عن التقييم الموحد
        if (isFreeConsultation) {
          parsed.station_completed = false;
          parsed.strengths = [];
          parsed.challenges = [];
          parsed.score = null;
          parsed.reply = stripAccidentalScoreMentions(
            enforceAntiRepeatOnReply(
              sanitizeAdvisorReply(parsed.reply || '', false),
              false,
              0
            )
          );
          if (Array.isArray(parsed.actionSteps)) {
            parsed.actionSteps = parsed.actionSteps
              .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
              .slice(0, 3);
          }
        } else if (isEarlyDialogueTurn) {
          parsed.station_completed = false;
          parsed.strengths = [];
          parsed.challenges = [];
          parsed.score = null;
          parsed.reply = stripAccidentalScoreMentions(
            enforceAntiRepeatOnReply(
              sanitizeAdvisorReply(parsed.reply || '', false),
              false,
              0
            )
          );
        } else if (isThirdOrLaterTurn && evalToolPromise) {
          const evalOutcome = await evalToolPromise;
          if (evalOutcome.needsClarification || evalOutcome.score === null) {
            parsed.score = null;
            parsed.station_completed = false;
            parsed.needsClarification = true;
            parsed.turnIncremented = false;
            parsed.evaluationSource = evalOutcome.source;
            parsed.reply = evalOutcome.fallbackMessage || MEANINGLESS_INPUT_PROMPT_AR;
            parsed.strengths = [];
            parsed.challenges = [];
            parsed.source = 'groq';
            return res.json(parsed);
          }
          parsed.score = evalOutcome.score;
          parsed.evaluationMetrics = evalOutcome.metrics;
          parsed.evaluationSource = evalOutcome.source;
          parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyUserOnlyTexts);
          parsed.reply = syncReplyScoreWithCanonicalScore(
            enforceAntiRepeatOnReply(
              sanitizeAdvisorReply(stripAccidentalScoreMentions(parsed.reply || ''), parsed.station_completed),
              Boolean(parsed.station_completed),
              parsed.score
            ),
            parsed.score
          );
          if (
            parsed.station_completed ||
            parsed.score >= 7.5 ||
            /(?:البدء\s*بخطوة\s*عملية\s*واحدة\s*(?:صغيرة|محددة)|تعالج\s*التحدي)/i.test(parsed.advice || '')
          ) {
            parsed.advice = synthesizeGoldenRecommendation({
              areaId: agentKey,
              userTexts: [...historyUserOnlyTexts, message],
              userProfile: effectiveUserProfile,
              score: parsed.score,
              advisorCandidate: parsed.advice,
            });
          }
        } else {
          const rawGroqScore = parsed.score !== undefined ? parsed.score : effectiveScore;
          parsed.score = processAndReconcileScore(rawGroqScore, userSelfScore, message, historyUserOnlyTexts, effectiveScore);
          parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyUserOnlyTexts);
          parsed.reply = syncReplyScoreWithCanonicalScore(
            enforceAntiRepeatOnReply(
              sanitizeAdvisorReply(stripAccidentalScoreMentions(parsed.reply || ''), parsed.station_completed),
              Boolean(parsed.station_completed),
              parsed.score
            ),
            parsed.score
          );
          if (
            parsed.station_completed ||
            parsed.score >= 7.5 ||
            /(?:البدء\s*بخطوة\s*عملية\s*واحدة\s*(?:صغيرة|محددة)|تعالج\s*التحدي)/i.test(parsed.advice || '')
          ) {
            parsed.advice = synthesizeGoldenRecommendation({
              areaId: agentKey,
              userTexts: [...historyUserOnlyTexts, message],
              userProfile: effectiveUserProfile,
              score: parsed.score,
              advisorCandidate: parsed.advice,
            });
          }
        }

        if (parsed.advice) parsed.advice = sanitizeArabicGrammarAndMorphology(parsed.advice);
        if (parsed.summary) parsed.summary = sanitizeArabicGrammarAndMorphology(parsed.summary);
        if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
          if (parsed.advice) parsed.actionSteps = [parsed.advice];
          else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
          else parsed.actionSteps = [];
        } else if (Array.isArray(parsed.actionSteps)) {
          parsed.actionSteps = parsed.actionSteps.map((s: any) =>
            typeof s === 'string' ? sanitizeArabicGrammarAndMorphology(s) : s
          );
        }

        const nextRoundNumGroq = Math.max(1, (typeof stationTurnCount === 'number' ? stationTurnCount : 0) + 2);
        parsed.suggestedReplies = generateDynamicQuickSuggestions({
          domainId: agentKey,
          roundNumber: nextRoundNumGroq,
          lastUserMessage: message,
          advisorReply: parsed.reply || '',
          userProfile: effectiveUserProfile,
          previousChips: Array.isArray(req.body.previousSuggestions) ? req.body.previousSuggestions : [],
          userHistory: historyMsgTexts,
          aiSuggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : [],
        });

        // 3) أضف source: "groq"
        parsed.source = 'groq';
        advisorChatCache.set(chatCacheKey, { data: parsed, timestamp: Date.now() });
        return res.json(parsed);
      } catch (groqErr: any) {
        const durationMs = Date.now() - groqStart;
        console.error(`[Advisor Chat] فشل مزود Groq (${groqModel}) بعد ${durationMs}ms:`, groqErr?.message || groqErr);
      }
    }

    if (clientAbortController.signal.aborted) {
      console.log('[Advisor Chat] ألغى العميل الاتصال، تم تخطي المحرك المحلي.');
      return;
    }

    // 4) لا تستخدم المحرك المحلي إلا إذا فشل Gemini وGroq معاً
    console.warn('[Advisor Chat] تم اللجوء إلى المحرك المحلي بعد تعذر Gemini وGroq.');
    const localFallback = generateLocalAgentResponse(
      agentKey,
      message || '',
      effectiveUserProfile?.name || userName || 'عزيزي',
      advisor,
      isEightDomain && !isAdoptionIntent ? 0 : (isEvaluationMode ? (userSelfScore ?? effectiveScore) : (isAcuteIsolationContext ? effectiveScore : (userScore || effectiveScore || 5))),
      isEvaluationSession,
      evaluationStep,
      evaluationQuestionTitle,
      assessmentMode,
      stationTurnCount,
      effectiveUserProfile,
      Array.isArray(req.body.previousSuggestions) ? req.body.previousSuggestions : [],
      historyMsgTexts,
      Boolean(isEditedOrResent),
      historyUserOnlyTexts
    );
    if (isFreeConsultation) {
      (localFallback as any).score = null;
      (localFallback as any).station_completed = false;
      (localFallback as any).reply = stripAccidentalScoreMentions(
        String((localFallback as any).reply || '')
      );
      const stepsRaw = Array.isArray((localFallback as any).actionSteps)
        ? (localFallback as any).actionSteps.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];
      if (stepsRaw.length === 0 && (localFallback as any).advice) {
        (localFallback as any).actionSteps = [String((localFallback as any).advice)];
      } else {
        (localFallback as any).actionSteps = stepsRaw.slice(0, 3);
      }
    } else if (isEarlyDialogueTurn || (localFallback as any).skipTurnIncrement) {
      (localFallback as any).score = null;
    } else if (isAdoptionIntent && offeredScoreFromLastAdvisor !== null) {
      (localFallback as any).score = offeredScoreFromLastAdvisor;
    }
    // 3) إضافة حقل source: "local-fallback" (لا نُخزّن الردود الاحتياطية في الذاكرة المؤقتة حتى نُعطي Gemini الأولوية في المرة القادمة)
    (localFallback as any).source = 'local-fallback';
    return res.json(localFallback);
  }
});

// Helper: Extract user-proposed concrete habit/plan and non-contradictory insights from full station dialogue
export function buildConversationAwareStationSummary(
  agentKey: string,
  stationTitle: string,
  history: any[],
  userScore?: number,
  userProfile?: any
): {
  strengths: string[];
  challenges: string[];
  goldenRecommendation: string;
  source: 'fallback';
} {
  const userUtterances: string[] = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h) continue;
      const role = h.role || h.sender;
      if (role !== 'user') continue;
      const text = String(h.content || h.text || '').trim();
      if (!text || isConfirmationOrMetaUtterance(text)) continue;
      userUtterances.push(text);
    }
  }

  const allUserText = userUtterances.join(' ').trim();
  const numericScore = typeof userScore === 'number' && !isNaN(userScore) ? userScore : 6;

  const goldenRecommendation = synthesizeGoldenRecommendation({
    areaId: agentKey,
    userTexts: userUtterances,
    userProfile,
    score: numericScore,
  });

  const grounded = extractGroundedStrengthsAndChallenges(
    agentKey,
    stationTitle,
    userUtterances,
    numericScore
  );

  // تعزيز نقاط القوة والاتساق التام مع الشكوى
  const isSocialStruggle = /(فتور|انعزال|عزلة|وحيد|وحدة|قطيعة|انقطاع|قلة\s*تواصل|مقص[ّ]?ر\s*مع\s*أصدق|انطواء|تراجع\s*(?:في\s*)?التواصل)/i.test(allUserText);
  const rawStrengths: string[] =
    agentKey === 'social' && isSocialStruggle
      ? ['الوعي بأهمية الأصدقاء المقربين والرغبة في تنظيم وقت التواصل', ...grounded.strengths]
      : grounded.strengths;

  const strengths = sanitizeStrengths(rawStrengths, allUserText, userUtterances);
  const challenges = grounded.challenges;

  return {
    strengths: Array.from(new Set(strengths)).slice(0, 3),
    challenges: Array.from(new Set(challenges)).slice(0, 3),
    goldenRecommendation,
    source: 'fallback',
  };
}

// Endpoint: Station Completion Summary (Achievement Card & Golden Recommendation via Full Station History)
advisorChatRouter.post('/station-summary', async (req: Request, res: Response) => {
  const clientAbortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      clientAbortController.abort();
    }
  });

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'بيانات الطلب غير صالحة.' });
  }

  const { advisor, agentKey: rawAgentKey, userProfile, userName, score, history } = req.body;
  const agentKey = rawAgentKey || (typeof advisor === 'string' ? advisor : advisor?.id) || 'spiritual';
  const defaultMeta = AGENT_INFO_MAP[agentKey] || {
    name: 'مستشار وزان',
    role: 'مستشار توازن الحياة',
  };
  const stationTitleMap: Record<string, string> = {
    spiritual: 'الجانب الروحي والسكينة',
    financial: 'الجانب المالي والاستقلال',
    career: 'الجانب المهني والوظيفي',
    personal: 'الجانب الشخصي والوعي بالذات',
    learning: 'الجانب التعليمي والمعرفي',
    family: 'الجانب الأسري والعائلي',
    social: 'الجانب الاجتماعي والعلاقات',
    health: 'الجانب الصحي والبدني',
  };
  const advisorName = (advisor && typeof advisor === 'object' && advisor.name) ? advisor.name : defaultMeta.name;
  const stationTitle = (advisor && typeof advisor === 'object' && advisor.title)
    ? advisor.title
    : (stationTitleMap[agentKey] || defaultMeta.role);

  const safeHistory = Array.isArray(history) ? history.slice(-40) : [];
  const historyTexts: string[] = [];
  const transcriptLines: string[] = [];

  for (const h of safeHistory) {
    if (!h) continue;
    const role = h.role || h.sender;
    const content = String(h.content || h.text || '').trim();
    if (!content) continue;
    const label = role === 'model' || role === 'advisor' ? `المستشار (${advisorName})` : 'المستفيد';
    transcriptLines.push(`${label}: ${content}`);
    if (role === 'user' && !isConfirmationOrMetaUtterance(content)) {
      historyTexts.push(content);
    }
  }

  const allUserText = historyTexts.join(' ');
  const deterministicFallback = buildConversationAwareStationSummary(agentKey, stationTitle, safeHistory, Number(score), userProfile);
  const deterministicGoals = generateRealisticAreaGoals({
    areaId: agentKey as any,
    userTexts: historyTexts,
    userProfile,
    score: Number(score) || 6,
    goldenRecommendation: deterministicFallback.goldenRecommendation,
    challenges: deterministicFallback.challenges,
    strengths: deterministicFallback.strengths,
  });

  if (!GEMINI_API_KEY || transcriptLines.length === 0) {
    return res.json({
      ...deterministicFallback,
      suggestedGoals: deterministicGoals,
    });
  }

  const summaryCtx = parseUserContext(userProfile, userName);
  const summaryInstruction = `
أنت "${advisorName}" في منصة وزان، ومهمتك الآن توليد بطاقة الإنجاز وملخص نهاية محطة "${stationTitle}" بناءً على سجل المحادثة الكامل أدناه.

سياق المستفيد:
- الاسم: ${summaryCtx.name}
- حالة العمل: ${summaryCtx.workStatus}
${summaryCtx.ageGroup ? `- الفئة العمرية: ${summaryCtx.ageGroup}` : ''}
- المعالون: ${summaryCtx.dependentsLabel}
${summaryCtx.incomeStability ? `- استقرار الدخل: ${summaryCtx.incomeStability}` : ''}
${summaryCtx.incomeSource ? `- مصدر الدخل: ${summaryCtx.incomeSource}` : ''}
- الدرجة المعتمدة: ${score ?? 'غير محددة'}/10

⚠️ تعليمات صارمة وملزمة لا يجوز مخالفتها:
1. التوصية العلاجية الذهبية (goldenRecommendation):
   - استخلص الفكرة أو التحدي أو العادة أو فرصة النمو التي وردت في حوار المستخدم، واصغها كخطوة عملية واحدة محددة ومختصرة بأسلوب "${advisorName}" (12 إلى 24 كلمة).
   - إذا كانت الدرجة المعتمدة مرتفعة (7.5 فأعلى)، فخصّص التوصية لتعكس فرص النمو والارتقاء التي نوقشت في الحوار (مثل استكمال صندوق الطوارئ من 4 إلى 6 أشهر وتوجيه جزء من الفائض لاستثمار طويل المدى) بدلاً من العبارات العامة الخاصة بمعالجة التحديات.
   - يُمنع تماماً نسخ رسالة المستخدم حرفياً أو اقتباسها أو استخدام عبارة عامة مثل "البدء بخطوة عملية واحدة صغيرة ومحددة تعالج التحدي" أو "تطبيق الخطة التي اقترحتها في الحوار".
   - يجب أن تناسب الدرجة المعتمدة (${score ?? 'غير محددة'}/10) وسياق المستفيد (${summaryCtx.workStatus}).
2. نقاط القوة (strengths - من 2 إلى 3 نقاط):
   - استخرج نقاط قوة حقيقية ومحددة من كلام المستخدم وعاداته الفعلية (⛔ ممنوع القوالب المعلبة المكررة مثل: "الوضوح والصراحة في تشخيص واقع...").
   - ⛔ يُمنع منعاً باتاً كتابة نقاط قوة تتعارض مع شكوى المستخدم.
3. التحدي الجوهري (challenges - من 2 إلى 3 نقاط):
   - صف المشكلة أو العائق الفعلي الذي يعاني منه المستخدم بدقة ووضوح فقط (⛔ ممنوع وضع الحل أو التوصية العلاجية داخل حقل التحديات!).
4. الأهداف العملية للجانب (suggestedGoals - من 2 إلى 3 أهداف قصيرة):
   - ⛔ يُمنع التناقض المباشر مع ظروف المستخدم (مثلاً: إذا ذكر العمل 12 ساعة والنوم 4 ساعات، يُمنع اقتراح النوم 7 ساعات عند 11 مساءً؛ اقترح خطوة تدريجية واقعية تناسب دوامه).
   - ⛔ يُمنع اختلاق ديون أو بطاقات ائتمان أو مبالغ مالية أو زيارات أو أشخاص (أبناء/زوج) لم يردوا في السياق أو الحوار.
`;

  const userPrompt = `سجل المحادثة الكامل لمحطة "${stationTitle}":\n\n${transcriptLines.join('\n\n')}`;

  try {
    const modelName = GEMINI_MODEL || 'gemini-3.5-flash-lite';
    let timeoutHandle: any;
    const apiPromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: summaryInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 strengths grounded strictly in the user dialogue without contradicting any complaint',
            },
            challenges: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 improvement opportunities grounded in the user dialogue',
            },
            goldenRecommendation: {
              type: Type.STRING,
              description: 'التوصية العلاجية الذهبية: خطوة عملية واحدة مختصرة (12-24 كلمة) مصاغة بأسلوب المستشار ومبنية على سياق الحوار والدرجة، دون نسخ جملة المستخدم حرفياً',
            },
            suggestedGoals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 short, realistic goals strictly aligned with user constraints and dialogue without contradiction or fabrication',
            },
          },
          required: ['strengths', 'challenges', 'goldenRecommendation'],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Summary Gemini timeout (4500ms)')), 4500);
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    clearTimeout(timeoutHandle);

    const parsed = extractCleanJson(response?.text || '{}');
    const finalStrengths = sanitizeStrengths(
      Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : deterministicFallback.strengths,
      allUserText,
      historyTexts
    );
    const finalChallenges = Array.isArray(parsed.challenges) && parsed.challenges.length > 0
      ? parsed.challenges.map((c: any) => String(c || '').trim()).filter(Boolean)
      : deterministicFallback.challenges;
    const rawGolden = typeof parsed.goldenRecommendation === 'string' && parsed.goldenRecommendation.trim().length > 5
      ? parsed.goldenRecommendation.trim()
      : deterministicFallback.goldenRecommendation;
    const finalGolden = synthesizeGoldenRecommendation({
      areaId: agentKey,
      userTexts: historyTexts,
      userProfile,
      score: Number(score) || 6,
      advisorCandidate: rawGolden,
    });

    const finalGoals = generateRealisticAreaGoals({
      areaId: agentKey as any,
      userTexts: historyTexts,
      userProfile,
      score: Number(score) || 6,
      goldenRecommendation: Array.isArray(parsed.suggestedGoals) && parsed.suggestedGoals.length > 0
        ? String(parsed.suggestedGoals[0] || finalGolden)
        : finalGolden,
      challenges: finalChallenges,
      strengths: finalStrengths,
    });

    return res.json({
      strengths: finalStrengths.slice(0, 3),
      challenges: finalChallenges.slice(0, 3),
      goldenRecommendation: finalGolden,
      suggestedGoals: finalGoals,
      source: 'gemini',
    });
  } catch (err: any) {
    console.warn('[Station Summary] تعذر توليد الملخص عبر Gemini، استخدام الاستخلاص المحلي المرتبط بسجل الحوار:', err?.message || err);
    return res.json({
      ...deterministicFallback,
      suggestedGoals: deterministicGoals,
    });
  }
});
