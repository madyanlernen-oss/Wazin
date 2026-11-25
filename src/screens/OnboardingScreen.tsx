import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId, UserProfile } from '../types/lifeBalance';
import {
  STATION_ASSESSMENT_CONFIG,
  StationAssessmentConfig,
  getAdaptiveStationConfig,
} from '../data/assessmentQuestions';
import { parseUserContext, getDomainContextConfig } from '../utils/contextPersonalization';
import { generateDynamicQuickSuggestions } from '../utils/dynamicSuggestions';
import {
  generateRealisticAreaGoals,
  extractUserDialogueTextsForArea,
  synthesizeGoldenRecommendation,
} from '../utils/realisticGoalsGenerator';
import {
  calculateScoreForAdvisor,
  extractInsightsFromAnswers,
  isAdvisorWeeklyLocked,
} from '../utils/storage';
import { AiModelMode } from './AdvisorChatScreen';
import { isCrisisMessage } from '../components/CrisisSupportCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

import {
  calculateSemanticScore,
  extractExplicitRating,
  getClientAdvisorResponse,
  resetClientFallbackTracker,
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
  assessmentMode?: 'initial_assessment' | 'weekly_checkin';
  assessmentSessionId?: number | string;
  answers: Record<string, any>;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => boolean | void;
  onSaveStationGoals?: (advisorId: LifeAreaId, stationGoals: string[]) => void;
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

/**
 * Helper to dynamically extract the most personalized, realistic golden habit
 * directly from the consultation conversation and agreed micro-steps rather than
 * relying strictly on generic static defaults.
 */
function getDynamicGoldenHabit(
  advisor: AdvisorConfig,
  messages: EvaluationChatMessage[] = [],
  latestAdvice?: string,
  userProfile?: UserProfile | null,
  score: number = 5
): string {
  const userMessages = messages.filter((m) => m.sender === 'user').map((m) => m.text.trim());
  const advisorWithAdvice = [...messages]
    .reverse()
    .find((m) => m.sender === 'advisor' && m.advice && m.advice.trim().length > 10 && m.advice.trim().length < 320);

  const advisorCandidate =
    latestAdvice && latestAdvice.trim().length > 10 && latestAdvice.trim().length < 320
      ? latestAdvice.trim()
      : advisorWithAdvice?.advice?.trim();

  return synthesizeGoldenRecommendation({
    areaId: advisor.id,
    userTexts: userMessages,
    userProfile,
    score,
    advisorCandidate,
  });
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  assessmentMode,
  assessmentSessionId,
  answers,
  userProfile,
  onUpdateProfile,
  onSaveAnswer,
  onFinishAdvisor,
  onSaveStationGoals,
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
  // Track pending edit/undo resend per advisor so advisor never repeats greeting or prior question
  const [isEditResendByAdvisor, setIsEditResendByAdvisor] = useState<Record<string, boolean>>({});
  // Track temporary dismissal of score adoption choice when user clicks "الاستمرار في الحوار"
  const [dismissedChoiceTurns, setDismissedChoiceTurns] = useState<Record<string, number>>({});

  // Dynamic insights per station in memory only (never saved to localStorage across sessions)
  const [stationInsights, setStationInsights] = useState<Record<string, StationDynamicInsights>>({});

  // Isolate input draft per advisor station so switching advisors (e.g. Sufyan -> Layla) never leaks text across rooms
  const [draftsByAdvisor, setDraftsByAdvisor] = useState<Record<string, string>>({});
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
  // Confirmation modal for starting a new weekly assessment
  const [showWeeklyResetConfirm, setShowWeeklyResetConfirm] = useState(false);
  const prevSessionIdRef = useRef(assessmentSessionId);

  // Check whether user context is completed
  const isContextCompleted = Boolean(
    (userProfile?.employmentStatus?.trim() || userProfile?.workStatus?.trim()) &&
    userProfile?.ageGroup?.trim() &&
    userProfile?.hasDependents?.trim() &&
    (!((userProfile?.employmentStatus || userProfile?.workStatus || '').includes('طالب')) || userProfile?.incomeSource?.trim()) &&
    (!((userProfile?.employmentStatus || userProfile?.workStatus || '').includes('موظف') || (userProfile?.employmentStatus || userProfile?.workStatus || '').includes('صاحب عمل') || (userProfile?.employmentStatus || userProfile?.workStatus || '').includes('مستقل')) || userProfile?.incomeStability?.trim())
  );

  // إظهار نافذة سياق المستفيد تلقائياً إذا كانت البيانات غير مكتملة فقط (حتى لا تحجب رسالة الترحيب عند بدء تقييم جديد)
  useEffect(() => {
    if (!isContextCompleted) {
      setShowContextModal(true);
    }
  }, [assessmentSessionId, isContextCompleted]);

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
  const lastSentAdvisorIdRef = useRef<string>('');
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
  const inputText = draftsByAdvisor[currentAdvisor.id] || '';
  const setInputText = (val: string) => {
    const key = currentAdvisor.id;
    setDraftsByAdvisor((prev) => ({ ...prev, [key]: val }));
  };

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
        followUpProbe: `أقدّر شفافيتك يا ${userProfile?.name?.trim() || 'عزيزي'}. لنصل لتشخيص دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟`,
        suggestedResponses: ['مستقر وممتاز (8/10)', 'متوسط وسط بعض الضغوط (6/10)', 'يحتاج إعادة تنظيم وعناية (4/10)'],
      },
      initialDiagnostic: {
        title: 'كيف تصف حالك وشعورك العام في هذا الجانب ومستوى رضاك عنه؟',
        description: 'ما هو التحدي الأبرز وما تقييمك لمستواك من 1 إلى 10؟',
        placeholder: 'صف حالك ورضاك في هذا الجانب بصراحة...',
        followUpProbe: `أقدّر شفافيتك يا ${userProfile?.name?.trim() || 'عزيزي'}. لنصل لتشخيص تأسيسي دقيق: ما هو التحدي الأكبر وكيف تقيّم مستواك من 1 إلى 10؟`,
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

  // Helper to build dynamic, context-aware opening consultation message across all 8 stations
  const getOpeningMessage = (
    advisor: AdvisorConfig,
    stConfig: StationAssessmentConfig,
    stationNum: number
  ): EvaluationChatMessage => {
    const consult = stConfig.consultation || stConfig.initialDiagnostic;
    const parsedCtx = parseUserContext(userProfile);
    const domainCtx = getDomainContextConfig(advisor.id, parsedCtx);
    const userDisplayName = parsedCtx.name;

    const iconByArea: Record<LifeAreaId, string> = {
      spiritual: '🌿',
      financial: '💰',
      career: '🎯',
      personal: '🌱',
      learning: '📚',
      family: '🏡',
      social: '🤝',
      health: '💪',
    };
    const icon = iconByArea[advisor.id] || '🌿';

    const openingQuestion = domainCtx.openingQuestion || consult?.title;
    const existingScoreRaw = Number(answers?.[`${advisor.id}_score`]);
    const hasRecordedScore = Number.isFinite(existingScoreRaw) && existingScoreRaw >= 1 && existingScoreRaw <= 10;
    const scoreContextLine = hasRecordedScore
      ? `\n📊 التقييم المسجل حالياً لهذا الجانب: (${existingScoreRaw.toFixed(1)} من 10).`
      : '';
    const text = `أهلاً بك يا ${userDisplayName} في محطة ${advisor.title} ${icon}

أنا **${advisor.name}**، ${advisor.role}.
${domainCtx.contextIntro}${scoreContextLine}

📌 **سؤال الاستشارة والتشخيص (المحطة ${stationNum} من 8):**
${openingQuestion}

💡 ${domainCtx.guidanceNote}`;

    const initialQuickSuggestions = generateDynamicQuickSuggestions({
      domainId: advisor.id,
      roundNumber: 1,
      userProfile,
    });

    return {
      id: `welcome_${advisor.id}_${Date.now()}`,
      sender: 'advisor',
      text,
      suggestedReplies: initialQuickSuggestions,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // إعادة تصفير كافة المحطات والعودة الفورية للمحطة 1 من 8 (الجانب الروحي) مع رسالة الترحيب الأولى
  const resetToFirstStation = () => {
    currentRequestIdRef.current = `reset_all_${Date.now()}`;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    setIsAdvisorReplying(false);
    setShowCelebration(false);
    setDraftsByAdvisor({});
    setIsEditResendByAdvisor({});
    lastSentUserTextRef.current = '';
    lastSentMsgIdRef.current = '';
    lastSentAdvisorIdRef.current = '';
    setDismissedChoiceTurns({});
    const firstAdvisor = ADVISORS_LIST[0];
    const firstStationConfig = getAdaptiveStationConfig(firstAdvisor.id, userProfile) || currentStationConfig;
    const initialOpeningMsg = getOpeningMessage(firstAdvisor, firstStationConfig, 1);
    setChatMessages({ [firstAdvisor.id]: [initialOpeningMsg] });
    setStationInsights({});
    setStationTurnCount({ [firstAdvisor.id]: 0 });
    setCurrentAdvisorIndex(0);
    resetClientFallbackTracker();
    try {
      localStorage.removeItem('wazan_eval_chats');
      localStorage.removeItem('wazan_eval_insights');
      localStorage.removeItem('wazan_current_eval_advisor');
    } catch {
      // ignore
    }
  };

  // Switch cleanly between advisor stations: abort in-flight requests and isolate transient state
  const switchAdvisorStation = (targetIndex: number) => {
    currentRequestIdRef.current = `switch_${targetIndex}_${Date.now()}`;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    setIsAdvisorReplying(false);
    lastSentUserTextRef.current = '';
    lastSentMsgIdRef.current = '';
    lastSentAdvisorIdRef.current = '';
    setShowCelebration(false);
    setCurrentAdvisorIndex(targetIndex);
  };

  useEffect(() => {
    const isNewSession = assessmentSessionId !== undefined && assessmentSessionId !== prevSessionIdRef.current;
    if (isNewSession) {
      prevSessionIdRef.current = assessmentSessionId;
      resetToFirstStation();
      return;
    }
    if (completedAdvisors.length === 0) {
      resetToFirstStation();
    }
  }, [completedAdvisors.length, assessmentSessionId]);

  // تحديث رسائل الافتتاح في كافة المحطات التي لم تبدأ فيها المحادثة بعد عند اكتمال أو تعديل سياق المستفيد أو الدرجات
  useEffect(() => {
    setChatMessages((prev) => {
      let changed = false;
      const next: Record<string, EvaluationChatMessage[]> = { ...prev };
      ADVISORS_LIST.forEach((adv, idx) => {
        const msgs = next[adv.id];
        if (msgs && msgs.length === 1 && msgs[0].id.startsWith('welcome_')) {
          const stCfg = getAdaptiveStationConfig(adv.id, userProfile) || currentStationConfig;
          const refreshedOpening = getOpeningMessage(adv, stCfg, idx + 1);
          if (msgs[0].text !== refreshedOpening.text) {
            next[adv.id] = [refreshedOpening];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [
    userProfile?.name,
    userProfile?.employmentStatus,
    userProfile?.workStatus,
    userProfile?.incomeSource,
    userProfile?.hasDependents,
    userProfile?.incomeStability,
    userProfile?.ageGroup,
    userProfile?.currentFocus,
    answers?.[`${currentAdvisor.id}_score`],
  ]);

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
    currentRequestIdRef.current = `reopen_${advisorKey}_${Date.now()}`;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    setIsAdvisorReplying(false);
    lastSentUserTextRef.current = '';
    lastSentMsgIdRef.current = '';
    lastSentAdvisorIdRef.current = '';
    setDraftsByAdvisor((prev) => ({ ...prev, [advisorKey]: '' }));
    setIsEditResendByAdvisor((prev) => ({ ...prev, [advisorKey]: false }));
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
      switchAdvisorStation(nextIdx);
    } else {
      const firstIncomplete = ADVISORS_LIST.findIndex(
        (adv) => !completedAdvisors.includes(adv.id)
      );
      if (firstIncomplete >= 0) {
        switchAdvisorStation(firstIncomplete);
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
    const advisorKey = currentAdvisor.id;
    const reqId = `${advisorKey}_${Date.now()}`;
    currentRequestIdRef.current = reqId;
    lastSentUserTextRef.current = text;
    lastSentAdvisorIdRef.current = advisorKey;

    const userMsg: EvaluationChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    lastSentMsgIdRef.current = userMsg.id;

    setDraftsByAdvisor((prev) => ({ ...prev, [advisorKey]: '' }));
    const currentList = chatMessages[advisorKey] || [];
    const currentTurns = stationTurnCount[advisorKey] || 0;
    const isEditedOrResent = Boolean(isEditResendByAdvisor[advisorKey]);
    if (isEditedOrResent) {
      setIsEditResendByAdvisor((prev) => ({ ...prev, [advisorKey]: false }));
    }

    // التقاط التقييم الصريح فقط (مثل "تقييمي: 7 من 10" أو "8/10") ومنع التقاط أرقام عادية مثل "25 دقيقة" أو "ساعتين"
    let detectedScore: number | null = extractExplicitRating(text);

    // إذا كان المستخدم يطلب صراحة مواصلة الحوار أو الاستمرار أو إطالة الاستكشاف (عدم إنهاء المحطة)
    const isExplicitContinue = /(نكمل\s*قليلا|نكمل\s*شوية|نكمل\s*شوي|نكمل\s*الحوار|نكمل|نواصل|مواصلة|استمر|نستمر|نتابع|اطيل|أطيل|نطيل|طول|أريد\s*أن\s*أطيل|ودي\s*اطيل|ودي\s*نطيل|نتعمق|تعمق|لسه|لسة|باقي|حوار)/i.test(text.trim()) && !/(نكمل\s*للمحطة|نكمل\s*المحطة\s*التالية|ننتقل)/i.test(text.trim());
    // إذا كان المستخدم يطلب صراحة اعتماد التقييم الحالي وكان هناك تقييم معروض في آخر رسالة للمستشار
    const isExplicitAdoption = !isExplicitContinue && /(اعتمد\s+التقييم|اعتماد\s+التقييم|اعتمدها|نعم\s+اعتمد|اعتماد)/i.test(text.trim());
    if (isExplicitAdoption && !isContextCompleted) {
      setShowContextModal(true);
      return;
    }
    let pendingOfferedScore: number | null = null;
    if (isExplicitAdoption) {
      const lastAdvisorMsg = [...currentList].reverse().find((m) => m.sender === 'advisor');
      if (lastAdvisorMsg) {
        const offeredMatch =
          lastAdvisorMsg.text.match(/(?:أقيّم|أقيم|تقييم|بدرجة|درجة|وضعك\s+الحالي\s+بدرجة|تقييمك|تقييمي)\s*[:(]?\s*([1-9](?:\.\d+)?|10(?:\.0+)?)\s*(?:\/|\s*من\s*)\s*10/i) ||
          lastAdvisorMsg.text.match(/(?:^|[(\s])([1-9](?:\.\d+)?|10(?:\.0+)?)\s*(?:\/|\s*من\s*)\s*10(?:[)\s.,!?]|$)/i);
        if (offeredMatch) {
          const val = parseFloat(offeredMatch[1]);
          if (!isNaN(val) && val >= 1 && val <= 10) {
            pendingOfferedScore = val;
            detectedScore = val;
          }
        }
      }
    }

    // حفظ الإجابة النصية، ولا نعتمد درجة التقييم الرسمية في المحطة إلا عند الاعتماد الفعلي بعد بلوغ الحد الأدنى من الجولات
    if (detectedScore !== null && currentTurns >= 3) {
      onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_self_rating`, detectedScore);
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
      const history = currentList.slice(-40).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      let replyContent = '';
      let reasoningContent = '';
      let summaryContent = '';
      let adviceContent = '';
      let isStationCompleted = false;
      const historyTextsArray = currentList.map((m) => m.text);
      const userOnlyHistory = currentList.filter((m) => m.sender === 'user').map((m) => m.text);
      const previousSuggestions = currentList
        .filter((m) => m.sender === 'advisor')
        .slice(-3)
        .flatMap((m) => m.suggestedReplies || []);
      let earnedScore = calculateSemanticScore(text, historyTextsArray, detectedScore || undefined);
      let dynamicStrengths: string[] = [];
      let dynamicChallenges: string[] = [];
      let aiSuggestedReplies: string[] = [];
      let responseSource: 'gemini' | 'groq' | 'local-fallback' = 'gemini';

      try {
        const cleanUserProfile = {
          name: userProfile?.name?.trim() || 'عزيزي',
          ...(userProfile?.email?.trim() ? { email: userProfile.email.trim() } : {}),
          ...(userProfile?.ageGroup?.trim() ? { ageGroup: userProfile.ageGroup.trim() } : {}),
          employmentStatus: userProfile?.employmentStatus?.trim() || userProfile?.workStatus?.trim() || 'غير محدد',
          ...(userProfile?.workStatus?.trim() ? { workStatus: userProfile.workStatus.trim() } : {}),
          ...(userProfile?.hasDependents?.trim() ? { hasDependents: userProfile.hasDependents.trim() } : {}),
          ...(userProfile?.incomeSource?.trim() ? { incomeSource: userProfile.incomeSource.trim() } : {}),
          ...(userProfile?.incomeStability?.trim() ? { incomeStability: userProfile.incomeStability.trim() } : {}),
          ...(userProfile?.currentFocus?.trim() ? { currentFocus: userProfile.currentFocus.trim() } : {}),
        };

        const res = await fetch('/api/gemini/advisor-chat', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisor: currentAdvisor,
            userName: userProfile?.name?.trim() || 'عزيزي',
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
            previousSuggestions,
            isEditedOrResent,
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
          if (Array.isArray(data.suggestedReplies) && data.suggestedReplies.length > 0) {
            aiSuggestedReplies = data.suggestedReplies;
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
                if (Array.isArray(inner.suggestedReplies) && inner.suggestedReplies.length > 0) aiSuggestedReplies = inner.suggestedReplies;
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
          historyTextsArray,
          userProfile,
          previousSuggestions,
          isEditedOrResent
        );
        reasoningContent = local.reasoning;
        summaryContent = local.summary;
        adviceContent = local.advice;
        replyContent = local.reply;
        isStationCompleted = Boolean(local.station_completed);
        if (local.score !== undefined) earnedScore = local.score;
        if (local.strengths && local.strengths.length > 0) dynamicStrengths = local.strengths;
        if (local.challenges && local.challenges.length > 0) dynamicChallenges = local.challenges;
        if (Array.isArray(local.suggestedReplies) && local.suggestedReplies.length > 0) aiSuggestedReplies = local.suggestedReplies;
      }

      const isMinimumRoundsReached = currentTurns >= 3; // الجولة الرابعة (3 ردود سابقة + الرد الرابع الحالي)
      if (isExplicitAdoption) {
        // إذا اختار المستفيد صراحة اعتماد التقييم، يتم اعتماد التقييم وإتمام المحطة فوراً
        isStationCompleted = true;
        if (pendingOfferedScore !== null) {
          earnedScore = pendingOfferedScore;
        } else if (earnedScore === undefined || earnedScore <= 0) {
          earnedScore = currentAdvisor.id === 'financial' ? 5.5 : 6.0;
        }
      } else {
        // لا تُغلق المحطة تلقائياً أبداً قبل أن يطلب المستفيد صراحة اعتماد التقييم
        isStationCompleted = false;
        if (pendingOfferedScore !== null) {
          earnedScore = pendingOfferedScore;
        }
      }

      // التحقق من صلاحية الدرجة وتنفيذ State Commit أولاً قبل إصدار أي رسالة اعتماد
      let stateCommitSucceeded = false;
      const stationMsgsWithLatest = [
        ...(chatMessages[advisorKey] || []),
        { id: 'latest_user', sender: 'user' as const, text, timestamp: '' },
      ];
      const goldenHabit = getDynamicGoldenHabit(
        currentAdvisor,
        stationMsgsWithLatest,
        adviceContent,
        userProfile,
        pendingOfferedScore ?? earnedScore ?? 5
      );

      if (isStationCompleted) {
        if (pendingOfferedScore !== null) {
          earnedScore = pendingOfferedScore;
        }
        const normalizedFinalScore = Number((earnedScore || 0).toFixed(1));
        const isScoreValid = !isNaN(normalizedFinalScore) && normalizedFinalScore >= 1 && normalizedFinalScore <= 10;

        if ((isMinimumRoundsReached || isExplicitAdoption) && isScoreValid) {
          onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, normalizedFinalScore);
          const finishResult = onFinishAdvisor(currentAdvisor.id, normalizedFinalScore);
          stateCommitSucceeded = finishResult !== false;
          if (stateCommitSucceeded) {
            earnedScore = normalizedFinalScore;
          }
        }
      }

      if (!stateCommitSucceeded) {
        // إذا رفض شرط الحماية حفظ الدرجة أو لم ينجح تحديث الحالة، يُمنع إصدار أي رسالة اعتماد في المحادثة!
        isStationCompleted = false;
        replyContent = replyContent
          .replace(/✨?\s*\*?\*?تم اعتماد تقييم[^\n]*\*?\*?/gi, '')
          .replace(/تم اعتماد تقييمك[^\n.]*[.!؟]?/gi, '')
          .replace(/تم تحديث عجلة حياتك بنجاح!?/gi, '')
          .trim();
      } else {
        // تم تحديث الحالة وحفظ الدرجة وتحديث شريط التقدم بنجاح — الآن فقط نصدر رسالة الاعتماد
        if (!replyContent.includes('تم اعتماد تقييم المحطة')) {
          const isSpiritual = currentAdvisor.id === 'spiritual';
          const scoreLabel = isSpiritual ? 'درجة السكينة التقديرية' : 'الدرجة المسجلة';
          const spiritualNote = isSpiritual ? '\n(تقدير لشعورك الحالي وليس حكماً على التزامك)' : '';
          replyContent += `\n\n✨ **تم اعتماد تقييم المحطة (${stationNumber} من 8 - ${currentAdvisor.title}):**\n${scoreLabel}: (${earnedScore.toFixed(1)} من 10).${spiritualNote}\n\n💡 **التوصية العلاجية الذهبية:**\n${goldenHabit}.\n\nتم تحديث عجلة حياتك بنجاح!`;
        }
        if (onAddEisenhowerGoal) {
          onAddEisenhowerGoal(goldenHabit, currentAdvisor.name, currentAdvisor.id);
        }
        const stationUserTexts = extractUserDialogueTextsForArea(
          currentAdvisor.id,
          answers,
          stationMsgsWithLatest
        );
        const realisticGoals = generateRealisticAreaGoals({
          areaId: currentAdvisor.id,
          userTexts: stationUserTexts,
          userProfile,
          score: earnedScore,
          goldenRecommendation: goldenHabit,
          challenges: dynamicChallenges,
          strengths: dynamicStrengths,
        });
        if (onSaveStationGoals && realisticGoals.length > 0) {
          onSaveStationGoals(currentAdvisor.id, realisticGoals);
        }
        const fallbackInsights = extractInsightsFromAnswers(
          currentAdvisor,
          earnedScore,
          answers,
          stationMsgsWithLatest.map((m) => m.text),
          userProfile
        );
        setStationInsights((prev) => ({
          ...prev,
          [currentAdvisor.id]: {
            score: earnedScore,
            strengths: dynamicStrengths.length > 0 ? dynamicStrengths : (fallbackInsights?.strengths || ['الصراحة والوضوح في توصيف واقع هذا الجانب']),
            challenges: dynamicChallenges.length > 0 ? dynamicChallenges : [goldenHabit],
            goldenRecommendation: goldenHabit,
          },
        }));
      }

      const nextSuggestedReplies = isStationCompleted
        ? []
        : generateDynamicQuickSuggestions({
            domainId: currentAdvisor.id,
            roundNumber: Math.max(1, currentTurns + 2),
            lastUserMessage: text,
            advisorReply: replyContent,
            userProfile,
            previousChips: previousSuggestions,
            userHistory: userOnlyHistory,
            aiSuggestedReplies,
          });

      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'advisor',
        text: replyContent,
        reasoning: reasoningContent,
        summary: summaryContent,
        advice: adviceContent,
        suggestedReplies: nextSuggestedReplies,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCrisis: isCrisisMessage(replyContent) || isCrisisMessage(text),
        source: responseSource,
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      if (isStationCompleted && stateCommitSucceeded) {
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

    const originAdvisorKey = lastSentAdvisorIdRef.current || currentAdvisor.id;
    setIsAdvisorReplying(false);

    if (lastSentUserTextRef.current) {
      setDraftsByAdvisor((prev) => ({
        ...prev,
        [originAdvisorKey]: lastSentUserTextRef.current,
      }));
    }

    const sentId = lastSentMsgIdRef.current;
    if (sentId) {
      setChatMessages((prev) => ({
        ...prev,
        [originAdvisorKey]: (prev[originAdvisorKey] || []).filter((m) => m.id !== sentId),
      }));
    }

    const isCrisis = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|الموت|بالموت|اموت|أموت|بموت)/i.test(lastSentUserTextRef.current);
    if (!isCrisis) {
      setStationTurnCount((prev) => ({
        ...prev,
        [originAdvisorKey]: Math.max(0, (prev[originAdvisorKey] || 1) - 1),
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
    setIsEditResendByAdvisor((prev) => ({
      ...prev,
      [currentAdvisor.id]: true,
    }));

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

  // فحص ما إذا كانت آخر رسالة للمستشار تحتوي على درجة مقترحة للاعتماد أو المستشار جاهز (بعد 4 جولات)
  let lastOfferedScore: number | null = null;
  const lastAdvisorMessage = [...activeConversation].reverse().find((m) => m.sender === 'advisor');
  if (lastAdvisorMessage && !isCompleted) {
    const scoreInMsgMatch =
      lastAdvisorMessage.text.match(/(?:أقيّم|أقيم|تقييم|بدرجة|درجة|وضعك\s+الحالي\s+بدرجة|تقييمك|تقييمي)\s*[:(]?\s*([1-9](?:\.\d+)?|10(?:\.0+)?)\s*(?:\/|\s*من\s*)\s*10/i) ||
      lastAdvisorMessage.text.match(/(?:^|[(\s])([1-9](?:\.\d+)?|10(?:\.0+)?)\s*(?:\/|\s*من\s*)\s*10(?:[)\s.,!?]|$)/i);
    if (scoreInMsgMatch) {
      const val = parseFloat(scoreInMsgMatch[1]);
      if (!isNaN(val) && val >= 1 && val <= 10) {
        lastOfferedScore = val;
      }
    }
  }

  const currentStationTurns = stationTurnCount[currentAdvisor.id] || 0;
  // شريط التقييم المقترح مع زرّي (اعتماد التقييم / الاستمرار في الحوار) يظهر بمجرد أن يطرح المستشار تقييماً أولياً أو ابتداءً من الجولة الرابعة
  const isAdvisorReadyForScoring = !isCompleted && (lastOfferedScore !== null || currentStationTurns >= 4);
  const effectiveOfferedScore = lastOfferedScore ?? (currentAdvisorScore > 0 ? currentAdvisorScore : (currentAdvisor.id === 'financial' ? 5.5 : 6.0));
  const isChoiceTemporarilyDismissed = dismissedChoiceTurns[currentAdvisor.id] === currentStationTurns && lastOfferedScore === null;

  const userMessagesInStation = activeConversation.filter((m) => m.sender === 'user').map((m) => m.text);
  const lastUserMsgText = userMessagesInStation[userMessagesInStation.length - 1] || '';
  const stationPreviousChips = activeConversation
    .filter((m) => m.sender === 'advisor')
    .slice(-4, -1)
    .flatMap((m) => m.suggestedReplies || []);
  const dynamicQuickSuggestions = isCompleted
    ? []
    : (lastAdvisorMessage?.suggestedReplies && lastAdvisorMessage.suggestedReplies.length > 0
        ? lastAdvisorMessage.suggestedReplies
        : generateDynamicQuickSuggestions({
            domainId: currentAdvisor.id,
            roundNumber: Math.max(1, currentStationTurns + 1),
            lastUserMessage: lastUserMsgText,
            advisorReply: lastAdvisorMessage?.text || '',
            userProfile,
            previousChips: stationPreviousChips,
            userHistory: userMessagesInStation,
          }));

  const handleContinueDialogue = () => {
    setDismissedChoiceTurns((prev) => ({
      ...prev,
      [currentAdvisor.id]: currentStationTurns,
    }));
    handleSendAnswer('أرغب في الاستمرار في الحوار ومناقشة تفاصيل إضافية حول هذا الجانب');
  };

  // معالج الاعتماد المباشر للدرجة وإتمام المحطة: تمرير سجل المحادثة الكامل إلى Gemini API لتوليد الملخص والتوصية الذهبية مع التزام State Commit أولاً
  const handleAdoptScoreAndComplete = async (scoreToAdopt: number) => {
    if (!isContextCompleted) {
      setShowContextModal(true);
      return;
    }
    const finalScore = Number(scoreToAdopt.toFixed(1));
    if (isNaN(finalScore) || finalScore < 1 || finalScore > 10) {
      return;
    }

    // 1. حفظ الدرجة وتحديث حالة الإنجاز وشريط التقدم والمخزن أولاً (State Commit)
    onSaveAnswer(currentAdvisor.id, `${currentAdvisor.id}_score`, finalScore);
    const finishCommitted = onFinishAdvisor(currentAdvisor.id, finalScore);
    if (finishCommitted === false) {
      // إذا رفض شرط الحماية حفظ الدرجة، نمتنع تماماً عن إصدار رسالة الاعتماد
      return;
    }

    const currentAdvisorMsgs = chatMessages[currentAdvisor.id] || [];
    const fallbackInsights = extractInsightsFromAnswers(
      currentAdvisor,
      finalScore,
      answers,
      currentAdvisorMsgs.map((m) => m.text),
      userProfile
    );
    let goldenHabit = getDynamicGoldenHabit(currentAdvisor, currentAdvisorMsgs, undefined, userProfile, finalScore);
    let finalStrengths = fallbackInsights?.strengths || ['الصراحة في توصيف واقع هذا الجانب'];
    let finalChallenges = [goldenHabit, ...(fallbackInsights?.challenges?.slice(1) || [])];
    let apiSuggestedGoals: string[] = [];

    // 2. تمرير سجل محادثة المستخدم الكامل في هذه المحطة إلى Gemini API لتخصيص نقاط القوة وفرص التحسين والتوصية العلاجية الذهبية
    setIsAdvisorReplying(true);
    try {
      const summaryController = new AbortController();
      const summaryTimer = setTimeout(() => summaryController.abort(), 4500);
      const summaryRes = await fetch('/api/gemini/station-summary', {
        method: 'POST',
        signal: summaryController.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisor: currentAdvisor,
          agentKey: currentAdvisor.id,
          userProfile,
          userName: userProfile?.name?.trim() || 'عزيزي',
          score: finalScore,
          history: currentAdvisorMsgs.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
        }),
      });
      clearTimeout(summaryTimer);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (typeof summaryData.goldenRecommendation === 'string' && summaryData.goldenRecommendation.trim().length > 5) {
          goldenHabit = synthesizeGoldenRecommendation({
            areaId: currentAdvisor.id,
            userTexts: currentAdvisorMsgs.filter((m) => m.sender === 'user').map((m) => m.text),
            userProfile,
            score: finalScore,
            advisorCandidate: summaryData.goldenRecommendation.trim(),
          });
        }
        if (Array.isArray(summaryData.strengths) && summaryData.strengths.length > 0) {
          finalStrengths = summaryData.strengths;
        }
        if (Array.isArray(summaryData.challenges) && summaryData.challenges.length > 0) {
          finalChallenges = summaryData.challenges;
        }
        if (Array.isArray(summaryData.suggestedGoals) && summaryData.suggestedGoals.length > 0) {
          apiSuggestedGoals = summaryData.suggestedGoals;
        }
      }
    } catch (summaryErr) {
      console.warn('[OnboardingScreen] تعذر الاتصال بنقطة station-summary، تفعيل الاستخلاص المرتبط بسجل الحوار:', summaryErr);
    } finally {
      setIsAdvisorReplying(false);
    }

    if (onAddEisenhowerGoal) {
      onAddEisenhowerGoal(goldenHabit, currentAdvisor.name, currentAdvisor.id);
    }

    const stationUserTexts = extractUserDialogueTextsForArea(
      currentAdvisor.id,
      answers,
      currentAdvisorMsgs
    );
    const realisticGoals = generateRealisticAreaGoals({
      areaId: currentAdvisor.id,
      userTexts: stationUserTexts,
      userProfile,
      score: finalScore,
      goldenRecommendation: apiSuggestedGoals[0] || goldenHabit,
      challenges: finalChallenges,
      strengths: finalStrengths,
    });
    if (onSaveStationGoals && realisticGoals.length > 0) {
      onSaveStationGoals(currentAdvisor.id, realisticGoals);
    }

    setStationInsights((prev) => ({
      ...prev,
      [currentAdvisor.id]: {
        score: finalScore,
        strengths: finalStrengths,
        challenges: finalChallenges,
        goldenRecommendation: goldenHabit,
      },
    }));

    // 3. بعد نجاح حفظ الدرجة وتوليد التوصية المخصصة، نصدر رسالة تأكيد الاعتماد في المحادثة
    const isSpiritual = currentAdvisor.id === 'spiritual';
    const scoreLabel = isSpiritual ? 'درجة السكينة التقديرية' : 'الدرجة المسجلة';
    const spiritualNote = isSpiritual ? '\n(تقدير لشعورك الحالي وليس حكماً على التزامك)' : '';
    const completionReply = `✨ **تم اعتماد تقييم المحطة (${stationNumber} من 8 - ${currentAdvisor.title}):**\n${scoreLabel}: (${finalScore.toFixed(1)} من 10).${spiritualNote}\n\n💡 **التوصية العلاجية الذهبية:**\n${goldenHabit}.\n\nتم تحديث عجلة حياتك بنجاح!`;

    const userConfirmationMsg: EvaluationChatMessage = {
      id: `user_confirm_${Date.now()}`,
      sender: 'user',
      text: `اعتمد التقييم بدرجة ${finalScore} من 10`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const advisorConfirmationMsg: EvaluationChatMessage = {
      id: `advisor_confirm_${Date.now()}`,
      sender: 'advisor',
      text: completionReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => ({
      ...prev,
      [currentAdvisor.id]: [...(prev[currentAdvisor.id] || []), userConfirmationMsg, advisorConfirmationMsg],
    }));

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
    });
    setShowCelebration(true);
  };

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
          switchAdvisorStation(idx);
        }}
        onNavigateToDashboard={onNavigateToDashboard}
      />

      {/* Main Assessment Window */}
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl overflow-hidden shadow-xs flex flex-col min-h-[680px] h-[calc(100vh-11rem)] max-h-[820px] transition-colors">
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
          onStartNewWeeklyAssessment={onStartNewWeeklyAssessment ? () => setShowWeeklyResetConfirm(true) : undefined}
        />

        {/* Messages Stream */}
        <AssessmentChatStream
          key={`stream_${currentAdvisor.id}`}
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
          offeredScore={isAdvisorReadyForScoring ? effectiveOfferedScore : null}
          onAdoptScoreAndComplete={handleAdoptScoreAndComplete}
          onContinueDialogue={handleContinueDialogue}
        />

        {/* Input Bar & Dynamic Quick Choices */}
        <AssessmentInputBar
          key={`bar_${currentAdvisor.id}`}
          inputText={inputText}
          isAdvisorReplying={isAdvisorReplying}
          isCompleted={isCompleted}
          stationTurnCount={stationTurnCount[currentAdvisor.id] || 0}
          currentAdvisor={currentAdvisor}
          stationNumber={stationNumber}
          currentActiveInsights={currentActiveInsights}
          currentStationConfig={currentStationConfig}
          currentAdvisorIndex={currentAdvisorIndex}
          quickSuggestions={dynamicQuickSuggestions}
          offeredScore={isAdvisorReadyForScoring ? effectiveOfferedScore : null}
          isChoiceDismissed={isChoiceTemporarilyDismissed}
          onAdoptScoreAndComplete={handleAdoptScoreAndComplete}
          onContinueDialogue={handleContinueDialogue}
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

      {/* Confirmation Dialog for Starting a New Weekly Assessment */}
      {onStartNewWeeklyAssessment && (
        <ConfirmDialog
          open={showWeeklyResetConfirm}
          title="بدء تقييم أسبوعي جديد"
          description="سيتم تصفير المحطة الحالية والعودة فوراً إلى المحطة 1 من 8 (الجانب الروحي) ومسح رسائل المحادثات السابقة والدرجات غير المعتمدة. هل تريد المتابعة؟"
          confirmLabel="نعم، بدء تقييم جديد"
          cancelLabel="إلغاء"
          variant="warning"
          onCancel={() => setShowWeeklyResetConfirm(false)}
          onConfirm={() => {
            setShowWeeklyResetConfirm(false);
            resetToFirstStation();
            onStartNewWeeklyAssessment();
          }}
        />
      )}
    </div>
  );
};
