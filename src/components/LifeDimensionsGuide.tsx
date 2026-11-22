import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Scale,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
} from 'lucide-react';
import { InteractiveLifeWheel } from './InteractiveLifeWheel';
import { LIFE_DOMAINS } from '../data/lifeDomains';
import { InteractiveScaleGame } from './InteractiveScaleGame';
import { WazanExplainerModal } from './WazanExplainerModal';

interface LifeDimensionsGuideProps {
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

interface MajorPillar {
  id: string;
  title: string;
  subtitle: string;
  iconEmoji: string;
  subDomains: string;
  badge: string;
  color: string;
  wisdom: string;
  balanceImpact: string;
}

const MAJOR_PILLARS: MajorPillar[] = [
  {
    id: 'spirit-health',
    title: 'الروح والجسد',
    subtitle: 'السكينة والعافية البدنية',
    iconEmoji: '🌿',
    subDomains: 'الجانب الروحي • الجانب الصحي',
    badge: 'ركيزة الطاقة والسكينة',
    color: '#0D9488',
    wisdom: 'السكينة الروحية تحمي عقلك من الشتات، والعافية البدنية هي المحرك الذي يحمل طموحاتك؛ فلا قيمة لأي إنجاز إن استُنزفت صحتك أو تلاشت طمأنينة قلبك.',
    balanceImpact: 'يمنحك صفاءً ذهنياً وطاقة حيوية يومية تقيك من الإرهاق وتمنحك القدرة على مواصلة العطاء بحضور كامل.',
  },
  {
    id: 'relationships',
    title: 'العلاقات والمجتمع',
    subtitle: 'الدفء الأسري والانتماء',
    iconEmoji: '🏡',
    subDomains: 'الجانب الأسري • الجانب الاجتماعي',
    badge: 'ركيزة الألفة والسند',
    color: '#F59E0B',
    wisdom: 'الإنسان كائن وجداني يزهر بدفء عائلته وصدق أصدقائه؛ والنجاح الحق هو أن تصل إلى قمتك ومقاصدك ومحيطك الداعم يشاركك بهجة الوصول ويشد أزرك.',
    balanceImpact: 'يحميك من العزلة والاحتراق العاطفي، ويصنع لك ملاذاً آمناً ترتاح إليه وسط متطلبات الحياة وضغوطها.',
  },
  {
    id: 'career-wealth',
    title: 'المسار والمال',
    subtitle: 'الإنتاجية والأمان المالي',
    iconEmoji: '💼',
    subDomains: 'الجانب المهني • الجانب المالي',
    badge: 'ركيزة الأثر والاستدامة',
    color: '#6366F1',
    wisdom: 'المال أداة للأمان والتمكين لا غاية بحد ذاته، والعمل مساحة لصناعة الأثر؛ فالتناغم بينهما يمنحك استقراراً مالياً ونمواً وظيفياً خالياً من التوتر المستنزف.',
    balanceImpact: 'يبعد عنك شبح الأزمات المالية والركود المهني، ويحوّل جهدك اليومي من عبء روتيني إلى نمو استراتيجي واثق.',
  },
  {
    id: 'self-growth',
    title: 'الذات والتطوير',
    subtitle: 'السلام النفسي والتعلم',
    iconEmoji: '🧘',
    subDomains: 'الجانب النفسي • الجانب المعرفي',
    badge: 'ركيزة الوعي والارتقاء',
    color: '#EC4899',
    wisdom: 'التصالح مع مشاعرك يمنحك متانة داخلية، والتعلم المستمر يفتح مداركك ويصقل مهاراتك؛ فكل ارتقاء ملموس في حياتك يبدأ أولاً من نضج وإدراك في داخلك.',
    balanceImpact: 'يحميك من جلد الذات والتسويف، ويضمن تجدد مهاراتك الفكرية ومواكبة متطلبات العصر بثقة وهدوء.',
  },
];

export const LifeDimensionsGuide: React.FC<LifeDimensionsGuideProps> = ({
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [activePillarId, setActivePillarId] = useState<string>('spirit-health');
  const [savedPrinciples, setSavedPrinciples] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('wazan_saved_principles');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [copiedPillarId, setCopiedPillarId] = useState<string | null>(null);

  const activePillar = MAJOR_PILLARS.find((p) => p.id === activePillarId) || MAJOR_PILLARS[0];
  const isCurrentSaved = savedPrinciples.includes(activePillar.id);

  const handleToggleSavePrinciple = (pillarId: string) => {
    setSavedPrinciples((prev) => {
      const next = prev.includes(pillarId) ? prev.filter((id) => id !== pillarId) : [...prev, pillarId];
      try {
        localStorage.setItem('wazan_saved_principles', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleShareOrCopy = async (pillar: MajorPillar) => {
    const textToShare = `✨ حكمة التوازن في (${pillar.title}) من منصة وزان:\n"${pillar.wisdom}"\n💡 أثر التوازن: ${pillar.balanceImpact}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `حكمة التوازن: ${pillar.title}`,
          text: textToShare,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToShare);
        setCopiedPillarId(pillar.id);
        setTimeout(() => setCopiedPillarId(null), 2500);
      } catch {
        // ignore
      }
    }
  };

  const dimensions = LIFE_DOMAINS;

  return (
    <section
      id="life-dimensions-guide"
      aria-labelledby="life-dimensions-heading"
      className="mt-14 pt-12 border-t border-slate-200/90 dark:border-slate-800 max-w-5xl mx-auto space-y-12 text-right transition-colors"
    >
      {/* 1. Header & Main Concept (Interactive Model Section) */}
      <div id="model" className="scroll-mt-36 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#0B6E72] dark:text-cyan-400 shadow-xs">
            <Scale className="w-4 h-4 text-[#8A5A00] dark:text-amber-400" aria-hidden="true" />
            <span>الدليل المعرفي لنموذج التوازن</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExplainerOpen(true)}
            className="px-4 py-2 rounded-2xl bg-[#0F6E6E]/10 hover:bg-[#0F6E6E]/20 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-[#0F6E6E]/30 dark:border-cyan-500/40 text-[#0F6E6E] dark:text-cyan-300 text-xs font-black transition-all shadow-xs flex items-center gap-2 cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>💡 كيف يعمل وزان؟ دليل المفهوم ومقياس الاتزان</span>
          </button>
        </div>

        <div>
          <h2
            id="life-dimensions-heading"
            className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white leading-tight transition-colors"
          >
            ماهية نموذج أبعاد الحياة الثمانية{' '}
            <span className="text-[#0B6E72] dark:text-cyan-400 font-bold text-lg sm:text-2xl block sm:inline">
              — منظومة التوازن المتكاملة
            </span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#1E293B] dark:text-slate-200 leading-relaxed font-medium">
            هو إطار استراتيجي للتقييم الذاتي والتطوير الشخصي، يقوم على تقسيم حياة الإنسان إلى ثمانية مجالات رئيسية مترابطة، بهدف قياس مستوى الرضا والتوازن والتقدم في كل مجال، واكتشاف جوانب القوة والفرص، ثم وضع خطط لتحسين جودة الحياة بصورة متكاملة.
          </p>
        </div>

        {/* Interactive 4 Major Dimensions Pills (الأبعاد الأربعة الكبرى) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0F6E6E] dark:text-cyan-400">
              استكشف الركائز الكبرى (مرر الماوس أو اضغط):
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              4 ركائز تجمع أبعاد الحياة
            </span>
          </div>

          <div
            role="tablist"
            aria-label="الأبعاد الأربعة الكبرى"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
          >
            {MAJOR_PILLARS.map((pillar) => {
              const isActive = pillar.id === activePillar.id;
              return (
                <button
                  key={pillar.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActivePillarId(pillar.id)}
                  onMouseEnter={() => setActivePillarId(pillar.id)}
                  className={`group relative text-right px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                    isActive
                      ? 'bg-[#0F6E6E] dark:bg-cyan-600 border-[#0F6E6E] dark:border-cyan-500 text-white shadow-md shadow-teal-900/15 scale-[1.02]'
                      : 'bg-white dark:bg-[#102033] border-slate-200/90 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-[#0F6E6E]/60 dark:hover:border-cyan-500/60 hover:bg-[#F8FAFA] dark:hover:bg-[#152a42]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl" aria-hidden="true">
                      {pillar.iconEmoji}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full transition-opacity ${
                        isActive ? 'bg-amber-300 opacity-100' : 'bg-slate-300 dark:bg-slate-700 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className={`text-xs sm:text-sm font-black ${isActive ? 'text-white' : 'text-[#0F172A] dark:text-white'}`}>
                      {pillar.title}
                    </h3>
                    <p className={`text-[11px] font-semibold truncate ${isActive ? 'text-teal-100 dark:text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {pillar.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Dynamic Interactive "الفكرة الأساسية" Card */}
        <div
          key={activePillar.id}
          className="bg-white dark:bg-[#0c1827] border-2 border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 transition-all duration-300 animate-fadeIn"
        >
          {/* Card Top Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs"
                style={{
                  backgroundColor: isDark ? `${activePillar.color}25` : `${activePillar.color}15`,
                  color: isDark ? '#22D3EE' : activePillar.color,
                  border: `1px solid ${activePillar.color}35`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>الفكرة الأساسية — {activePillar.badge}</span>
              </span>
            </div>

            <span className="text-xs font-bold text-[#0B6E72] dark:text-cyan-300 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-xl border border-teal-200/60 dark:border-cyan-800/40">
              {activePillar.subDomains}
            </span>
          </div>

          {/* Dynamic Inspiring Sentence (Quote) */}
          <div className="relative pr-4 border-r-4 space-y-2" style={{ borderColor: activePillar.color }}>
            <p className="text-base sm:text-lg font-extrabold text-[#0F172A] dark:text-white leading-relaxed">
              "{activePillar.wisdom}"
            </p>
          </div>

          {/* Dynamic Balance Impact Breakdown */}
          <div className="p-4 rounded-2xl bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200/90 dark:border-slate-800 text-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-[#0B6E72] dark:text-cyan-400">
              <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>أثر التوازن في هذه الركيزة:</span>
            </div>
            <p className="text-xs sm:text-sm text-[#1E293B] dark:text-slate-200 leading-relaxed font-bold">
              {activePillar.balanceImpact}
            </p>
          </div>

          {/* Interactive Action Buttons inside the card */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {/* Button: احفظ المبدأ */}
              <button
                type="button"
                onClick={() => handleToggleSavePrinciple(activePillar.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                  isCurrentSaved
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-[#102033] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:border-[#0F6E6E] dark:hover:border-cyan-400'
                }`}
                aria-pressed={isCurrentSaved}
                title={isCurrentSaved ? 'المبدأ محفوظ في قائمتك' : 'احفظ هذا المبدأ للرجوع إليه'}
              >
                {isCurrentSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>تم حفظ المبدأ ✨</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>احفظ المبدأ</span>
                  </>
                )}
              </button>

              {/* Button: شارك هذه الحكمة */}
              <button
                type="button"
                onClick={() => handleShareOrCopy(activePillar)}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#102033] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E] dark:hover:border-cyan-400 text-[#0F172A] dark:text-slate-200 text-xs font-black transition-all cursor-pointer shadow-2xs"
                title="مشاركة أو نسخ الحكمة"
              >
                {copiedPillarId === activePillar.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">تم نسخ الحكمة! 📋</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#0F6E6E] dark:text-cyan-400" />
                    <span>شارك هذه الحكمة</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              ركيزة {MAJOR_PILLARS.findIndex((p) => p.id === activePillar.id) + 1} من 4 الكبرى
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Arabic Life Wheel & 8 Dimensions Breakdown */}
      <div id="wheel" className="scroll-mt-36 space-y-12">
        <InteractiveLifeWheel onNavigateToAuth={onNavigateToAuth} theme={theme} />

        {/* 3. The 8 Dimensions Breakdown */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-[#0F172A] dark:text-white">
              مجالات الحياة الثمانية بالتفصيل البسيط:
            </h3>
            <p className="text-xs text-[#334155] dark:text-slate-400 mt-1">
              نظرة شاملة ومبسطة على كل بُعد من أبعاد النموذج وكيف يؤثر في جودة معيشتك
            </p>
          </div>

          {/* 9. Render as <ul>/<li> with reset list styles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0">
            {dimensions.map((dim, idx) => {
              // 6. Contrast WCAG 2.2 AA: strongColor on Light mode, color / lighter tint on Dark mode
              const badgeColor = isDark
                ? dim.id === 'career'
                  ? '#818cf8' // indigo-400 achieves 5.99:1 on dark #0c1827
                  : dim.id === 'personal'
                  ? '#a78bfa' // violet-400 achieves 6.56:1 on dark #0c1827
                  : dim.color
                : dim.strongColor;

              return (
                <li
                  key={dim.id}
                  className="bg-white dark:bg-[#0c1827] border rounded-2xl p-5 space-y-2.5 transition-all duration-300 motion-safe:hover:-translate-y-1 shadow-xs hover:shadow-md"
                  style={{
                    // 5. Border computed as ${color}4D
                    borderColor: `${dim.color}4D`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* 8. aria-hidden on decorative emoji */}
                    <span className="text-2xl" aria-hidden="true">
                      {dim.icon}
                    </span>
                    {/* 4, 6, 7. text-xs, isolated number, strongColor in light mode */}
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      style={{
                        color: badgeColor,
                        backgroundColor: `${badgeColor}1A`,
                      }}
                    >
                      <span>البُعد</span>
                      <span dir="ltr" className="[unicode-bidi:isolate]">
                        {idx + 1}
                      </span>
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white">{dim.name}</h4>
                  {/* 7. Raised description paragraph to text-sm */}
                  <p className="text-sm text-[#334155] dark:text-slate-400 leading-relaxed">{dim.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 4. How the Model Works & Rating Scale (1-10) */}
      <div id="scale" className="scroll-mt-36 bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-950/60 border border-[#0B6E72]/20 dark:border-cyan-500/30 text-[#0B6E72] dark:text-cyan-300 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>آلية القياس والتقييم</span>
          </div>
          <h3 className="text-xl font-black text-[#0F172A] dark:text-white">كيف يعمل النموذج؟</h3>
          {/* 4. Isolated numbers in Arabic text */}
          <p className="text-xs text-[#334155] dark:text-slate-400 mt-1">
            يُقيّم الإنسان كل مجال من{' '}
            <span dir="ltr" className="[unicode-bidi:isolate] font-bold">
              1
            </span>{' '}
            إلى{' '}
            <span dir="ltr" className="[unicode-bidi:isolate] font-bold">
              10
            </span>{' '}
            بحسب مستوى رضاه الحالي وواقع تجربته:
          </p>
        </div>

        {/* 1 - 5 - 10 Visual Scale Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scale Card 1 */}
          <div className="bg-[#F8FAFA] dark:bg-[#102033] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs transition-colors">
            <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                <span dir="ltr" className="[unicode-bidi:isolate]">
                  1
                </span>
              </span>
              <span className="text-xl" aria-hidden="true">
                ⚠️
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white">عدم الرضا الشديد</h4>
            <p className="text-sm text-[#334155] dark:text-slate-400 leading-relaxed">
              شعور بالعجز أو الاستنزاف، وضغط خانق في هذا الجانب يعطل تقدمك ويستوجب تدخلاً عاجلاً.
            </p>
          </div>

          {/* Scale Card 5 */}
          <div className="bg-[#F8FAFA] dark:bg-[#102033] border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs transition-colors">
            <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#8A5A00] dark:text-amber-400">
                <span dir="ltr" className="[unicode-bidi:isolate]">
                  5
                </span>
              </span>
              <span className="text-xl" aria-hidden="true">
                ⚖️
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white">مستوى متوسط يحتاج إلى تحسين</h4>
            <p className="text-sm text-[#334155] dark:text-slate-400 leading-relaxed">
              وضع مقبول لكنه روتيني أو متذبذب، لا يحقق طموحك الحقيقي ويحتاج عادات جديدة ومنتظمة.
            </p>
          </div>

          {/* Scale Card 10 - Fixed to match Cards 1 & 2 structure */}
          <div className="bg-[#F8FAFA] dark:bg-[#102033] border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs transition-colors">
            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-600" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                <span dir="ltr" className="[unicode-bidi:isolate]">
                  10
                </span>
              </span>
              <span className="text-xl" aria-hidden="true">
                🌟
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-white">رضا مرتفع جداً</h4>
            <p className="text-sm text-[#334155] dark:text-slate-400 leading-relaxed">
              ازدهار ووفرة واستقرار مبهج، يمنحك طاقة إيجابية فائقة تعزز وتدعم بقية أركان حياتك.
            </p>
          </div>
        </div>

        {/* Gamified Interactive Life Balance Scale & Quick Simulator */}
        <InteractiveScaleGame onNavigateToAuth={onNavigateToAuth} theme={theme} />

        {/* Summary Takeaway */}
        <div className="p-4 rounded-2xl bg-[#F8FAFA] dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-xs text-[#334155] dark:text-slate-300 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400 flex-shrink-0" aria-hidden="true" />
            <span>
              في منصة <strong className="text-[#0B6E72] dark:text-cyan-300">وزان</strong>، يتم تقييم كل مجال لحساب مستوى توازنك بدقة ورسم عجلتك التفاعلية وتقديم خطة موجهة لتحسين جودة حياتك.
            </span>
          </div>
        </div>
      </div>
      {/* Interactive Explainer Modal */}
      <WazanExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        onStartAssessment={() => onNavigateToAuth && onNavigateToAuth('signup')}
      />
    </section>
  );
};
