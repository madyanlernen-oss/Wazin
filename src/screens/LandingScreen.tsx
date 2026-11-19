import React from 'react';
import {
  Sparkles,
  ArrowLeft,
  Users,
  BarChart3,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeDimensionsGuide } from '../components/LifeDimensionsGuide';
import { TadbeerEmblem } from '../components/TadbeerLogo';

interface LandingScreenProps {
  onLoadSample: () => void;
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoadSample,
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] pb-28 overflow-hidden bg-[#FAF7F2] dark:bg-[#07111c] transition-colors duration-300">
      {/* 4-Corner Exact Ambient Mesh Gradient matching user specification */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 65% 50% at 50% 36%, rgba(13, 26, 44, 0.95) 0%, rgba(10, 20, 35, 0.88) 35%, rgba(6, 14, 25, 0.4) 65%, transparent 85%),
              radial-gradient(circle 850px at 0% 0%, #07232a 0%, #0c3640 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, #291845 0%, #362059 32%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, #361725 0%, #461f31 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 68%, #0b1a2d 0%, #102641 36%, transparent 72%)
            `
            : `
              radial-gradient(ellipse 65% 50% at 50% 36%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 35%, rgba(255, 255, 255, 0.4) 65%, transparent 85%),
              radial-gradient(circle 850px at 0% 0%, #10363d 0%, #16464e 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, #8e7ea9 0%, #a293bc 32%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, #d59f97 0%, #dfaea6 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 68%, #f6eee4 0%, #ebe0d2 36%, transparent 72%)
            `,
        }}
      />

      {/* Hero Ambient Wrapper with Glowing Central Halo and Orbital Wireframe Rings */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-16">
        {/* Main Centerpiece Frame */}
        <div className="relative max-w-4xl mx-auto pt-6 pb-12 px-6 sm:px-12 text-center">
          {/* Luminous Oval Halo & Delicate Concentric Orbital Wireframes (SVG) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Luminous White Oval Frame */}
            <div className={`w-full h-full max-w-3xl rounded-[3rem] border ${
              isDark
                ? 'border-cyan-500/30 shadow-[0_0_90px_rgba(6,182,212,0.25),inset_0_0_60px_rgba(6,182,212,0.15)] bg-slate-900/30'
                : 'border-white/60 shadow-[0_0_100px_rgba(255,255,255,0.95),inset_0_0_80px_rgba(255,255,255,0.7)] bg-white/20'
            } backdrop-blur-xs transition-all duration-500`} />

            {/* Overlapping Orbital Rings */}
            <svg
              className="absolute w-[120%] h-[130%] max-w-5xl"
              viewBox="0 0 900 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Orbit 1 */}
              <ellipse
                cx="450"
                cy="250"
                rx="420"
                ry="210"
                stroke={isDark ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.55)"}
                strokeWidth="1.2"
                strokeDasharray="4 6"
              />
              {/* Mid Orbit 2 (slightly tilted) */}
              <g transform="rotate(-6 450 250)">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="390"
                  ry="190"
                  stroke={isDark ? "rgba(168, 85, 247, 0.45)" : "rgba(255, 255, 255, 0.65)"}
                  strokeWidth="1.5"
                />
              </g>
              {/* Inner Orbit 3 (tilted other way) */}
              <g transform="rotate(8 450 250)">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="350"
                  ry="170"
                  stroke={isDark ? "rgba(0, 229, 255, 0.35)" : "rgba(255, 255, 255, 0.5)"}
                  strokeWidth="1"
                  strokeDasharray="8 8"
                />
              </g>

              {/* Lens Flare Glow Sparkle at bottom-right of the orbit ring */}
              <g transform="translate(730, 370)">
                <circle cx="0" cy="0" r="14" fill="white" opacity="0.9" filter="drop-shadow(0 0 8px #ffffff)" />
                <line x1="-30" y1="0" x2="30" y2="0" stroke="white" strokeWidth="2.5" opacity="0.85" />
                <line x1="0" y1="-30" x2="0" y2="30" stroke="white" strokeWidth="2.5" opacity="0.85" />
                <line x1="-18" y1="-18" x2="18" y2="18" stroke="rgba(0, 229, 255, 0.7)" strokeWidth="1.5" />
                <line x1="18" y1="-18" x2="-18" y2="18" stroke="rgba(0, 229, 255, 0.7)" strokeWidth="1.5" />
              </g>
            </svg>
          </div>

          {/* Foreground Hero Content */}
          <div className="relative z-10 space-y-6">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 border border-white/80 dark:border-slate-700/80 shadow-xs text-xs sm:text-sm font-extrabold text-[#10383f] dark:text-cyan-300 transition-colors">
              <span className="text-emerald-700 dark:text-cyan-400">✳️</span>
              <span>نظام الذكاء الاصطناعي الأول لتناغم مجالات الحياة الثمانية</span>
            </div>

            {/* Centerpiece Bold Headlines */}
            <div className="space-y-1 pt-2">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0f2329] dark:text-white leading-tight transition-colors">
                لا تعش في جانب واحد..
              </h1>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0f4b52] dark:text-cyan-400 dark:drop-shadow-[0_0_35px_rgba(6,182,212,0.5)] leading-tight transition-colors">
                وازن حياتك كاملة
              </h2>
            </div>

            {/* Legible Paragraph */}
            <p className="text-base sm:text-lg text-[#23383c] dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium pt-1 transition-colors">
              منصة ذكية متخصصة تعيد رسم بوصلتك الحياتية بوعي. يرافقك المستشارون الذكيون في كل جانب
              وفق معايير نوعية، ليرسموا لك "عجلة الحياة" ويزودوك بخطة عمل تكاملية تجمع بين النجاح والسكينة.
            </p>

            {/* CTA Button */}
            <div className="pt-3">
              <button
                onClick={() => onNavigateToAuth('login')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#0d2a30] hover:bg-[#133c44] dark:bg-gradient-to-r dark:from-cyan-600 dark:to-teal-600 dark:hover:from-cyan-500 dark:hover:to-teal-500 text-white text-sm sm:text-base font-black shadow-xl shadow-teal-950/20 dark:shadow-cyan-900/30 border border-cyan-400/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="text-cyan-300 font-bold">&larr;</span>
                <span>تسجيل الدخول إلى وزان</span>
              </button>
            </div>
          </div>
        </div>

        {/* The Eight Dimensions of Life Educational Guide (ماهية نموذج أبعاد الحياة الثمانية) */}
        <div>
          <LifeDimensionsGuide />
        </div>

        {/* 8 Advisors Section */}
        <div className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-[#1d2e2b] dark:text-white transition-colors">المستشارون الثمانية وعوالم التوازن</h2>
            <p className="text-sm text-[#536561] dark:text-slate-400 mt-1 transition-colors">
              لكل جانب من جوانب حياتك مستشار خبير بهويته ومنهجه المخصص لمساعدتك
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADVISORS_LIST.map((advisor) => (
              <div
                key={advisor.id}
                className="group relative bg-white dark:bg-[#0c1827] hover:bg-[#fcfaf6] dark:hover:bg-[#102033] border border-[#eae3d5] dark:border-slate-800 hover:border-[#ded7c8] dark:hover:border-cyan-800/50 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md"
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
                  <h3 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">{advisor.name}</h3>
                  <p className="text-xs font-semibold" style={{ color: advisor.themeColor }}>
                    {advisor.title}
                  </p>
                  <p className="text-xs text-[#536561] dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed transition-colors">
                    {advisor.role}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f0eae0] dark:border-slate-800 flex items-center justify-between text-[11px] text-[#7a8c88] dark:text-slate-500">
                  <span>مستشار ذكي متخصص</span>
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="text-[#1b605b] dark:text-cyan-400 font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-1"
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
