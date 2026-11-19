import React from 'react';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { InteractiveLifeWheel } from './InteractiveLifeWheel';
import { LIFE_DOMAINS } from '../data/lifeDomains';
import scaleImage from '../assets/images/balance_scale_guide_1794404547579.jpg';

interface LifeDimensionsGuideProps {
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

export const LifeDimensionsGuide: React.FC<LifeDimensionsGuideProps> = ({
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  // 5. Derive dimensions directly from shared single source LIFE_DOMAINS
  const dimensions = LIFE_DOMAINS;

  return (
    <section
      id="life-dimensions-guide"
      aria-labelledby="life-dimensions-heading"
      className="mt-14 pt-12 border-t border-slate-200/90 dark:border-slate-800 max-w-5xl mx-auto space-y-12 text-right transition-colors"
    >
      {/* 1. Header & Main Concept */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#0B6E72] dark:text-cyan-400 shadow-xs">
          <Scale className="w-4 h-4 text-[#8A5A00] dark:text-amber-400" aria-hidden="true" />
          <span>الدليل المعرفي لنموذج التوازن</span>
        </div>

        <h2
          id="life-dimensions-heading"
          className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white leading-tight transition-colors"
        >
          ماهية نموذج أبعاد الحياة الثمانية{' '}
          <span className="text-[#0B6E72] dark:text-cyan-400 font-bold text-lg sm:text-2xl block sm:inline">
            — منظومة التوازن المتكاملة
          </span>
        </h2>

        {/* Paragraph */}
        <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 transition-colors">
          <p className="text-sm sm:text-base text-[#334155] dark:text-slate-300 leading-relaxed transition-colors">
            هو إطار للتقييم الذاتي والتطوير الشخصي، يقوم على تقسيم حياة الإنسان إلى ثمانية مجالات رئيسية مترابطة، بهدف قياس مستوى الرضا والتوازن والتقدم في كل مجال، واكتشاف جوانب القوة والضعف، ثم وضع أهداف وخطط لتحسين جودة الحياة بصورة متكاملة.
          </p>

          <div className="p-4 rounded-2xl bg-[#F8FAFA] dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 text-sm font-semibold flex items-start gap-3 transition-colors">
            <Sparkles className="w-5 h-5 text-[#8A5A00] dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="text-[#0B6E72] dark:text-cyan-400 block mb-1">الفكرة الأساسية:</strong>
              إن نجاح الإنسان لا يُقاس بالنجاح المهني أو المالي وحده، بل بمدى التوازن بين مختلف جوانب حياته. فلا قيمة لثروة طائلة إن فقدت صحتك أو تلاشت سكينتك الأسرية والروحية.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Arabic Life Wheel */}
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
            // 6. Contrast WCAG 2.2 AA: strongColor on Light mode, color on Dark mode
            const badgeColor = isDark
              ? dim.id === 'career'
                ? '#a78bfa'
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

      {/* 4. How the Model Works & Rating Scale (1-10) */}
      <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
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

        {/* Visual Scale Infographic Image - 2. Arabic alt, loading lazy, explicit size, object-contain */}
        <div className="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm bg-[#F8FAFA] dark:bg-[#0c1827] flex items-center justify-center p-2">
          <img
            src={scaleImage}
            alt="رسم توضيحي لمقياس الرضا عن الحياة من 1 إلى 10"
            loading="lazy"
            width={1376}
            height={768}
            className="w-full h-auto object-contain max-h-[380px]"
          />
        </div>

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
    </section>
  );
};
