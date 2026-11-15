import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Copy,
  Printer,
  ShieldCheck,
  Check,
  Award,
  Zap,
  Target,
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
}

export const DirectorSummaryScreen: React.FC<DirectorSummaryScreenProps> = ({
  userProfile,
  scores,
  answers,
  goals,
  report,
  onSaveReport,
  onBackToDashboard,
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
=== تقرير المنسق العام للتوازن الذكي - منصة تدبير ===
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

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 space-y-8 bg-[#FAF7F2]">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#eae3d5]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="px-3 py-2 rounded-xl bg-white border border-[#ded7c8] hover:bg-[#FAF7F2] text-[#536561] hover:text-[#1b605b] transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </button>
          <div className="h-4 w-px bg-[#ded7c8]" />
          <span className="text-xs font-extrabold text-[#1b605b] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#bd9240]" />
            تقرير المنسق العام للتوازن الذكي (منصة تدبير)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#ded7c8] hover:bg-[#FAF7F2] text-[#536561] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                title="نسخ ملخص التقرير"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#1b605b]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ التقرير'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#ded7c8] hover:bg-[#FAF7F2] text-[#536561] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            </>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{report ? 'إعادة التحليل التكاملي' : 'توليد التقرير بالذكاء الاصطناعي'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Hero Director Card */}
      <div className="relative overflow-hidden bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1b605b]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FAF7F2] border border-[#ded7c8] flex items-center justify-center text-3xl shadow-xs flex-shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#1d2e2b]">المنسق العام للتوازن الذكي</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1b605b]/10 text-[#1b605b] border border-[#1b605b]/20">
                  تحليل تكاملي شامل
                </span>
              </div>
              <p className="text-xs text-[#536561] mt-1 max-w-xl leading-relaxed">
                رؤية بانورامية تفحص تقاطع مجالات الحياة الثمانية معاً، وتكشف كيف يؤثر جانب على آخر،
                لتخرج بخطة 30 يوماً ذكية وعادات محورية تحدث أثراً مضاعفاً.
              </p>
            </div>
          </div>

          {report && (
            <div className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-4 text-left self-start md:self-auto shadow-xs">
              <span className="text-[10px] text-[#7a8c88] block font-semibold">تشخيص الحالة العامة</span>
              <span className="text-sm font-black text-[#1b605b]">
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
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-[#1d2e2b] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1b605b]" />
              <span>التشخيص الاستراتيجي العام لمنظومة حياتك</span>
            </h2>
            <div className="text-sm text-[#2c3d39] leading-relaxed whitespace-pre-wrap bg-[#FAF7F2] p-5 rounded-2xl border border-[#eae3d5]">
              {report.overallDiagnosis}
            </div>
          </div>

          {/* Section 2: Cross-Domain Intersections (Synergy + Critical Bottleneck) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strongest Synergy */}
            <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>أقوى نقطة تناغم وترابط إيجابي</span>
              </div>
              <h3 className="text-base font-black text-[#1d2e2b]">
                {report.strongestSynergy.title}
              </h3>
              <p className="text-xs text-[#536561] leading-relaxed">
                {report.strongestSynergy.description}
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                {(report.strongestSynergy?.domainsInvolved || []).map((dom, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {/* Critical Bottleneck */}
            <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>عنق الزجاجة الأبرز (يحتاج معالجة فورية)</span>
              </div>
              <h3 className="text-base font-black text-[#1d2e2b]">
                {report.criticalBottleneck.title}
              </h3>
              <p className="text-xs text-[#536561] leading-relaxed">
                {report.criticalBottleneck.impact}
              </p>
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#eae3d5] text-xs text-[#2c3d39]">
                <span className="font-bold text-amber-800 block mb-0.5">الحل العاجل:</span>
                {report.criticalBottleneck.recommendation}
              </div>
            </div>
          </div>

          {/* Section 3: Keystone Habits (العادات المحورية المركبة) */}
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-black text-[#1d2e2b] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#bd9240]" />
                <span>العادات المحورية (Keystone Habits)</span>
              </h2>
              <p className="text-xs text-[#536561] mt-1">
                عادات ذكية واحدة تؤثر تلقائياً على عدة جوانب من حياتك دفعة واحدة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(report.keystoneHabits || []).map((habit, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-[#7a8c88]">
                      <span className="font-bold text-[#1b605b]">عادة رقم {idx + 1}</span>
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#ded7c8]">{habit.triggerTime}</span>
                    </div>
                    <h4 className="font-black text-sm text-[#1d2e2b] leading-snug">
                      {habit.name}
                    </h4>
                    <p className="text-xs text-[#536561] leading-relaxed">
                      {habit.expectedImpact}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#ded7c8] flex flex-wrap gap-1">
                    {(habit.targetDomains || []).map((dom, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-[#2c3d39] border border-[#ded7c8]"
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
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1d2e2b] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1b605b]" />
                  <span>خارطة طريق الـ 30 يوماً المتكاملة (أسبوعياً)</span>
                </h2>
                <p className="text-xs text-[#536561] mt-0.5">
                  تدرج مدروس ينقلك خطوة بخطوة نحو التوازن الحقيقي
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(report.thirtyDayRoadmap || []).map((week) => (
                <div
                  key={week.weekNumber}
                  className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#ded7c8]">
                    <span className="text-xs font-black text-[#1b605b]">
                      الأسبوع {week.weekNumber}
                    </span>
                    <h4 className="font-extrabold text-xs text-[#1d2e2b]">
                      {week.weekTitle}
                    </h4>
                  </div>

                  <p className="text-xs text-[#1b605b] font-bold">
                    التركيز الأساسي: {week.coreFocus}
                  </p>

                  <div className="space-y-2 pt-1">
                    {(week.actions || []).map((act, aIdx) => {
                      const actId = `w${week.weekNumber}_a${aIdx}`;
                      const isDone = completedRoadmapActions[actId];

                      return (
                        <div
                          key={aIdx}
                          onClick={() => toggleActionCheck(actId)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all shadow-xs ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 line-through opacity-75'
                              : 'bg-white border-[#ded7c8] text-[#2c3d39] hover:border-[#1b605b]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border mt-0.5 flex-shrink-0 ${
                              isDone
                                ? 'bg-[#1b605b] border-[#1b605b] text-white'
                                : 'border-[#ded7c8] bg-transparent'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="leading-relaxed">{act}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Golden Rule from Director */}
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-3">
            <span className="text-xs font-bold text-[#bd9240] block">
              الوصية الذهبية لمنسق التوازن
            </span>
            <blockquote className="text-base sm:text-lg font-black text-[#1d2e2b] italic max-w-2xl mx-auto leading-relaxed">
              "{report.directorGoldenRule}"
            </blockquote>
          </div>
        </div>
      ) : (
        /* Empty State / Prompt to Generate */
        <div className="bg-white border border-[#eae3d5] rounded-3xl p-10 text-center space-y-6 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FAF7F2] text-[#1b605b] border border-[#ded7c8] flex items-center justify-center text-3xl">
            🧭
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1d2e2b]">
              جاهز لإعداد تقرير التوازن التكاملي؟
            </h3>
            <p className="text-xs text-[#536561] mt-2 leading-relaxed">
              يقوم الذكاء الاصطناعي بربط جميع إجاباتك ودرجاتك في مجالات الحياة الثمانية، واكتشاف
              العادات المحورية وخطة الـ 30 يوماً المخصصة لك.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#ffd67a]" />
            <span>{isGenerating ? 'جارٍ التحليل والربط التكاملي...' : 'توليد التقرير التكاملي الآن'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
