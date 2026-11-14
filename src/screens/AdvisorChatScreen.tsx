import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Plus,
  Check,
  Compass,
  Lightbulb,
  HelpCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  AdvisorConfig,
  ChatMessage,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';

interface AdvisorChatScreenProps {
  currentAdvisorId: LifeAreaId;
  onSelectAdvisor: (advisorId: LifeAreaId) => void;
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  onAddGoal: (advisorId: LifeAreaId, goal: string) => void;
  onAddEisenhowerGoal?: (title: string, advisorName: string, areaId: LifeAreaId) => void;
  onBackToDashboard: () => void;
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
  onBackToDashboard,
}) => {
  const currentAdvisor: AdvisorConfig =
    ADVISORS_LIST.find((a) => a.id === currentAdvisorId) || ADVISORS_LIST[0];

  const currentScore = scores[currentAdvisor.id] || 0;
  const currentGoals = goals[currentAdvisor.id] || [];

  // Chat message history per advisor (stored in component state)
  const [messagesByAdvisor, setMessagesByAdvisor] = useState<Record<string, ChatMessage[]>>({});
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedGoals, setAddedGoals] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcoming message for this advisor if empty
  useEffect(() => {
    if (!messagesByAdvisor[currentAdvisor.id] || messagesByAdvisor[currentAdvisor.id].length === 0) {
      const welcomeMsg: ChatMessage = {
        id: `welcome_${currentAdvisor.id}`,
        sender: 'advisor',
        content: `أهلاً بك يا ${userProfile?.name || 'صديقنا'} في منصة تدبير. أنا ${currentAdvisor.name}، ${currentAdvisor.role}.
رصدت تقييمك الحالي في "${currentAdvisor.title}" بدرجة (${currentScore.toFixed(1)} من 10).
أنا هنا معك لنصنع نقلة نوعية ونحول التحديات إلى خطوات بسيطة يومية. بمَ تحب أن نبدأ استشارتنا اليوم؟`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionSteps: currentAdvisor.defaultGoals.slice(0, 2),
        reflectionQuestion: 'ما هو التغيير البسيط الذي لو قمت به هذا الأسبوع سيشعرك بفرق حقيقي في هذا الجانب؟',
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [currentAdvisor.id]: [welcomeMsg],
      }));
    }
  }, [currentAdvisor.id, currentScore, userProfile?.name]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByAdvisor, isLoading]);

  const activeMessages = messagesByAdvisor[currentAdvisor.id] || [];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessagesByAdvisor((prev) => ({
      ...prev,
      [currentAdvisor.id]: [...(prev[currentAdvisor.id] || []), userMsg],
    }));

    setIsLoading(true);

    try {
      // Call server-side proxy route for Gemini API
      const conversationHistory = (messagesByAdvisor[currentAdvisor.id] || [])
        .slice(-8)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const res = await fetch('/api/gemini/advisor-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advisor: currentAdvisor,
          userScore: currentScore,
          userName: userProfile?.name || 'صديقنا',
          userGoals: currentGoals,
          userAnswers: answers,
          message: text,
          history: conversationHistory,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل الاتصال بمستشار الذكاء الاصطناعي');
      }

      const data = await res.json();

      const advisorReply: ChatMessage = {
        id: `advisor_${Date.now()}`,
        sender: 'advisor',
        content: data.reply || 'أنا معك، فلنحدد خطوة إجرائية واضحة تناسب واقعك الحالي.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionSteps: data.actionSteps || [],
        reflectionQuestion: data.reflectionQuestion,
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [currentAdvisor.id]: [...(prev[currentAdvisor.id] || []), advisorReply],
      }));
    } catch (err) {
      console.error('Advisor chat error:', err);
      // Fallback message
      const fallbackReply: ChatMessage = {
        id: `fallback_${Date.now()}`,
        sender: 'advisor',
        content: `نصيحتي لك في مجال ${currentAdvisor.title}: التركيز على عادة واحدة صغيرة يومياً تصنع مع الوقت فارقاً هائلاً. استمر في تدوين تقدمك في عجلة الحياة.`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionSteps: currentAdvisor.defaultGoals.slice(0, 1),
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [currentAdvisor.id]: [...(prev[currentAdvisor.id] || []), fallbackReply],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActionToGoals = (actionText: string) => {
    onAddGoal(currentAdvisor.id, actionText);
    if (onAddEisenhowerGoal) {
      onAddEisenhowerGoal(actionText, currentAdvisor.name, currentAdvisor.id);
    }
    setAddedGoals((prev) => ({ ...prev, [actionText]: true }));
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 bg-[#FAF7F2]">
      {/* Top Bar with Back Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#eae3d5] text-[#536561] hover:text-[#1b605b] hover:bg-[#FAF7F2] text-xs font-bold transition-all shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى عجلة الحياة</span>
          </button>
          <span className="text-sm font-black text-[#1d2e2b] hidden sm:inline">
            غرف استشارة المستشارين الثمانية
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#536561] font-semibold hidden md:inline">
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
        <div className="lg:col-span-4 bg-white border border-[#eae3d5] rounded-3xl p-4 shadow-xs space-y-3">
          <div className="px-2 py-1">
            <h3 className="font-extrabold text-sm text-[#1d2e2b]">اختر المستشار للمحادثة</h3>
            <p className="text-[11px] text-[#536561]">
              لكل مستشار سياق مستقل مبني على نتائجك وأهدافك
            </p>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[75vh] pr-1">
            {ADVISORS_LIST.map((advisor) => {
              const isSelected = advisor.id === currentAdvisor.id;
              const sc = scores[advisor.id] || 0;

              return (
                <button
                  key={advisor.id}
                  onClick={() => onSelectAdvisor(advisor.id)}
                  className={`w-full text-right p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#FAF7F2] border-[#1b605b] shadow-xs'
                      : 'bg-white border-[#eae3d5] hover:bg-[#FAF7F2] text-[#2c3d39]'
                  }`}
                  style={isSelected ? { borderRightColor: advisor.themeColor, borderRightWidth: '4px' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5"
                      style={{ backgroundColor: `${advisor.themeColor}15` }}
                    >
                      {advisor.avatarSvg}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#1d2e2b]">{advisor.name}</h4>
                      <p className="text-[10px] text-[#536561]">{advisor.title}</p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span
                      className="text-xs font-black"
                      style={{ color: advisor.themeColor }}
                    >
                      {sc.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-[#7a8c88]"> /10</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: The Active Advisor Consultation Room */}
        <div className="lg:col-span-8 flex flex-col bg-white border border-[#eae3d5] rounded-3xl overflow-hidden shadow-xs h-[78vh]">
          {/* Room Header Banner */}
          <div className="p-4 sm:p-5 border-b border-[#f0eae0] bg-[#FAF7F2] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 relative"
                style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
              >
                {currentAdvisor.avatarSvg}
                <span
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: currentAdvisor.themeColor }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#1d2e2b]">{currentAdvisor.name}</h3>
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
                <p className="text-[11px] text-[#536561]">{currentAdvisor.role}</p>
              </div>
            </div>

            {/* Current Score Tag */}
            <div className="bg-white px-3 py-1.5 rounded-xl border border-[#eae3d5] text-left shadow-xs">
              <span className="text-[10px] text-[#7a8c88] block">درجتك في هذا الجانب</span>
              <span className="text-sm font-black" style={{ color: currentAdvisor.themeColor }}>
                {currentScore.toFixed(1)} / 10
              </span>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
            {activeMessages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                      isUser
                        ? 'bg-[#1b605b] text-white'
                        : 'border border-black/5'
                    }`}
                    style={!isUser ? { backgroundColor: `${currentAdvisor.themeColor}15` } : {}}
                  >
                    {isUser ? <User className="w-4 h-4" /> : currentAdvisor.avatarSvg}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#1b605b] text-white rounded-tr-none shadow-xs'
                          : 'bg-[#FAF7F2] text-[#1d2e2b] border border-[#eae3d5] rounded-tl-none shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <span className="text-[10px] opacity-60 block mt-2 text-left">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Actionable Steps suggested by advisor */}
                    {!isUser && msg.actionSteps && msg.actionSteps.length > 0 && (
                      <div className="bg-white border border-[#eae3d5] rounded-2xl p-3.5 space-y-2 shadow-xs">
                        <span className="text-[11px] font-bold text-[#1b605b] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#bd9240]" />
                          خطوات عملية مقترحة من المستشار:
                        </span>
                        <div className="space-y-1.5">
                          {msg.actionSteps.map((step, sIdx) => {
                            const isAdded = addedGoals[step];
                            return (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FAF7F2] border border-[#eae3d5] text-xs text-[#2c3d39]"
                              >
                                <span>{step}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddActionToGoals(step)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all flex-shrink-0 shadow-xs ${
                                    isAdded
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-white text-[#1b605b] border border-[#ded7c8] hover:bg-[#FAF7F2]'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>أُضيفت لمصفوفة أيزنهاور</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>إضافة لمصفوفة أيزنهاور (المربع 2)</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reflection Question */}
                    {!isUser && msg.reflectionQuestion && (
                      <div className="bg-[#FAF7F2] border border-[#bd9240]/30 rounded-xl p-3 text-xs text-[#70551c] flex items-start gap-2 shadow-xs">
                        <Lightbulb className="w-4 h-4 text-[#bd9240] mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-[#bd9240] block mb-0.5">
                            سؤال للتأمل الذاتي:
                          </span>
                          <span>{msg.reflectionQuestion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-[#536561]">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs"
                  style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
                >
                  {currentAdvisor.avatarSvg}
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#eae3d5] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1b605b]" />
                  <span>{currentAdvisor.name} يفكر في استشارتك بعناية...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Chips */}
          <div className="px-4 py-2 border-t border-[#f0eae0] bg-[#FAF7F2] flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[10px] text-[#7a8c88] font-bold flex-shrink-0">أسئلة مقترحة:</span>
            {currentAdvisor.suggestedQuestions.map((qText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qText)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white border border-[#ded7c8] hover:border-[#1b605b] text-[#536561] hover:text-[#1b605b] text-[11px] transition-all shadow-xs"
              >
                {qText}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 border-t border-[#f0eae0] bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`اطرح سؤالك أو تحديك على ${currentAdvisor.name}...`}
                className="flex-1 bg-[#FAF7F2] border border-[#ded7c8] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8a9995] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all"
                dir="rtl"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95"
                style={{ backgroundColor: currentAdvisor.themeColor }}
              >
                <Send className="w-5 h-5 -rotate-90" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
