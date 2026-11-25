import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  AdvisorConfig,
  ChatMessage,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';
import { isCrisisMessage } from '../components/CrisisSupportCard';
import { parseUserContext, getDomainContextConfig } from '../utils/contextPersonalization';
import { generateDynamicQuickSuggestions } from '../utils/dynamicSuggestions';
import { getClientAdvisorResponse } from '../components/onboarding/clientIntelligence';
import { stripRepeatedOpeningGreeting } from '../utils/dialogueDeduplication';
import {
  AiModelMode,
  AI_MODES,
  AdvisorSelectorSidebar,
  ChatRoomHeader,
  ChatMessageList,
  ChatPromptInputBar,
  ChatToast,
} from '../components/chat';

// Re-export for backward compatibility
export type { AiModelMode };
export { AI_MODES };

interface AdvisorChatScreenProps {
  currentAdvisorId: LifeAreaId;
  onSelectAdvisor: (advisorId: LifeAreaId) => void;
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  onAddGoal: (advisorId: LifeAreaId, goal: string) => void;
  onAddEisenhowerGoal?: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  onNavigateToGoalsMatrix?: () => void;
  onBackToDashboard: () => void;
  theme?: 'light' | 'dark';
}

export const AdvisorChatScreen: React.FC<AdvisorChatScreenProps> = ({
  currentAdvisorId,
  onSelectAdvisor,
  userProfile,
  scores,
  answers,
  goals,
  onAddGoal,
  onAddEisenhowerGoal,
  onNavigateToGoalsMatrix,
  onBackToDashboard,
  theme: _theme = 'light',
}) => {
  const currentAdvisor: AdvisorConfig =
    ADVISORS_LIST.find((a) => a.id === currentAdvisorId) || ADVISORS_LIST[0];

  const currentScore = scores[currentAdvisor.id] || 0;
  const currentGoals = goals[currentAdvisor.id] || [];

  // Chat message history per advisor (persisted to localStorage under wazan_advisor_chats)
  const [messagesByAdvisor, setMessagesByAdvisor] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const stored = localStorage.getItem('wazan_advisor_chats');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      // ignore
    }
    return {};
  });
  const [draftsByAdvisor, setDraftsByAdvisor] = useState<Record<string, string>>({});
  const inputMessage = draftsByAdvisor[currentAdvisor.id] || '';
  const setInputMessage = (val: string) => {
    const advisorId = currentAdvisor.id;
    setDraftsByAdvisor((prev) => ({ ...prev, [advisorId]: val }));
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isEditResendByAdvisor, setIsEditResendByAdvisor] = useState<Record<string, boolean>>({});
  const [addedGoals, setAddedGoals] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('wazan_added_goals');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      // ignore
    }
    return {};
  });
  const [aiMode, setAiMode] = useState<AiModelMode>(() => {
    const primary = localStorage.getItem('wazan_ai_mode') as AiModelMode | null;
    if (primary) return primary;
    const legacy = localStorage.getItem('tadbeer_ai_mode') as AiModelMode | null;
    if (legacy) {
      try {
        localStorage.setItem('wazan_ai_mode', legacy);
        localStorage.removeItem('tadbeer_ai_mode');
      } catch {
        // ignore
      }
      return legacy;
    }
    return 'balanced';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<string>('');
  const lastSentUserTextRef = useRef<string>('');
  const lastSentMsgIdRef = useRef<string>('');
  const lastSentAdvisorIdRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Isolate transient request state and abort in-flight messages whenever switching advisors
  useEffect(() => {
    currentRequestIdRef.current = `switched_${currentAdvisor.id}_${Date.now()}`;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    lastSentUserTextRef.current = '';
    lastSentMsgIdRef.current = '';
    lastSentAdvisorIdRef.current = '';
    setToastMessage(null);
  }, [currentAdvisor.id]);

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('wazan_ai_mode', mode);
  };

  // Persist messagesByAdvisor to localStorage under wazan_advisor_chats
  useEffect(() => {
    try {
      if (Object.keys(messagesByAdvisor).length > 0) {
        localStorage.setItem('wazan_advisor_chats', JSON.stringify(messagesByAdvisor));
      }
    } catch (e) {
      // ignore
    }
  }, [messagesByAdvisor]);

  // Persist addedGoals to localStorage under wazan_added_goals
  useEffect(() => {
    try {
      if (Object.keys(addedGoals).length > 0) {
        localStorage.setItem('wazan_added_goals', JSON.stringify(addedGoals));
      }
    } catch (e) {
      // ignore
    }
  }, [addedGoals]);

  // Initialize or refresh welcoming message when empty OR when profile/score updates before conversation begins
  useEffect(() => {
    const existingMsgs = messagesByAdvisor[currentAdvisor.id] || [];
    const isUntouchedWelcome =
      existingMsgs.length === 0 ||
      (existingMsgs.length === 1 && existingMsgs[0].id.startsWith('welcome_'));
    if (!isUntouchedWelcome) return;

    const parsedCtx = parseUserContext(userProfile);
    const domainCtx = getDomainContextConfig(currentAdvisor.id, parsedCtx);
    const initialChips = generateDynamicQuickSuggestions({
      domainId: currentAdvisor.id,
      roundNumber: 1,
      userProfile,
    });
    const scoreLine =
      currentScore > 0
        ? `رصدت تقييمك الحالي في "${currentAdvisor.title}" بدرجة (${currentScore.toFixed(1)} من 10).`
        : `لم يُرصد تقييم معتمد بعد في "${currentAdvisor.title}"، ويسعدني استكشاف واقعك الآن.`;
    const welcomeContent = `أهلاً بك يا ${parsedCtx.name} في منصة وزان. أنا ${currentAdvisor.name}، ${currentAdvisor.role}.
${scoreLine}
${domainCtx.contextIntro}

${domainCtx.openingQuestion}`;

    if (
      existingMsgs.length === 1 &&
      existingMsgs[0].content === welcomeContent &&
      existingMsgs[0].reflectionQuestion === domainCtx.exploratoryQuestions[0]
    ) {
      return;
    }

    const welcomeMsg: ChatMessage = {
      id: `welcome_${currentAdvisor.id}`,
      sender: 'advisor',
      content: welcomeContent,
      timestamp:
        existingMsgs[0]?.timestamp ||
        new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      actionSteps: currentAdvisor.defaultGoals.slice(0, 2),
      reflectionQuestion: domainCtx.exploratoryQuestions[0],
      suggestedReplies: initialChips,
    };

    setMessagesByAdvisor((prev) => ({
      ...prev,
      [currentAdvisor.id]: [welcomeMsg],
    }));
  }, [
    currentAdvisor.id,
    currentScore,
    userProfile?.name,
    userProfile?.employmentStatus,
    userProfile?.workStatus,
    userProfile?.hasDependents,
    userProfile?.incomeSource,
    userProfile?.incomeStability,
    userProfile?.ageGroup,
    userProfile?.currentFocus,
  ]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByAdvisor, isLoading]);

  const activeMessages = messagesByAdvisor[currentAdvisor.id] || [];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const targetAdvisor = currentAdvisor;
    const targetScore = currentScore;
    const targetGoals = currentGoals;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const reqId = `${targetAdvisor.id}_${Date.now()}`;
    currentRequestIdRef.current = reqId;
    lastSentUserTextRef.current = text;
    lastSentAdvisorIdRef.current = targetAdvisor.id;
    console.log('[AdvisorChat] handleSendMessage initiated, reqId:', reqId, 'advisor:', targetAdvisor.id, 'text:', text);

    setDraftsByAdvisor((prev) => ({ ...prev, [targetAdvisor.id]: '' }));

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    lastSentMsgIdRef.current = userMsg.id;

    setMessagesByAdvisor((prev) => ({
      ...prev,
      [targetAdvisor.id]: [...(prev[targetAdvisor.id] || []), userMsg],
    }));

    setIsLoading(true);

    const currentConv = messagesByAdvisor[targetAdvisor.id] || [];
    const currentTurnCount = currentConv.filter((m) => m.sender === 'user').length;
    const isEditedOrResent = Boolean(isEditResendByAdvisor[targetAdvisor.id]);
    if (isEditedOrResent) {
      setIsEditResendByAdvisor((prev) => ({ ...prev, [targetAdvisor.id]: false }));
    }
    const previousSuggestions = currentConv
      .filter((m) => m.sender === 'advisor')
      .slice(-3)
      .flatMap((m) => m.suggestedReplies || []);
    const userMsgHistory = currentConv.filter((m) => m.sender === 'user').map((m) => m.content);

    try {
      // Call server-side proxy route for Gemini API (up to last 12 messages for richer context)
      const conversationHistory = currentConv
        .slice(-12)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.content,
        }));

      // Sanitize user profile so no empty string context field is sent to the server
      const cleanUserProfile = userProfile ? {
        name: userProfile.name,
        ...(userProfile.email?.trim() ? { email: userProfile.email.trim() } : {}),
        ...(userProfile.ageGroup?.trim() ? { ageGroup: userProfile.ageGroup.trim() } : {}),
        ...(userProfile.employmentStatus?.trim() ? { employmentStatus: userProfile.employmentStatus.trim() } : {}),
        ...(userProfile.workStatus?.trim() ? { workStatus: userProfile.workStatus.trim() } : {}),
        ...(userProfile.hasDependents?.trim() ? { hasDependents: userProfile.hasDependents.trim() } : {}),
        ...(userProfile.incomeSource?.trim() ? { incomeSource: userProfile.incomeSource.trim() } : {}),
        ...(userProfile.incomeStability?.trim() ? { incomeStability: userProfile.incomeStability.trim() } : {}),
        ...(userProfile.currentFocus?.trim() ? { currentFocus: userProfile.currentFocus.trim() } : {}),
      } : undefined;

      const res = await fetch('/api/gemini/advisor-chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advisor: targetAdvisor,
          userScore: targetScore,
          userName: userProfile?.name?.trim() || 'عزيزي',
          userProfile: cleanUserProfile,
          userGoals: targetGoals,
          userAnswers: answers,
          message: text,
          history: conversationHistory,
          aiMode,
          isEvaluationSession: false,
          stationTurnCount: currentTurnCount,
          previousSuggestions,
          isEditedOrResent,
        }),
      });

      if (controller.signal.aborted || currentRequestIdRef.current !== reqId) {
        return;
      }

      if (!res.ok) {
        throw new Error('فشل الاتصال بمستشار الذكاء الاصطناعي');
      }

      const data = await res.json();

      if (controller.signal.aborted || currentRequestIdRef.current !== reqId) {
        return;
      }

      let parsedReasoning = data.reasoning || '';
      let parsedSummary = data.summary || '';
      let parsedAdvice = data.advice || '';
      let parsedReply = data.reply || '';
      let aiSuggestedReplies: string[] = Array.isArray(data.suggestedReplies) ? data.suggestedReplies : [];

      // Defensive parsing if reply or body is a raw agent JSON string
      if (typeof parsedReply === 'string' && (parsedReply.startsWith('{') || parsedReply.includes('"reasoning"'))) {
        try {
          const innerMatch = parsedReply.match(/\{[\s\S]*\}/);
          if (innerMatch) {
            const inner = JSON.parse(innerMatch[0]);
            parsedReasoning = inner.reasoning || parsedReasoning;
            parsedSummary = inner.summary || parsedSummary;
            parsedAdvice = inner.advice || parsedAdvice;
            parsedReply = inner.advice || inner.summary || inner.reply || '';
            if (Array.isArray(inner.suggestedReplies)) {
              aiSuggestedReplies = inner.suggestedReplies;
            }
          }
        } catch {
          // ignore
        }
      }

      const cleanContent = parsedReply || parsedAdvice || parsedSummary || 'أنا معك، فلنحدد خطوة إجرائية واضحة تناسب واقعك الحالي.';
      const nextDynamicReplies = generateDynamicQuickSuggestions({
        domainId: targetAdvisor.id,
        roundNumber: Math.max(1, currentTurnCount + 2),
        lastUserMessage: text,
        advisorReply: cleanContent,
        userProfile,
        previousChips: previousSuggestions,
        userHistory: userMsgHistory,
        aiSuggestedReplies,
      });

      const advisorReply: ChatMessage = {
        id: `advisor_${Date.now()}`,
        sender: 'advisor',
        content: cleanContent,
        reasoning: parsedReasoning,
        summary: parsedSummary,
        advice: parsedAdvice,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionSteps: data.actionSteps || (parsedAdvice ? [parsedAdvice] : []),
        reflectionQuestion: data.reflectionQuestion,
        suggestedReplies: nextDynamicReplies,
        isCrisis: isCrisisMessage(cleanContent) || isCrisisMessage(text),
        source: data.source || 'gemini',
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [targetAdvisor.id]: [...(prev[targetAdvisor.id] || []), advisorReply],
      }));
    } catch (err: any) {
      console.log('[AdvisorChat] catch in handleSendMessage:', err?.name, err?.message, 'aborted:', controller.signal.aborted, 'currentReqId:', currentRequestIdRef.current, 'reqId:', reqId);
      if (
        err?.name === 'AbortError' ||
        controller.signal.aborted ||
        currentRequestIdRef.current !== reqId ||
        String(err?.message || '').toLowerCase().includes('abort')
      ) {
        console.log('[AdvisorChat] تم إيقاف الطلب بنجاح وتجاهل أي نتيجة.');
        setIsLoading(false);
        return;
      }
      console.error('Advisor chat error:', err);
      let fallbackText = `نصيحتي لك في مجال ${targetAdvisor.title}: التركيز على عادة واحدة صغيرة يومياً تصنع مع الوقت فارقاً هائلاً. استمر في تدوين تقدمك في عجلة الحياة.`;
      let fallbackReasoning = `تحليل استشاري معمق لواقع المستفيد في ${targetAdvisor.title}: استخلاص العادة المحورية الأكثر ملاءمة لقدراته وطاقته الحالية دون إجهاد.`;
      let fallbackAdvice = `ركز على خطوة واحدة إجرائية واضحة ومستمرة هذا الأسبوع.`;

      const lowerText = text.toLowerCase();
      const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(lowerText);
      const isMedicalPrescriptionOrDiagnosis = !isCrisisOrDeath && /(دواء|أدوية|ادوية|علاج دوائي|جرعة|جرعات|روشتة|وصفة طبية|مضاد حيوي|حبوب نوم|مهدئ|تشخيص مرضي|مرض خطير|اعراض مرضية|أعراض مرضية)/i.test(lowerText);
      const isStockOrCryptoSpeculation = !isCrisisOrDeath && /(توصية أسهم|توصية اسهم|سهم معين|اي سهم اشتري|أي سهم أشتري|عملات رقمية|كريبتو|بيتكوين|تداول سريع|مضاربة يومية|مضاربات|فوركس|استثمار مضمون)/i.test(lowerText);
      const isFatwaOrReligiousRuling = !isCrisisOrDeath && /(فتوى|افتي|أفتني|حكم شرعي|حلال ولا حرام|حلال ام حرام|طلاق بائن|فتاوى|مذهب|طائفة|تكفير|تبديع)/i.test(lowerText);
      const isClinicalPsychology = !isCrisisOrDeath && /(علاج نفسي سريري|علاج اكتئاب سريري|جلسات تحليل نفسي|فصام|ذهان|اضطراب ثنائي القطب|جلسات علاجية سريرية)/i.test(lowerText);
      const isLegalMaritalDispute = !isCrisisOrDeath && /(خلع|فسخ عقد نكاح|دعوى طلاق|حكم القاضي في الطلاق|حقوق حضانة قضائية|قضية نفقة)/i.test(lowerText);
      const isGriefOrExhaustion = !isCrisisOrDeath && !isMedicalPrescriptionOrDiagnosis && !isStockOrCryptoSpeculation && !isFatwaOrReligiousRuling && !isClinicalPsychology && !isLegalMaritalDispute && /(?<![\u0600-\u06FF])(?:[وفبلك]|ال|وال|فال|بال|كال|لل)?(متعب|تعبان|تعبت|تعب|حزين|حزن|مكتئب|اكتئاب|ضايق|مخنوق|طفشان|محتار|تائه|ضياع|خائف|خوف|قلق|توتر|غضب|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|مرهق|إرهاق|ارهاق|ثقل|موجوع|وجع|ألم|الم|منهار|محبط|إحباط)(?![\u0600-\u06FF])/i.test(lowerText);
      const isCurseOrAnger = !isCrisisOrDeath && !isGriefOrExhaustion && /(?:^|\s)(?:اسب|أسب|العن|اللعن|ألعن|السب|اللعنة|الشتيمة|اشتم|أشتم)(?:\s|[.,!؟]|$)/i.test(lowerText);
      const isAskingHowAdvisorIs = !isCrisisOrDeath && !isGriefOrExhaustion && !isCurseOrAnger && /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(lowerText);
      const isSimpleGreeting = !isEditedOrResent && currentConv.length === 0 && !isCrisisOrDeath && !isGriefOrExhaustion && !isCurseOrAnger && !isAskingHowAdvisorIs && /(^|\s)(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)(\s|$)/i.test(lowerText);

      let fallbackActionSteps: string[] = targetAdvisor.defaultGoals.slice(0, 1);
      let fallbackReflectionQuestion: string | undefined = undefined;

      if (isCrisisOrDeath) {
        fallbackReasoning = `تدخل إنساني طارئ (Safety & Empathy Override): المستفيد يعبر عن ألم نفسي وإنهاك شديد وتفكير في الموت أو إيذاء النفس. تم فوراً تعليق وتجميد كافة الأسئلة الروتينية، وتكريس كامل الحضور النفسي لاحتواء هذا الألم الوجودي الحاد، والتأكيد القاطع على قيمة حياته، وتقديم الدعم الإنساني والمساندة العاجلة.`;
        fallbackAdvice = `حياتك غالية وألمك حقيقي ومسموع؛ أرجوك لا تبقَ وحدك في هذا الثقل وتواصل فوراً مع شخص تثق به أو مع جهة دعم نفسي ومختصين لمساندتك.`;
        fallbackText = `أسمعك بكل جوارحي وبكل ألم واهتمام يا ${userProfile?.name?.trim() || 'عزيزي'}، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأريد أن أؤكد لك من كل قلبي: حياتك غالية جداً ومكانتك محفوظة، وما تشعر به الآن ليس رغبة حقيقية في الموت، بل صرخة لوقف هذا الألم والإنهاك الثقيل.\n\nأعلم كم أنت متعب الآن، وأعلم أن الوجع والضغط الهائل يجعلك تشعر بالعجز عن حمله بمفردك. لكن أرجوك أن تتوقف لحظة، وتلتقط أنفاسك بهدوء وعمق؛ أنت لست وحدك أبداً، وأنا هنا بجانبك لأسمعك وأساندك كإنسان وكمرشد يرى فيك قيمة عظيمة.\n\nالمشاعر المظلمة مهما بلغت شدتها هي سحابة عابرة، وحياتك أثمن بكثير من أن تنتهي في لحظة قاسية كهذه.\n\nأرجوك ألا تبقى وحدك مع هذا الثقل؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب.\n\nهل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.`;
        fallbackActionSteps = [
          'التنفس بهدوء وعمق، والجلوس في مكان آمن ومريح',
          'التواصل فوراً مع شخص قريب تثق به أو الاتصال بخط المساندة النفسية والطوارئ',
        ];
        fallbackReflectionQuestion = 'هل أنت في مكان آمن الآن وتستطيع التحدث مع شخص قريب تثق به، أو التواصل مع مختص يقف بجانبك؟ أنا هنا معك وأريد لك السلامة والأمان.';
      } else if (isMedicalPrescriptionOrDiagnosis) {
        fallbackReasoning = `احترام حدود التخصص الطبي: المستشار الصحي في منصة وزان يركز حصراً على نمط الحياة وعادات التغذية والنوم والنشاط، ويُمنع منعاً باتاً من كتابة وصفات دوائية أو تشخيص سريري. تم الاعتذار بلباقة وإحالته فوراً لطبيب بشري مرخص.`;
        fallbackAdvice = `استشر طبيباً بشرياً مرخصاً أو اتصل بمركز الاستشارات الطبية (937) لفحصك بدقة وصرف العلاج الآمن المناسب.`;
        fallbackText = `أود أن أوضح لك بكل أمانة ومحبة يا ${userProfile?.name?.trim() || 'عزيزي'} أنني كمرشد لصحتك البدنية ونمط حياتك أركز على بناء عادات التغذية السليمة، جودة النوم، وممارسة النشاط البدني، ولا أملك الصلاحية الطبية لكتابة وصفات دوائية أو تحديد جرعات أو تشخيص أمراض عضوية سريرية.\n\nصحتك وسلامتك أمانة غالية؛ أرجوك استشارة طبيب بشري مرخص أو زيارة المركز الصحي أو الاتصال بمركز الاستشارات الطبية (937) لتقييم حالتك بدقة وصرف العلاج الطبي المناسب.\n\nما هي العادة اليومية البسيطة في شرب الماء أو المشي التي تود أن نعمل عليها معاً اليوم؟`;
        fallbackActionSteps = [
          'التواصل مع طبيب بشري مرخص أو الاتصال بـ 937 للتشخيص وصرف الدواء',
          'التركيز على العادات الحياتية المساندة مثل ترطيب الجسم وتنظيم ساعات النوم',
        ];
        fallbackReflectionQuestion = 'ما هي العادة اليومية البسيطة في شرب الماء أو المشي التي تود أن نعمل عليها معاً اليوم؟';
      } else if (isStockOrCryptoSpeculation) {
        fallbackReasoning = `حوكمة التخصص المالي: المستشار المالي في منصة وزان يركز على الميزانية الشخصية، الادخار، التحرر من الديون، وصندوق الطوارئ، ويُمنع منعاً باتاً من تقديم توصيات استثمارية لأسهم أو مضاربات.`;
        fallbackAdvice = `احمِ مدخراتك من المضاربات عالية المخاطر وركز على الادخار وبناء صندوق الطوارئ واستشارة مرخص مالي.`;
        fallbackText = `أحييك على اهتمامك بتنمية أموالك يا ${userProfile?.name?.trim() || 'عزيزي'}، ولكن كمرشد ومخطط مالي شخصي في منصة وزان، أركز حصراً على التخطيط المالي الرشيد، تنظيم الميزانية، التحرر من الديون، وبناء صندوق الطوارئ الآمن، وأمتنع تماماً عن تقديم أي توصيات لشراء أو بيع أسهم معينة، العملات المشفرة، أو مضاربات التداول عالية المخاطر.\n\nلحماية مدخراتك واستثمارها بشكل آمن ومسؤول، ننصحك باستشارة مستشار استثماري مرخص ومعتمد من هيئة السوق المالية لدراسة محفظتك.\n\nهل ترغب في أن نراجع معاً خطة بناء صندوق الطوارئ كخطوة أولى آمنة؟`;
        fallbackActionSteps = [
          'استشارة خبير استثماري مرخص ومعتمد قبل الدخول في أي أصل مالي عالي المخاطر',
          'تأمين صندوق الطوارئ أولاً ليغطي مصاريف 3 إلى 6 أشهر',
        ];
        fallbackReflectionQuestion = 'هل ترغب في أن نراجع معاً خطة بناء صندوق الطوارئ كخطوة أولى آمنة؟';
      } else if (isFatwaOrReligiousRuling) {
        fallbackReasoning = `حوكمة التخصص الروحي: المستشار الروحي يقتصر دوره على السكينة النفسية والتأمل القيمي والمعنى والسلام الداخلي، ويُمنع تماماً من إصدار فتاوى شرعية أو أحكام فقهية مذهبية.`;
        fallbackAdvice = `المسائل الدينية والتشريعية الدقيقة تؤخذ من مراجعها الرسمية المتخصصة.`;
        fallbackText = `أقدّر حرصك وسؤالك الطيب يا ${userProfile?.name?.trim() || 'عزيزي'}، لكن بصفتي مرشداً للسكينة والسلام الداخلي والمعنى في الحياة، يقتصر دوري على إعانتك على عادات التأمل، السكينة، والاتصال القلبي وتزكية النفس، وأمتنع تماماً عن إصدار الفتاوى الفقهية أو الفصل في الأحكام التشريعية والمذهبية.\n\nالمسائل الدينية والفقهية تؤخذ من مراجعها الرسمية المعتمدة.\n\nما هي الممارسة التأملية أو العمل القلبي البسيط الذي تشعر أنه يملأ صدرك سلاماً وسكينة اليوم؟`;
        fallbackActionSteps = [
          'الرجوع للمراجع الدينية الرسمية للاستفسارات التشريعية المتخصصة',
          'المحافظة على مساحة خلوة يومية بسيطة لتعزيز السلام الداخلي والطمأنينة',
        ];
        fallbackReflectionQuestion = 'ما هي الممارسة التأملية أو العمل القلبي البسيط الذي تشعر أنه يملأ صدرك سلاماً وسكينة اليوم؟';
      } else if (isClinicalPsychology) {
        fallbackReasoning = `حوكمة التخصص النفسي الذاتي: المستشارة الذاتية تركز على الوعي وإدارة الضغوط وبناء العادات اليومية وتتجنب العلاج السريري، مع التوجيه لأخصائي نفسي مرخص.`;
        fallbackAdvice = `الحالات الإكلينيكية تستوجب جلسات علاج نفسي سريري متخصصة مع معالج مرخص.`;
        fallbackText = `أسمعك بكل مودة واهتمام يا ${userProfile?.name?.trim() || 'عزيزي'}. كمرشدة لبناء الوعي الذاتي وإدارة الضغوط اليومية والعادات الشخصية، أركز على مهارات التكيف والمرونة وتنمية الصلابة، ولا أقدم علاجاً نفسياً إكلينيكياً أو تشخيصاً سريرياً للاضطرابات النفسية العميقة.\n\nإذا كنت تعاني من أعراض سريرية مرهقة، فإن الخطوة الأجمل والأنفع هي حجز جلسات مع أخصائي نفسي أو طبيب نفسي إكلينيكي مرخص ليضع معك خطة علاجية علمية متكاملة.\n\nهل تود أن نتشارك خطوة بسيطة اليوم في تفريغ الضغوط وتدوين ما يشغل تفكيرك؟`;
        fallbackActionSteps = [
          'مراجعة عيادة نفسية مرخصة أو استشارة أخصائي نفسي سريري معتمد',
          'ممارسة تمارين الاسترخاء والتنفس اليومية لتخفيف التوتر',
        ];
        fallbackReflectionQuestion = 'هل تود أن نتشارك خطوة بسيطة اليوم في تفريغ الضغوط وتدوين ما يشغل تفكيرك؟';
      } else if (isLegalMaritalDispute) {
        fallbackReasoning = `حوكمة التخصص الأسري: المستشارة الأسرية تركز على المودة والتفاهم الأسري وتتجنب الأحكام القضائية والشرعية.`;
        fallbackAdvice = `النزاعات القضائية وحقوق الطلاق تتطلب جهات توثيق قانونية ومراكز استشارات أسرية متخصصة.`;
        fallbackText = `سلامة قلبك وبيتك يا ${userProfile?.name?.trim() || 'عزيزي'}. كمرشدة للعلاقات الأسرية، ينصبّ جهدي على ترسيخ لغة الحوار الدافئ، تعزيز المودة، وبر الوالدين وحل الخلافات بالرفق، ولا أتدخل في النزاعات القضائية أو قضايا الطلاق أو الأحكام الشرعية والقانونية الملزمة.\n\nفي مثل هذه القضايا الحساسة، ننصحك بالرجوع إلى مراكز التنمية والإرشاد الأسري المعتمدة أو المستشارين الأسريين والقانونيين المرخصين لحفظ الحقوق وتقديم الرأي السديد.\n\nكيف يمكننا اليوم تخفيف حدة التوتر وبدء خطوة حوار هادئة داخل الأسرة؟`;
        fallbackActionSteps = [
          'مراجعة مراكز التنمية والإرشاد الأسري المعتمدة أو مستشار قانوني مرخص',
          'تهدئة المشاعر وتجنب اتخاذ قرارات مصيرية في لحظات الغضب',
        ];
        fallbackReflectionQuestion = 'كيف يمكننا اليوم تخفيف حدة التوتر وبدء خطوة حوار هادئة داخل الأسرة؟';
      } else if (isGriefOrExhaustion) {
        fallbackReasoning = `تحليل مشاعر الإنهاك والحزن والضيق النفسي لدى المستفيد: إدراك أن المشاعر المتألمة تحتاج إلى إنصات واحتواء إنساني دافئ قبل أي نصائح عملية، وكسر حلقة العزلة والضغط الداخلي.`;
        fallbackAdvice = `الحزن والإنهاك رسائل من الجسد والروح بحاجتهما للراحة والتفريغ؛ لا تكابر وامنح نفسك فرصة لالتقاط الأنفاس.`;
        fallbackText = `سلامة قلبك وروحك يا ${userProfile?.name?.trim() || 'عزيزي'}. يؤلمني حقاً أن تشعر بهذا الحزن أو التعب والثقل، لكن اعلم أن مرور الإنسان بفترات انطفاء وثقل هو أمر إنساني طبيعي جداً، ولست وحدك في هذا الشعور.\n\nخذ نفساً عميقاً ولا تقسُ على نفسك؛ أنا هنا معك بكامل حضوري لأسمعك وأفكر معك دون أي قيود أو أحكام. ما الذي حدث وجعلك تشعر بهذا الثقل المرهق اليوم؟ شاركني ما في قلبك.`;
      } else if (isCurseOrAnger) {
        fallbackReasoning = `تفكيك مشاعر الغضب والألم الكامن خلف الرغبة في التعبير الصادم، واحتواء الإنسان دون إطلاق أحكام مسبقة، وتوجيه الطاقة نحو التفريغ الصحي الآمن دون تدمير الذات.`;
        fallbackAdvice = `تفريغ الغضب يكون بالبوح والتنفس واللجوء إلى الله تعالى مقدر الأمور ومصرفها سبحانه، فالسب واللعن لن يغيّر ما حدث بل يزيد القلب قسوة ومرارة.`;
        fallbackText = `أشعر بحجم الألم والثقل الذي تحمله في صدرك يا ${userProfile?.name?.trim() || 'عزيزي'}. حين تبلغ بنا الخيبة والتعب مداها، تتولد في دواخلنا رغبة عارمة في الصراخ واللعن كصرخة استغاثة للبحث عن متنفس.\n\nمن حقك تماماً أن تشعر بالألم والغضب، وأنا هنا لست لأحاكمك أو أملي عليك ما تشعر به، بل لأحتويك وأسمعك بصدق. لكن اعلم بقلبك أن سب الحياة أو لعن الأقدار لن يرفع الهم ولن يشفي الجرح، بل يترك في روحك مرارة مضاعفة.\n\nخذ نفساً عميقاً، وأفرغ ما في صدرك؛ ما هو الشيء الأكثر إيلاماً الذي يضغط على روحك الآن وتود لو تتخلص منه؟`;
      } else if (isAskingHowAdvisorIs) {
        fallbackReasoning = `تجاوب حواري إنساني مباشر وكسر الجمود لتقديم التحية والاطمئنان الدافئ كمرشد ورفيق درب.`;
        fallbackAdvice = `أنا بخير وبأحسن حال وسعيد وممتن جداً بسؤالك الطيب!`;
        fallbackText = `أهلاً وسهلاً بك يا ${userProfile?.name?.trim() || 'عزيزي'}! أنا بخير وبأحسن حال، وسعيد وممتن جداً بسؤالك الطيب عني ودفء حضورك. 🌿\n\nبصفتي ${targetAdvisor.name} (${targetAdvisor.role})، أنا معك هنا بكامل حضوري وطاقتي لنفكر معاً خطوة بخطوة في رحلتك نحو التوازن. كيف تشعر اليوم وما الذي يشغل تفكيرك؟`;
      } else if (isSimpleGreeting) {
        fallbackReasoning = `تحية إنسانية عفوية من المستفيد: الترحيب الدافئ كمرشد ورفيق درب وفتح باب الحوار بأريحية تامة دون أي قوالب جامدة.`;
        fallbackAdvice = `أهلاً بك دائماً؛ كامل الحضور والإصغاء معك لنبدأ بأي جانب تود التركيز عليه.`;
        fallbackText = `أهلاً وسهلاً بك يا ${userProfile?.name?.trim() || 'عزيزي'}! يسعدني جداً حضورك وتواصلك. 🌿\n\nمعك ${targetAdvisor.name} (${targetAdvisor.role}). أنا هنا معك ومستعد للإصغاء والتفكير معك في كل ما يشغل بالك في ${targetAdvisor.title}.\n\nكيف تسير أمورك اليوم؟ وما الذي تود أن نتناوله معاً؟`;
      } else {
        const localRoomResponse = getClientAdvisorResponse(
          targetAdvisor,
          text,
          1,
          targetScore,
          currentTurnCount,
          currentConv.map((m) => m.content),
          userProfile,
          previousSuggestions,
          isEditedOrResent
        );
        fallbackReasoning = localRoomResponse.reasoning;
        fallbackAdvice = localRoomResponse.advice;
        fallbackText = stripRepeatedOpeningGreeting(
          localRoomResponse.reply,
          isEditedOrResent || currentConv.length > 0
        );
        fallbackActionSteps = [localRoomResponse.advice || targetAdvisor.defaultGoals[0]];
      }

      const nextFallbackChips = generateDynamicQuickSuggestions({
        domainId: targetAdvisor.id,
        roundNumber: Math.max(1, currentTurnCount + 2),
        lastUserMessage: text,
        advisorReply: fallbackText,
        userProfile,
        previousChips: previousSuggestions,
        userHistory: userMsgHistory,
      });

      const fallbackReply: ChatMessage = {
        id: `fallback_${Date.now()}`,
        sender: 'advisor',
        content: fallbackText,
        reasoning: fallbackReasoning,
        summary: `تفاعل واستشارة مباشرة في ${targetAdvisor.title}`,
        advice: fallbackAdvice,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionSteps: fallbackActionSteps,
        reflectionQuestion: fallbackReflectionQuestion,
        suggestedReplies: nextFallbackChips,
        isCrisis: isCrisisMessage(fallbackText) || isCrisisMessage(text),
        source: 'local-fallback',
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [targetAdvisor.id]: [...(prev[targetAdvisor.id] || []), fallbackReply],
      }));
    } finally {
      if (currentRequestIdRef.current === reqId) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStopMessage = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[AdvisorChat] handleStopMessage called. Current isLoading:', isLoading, 'reqId:', currentRequestIdRef.current);
    if (!isLoading) {
      console.log('[AdvisorChat] handleStopMessage ignored because not currently loading.');
      return;
    }

    // 1) Invalidate request ID immediately to reject any in-flight response
    currentRequestIdRef.current = 'stopped_' + Date.now();

    // 2) Abort in-flight fetch
    if (abortControllerRef.current) {
      console.log('[AdvisorChat] Aborting controller in handleStopMessage...');
      try {
        abortControllerRef.current.abort();
      } catch (abortErr) {
        console.warn('[AdvisorChat] Error aborting controller:', abortErr);
      }
      abortControllerRef.current = null;
    }

    // 3) Clear toast or pending timers if any
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    // 4) Immediately turn off loading indicator
    setIsLoading(false);

    // 5) Restore text ONLY to originating advisor's input field
    const originAdvisorId = lastSentAdvisorIdRef.current || currentAdvisor.id;
    if (lastSentUserTextRef.current) {
      setDraftsByAdvisor((prev) => ({
        ...prev,
        [originAdvisorId]: lastSentUserTextRef.current,
      }));
    }

    // 6) Remove user message from originating advisor's chat list
    const sentId = lastSentMsgIdRef.current;
    if (sentId) {
      setMessagesByAdvisor((prev) => ({
        ...prev,
        [originAdvisorId]: (prev[originAdvisorId] || []).filter((m) => m.id !== sentId),
      }));
    }
  };

  const handleUndoLastExchange = () => {
    if (isLoading) return;
    const currentList = messagesByAdvisor[currentAdvisor.id] || [];
    let lastUserIdx = -1;
    for (let i = currentList.length - 1; i >= 0; i--) {
      if (currentList[i].sender === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const userMsgToUndo = currentList[lastUserIdx];
    setInputMessage(userMsgToUndo.content);
    setIsEditResendByAdvisor((prev) => ({
      ...prev,
      [currentAdvisor.id]: true,
    }));

    setMessagesByAdvisor((prev) => {
      const list = prev[currentAdvisor.id] || [];
      const filtered = list.filter((_, idx) => idx !== lastUserIdx && idx !== lastUserIdx + 1);
      return {
        ...prev,
        [currentAdvisor.id]: filtered,
      };
    });
  };

  const handleAddActionToGoals = (actionText: string) => {
    onAddGoal(currentAdvisor.id, actionText);
    if (onAddEisenhowerGoal) {
      onAddEisenhowerGoal(actionText, currentAdvisor.name, currentAdvisor.id);
    }
    setAddedGoals((prev) => ({ ...prev, [actionText]: true }));
    setToastMessage(`تمت إضافة المهمة إلى المربع الثاني (مهم وغير عاجل) بمصفوفة أيزنهاور بنجاح 🎯`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const lastAdvisorChatMessage = [...activeMessages].reverse().find((m) => m.sender === 'advisor');
  const userMessagesInRoom = activeMessages.filter((m) => m.sender === 'user').map((m) => m.content);
  const roomPreviousChips = activeMessages
    .filter((m) => m.sender === 'advisor')
    .slice(-4, -1)
    .flatMap((m) => m.suggestedReplies || []);
  const activeQuickSuggestions =
    lastAdvisorChatMessage?.suggestedReplies && lastAdvisorChatMessage.suggestedReplies.length > 0
      ? lastAdvisorChatMessage.suggestedReplies
      : generateDynamicQuickSuggestions({
          domainId: currentAdvisor.id,
          roundNumber: Math.max(1, userMessagesInRoom.length + 1),
          lastUserMessage: userMessagesInRoom[userMessagesInRoom.length - 1] || '',
          advisorReply: lastAdvisorChatMessage?.content || '',
          userProfile,
          previousChips: roomPreviousChips,
          userHistory: userMessagesInRoom,
        });

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300">
      {/* Top Bar with Back Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى عجلة الحياة</span>
          </button>
          <span className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] hidden sm:inline">
            غرف استشارة المستشارين الثمانية
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#475569] dark:text-[#94A3B8] font-semibold hidden md:inline">
            المستشار الحالي:
          </span>
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full border shadow-xs"
            style={{
              color: currentAdvisor.themeColor,
              borderColor: `${currentAdvisor.themeColor}35`,
              backgroundColor: `${currentAdvisor.themeColor}15`,
            }}
          >
            {currentAdvisor.name} - {currentAdvisor.badge}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Advisors Switcher Sidebar */}
        <AdvisorSelectorSidebar
          currentAdvisorId={currentAdvisor.id}
          scores={scores}
          onSelectAdvisor={onSelectAdvisor}
        />

        {/* Right: The Active Advisor Consultation Room */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl overflow-hidden shadow-xs h-[78vh] transition-colors">
          {/* Room Header Banner */}
          <ChatRoomHeader
            currentAdvisor={currentAdvisor}
            currentScore={currentScore}
            aiMode={aiMode}
            onSelectAiMode={handleSelectAiMode}
          />

          {/* Chat Messages Area */}
          <ChatMessageList
            key={`list_${currentAdvisor.id}`}
            messages={activeMessages}
            currentAdvisor={currentAdvisor}
            isLoading={isLoading}
            aiMode={aiMode}
            addedGoals={addedGoals}
            onAddActionToGoals={handleAddActionToGoals}
            onUndoLastExchange={handleUndoLastExchange}
            messagesEndRef={messagesEndRef}
          />

          {/* Input Bar with quick questions chips & send/stop */}
          <ChatPromptInputBar
            key={`input_${currentAdvisor.id}`}
            currentAdvisor={currentAdvisor}
            inputMessage={inputMessage}
            onChangeInputMessage={setInputMessage}
            isLoading={isLoading}
            aiMode={aiMode}
            onSelectAiMode={handleSelectAiMode}
            onSendMessage={handleSendMessage}
            onStopMessage={handleStopMessage}
            quickSuggestions={activeQuickSuggestions}
          />
        </div>
      </div>

      {/* Floating Confirmation Toast for Eisenhower Injection */}
      <ChatToast
        toastMessage={toastMessage}
        onClose={() => setToastMessage(null)}
        onNavigateToGoalsMatrix={onNavigateToGoalsMatrix}
      />
    </div>
  );
};
export default AdvisorChatScreen;
