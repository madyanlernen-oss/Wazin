import React from 'react';
import {
  Sparkles,
  Users,
  BarChart3,
  Play,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeDimensionsGuide } from '../components/LifeDimensionsGuide';

interface LandingScreenProps {
  onLoadSample?: () => void;
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoadSample: _onLoadSample,
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] pb-28 overflow-hidden bg-[#F4F8F7] dark:bg-[#07111c] transition-colors duration-300">
      {/* 4-Corner Rich Ambient Mesh Gradient with Ultra-Slow Ambient Drift Animation (Airy Light & Deep Dark) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 animate-ambient-drift"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 65% 50% at 50% 36%, rgba(10, 22, 38, 0.95) 0%, rgba(7, 17, 28, 0.88) 35%, rgba(5, 12, 22, 0.45) 65%, transparent 85%),
              radial-gradient(circle 850px at 0% 0%, #062329 0%, #0a3640 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, #23143c 0%, #2e1a50 32%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, #2e1420 0%, #3d1b2b 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 68%, #091728 0%, #0e223d 36%, transparent 72%)
            `
            : `
              radial-gradient(ellipse 70% 55% at 50% 36%, #FAFDFD 0%, #F0F6F5 45%, rgba(240, 246, 245, 0.65) 75%, transparent 100%),
              radial-gradient(circle 850px at 0% 0%, rgba(11, 110, 114, 0.10) 0%, rgba(11, 110, 114, 0.04) 35%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, rgba(147, 112, 190, 0.10) 0%, rgba(147, 112, 190, 0.04) 35%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, rgba(20, 184, 166, 0.07) 0%, transparent 65%),
              radial-gradient(circle 850px at 100% 68%, rgba(126, 108, 150, 0.07) 0%, transparent 65%)
            `,
        }}
      />

      {/* Hero Ambient Wrapper with Glowing Central Halo and Orbital Wireframe Rings */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-16">
        {/* Main Centerpiece Frame with Generous Breathing Room */}
        <div className="relative max-w-4xl mx-auto pt-8 pb-14 px-6 sm:px-14 lg:px-16 text-center">
          {/* Luminous Oval Halo & Delicate Concentric Orbital Wireframes (SVG) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Central Glassmorphic Frame (88%-92% Soft Ivory/White in Light Mode for WCAG AA Clarity) */}
            <div
              className={`w-full h-full max-w-3xl rounded-[3rem] border transition-all duration-500 ${
                isDark
                  ? 'border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md'
                  : 'border-slate-200/90 shadow-[0_16px_45px_rgba(15,23,42,0.05),inset_0_1px_2px_rgba(255,255,255,0.95)] backdrop-blur-md'
              }`}
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.90)',
              }}
            />

            {/* Overlapping Orbital Rings with Ambient Counter-Rotation & Subtle Twinkling Stars */}
            <svg
              className="absolute w-[120%] h-[130%] max-w-5xl pointer-events-none"
              viewBox="0 0 900 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Orbit 1: Dashed Teal Ring - Rotating Clockwise (65s cycle) */}
              <g className="animate-orbit-cw">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="420"
                  ry="210"
                  stroke={isDark ? "rgba(34, 211, 238, 0.28)" : "rgba(11, 110, 114, 0.22)"}
                  strokeWidth="1.2"
                  strokeDasharray="4 6"
                />
              </g>

              {/* Mid Orbit 2: Solid Purple/Lavender Ring - Counter-Rotating (52s cycle) */}
              <g className="animate-orbit-ccw">
                <g transform="rotate(-6 450 250)">
                  <ellipse
                    cx="450"
                    cy="250"
                    rx="390"
                    ry="190"
                    stroke={isDark ? "rgba(168, 85, 247, 0.28)" : "rgba(139, 92, 246, 0.22)"}
                    strokeWidth="1.5"
                  />
                </g>
              </g>

              {/* Inner Orbit 3: Subtle Guide Ring */}
              <g transform="rotate(8 450 250)">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="350"
                  ry="170"
                  stroke={isDark ? "rgba(0, 229, 255, 0.24)" : "rgba(10, 117, 126, 0.18)"}
                  strokeWidth="1"
                  strokeDasharray="8 8"
                />
              </g>

              {/* 5-6 Subtle Twinkling Micro-Stars along outer orbital paths (far from central text) */}
              {/* Micro-Star 1: Upper-left outer orbit */}
              <g className="animate-star-1" transform="translate(130, 150)">
                <circle cx="0" cy="0" r="2.2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 2: Upper-right outer orbit */}
              <g className="animate-star-2" transform="translate(770, 135)">
                <circle cx="0" cy="0" r="2.4" fill={isDark ? "#c084fc" : "#8b5cf6"} />
                <circle cx="0" cy="0" r="5.5" fill={isDark ? "rgba(192,132,252,0.2)" : "rgba(139,92,246,0.12)"} />
              </g>

              {/* Micro-Star 3: Far-right mid orbit */}
              <g className="animate-star-3" transform="translate(830, 260)">
                <circle cx="0" cy="0" r="2" fill={isDark ? "#38bdf8" : "#0B6E72"} />
                <circle cx="0" cy="0" r="4.5" fill={isDark ? "rgba(56,189,248,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 4: Far-left lower orbit */}
              <g className="animate-star-4" transform="translate(80, 310)">
                <circle cx="0" cy="0" r="2.2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 5: Top-center outer arch */}
              <g className="animate-star-5" transform="translate(280, 75)">
                <circle cx="0" cy="0" r="1.8" fill={isDark ? "#c084fc" : "#8b5cf6"} />
                <circle cx="0" cy="0" r="4" fill={isDark ? "rgba(192,132,252,0.2)" : "rgba(139,92,246,0.12)"} />
              </g>

              {/* Micro-Star 6: Lower-right outer edge */}
              <g className="animate-star-6" transform="translate(630, 425)">
                <circle cx="0" cy="0" r="2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="4.5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Breathing & Rotating Multi-Ray Accent Sparkle */}
              <g className="animate-sparkle-breathing">
                <g transform="translate(730, 370)">
                  <circle
                    cx="0"
                    cy="0"
                    r="20"
                    fill={isDark ? "rgba(34, 211, 238, 0.16)" : "rgba(11, 110, 114, 0.12)"}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill={isDark ? "#ffffff" : "#0B6E72"}
                    opacity="0.95"
                    filter={isDark ? "drop-shadow(0 0 8px rgba(34, 211, 238, 0.65))" : "drop-shadow(0 0 8px rgba(11, 110, 114, 0.4))"}
                  />
                  <line
                    x1="-30"
                    y1="0"
                    x2="30"
                    y2="0"
                    stroke={isDark ? "#ffffff" : "#0B6E72"}
                    strokeWidth="2.2"
                    opacity={isDark ? 0.85 : 0.9}
                  />
                  <line
                    x1="0"
                    y1="-30"
                    x2="0"
                    y2="30"
                    stroke={isDark ? "#ffffff" : "#0B6E72"}
                    strokeWidth="2.2"
                    opacity={isDark ? 0.85 : 0.9}
                  />
                  <line
                    x1="-18"
                    y1="-18"
                    x2="18"
                    y2="18"
                    stroke={isDark ? "rgba(34, 211, 238, 0.65)" : "rgba(11, 110, 114, 0.65)"}
                    strokeWidth="1.5"
                  />
                  <line
                    x1="18"
                    y1="-18"
                    x2="-18"
                    y2="18"
                    stroke={isDark ? "rgba(34, 211, 238, 0.65)" : "rgba(11, 110, 114, 0.65)"}
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            </svg>
          </div>

          {/* Foreground Hero Content (Completely static, crisp, and high-contrast) */}
          <div className="relative z-10 space-y-7">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/95 dark:bg-slate-900/85 border border-[#0B6E72]/20 dark:border-cyan-500/25 shadow-xs text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-cyan-300 transition-colors backdrop-blur-md">
              <span className="text-[#0B6E72] dark:text-cyan-400">✳️</span>
              <span>نظام الذكاء الاصطناعي الأول لتناغم مجالات الحياة الثمانية</span>
            </div>

            {/* Centerpiece Bold Headlines (Deep Slate #0F172A & Deep Teal #0B6E72) */}
            <div className="space-y-2 pt-1">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0F172A] dark:text-white leading-tight transition-colors">
                لا تعش في جانب واحد..
              </h1>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0B6E72] dark:text-cyan-400 dark:drop-shadow-[0_0_24px_rgba(34,211,238,0.35)] leading-tight transition-colors">
                وازن حياتك كاملة
              </h2>
            </div>

            {/* Legible Body Paragraph (Dark Slate #334155 for >= 4.5:1 AA Contrast) */}
            <p className="text-base sm:text-lg text-[#334155] dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal pt-2 transition-colors">
              منصة ذكية متخصصة تعيد رسم بوصلتك الحياتية بوعي. يرافقك المستشارون الذكيون في كل جانب وفق معايير نوعية، ليرسموا لك "عجلة الحياة" ويزودوك بخطة عمل تكاملية تجمع بين النجاح والسكينة.
            </p>

            {/* Primary Hero Conversion CTA Button */}
            <div className="pt-4">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="inline-flex items-center gap-3 px-9 py-4 rounded-full bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-base font-black shadow-lg shadow-[#0B6E72]/25 dark:shadow-cyan-950/50 border border-teal-600/30 dark:border-cyan-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="text-cyan-200 font-bold text-lg">&larr;</span>
                <span>تسجيل الدخول إلى وزان</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explainer Video Slot (حاوية الفيديو التوضيحي التعريفي لمنصة وازن) */}
        <div className="relative max-w-4xl mx-auto space-y-5 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-cyan-500/25 text-xs font-bold text-[#0B6E72] dark:text-cyan-300 shadow-xs backdrop-blur-md">
              <span className="text-[#8A5A00] dark:text-amber-400">🎬</span>
              <span>فيديو تعريفي لمنظومة وازن</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              شاهد كيف تُعيد "وازن" ترتيب بوصلتك الحياتية في دقائق
            </h3>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              جولة مرئية تستعرض رحلتك من التقييم الأسبوعي مع المستشارين الثمانية إلى لوحة تحكم عجلة الحياة ومصفوفة التركيز اليومي.
            </p>
          </div>

          {/* Video Player Frame Container with Design System Rounded Corners and Dark Glass Frame */}
          <div className="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-slate-200/90 dark:border-cyan-500/25 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xl transition-all duration-500 group">
            {/* 16:9 Aspect Ratio Frame */}
            <div className="relative aspect-video w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0c242c] via-[#091823] to-[#1c122e]">
              {/* Abstract Platform Screen Preview Background / Subtle Visual Grid */}
              <div
                className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.25) 0%, transparent 60%), radial-gradient(circle at 85% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)`,
                }}
              />

              {/* Decorative Concentric Rings in Player Backdrop */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className="w-72 h-72 rounded-full border border-cyan-400/30 animate-pulse" />
                <div className="absolute w-96 h-96 rounded-full border border-purple-500/20" />
              </div>

              {/* Central Glowing Play Button */}
              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#0B6E72] to-cyan-400 text-white flex items-center justify-center shadow-[0_0_35px_rgba(11,110,114,0.45)] dark:shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:scale-110 active:scale-95 transition-all duration-300 group-hover:shadow-[0_0_50px_rgba(11,110,114,0.6)] dark:group-hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] cursor-pointer"
                aria-label="تشغيل الفيديو التعريفي"
              >
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover:scale-105 transition-transform" />
              </button>

              {/* Player Bottom Control Bar (Arabic-Ready Presentation) */}
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between text-white text-xs z-10">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-white/95">تجربة وازن: التناغم الحياتي بالذكاء الاصطناعي</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-300">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-xs border border-white/10">03:15 دقيقة</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/20">4K Ultra HD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Eight Dimensions of Life Educational Guide (ماهية نموذج أبعاد الحياة الثمانية) */}
        <div>
          <LifeDimensionsGuide onNavigateToAuth={onNavigateToAuth} theme={theme} />
        </div>

        {/* 8 Advisors Section */}
        <div className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-[#0F172A] dark:text-white transition-colors">المستشارون الثمانية وعوالم التوازن</h2>
            <p className="text-sm text-[#334155] dark:text-slate-400 mt-1 transition-colors">
              لكل جانب من جوانب حياتك مستشار خبير بهويته ومنهجه المخصص لمساعدتك
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADVISORS_LIST.map((advisor) => (
              <div
                key={advisor.id}
                className="group relative bg-white dark:bg-[#0c1827] hover:bg-[#F8FAFA] dark:hover:bg-[#102033] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-cyan-800/50 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                    style={{ backgroundColor: `${advisor.themeColor}15` }}
                  >
                    {advisor.avatarSvg}
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: advisor.themeColor,
                      borderColor: `${advisor.themeColor}35`,
                      backgroundColor: `${advisor.themeColor}10`,
                    }}
                  >
                    {advisor.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-extrabold text-[#0F172A] dark:text-white text-base transition-colors">{advisor.name}</h3>
                  <p className="text-xs font-semibold" style={{ color: advisor.themeColor }}>
                    {advisor.title}
                  </p>
                  <p className="text-xs text-[#334155] dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed transition-colors">
                    {advisor.role}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-500">
                  <span>مستشار ذكي متخصص</span>
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="text-[#0B6E72] dark:text-cyan-400 font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-1 cursor-pointer"
                  >
                    <span>ابدأ الآن</span>
                    <span>&larr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 dark:bg-cyan-950/50 text-[#1b605b] dark:text-cyan-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">عجلة الحياة برادار تفاعلي</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              رسم بياني راداري متقدم يوضح لك فورياً أين مواطن قوتك، وأين تكمن الفجوات التي تستنزف
              طاقتك دون أن تشعر.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#bd9240]/10 dark:bg-amber-950/50 text-[#bd9240] dark:text-amber-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">استشارة تفاعلية حية لكل جانب</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              غرفة استشارة مستقلة مع كل مستشار، يعرف إجاباتك ودرجاتك وأهدافك ويقترح عليك خطوات
              إجرائية فورية.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 dark:bg-cyan-950/50 text-[#1b605b] dark:text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">تقرير المنسق العام التكاملي</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              تحليل بالذكاء الاصطناعي لكيفية تأثير المجالات على بعضها، واكتشاف العادات المحورية
              التي ترفع عدة جوانب دفعة واحدة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
