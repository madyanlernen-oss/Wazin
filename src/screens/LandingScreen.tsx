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
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoadSample,
  onNavigateToAuth,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] pb-28 overflow-hidden bg-gradient-to-b from-[#091524]/5 via-[#1b1938]/5 to-[#FAF7F2]">
      {/* Sophisticated Dark-Ambient Gradient Halos & Cybernetic Wave Accents */}
      <div className="absolute -top-24 -right-20 w-[42rem] h-[42rem] bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-[40rem] h-[40rem] bg-gradient-to-tr from-purple-600/15 via-fuchsia-500/10 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[45rem] h-[35rem] bg-gradient-to-t from-[#bd9240]/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Subtle Glowing Life-Dimension Orbits & Curved Pathways (SVG) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Cybernetic Wave Paths */}
          <path
            d="M-100 250 C 300 120, 600 380, 1000 180 C 1200 80, 1400 220, 1600 160"
            stroke="url(#gradientCyanPurple)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <path
            d="M-80 380 C 250 280, 750 480, 1100 320 C 1300 220, 1500 350, 1600 300"
            stroke="url(#gradientPurpleCyan)"
            strokeWidth="1.2"
          />
          {/* Subtle Life Dimension Concentric Orbits */}
          <circle cx="720" cy="240" r="320" stroke="url(#orbitGlow)" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="720" cy="240" r="480" stroke="url(#orbitGlow)" strokeWidth="0.8" strokeDasharray="8 12" />

          <defs>
            <linearGradient id="gradientCyanPurple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="gradientPurpleCyan" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1b605b" stopOpacity="0.1" />
            </linearGradient>
            <radialGradient id="orbitGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1b605b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-16">
        {/* Hero Centerpiece Section */}
        <div className="text-center max-w-3xl mx-auto space-y-7 pt-4">
          {/* Centered Badge Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-[#eae3d5] text-xs sm:text-sm font-extrabold text-[#1b605b] shadow-sm hover:shadow-md transition-all">
            <span className="text-sm">✨</span>
            <span>نظام الذكاء الاصطناعي الأول لتناغم مجالات الحياة الثمانية</span>
          </div>

          {/* Logo Showcase with Ambient Glow */}
          <div className="flex justify-center -my-1">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <img
                src="/assets/wazan_logo.jpg"
                alt="شعار منصة وزان"
                className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl border-2 border-white/40 ring-4 ring-cyan-500/20 group-hover:scale-105 transition-all duration-300"
              />
            </div>
          </div>

          {/* Centerpiece Bold Headlines */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#142623] leading-tight">
              لا تعش في جانب واحد..
            </h1>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-[#127a72] via-[#1b605b] to-[#0ea5e9] bg-clip-text text-transparent drop-shadow-xs leading-tight">
              وازن حياتك كاملة
            </h2>
          </div>

          {/* Legible Paragraph */}
          <p className="text-base sm:text-lg text-[#4a5e59] leading-relaxed max-w-2xl mx-auto font-medium">
            منصة ذكية متخصصة تعيد رسم بوصلتك الحياتية بوعي. يرافقك المستشارون الذكيون في كل جانب
            وفق معايير نوعية، ليرسموا لك "عجلة الحياة" ويزودوك بخطة عمل تكاملية تجمع بين النجاح والسكينة.
          </p>

          {/* Call-to-Action (CTA) Button */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onNavigateToAuth('login')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#1b605b] hover:bg-[#144b47] text-white text-base sm:text-lg font-black shadow-lg shadow-[#1b605b]/25 hover:shadow-cyan-900/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <span>تسجيل الدخول إلى وزان</span>
              <ArrowLeft className="w-5 h-5 text-cyan-300 animate-pulse" />
            </button>
          </div>
        </div>

        {/* UI/UX Showcase Preview Card (Glassmorphism Mockup) */}
        <div className="relative group max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-white/80 via-white/40 to-transparent border border-white/60 shadow-2xl backdrop-blur-xl">
          <div className="overflow-hidden rounded-[1.4rem] bg-[#0c1929]/95 border border-[#1b605b]/30">
            <div className="px-4 py-2.5 bg-[#08121f] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-bold text-gray-400 mr-2">منظومة وزان للتوازن الذكي | Wazan AI Platform</span>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Live Preview
              </span>
            </div>
            <img
              src="/assets/wazan_landing_page.jpg"
              alt="معاينة واجهة منصة وزان الذكية"
              className="w-full h-auto object-cover max-h-[520px] transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </div>
        </div>

        {/* The Eight Dimensions of Life Educational Guide (ماهية نموذج أبعاد الحياة الثمانية) */}
        <div>
          <LifeDimensionsGuide />
        </div>

        {/* 8 Advisors Section */}
        <div className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-[#1d2e2b]">المستشارون الثمانية وعوالم التوازن</h2>
            <p className="text-sm text-[#536561] mt-1">
              لكل جانب من جوانب حياتك مستشار خبير بهويته ومنهجه المخصص لمساعدتك
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADVISORS_LIST.map((advisor) => (
              <div
                key={advisor.id}
                className="group relative bg-white hover:bg-[#fcfaf6] border border-[#eae3d5] hover:border-[#ded7c8] rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs border border-black/5"
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
                  <h3 className="font-extrabold text-[#1d2e2b] text-base">{advisor.name}</h3>
                  <p className="text-xs font-semibold" style={{ color: advisor.themeColor }}>
                    {advisor.title}
                  </p>
                  <p className="text-xs text-[#536561] mt-2 line-clamp-2 leading-relaxed">
                    {advisor.role}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f0eae0] flex items-center justify-between text-[11px] text-[#7a8c88]">
                  <span>مستشار ذكي متخصص</span>
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="text-[#1b605b] font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-1"
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
          <div className="bg-white border border-[#eae3d5] rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 text-[#1b605b] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] text-base">عجلة الحياة برادار تفاعلي</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              رسم بياني راداري متقدم يوضح لك فورياً أين مواطن قوتك، وأين تكمن الفجوات التي تستنزف
              طاقتك دون أن تشعر.
            </p>
          </div>

          <div className="bg-white border border-[#eae3d5] rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#bd9240]/10 text-[#bd9240] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] text-base">استشارة تفاعلية حية لكل جانب</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              غرفة استشارة مستقلة مع كل مستشار، يعرف إجاباتك ودرجاتك وأهدافك ويقترح عليك خطوات
              إجرائية فورية.
            </p>
          </div>

          <div className="bg-white border border-[#eae3d5] rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 text-[#1b605b] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] text-base">تقرير المنسق العام التكاملي</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              تحليل بالذكاء الاصطناعي لكيفية تأثير المجالات على بعضها، واكتشاف العادات المحورية
              التي ترفع عدة جوانب دفعة واحدة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
