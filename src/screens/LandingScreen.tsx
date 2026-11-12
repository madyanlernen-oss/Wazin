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

interface LandingScreenProps {
  onLoadSample: () => void;
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoadSample,
  onNavigateToAuth,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] pb-24 overflow-hidden bg-[#FAF7F2]">
      {/* Background Subtle Warm Ambient Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#1b605b]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-[#bd9240]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#1b605b]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#eae3d5] text-xs font-bold text-[#1b605b] shadow-xs">
            <Sparkles className="w-4 h-4 text-[#bd9240] animate-spin" />
            <span>نظام الذكاء الاصطناعي الأول لتناغم مجالات الحياة الثمانية</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1d2e2b] leading-tight">
            لا تعش في جانب واحد..{' '}
            <span className="text-[#1b605b] inline-block">
              وازن حياتك كاملة
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#536561] leading-relaxed max-w-2xl mx-auto">
            منصة ذكية متخصصة تعيد رسم بوصلتك الحياتية بوعي. يرافقك المستشارون الذكيون في كل جانب
            وفق معايير نوعية، ليرسموا لك "عجلة الحياة" ويزودوك بخطة عمل تكاملية تجمع بين النجاح والسكينة.
          </p>

          {/* Login CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigateToAuth('login')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white text-sm font-extrabold shadow-md shadow-[#1b605b]/20 hover:shadow-lg transition-all hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول إلى تدبير</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
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
