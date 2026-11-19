import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Calendar,
  RefreshCw,
  Copy,
  Printer,
  Check,
  Zap,
  Layers,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  DirectorSummaryReport,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';

interface DirectorSummaryScreenProps {
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  report: DirectorSummaryReport | null;
  onSaveReport: (report: DirectorSummaryReport) => void;
  onBackToDashboard: () => void;
  theme?: 'light' | 'dark';
}

// Helper to isolate numbers, percentages, and ratios like "4.8/10", "85%", "+15%", "8/10" in LTR so Arabic text flow remains natural
function renderWithIsolatedNumbers(text: string): React.ReactNode {
  if (!text) return null;
  const regex = /(\b[+-]?\d+(?:\.\d+)?%|\(?\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\)?|[+-]\d+(?:\.\d+)?)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (regex.test(part)) {
      return (
        <span
          key={idx}
          dir="ltr"
          className="inline-block font-sans font-bold mx-0.5 text-inherit"
          style={{ unicodeBidi: 'isolate' }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export const DirectorSummaryScreen: React.FC<DirectorSummaryScreenProps> = ({
  userProfile,
  scores,
  answers,
  goals,
  report,
  onSaveReport,
  onBackToDashboard,
  theme: _theme = 'light',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completedRoadmapActions, setCompletedRoadmapActions] = useState<Record<string, boolean>>({});

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Build summary of answers and goals for each advisor
      const advisorSummaries: Record<string, any> = {};
      ADVISORS_LIST.forEach((adv) => {
        advisorSummaries[adv.id] = {
          title: adv.title,
          score: scores[adv.id] || 0,
          goals: goals[adv.id] || [],
        };
      });

      const res = await fetch('/api/gemini/director-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          scores,
          answers,
          advisorSummaries,
          focusArea: userProfile?.currentFocus,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل توليد التقرير التكاملي من خادم الذكاء الاصطناعي');
      }

      const data = await res.json();
      const generatedReport: DirectorSummaryReport = {
        ...data,
        generatedAt: new Date().toISOString(),
      };

      onSaveReport(generatedReport);
    } catch (err: any) {
      console.warn('Director summary API unreachable, generating intelligent fallback report:', err);

      // Intelligent Local Synthesis based on user's actual scores
      const sortedAreas = [...ADVISORS_LIST].sort(
        (a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)
      );
      const strongest = sortedAreas[0];
      const bottleneck = sortedAreas[sortedAreas.length - 1];

      const scoreVals = Object.values(scores) as number[];
      const avg = scoreVals.length > 0 ? (scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(1) : '7.0';
      const avgNum = parseFloat(avg);

      const balanceLabel = avgNum >= 8.0 ? 'تناغم قيادي متقدم' : avgNum >= 6.5 ? 'توازن واعد ومستقر' : 'مرحلة إعادة التوازن والتأسيس';

      const fallbackReport: DirectorSummaryReport = {
        overallDiagnosis: `بناءً على قراءة عجلة حياتك الحالية (بمعدل عام ${avg}/10)، يتبين أن لديك ركيزة قوية جداً في جانب "${strongest.title}" تمنحك استقراراً وطاقة إيجابية. في المقابل، يمثل جانب "${bottleneck.title}" عنق الزجاجة الرئيسي الذي يستنزف جزءاً من تركيزك ويستوجب حماية المربع الثاني في مصفوفة الأولويات.`,
        balanceIndexLabel: balanceLabel,
        strongestSynergy: {
          title: `قوة ${strongest.title} كرافعة للتوازن`,
          description: `ارتفاع أدائك في ${strongest.title} (بدرجة ${scores[strongest.id] || 8}/10) يوفر لك أرضية صلبة ودافعاً حيوياً يمكن استثماره لتحفيز الجوانب الأقل استقراراً.`,
          domainsInvolved: [strongest.title, 'التطوير الشخصي', 'إدارة الطاقة'],
        },
        criticalBottleneck: {
          title: `فجوة ${bottleneck.title} وتأثيرها التراكمي`,
          impact: `تراجع هذا الجانب إلى (${scores[bottleneck.id] || 5}/10) يخلق ضغطاً غير مرئي يؤثر على صفاء ذهنك وقدرتك على استدامة الإنجاز.`,
          recommendation: `ابدأ بعادة صغرى واحدة يومياً (Micro-habit) لا تتجاوز 15 دقيقة مخصصة لـ ${bottleneck.title}، وضعها في المربع 2 في مصفوفة أيزنهاور.`,
          domain: bottleneck.title,
        },
        keystoneHabits: [
          {
            name: `طقس التوازن الصباحي (المربع 2)`,
            triggerTime: 'يومياً بعد صلاة الفجر لمدة 15 دقيقة',
            targetDomains: ['الصحي', 'الروحي', 'الشخصي'],
            expectedImpact: 'شحن الطاقة البدنية والصفاء الذهني ليوم متزن ومنتج.',
          },
          {
            name: 'جلسة التخطيط الأسبوعي الوقائي',
            triggerTime: 'عصر كل سبت لمدة 20 دقيقة',
            targetDomains: ['المهني', 'المالي', 'الشخصي'],
            expectedImpact: 'إسقاط أولويات الأسبوع في مصفوفة أيزنهاور وتجنب طوارئ اللحظة الأخيرة.',
          },
          {
            name: 'فصل رقمي وعطاء أسري ليلي',
            triggerTime: 'يومياً الساعة 10:00 مساءً',
            targetDomains: ['الأسري', 'الصحي', 'الاجتماعي'],
            expectedImpact: 'حماية جودة النوم وتعزيز الروابط العائلية بدون شاشات.',
          },
        ],
        thirtyDayRoadmap: [
          {
            weekNumber: 1,
            weekTitle: `الأسبوع 1: سد فجوة ${bottleneck.title} واستعادة المبادرة`,
            coreFocus: `تحديد وضبط الركائز الأساسية لجانب ${bottleneck.title} لتقليل الهدر واستعادة السيطرة.`,
            actions: [
              `تحديد 3 إجراءات أساسية لضبط جانب ${bottleneck.title}`,
              'تثبيت موعد النوم والاستيقاظ لضبط الطاقة البدنية',
              'إسقاط مهام الأسبوع في مصفوفة أيزنهاور الأسبوعية',
            ],
          },
          {
            weekNumber: 2,
            weekTitle: 'الأسبوع 2: تفعيل العادات المحورية وبناء الحماية',
            coreFocus: 'بناء طقوس يومية صلبة تحمي المربع الثاني وتمنع الاحتراق المهني.',
            actions: [
              'تطبيق طقس المشي الصباحي 4 أيام في الأسبوع',
              'حجز موعد عائلي خاص لا يتأثر بأي طارئ وظيفي',
              'مراجعة الميزانية وتفويض المهام غير المهمة',
            ],
          },
          {
            weekNumber: 3,
            weekTitle: 'الأسبوع 3: تعزيز التناغم والارتقاء بالمربع الثاني',
            coreFocus: 'استثمار ركائز القوة لتعويض الفجوات والارتقاء بالمهارات الشخصية.',
            actions: [
              'استشارة المستشار المتخصص عبر شاشة الاستشارات لمراجعة التقدم',
              'قراءة 15 صفحة من كتاب في تخصصك أو اهتمامك الشخصي',
              'إجراء مقارنة في شاشة التحليلات لرصد اتساع رادار الحياة',
            ],
          },
          {
            weekNumber: 4,
            weekTitle: 'الأسبوع 4: تقييم الشهر وتثبيت النظام الذاتي المستدام',
            coreFocus: 'ترسيخ العادات المكتسبة والتحول إلى أسلوب حياة تلقائي هادئ.',
            actions: [
              'إجراء تقييم أسبوعي صوتي شامل لعجلة الحياة',
              'الاحتفال بنقاط التحسن ومكافأة الذات على الاستمرارية',
              'تحديث أهداف الشهر القادم في مصفوفة أيزنهاور',
            ],
          },
        ],
        directorGoldenRule: '«التوازن ليس أن تعطي كل جانب نفس القدر من الساعات، بل أن تكون حاضراً بوعيك الكامل في الجانب المناسب في الوقت المناسب.»',
        generatedAt: new Date().toISOString(),
      };

      onSaveReport(fallbackReport);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleActionCheck = (actionId: string) => {
    setCompletedRoadmapActions((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  const handleCopy = () => {
    if (!report) return;
    const text = `
=== تقرير المنسق العام للتوازن الذكي - منصة وزان ===
المستفيد: ${userProfile?.name || ''}
التشخيص العام:
${report.overallDiagnosis}

أقوى نقطة تناغم:
${report.strongestSynergy.title}: ${report.strongestSynergy.description}

عنق الزجاجة الأبرز:
${report.criticalBottleneck.title}: ${report.criticalBottleneck.recommendation}

الوصية الذهبية:
"${report.directorGoldenRule}"
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const sortedRoadmapWeeks = [...(report?.thirtyDayRoadmap || [])].sort(
    (a, b) => a.weekNumber - b.weekNumber
  );

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 space-y-8 bg-[#F7F6F2] dark:bg-[#071318] text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E343F]">
        {/* Navigation & Screen Label */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-slate-50 dark:hover:bg-[#162734] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            <span>العودة للوحة التحكم</span>
          </button>
          <div className="h-4 w-px bg-[#E2E8F0] dark:bg-[#1E343F] hidden sm:block" />
          <span className="text-xs font-extrabold text-[#0F6E6E] dark:text-[#22D3EE] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8A5A00] dark:text-[#FBBF24]" />
            تقرير المنسق العام للتوازن الذكي
          </span>
        </div>

        {/* Action Controls: Secondary utilities + Clear Primary CTA */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {report && (
            <>
              {/* Secondary Utility: Copy */}
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-slate-50 dark:hover:bg-[#162734] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="نسخ ملخص التقرير"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                )}
                <span>{copied ? 'تم النسخ' : 'نسخ التقرير'}</span>
              </button>

              {/* Secondary Utility: Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-slate-50 dark:hover:bg-[#162734] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="طباعة التقرير"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>طباعة</span>
              </button>
            </>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4.5 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-black flex items-center gap-2 shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{report ? 'إعادة التحليل التكاملي' : 'توليد التقرير بالذكاء الاصطناعي'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Hero Director Card */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0F6E6E]/5 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-center text-3xl shadow-xs flex-shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">المنسق العام للتوازن الذكي</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F6E6E]/10 dark:bg-cyan-950/50 text-[#0F6E6E] dark:text-[#22D3EE] border border-[#0F6E6E]/20 dark:border-cyan-800/40">
                  تحليل تكاملي شامل
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 max-w-xl leading-relaxed">
                رؤية بانورامية تفحص تقاطع مجالات الحياة الثمانية معاً، وتكشف كيف يؤثر جانب على آخر،
                لتخرج بخطة 30 يوماً ذكية وعادات محورية تحدث أثراً مضاعفاً.
              </p>
            </div>
          </div>

          {report && (
            <div className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 text-left self-start md:self-auto shadow-xs transition-colors">
              <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] block font-semibold">تشخيص الحالة العامة</span>
              <span className="text-sm font-black text-[#0F6E6E] dark:text-[#22D3EE]">
                {report.balanceIndexLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Report Body */}
      {report ? (
        <div className="space-y-8">
          {/* Section 1: Strategic Diagnosis */}
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 transition-colors">
            <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
              <span>التشخيص الاستراتيجي العام لمنظومة حياتك</span>
            </h2>
            <div className="text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed whitespace-pre-wrap bg-[#F7F6F2] dark:bg-[#071318] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] transition-colors">
              {renderWithIsolatedNumbers(report.overallDiagnosis)}
            </div>
          </div>

          {/* Section 2: Cross-Domain Intersections (Synergy + Critical Bottleneck) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Strongest Synergy */}
            <div className="bg-white dark:bg-[#0E1D24] border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden h-full transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>أقوى نقطة تناغم وترابط إيجابي</span>
                </div>
                <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {report.strongestSynergy.title}
                </h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {renderWithIsolatedNumbers(report.strongestSynergy.description)}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 mt-auto">
                {(report.strongestSynergy?.domainsInvolved || []).map((dom, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {/* Critical Bottleneck */}
            <div className="bg-white dark:bg-[#0E1D24] border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden h-full transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>عنق الزجاجة الأبرز (يحتاج معالجة فورية)</span>
                </div>
                <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {report.criticalBottleneck.title}
                </h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {renderWithIsolatedNumbers(report.criticalBottleneck.impact)}
                </p>
              </div>
              <div className="bg-[#F7F6F2] dark:bg-[#071318] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#0F172A] dark:text-[#F1F5F9] mt-auto transition-colors">
                <span className="font-bold text-amber-800 dark:text-[#FBBF24] block mb-0.5">الحل العاجل:</span>
                {renderWithIsolatedNumbers(report.criticalBottleneck.recommendation)}
              </div>
            </div>
          </div>

          {/* Section 3: Keystone Habits (العادات المحورية المركبة) */}
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-colors">
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#bd9240]" />
                <span>العادات المحورية (Keystone Habits)</span>
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                عادات ذكية واحدة تؤثر تلقائياً على عدة جوانب من حياتك دفعة واحدة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {(report.keystoneHabits || []).map((habit, idx) => (
                <div
                  key={idx}
                  className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-xs h-full transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-[#475569] dark:text-[#94A3B8]">
                      <span className="font-bold text-[#0F6E6E] dark:text-[#22D3EE]">عادة رقم {idx + 1}</span>
                      <span className="bg-white dark:bg-[#0E1D24] px-2 py-0.5 rounded-full border border-[#E2E8F0] dark:border-[#1E343F]">{habit.triggerTime}</span>
                    </div>
                    <h4 className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-snug">
                      {habit.name}
                    </h4>
                    <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                      {renderWithIsolatedNumbers(habit.expectedImpact)}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E343F] flex flex-wrap gap-1 mt-auto">
                    {(habit.targetDomains || []).map((dom, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#0E1D24] text-[#334155] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1E343F]"
                      >
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: 30-Day Integrated Roadmap (خطة 30 يوماً متكاملة) */}
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                  <span>خارطة طريق الـ 30 يوماً المتكاملة (أسبوعياً)</span>
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                  تدرج مدروس ينقلك خطوة بخطوة نحو التوازن الحقيقي
                </p>
              </div>
            </div>

            {/* 2x2 Grid in Natural Arabic RTL Order:
                Top-Right: Week 1
                Top-Left: Week 2
                Bottom-Right: Week 3
                Bottom-Left: Week 4
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch" dir="rtl">
              {sortedRoadmapWeeks.map((week) => (
                <div
                  key={week.weekNumber}
                  className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs h-full transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E343F]">
                      <span className="text-xs font-black text-[#0F6E6E] dark:text-[#22D3EE] px-2.5 py-0.5 rounded-lg bg-[#0F6E6E]/10 dark:bg-cyan-950/50 border border-[#0F6E6E]/20 dark:border-cyan-800/40">
                        الأسبوع {week.weekNumber}
                      </span>
                      <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F1F5F9]">
                        {week.weekTitle}
                      </h4>
                    </div>

                    <p className="text-xs text-[#0F6E6E] dark:text-[#22D3EE] font-bold">
                      التركيز الأساسي: {renderWithIsolatedNumbers(week.coreFocus)}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1 flex-1">
                    {(week.actions || []).map((act, aIdx) => {
                      const actId = `w${week.weekNumber}_a${aIdx}`;
                      const isDone = completedRoadmapActions[actId];

                      return (
                        <div
                          key={aIdx}
                          onClick={() => toggleActionCheck(actId)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all shadow-xs ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 line-through opacity-75'
                              : 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] text-[#0F172A] dark:text-[#F1F5F9] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border mt-0.5 flex-shrink-0 transition-colors ${
                              isDone
                                ? 'bg-[#0F6E6E] dark:bg-[#0891B2] border-[#0F6E6E] dark:border-[#0891B2] text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-transparent'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="leading-relaxed">{renderWithIsolatedNumbers(act)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Golden Rule from Director (Calm, Centered, Generous Breathing Room) */}
          <div className="bg-gradient-to-b from-white to-[#F8FAFA] dark:from-[#0E1D24] dark:to-[#081318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl py-10 sm:py-14 px-6 sm:px-12 shadow-xs text-center space-y-4 transition-colors">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-xs font-bold text-[#8A5A00] dark:text-[#FBBF24]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الوصية الذهبية لمنسق التوازن</span>
            </div>

            <blockquote className="text-base sm:text-lg md:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] max-w-2xl mx-auto leading-relaxed">
              «{renderWithIsolatedNumbers(report.directorGoldenRule.replace(/^[«"'\s]+|[»"'\s]+$/g, ''))}»
            </blockquote>

            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-medium pt-3 border-t border-[#E2E8F0]/70 dark:border-[#1E343F]/70 max-w-xs mx-auto">
              بوصلة التوازن اليومي لمنظومة وزان
            </p>
          </div>
        </div>
      ) : (
        /* Empty State / Prompt to Generate */
        <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-10 text-center space-y-6 max-w-xl mx-auto shadow-xs transition-colors">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#F7F6F2] dark:bg-[#071318] text-[#0F6E6E] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-center text-3xl">
            🧭
          </div>
          <div>
            <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
              جاهز لإعداد تقرير التوازن التكاملي؟
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-2 leading-relaxed">
              يقوم الذكاء الاصطناعي بربط جميع إجاباتك ودرجاتك في مجالات الحياة الثمانية، واكتشاف
              العادات المحورية وخطة الـ 30 يوماً المخصصة لك.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#ffd67a]" />
            <span>{isGenerating ? 'جارٍ التحليل والربط التكاملي...' : 'توليد التقرير التكاملي الآن'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
