import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId, UserProfile } from '../types/lifeBalance';
import {
  STATION_ASSESSMENT_CONFIG,
  StationAssessmentConfig,
  getAdaptiveStationConfig,
} from '../data/assessmentQuestions';
import {
  calculateScoreForAdvisor,
  extractInsightsFromAnswers,
  isAdvisorWeeklyLocked,
} from '../utils/storage';
import { AiModelMode } from './AdvisorChatScreen';
import { isCrisisMessage } from '../components/CrisisSupportCard';

import {
  calculateSemanticScore,
  getClientAdvisorResponse,
  EvaluationChatMessage,
  StationDynamicInsights,
  OnboardingProgressHeader,
  AdvisorStationHeader,
  AssessmentChatStream,
  AssessmentInputBar,
  StationCelebrationModal,
  UserContextModal,
} from '../components/onboarding';

export { calculateSemanticScore, getClientAdvisorResponse };
export type { EvaluationChatMessage, StationDynamicInsights };

interface OnboardingScreenProps {
  initialAdvisorId?: LifeAreaId;
  answers: Record<string, any>;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => void;
  onResetAdvisor?: (advisorId: LifeAreaId) => void;
  onStartNewWeeklyAssessment?: () => void;
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onNavigateToDashboard: () => void;
  onNavigateBack?: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
  onAddEisenhowerGoal?: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  theme?: 'light' | 'dark';
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  userProfile,
  onUpdateProfile,
  onSaveAnswer,
  onFinishAdvisor,
  onResetAdvisor,
  onStartNewWeeklyAssessment,
  onCompleteAll,
  completedAdvisors,
  onAddEisenhowerGoal,
  completedDates,
  onNavigateToDashboard,
  onNavigateBack,
  onNavigateToAdvisorChat,
  theme: _theme = 'light',
}) => {
  const [currentAdvisorIndex, setCurrentAdvisorIndex] = useState(() => {
    const idx = ADVISORS_LIST.findIndex((a) => a.id === initialAdvisorId);
    return idx >= 0 ? idx : 0;
  });

  // Track turn count per advisor station for the adaptive clinical flow
  const [stationTurnCount, setStationTurnCount] = useState<Record<string, number>>({});

  // Dynamic insights per station in memory only (never saved to localStorage across sessions)
  const [stationInsights, setStationInsights] = useState<Record<string, StationDynamicInsights>>({});

  const [inputText, setInputText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAdvisorReplying, setIsAdvisorReplying] = useState(false);
  const [aiMode, setAiMode] = useState<AiModelMode>(() => {
    const primary = localStorage.getItem('wazan_ai_mode') as AiModelMode | null;
    if (primary) return primary;
    return 'balanced';
  });
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // User Context Modal states (سياق المستفيد)
  const [showContextModal, setShowContextModal] = useState(false);

  // Check whether user context is completed
  const isContextCompleted = Boolean(
    (userProfile?.employmentStatus?.trim() || userProfile?.workStatus?.trim()) &&
    userProfile?.ageGroup?.trim() &&
    userProfile?.hasDependents?.trim() &&
    (!((userProfile?.employmentStatus || userProfile?.workStatus || '').includes('طالب')) || userProfile?.incomeSource?.trim()) &&
    (!((userProfile?.employmentStatus || userProfile?.workStatus || '').includes('موظف') || (userProfile?.employmentStatus || userProfile?.workStatus || '').includes('صاحب عمل') || (userProfile?.employmentStatus || userProfile?.workStatus || '').includes('مستقل')) || userProfile?.incomeStability?.trim())
  );

  // إذا كانت بيانات السياق ناقصة، افتح نافذة سياق المستفيد الإلزامية تلقائياً
  useEffect(() => {
    if (!isContextCompleted) {
      setShowContextModal(true);
    }
  }, [isContextCompleted]);

  // Banner dismissed state persisted in localStorage
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wazan_context_banner_dismissed_v1') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem('wazan_context_banner_dismissed_v1', 'true');
    } catch {
      // ignore
    }
  };

  const handleSaveContext = (updated: Partial<UserProfile>) => {
    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
    setShowContextModal(false);
  };

  const handleCloseContextModal = () => {
    setShowContextModal(false);
    if (!isContextCompleted) {
      if (onNavigateBack) {
        onNavigateBack();
      } else {
        onNavigateToDashboard();
      }
    }
  };

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('wazan_ai_mode', mode);
  };

  // Chat conversation state per advisor in memory only (never saved to localStorage across sessions)
  const [chatMessages, setChatMessages] = useState<Record<string, EvaluationChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<string>('');
  const lastSentUserTextRef = useRef<string>('');
  const lastSentMsgIdRef = useRef<string>('');
  const [dismissedPrivacyNotices, setDismissedPrivacyNotices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Proactively purge any residual evaluation caches from localStorage on mount & when uncompleted
  useEffect(() => {
    try {
      localStorage.removeItem('wazan_eval_chats');
      localStorage.removeItem('wazan_eval_insights');
      localStorage.removeItem('wazan_current_eval_advisor');
    } catch {
      // ignore
    }
  }, []);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const stationNumber = currentAdvisorIndex + 1; // 1 to 8

  const currentStationConfig: StationAssessmentConfig =
    getAdaptiveStationConfig(currentAdvisor.id, userProfile) || {
      areaId: currentAdvisor.id,
      stationNumber,
      advisorName: currentAdvisor.name,
      advisorRole: currentAdvisor.role,
      avatarSvg: currentAdvisor.avatarSvg,
      themeColor: currentAdvisor.themeColor,
      badge: currentAdvisor.badge,
      consultation: {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب ومستوى رضاك عنه في هذه الأيام؟',
        description: 'صف واقعك برفق وشاركنا ما إذا كان هناك عائق تشعر أنه يؤثر على استقرارك...',
        placeholder: 'صف حالك ورضاك في هذا الجانب بصراحة...',
        followUpProbe: 'أقدّر شفافيتك يا صديقنا. لنصل لتشخيص دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟',
        suggestedResponses: ['مستقر وممتاز (8/10)', 'متوسط وسط بعض الضغوط (6/10)', 'يحتاج إعادة تنظيم وعناية (4/10)'],
      },
      initialDiagnostic: {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب ومستوى رضاك عنه؟',
        description: 'ما هو التحدي الأبرز وما تقييمك لمستواك من 1 إلى 10؟',
        placeholder: 'صف حالك ورضاك في هذا الجانب بصراحة...',
        followUpProbe: 'أقدّر شفافيتك يا صديقنا. لنصل لتشخيص تأسيسي دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟',
        suggestedResponses: ['مستقر وممتاز', 'متوسط وسط بعض الضغوط', 'يحتاج إعادة تنظيم وعناية'],
      },
      weeklyCheckin: {
        title: 'كيف كان حالك في هذا الجانب خلال الأسبوع الماضي؟',
        description: 'اختر تقييمك للأسبوع المنصرم من 1 إلى 10',
        placeholder: 'أسبوع هادئ ومنجز / ضغوط وتشتت...',
        suggestedResponses: ['أداء ممتاز (8/10)', 'متوسط مقبول (6/10)', 'تحديات وضغوط (4/10)'],
      },
    };

  // Determine if current advisor is completed / locked
  const isCompleted = completedAdvisors.includes(currentAdvisor.id);
  const _isLocked = isCompleted || isAdvisorWeeklyLocked(currentAdvisor.id, completedDates);

  // All 8 domains completed state
  const isAllCompleted = completedAdvisors.length >= 8;

  // Accurate progress calculation
  const completedCount = completedAdvisors.length;
  const progressPercent = Math.min(100, Math.round((completedCount / 8) * 100));

  // Helper to build opening doctor consultation message for current station
  const getOpeningMessage = (
    advisor: AdvisorConfig,
    stConfig: StationAssessmentConfig,
    stationNum: number
  ): EvaluationChatMessage => {
    const consult = stConfig.consultation || stConfig.initialDiagnostic;
    const text = `أهلاً بك يا صديقنا في محطة التقييم والاستشارة الحوارية 🩺\n\nأنا **${advisor.name}**، ${advisor.role}.\nسنقف معاً في هذا الجانب لنستكشف واقعك برفق ووعي لنبني عليه توازنك المستدام.\n\n📌 **سؤال الاستشارة والتشخيص (المحطة ${stationNum} من 8):**\n${consult.title}\n\n💡 ${consult.description}`;

    return {
      id: `welcome_${advisor.id}_${Date.now()}`,
      sender: 'advisor',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  useEffect(() => {
    if (completedAdvisors.length === 0) {
      const firstAdvisor = ADVISORS_LIST[0];
      const firstStationConfig = getAdaptiveStationConfig(firstAdvisor.id, userProfile) || currentStationConfig;
      const initialOpeningMsg = getOpeningMessage(firstAdvisor, firstStationConfig, 1);
      setChatMessages({ [firstAdvisor.id]: [initialOpeningMsg] });
      setStationInsights({});
      setStationTurnCount({ [firstAdvisor.id]: 0 });
      setCurrentAdvisorIndex(0);
    }
  }, [completedAdvisors.length]);

  // تحديث رسالة الافتتاح عند اكتمال أو تعديل سياق المستفيد إذا لم تبدأ المحادثة بعد
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    const currentMsgs = chatMessages[advisorKey];
    if (currentMsgs && currentMsgs.length === 1 && currentMsgs[0].id.startsWith('welcome_')) {
      const refreshedOpening = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [refreshedOpening],
      }));
    }
  }, [userProfile?.employmentStatus, userProfile?.workStatus]);

  // 1) Initialize welcoming message for station
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    const currentMsgs = chatMessages[advisorKey];
    if (!currentMsgs || currentMsgs.length === 0) {
      const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
      setChatMessages((prev) => {
        if (prev[advisorKey] && prev[advisorKey].length > 0) return prev;
        return { ...prev, [advisorKey]: [openingMsg] };
      });
      setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    }
  }, [currentAdvisorIndex, currentAdvisor, chatMessages[currentAdvisor.id]]);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentAdvisorIndex]);

  // Reopen and restart evaluation for current advisor station
  const handleReopenStation = () => {
    const advisorKey = currentAdvisor.id;
    setStationTurnCount((prev) => ({ ...prev, [advisorKey]: 0 }));
    const openingMsg = getOpeningMessage(currentAdvisor, currentStationConfig, stationNumber);
    setChatMessages((prev) => ({ ...prev, [advisorKey]: [openingMsg] }));
    setStationInsights((prev) => {
      const copy = { ...prev };
      delete copy[advisorKey];
      return copy;
    });
    if (onResetAdvisor) {
      onResetAdvisor(advisorKey);
    }
  };

  // Reset and restart evaluation for current advisor
  const handleResetCurrentAdvisor = () => {
    handleReopenStation();
  };

  // Move to next incomplete advisor
  const handleGoToNextAdvisor = () => {
    setShowCelebration(false);
    const nextIdx = ADVISORS_LIST.findIndex(
      (adv, i) => i > currentAdvisorIndex && !completedAdvisors.includes(adv.id)
    );
    if (nextIdx >= 0) {
      setCurrentAdvisorIndex(nextIdx);
    } else {
      const firstIncomplete = ADVISORS_LIST.findIndex(
        (adv) => !completedAdvisors.includes(adv.id)
      );
      if (firstIncomplete >= 0) {
        setCurrentAdvisorIndex(firstIncomplete);
      } else {
        onCompleteAll();
      }
    }
  };

  // Handle user answer: Only completes when AI advisor explicitly returns station_completed === true!
  const handleSendAnswer = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAdvisorReplying) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const reqId = Date.now().toString();
    currentRequestIdRef.current = reqId;
    lastSentUserTextRef.current = text;

    const advisorKey = currentAdvisor.id;
    const userMsg: EvaluationChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    lastSentMsgIdRef.current = userMsg.id;

    setInputText('');
    const currentList = chatMessages[advisorKey] || [];
    const currentTurns = stationTurnCount[advisorKey] || 0;

    // Detect numeric score (1 to 10) anywhere in message
    let detectedScore: number | null = null;
    const justNumberMatch = text.match(/^\s*(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)\s*[.!؟،,]*\s*$/);
    if (justNumberMatch) {
      const val = parseFloat(justNumberMatch[1]);
      if (!isNaN(val) && val >= 1 && val <= 10) {
        detectedScore = val;
      }
    }

    if (detectedScore === null) {
      const fromTenMatch = text.match(/(?:^|[^\d.])(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10(?!\d)/i);
      if (fromTenMatch) {
        const val = parseFloat(fromTenMatch[1]);
        if (!isNaN(val) && val >= 1 && val <= 10) {
          detectedScore = val;
        }
      }
    }

    if (detectedScore === null) {
      const teqyeemiMatch = text.match(/تقييمي\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)(?!\d)/i);
      if (teqyeemiMatch) {
        const val = parseFloat(teqyeemiMatch[1]);
        if (!isNaN(val) && val >= 1 && val <= 10) {
          detectedScore = val;
        }
      }
    }

    // Save answer turn in state
    if (detectedScore !== null) {
      onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, detectedScore);
    } else {
      onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_response_${currentTurns}`, text);
    }

    // Increment station turn count only for genuine substantive diagnostic exchanges
    const isCrisisOrDeathMsg = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(text);
    const isBareGreeting = /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|دكتورة|استاذ|أستاذ|باشمهندس|كمال|سفيان)?\s*[.!؟]*$/i.test(text.trim());
    const isPureAck = /^(?:شكراً|شكرا|يعطيك العافية|جزاك الله خير|تمام|أوك|اوك|حسناً|حسنا)\s*[.!؟]*$/i.test(text.trim());
    const isSubstantiveExchange = !isCrisisOrDeathMsg && !isBareGreeting && !isPureAck;

    if (isSubstantiveExchange) {
      setStationTurnCount((prev) => ({ ...prev, [advisorKey]: currentTurns + 1 }));
    }

    // Display user message immediately
    setChatMessages((prev) => ({
      ...prev,
      [advisorKey]: [...currentList, userMsg],
    }));

    setIsAdvisorReplying(true);

    try {
      const history = currentList.slice(-12).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      let replyContent = '';
      let reasoningContent = '';
      let summaryContent = '';
      let adviceContent = '';
      let isStationCompleted = false;
      const historyTextsArray = currentList.map((m) => m.text);
      let earnedScore = calculateSemanticScore(text, historyTextsArray, detectedScore || undefined);
      let dynamicStrengths: string[] = [];
      let dynamicChallenges: string[] = [];
      let responseSource: 'gemini' | 'groq' | 'local-fallback' = 'gemini';

      try {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisor: currentAdvisor,
            userName: userProfile?.name || 'صديقنا',
            userProfile: cleanUserProfile,
            message: text,
            history,
            answers,
            userScore: earnedScore,
            aiMode,
            isEvaluationSession: true,
            evaluationStep: stationNumber,
            evaluationQuestionTitle: currentStationConfig.consultation?.title || currentStationConfig.initialDiagnostic?.title,
            stationTurnCount: currentTurns,
          }),
        });

        if (controller.signal.aborted || currentRequestIdRef.current !== reqId) {
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (controller.signal.aborted || currentRequestIdRef.current !== reqId) {
            return;
          }
          responseSource = data.source || 'gemini';
          reasoningContent = data.reasoning || '';
          summaryContent = data.summary || '';
          adviceContent = data.advice || '';
          replyContent = data.reply || adviceContent || summaryContent || '';
          isStationCompleted = Boolean(data.station_completed);
          
          if (data.score !== undefined && !isNaN(Number(data.score))) {
            const raw = Number(data.score);
            earnedScore = raw > 10 ? Math.round(raw / 10) : raw;
          }
          if (Array.isArray(data.strengths) && data.strengths.length > 0) {
            dynamicStrengths = data.strengths;
          }
          if (Array.isArray(data.challenges) && data.challenges.length > 0) {
            dynamicChallenges = data.challenges;
          }

          if (typeof replyContent === 'string' && (replyContent.startsWith('{') || replyContent.includes('"reasoning"'))) {
            try {
              const innerMatch = replyContent.match(/\{[\s\S]*\}/);
              if (innerMatch) {
                const inner = JSON.parse(innerMatch[0]);
                reasoningContent = inner.reasoning || reasoningContent;
                summaryContent = inner.summary || summaryContent;
                adviceContent = inner.advice || adviceContent;
                replyContent = inner.reply || inner.advice || inner.summary || '';
                if (inner.station_completed !== undefined) {
                  isStationCompleted = Boolean(inner.station_completed);
                }
                if (inner.score !== undefined && !isNaN(Number(inner.score))) {
                  const raw = Number(inner.score);
                  earnedScore = raw > 10 ? Math.round(raw / 10) : raw;
                }
                if (Array.isArray(inner.strengths) && inner.strengths.length > 0) dynamicStrengths = inner.strengths;
                if (Array.isArray(inner.challenges) && inner.challenges.length > 0) dynamicChallenges = inner.challenges;
              }
            } catch {
              // keep
            }
          }
        }
      } catch (fetchErr: any) {
        if (
          fetchErr?.name === 'AbortError' ||
          controller.signal.aborted ||
          currentRequestIdRef.current !== reqId ||
          String(fetchErr?.message || '').toLowerCase().includes('abort')
        ) {
          setIsAdvisorReplying(false);
          return;
        }
        console.warn('API call failed or offline, activating client intelligence engine:', fetchErr);
      }

      if (controller.signal.aborted || currentRequestIdRef.current !== reqId) {
        setIsAdvisorReplying(false);
        return;
      }

      if (!replyContent) {
        responseSource = 'local-fallback';
        const local = getClientAdvisorResponse(
          currentAdvisor,
          text,
          stationNumber,
          earnedScore,
          currentTurns,
          historyTextsArray
        );
        reasoningContent = local.reasoning;
        summaryContent = local.summary;
        adviceContent = local.advice;
        replyContent = local.reply;
        isStationCompleted = Boolean(local.station_completed);
        if (local.score !== undefined) earnedScore = local.score;
        if (local.strengths && local.strengths.length > 0) dynamicStrengths = local.strengths;
        if (local.challenges && local.challenges.length > 0) dynamicChallenges = local.challenges;
      }

      // If station completed by AI advisor:
      if (isStationCompleted) {
        const goldenHabit = currentAdvisor.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
        if (!replyContent.includes('تم اعتماد تقييم المحطة')) {
          const isSpiritual = currentAdvisor.id === 'spiritual';
          const scoreLabel = isSpiritual ? 'درجة السكينة التقديرية' : 'الدرجة المسجلة';
          const spiritualNote = isSpiritual ? '\n(تقدير لشعورك الحالي وليس حكماً على التزامك)' : '';
          replyContent += `\n\n✨ **تم اعتماد تقييم المحطة (${stationNumber} من 8 - ${currentAdvisor.title}):**\n${scoreLabel}: (${earnedScore.toFixed(1)} من 10).${spiritualNote}\n\n💡 **التوصية العلاجية الذهبية:**\n${goldenHabit}.\n\nتم تحديث عجلة حياتك بنجاح!`;
        }
      }

      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'advisor',
        text: replyContent,
        reasoning: reasoningContent,
        summary: summaryContent,
        advice: adviceContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCrisis: isCrisisMessage(replyContent) || isCrisisMessage(text),
        source: responseSource,
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      // Only trigger station completion and show modal when AI EXPLICITLY returns station_completed === true
      if (isStationCompleted) {
        onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, earnedScore);

        const goldenHabit = currentAdvisor.defaultGoals?.[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
        if (onAddEisenhowerGoal) {
          onAddEisenhowerGoal(goldenHabit, currentAdvisor.name, currentAdvisor.id);
        }
        
        const fallbackInsights = extractInsightsFromAnswers(currentAdvisor, earnedScore, answers);
        setStationInsights((prev) => ({
          ...prev,
          [currentAdvisor.id]: {
            score: earnedScore,
            strengths: dynamicStrengths.length > 0 ? dynamicStrengths : (fallbackInsights?.strengths || ['وعي طيب وشفافية في تشخيص واقع هذا الجانب']),
            challenges: dynamicChallenges.length > 0 ? dynamicChallenges : (fallbackInsights?.challenges || ['بناء عادة يومية مستدامة لحماية اتزانك']),
          },
        }));

        onFinishAdvisor(currentAdvisor.id, earnedScore);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.7 },
        });
        setShowCelebration(true);
      }
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        controller.signal.aborted ||
        currentRequestIdRef.current !== reqId ||
        String(err?.message || '').toLowerCase().includes('abort')
      ) {
        setIsAdvisorReplying(false);
        return;
      }
      console.error('Advisor chat error in onboarding:', err);
    } finally {
      if (currentRequestIdRef.current === reqId) {
        setIsAdvisorReplying(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStopAnswer = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAdvisorReplying) return;

    currentRequestIdRef.current = 'stopped_' + Date.now();

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (abortErr) {
        console.warn('[OnboardingScreen] Error aborting controller:', abortErr);
      }
      abortControllerRef.current = null;
    }

    setIsAdvisorReplying(false);

    if (lastSentUserTextRef.current) {
      setInputText(lastSentUserTextRef.current);
    }

    const sentId = lastSentMsgIdRef.current;
    if (sentId) {
      setChatMessages((prev) => ({
        ...prev,
        [currentAdvisor.id]: (prev[currentAdvisor.id] || []).filter((m) => m.id !== sentId),
      }));
    }

    const isCrisis = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|الموت|بالموت|اموت|أموت|بموت)/i.test(lastSentUserTextRef.current);
    if (!isCrisis) {
      setStationTurnCount((prev) => ({
        ...prev,
        [currentAdvisor.id]: Math.max(0, (prev[currentAdvisor.id] || 1) - 1),
      }));
    }
  };

  const handleUndoLastAnswer = () => {
    if (isCompleted || isAdvisorReplying) return;
    const currentList = chatMessages[currentAdvisor.id] || [];
    let lastUserIdx = -1;
    for (let i = currentList.length - 1; i >= 0; i--) {
      if (currentList[i].sender === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const undoneMsg = currentList[lastUserIdx];
    setInputText(undoneMsg.text);

    const isCrisis = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|الموت|بالموت|اموت|أموت|بموت)/i.test(undoneMsg.text);
    if (!isCrisis) {
      setStationTurnCount((prev) => ({
        ...prev,
        [currentAdvisor.id]: Math.max(0, (prev[currentAdvisor.id] || 1) - 1),
      }));
    }

    setChatMessages((prev) => {
      const list = prev[currentAdvisor.id] || [];
      const filtered = list.filter((_, idx) => idx !== lastUserIdx && idx !== lastUserIdx + 1);
      return {
        ...prev,
        [currentAdvisor.id]: filtered,
      };
    });
  };

  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const staticFallbackInsights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);
  const activeConversation = chatMessages[currentAdvisor.id] || [];

  const currentActiveInsights = stationInsights[currentAdvisor.id] || {
    score: currentAdvisorScore > 0 ? currentAdvisorScore : 7.5,
    strengths: (staticFallbackInsights?.strengths || []).slice(0, 2),
    challenges: (staticFallbackInsights?.challenges || []).slice(0, 2),
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300">
      {/* All 8 Domains Milestone & Station Selector Header */}
      <OnboardingProgressHeader
        completedCount={completedCount}
        progressPercent={progressPercent}
        isAllCompleted={isAllCompleted}
        currentAdvisorIndex={currentAdvisorIndex}
        completedAdvisors={completedAdvisors}
        onSelectAdvisor={(idx) => {
          setCurrentAdvisorIndex(idx);
          setShowCelebration(false);
        }}
        onNavigateToDashboard={onNavigateToDashboard}
      />

      {/* Main Assessment Window */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[680px] transition-colors">
        {/* Advisor Header Bar & Progress */}
        <AdvisorStationHeader
          currentAdvisor={currentAdvisor}
          stationNumber={stationNumber}
          progressPercent={progressPercent}
          isCompleted={isCompleted}
          aiMode={aiMode}
          showModeDropdown={showModeDropdown}
          isContextCompleted={isContextCompleted}
          isBannerDismissed={isBannerDismissed}
          onToggleModeDropdown={() => setShowModeDropdown(!showModeDropdown)}
          onSelectAiMode={handleSelectAiMode}
          onOpenContextModal={() => setShowContextModal(true)}
          onDismissBanner={handleDismissBanner}
          onReopenStation={handleReopenStation}
          onStartNewWeeklyAssessment={onStartNewWeeklyAssessment}
        />

        {/* Messages Stream */}
        <AssessmentChatStream
          messages={activeConversation}
          currentAdvisor={currentAdvisor}
          isAdvisorReplying={isAdvisorReplying}
          isCompleted={isCompleted}
          isPrivacyDismissed={Boolean(dismissedPrivacyNotices[currentAdvisor.id])}
          onDismissPrivacy={() =>
            setDismissedPrivacyNotices((prev) => ({ ...prev, [currentAdvisor.id]: true }))
          }
          onUndoLastAnswer={handleUndoLastAnswer}
          messagesEndRef={messagesEndRef}
        />

        {/* Input Bar & Dynamic Quick Choices */}
        <AssessmentInputBar
          inputText={inputText}
          isAdvisorReplying={isAdvisorReplying}
          isCompleted={isCompleted}
          stationTurnCount={stationTurnCount[currentAdvisor.id] || 0}
          currentAdvisor={currentAdvisor}
          stationNumber={stationNumber}
          currentActiveInsights={currentActiveInsights}
          currentStationConfig={currentStationConfig}
          currentAdvisorIndex={currentAdvisorIndex}
          onChangeInput={setInputText}
          onSendAnswer={handleSendAnswer}
          onStopAnswer={handleStopAnswer}
          onResetAdvisor={handleResetCurrentAdvisor}
          onGoToNextAdvisor={handleGoToNextAdvisor}
          onNavigateToAdvisorChat={onNavigateToAdvisorChat}
        />
      </div>

      {/* Celebration Modal when an Advisor's evaluation completes */}
      <StationCelebrationModal
        isOpen={showCelebration}
        currentAdvisor={currentAdvisor}
        stationNumber={stationNumber}
        completedAdvisorsCount={completedAdvisors.length}
        currentActiveInsights={currentActiveInsights}
        onGoToNextAdvisor={handleGoToNextAdvisor}
        onNavigateToAdvisorChat={onNavigateToAdvisorChat}
        onClose={() => setShowCelebration(false)}
      />

      {/* User Context Dialog Modal (سياق المستفيد) */}
      <UserContextModal
        isOpen={showContextModal}
        isContextCompleted={isContextCompleted}
        userProfile={userProfile}
        onClose={handleCloseContextModal}
        onSave={handleSaveContext}
      />
    </div>
  );
};
