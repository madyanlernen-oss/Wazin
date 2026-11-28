import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Copy,
  Printer,
  Check,
  Zap,
  Layers,
  Calendar,
  Grid,
  Plus,
  Compass,
  Clock,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import {
  DirectorSummaryReport,
  EisenhowerQuadrant,
  LifeAreaId,
  UserProfile,
} from '../types/lifeBalance';
import { isolateNumbersInText, isolateNumbersForPlainText } from '../components/FormattedChatMessage';
import {
  reconcileDirectorReportWithScores,
  formatDirectorReportForArabicPdf,
  getDomainArabicName,
} from '../utils/arabicDomainLabels';
import { loadChatHistoryFromStorage, WAZAN_CHAT_HISTORY_KEY } from '../utils/storage';
import { generateEvidenceGroundedDirectorReport } from '../utils/directorEvidenceSynthesizer';
import { mapDomainNameToAreaId } from '../utils/eisenhowerAgent';
import { addGoalToThirtyDayPlanStorage } from '../utils/thirtyDayPlanGenerator';

interface DirectorSummaryScreenProps {
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  report: DirectorSummaryReport | null;
  onSaveReport: (report: DirectorSummaryReport) => void;
  onBackToDashboard: () => void;
  onNavigateToThirtyDayPlan?: () => void;
  onAddEisenhowerGoal?: (
    title: string,
    advisorName: string,
    areaId: LifeAreaId,
    quadrant?: EisenhowerQuadrant
  ) => void;
  onAddThirtyDayPlanGoal?: (title: string, areaId: LifeAreaId) => any;
  theme?: 'light' | 'dark';
  embedded?: boolean;
}

function readLocalStationContext(): {
  conversationHistories: Record<string, any[]>;
  stationInsights: Record<string, any>;
} {
  let conversationHistories: Record<string, any[]> = {};
  let stationInsights: Record<string, any> = {};
  try {
    conversationHistories = loadChatHistoryFromStorage(WAZAN_CHAT_HISTORY_KEY) || {};
  } catch {
    conversationHistories = {};
  }
  try {
    const raw = localStorage.getItem('wazan_eval_insights');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        stationInsights = parsed;
      }
    }
  } catch {
    stationInsights = {};
  }
  return { conversationHistories, stationInsights };
}

function resolveQuadrantEnum(labelOrCode?: string): EisenhowerQuadrant {
  const s = (labelOrCode || '').toUpperCase();
  if (s.includes('Q1') || s.includes('عاجل ومهم')) return 'q1_urgent_important';
  if (s.includes('Q3') || s.includes('تقليص') || s.includes('تفويض')) {
    return 'q3_urgent_not_important';
  }
  return 'q2_important_not_urgent';
}

export const DirectorSummaryScreen: React.FC<DirectorSummaryScreenProps> = ({
  userProfile,
  scores,
  answers,
  goals,
  report,
  onSaveReport,
  onBackToDashboard,
  onNavigateToThirtyDayPlan,
  onAddEisenhowerGoal,
  onAddThirtyDayPlanGoal,
  theme: _theme = 'light',
  embedded = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promotedEisenhower, setPromotedEisenhower] = useState<Record<string, boolean>>({});
  const [promotedPlan, setPromotedPlan] = useState<Record<string, boolean>>({});

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);

    const { conversationHistories, stationInsights } = readLocalStationContext();

    // Build rich per-domain advisor summaries including actual goals, insights, and user statements
    const advisorSummaries: Record<string, any> = {};
    ADVISORS_LIST.forEach((adv) => {
      const sc = Number(scores[adv.id] || 0);
      const msgs = (conversationHistories[adv.id] || [])
        .filter((m: any) => (m?.sender || m?.role) === 'user' && !m?.ignoredForTurnCount)
        .map((m: any) => String(m?.text || m?.content || '').trim())
        .filter(Boolean);
      const ins = stationInsights[adv.id] || {};
      if (sc > 0 || (goals[adv.id] && goals[adv.id].length > 0) || msgs.length > 0) {
        advisorSummaries[adv.title] = {
          title: adv.title,
          score: sc,
          goals: goals[adv.id] || [],
          userMessages: msgs,
          strengths: ins.strengths || [],
          challenges: ins.challenges || [],
          goldenRecommendation: ins.goldenRecommendation || '',
        };
      }
    });

    try {
      const res = await fetch('/api/gemini/director-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          scores,
          answers,
          goals,
          advisorSummaries,
          conversationHistories,
          stationInsights,
          focusArea: userProfile?.currentFocus,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل توليد التقرير التكاملي من خادم الذكاء الاصطناعي');
      }

      const data = await res.json();
      const groundedBaseline = generateEvidenceGroundedDirectorReport({
        userProfile,
        scores,
        answers,
        goals,
        conversationHistories,
        stationInsights,
        advisorSummaries,
        focusArea: userProfile?.currentFocus,
      });

      const generatedReport: DirectorSummaryReport = reconcileDirectorReportWithScores(
        {
          ...groundedBaseline,
          ...data,
          domainBreakdown:
            Array.isArray(data.domainBreakdown) && data.domainBreakdown.length >= 8
              ? data.domainBreakdown
              : groundedBaseline.domainBreakdown,
          readyToPromoteQueue:
            Array.isArray(data.readyToPromoteQueue) && data.readyToPromoteQueue.length >= 4
              ? data.readyToPromoteQueue
              : groundedBaseline.readyToPromoteQueue,
          generatedAt: new Date().toISOString(),
        },
        scores
      );

      onSaveReport(generatedReport);
    } catch (err: any) {
      console.warn('Director summary API unreachable, generating evidence-grounded fallback report:', err);
      const fallbackReport = reconcileDirectorReportWithScores(
        generateEvidenceGroundedDirectorReport({
          userProfile,
          scores,
          answers,
          goals,
          conversationHistories,
          stationInsights,
          advisorSummaries,
          focusArea: userProfile?.currentFocus,
        }),
        scores
      );
      onSaveReport(fallbackReport);
    } finally {
      setIsGenerating(false);
    }
  };

  // Enrich older saved reports seamlessly with new grounded sections if missing
  const enrichedReport = useMemo(() => {
    if (!report) return null;
    if (
      Array.isArray(report.domainBreakdown) &&
      report.domainBreakdown.length >= 8 &&
      Array.isArray(report.readyToPromoteQueue) &&
      report.readyToPromoteQueue.length > 0 &&
      report.rootCauseChain
    ) {
      return report;
    }
    const { conversationHistories, stationInsights } = readLocalStationContext();
    const grounded = generateEvidenceGroundedDirectorReport({
      userProfile,
      scores,
      answers,
      goals,
      conversationHistories,
      stationInsights,
      focusArea: userProfile?.currentFocus,
    });
    return reconcileDirectorReportWithScores(
      {
        ...grounded,
        ...report,
        overallBalanceScore: report.overallBalanceScore ?? grounded.overallBalanceScore,
        rootCauseChain: report.rootCauseChain || grounded.rootCauseChain,
        domainBreakdown:
          Array.isArray(report.domainBreakdown) && report.domainBreakdown.length >= 8
            ? report.domainBreakdown
            : grounded.domainBreakdown,
        readyToPromoteQueue:
          Array.isArray(report.readyToPromoteQueue) && report.readyToPromoteQueue.length > 0
            ? report.readyToPromoteQueue
            : grounded.readyToPromoteQueue,
      },
      scores
    );
  }, [report, userProfile, scores, answers, goals]);

  const pdfReportPayload = enrichedReport
    ? formatDirectorReportForArabicPdf(enrichedReport, scores, userProfile?.name)
    : null;
  const localizedReport = (pdfReportPayload?.report || null) as DirectorSummaryReport | null;

  const computedOverallScore = useMemo(() => {
    if (localizedReport?.overallBalanceScore && localizedReport.overallBalanceScore > 0) {
      return Number(localizedReport.overallBalanceScore).toFixed(1);
    }
    const vals = Object.values(scores || {})
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length === 0) return '0.0';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [localizedReport, scores]);

  const handlePromoteToEisenhower = (
    key: string,
    title: string,
    domainTitle: string,
    quadrantStr?: string
  ) => {
    const areaId = mapDomainNameToAreaId(domainTitle);
    const quadrant = resolveQuadrantEnum(quadrantStr);
    if (onAddEisenhowerGoal) {
      onAddEisenhowerGoal(title, 'المنسق العام للتوازن الذكي', areaId, quadrant);
    } else {
      try {
        const raw = localStorage.getItem('wazan_eisenhower_goals');
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list) && !list.some((g: any) => g.title === title)) {
          const updated = [
            {
              id: `eisen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title,
              quadrant,
              timeframe: 'weekly',
              areaId,
              completed: false,
              source: 'advisor',
              advisorName: 'المنسق العام للتوازن الذكي',
              createdAt: new Date().toISOString(),
            },
            ...list,
          ];
          localStorage.setItem('wazan_eisenhower_goals', JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
    }
    setPromotedEisenhower((prev) => ({ ...prev, [key]: true }));
  };

  const handlePromoteToThirtyDayPlan = (key: string, title: string, domainTitle: string) => {
    const areaId = mapDomainNameToAreaId(domainTitle);
    if (onAddThirtyDayPlanGoal) {
      onAddThirtyDayPlanGoal(title, areaId);
    } else {
      addGoalToThirtyDayPlanStorage(title, areaId, scores);
    }
    setPromotedPlan((prev) => ({ ...prev, [key]: true }));
  };

  const handleCopy = () => {
    if (!localizedReport) return;
    const breakdownText = (localizedReport.domainBreakdown || [])
      .map(
        (d) =>
          `- ${d.domainTitle} (${Number(d.score || 0).toFixed(1)}/10):\n  الواقع: ${d.groundedReality}\n  الأثر المتقاطع: ${d.crossDomainImpact}\n  المهمة المقترحة (${d.eisenhowerQuadrant} • الأسبوع ${d.planWeek} • ${d.planFrequency}): ${d.actionableTask}`
      )
      .join('\n');

    const queueText = (localizedReport.readyToPromoteQueue || [])
      .map((q) => `- [${q.quadrant} | الأسبوع ${q.weekNumber} - ${q.frequency}] (${q.domainTitle}): ${q.title}`)
      .join('\n');

    const text = `
=== تقرير المنسق العام للتوازن الذكي - منصة وزان ===
المستفيد: ${userProfile?.name || ''}
المعدل العام: ${computedOverallScore}/10 (${localizedReport.balanceIndexLabel})

1. التشخيص الاستراتيجي الشامل:
${localizedReport.overallDiagnosis}
سلسلة السبب والنتيجة:
${localizedReport.rootCauseChain || ''}

2. التحليل الدقيق للجوانب الثمانية:
${breakdownText}

3. أقوى نقطة ارتكاز وعنق الزجاجة الأبرز:
- نقطة الارتكاز (${localizedReport.strongestSynergy.title}): ${localizedReport.strongestSynergy.description}
- عنق الزجاجة (${localizedReport.criticalBottleneck.title}): ${localizedReport.criticalBottleneck.recommendation}

4. العادات المحورية ذات الأثر المضاعف:
${(localizedReport.keystoneHabits || [])
  .map((h, i) => `${i + 1}. ${h.name} (${h.triggerTime}): ${h.exactStep || h.expectedImpact}`)
  .join('\n')}

5. قائمة المهام الجاهزة للترقية:
${queueText}

الوصية الذهبية:
"${localizedReport.directorGoldenRule}"
    `.trim();

    navigator.clipboard?.writeText(isolateNumbersForPlainText(text)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const q1Tasks = (localizedReport?.readyToPromoteQueue || []).filter((t) => t.quadrant === 'Q1');
  const q2Tasks = (localizedReport?.readyToPromoteQueue || []).filter((t) => t.quadrant !== 'Q1');

  return (
    <div
      className={`space-y-8 text-[#0F172A] dark:text-[#F1F5F9] transition-colors duration-300 ${
        embedded
          ? 'max-w-5xl mx-auto w-full'
          : 'min-h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 bg-[#F7F6F2] dark:bg-[#071318]'
      }`}
    >
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E343F]">
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
            المنسق العام للتوازن الذكي
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {localizedReport && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-slate-50 dark:hover:bg-[#162734] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="نسخ التقرير الشامل"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                )}
                <span>{copied ? 'تم النسخ' : 'نسخ التقرير'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-slate-50 dark:hover:bg-[#162734] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="طباعة أو تصدير التقرير بصيغة PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>تصدير PDF / طباعة</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4.5 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-black flex items-center gap-2 shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{localizedReport ? 'تحديث التحليل من سجل المحطات' : 'توليد المخطط الاستراتيجي الآن'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Hero Orchestrator Card */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0F6E6E]/5 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-center text-3xl shadow-xs flex-shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  المنسق العام للتوازن الذكي
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F6E6E]/10 dark:bg-cyan-950/50 text-[#0F6E6E] dark:text-[#22D3EE] border border-[#0F6E6E]/20 dark:border-cyan-800/40">
                  تركيب مبني على حواراتك الفعلية
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 max-w-xl leading-relaxed">
                تحليل استراتيجي عميق يربط إجاباتك وتوصياتك عبر المحطات الثمانية في سلسلة أسباب واضحة، ويحوّلها إلى مهام قابلة للترقية مباشرة لخطة الـ 30 يوماً ومصفوفة أيزنهاور.
              </p>
            </div>
          </div>

          {localizedReport && (
            <div className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 text-right self-start md:self-auto shadow-xs transition-colors min-w-[200px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-semibold">
                  معدل التوازن العام
                </span>
                <span dir="ltr" className="text-sm font-black text-[#0F6E6E] dark:text-[#22D3EE] font-mono">
                  {computedOverallScore} / 10
                </span>
              </div>
              <span className="text-xs font-black text-[#0F172A] dark:text-white block mt-1">
                {isolateNumbersInText(localizedReport.balanceIndexLabel)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Report Body */}
      {localizedReport ? (
        <div className="space-y-8" dir="rtl">
          {/* Printable Arabic PDF Summary Header */}
          {pdfReportPayload && (
            <div className="hidden print:block border-b-2 border-slate-300 pb-4 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#0F172A]">
                  منصة وزان — مخطط التحوّل الاستراتيجي للمنسق العام
                </h2>
                <span className="text-xs font-bold text-slate-600">
                  التاريخ: {pdfReportPayload.generatedDateAr}
                </span>
              </div>
              <p className="text-xs font-bold text-[#0F6E6E]">
                المستفيد: {pdfReportPayload.userName} • المعدل العام: {computedOverallScore}/10 • {localizedReport.balanceIndexLabel}
              </p>
            </div>
          )}

          {/* Section 1: Executive Strategic Diagnosis + Root-Cause Chain */}
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                <span>1. التشخيص الاستراتيجي الشامل وسلسلة السبب والنتيجة</span>
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 dark:bg-cyan-950/60 text-[#0F6E6E] dark:text-cyan-300 border border-teal-200 dark:border-cyan-800/60">
                المرحلة: {isolateNumbersInText(localizedReport.balanceIndexLabel)}
              </span>
            </div>

            <div className="text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-relaxed whitespace-pre-wrap bg-[#F7F6F2] dark:bg-[#071318] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F]">
              {isolateNumbersInText(localizedReport.overallDiagnosis)}
            </div>

            {localizedReport.rootCauseChain && (
              <div className="p-5 rounded-2xl bg-gradient-to-l from-amber-50/70 via-white to-white dark:from-amber-950/25 dark:via-[#0B1820] dark:to-[#0B1820] border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300">
                  <Compass className="w-4 h-4" />
                  <span>سلسلة التأثير المترابطة بين الجوانب الثمانية (Root-Cause Chain)</span>
                </div>
                <p className="text-xs sm:text-sm text-[#1E293B] dark:text-slate-200 leading-relaxed">
                  {isolateNumbersInText(localizedReport.rootCauseChain)}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Deep 8-Domain Breakdown */}
          {Array.isArray(localizedReport.domainBreakdown) && localizedReport.domainBreakdown.length > 0 && (
            <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-colors">
              <div>
                <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                  <span>2. التحليل الدقيق للجوانب الثمانية من واقع جلساتك</span>
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  قراءة تفصيلية لما صرّحت به في كل محطة مع أثره المتقاطع ومهمة عملية قابلة للترقية الفورية
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localizedReport.domainBreakdown.map((item, idx) => {
                  const key = `dom_${idx}`;
                  const isAddedBoth = Boolean(promotedEisenhower[key] && promotedPlan[key]);
                  const sc = Number(item.score || 0);
                  const scoreBadgeClass =
                    sc >= 7.5
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : sc >= 5.5
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] p-5 flex flex-col justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-[#0F172A] dark:text-white">
                            {getDomainArabicName(item.domainTitle)}
                          </h3>
                          <span
                            dir="ltr"
                            className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full border ${scoreBadgeClass}`}
                          >
                            {sc > 0 ? `${sc.toFixed(1)}/10` : 'غير مقيّم'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs leading-relaxed">
                          <div>
                            <span className="font-bold text-[#0F6E6E] dark:text-cyan-400">الواقع الفعلي: </span>
                            <span className="text-[#334155] dark:text-slate-300">
                              {isolateNumbersInText(item.groundedReality)}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">الأثر المتقاطع: </span>
                            <span className="text-[#475569] dark:text-slate-400">
                              {isolateNumbersInText(item.crossDomainImpact)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E343F] space-y-2.5">
                        <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-relaxed">
                          <span className="text-[#0F6E6E] dark:text-cyan-300">المهمة المقترحة: </span>
                          {isolateNumbersInText(item.actionableTask)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#0E1D24] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {isolateNumbersInText(item.eisenhowerQuadrant)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#0E1D24] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            خطة 30 يوماً: الأسبوع {item.planWeek} • {item.planFrequency}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handlePromoteToEisenhower(
                              key,
                              item.actionableTask,
                              item.domainTitle,
                              item.eisenhowerQuadrant
                            );
                            handlePromoteToThirtyDayPlan(key, item.actionableTask, item.domainTitle);
                          }}
                          disabled={isAddedBoth}
                          className={`w-full py-2 px-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isAddedBoth
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-white dark:bg-[#0E1D24] hover:bg-[#0F6E6E] hover:text-white dark:hover:bg-cyan-600 text-[#0F6E6E] dark:text-cyan-300 border border-[#0F6E6E]/30 dark:border-cyan-700/60'
                          }`}
                        >
                          {isAddedBoth ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>تمت الترقية للخطة والمصفوفة</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>ترقية للخطة (30 يوماً) ومصفوفة أيزنهاور</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Core Leverage & Primary Bottleneck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="bg-white dark:bg-[#0E1D24] border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 h-full transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>3. أقوى نقطة ارتكاز (Core Leverage)</span>
                </div>
                <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {isolateNumbersInText(localizedReport.strongestSynergy.title)}
                </h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {isolateNumbersInText(localizedReport.strongestSynergy.description)}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 mt-auto">
                {(localizedReport.strongestSynergy?.domainsInvolved || []).map((dom, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    {getDomainArabicName(dom)}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0E1D24] border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 h-full transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>عنق الزجاجة الأبرز وبروتوكول الإنقاذ</span>
                </div>
                <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {isolateNumbersInText(localizedReport.criticalBottleneck.title)}
                </h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                  {isolateNumbersInText(localizedReport.criticalBottleneck.impact)}
                </p>
              </div>
              <div className="bg-[#F7F6F2] dark:bg-[#071318] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#0F172A] dark:text-[#F1F5F9] mt-auto">
                <span className="font-bold text-amber-800 dark:text-[#FBBF24] block mb-0.5">
                  بروتوكول الإنقاذ المخصص:
                </span>
                {isolateNumbersInText(localizedReport.criticalBottleneck.recommendation)}
              </div>
            </div>
          </div>

          {/* Section 4: 3-4 Keystone Habits */}
          <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-colors">
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#bd9240]" />
                <span>4. العادات المحورية ذات الأثر المضاعف</span>
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                عادات عملية مصممة على جدولة يومك لرفع عدة جوانب معاً من واقع ما ذكرته في جلساتك
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {(localizedReport.keystoneHabits || []).map((habit, idx) => (
                <div
                  key={idx}
                  className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-xs h-full transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
                      <span className="font-black text-[#0F6E6E] dark:text-[#22D3EE]">
                        عادة محورية <span dir="ltr" className="font-mono [unicode-bidi:isolate]">{idx + 1}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-white dark:bg-[#0E1D24] px-2.5 py-0.5 rounded-full border border-[#E2E8F0] dark:border-[#1E343F] font-bold">
                        <Clock className="w-3 h-3 text-[#0F6E6E] dark:text-cyan-400" />
                        {isolateNumbersInText(habit.triggerTime)}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-snug">
                      {isolateNumbersInText(habit.name)}
                    </h4>
                    {habit.exactStep && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-slate-200/80 dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-100 leading-relaxed">
                        <span className="font-bold text-[#0F6E6E] dark:text-cyan-400">الخطوة الدقيقة: </span>
                        {isolateNumbersInText(habit.exactStep)}
                      </div>
                    )}
                    <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                      {isolateNumbersInText(habit.expectedImpact)}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E343F] flex flex-wrap items-center gap-1.5 mt-auto">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      الجوانب المرفوعة:
                    </span>
                    {(habit.targetDomains || []).map((dom, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-[#0E1D24] text-[#334155] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1E343F]"
                      >
                        {getDomainArabicName(dom)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Ready-to-Promote Action Queue (6-8 tasks grouped by Q1 & Q2) */}
          {Array.isArray(localizedReport.readyToPromoteQueue) &&
            localizedReport.readyToPromoteQueue.length > 0 && (
              <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                      <Grid className="w-5 h-5 text-[#0F6E6E] dark:text-[#22D3EE]" />
                      <span>5. قائمة المهام الجاهزة للترقية (خطة 30 يوماً ومصفوفة أيزنهاور)</span>
                    </h2>
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                      أهم المهام ذات الأثر الأعلى المستخلصة من جوانبك الثمانية، مصنفة إلى Q1 و Q2 وجاهزة للإضافة الفورية
                    </p>
                  </div>
                </div>

                {/* Group Q1 */}
                {q1Tasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-black text-rose-700 dark:text-rose-300">
                      <span>المربع الأول (Q1): عاجل ومهم — أولوية المعالجة الفورية</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {q1Tasks.map((task) => {
                        const tKey = `queue_${task.id}`;
                        const addedEis = Boolean(promotedEisenhower[tKey]);
                        const addedPl = Boolean(promotedPlan[tKey]);
                        return (
                          <div
                            key={task.id}
                            className="p-4 rounded-2xl bg-[#F7F6F2] dark:bg-[#071318] border border-rose-200/70 dark:border-rose-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                                <span className="text-[#0F6E6E] dark:text-cyan-300">
                                  {getDomainArabicName(task.domainTitle)}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  {isolateNumbersInText(task.milestone)}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                                {isolateNumbersInText(task.title)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteToEisenhower(tKey, task.title, task.domainTitle, 'Q1')
                                }
                                disabled={addedEis}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  addedEis
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-white dark:bg-[#0E1D24] border border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E] text-[#0F172A] dark:text-slate-200'
                                }`}
                              >
                                {addedEis ? <Check className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
                                <span>{addedEis ? 'أُضيفت لـ Q1' : '+ مصفوفة أيزنهاور'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteToThirtyDayPlan(tKey, task.title, task.domainTitle)
                                }
                                disabled={addedPl}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  addedPl
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-[#0F6E6E] hover:bg-[#0B5454] dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white'
                                }`}
                              >
                                {addedPl ? <Check className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                <span>{addedPl ? 'أُضيفت للخطة' : '+ خطة 30 يوماً'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group Q2 */}
                {q2Tasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-cyan-950/50 border border-teal-200 dark:border-cyan-800/60 text-xs font-black text-[#0F6E6E] dark:text-cyan-300">
                      <span>المربع الثاني (Q2): مهم وغير عاجل — بناء الاستدامة والتوازن</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {q2Tasks.map((task) => {
                        const tKey = `queue_${task.id}`;
                        const addedEis = Boolean(promotedEisenhower[tKey]);
                        const addedPl = Boolean(promotedPlan[tKey]);
                        return (
                          <div
                            key={task.id}
                            className="p-4 rounded-2xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                                <span className="text-[#0F6E6E] dark:text-cyan-300">
                                  {getDomainArabicName(task.domainTitle)}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  {isolateNumbersInText(task.milestone)}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                                {isolateNumbersInText(task.title)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteToEisenhower(tKey, task.title, task.domainTitle, 'Q2')
                                }
                                disabled={addedEis}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  addedEis
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-white dark:bg-[#0E1D24] border border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E] text-[#0F172A] dark:text-slate-200'
                                }`}
                              >
                                {addedEis ? <Check className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
                                <span>{addedEis ? 'أُضيفت لـ Q2' : '+ مصفوفة أيزنهاور'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteToThirtyDayPlan(tKey, task.title, task.domainTitle)
                                }
                                disabled={addedPl}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                  addedPl
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-[#0F6E6E] hover:bg-[#0B5454] dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white'
                                }`}
                              >
                                {addedPl ? <Check className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                <span>{addedPl ? 'أُضيفت للخطة' : '+ خطة 30 يوماً'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Quick Access to the dedicated 30-Day Smart Plan */}
          {onNavigateToThirtyDayPlan && (
            <div className="bg-gradient-to-r from-[#0F6E6E]/10 via-teal-500/5 to-transparent dark:from-cyan-950/40 dark:via-teal-950/20 dark:to-transparent border border-[#0F6E6E]/20 dark:border-cyan-800/40 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#0F6E6E]/15 dark:bg-cyan-500/20 text-[#0F6E6E] dark:text-cyan-300 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                  📅
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    خطتك الذكية لـ 30 يوماً
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                    تابع تنفيذ المهام التي قمت بترقيتها يوماً بيوم داخل خطتك الشهرية التفاعلية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToThirtyDayPlan}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0B5454] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-black transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span>الانتقال لخطتي الذكية</span>
                <span className="text-sm leading-none">&larr;</span>
              </button>
            </div>
          )}

          {/* Golden Rule from Director */}
          <div className="bg-gradient-to-b from-white to-[#F8FAFA] dark:from-[#0E1D24] dark:to-[#081318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl py-10 sm:py-12 px-6 sm:px-12 shadow-xs text-center space-y-4 transition-colors">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-xs font-bold text-[#8A5A00] dark:text-[#FBBF24]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الوصية الذهبية لمنسق التوازن</span>
            </div>

            <blockquote className="text-base sm:text-lg md:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] max-w-2xl mx-auto leading-relaxed">
              «{isolateNumbersInText(localizedReport.directorGoldenRule.replace(/^[«"'\s]+|[»"'\s]+$/g, ''))}»
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
              جاهز لإعداد مخطط التحوّل الاستراتيجي؟
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-2 leading-relaxed">
              سيقوم المنسق العام بتحليل محادثاتك الفعلية وإجاباتك وتوصياتك عبر المحطات الثمانية، وصياغة مخطط عملي مخصص لمدة 30 يوماً جاهز للترقية.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#ffd67a]" />
            <span>{isGenerating ? 'جارٍ التحليل والتركيب الاستراتيجي...' : 'توليد المخطط الاستراتيجي الآن'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
