import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Scale,
  BrainCircuit,
  Grid,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface WazanExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAssessment?: () => void;
}

export const WazanExplainerModal: React.FC<WazanExplainerModalProps> = ({
  isOpen,
  onClose,
  onStartAssessment,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const STEPS = [
    {
      badge: 'الركيزة الأولى ⚖️',
      title: 'فلسفة أبعاد الحياة الثمانية',
      subtitle: 'لا تعش في جانب واحد.. فالنجاح الحقيقي هو التناغم المتكامل',
      icon: <Scale className="w-8 h-8 text-[#0F6E6E] dark:text-[#22D3EE]" />,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
          <p>
            يقوم نموذج <strong>وزان</strong> على تقسيم حياة الإنسان إلى <strong>8 محطات رئيسية مترابطة</strong>: (الروحي، المالي، المهني، الشخصي، المعرفي، الأسري، الاجتماعي، والصحي).
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="font-black text-[#0F172A] dark:text-white block">
              💡 قانون التناغم الحياتي:
            </span>
            <p>
              لا قيمة لثروة طائلة إن فُقدت الصحة، ولا معنى لإنجاز مهني باهر على حساب انهيار الأسرة أو السلام الداخلي. كل جانب يدعم الآخر كتروس ساعة دقيقة.
            </p>
          </div>
        </div>
      ),
    },
    {
      badge: 'الركيزة الثانية 🧠',
      title: 'الذكاء السقراطي والدقة العشرية',
      subtitle: 'حوار تشخيصي عميق يرفض التقييمات السطحية والأرقام العشوائية',
      icon: <BrainCircuit className="w-8 h-8 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
          <p>
            على عكس الاستبيانات الجافة، يرافقك في وزان <strong>8 مستشارين أذكياء متخصصين</strong> يحاورونك بأسلوب سريري دافئ يفهم مشاعرك وتحدياتك.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
            <span className="font-black text-amber-900 dark:text-amber-200 block">
              📊 دقة التقييم بالأعشار (Decimal Precision):
            </span>
            <p>
              لا نعتمد درجات مجاملة مثل (5/10)؛ بل تُحسب درجتك بالأعشار (مثل <strong className="font-mono">2.7</strong> أو <strong className="font-mono">6.4</strong> أو <strong className="font-mono">8.3</strong>) بناءً على التحديات الواقعية التي تشاركها.
            </p>
          </div>
        </div>
      ),
    },
    {
      badge: 'الركيزة الثالثة 🎯',
      title: 'من التشخيص إلى مصفوفة أيزنهاور',
      subtitle: 'تحويل الاستشارة فوراً إلى خطة عادات يومية في المربع الثاني',
      icon: <Grid className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
          <p>
            لا تنتهي جلستك بمجرد أرقام ورسوم بيانية؛ بل يستخلص كل مستشار <strong>توصية علاجية ذهبية (Micro-habit)</strong> من صلب مشكلتك.
          </p>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
            <span className="font-black text-emerald-900 dark:text-emerald-200 block">
              ⚡ المربع الثاني (هام وغير عاجل):
            </span>
            <p>
              تسقط عاداتك الذهبية تلقائياً في مصفوفة أيزنهاور لتحمي أولوياتك من طوارئ الحياة اليومية وتضمن استدامة التحول خطوة بخطوة.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = STEPS[activeStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative text-right space-y-6 transition-colors">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="إغلاق الدليل"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0F6E6E]/10 dark:bg-cyan-950/50 text-[#0F6E6E] dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
            {currentStep.icon}
          </div>
          <div>
            <span className="text-[11px] font-black text-[#0F6E6E] dark:text-cyan-400 px-2.5 py-0.5 rounded-full bg-[#0F6E6E]/10 dark:bg-cyan-950/60 border border-[#0F6E6E]/20">
              {currentStep.badge}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white mt-1">
              {currentStep.title}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              {currentStep.subtitle}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[160px] flex items-center">
          {currentStep.content}
        </div>

        {/* Step Indicators and Nav Buttons */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === activeStep
                    ? 'w-6 bg-[#0F6E6E] dark:bg-cyan-400'
                    : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                aria-label={`الانتقال للركيزة ${i + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}

            {activeStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-4 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onStartAssessment) onStartAssessment();
                }}
                className="px-5 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ابدأ جلستك الآن</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
