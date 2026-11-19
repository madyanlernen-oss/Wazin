import React, { useState, useEffect, useRef } from 'react';
import { VoiceInput } from '../components/VoiceInput';
import { ReasoningBox } from '../components/ReasoningBox';
import {
  Send,
  Sparkles,
  User,
  ArrowRight,
  Plus,
  Check,
  Lightbulb,
  Loader2,
  ChevronDown,
  Zap,
  Brain,
  Scale,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  AdvisorConfig,
  ChatMessage,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';

export type AiModelMode = 'fast' | 'balanced' | 'deep';

export const AI_MODES: {
  id: AiModelMode;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  bgColor: string;
  badge: string;
  desc: string;
}[] = [
  {
    id: 'fast',
    title: 'الوضع السريع ⚡',
    shortTitle: 'سريع ⚡',
    icon: Zap,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    badge: 'استجابة سريعة',
    desc: 'إجابات فورية، مباشرة، وموجزة للأسئلة والحلول السريعة',
  },
  {
    id: 'balanced',
    title: 'الوضع المتوازن ⚖️',
    shortTitle: 'متوازن ⚖️',
    icon: Scale,
    color: '#1b605b',
    bgColor: '#ecfdf5',
    badge: 'موصى به',
    desc: 'توازن ذكي بين سرعة التفاعل وعمق التوجيه الإرشادي',
  },
  {
    id: 'deep',
    title: 'التحليل العميق 🧠',
    shortTitle: 'تفكير عميق 🧠',
    icon: Brain,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    badge: 'تفكير استراتيجي',
    desc: 'تفكيك جذري للتحديات، تحليل الدوافع النفسية، وخطط استراتيجية شاملة',
  },
];

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
  onBackToDashboard,
  theme: _theme = 'light',
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
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSelectAiMode = (mode: AiModelMode) => {
    setAiMode(mode);
    localStorage.setItem('wazan_ai_mode', mode);
  };

  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  // Initialize welcoming message for this advisor if empty
  useEffect(() => {
    if (!messagesByAdvisor[currentAdvisor.id] || messagesByAdvisor[currentAdvisor.id].length === 0) {
      const welcomeMsg: ChatMessage = {
        id: `welcome_${currentAdvisor.id}`,
        sender: 'advisor',
        content: `أهلاً بك يا ${userProfile?.name || 'صديقنا'} في منصة وازن. أنا ${currentAdvisor.name}، ${currentAdvisor.role}.
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
          content: m.content,
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
          aiMode,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل الاتصال بمستشار الذكاء الاصطناعي');
      }

      const data = await res.json();

      let parsedReasoning = data.reasoning || '';
      let parsedSummary = data.summary || '';
      let parsedAdvice = data.advice || '';
      let parsedReply = data.reply || '';

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
          }
        } catch {
          // ignore
        }
      }

      const cleanContent = parsedReply || parsedAdvice || parsedSummary || 'أنا معك، فلنحدد خطوة إجرائية واضحة تناسب واقعك الحالي.';

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
      };

      setMessagesByAdvisor((prev) => ({
        ...prev,
        [currentAdvisor.id]: [...(prev[currentAdvisor.id] || []), advisorReply],
      }));
    } catch (err) {
      console.error('Advisor chat error:', err);
      let fallbackText = `نصيحتي لك في مجال ${currentAdvisor.title}: التركيز على عادة واحدة صغيرة يومياً تصنع مع الوقت فارقاً هائلاً. استمر في تدوين تقدمك في عجلة الحياة.`;
      let fallbackReasoning = `تحليل استشاري معمق لواقع المستفيد في ${currentAdvisor.title}: استخلاص العادة المحورية الأكثر ملاءمة لقدراته وطاقته الحالية دون إجهاد.`;
      let fallbackAdvice = `ركز على خطوة واحدة إجرائية واضحة ومستمرة هذا الأسبوع.`;

      const lowerText = text.toLowerCase();
      const isCrisisOrDeath = /(انتحار|الانتحار|انتحر|أنتحر|بنتحر|بانتحر|قتل نفسي|أقتل نفسي|اقتل نفسي|ايذاء النفس|إيذاء نفسي|ايذاء نفسي|اذية نفسي|أذية نفسي|الموت|بالموت|للموت|اموت|أموت|بموت|اريد الموت|أريد الموت|افكر بالموت|أفكر بالموت|افكر في الموت|أفكر في الموت|فكرة الموت|تفكير بالموت|تفكير في الموت|ودي اموت|ودي أموت|ابغى اموت|أبغى أموت|مش عايز اعيش|مش عايز أعيش|مش طايق أعيش|مش طايق اعيش|انهي حياتي|أنهي حياتي|اتخلص من حياتي|أتخلص من حياتي|لا اشعر باي سلام|لا اشعر بأي سلام|عدم الشعور بالأمان|غير آمن|خلاص تعبت من الحياة|أكره حياتي|كرهت حياتي|كرهت الحياة|أكره نفسي|كرهت نفسي|متعب بقوة|تعبت بقوة|مش قادر اكمل|مش قادر أكمل|ضائع ومحطم|محطم كلياً)/i.test(lowerText);
      const isGriefOrExhaustion = /(متعب|تعبان|تعبت|تعب|حزين|حزن|مكتئب|اكتئاب|ضايق|مخنوق|طفشان|محتار|تائه|ضياع|خائف|خوف|قلق|توتر|غضب|أبكي|ابكي|يائس|يأس|الحياة صعبة|الحياة قاسية|مرهق|إرهاق|ارهاق|ثقل|موجوع|وجع|ألم|الم|منهار|محبط|إحباط)/i.test(lowerText);
      const isCurseOrAnger = /(?:^|\s)(?:اسب|أسب|العن|اللعن|ألعن|السب|اللعنة|الشتيمة|اشتم|أشتم)(?:\s|[.,!؟]|$)/i.test(lowerText);
      const isAskingHowAdvisorIs = /(^|\s)(كيف حالك|كيفك|شلونك|شخبارك|اخبارك|أنا أسألك عن حالك|انا اسالك عن حالك|أنا أسألك كيف حالك|انا اسالك كيف حالك|كيف انت|عساك بخير|عساك طيب|طمني عنك|طمنا عنك)(\s|\?|؟|$)/i.test(lowerText);
      const isSimpleGreeting = /(^|\s)(مرحبا|مرحباً|أهلا|أهلاً|سلام|السلام عليكم|صباح الخير|مساء الخير|هلا|هاي|حيّاك|أهلين)(\s|$)/i.test(lowerText);

      if (isCrisisOrDeath) {
        fallbackReasoning = `تدخل إنساني طارئ (Safety & Empathy Override): المستفيد يعبر عن ألم نفسي وإنهاك شديد وتفكير في الموت أو إيذاء النفس. تم فوراً تعليق وتجميد كافة الأسئلة الروتينية، وتكريس كامل الحضور النفسي لاحتواء هذا الألم الوجودي الحاد، والتأكيد القاطع على قيمة حياته، وتقديم الدعم الإنساني والمساندة العاجلة.`;
        fallbackAdvice = `حياتك غالية وألمك حقيقي ومسموع؛ أرجوك لا تبقَ وحدك في هذا الثقل وتواصل فوراً مع شخص تثق به أو مع جهة دعم نفسي ومختصين لمساندتك.`;
        fallbackText = `أسمعك بكل جوارحي وبكل ألم واهتمام يا صديقنا العزيز، وكلماتك هذه تهمّني أكثر من أي تقييم أو أي أمر آخر في هذه اللحظة. 🌿\n\nأرجوك أن تتوقف لحظة وتلتقط أنفاسك بهدوء؛ اعلم أنني هنا معك ولست وحدك أبداً. الألم الهائل والتعب الشديد الذي تشعر به الآن ويجعلك تفكر في الموت هو صرخة لإنهاء هذا الوجع والضغط المرهق، وليست رغبة حقيقية في إنهاء وجودك ونفسك الغالية.\n\nحياتك لها قيمة عظيمة ومكانتك محفوظة حتى لو انطمست الرؤية في هذه اللحظة المظلمة. أرجوك من كل قلبي ألا تبقى وحدك مع هذه المشاعر الثقيلة؛ تحدث الآن مع شخص مقرب تثق به، أو تواصل فوراً مع مختص نفسي أو خط مساندة طارئ ليقف بجانبك ويساعدك على تجاوز هذا الظرف الصعب. أنا هنا معك وأريد لك السلامة والأمان.`;
      } else if (isGriefOrExhaustion) {
        fallbackReasoning = `تحليل مشاعر الإنهاك والحزن والضيق النفسي لدى المستفيد: إدراك أن المشاعر المتألمة تحتاج إلى إنصات واحتواء إنساني دافئ قبل أي نصائح عملية، وكسر حلقة العزلة والضغط الداخلي.`;
        fallbackAdvice = `الحزن والإنهاك رسائل من الجسد والروح بحاجتهما للراحة والتفريغ؛ لا تكابر وامنح نفسك فرصة لالتقاط الأنفاس.`;
        fallbackText = `سلامة قلبك وروحك يا صديقنا العزيز. يؤلمني حقاً أن تشعر بهذا الحزن أو التعب والثقل، لكن اعلم أن مرور الإنسان بفترات انطفاء وثقل هو أمر إنساني طبيعي جداً، ولست وحدك في هذا الشعور.\n\nخذ نفساً عميقاً ولا تقسُ على نفسك؛ أنا هنا معك بكامل حضوري لأسمعك وأفكر معك دون أي قيود أو أحكام. ما الذي حدث وجعلك تشعر بهذا الثقل المرهق اليوم؟ شاركني ما في قلبك.`;
      } else if (isCurseOrAnger) {
        fallbackReasoning = `تفكيك مشاعر الغضب والألم الكامن خلف الرغبة في التعبير الصادم، واحتواء الإنسان دون إطلاق أحكام مسبقة، وتوجيه الطاقة نحو التفريغ الصحي الآمن دون تدمير الذات.`;
        fallbackAdvice = `تفريغ الغضب يكون بالبوح والتنفس واللجوء لمن بيده تدبير الأمر، فالسب واللعن لن يغيّر ما حدث بل يزيد القلب قسوة ومرارة.`;
        fallbackText = `أشعر بحجم الألم والثقل الذي تحمله في صدرك يا صديقنا العزيز. حين تبلغ بنا الخيبة والتعب مداها، تتولد في دواخلنا رغبة عارمة في الصراخ واللعن كصرخة استغاثة للبحث عن متنفس.\n\nمن حقك تماماً أن تشعر بالألم والغضب، وأنا هنا لست لأحاكمك أو أملي عليك ما تشعر به، بل لأحتويك وأسمعك بصدق. لكن اعلم بقلبك أن سب الحياة أو لعن الأقدار لن يرفع الهم ولن يشفي الجرح، بل يترك في روحك مرارة مضاعفة.\n\nخذ نفساً عميقاً، وأفرغ ما في صدرك؛ ما هو الشيء الأكثر إيلاماً الذي يضغط على روحك الآن وتود لو تتخلص منه؟`;
      } else if (isAskingHowAdvisorIs) {
        fallbackReasoning = `تجاوب حواري إنساني مباشر وكسر الجمود لتقديم التحية والاطمئنان الدافئ كمرشد ورفيق درب.`;
        fallbackAdvice = `أنا بخير وبأحسن حال وسعيد وممتن جداً بسؤالك الطيب!`;
        fallbackText = `أهلاً وسهلاً بك يا صديقنا الحبيب! أنا بخير وبأحسن حال، وسعيد وممتن جداً بسؤالك الطيب عني ودفء حضورك. 🌿\n\nبصفتي ${currentAdvisor.name} (${currentAdvisor.role})، أنا معك هنا بكامل حضوري وطاقتي لنفكر معاً خطوة بخطوة في رحلتك نحو التوازن. كيف تشعر اليوم وما الذي يشغل تفكيرك؟`;
      } else if (isSimpleGreeting) {
        fallbackReasoning = `تحية إنسانية عفوية من المستفيد: الترحيب الدافئ كمرشد ورفيق درب وفتح باب الحوار بأريحية تامة دون أي قوالب جامدة.`;
        fallbackAdvice = `أهلاً بك دائماً؛ كامل الحضور والإصغاء معك لنبدأ بأي جانب تود التركيز عليه.`;
        fallbackText = `أهلاً وسهلاً بك يا صديقنا العزيز! يسعدني جداً حضورك وتواصلك. 🌿\n\nمعك ${currentAdvisor.name} (${currentAdvisor.role}). أنا هنا معك ومستعد للإصغاء والتفكير معك في كل ما يشغل بالك في ${currentAdvisor.title}.\n\nكيف تسير أمورك اليوم؟ وما الذي تود أن نتناوله معاً؟`;
      }

      const fallbackReply: ChatMessage = {
        id: `fallback_${Date.now()}`,
        sender: 'advisor',
        content: fallbackText,
        reasoning: fallbackReasoning,
        summary: `تفاعل واستشارة مباشرة في ${currentAdvisor.title}`,
        advice: fallbackAdvice,
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
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300">
      {/* Top Bar with Back Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-xs font-bold transition-all shadow-xs cursor-pointer"
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
        <div className="lg:col-span-4 bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-4 shadow-xs space-y-3 transition-colors">
          <div className="px-2 py-1">
            <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F1F5F9]">اختر المستشار للمحادثة</h3>
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
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
                  className={`w-full text-right p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7F6F2] dark:bg-[#112028] border-[#0F6E6E] dark:border-[#0891B2] shadow-xs'
                      : 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-[#0F172A] dark:text-[#F1F5F9]'
                  }`}
                  style={isSelected ? { borderRightColor: advisor.themeColor, borderRightWidth: '4px' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5 dark:border-white/10"
                      style={{ backgroundColor: `${advisor.themeColor}15` }}
                    >
                      {advisor.avatarSvg}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F1F5F9]">{advisor.name}</h4>
                      <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">{advisor.title}</p>
                    </div>
                  </div>

                  <div dir="ltr" className="text-left font-mono font-bold">
                    <span
                      className="text-xs"
                      style={{ color: advisor.themeColor }}
                    >
                      {sc.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8]"> / 10</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: The Active Advisor Consultation Room */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl overflow-hidden shadow-xs h-[78vh] transition-colors">
          {/* Room Header Banner */}
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1E343F] bg-[#F7F6F2] dark:bg-[#0B161C] flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10 relative"
                style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
              >
                {currentAdvisor.avatarSvg}
                <span
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0B161C]"
                  style={{ backgroundColor: currentAdvisor.themeColor }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">{currentAdvisor.name}</h3>
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
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">{currentAdvisor.role}</p>
              </div>
            </div>

            {/* Header Right Side: AI Model Mode Selector & Score Tag */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* AI Model Mode Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm cursor-pointer"
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
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showModeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowModeDropdown(false)}
                    />
                    <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0E1D24] rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E343F] mb-1">
                        <span className="text-[11px] font-black text-[#0F172A] dark:text-[#F1F5F9] block">مستوى تفكير الذكاء الاصطناعي (Gemini)</span>
                        <span className="text-[10px] text-[#475569] dark:text-[#94A3B8]">اختر نمط الإجابة والتحليل المناسب لاحتياجك</span>
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
                              className={`w-full text-right p-2.5 rounded-xl transition-all flex items-start gap-2.5 border cursor-pointer ${
                                isSelected
                                  ? 'border-[#0F6E6E] dark:border-[#22D3EE] shadow-xs'
                                  : 'border-transparent hover:bg-[#F7F6F2] dark:hover:bg-[#162734]'
                              }`}
                              style={isSelected ? { backgroundColor: mode.bgColor } : {}}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: `${mode.color}15`, color: mode.color }}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">{mode.title}</span>
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                                  >
                                    {mode.badge}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] leading-tight mt-1">{mode.desc}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0 mt-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Current Score Tag with proper LTR format */}
              <div dir="ltr" className="bg-white dark:bg-[#0E1D24] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-left shadow-xs transition-colors">
                <span className="text-[9px] sm:text-[10px] text-[#64748B] dark:text-[#94A3B8] block text-right font-sans">درجتك</span>
                <span className="text-xs sm:text-sm font-black font-mono block" style={{ color: currentAdvisor.themeColor }}>
                  {currentScore.toFixed(1)} / 10
                </span>
              </div>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F7F6F2]/50 dark:bg-[#071318]/90 transition-colors">
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
                        ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white'
                        : 'border border-black/5 dark:border-white/10'
                    }`}
                    style={!isUser ? { backgroundColor: `${currentAdvisor.themeColor}15` } : {}}
                  >
                    {isUser ? <User className="w-4 h-4" /> : currentAdvisor.avatarSvg}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                    {/* Dedicated Reasoning Box (التفكير والتحليل العميق) */}
                    {!isUser && msg.reasoning && (
                      <ReasoningBox reasoning={msg.reasoning} />
                    )}

                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white rounded-tr-none shadow-xs'
                          : 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#1E343F] rounded-tl-none shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <span className="text-[10px] opacity-60 block mt-2 text-left">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Actionable Steps suggested by advisor */}
                    {!isUser && msg.actionSteps && msg.actionSteps.length > 0 && (
                      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-3.5 space-y-2 shadow-xs transition-colors">
                        <span className="text-[11px] font-bold text-[#0F6E6E] dark:text-[#22D3EE] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#bd9240]" />
                          خطوات عملية مقترحة من المستشار:
                        </span>
                        <div className="space-y-1.5">
                          {msg.actionSteps.map((step, sIdx) => {
                            const isAdded = addedGoals[step];
                            return (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#0F172A] dark:text-[#F1F5F9]"
                              >
                                <span>{step}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddActionToGoals(step)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all flex-shrink-0 shadow-xs cursor-pointer ${
                                    isAdded
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-white dark:bg-[#0E1D24] text-[#0F6E6E] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-[#F7F6F2] dark:hover:bg-[#162734]'
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
                      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-3 text-xs text-[#8A5A00] dark:text-[#FBBF24] flex items-start gap-2 shadow-xs">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-[#8A5A00] dark:text-[#FBBF24] block mb-0.5">
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
              <div className="flex gap-3 items-center text-xs text-[#475569] dark:text-[#94A3B8]">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs"
                  style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
                >
                  {currentAdvisor.avatarSvg}
                </div>
                <div className="bg-white dark:bg-[#0E1D24] p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F6E6E] dark:text-[#22D3EE]" />
                  <span>
                    {aiMode === 'fast' && `${currentAdvisor.name} يصيغ لك نصيحة فورية سريعة ⚡...`}
                    {aiMode === 'deep' && `${currentAdvisor.name} يفكك استشارتك بعمق وتحليل استراتيجي 🧠...`}
                    {aiMode === 'balanced' && `${currentAdvisor.name} يفكر في استشارتك بعناية ⚖️...`}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Chips */}
          <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E343F] bg-[#F7F6F2] dark:bg-[#0B161C] flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs transition-colors">
            <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-bold flex-shrink-0">أسئلة مقترحة:</span>
            {currentAdvisor.suggestedQuestions.map((qText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qText)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] text-[11px] transition-all shadow-xs cursor-pointer"
              >
                {qText}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 border-t border-[#E2E8F0] dark:border-[#1E343F] bg-white dark:bg-[#0E1D24] space-y-2.5 transition-colors">
            {/* Quick AI Mode Selector Pill */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-bold">نمط التفكير:</span>
                <div className="inline-flex rounded-xl p-0.5 bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F]">
                  {AI_MODES.map((m) => {
                    const isSelected = m.id === aiMode;
                    const IconC = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectAiMode(m.id)}
                        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-[#0E1D24] shadow-xs'
                            : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                        }`}
                        style={isSelected ? { color: m.color } : {}}
                        title={m.desc}
                      >
                        <IconC className="w-3 h-3" />
                        <span>{m.shortTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] hidden md:inline font-medium">
                {currentModeConfig.desc}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <VoiceInput
                onTranscript={(transcript) =>
                  setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript))
                }
                disabled={isLoading}
              />

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`اطرح سؤالك أو تحدث بصوتك مع ${currentAdvisor.name}...`}
                className="flex-1 bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0F6E6E] dark:focus:border-[#22D3EE] focus:ring-1 focus:ring-[#0F6E6E] dark:focus:ring-[#22D3EE] transition-all"
                dir="rtl"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: currentAdvisor.themeColor || '#0F6E6E' }}
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
