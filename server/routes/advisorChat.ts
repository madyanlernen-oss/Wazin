import { Router, Request, Response } from 'express';
import { ai, Type } from '../config/ai';
import { GEMINI_API_KEY, GROQ_API_KEY, GROQ_MODEL, GEMINI_MODEL } from '../config/env';
import { AGENT_INFO_MAP } from '../config/constants';
import { loadAgentPrompt } from '../agents/agentLoader';
import { generateLocalAgentResponse } from '../agents/localAdvisorEngine';
import {
  calculateSemanticScore,
  processAndReconcileScore,
  sanitizeStrengths,
  sanitizeAdvisorReply,
} from '../middleware/validation';

export const advisorChatRouter = Router();

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
  } = req.body;

  // 1) التحقق من صحة حقل message (نص بطول بين 1 و 2000 حرف)
  if (typeof message !== 'string' || message.trim().length < 1 || message.length > 2000) {
    return res.status(400).json({
      error: 'حقل الرسالة (message) مطلوب ويجب أن يكون نصاً بطول يتراوح بين 1 و2000 حرف.',
    });
  }

  // 2) التحقق من صحة حقل history (مصفوفة أقصاها 20 عنصراً)
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history) || history.length > 20) {
      return res.status(400).json({
        error: 'سجل المحادثة (history) يجب أن يكون مصفوفة لا تتجاوز 20 عنصراً.',
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

  const effectiveUserProfile = userProfile || { name: userName || 'صديقنا' };

  // استخراج سياق المستفيد وخلفيته الحياتية (حالة العمل، الفئة العمرية، المعالون، الدخل)
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

  let systemInstruction = '';
  let advisorName = 'مستشار وزان';

  const effectiveAnswers = answers || userAnswers || {};
  const effectiveGoals = goals || userGoals || [];
  const historyMsgTexts = Array.isArray(history) ? history.map((h: any) => h.content || '') : [];
  const ratingMatchInMsg = message.match(/(?:تقييمي:?\s*)?([1-9]|10)(?:\s*(?:من|\/)\s*10)?$/i);
  const explicitRatingInMsg = ratingMatchInMsg ? parseFloat(ratingMatchInMsg[1]) : (userScore && userScore > 0 ? userScore : undefined);

  // رابعاً: استخراج التقييم الذاتي للمستخدم لضبط الدرجة النهائية بدقة
  let userSelfScore: number | undefined = explicitRatingInMsg;
  if (userSelfScore === undefined && typeof userScore === 'number' && userScore > 0) {
    userSelfScore = userScore;
  }
  if (userSelfScore === undefined && effectiveAnswers && typeof effectiveAnswers === 'object') {
    const areaAnswer = effectiveAnswers[req.body.agentKey || (typeof advisor === 'string' ? advisor : (advisor?.id || 'financial'))];
    if (typeof areaAnswer === 'number') userSelfScore = areaAnswer;
    else if (areaAnswer && typeof areaAnswer === 'object') {
      const numVal = areaAnswer.score || areaAnswer.rating;
      if (typeof numVal === 'number' && numVal > 0) userSelfScore = numVal;
    }
  }

  const semanticCalculated = calculateSemanticScore(message, historyMsgTexts, explicitRatingInMsg);
  const effectiveScore = semanticCalculated;

  // استخدام اسم الوكيل أو افتراضياً الخبير المالي
  const agentKey = req.body.agentKey || (typeof advisor === 'string' ? advisor : (advisor?.id || 'financial'));
  const defaultMeta = AGENT_INFO_MAP[agentKey] || { name: 'مستشار وزان', role: 'مستشار الحياة' };

  // قراءة تعليمات الوكيل من ملف الـ Markdown الخاص به بدقة وتجريدها من القوالب القديمة
  const agentRoleDescription = loadAgentPrompt(agentKey);

  advisorName = (advisor && typeof advisor === 'object' && advisor.name) ? advisor.name : defaultMeta.name;
  const advisorRole = (advisor && typeof advisor === 'object' && (advisor.role || advisor.title)) ? (advisor.role || advisor.title) : defaultMeta.role;

  // فحص ما إذا كان المستخدم يطلب المضي قدماً أو يقدم التزاماً/خطوة عملية
  const isMoveForwardOrCommitment = /(نصف\s+ساعة|ساعة|دقائق|دقيقة|خطوة|أمشي|امشي|مشي|تأمل|تامل|جاهز|ننتقل|نكمل|المحطة التالية|اعتمد|اعتماد|تمام|حسنا|موافق|اتفقنا)/i.test(message);
  const isUserAsking = (/[؟?]/.test(message) || /(^|\s)(كم|كيف|هل|ماذا|ليه|ليش|وش|شو|ايش|متى|ينفع|تنصحني)(\s|$)/i.test(message)) && !isMoveForwardOrCommitment;
  // إزالة القفل الصارم للتبادلات إذا قدم المستفيد خطوة أو التزاماً أو طلب المتابعة
  const forcedIncomplete = Boolean(isEvaluationSession) && (stationTurnCount < 1 && !isMoveForwardOrCommitment) && isUserAsking;
  const completionPhrasesRegex = /(أتممنا|انتهت\s+(?:هذه\s+)?المحطة|انتهينا\s+من\s+(?:هذه\s+)?المحطة|اكتملت\s+(?:هذه\s+)?المحطة|أنهينا\s+(?:هذه\s+)?المحطة|ختمنا\s+(?:هذه\s+)?المحطة|اكتمل\s+تقييم|أكملنا\s+تقييم|أتممنا\s+هذا\s+الجانب|أنهينا\s+هذا\s+الجانب|المحطة\s+التالية|ننتقل\s+(?:الآن\s+)?(?:إلى|ل)المحطة|اكتملت\s+محطة|أنجزنا\s+هذه\s+المحطة|أكملنا\s+هذه\s+المحطة|انتهت\s+هذه\s+المحطة|اكتملت\s+هذه\s+المحطة|أتممنا\s+تقييم)/i;

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
      if (key === agentKey) continue;
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
        const shortText = userSnippet.length > 65 ? userSnippet.slice(0, 62) + '...' : userSnippet;
        pastStationsSnippets.push(`- في ${label || key}: ذكر المستفيد أنه "${shortText}".`);
      }
      if (pastStationsSnippets.length >= 2) break; // سطر أو سطران فقط
    }
  }

  const pastStationsContextText = pastStationsSnippets.length > 0
    ? `\n[سياق المحطات السابقة لربط الحوار وتجنب تكرار الأسئلة (دون كشف تفاصيل الوكلاء الآخرين)]:\n${pastStationsSnippets.join('\n')}\n`
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
1. اختصاصك الحصري: أنت تتحدث بصفتك "${advisorName}"، واختصاصك الوحيد والمحصور هو (${advisorRole}) فقط، وفق ميثاقك.
2. ⛔ ممنوع منعاً باتاً:
   - ذكر أرقام المحطات أو ترتيبها (مثل: "لننتقل للجانب الرابع" أو "المحطة السابعة").
   - فتح موضوع أو طرح أسئلة تخص وكيلاً آخر (العلاقات للاجتماعي/الأسري، المال للمالي، الصحة للبدني، الروح للروحي، الوظيفة للمهني...).
3. إذا ذكر المستخدم موضوعاً خارج اختصاصك:
   - اعترف بما قاله في جملة واحدة فقط (مثال: "أقدّر أثر هذا التحدي عليك")، ثم عُد فوراً وبسلاسة إلى صميم تخصصك (${advisorRole}).
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
   - منع حلقة الأسئلة اللانهائية (Prevent Infinite Loops): إذا شارك المستخدم بالفعل وضعه الحالي، مشتتاته الرئيسية، أو خطوة تهدئة صغيرة (أو أبدى رغبته في المضي قدماً)، فتوقف عن طرح أسئلة استكشافية متكررة، وقدم انعكاساً تشخيصياً موجزاً واعرض عليه اعتماد التقييم والانتقال للخطوة التالية.
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
   - يجوز استخدام اسم الحساب «سعود المنصور» عند ملاءمة السياق بصورة طبيعية ومتباعدة فقط.
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
5. تقليل المدح والواقعية:
   - جملة تقدير واحدة قصيرة وموجزة تكفي في الرد (مثل: "أحييك على صراحتك ووعيك").
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
   - التزم بأن تكون الدرجة قريبة من تقييم المستخدم الذاتي (بفارق أقصاه ±1.0) إلا إذا ذكر أدلة واضحة على ممارسة فعلية مستمرة أو مشكلة خطيرة واقعية.
   - لا ترفع الدرجة بسبب نوايا أو خطط مستقبلية ("سأفعل"، "لن أجلد نفسي")؛ الخطط تُذكر كفرصة تطوير وليست دليل قدرة أو إنجاز قائم.
2. نقاط القوة (strengths):
   - صياغة معتدلة مبنية حصراً على ممارسة ذكرها المستخدم فعلاً في حديثه؛ لا تستخدم "عالية" أو "كامل" إلا بدليل صريح.
   - تجنب أي تناقض مع كلام المستخدم (مثل كتابة "ينتقد ذاته بلطف" وهو قال إنه يقسو على نفسه).
3. قاعدة الإجابة الخامسة والتقييم المرحلي (إلزامية):
   - بعد الإجابة الخامسة الفعلية من المستخدم (عندما stationTurnCount >= 4):
     أ) أوقف الأسئلة الاستكشافية فوراً؛ ويُمنع منعاً باتاً طرح سؤال استكشافي سادس قبل عرض التقييم وخيار المتابعة.
     ب) قدّم تقييماً مرحلياً واضحاً من 10 درجات في حقل score بناءً على الأدلة المتاحة، مع توضيح أنه تقييم مبدئي.
     ج) استخدم صيغة التخيير المعيارية الإلزامية في نص الرد (reply):
        «بعد ما شاركتني به حتى الآن، أقيّم وضعك الحالي بدرجة (X/10). هذا تقييم مبدئي مبني على المعلومات التي ذكرتها، وقد يتغير إذا واصلنا الاستكشاف.
        هل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة؟»
     د) إذا اختار المستخدم الاعتماد: ضع station_completed = true واختم بملخص وخطوة عملية مستمدة من كلامه دون أي سؤال استكشافي.
     هـ) إذا اختار المواصلة: ضع station_completed = false واستكمل بأسئلة محددة وضرورية فقط دون تكرار.
`;

  let evaluationSessionGuideline = '';
  if (isEvaluationSession) {
    evaluationSessionGuideline = `
[بروتوكول جلسة الاستشارة والتقييم الحواري التكيفي 🌿]
المستفيد يخوض جلسة استشارية تقييمية لمحطة (${advisorName})${evaluationQuestionTitle ? ` - وسؤال المحطة: "${evaluationQuestionTitle}"` : ''}.
- عدد التبادلات الحوارية التي تمت حتى الآن في هذه المحطة (stationTurnCount): ${stationTurnCount}.
- حالة إتمام المحطة: ${stationTurnCount < 4 ? `المحطة في مرحلة الاستكشاف (التبادل ${stationTurnCount + 1} من 5)، اطرح سؤالاً استكشافياً واحداً محدداً.` : `بلغ المستخدم الإجابة الخامسة؛ يجب تطبيق قاعدة التقييم المرحلي وعرض الدرجة وصيغة التخيير المعيارية دون أي سؤال استكشافي سادس ما لم يطلب المستخدم الاستمرار صراحة.`}

⚠️ توجيهات حاسمة:
1. ⛔ لا تقل أبداً "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة" إلا إذا كان station_completed يساوي true فقط!
2. عند بلوغ الإجابة الخامسة (stationTurnCount >= 4): يجب التوقف عن الاستكشاف وعرض صيغة التقييم المرحلي والتخيير بين الاعتماد أو المواصلة.
3. إذا اختار المستفيد الاعتماد (station_completed = true): اختم بتلخيص خطة صغيرة بجملتين واضحتين، ولا تطرح أي سؤال جديد!
`;
  } else {
    evaluationSessionGuideline = `
[بروتوكول جلسة الاستشارة المفتوحة المستقلة 💬]
المستفيد حالياً في غرفة الاستشارة الحرة المستمرة معك (${advisorName}).
1. ⚠️ إلزام صارم: يجب أن تكون قيمة "station_completed": false دائماً في هذه الجلسة.
2. ركز على الإجابة الاستشارية المعمقة، الإرشاد المستمر، والعصف الذهني في مجال (${advisorRole}).
`;
  }

  // استخراج سياق المستفيد وخلفيته الحياتية (حالة العمل، الفئة العمرية، المعالون، ومصادر الدخل)
  const ageGroup = (
    effectiveUserProfile?.ageGroup ||
    req.body?.ageGroup ||
    ''
  ).trim();

  const rawDependents =
    effectiveUserProfile?.hasDependents ??
    req.body?.hasDependents;

  let dependentsText = '';
  if (rawDependents === 'نعم' || rawDependents === true || rawDependents === 'yes') {
    dependentsText = 'نعم';
  } else if (rawDependents === 'لا' || rawDependents === false || rawDependents === 'no') {
    dependentsText = 'لا';
  } else if (typeof rawDependents === 'string' && rawDependents.trim()) {
    dependentsText = rawDependents.trim();
  }

  const incomeSource = (
    effectiveUserProfile?.incomeSource ||
    req.body?.incomeSource ||
    ''
  ).trim();

  const incomeStability = (
    effectiveUserProfile?.incomeStability ||
    req.body?.incomeStability ||
    ''
  ).trim();

  const userContextBlock = `
[سياق المستفيد وخلفيته الحياتية الأساسية 🎯]:
- الاسم: ${effectiveUserProfile?.name || userName || 'صديقنا'}
- حالة العمل: ${workStatus}
${ageGroup ? `- الفئة العمرية: ${ageGroup}` : ''}
${dependentsText ? `- المعالون: ${dependentsText}` : ''}
${incomeSource ? `- مصدر الدخل الأساسي: ${incomeSource}` : ''}
${incomeStability ? `- طبيعة واستقرار الدخل: ${incomeStability}` : ''}

⛔ قاعدة صارمة وملزمة في تخصيص الحوار والأسئلة والنصائح:
لا تطرح أي سؤال أو نصيحة لا تناسب حالته (مثلاً لا تسأل طالباً عن الراتب والأقساط، ولا تقدم نصائح استثمار معقدة لمن دخله مصروف، ولا تفترض دخلاً ثابتاً لمن دخله متغير أو باحث عن عمل، ولا تقدم نصائح ترقية وظيفية لمتقاعد أو طالب). وإن ذكر المستخدم ما يتعارض مع ملفه فاتبع كلامه في الحوار.
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
        if (t && t.length > 3 && !t.startsWith('مرحباً') && !t.startsWith('اهلا')) {
          userUtterancesInStation.push(t);
        }
      }
    }
  }
  if (message && message.trim().length > 3) {
    userUtterancesInStation.push(message.trim());
  }

  let stationSummaryContextText = '';
  if (userUtterancesInStation.length > 0) {
    const summaryStatements = userUtterancesInStation.slice(-3).map((s) => {
      const clean = s.length > 70 ? s.slice(0, 67) + '...' : s;
      return `  * "${clean}"`;
    });
    stationSummaryContextText = `\n[ملخص سريع لما ذكره المستفيد في هذه المحطة لربط السياق]:\n${summaryStatements.slice(-2).join('\n')}\n`;
  }

  let domainSpecificContextGuideline = '';
  if (agentKey === 'financial') {
    const isStudent = workStatus.includes('طالب');
    const isBusiness = workStatus.includes('صاحب عمل') || workStatus.includes('مستقل');
    const isJobSeeker = workStatus.includes('باحث');
    const isRetired = workStatus.includes('متقاعد');

    let specificDirectives = '';
    if (isStudent) {
      specificDirectives = `
- المستفيد طالب جامعي ويعتمد على (${incomeSource || 'مكافأة جامعية/منحة أو مصروف'}):
  * يجب أن تسأله حصراً عن كيفية إدارته للمكافأة أو المصروف وتحديات التوفيق حتى نهاية الشهر ونفقات الدراسة.
  * ركّز على تأسيس حصالة أو صندوق ادخار رمزي بسيط (50–100 ريال شهرياً) وضبط نفقات المقاهي والمستلزمات وتجنب الاقتراض.
  * ⛔ يُمنع منعاً باتاً سؤاله عن "الراتب الوظيفي" أو "قروض وشراء سيارات" أو "استثمارات عقارية معقدة" أو افتراض دخل ثابت كبير.`;
    } else if (isBusiness) {
      specificDirectives = `
- المستفيد رائد أعمال أو صاحب عمل حر بدخل (${incomeStability || 'متغير'}):
  * اسأله عن إدارة التدفق النقدي بين مواسم الوفرة والركود، وفصل أموال العمل تماماً عن المصروف الشخصي.
  * ركز على تأسيس صمام أمان مزدوج (تجاري وشخصي) لا يقل عن 6 أشهر.`;
    } else if (isJobSeeker) {
      specificDirectives = `
- المستفيد باحث عن عمل:
  * اسأله عن إدارة مصاريفه ومدخراته المتاحة (Runway) بحذر لتكفي أطول فترة دون اقتراض.
  * ⛔ لا تفترض وجود راتب أو دخل حالي.`;
    } else if (isRetired) {
      specificDirectives = `
- المستفيد متقاعد ويعتمد على المعاش التقاعدي:
  * اسأله عن كفاية المعاش، وإدارة التكاليف الصحية الطارئة، والحفاظ على رأس المال بأمان.`;
    } else {
      specificDirectives = `
- المستفيد موظف بدخل (${incomeStability || 'شهري منتظم'})${dependentsText === 'نعم' ? ' ومسؤوليات أسرية ومعالين' : ''}:
  * اسأله عن إدارة الراتب، وقاعدة 50/30/20، وصندوق الطوارئ لـ 3-6 أشهر نفقات، والتعامل مع الأقساط والالتزامات.`;
    }

    domainSpecificContextGuideline = `
[توجيه استثنائي وإلزامي للمستشار المالي (أ. كمال المالي) 💰]:
${specificDirectives}
`;
  }

  // إثراء التعليمات بسياق المستفيد وشخصية الوكيل المستقلة وأسلوب الرد المطلوب
  systemInstruction = `
${userContextBlock}
${domainSpecificContextGuideline}

${agentRoleDescription}

أنت الآن في محادثة استشارية حية بصفتك: "${advisorName}" (${advisorRole}) ضمن منصة وزان.
تحدث كشخصية واعية، حكيمة ودافئة، تفهم بذكاء الإنسان أمامها وتفكر معه بصدق ورصانة.

${modeGuideline}
${clinicSpecialGuideline}
${roleBoundariesGuideline}
${questionQualityGuideline}
${styleAndToneGuideline}
${scoringAndCompletionGuideline}
${evaluationSessionGuideline}

سياق المستفيد من منصة وزان:
- الاسم: ${effectiveUserProfile?.name || 'صديقنا'}
- حالة العمل: ${workStatus}
${ageGroup ? `- الفئة العمرية: ${ageGroup}` : ''}
${incomeSource ? `- مصدر الدخل: ${incomeSource}` : ''}
${incomeStability ? `- طبيعة الدخل: ${incomeStability}` : ''}
- الدرجة الحالية: ${effectiveScore}/10 ${userSelfScore !== undefined ? `(التقييم الذاتي للمستفيد: ${userSelfScore}/10)` : ''}
- التحديات المرصودة: ${advisor?.challenges?.join('، ') || 'لم تُحدد بعد'}
- الأهداف: ${effectiveGoals?.join('، ') || 'لم تُحدد بعد'}
- إجابات التقييم: ${JSON.stringify(effectiveAnswers)}
${pastStationsContextText}${stationSummaryContextText}
[تذكير ختامي ملزم حول عدد التبادلات والمحطة]:
- عدد التبادلات الحالية التي تمت في هذه المحطة (stationTurnCount): ${stationTurnCount}.
${forcedIncomplete ? `- ⛔ المحطة ما زالت في مرحلة التشخيص (station_completed: false حتماً): لا تقل أبداً "أتممنا المحطة" أو "انتهت المحطة"، واختم ردك بسؤال تشخيصي محدد واحد مرتبط بآخر ما قاله.` : ''}
`;

  // تطهير وبناء تسلسل المحادثة التفاعلية بما يتوافق بدقة مع متطلبات Google GenAI
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  // 5) الاقتصار على آخر 12 رسالة من history لتعميق الذاكرة الحوارية وربط السياق
  const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
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

    // اختيار النماذج العاملة والمجربة ديناميكياً مع ترتيب الأولويات ومقاومة 503/404
    const userGeminiModel = GEMINI_MODEL;
    const candidateModels = Array.from(
      new Set(
        [
          userGeminiModel,
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-3.1-flash-lite',
        ].filter(Boolean) as string[]
      )
    );

    const requestConfig = {
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
          station_completed: {
            type: Type.BOOLEAN,
            description: 'true only if the user has provided clear, sufficient answers covering their real state and the doctor is ready to finalize this station; false if the user gave a greeting, vague response, or more diagnostic exploration is needed',
          },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '1 to 3 dynamic key strengths extracted from what the user actually said in this session',
          },
          challenges: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '1 to 3 dynamic key challenges/growth areas extracted from what the user actually said in this session',
          },
        },
        required: ['reasoning', 'advice', 'reply', 'actionSteps'],
      },
      // 6) تعطيل/تقليل التفكير الداخلي لتسريع الاستجابة
      thinkingConfig: {
        thinkingBudget: 0,
      },
    };

    // 1) مهلة 10 ثوانٍ لكل استدعاء، و2) تقليل الانتظار عند 503 إلى مرة واحدة مع 500ms
    const callSingleModel = async (
      model: string,
      abortState: { aborted: boolean }
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
              reject(new Error(`تجاوزت مهلة الاستجابة (10 ثوانٍ) للنموذج: ${model}`));
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

          // 2) إعادة المحاولة عند 503 مرة واحدة فقط وبانتظار 500ms
          if (is503 && attempt === 0) {
            attempt++;
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }

          throw err;
        }
      }
      throw new Error(`فشل النموذج ${model} بعد استنفاد المحاولات`);
    };

    // 3) النماذج بالتوازي بدل التتابع: عند فشل النموذج الأول أو تأخره أكثر من 6 ثوانٍ، أطلق النموذج البديل بالتوازي واستخدم أول رد ناجح وألغِ الباقي
    const abortState = { aborted: false };
    const winningResult = await new Promise<{ response: any; model: string; durationMs: number }>(
      (resolve, reject) => {
        let completedCount = 0;
        let hasResolved = false;

        const clientAbortHandler = () => {
          if (!hasResolved) {
            hasResolved = true;
            abortState.aborted = true;
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
          let sixSecondTimer: any;

          const triggerNext = () => {
            if (!nextLaunched && idx + 1 < candidateModels.length && !hasResolved && !clientAbortController.signal.aborted) {
              nextLaunched = true;
              launchModel(idx + 1);
            }
          };

          sixSecondTimer = setTimeout(triggerNext, 6000);

          callSingleModel(currentModel, abortState)
            .then((result) => {
              clearTimeout(sixSecondTimer);
              if (!hasResolved) {
                hasResolved = true;
                abortState.aborted = true;
                resolve(result);
              }
            })
            .catch(() => {
              clearTimeout(sixSecondTimer);
              triggerNext();
              completedCount++;
              if (completedCount === candidateModels.length && !hasResolved) {
                reject(new Error('جميع نماذج Gemini فشلت أو تجاوزت المهلة المحددة.'));
              }
            });
        };

        launchModel(0);
      }
    );

    const response = winningResult.response;

    const parsed = JSON.parse(response.text || '{}');
    parsed.agent_name = parsed.agent_name || advisorName;
    parsed.reasoning = parsed.reasoning || '';
    parsed.summary = parsed.summary || '';
    parsed.advice = parsed.advice || '';
    parsed.score = parsed.score !== undefined ? parsed.score : effectiveScore;
    parsed.station_completed = Boolean(isEvaluationSession) && Boolean(parsed.station_completed);
    if (forcedIncomplete) {
      parsed.station_completed = false;
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
الرد السابق الذي تم توليده احتوى خطأً على عبارة إنهاء للمحطة (مثل "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت")، بينما المحطة لم تكتمل بعد وما زلنا في مرحلة الاستكشاف والتشخيص الحواري التأسيسي (عدد التبادلات الحالية: ${stationTurnCount} من 5+).
- لا تقل أبداً في ردك "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة" أو أي عبارة ختامية.
- اجعل "station_completed": false حتماً.
- إذا كان المستفيد قد طرح سؤالاً، أجب عليه باحتواء ووضوح أولاً.
- اختم ردك حتماً بطرح سؤال تشخيصي جديد وموجه لاستكشاف زاوية أخرى في (${advisorRole}) لتعميق فهم حالة المستفيد.`;

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
          const reParsed = JSON.parse(retryResponse.text);
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

    // رابعاً وثالثاً وخامساً: معالجة الدرجة، وتطهير نقاط القوة والأسلوب
    const rawModelScore = parsed.score !== undefined ? parsed.score : effectiveScore;
    parsed.score = processAndReconcileScore(rawModelScore, userSelfScore, message, historyMsgTexts, effectiveScore);
    parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyMsgTexts);
    parsed.reply = sanitizeAdvisorReply(parsed.reply || '', parsed.station_completed);

    if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
      if (parsed.advice) parsed.actionSteps = [parsed.advice];
      else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
      else parsed.actionSteps = [];
    }
    // 3) إضافة حقل source: "gemini"
    parsed.source = 'gemini';
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

IMPORTANT: You must respond in valid JSON format with the following fields:
{
  "agent_name": "${advisorName}",
  "reasoning": "تحليل واستبصار عميق وخطوات تفكير منطقية",
  "score": ${effectiveScore},
  "summary": "ملخص الوضع",
  "advice": "نصيحة عملية سريعة وموجهة",
  "reply": "نص الرد الحواري المشخصن والتفاعلي المباشر من المستشار",
  "actionSteps": ["خطوة عملية أولى", "خطوة عملية ثانية"],
  "reflectionQuestion": "سؤال تأملي ذكي للمستفيد",
  "station_completed": false,
  "strengths": ["نقاط القوة"],
  "challenges": ["فرصة تطوير من كلامه"]
}`;

        groqMessages.push({ role: 'system', content: groqSystemPrompt });

        const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
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

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          throw new Error(`Groq API error ${groqRes.status}: ${errText}`);
        }

        const groqData = await groqRes.json();
        const contentStr = groqData.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(contentStr);

        const durationMs = Date.now() - groqStart;
        // 5) اطبع في Logs اسم المزوّد وزمن الاستجابة بالمللي ثانية
        console.log(`[Advisor Chat] استجاب مزود Groq (${groqModel}) بنجاح في ${durationMs}ms`);

        // 3) تحويل الرد إلى نفس الشكل المتوقع
        parsed.agent_name = parsed.agent_name || advisorName;
        parsed.reasoning = parsed.reasoning || '';
        parsed.summary = parsed.summary || '';
        parsed.advice = parsed.advice || '';
        parsed.score = parsed.score !== undefined ? parsed.score : effectiveScore;
        parsed.station_completed = Boolean(isEvaluationSession) && Boolean(parsed.station_completed);

        if (forcedIncomplete) {
          parsed.station_completed = false;
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
الرد السابق احتوى خطأً على عبارة إنهاء للمحطة (مثل "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت") بينما المحطة لم تكتمل بعد وما زلنا في مرحلة الاستكشاف والتشخيص الحواري التأسيسي (عدد التبادلات الحالية: ${stationTurnCount} من 5+).
- لا تقل أبداً في ردك "أتممنا المحطة" أو "انتهت المحطة" أو "اكتملت المحطة".
- اجعل "station_completed": false حتماً.
- إذا سأل المستفيد أجب على سؤاله باحتواء أولاً.
- اختم ردك بطرح سؤال تشخيصي جديد وموجه في (${advisorRole}) لتعميق فهم حالة المستفيد.`,
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

        // رابعاً وثالثاً وخامساً: معالجة الدرجة، وتطهير نقاط القوة والأسلوب
        const rawGroqScore = parsed.score !== undefined ? parsed.score : effectiveScore;
        parsed.score = processAndReconcileScore(rawGroqScore, userSelfScore, message, historyMsgTexts, effectiveScore);
        parsed.strengths = sanitizeStrengths(parsed.strengths, message, historyMsgTexts);
        parsed.reply = sanitizeAdvisorReply(parsed.reply || '', parsed.station_completed);

        if (!parsed.actionSteps || parsed.actionSteps.length === 0) {
          if (parsed.advice) parsed.actionSteps = [parsed.advice];
          else if (parsed.action_plan) parsed.actionSteps = parsed.action_plan;
          else parsed.actionSteps = [];
        }

        // 3) أضف source: "groq"
        parsed.source = 'groq';
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
      effectiveUserProfile?.name || userName || 'صديقنا',
      advisor,
      userScore || 5,
      isEvaluationSession,
      evaluationStep,
      evaluationQuestionTitle,
      assessmentMode,
      stationTurnCount,
      effectiveUserProfile
    );
    // 3) إضافة حقل source: "local-fallback"
    (localFallback as any).source = 'local-fallback';
    return res.json(localFallback);
  }
});
