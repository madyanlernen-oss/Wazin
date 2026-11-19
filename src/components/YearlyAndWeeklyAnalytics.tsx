import React, { useState, useRef } from 'react';
import {
  Calendar,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  CalendarDays,
  Zap,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LIFE_DOMAINS } from '../data/lifeDomains';
import { ONE_YEAR_MONTHLY_HISTORY, RECENT_WEEKS_ANALYSIS } from '../data/demoAnalytics';
import { LifeAreaId, MonthData, WeekData } from '../types/lifeBalance';

export interface YearlyAndWeeklyAnalyticsProps {
  monthlyHistory?: MonthData[];
  weeklyReports?: WeekData[];
}

interface ComputedMonthItem {
  raw: MonthData;
  formattedMonthYear: string;
  formattedMonthOnly: string;
  isCurrent: boolean;
  computedAverageScore: number;
  topArea: string;
  bottleneckArea: string;
}

/**
 * Format week range from ISO start date (YYYY-MM-DD) or fallback string
 */
function formatWeekRange(startDateStr?: string, fallbackRange?: string): string {
  if (!startDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
    return (fallbackRange || '').replace(/\s*\(الأسبوع الحالي\)\s*/g, '');
  }
  try {
    const start = new Date(`${startDateStr}T00:00:00Z`);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const dayFmt = new Intl.DateTimeFormat('ar-u-ca-gregory', { day: 'numeric' });
    const monthFmt = new Intl.DateTimeFormat('ar-u-ca-gregory', { month: 'long' });
    const yearFmt = new Intl.DateTimeFormat('ar-u-ca-gregory', { year: 'numeric' });

    const startDay = dayFmt.format(start);
    const endDay = dayFmt.format(end);
    const startMonth = monthFmt.format(start);
    const endMonth = monthFmt.format(end);
    const year = yearFmt.format(end);

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  } catch {
    return (fallbackRange || '').replace(/\s*\(الأسبوع الحالي\)\s*/g, '');
  }
}

/**
 * Dynamically computes month metrics from raw scores rather than trusting stored fields
 */
function computeMonthMetrics(month: MonthData, isCurrent: boolean): ComputedMonthItem {
  const scoresObj = month.scores || ({} as Record<LifeAreaId, number>);
  const entries = Object.entries(scoresObj) as [LifeAreaId, number][];

  let avg = month.averageScore || 0;
  let topName = month.topArea || '—';
  let botName = month.bottleneckArea || '—';

  if (entries.length > 0) {
    const sum = entries.reduce((acc, [, val]) => acc + val, 0);
    avg = Number((sum / entries.length).toFixed(1));

    let maxVal = -Infinity;
    let minVal = Infinity;
    let topId: LifeAreaId = entries[0][0];
    let botId: LifeAreaId = entries[0][0];

    for (const [id, val] of entries) {
      if (val > maxVal) {
        maxVal = val;
        topId = id;
      }
      if (val < minVal) {
        minVal = val;
        botId = id;
      }
    }

    topName = LIFE_DOMAINS.find((d) => d.id === topId)?.name || month.topArea;
    botName = LIFE_DOMAINS.find((d) => d.id === botId)?.name || month.bottleneckArea;
  }

  let formattedMonthYear = month.monthName || month.month;
  let formattedMonthOnly = month.monthName?.split(' ')[0] || month.month;

  if (/^\d{4}-\d{2}/.test(month.month)) {
    try {
      const d = new Date(`${month.month.slice(0, 7)}-01T00:00:00Z`);
      formattedMonthYear = new Intl.DateTimeFormat('ar-u-ca-gregory', {
        month: 'long',
        year: 'numeric',
      }).format(d);
      formattedMonthOnly = new Intl.DateTimeFormat('ar-u-ca-gregory', {
        month: 'long',
      }).format(d);
    } catch {
      // Keep fallbacks
    }
  }

  return {
    raw: month,
    formattedMonthYear,
    formattedMonthOnly,
    isCurrent,
    computedAverageScore: avg,
    topArea: topName,
    bottleneckArea: botName,
  };
}

/**
 * Compute annual stability label from standard deviation of monthly scores
 */
function computeStabilityLabel(monthlyScores: number[]): string {
  if (monthlyScores.length < 2) return 'ممتاز';
  const mean = monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length;
  const variance = monthlyScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyScores.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 1.0) return 'ممتاز';
  if (stdDev < 1.6) return 'جيد جداً';
  if (stdDev < 2.2) return 'متوسط';
  return 'متفاوت';
}

export const YearlyAndWeeklyAnalytics: React.FC<YearlyAndWeeklyAnalyticsProps> = ({
  monthlyHistory,
  weeklyReports,
}) => {
  const [selectedView, setSelectedView] = useState<'yearly' | 'weekly'>('yearly');
  const tabListRef = useRef<HTMLDivElement>(null);

  // Check if falling back to demo data
  const isDemo = (!monthlyHistory || monthlyHistory.length === 0) && (!weeklyReports || weeklyReports.length === 0);

  const rawMonthlyData = monthlyHistory && monthlyHistory.length > 0 ? monthlyHistory : ONE_YEAR_MONTHLY_HISTORY;
  const rawWeeklyData = weeklyReports && weeklyReports.length > 0 ? weeklyReports : RECENT_WEEKS_ANALYSIS;

  // Derive month items with calculated metrics
  const computedMonths: ComputedMonthItem[] = rawMonthlyData.map((m, idx) =>
    computeMonthMetrics(m, idx === rawMonthlyData.length - 1)
  );

  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(computedMonths.length - 1);
  const safeActiveIdx = Math.max(0, Math.min(activeMonthIdx, computedMonths.length - 1));
  const activeMonth = computedMonths[safeActiveIdx];

  // Derived Summary Numbers
  const initialMonth = computedMonths[0];
  const currentMonth = computedMonths[computedMonths.length - 1];
  const initialScore = initialMonth?.computedAverageScore || 0;
  const currentScore = currentMonth?.computedAverageScore || 0;

  const growthVal = initialScore > 0 ? ((currentScore - initialScore) / initialScore) * 100 : 0;
  const growthFormatted = `${growthVal >= 0 ? '+' : ''}${growthVal.toFixed(1)}%`;

  const totalTasks = rawMonthlyData.reduce((sum, m) => sum + (m.completedTasks || 0), 0);

  const stabilityLabel = computeStabilityLabel(computedMonths.map((m) => m.computedAverageScore));

  // Handle accessible keyboard arrow navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedView((prev) => {
        const next = prev === 'yearly' ? 'weekly' : 'yearly';
        setTimeout(() => {
          const nextBtnId = next === 'yearly' ? 'tab-yearly' : 'tab-weekly';
          document.getElementById(nextBtnId)?.focus();
        }, 0);
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedView('yearly');
      setTimeout(() => {
        document.getElementById('tab-yearly')?.focus();
      }, 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedView('weekly');
      setTimeout(() => {
        document.getElementById('tab-weekly')?.focus();
      }, 0);
    }
  };

  return (
    <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-500/10 text-[#0B6E72] dark:text-cyan-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              سجل التحليلات التراكمية (سنة كاملة)
            </div>

            {isDemo && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-400/30">
                بيانات تجريبية
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white transition-colors">
            تحليلات التوازن الأسبوعية والشهرية
          </h2>
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5 transition-colors">
            تتبع نضج أبعاد حياتك وتطور المؤشرات عبر 12 شهراً وآخر الأسابيع التراكمية لحسابك.
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="نوع التحليلات"
          onKeyDown={handleTabKeyDown}
          className="inline-flex p-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl self-start sm:self-center"
        >
          <button
            id="tab-yearly"
            role="tab"
            type="button"
            aria-selected={selectedView === 'yearly'}
            aria-controls="panel-yearly"
            tabIndex={selectedView === 'yearly' ? 0 : -1}
            onClick={() => setSelectedView('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold motion-safe:transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              selectedView === 'yearly'
                ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>السجل السنوي (12 شهراً)</span>
          </button>
          <button
            id="tab-weekly"
            role="tab"
            type="button"
            aria-selected={selectedView === 'weekly'}
            aria-controls="panel-weekly"
            tabIndex={selectedView === 'weekly' ? 0 : -1}
            onClick={() => setSelectedView('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold motion-safe:transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              selectedView === 'weekly'
                ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white shadow-xs'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            <span>التقارير الأسبوعية</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 12-MONTH YEARLY TIMELINE */}
      {selectedView === 'yearly' && (
        <div
          id="panel-yearly"
          role="tabpanel"
          aria-labelledby="tab-yearly"
          tabIndex={0}
          className="space-y-6 motion-safe:animate-fadeIn focus-visible:outline-none"
        >
          {/* Quick Metrics Bar for 1 Year Progress */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-[#475569] dark:text-slate-400 block mb-1">
                النتيجة الابتدائية ({initialMonth?.formattedMonthYear || '—'})
              </span>
              <span className="text-2xl font-black text-[#475569] dark:text-slate-400 tabular-nums block" dir="ltr">
                <span dir="ltr" className="[unicode-bidi:isolate]">{initialScore.toFixed(1)}</span> / 10
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-[#475569] dark:text-slate-400 block mb-1">
                النتيجة الحالية ({currentMonth?.formattedMonthYear || '—'})
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums block" dir="ltr">
                <span dir="ltr" className="[unicode-bidi:isolate]">{currentScore.toFixed(1)}</span> / 10
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-[#475569] dark:text-slate-400 block mb-1">نسبة النمو السنوي</span>
              <span className="text-2xl font-black text-[#0B6E72] dark:text-cyan-400 flex items-center gap-1 tabular-nums" dir="ltr">
                <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span dir="ltr" className="[unicode-bidi:isolate]">{growthFormatted}</span>
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-[#475569] dark:text-slate-400 block mb-1">المهام المنجزة خلال السنة</span>
              <span className="text-2xl font-black text-amber-600 dark:text-[#FBBF24]">
                <span dir="ltr" className="[unicode-bidi:isolate]">{totalTasks}</span> مهمة
              </span>
            </div>
          </div>

          {/* Monthly Progression Chart (SVG / HTML Bars) */}
          <div className="bg-slate-50 dark:bg-[#0B161C] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-white">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400" aria-hidden="true" />
                مخطط نمو معدل التوازن عبر شهور السنة (اختر شهراً للتفاصيل):
              </span>
              <span className="text-xs text-[#475569] dark:text-slate-400">
                معدل الاستقرار السنوي: {stabilityLabel}
              </span>
            </div>

            <div
              role="group"
              aria-label="مخطط نمو معدل التوازن الشهري"
              className="flex sm:grid sm:grid-cols-12 gap-2 pt-4 items-end h-44 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 scrollbar-none"
            >
              {computedMonths.map((item, idx) => {
                const isSelected = idx === safeActiveIdx;
                // Full 0-10 scale clamping
                const heightPercent = Math.max(0, Math.min(100, (item.computedAverageScore / 10) * 100));

                return (
                  <button
                    key={item.raw.month || idx}
                    type="button"
                    onClick={() => setActiveMonthIdx(idx)}
                    aria-pressed={isSelected}
                    aria-label={`${item.formattedMonthYear}، المعدل ${item.computedAverageScore.toFixed(1)} من 10`}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group motion-safe:transition-all cursor-pointer flex-shrink-0 min-w-[44px] sm:min-w-0 sm:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B161C] rounded-xl p-0.5"
                  >
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        isSelected
                          ? 'text-[#0B6E72] dark:text-cyan-400'
                          : 'text-[#475569] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
                      }`}
                    >
                      <span dir="ltr" className="[unicode-bidi:isolate]">{item.computedAverageScore.toFixed(1)}</span>
                    </span>
                    <div className="w-full bg-slate-200/70 dark:bg-slate-800/80 rounded-t-xl overflow-hidden h-28 flex items-end">
                      <div
                        className={`w-full rounded-t-xl motion-safe:transition-all duration-300 ${
                          isSelected
                            ? 'bg-[#0B6E72] dark:bg-cyan-500 shadow-md shadow-[#0B6E72]/30 dark:shadow-cyan-500/30'
                            : 'bg-amber-500/50 dark:bg-amber-500/40 group-hover:bg-amber-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold truncate w-full text-center ${
                        isSelected
                          ? 'text-[#0B6E72] dark:text-cyan-400 font-black'
                          : 'text-[#475569] dark:text-slate-400'
                      }`}
                    >
                      {item.formattedMonthOnly}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Month Deep-Dive Card */}
          {activeMonth && (
            <div className="bg-white dark:bg-[#112028] border-2 border-[#0B6E72]/30 dark:border-cyan-500/30 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B6E72] dark:bg-[#0E7490] text-white font-black text-lg flex items-center justify-center shadow-xs tabular-nums">
                    <span dir="ltr" className="[unicode-bidi:isolate]">{activeMonth.computedAverageScore.toFixed(1)}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                      {activeMonth.formattedMonthYear} {activeMonth.isCurrent ? '(الشهر الحالي)' : ''}
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400">{activeMonth.raw.highlight}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                    الأعلى: {activeMonth.topArea}
                  </span>
                  <span className="text-amber-800 dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    عنق الزجاجة: {activeMonth.bottleneckArea}
                  </span>
                </div>
              </div>

              {/* 8 Areas Scores in Selected Month */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {ADVISORS_LIST.map((advisor) => {
                  const sc = activeMonth.raw.scores?.[advisor.id] || 0;
                  const domainMeta = LIFE_DOMAINS.find((d) => d.id === advisor.id);
                  const domainShortName = domainMeta?.name || advisor.title;
                  const strongColor = domainMeta?.strongColor || '#0B6E72';

                  return (
                    <div
                      key={advisor.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">{advisor.avatarSvg}</span>
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                          {domainShortName}
                        </span>
                      </div>
                      <span
                        className="text-xs font-black tabular-nums"
                        dir="ltr"
                        style={
                          {
                            color: strongColor,
                            '--dark-domain-theme': advisor.themeColor,
                          } as React.CSSProperties
                        }
                      >
                        <span className="dark:text-[var(--dark-domain-theme)]">
                          <span dir="ltr" className="[unicode-bidi:isolate]">{sc.toFixed(1)}</span> / 10
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DETAILED WEEKLY REPORTS */}
      {selectedView === 'weekly' && (
        <div
          id="panel-weekly"
          role="tabpanel"
          aria-labelledby="tab-weekly"
          tabIndex={0}
          className="space-y-4 motion-safe:animate-fadeIn focus-visible:outline-none"
        >
          {rawWeeklyData.map((wk, idx) => {
            const isCurrentWeek = idx === rawWeeklyData.length - 1;
            const formattedRange = formatWeekRange(wk.startDate, wk.dateRange);

            return (
              <div
                key={wk.weekNumber}
                className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B6E72] dark:bg-[#0E7490] text-white flex items-center justify-center font-black text-xs tabular-nums">
                      <span dir="ltr" className="[unicode-bidi:isolate]">{wk.weekNumber}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#0F172A] dark:text-white">
                        الأسبوع <span dir="ltr" className="[unicode-bidi:isolate]">{wk.weekNumber}</span>{' '}
                        ({formattedRange}) {isCurrentWeek ? '(الأسبوع الحالي)' : ''}
                      </h4>
                      <blockquote className="text-xs text-[#475569] dark:text-slate-300 italic mt-1 leading-relaxed">
                        «{wk.reflection}»
                      </blockquote>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-start">
                      <span className="text-xs text-[#475569] dark:text-slate-400 block">معدل التوازن</span>
                      <span className="text-base font-black text-[#0B6E72] dark:text-cyan-400 tabular-nums" dir="ltr">
                        <span dir="ltr" className="[unicode-bidi:isolate]">{wk.balanceScore.toFixed(1)}</span> / 10
                      </span>
                    </div>
                    <div className="text-start ps-3 border-s border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-[#475569] dark:text-slate-400 block">انضباط العادات</span>
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        <span dir="ltr" className="[unicode-bidi:isolate]">{wk.weeklyHabitCompletion}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wins and Challenges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white dark:bg-[#112028] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      انتصارات الأسبوع الصغيرة:
                    </span>
                    <ul className="space-y-1.5 text-[#334155] dark:text-slate-300">
                      {(wk.wins || []).map((win, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" aria-hidden="true" />
                          <span className="leading-relaxed">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-[#112028] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-amber-800 dark:text-[#FBBF24] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600 dark:text-[#FBBF24]" aria-hidden="true" />
                      تحديات وتوصية التعديل:
                    </span>
                    <ul className="space-y-1.5 text-[#334155] dark:text-slate-300">
                      {(wk.challenges || []).map((ch, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 flex-shrink-0" aria-hidden="true" />
                          <span className="leading-relaxed">{ch}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
