import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Check,
  User,
  Lightbulb,
  ChevronDown,
  Lock,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Compass,
  RotateCcw,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../types/lifeBalance';
import {
  calculateScoreForAdvisor,
  extractInsightsFromAnswers,
  isAdvisorWeeklyLocked,
  getDaysUntilNextUnlock,
} from '../utils/storage';
import { AI_MODES, AiModelMode } from './AdvisorChatScreen';

interface EvaluationChatMessage {
  id: string;
  sender: 'advisor' | 'user';
  text: string;
  timestamp: string;
}

interface OnboardingScreenProps {
  initialAdvisorId?: LifeAreaId;
  answers: Record<string, any>;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => void;
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  completedDates?: Record<string, number>;
  onNavigateToDashboard: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  onSaveAnswer,
  onFinishAdvisor,
  onCompleteAll,
  completedAdvisors,
  completedDates,
  onNavigateToDashboard,
  onNavigateToAdvisorChat,
}) => {
  const [currentAdvisorIndex, setCurrentAdvisorIndex] = useState(() => {
    const idx = ADVISORS_LIST.findIndex((a) => a.id === initialAdvisorId);
    return idx >= 0 ? idx : 0;
  });

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isAdvisorReplying, setIsAdvisorReplying] = useState(false);
  const [aiMode, setAiMode] = useState<AiModelMode>(() => {
    return (localStorage.getItem('tadbeer_ai_mode') as AiModelMode) || 'balanced';
  });
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('tadbeer_ai_mode', mode);
  };

  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  // Chat conversation state per advisor
  const [chatMessages, setChatMessages] = useState<Record<string, EvaluationChatMessage[]>>({});
  // Step in the 3-phase weekly evaluation ritual:
  // 0: Welcome, Listening & Initial Rating (1-10)
  // 1: Exploring Core Obstacle / Challenge
  // 2: Weekly Diagnosis, Golden Prescription & Domain Locked
  const [advisorStep, setAdvisorStep] = useState<Record<string, number>>({});

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const currentStep = advisorStep[currentAdvisor.id] || 0;

  // Determine if current advisor is completed / locked for this week
  const isCompleted = completedAdvisors.includes(currentAdvisor.id);
  const isLocked = isCompleted || isAdvisorWeeklyLocked(currentAdvisor.id, completedDates);
  const daysRemaining = getDaysUntilNextUnlock(completedDates?.[currentAdvisor.id]) || 7;

  // All 8 domains completed state
  const isAllCompleted = completedAdvisors.length >= 8;

  // Speech Recognition Setup (Web Speech API) - Voice Input only (Speech to Text)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle voice recording (Speech to text)
  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('ميزة الميكروفون غير مفعلة أو غير مدعومة في متصفحك. يمكنك الكتابة مباشرة.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  // Initialize welcoming message for weekly clinic evaluation
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    if (!chatMessages[advisorKey] || chatMessages[advisorKey].length === 0) {
      const initialMsgs: EvaluationChatMessage[] = [
        {
          id: 'welcome',
          sender: 'advisor',
          text: `مرحباً بك يا ضيف تدبير في عيادة التقييم الأسبوعي الخاصة بـ "${currentAdvisor.title}" 🌿\n\nأنا ${currentAdvisor.name}، ${currentAdvisor.role}.\nهذه الجلسة هي مساحتك الآمنة للتنفس والمصارحة دون أي أحكام مسبقة.\n\nكيف تصف حالك وشعورك العام في هذا الجانب هذا الأسبوع؟ وما تقييمك لمستوى رضاك الحالي من 1 إلى 10؟`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setChatMessages((prev) => ({ ...prev, [advisorKey]: initialMsgs }));
      setAdvisorStep((prev) => ({ ...prev, [advisorKey]: 0 }));
    }
  }, [currentAdvisorIndex, currentAdvisor]);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentAdvisorIndex]);

  // Finish and approve current advisor assessment immediately
  const handleFinishCurrentAdvisor = () => {
    const calculatedScore = calculateScoreForAdvisor(currentAdvisor, answers);
    const scoreToSave = calculatedScore > 0 ? calculatedScore : 7.0;
    onFinishAdvisor(currentAdvisor.id, scoreToSave);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
    setShowCelebration(true);
  };

  // Reset and restart evaluation for current advisor
  const handleResetCurrentAdvisor = () => {
    const advisorKey = currentAdvisor.id;
    setAdvisorStep((prev) => ({ ...prev, [advisorKey]: 0 }));
    const initialMsgs: EvaluationChatMessage[] = [
      {
        id: `welcome_${Date.now()}`,
        sender: 'advisor',
        text: `مرحباً بك مجدداً في عيادة التقييم الأسبوعي الخاصة بـ "${currentAdvisor.title}" 🌿\n\nأنا ${currentAdvisor.name}، ${currentAdvisor.role}.\nأنا معك للإصغاء والتقييم من جديد بكل أريحية وتجربة كل الأسئلة بحرية.\n\nكيف تصف حالك وشعورك العام في هذا الجانب الآن؟ وما تقييمك لمستوى رضاك من 1 إلى 10؟`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatMessages((prev) => ({ ...prev, [advisorKey]: initialMsgs }));
  };

  // Move to next incomplete advisor
  const handleGoToNextAdvisor = () => {
    setShowCelebration(false);
    // Find next incomplete advisor index
    const nextIdx = ADVISORS_LIST.findIndex(
      (adv, i) => i > currentAdvisorIndex && !completedAdvisors.includes(adv.id)
    );
    if (nextIdx >= 0) {
      setCurrentAdvisorIndex(nextIdx);
    } else {
      // Find first incomplete anywhere
      const firstIncomplete = ADVISORS_LIST.findIndex(
        (adv) => !completedAdvisors.includes(adv.id)
      );
      if (firstIncomplete >= 0) {
        setCurrentAdvisorIndex(firstIncomplete);
      } else {
        // All completed!
        onCompleteAll();
      }
    }
  };

  // Handle user response with structured clinical session (Open Testing Mode)
  const handleSendAnswer = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAdvisorReplying) return;

    const advisorKey = currentAdvisor.id;
    const userMsg: EvaluationChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Save answer and check if user provided a numeric rating
    const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:من\s*10|\/10)?/);
    if (ratingMatch && currentStep === 0) {
      const num = Math.min(10, Math.max(1, parseFloat(ratingMatch[1])));
      onSaveAnswer(currentAdvisor.id, 'score_rating', num);
    } else {
      onSaveAnswer(currentAdvisor.id, `phase_${currentStep + 1}`, text);
    }

    setInputText('');
    const currentList = chatMessages[advisorKey] || [];
    const nextStep = currentStep + 1;
    setAdvisorStep((prev) => ({ ...prev, [advisorKey]: nextStep }));

    // Display user message immediately
    setChatMessages((prev) => ({
      ...prev,
      [advisorKey]: [...currentList, userMsg],
    }));

    setIsAdvisorReplying(true);

    try {
      const history = currentList.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      // Call AI Agent API with assessment session mode
      const res = await fetch('/api/gemini/advisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisor: currentAdvisor,
          message: text,
          history,
          answers,
          userScore: calculateScoreForAdvisor(currentAdvisor, answers),
          aiMode,
          isEvaluationSession: true,
          evaluationStep: nextStep,
        }),
      });

      let replyContent = '';
      if (res.ok) {
        const data = await res.json();
        replyContent = data.reply || data.advice || data.summary || '';
      }

      // If reply is empty, generate contextual clinical response
      if (!replyContent) {
        if (nextStep === 1) {
          replyContent = `أسمعك بكل تقدير واحتواء يا صديقنا، ورصدت تقييمك ومشاعرك بوعي تام.\n\nكطبيب ومرشد لك في ${currentAdvisor.title}، كل مرحلة نمر بها هي فرصة للاتزان وإعادة الضبط. بالنظر إلى وتيرة أسبوعك المنصرم، ما هو أكبر تحدٍ أو عائق نفسي أو عملي واجهك وشعرت أنه يسحب من طاقتك وتركيزك في هذا الجانب؟`;
        } else if (nextStep === 2) {
          const finalScore = calculateScoreForAdvisor(currentAdvisor, answers);
          const goldenHabit = currentAdvisor.defaultGoals[0] || 'الالتزام بعادة يومية صغيرة ومستمرة';
          replyContent = `✅ أحسنت يا صديقنا. استمعت بتقدير لكل ما شاركته في جلستنا التقييمية.\n\nرصدنا درجتك المعتمدة في ${currentAdvisor.title}: (${finalScore > 0 ? finalScore : 7}/10).\n\n📌 **توصيتي الذهبية لهذا الأسبوع:**\n${goldenHabit}.\n\nتم اعتماد التقييم بنجاح، وباب الحوار مفتوح معك دائماً لأي استفسارات أو تفاصيل إضافية. يمكنك الانتقال للجانب التالي أو مواصلة الحديث معي بحرية.`;
        } else {
          replyContent = `أنا معك وأتابع ما تطرحه باهتمام في مجال ${currentAdvisor.title}. خطوتك القادمة تصنع فرقاً حقيقياً إذا واصلت التركيز على العادات الصغيرة وتجاوزت التسويف. كيف تحب أن نطور هذا الجانب أكثر؟`;
        }
      }

      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'advisor',
        text: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));

      // When step 2 completes, record completion badge
      if (nextStep === 2) {
        const finalScore = calculateScoreForAdvisor(currentAdvisor, answers);
        const scoreToSave = finalScore > 0 ? finalScore : 7.0;
        onFinishAdvisor(currentAdvisor.id, scoreToSave);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Advisor chat error in onboarding:', err);
    } finally {
      setIsAdvisorReplying(false);
    }
  };

  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const insights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);
  const activeConversation = chatMessages[currentAdvisor.id] || [];

  // Quick reflection suggestions derived safely from advisor data without ever crashing
  const quickReflectionPills = useMemo(() => {
    const questionOptions = currentAdvisor.questions?.flatMap((q) => q.options?.map((o) => o.label) || []) || [];
    const suggestions = currentAdvisor.suggestedQuestions || [];
    const goals = currentAdvisor.defaultGoals || [];
    const pills = [
      ...questionOptions.slice(0, 3),
      ...suggestions.slice(0, 2),
      ...goals.slice(0, 1),
    ];
    return pills.length > 0
      ? pills
      : [
          'ضيق الوقت وتسارع الروتين اليومي',
          'التشتت بكثرة المهام والأجهزة',
          'التسويف وصعوبة الالتزام بالعادة',
        ];
  }, [currentAdvisor]);

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5 bg-[#FAF7F2]">
      {/* All 8 Domains Completed Milestone Banner */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-emerald-900 to-[#1b605b] text-white rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300 border border-emerald-400/20">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              🌟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">اكتملت خريطتك الأسبوعية المتكاملة (8 من 8)!</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  مكتمل ومقفل للأسبوع 🔒
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                تم رسم عجلة الحياة وتحديث مصفوفة أيزنهاور وصياغة تقرير المنسق العام بالكامل.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-[#1b605b] font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <span>استعراض خريطتي ولوحة التحكم</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Advisor Selector Tabs */}
      <div className="bg-white border border-[#eae3d5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#536561]">جلسات التقييم الأسبوعي:</span>
            <span className="text-xs font-black text-[#1b605b]">
              {currentAdvisor.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7a8c88]">
            <span>المكتمل: {completedAdvisors.length} من 8</span>
            <div className="w-20 h-2 bg-[#eae3d5] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${(completedAdvisors.length / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Advisor Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ADVISORS_LIST.map((advisor, index) => {
            const isAdvCompleted = completedAdvisors.includes(advisor.id);
            const isCurrent = index === currentAdvisorIndex;

            return (
              <button
                key={advisor.id}
                onClick={() => {
                  setCurrentAdvisorIndex(index);
                  setShowCelebration(false);
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isCurrent
                    ? 'bg-[#1b605b] text-white shadow-xs'
                    : isAdvCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#FAF7F2] text-[#536561] border-[#eae3d5] hover:text-[#1d2e2b]'
                }`}
                style={isCurrent ? { borderColor: '#1b605b' } : {}}
              >
                <span>{advisor.avatarSvg}</span>
                <span>{advisor.title}</span>
                {isAdvCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface (Clean AI Clinic Window) */}
      <div className="bg-white border border-[#eae3d5] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[680px]">
        {/* Advisor Header Bar */}
        <div className="px-6 py-4 border-b border-[#f0eae0] flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 relative"
              style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
            >
              {currentAdvisor.avatarSvg}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: currentAdvisor.themeColor }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#1d2e2b]">
                  {currentAdvisor.name}
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: currentAdvisor.themeColor,
                    borderColor: `${currentAdvisor.themeColor}35`,
                    backgroundColor: `${currentAdvisor.themeColor}10`,
                  }}
                >
                  {currentAdvisor.badge}
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                    تم التقييم بنجاح
                  </span>
                )}
              </div>
              <p className="text-xs text-[#536561] mt-0.5">{currentAdvisor.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Model Mode Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm"
                style={{
                  backgroundColor: currentModeConfig.bgColor,
                  borderColor: `${currentModeConfig.color}40`,
                  color: currentModeConfig.color,
                }}
                title="تغيير نمط تفكير الذكاء الاصطناعي"
              >
                <currentModeConfig.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-black">{currentModeConfig.title}</span>
                <span className="sm:hidden font-black">{currentModeConfig.shortTitle}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showModeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModeDropdown(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl border border-[#ded7c8] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-[#f0eae0] mb-1">
                      <span className="text-[11px] font-black text-[#1d2e2b] block">مستوى تفكير الذكاء الاصطناعي</span>
                      <span className="text-[9px] text-[#7a8c88]">اختر سرعة وعمق التحليل أثناء الحوار</span>
                    </div>

                    <div className="space-y-1">
                      {AI_MODES.map((mode) => {
                        const isSelected = mode.id === aiMode;
                        const IconComponent = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              handleSelectAiMode(mode.id);
                              setShowModeDropdown(false);
                            }}
                            className={`w-full text-right p-2 rounded-xl transition-all flex items-start gap-2 border ${
                              isSelected
                                ? 'border-[#1b605b] shadow-xs'
                                : 'border-transparent hover:bg-[#FAF7F2]'
                            }`}
                            style={isSelected ? { backgroundColor: mode.bgColor } : {}}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${mode.color}15`, color: mode.color }}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#1d2e2b]">{mode.title}</span>
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                                >
                                  {mode.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#536561] leading-tight mt-0.5">{mode.desc}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#1b605b] flex-shrink-0 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick approve button if not locked yet */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleFinishCurrentAdvisor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
                title="اعتماد النتيجة الفورية وإقفال الجلسة"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد ({currentAdvisorScore > 0 ? currentAdvisorScore : 7}/10)</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fcfbfa]">
          {activeConversation.map((msg) => {
            const isAdvisor = msg.sender === 'advisor';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isAdvisor ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs ${
                    isAdvisor ? 'border-black/5' : 'bg-[#1b605b] text-white border-transparent'
                  }`}
                  style={isAdvisor ? { backgroundColor: `${currentAdvisor.themeColor}20` } : {}}
                >
                  {isAdvisor ? currentAdvisor.avatarSvg : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-line border ${
                    isAdvisor
                      ? 'bg-white border-[#eae3d5] text-[#1d2e2b] rounded-tr-xs'
                      : 'bg-[#1b605b] border-transparent text-white rounded-tl-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`block text-[10px] mt-1.5 font-medium ${
                      isAdvisor ? 'text-[#8a9995]' : 'text-emerald-100/75'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isAdvisorReplying && (
            <div className="flex gap-3 max-w-3xl mr-auto items-center animate-pulse">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs"
                style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
              >
                {currentAdvisor.avatarSvg}
              </div>
              <div className="p-3 rounded-2xl bg-white border border-[#eae3d5] text-xs text-[#536561] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#bd9240] animate-spin" />
                <span>{currentAdvisor.name} يستمع إليك ويصيغ توجيهه الطبي بعناية...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Completion Status Bar when evaluated (Open Mode enabled) */}
        {isCompleted && (
          <div className="px-4 py-2.5 bg-emerald-50/90 border-t border-emerald-200/90 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-black text-emerald-950">
                تم رصد تقييم هذا الجانب ({currentAdvisorScore > 0 ? currentAdvisorScore : 7}/10)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                الوضع المفتوح مفعل 🔓
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCurrentAdvisor}
                className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="إعادة بدء التقييم الإكلينيكي لهذا المستشار"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة التقييم</span>
              </button>
              {onNavigateToAdvisorChat && (
                <button
                  type="button"
                  onClick={() => onNavigateToAdvisorChat(currentAdvisor.id)}
                  className="px-2.5 py-1 rounded-xl bg-[#1b605b] hover:bg-[#164e4a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>غرفة الاستشارة</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGoToNextAdvisor}
                className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>الجانب التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE CLINIC INPUT BAR (Always Open for Testing and Continuous Conversation) */}
        <>
          {/* Quick Choices bar depending on current clinic step */}
          <div className="px-4 py-2.5 bg-[#FAF7F2] border-t border-[#f0eae0] flex-shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[10px] font-black text-[#536561] flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-[#bd9240]" />
                {currentStep === 0 ? 'اختر رضاك التقريبي:' : 'خيارات سريعة للعوائق:'}
              </span>

              {/* Step 0: Quick 1 to 10 rating pills */}
              {currentStep === 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSendAnswer(`تقييمي لرضاي الحالي: ${num} من 10`)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#1d2e2b] hover:text-[#1b605b] text-xs font-bold transition-all shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 1+: Suggested reflection pills and questions */}
                {currentStep >= 1 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {quickReflectionPills.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendAnswer(ch)}
                        className="flex-shrink-0 px-3 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#2c3d39] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#FAF7F2]"
                      >
                        {ch}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSendAnswer('الحمد لله، الأمور تسير بهدوء ودون عوائق كبيرة')}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#2c3d39] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#FAF7F2]"
                    >
                      الأمور مستقرة وهادئة 🌿
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Input Bar: Text + Mic + Send */}
            <div className="p-3 sm:p-4 bg-white border-t border-[#f0eae0] flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAnswer();
                }}
                className="flex items-center gap-2"
              >
                {/* Mic Button for Voice Dictation */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  title={isRecording ? 'إيقاف التسجيل الصوتي' : 'تحدث بالصوت'}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                      : 'bg-[#FAF7F2] border border-[#ded7c8] text-[#536561] hover:text-[#1b605b] hover:border-[#1b605b]'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Free Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isRecording
                      ? 'جارٍ الاستماع لصوتك باللغة العربية...'
                      : currentStep === 0
                      ? 'اكتب شعورك أو تقييمك (مثلاً: راضٍ بنسبة 7 من 10)...'
                      : 'اكتب العائق أو التحدي الأبرز بحرية تامة...'
                  }
                  className="flex-1 bg-[#FAF7F2] border border-[#ded7c8] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8a9995] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all"
                  dir="rtl"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isAdvisorReplying}
                  className="w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95"
                  style={{ backgroundColor: currentAdvisor.themeColor }}
                >
                  <Send className="w-5 h-5 -rotate-90" />
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[#7a8c88] px-1">
                <span className="flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-[#bd9240]" />
                  جلسة أسبوعية مركزة من خطوتين: التقييم ثم التحدي لإصدار العادة وإقفال الجانب للأسبوع.
                </span>
                <button
                  type="button"
                  onClick={handleFinishCurrentAdvisor}
                  className="text-[#1b605b] hover:underline font-bold cursor-pointer"
                >
                  اعتماد وإنهاء الجلسة فوراً ✓
                </button>
              </div>
            </div>
          </>
      </div>

      {/* Celebration Modal when an Advisor's evaluation completes */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-center space-y-6">
            <div
              className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xs border border-black/5"
              style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
            >
              {currentAdvisor.avatarSvg}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                اكتمل تقييم هذا الجانب بنجاح
              </div>
              <h3 className="text-2xl font-black text-[#1d2e2b]">
                أحسنت! أنهيت جولة {currentAdvisor.name}
              </h3>
              <p className="text-xs text-[#536561] mt-1">
                تم اعتماد نتيجتك التقديرية في {currentAdvisor.title} وحفظ توصيتك الذهبية للأسبوع
              </p>
            </div>

            {/* Score Showcase */}
            <div className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[11px] text-[#7a8c88] block">درجة الجانب</span>
                <span
                  className="text-3xl font-black"
                  style={{ color: currentAdvisor.themeColor }}
                >
                  {currentAdvisorScore > 0 ? currentAdvisorScore : 7} <span className="text-base text-[#7a8c88]">/ 10</span>
                </span>
              </div>
              <div className="h-10 w-px bg-[#ded7c8]" />
              <div>
                <span className="text-[11px] text-[#7a8c88] block">المستوى التقديري</span>
                <span className="text-sm font-extrabold text-[#1d2e2b]">
                  {currentAdvisorScore >= 8
                    ? 'ممتاز ومتألق 🌟'
                    : currentAdvisorScore >= 6
                    ? 'جيد وواعد 🚀'
                    : 'يحتاج عناية وتركيز 💡'}
                </span>
              </div>
            </div>

            {/* Quick Strengths and Challenges bullets */}
            <div className="text-right space-y-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#eae3d5] text-xs">
              <div>
                <span className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  أبرز مواطن القوة:
                </span>
                <ul className="list-disc list-inside text-[#2c3d39] space-y-0.5">
                  {(insights?.strengths || []).slice(0, 2).map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  فرص التحسين:
                </span>
                <ul className="list-disc list-inside text-[#2c3d39] space-y-0.5">
                  {(insights?.challenges || []).slice(0, 2).map((ch, i) => (
                    <li key={i}>{ch}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Continue CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {onNavigateToAdvisorChat && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCelebration(false);
                    onNavigateToAdvisorChat(currentAdvisor.id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#2c3d39] border border-[#ded7c8] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>حوار مفتوح مع المستشار</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGoToNextAdvisor}
                className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-xs transition-all hover:opacity-95 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: currentAdvisor.themeColor,
                }}
              >
                <span>
                  {completedAdvisors.length >= 8
                    ? '🎉 عرض خريطتي المتكاملة (الداشبورد)'
                    : 'المستشار التالي ←'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
