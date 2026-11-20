import React from 'react';
import { HeartHandshake, Phone, ShieldAlert } from 'lucide-react';

export function isCrisisMessage(text: string): boolean {
  if (!text) return false;
  return (
    text.includes('الانتحار ليس فكرة صحيحة') ||
    text.includes('مكان آمن الآن وتستطيع التحدث') ||
    text.includes('حياتك غالية ومكانتك محفوظة') ||
    text.includes('صرخة لوقف هذا الألم والإنهاك') ||
    text.includes('صرخة لإنهاء هذا الوجع والضغط') ||
    /(انتحار|الانتحار|ايذاء النفس|إيذاء نفسي|الموت|افكر بالموت|ودي اموت|انهي حياتي)/i.test(text)
  );
}

interface CrisisSupportCardProps {
  className?: string;
}

export const CrisisSupportCard: React.FC<CrisisSupportCardProps> = ({ className = '' }) => {
  return (
    <div
      role="region"
      aria-label="بطاقة الأمان والدعم النفسي والإنساني"
      className={`p-4 sm:p-5 rounded-2xl bg-rose-50/95 dark:bg-[#1a1114] border-2 border-rose-300 dark:border-rose-800/80 shadow-md text-[#0F172A] dark:text-[#F1F5F9] transition-all my-3 text-right ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 mb-3 text-rose-800 dark:text-rose-300">
        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300 flex-shrink-0">
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5">
            <span>بطاقة الأمان والدعم النفسي والإنساني</span>
            <span className="text-xs">🤍</span>
          </h4>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
            حياتك غالية ومكانتك محفوظة، وسلامتك فوق كل تقييم
          </p>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
        أنت لست وحدك أبداً في هذا الثقل. إذا كنت تشعر بالإنهاك الشديد أو بالخطر على سلامتك أو تفكر في إيذاء نفسك، أرجوك ألا تبقى بمفردك؛ تحدث فوراً مع شخص قريب تثق به، أو تواصل مباشرة مع خطوط المساندة والاستشارات الطبية والنفسية المجانية المعتمدة:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
        {/* Hotline 1: National Center for Mental Health Promotion */}
        <a
          href="tel:920033360"
          className="flex items-center justify-between p-3 min-h-[44px] rounded-xl bg-white dark:bg-[#25151a] border border-rose-200 dark:border-rose-900 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-colors shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              استشارات الصحة النفسية (المملكة)
            </span>
          </div>
          <span
            dir="ltr"
            className="text-xs font-mono font-black text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/80"
          >
            920033360
          </span>
        </a>

        {/* Hotline 2: Ministry of Health 937 */}
        <a
          href="tel:937"
          className="flex items-center justify-between p-3 min-h-[44px] rounded-xl bg-white dark:bg-[#25151a] border border-rose-200 dark:border-rose-900 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-colors shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              مركز الاستشارات الطبية والنفسية (937)
            </span>
          </div>
          <span
            dir="ltr"
            className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80"
          >
            937
          </span>
        </a>

        {/* Emergency: 911 / 999 */}
        <a
          href="tel:911"
          className="sm:col-span-2 flex items-center justify-between p-3 min-h-[44px] rounded-xl bg-white dark:bg-[#25151a] border border-rose-200 dark:border-rose-900 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-colors shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              طوارئ السلامة والحماية الشاملة
            </span>
          </div>
          <span
            dir="ltr"
            className="text-xs font-mono font-black text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/80"
          >
            911 / 999
          </span>
        </a>
      </div>

      <div className="pt-2 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
        <span className="text-rose-600 dark:text-rose-400 font-bold">🌿 تذكير دافئ:</span>
        <span>المشاعر المظلمة سحابة عابرة؛ خذ نفساً عميقاً ولا تتردد في طلب العون الآن.</span>
      </div>
    </div>
  );
};
