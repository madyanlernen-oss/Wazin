import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  CloudRain,
  Scale,
  Compass,
  Sprout,
  Layers,
  TrendingUp,
  Trees,
  Gem,
  Sparkles,
  Target,
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  Trophy,
} from 'lucide-react';

interface InteractiveScaleGameProps {
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

interface ScaleLevelData {
  level: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  themeColor: string;
  bgLight: string;
  bgDark: string;
  borderColor: string;
  dailyFeel: string;
  wheelImpact: string;
  goldenQuest: string;
  energyPercent: number;
}

const SCALE_LEVELS: ScaleLevelData[] = [
  {
    level: 1,
    title: 'إرهاق واحتراق حاد',
    subtitle: 'انطفاء طاقة وضغط استنزافي خانق',
    icon: <Flame className="w-6 h-6 text-rose-500 animate-bounce" />,
    badge: 'منطقة الخطر ⚠️',
    themeColor: '#E11D48',
    bgLight: 'bg-rose-50/70',
    bgDark: 'dark:bg-rose-950/30',
    borderColor: 'border-rose-300 dark:border-rose-900/60',
    dailyFeel: 'استيقاظ متعب، رغبة في الهروب، وشعور بالعجز عن مواجهة المهام اليومية المتراكمة.',
    wheelImpact: 'يسبب سحباً عنيفاً لطاقة بقية الأبعاد، ويشل القدرة على التفكير الهادئ واتخاذ القرارات.',
    goldenQuest: 'إسعاف عاجل: إيقاف أي التزام غير حيوي فوراً، والنوم 8 ساعات دون شاشات هذه الليلة.',
    energyPercent: 10,
  },
  {
    level: 2,
    title: 'عاصفة تشتت وقلق مستمر',
    subtitle: 'تخبط بين الطوارئ وغياب السيطرة',
    icon: <CloudRain className="w-6 h-6 text-orange-500" />,
    badge: 'تراجع مقلق ⛈️',
    themeColor: '#EA580C',
    bgLight: 'bg-orange-50/70',
    bgDark: 'dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-900/60',
    dailyFeel: 'تفكير متواصل لا يهدأ، قفز عشوائي بين المهام، وتأجيل مزمن يصاحبه تأنيب ضمير.',
    wheelImpact: 'تآكل في السلام الداخلي، واضطراب في جودة النوم والعلاقات القريبة.',
    goldenQuest: 'تفريغ ذهني: كتابة 3 أمور تقلقك على ورقة، وحذف أمرين منها والتركيز على أمر واحد فقط.',
    energyPercent: 20,
  },
  {
    level: 3,
    title: 'ضغط متراكم واختلال ظاهر',
    subtitle: 'حمل أثقل من الطاقة المتاحة',
    icon: <Scale className="w-6 h-6 text-amber-500" />,
    badge: 'اختلال واضح ⚖️',
    themeColor: '#D97706',
    bgLight: 'bg-amber-50/70',
    bgDark: 'dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-900/60',
    dailyFeel: 'أيام تمر بسرعة مفرطة دون إنجاز جوهري، والالتزامات تسابق الوقت باستمرار.',
    wheelImpact: 'ركود في التطوير الذاتي والصحي على حساب الركض خلف متطلبات الآخرين.',
    goldenQuest: 'قاعدة الرفض: قل "لا" بلباقة لطلب واحد إضافي هذا الأسبوع لحماية وقتك الخاص.',
    energyPercent: 30,
  },
  {
    level: 4,
    title: 'بحث عن البوصلة والوضوح',
    subtitle: 'إدراك المشكلة والرغبة في المخرج',
    icon: <Compass className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />,
    badge: 'يقظة الوعي 🧭',
    themeColor: '#CA8A04',
    bgLight: 'bg-yellow-50/70',
    bgDark: 'dark:bg-yellow-950/30',
    borderColor: 'border-yellow-300 dark:border-yellow-900/60',
    dailyFeel: 'شعور بالملل من الروتين الحالي، مع رغبة متزايدة في إعادة تنظيم الحياة ووضع أهداف حقيقية.',
    wheelImpact: 'نقطة انطلاق ممتازة؛ حيث يتحول القلق السلبي إلى دافع إيجابي نحو التغيير المنظم.',
    goldenQuest: 'خلوة الربع ساعة: خصص 15 دقيقة هادئة مع قهوتك لتدوين أولوياتك الحقيقية للشهر القادم.',
    energyPercent: 40,
  },
  {
    level: 5,
    title: 'نقطة التحول وبداية البذور',
    subtitle: 'توازن متوسط يحتاج إلى عادات راسخة',
    icon: <Sprout className="w-6 h-6 text-lime-600 dark:text-lime-400 animate-pulse" />,
    badge: 'نقطة التوازن 🌱',
    themeColor: '#65A30D',
    bgLight: 'bg-lime-50/70',
    bgDark: 'dark:bg-lime-950/30',
    borderColor: 'border-lime-300 dark:border-lime-900/60',
    dailyFeel: 'وضع مقبول ظاهرياً؛ تنجز المهام الأساسية ولكن بتذبذب، وتفتقد الحماس العميق والاطمئنان الدائم.',
    wheelImpact: 'عجلة الحياة تدور ولكن مع اهتزازات خفيفة؛ التحدي هنا هو كسر فخ الروتين العادي.',
    goldenQuest: 'بناء عادة صغرى: اختر عادة واحدة مدتها 10 دقائق (قراءة، مشي، ذكر) وثبتها يومياً لمدة 7 أيام.',
    energyPercent: 50,
  },
  {
    level: 6,
    title: 'بناء الأساسات وتثبيت الروتين',
    subtitle: 'انضباط واعد وخطوات ملموسة',
    icon: <Layers className="w-6 h-6 text-teal-600 dark:text-teal-400" />,
    badge: 'تقدم واعد 🧱',
    themeColor: '#0D9488',
    bgLight: 'bg-teal-50/70',
    bgDark: 'dark:bg-teal-950/30',
    borderColor: 'border-teal-300 dark:border-teal-900/60',
    dailyFeel: 'شعور أفضل بالسيطرة على اليوم، وضوح نسبي في الأهداف، وتقليل ملحوظ لفترات التسويف.',
    wheelImpact: 'بدء ظهور ثمار التوازن؛ استقرار هذا الجانب يمنحك تركيزاً أعلى في بقية المهام.',
    goldenQuest: 'حماية المربع الثاني: خصص 30 دقيقة يومياً لعمل عميق غير عاجل قبل الانشغال بالهاتف.',
    energyPercent: 60,
  },
  {
    level: 7,
    title: 'صعود متوازن وزخم متزايد',
    subtitle: 'إنتاجية طيبة ورضا مستقر',
    icon: <TrendingUp className="w-6 h-6 text-[#0F6E6E] dark:text-[#22D3EE]" />,
    badge: 'زخم إيجابي 📈',
    themeColor: '#0F6E6E',
    bgLight: 'bg-cyan-50/70',
    bgDark: 'dark:bg-cyan-950/30',
    borderColor: 'border-cyan-300 dark:border-cyan-900/60',
    dailyFeel: 'طاقة جيدة طوال اليوم، نوم مريح في الغالب، واستقرار وظيفي وشخصي يمنحك ثقة عالية.',
    wheelImpact: 'الجانب يعمل كرافعة إيجابية تساعد على سحب الجوانب الأضعف نحو التوازن والتطور.',
    goldenQuest: 'تعميق الأثر: شارك تجربتك أو قدّم مساعدة لشخص يمر بنفس التحديات التي تجاوزتها.',
    energyPercent: 70,
  },
  {
    level: 8,
    title: 'سكينة وطمأنينة ملهمة',
    subtitle: 'انسجام عالٍ وعادات يومية متجذرة',
    icon: <Trees className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
    badge: 'سكينة راسخة 🌿',
    themeColor: '#059669',
    bgLight: 'bg-emerald-50/70',
    bgDark: 'dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-900/60',
    dailyFeel: 'حضور قلبي وذهني مميز، سلام داخلي ينعكس على هدوء البيت والعمل، وعلاقات إنسانية مريحة.',
    wheelImpact: 'أرضية صلبة ومرونة فائقة تمكنك من امتصاص أي صدمات أو تقلبات طارئة بسكينة.',
    goldenQuest: 'تثبيت الأثر: وثّق روتينك الناجح في مصفوفة أيزنهاور لحمايته من أي انشغال طارئ.',
    energyPercent: 80,
  },
  {
    level: 9,
    title: 'وفرة وازدهار متقدم',
    subtitle: 'نضج استثنائي وتدفق إيجابي',
    icon: <Gem className="w-6 h-6 text-sky-600 dark:text-sky-400 animate-pulse" />,
    badge: 'وفرة وازدهار 💎',
    themeColor: '#0284C7',
    bgLight: 'bg-sky-50/70',
    bgDark: 'dark:bg-sky-950/30',
    borderColor: 'border-sky-300 dark:border-sky-900/60',
    dailyFeel: 'شغف متقد، طاقة حيوية مشعة، وتناغم نادر بين أهداف العمل وراحة البال والأسرة.',
    wheelImpact: 'هذا البعد يفيض بالنور والوفرة ويدعم كافة أركان عجلة الحياة بأعلى كفاءة ممكنة.',
    goldenQuest: 'الارتقاء المعرفي: ساهم في نشر هذا الوعي ومساندة الآخرين في بناء اتزانهم الخاص.',
    energyPercent: 90,
  },
  {
    level: 10,
    title: 'تناغم كلي وتوازن استثنائي',
    subtitle: 'أعلى درجات الصفاء والتحقق المتكامل',
    icon: <Sparkles className="w-6 h-6 text-amber-500 animate-spin" />,
    badge: 'قمة الاتزان 🌟',
    themeColor: '#D97706',
    bgLight: 'bg-amber-50/70',
    bgDark: 'dark:bg-amber-950/30',
    borderColor: 'border-amber-400 dark:border-amber-800',
    dailyFeel: 'صفاء داخلي عميق، بركة في الوقت، امتنان مستمر، وحضور إيماني وروحي ونفسي مبهر.',
    wheelImpact: 'عجلة الحياة تدور في أكمل صور التناغم؛ كل جانب يغذي الآخر بوعي واكتفاء.',
    goldenQuest: 'حفظ النعمة: الاستمرار في الشكر والتواضع والالتزام بالورد والذكر وحماية هذه المنظومة.',
    energyPercent: 100,
  },
];

export const InteractiveScaleGame: React.FC<InteractiveScaleGameProps> = ({
  onNavigateToAuth,
  theme: _theme = 'light',
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'simulator'>('explorer');
  const [selectedLevel, setSelectedLevel] = useState<number>(5);

  // Quick simulator quiz state (3 fun questions to estimate balance level)
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);

  const currentLevelData = SCALE_LEVELS[selectedLevel - 1] || SCALE_LEVELS[4];

  const handleSelectLevel = (lvl: number, triggerConfetti = false) => {
    setSelectedLevel(lvl);
    if (triggerConfetti) {
      confetti({
        particleCount: lvl >= 8 ? 60 : 30,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Quick simulator questions
  const SIMULATOR_QUESTIONS = [
    {
      question: 'كيف تصحو وتبدأ يومك في الغالب؟',
      options: [
        { text: 'بثقل وخمول وإرهاق وتأجيل للمنبه', score: 2.2 },
        { text: 'بشكل اعتيادي وروتيني دون حماس كبير', score: 5.4 },
        { text: 'بنشاط ووضوح وامتنان وطاقة طيبة', score: 8.8 },
      ],
    },
    {
      question: 'كيف تصف علاقتك بالوقت والمهام اليومية؟',
      options: [
        { text: 'الوقت يضيع بسرعة في الشاشات والتسويف', score: 3.1 },
        { text: 'أنجز الأساسيات مع بعض التشتت والضغط', score: 6.0 },
        { text: 'تركيز عالي وترتيب مسبق للأولويات', score: 9.0 },
      ],
    },
    {
      question: 'ما مدى شعورك بالسلام الداخلي والرضا في هذه الفترة؟',
      options: [
        { text: 'قلق دائم وضغوط تسرق هدوء بالي', score: 2.5 },
        { text: 'تذبذب؛ أيام هادئة وأيام فيها توتر', score: 5.8 },
        { text: 'سكينة وطمأنينة ووضوح للمعنى والغاية', score: 9.2 },
      ],
    },
  ];

  const handleAnswerQuiz = (score: number) => {
    const updated = [...quizAnswers, score];
    setQuizAnswers(updated);

    if (quizStep < SIMULATOR_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Calculate final simulated score
      const avg = updated.reduce((a, b) => a + b, 0) / updated.length;
      const roundedLevel = Math.max(1, Math.min(10, Math.round(avg)));
      setSimulatedScore(Number(avg.toFixed(1)));
      setSelectedLevel(roundedLevel);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });
    }
  };

  const handleResetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers([]);
    setSimulatedScore(null);
  };

  return (
    <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6 transition-all">
      {/* Top Header with Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F6E6E]/10 dark:bg-cyan-950/60 border border-[#0F6E6E]/20 dark:border-cyan-500/30 text-[#0F6E6E] dark:text-cyan-300 text-xs font-black mb-2">
            <Zap className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-cyan-400" />
            <span>مسطرة وزان التفاعلية الحية</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">
            مقياس الرضا والاتزان الحياتي (من 1 إلى 10)
          </h3>
          <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-400 mt-1">
            حرّك المؤشر أو انقر على أي مستوى لتستكشف فلسفة التشخيص السريري، أو خض المحاكي السريع!
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F8FAFA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('explorer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-[#0F6E6E] text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950'
                : 'text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>مستكشف المستويات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#0F6E6E] text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950'
                : 'text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span>محاكي الفحص السريع 🎮</span>
          </button>
        </div>
      </div>

      {activeTab === 'explorer' ? (
        <div className="space-y-6">
          {/* Interactive Gamified Milestone Track */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-slate-400 px-1">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span>🔴</span>
                <span>النطاق الحرج (1 - 3)</span>
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hidden sm:flex">
                <span>🟠</span>
                <span>نطاق التذبذب (4 - 5)</span>
              </span>
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 hidden sm:flex">
                <span>🟢</span>
                <span>نطاق النمو (6 - 7)</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span>🌟</span>
                <span>نطاق التناغم (8 - 10)</span>
              </span>
            </div>

            {/* 1 to 10 Milestone Buttons Row */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {SCALE_LEVELS.map((item) => {
                const isSelected = item.level === selectedLevel;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => handleSelectLevel(item.level, item.level >= 8)}
                    className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
                      isSelected
                        ? 'scale-105 shadow-md border-transparent text-white ring-2 ring-offset-2 dark:ring-offset-[#0c1827]'
                        : 'bg-[#F8FAFA] dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-[#0F6E6E]/40 hover:-translate-y-0.5'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: item.themeColor,
                            boxShadow: `0 8px 20px -4px ${item.themeColor}50`,
                          }
                        : {}
                    }
                    title={`${item.level}: ${item.title}`}
                  >
                    <span className="text-lg sm:text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {isSelected ? item.icon : item.badge.split(' ')[1] || '✨'}
                    </span>
                    <span
                      dir="ltr"
                      className={`text-sm sm:text-base font-black font-mono [unicode-bidi:isolate] ${
                        isSelected ? 'text-white' : 'text-[#0F172A] dark:text-white'
                      }`}
                    >
                      {item.level}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider Range Input for smooth touch dragging */}
            <div className="pt-2 px-1">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={selectedLevel}
                onChange={(e) => handleSelectLevel(parseInt(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0F6E6E] dark:accent-[#22D3EE]"
                aria-label="اختيار مستوى الرضا عن الحياة"
              />
            </div>
          </div>

          {/* Detailed Level Showcase Card */}
          <div
            className={`rounded-3xl p-6 sm:p-7 border ${currentLevelData.bgLight} ${currentLevelData.bgDark} ${currentLevelData.borderColor} transition-all duration-300 shadow-xs relative overflow-hidden`}
          >
            {/* Top Badge and Energy Gauge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border border-black/5 dark:border-white/10 bg-white dark:bg-[#0c1827] flex-shrink-0"
                  style={{ color: currentLevelData.themeColor }}
                >
                  {currentLevelData.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-black text-white"
                      style={{ backgroundColor: currentLevelData.themeColor }}
                    >
                      {currentLevelData.badge}
                    </span>
                    <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                      المستوى ({currentLevelData.level} من 10)
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white mt-0.5">
                    {currentLevelData.title}
                  </h4>
                  <p className="text-xs text-[#334155] dark:text-slate-300 font-semibold">
                    {currentLevelData.subtitle}
                  </p>
                </div>
              </div>

              {/* Energy & Harmony Gauge */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-black/5 dark:border-white/10 flex items-center gap-3 flex-shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 block">
                    معدل شحن الطاقة والسكينة
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${currentLevelData.energyPercent}%`,
                          backgroundColor: currentLevelData.themeColor,
                        }}
                      />
                    </div>
                    <span
                      dir="ltr"
                      className="font-mono text-xs font-black [unicode-bidi:isolate]"
                      style={{ color: currentLevelData.themeColor }}
                    >
                      {currentLevelData.energyPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Game-Like Diagnostic Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* Daily Feel */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-black/5 dark:border-white/10 space-y-1.5 shadow-xs">
                <span className="text-xs font-black text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <span>🧠</span>
                  <span>الواقع المعاش في اليوم:</span>
                </span>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {currentLevelData.dailyFeel}
                </p>
              </div>

              {/* Impact on Life Wheel */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-black/5 dark:border-white/10 space-y-1.5 shadow-xs">
                <span className="text-xs font-black text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>الأثر على عجلة الحياة:</span>
                </span>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {currentLevelData.wheelImpact}
                </p>
              </div>

              {/* The Golden Quest */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-black/5 dark:border-white/10 space-y-1.5 shadow-xs">
                <span className="text-xs font-black text-[#0F6E6E] dark:text-cyan-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>المهمة العلاجية المقترحة:</span>
                </span>
                <p className="text-xs text-[#0F172A] dark:text-white font-semibold leading-relaxed">
                  {currentLevelData.goldenQuest}
                </p>
              </div>
            </div>

            {/* Call to Action Bar */}
            <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#334155] dark:text-slate-400 text-center sm:text-right">
                هل تشعر أن هذا المستوى يعكس واقع أحد جوانبك الحياتية حالياً؟
              </span>
              <button
                type="button"
                onClick={() => onNavigateToAuth && onNavigateToAuth('signup')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:opacity-95"
                style={{ backgroundColor: currentLevelData.themeColor }}
              >
                <span>ابدأ تشخيصك السريري مع مستشاري وزان</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Simulator Tab: Quick Interactive Mini-Quiz */
        <div className="bg-[#F8FAFA] dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center animate-fadeIn">
          {simulatedScore === null ? (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                <Target className="w-3.5 h-3.5" />
                <span>السؤال ({quizStep + 1} من 3)</span>
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">
                {SIMULATOR_QUESTIONS[quizStep].question}
              </h4>

              <div className="space-y-3 text-right">
                {SIMULATOR_QUESTIONS[quizStep].options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswerQuiz(opt.score)}
                    className="w-full p-4 rounded-2xl bg-white dark:bg-[#0c1827] border border-slate-200 dark:border-slate-800 hover:border-[#0F6E6E] dark:hover:border-cyan-400 text-[#0F172A] dark:text-white text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <span>{opt.text}</span>
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs group-hover:bg-[#0F6E6E] group-hover:text-white transition-colors flex-shrink-0">
                      ←
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Simulator Result Reveal */
            <div className="max-w-xl mx-auto space-y-5 animate-scaleUp">
              <div className="w-16 h-16 rounded-3xl mx-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-3xl">
                🌟
              </div>

              <div>
                <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 block mb-1">
                  نتيجة المحاكاة التقديرية السريعة
                </span>
                <h4 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  أنت حالياً في نطاق المستوى ({simulatedScore} من 10)
                </h4>
                <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 mt-1 font-semibold">
                  {currentLevelData.title} — {currentLevelData.subtitle}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1827] border border-slate-200 dark:border-slate-800 text-xs text-right space-y-2">
                <span className="font-black text-[#0F6E6E] dark:text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>توصية المحاكي السريع:</span>
                </span>
                <p className="text-[#334155] dark:text-slate-300 leading-relaxed">
                  هذه قراءة أولية عفوية؛ للحصول على تشخيص سريري متكامل بالأعشار ورسم عجلة حياتك الحقيقية وتوزيع عاداتك في مصفوفة أيزنهاور، ابدأ جلستك الكاملة مع المستشارين الثمانية.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetQuiz}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاكاة</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToAuth && onNavigateToAuth('signup')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>دخول التقييم السريري الشامل (مجاناً)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
