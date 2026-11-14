import React, { useState, useEffect, useRef } from 'react';
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
  Zap,
  Brain,
  Scale,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../types/lifeBalance';
import { calculateScoreForAdvisor, extractInsightsFromAnswers } from '../utils/storage';
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
  onNavigateToDashboard: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  onSaveAnswer,
  onFinishAdvisor,
  onCompleteAll,
  completedAdvisors,
  onNavigateToDashboard,
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
  // Track step count per advisor conversation (allows asking 8 or more flexible questions)
  const [advisorStep, setAdvisorStep] = useState<Record<string, number>>({});

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const currentStep = advisorStep[currentAdvisor.id] || 0;

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

  // Initialize welcome message and first question for the advisor
  useEffect(() => {
    const advisorKey = currentAdvisor.id;
    if (!chatMessages[advisorKey] || chatMessages[advisorKey].length === 0) {
      const q = currentAdvisor.questions[0];
      const initialMsgs: EvaluationChatMessage[] = [
        {
          id: 'welcome',
          sender: 'advisor',
          text: `مرحباً بك! أنا ${currentAdvisor.name}، المستشار المختص في ${currentAdvisor.title}.\n\nأنا هنا لأحاورك بود وشفافية لنستكشف هذا الجانب معاً ونحدد مستواه ونقاط قوته وفرص تطويره. تحدث معي بأريحية تامة وكأننا في جلسة حوارية خاصة.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `q_0`,
          sender: 'advisor',
          text: `${q.title}${q.description ? `\n\n💡 ${q.description}` : ''}`,
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

  // Finish and approve current advisor assessment
  const handleFinishCurrentAdvisor = () => {
    const calculatedScore = calculateScoreForAdvisor(currentAdvisor, answers);
    onFinishAdvisor(currentAdvisor.id, calculatedScore);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
    setShowCelebration(true);
  };

  // Handle user response with REAL AI Agent invocation
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

    // Save answer under current question or dynamic step
    const currentQId = currentAdvisor.questions[currentStep]?.id || `step_${currentStep + 1}`;
    onSaveAnswer(currentAdvisor.id, currentQId, text);
    setInputText('');

    const currentList = chatMessages[advisorKey] || [];
    const nextStep = currentStep + 1;
    setAdvisorStep((prev) => ({ ...prev, [advisorKey]: nextStep }));

    // Immediately display user message
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

      // Call AI Agent API
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
        }),
      });

      if (!res.ok) throw new Error('فشل استجابة الوكيل');
      const data = await res.json();
      let replyContent = data.reply || data.advice || data.summary || 'أنا معك وأستمع إليك باهتمام.';

      // If user is still in early exploration and asks questions or answers, weave in the next reflection smoothly
      if (nextStep < currentAdvisor.questions.length && !text.match(/^(مرحبا|أهلا|سلام)/i)) {
        const nextQ = currentAdvisor.questions[nextStep];
        replyContent += `\n\n📌 **استكشاف إضافي:** ${nextQ.title}${
          nextQ.description ? `\n💡 ${nextQ.description}` : ''
        }`;
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
    } catch (err) {
      console.error('Advisor chat error in onboarding:', err);
      // Fallback
      let fallbackText = `أهلاً بك! أنا معك كوكيل ومستشار في ${currentAdvisor.title}. تفضل بمشاركتي المزيد لنحلله معاً.`;
      if (nextStep < currentAdvisor.questions.length) {
        const nextQ = currentAdvisor.questions[nextStep];
        fallbackText += `\n\n${nextQ.title}${nextQ.description ? `\n\n💡 ${nextQ.description}` : ''}`;
      }
      const nextAdvisorMsg: EvaluationChatMessage = {
        id: `q_${nextStep}`,
        sender: 'advisor',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => ({
        ...prev,
        [advisorKey]: [...(prev[advisorKey] || []), nextAdvisorMsg],
      }));
    } finally {
      setIsAdvisorReplying(false);
    }
  };

  const handleQuickOptionClick = (label: string, weight?: number) => {
    if (weight !== undefined) {
      const currentQId = currentAdvisor.questions[currentStep]?.id || `step_${currentStep + 1}`;
      onSaveAnswer(currentAdvisor.id, currentQId, weight);
    }
    handleSendAnswer(label);
  };

  const handleContinueAfterCelebration = () => {
    setShowCelebration(false);
    if (currentAdvisorIndex < ADVISORS_LIST.length - 1) {
      setCurrentAdvisorIndex((prev) => prev + 1);
    } else {
      onCompleteAll();
    }
  };

  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const insights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);
  const activeConversation = chatMessages[currentAdvisor.id] || [];
  const activeQuestion = currentAdvisor.questions[currentStep];

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 bg-[#FAF7F2]">
      {/* Top Advisor Selector Tabs */}
      <div className="bg-white border border-[#eae3d5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#536561]">حوار أبعاد الحياة:</span>
            <span className="text-xs font-black text-[#1b605b]">
              {currentAdvisor.title}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#7a8c88]">
            جلسة حوارية مع المستشار الذكي
          </span>
        </div>

        {/* Advisor Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ADVISORS_LIST.map((advisor, index) => {
            const isCompleted = completedAdvisors.includes(advisor.id);
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
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#FAF7F2] text-[#536561] border-[#eae3d5] hover:text-[#1d2e2b]'
                }`}
                style={isCurrent ? { borderColor: '#1b605b' } : {}}
              >
                <span>{advisor.avatarSvg}</span>
                <span>{advisor.title}</span>
                {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface (Clean AI Chat Window) */}
      <div className="bg-white border border-[#eae3d5] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[700px]">
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
                      <span className="text-[11px] font-black text-[#1d2e2b] block">مستوى تفكير الذكاء الاصطناعي (Gemini)</span>
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

            <button
              type="button"
              onClick={handleFinishCurrentAdvisor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>اعتماد النتيجة ({currentAdvisorScore}/10)</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#eae3d5] text-xs font-semibold text-[#1b605b]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              مستشار نشط
            </span>
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
                <span>
                  {aiMode === 'fast' && `${currentAdvisor.name} يكتب لك نصيحة سريعة ومركزة ⚡...`}
                  {aiMode === 'deep' && `${currentAdvisor.name} يحلل إجابتك بعمق وتفكير استراتيجي 🧠...`}
                  {aiMode === 'balanced' && `${currentAdvisor.name} يفكر ويكتب تحليله لك الآن ⚖️...`}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Options Bar in upper part of input (if relevant to current stage) */}
        {activeQuestion && (
          <div className="px-4 py-2.5 bg-[#FAF7F2] border-t border-[#f0eae0] flex-shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[10px] font-black text-[#536561] flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-[#bd9240]" />
                خيارات سريعة (أو اكتب بحرية):
              </span>

              {/* Rating 1 - 10 quick pills */}
              {activeQuestion.type === 'rating' && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickOptionClick(`تقييمي الحالي: ${num} من 10`, num)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#1d2e2b] hover:text-[#1b605b] text-xs font-bold transition-all shadow-xs"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple choice options */}
              {activeQuestion.type === 'multiple_choice' &&
                activeQuestion.options?.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleQuickOptionClick(opt.label, opt.scoreWeight)}
                    className="flex-shrink-0 px-3 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#2c3d39] hover:text-[#1b605b] text-[11px] font-semibold transition-all shadow-xs"
                  >
                    {opt.label}
                  </button>
                ))}

              {/* Suggestions for open-text / general dialogue */}
              {(activeQuestion.type === 'open_text' || activeQuestion.type === 'multi_select') &&
                (activeQuestion.options
                  ? activeQuestion.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleQuickOptionClick(opt.label, opt.scoreWeight)}
                        className="flex-shrink-0 px-3 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#2c3d39] text-[11px] font-semibold transition-all shadow-xs"
                      >
                        {opt.label}
                      </button>
                    ))
                  : currentAdvisor.suggestedQuestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputText(sug)}
                        className="flex-shrink-0 px-3 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#536561] text-[11px] transition-all shadow-xs"
                      >
                        {sug}
                      </button>
                    )))}
            </div>
          </div>
        )}

        {/* Input Bar: Text + Mic (Voice to Text) + Send */}
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
                  : `اكتب إجابتك هنا بحرية تامة...`
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
              يمكنك الرد كتابةً، أو التحدث بالميكروفون، أو اختيار أي مقترح من الأعلى.
            </span>
            <button
              type="button"
              onClick={() => handleSendAnswer('تم التخطي')}
              className="text-[#7a8c88] hover:text-[#1d2e2b] underline cursor-pointer"
            >
              تخطي السؤال
            </button>
          </div>
        </div>
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
              <div className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full mb-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                اكتمل حوار الجانب بنجاح
              </div>
              <h3 className="text-2xl font-black text-[#1d2e2b]">
                أحسنت! أنهيت جولة {currentAdvisor.name}
              </h3>
              <p className="text-xs text-[#536561] mt-1">
                تم تحليل إجاباتك الحرة ورصد نتيجتك التقديرية في {currentAdvisor.title}
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
                  {currentAdvisorScore} <span className="text-base text-[#7a8c88]">/ 10</span>
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
                  {insights.strengths.map((str, i) => (
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
                  {insights.challenges.map((ch, i) => (
                    <li key={i}>{ch}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Continue CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#2c3d39] border border-[#ded7c8] text-xs font-bold transition-all shadow-xs"
              >
                معاينة لوحة التحكم والعجلة
              </button>
              <button
                type="button"
                onClick={handleContinueAfterCelebration}
                className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-xs transition-all hover:opacity-95"
                style={{
                  backgroundColor: currentAdvisor.themeColor,
                }}
              >
                {currentAdvisorIndex < ADVISORS_LIST.length - 1
                  ? 'المستشار التالي ←'
                  : 'عرض النتائج المتكاملة 🎉'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
