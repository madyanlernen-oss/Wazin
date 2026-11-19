import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  MessageSquare,
  ClipboardEdit,
  ArrowLeft,
  Plus,
  Compass,
  CheckCircle,
  Play,
  HelpCircle,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { RadarChart } from '../components/RadarChart';
import { YearlyAndWeeklyAnalytics } from '../components/YearlyAndWeeklyAnalytics';
import { LifeAreaId, UserProfile } from '../types/lifeBalance';
import { extractInsightsFromAnswers } from '../utils/storage';

interface DashboardScreenProps {
  userProfile: UserProfile | null;
  scores: Record<LifeAreaId, number>;
  answers: Record<string, any>;
  goals: Record<LifeAreaId, string[]>;
  completedAdvisors?: LifeAreaId[];
  onSelectAdvisorChat: (advisorId: LifeAreaId) => void;
  onEditAdvisorEvaluation: (advisorId: LifeAreaId) => void;
  onNavigateToDirectorSummary: () => void;
  onAddGoal: (advisorId: LifeAreaId, goal: string) => void;
  onStartEvaluation?: () => void;
  theme?: 'light' | 'dark';
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userProfile,
  scores,
  answers,
  goals,
  completedAdvisors = [],
  onSelectAdvisorChat,
  onEditAdvisorEvaluation,
  onNavigateToDirectorSummary,
  onAddGoal,
  onStartEvaluation,
  theme = 'light',
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<LifeAreaId | null>('spiritual');
  const [newGoalInput, setNewGoalInput] = useState<{ [key: string]: string }>({});
  const [showAddGoalFor, setShowAddGoalFor] = useState<LifeAreaId | null>(null);

  const completedCount = completedAdvisors.length;
  const isBrandNewUser = completedCount === 0;

  // Compute Overall Balance Score for evaluated areas only
  const evaluatedScores = completedAdvisors.map((id) => scores[id] || 0);
  const totalScoreSum = evaluatedScores.reduce((sum, sc) => sum + sc, 0);
  const averageBalanceScore = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '0.0';
  const balancePercentage = Math.round((completedCount / 8) * 100);

  // Diagnosis label
  const getDiagnosisLabel = () => {
    if (isBrandNewUser) return 'مستخدم جديد - بانتظار بدء التقييم 🌱';
    const avg = parseFloat(averageBalanceScore);
    if (avg >= 8.0) return 'توازن استثنائي متقدم 🌟';
    if (avg >= 6.5) return 'توازن واعد ومستقر 🚀';
    if (avg >= 5.0) return 'توازن في مرحلة التأسيس 💡';
    return 'يحتاج إلى تدخل وإعادة تنظيم ⚠️';
  };

  const handleAddGoalSubmit = (areaId: LifeAreaId) => {
    const text = (newGoalInput[areaId] || '').trim();
    if (!text) return;
    onAddGoal(areaId, text);
    setNewGoalInput((prev) => ({ ...prev, [areaId]: '' }));
    setShowAddGoalFor(null);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8 bg-[#F4F8F7] dark:bg-[#071318] text-[#0F172A] dark:text-slate-100 transition-colors duration-300">
      {/* Welcome & Overall Balance Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#0B6E72]/5 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-[#0B6E72] dark:text-cyan-400">
              <span>{isBrandNewUser ? 'حساب جديد' : 'لوحة التحكم'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E72] dark:bg-cyan-400"></span>
              <span className="text-[#0B6E72] dark:text-cyan-300 font-extrabold">{getDiagnosisLabel()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white transition-colors">
              مرحباً بك، {userProfile?.name || 'صديقنا'} 👋
            </h1>

            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 max-w-2xl leading-relaxed transition-colors">
              {isBrandNewUser
                ? 'أنت في بداية رحلتك مع وازن. لم تقم بأي تقييم حتى الآن. انقر على الزر لبدء جولة التقييم مع المستشارين ورسم عجلة حياتك الخاصة.'
                : 'هنا تجتمع أبعاد حياتك الثمانية بنظام وازن. انقر على أي مجال في عجلة الحياة لاستعراض بطاقته أو المتابعة في التقييم.'}
            </p>
          </div>

          {/* Action Trigger Box */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#112028] border border-[#0B6E72]/20 dark:border-cyan-500/30 flex items-center justify-center shadow-xs">
                <span className="text-2xl font-black text-[#0B6E72] dark:text-cyan-300 tabular-nums" dir="ltr">
                  {isBrandNewUser ? '0/8' : averageBalanceScore}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-semibold">
                  {isBrandNewUser ? 'إنجاز التقييم' : 'مؤشر التوازن العام'}
                </span>
                <span className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400">
                  {isBrandNewUser ? (
                    'بانتظار البدء'
                  ) : (
                    <span>
                      <span dir="ltr" className="inline-block font-sans font-bold tabular-nums" style={{ unicodeBidi: 'isolate' }}>{balancePercentage}%</span> اكتمال المنظومة
                    </span>
                  )}
                </span>
              </div>
            </div>

            {isBrandNewUser ? (
              <button
                type="button"
                onClick={onStartEvaluation}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-black text-xs sm:text-sm shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-950/50 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  ابدأ رحلة تقييم مجالات حياتك (<span dir="ltr" style={{ unicodeBidi: 'isolate' }}>0/8</span>)
                </span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateToDirectorSummary}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-950/50 hover:shadow-lg transition-all hover:scale-[1.02] group cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ffd67a] dark:text-amber-300" />
                <span>تقرير المنسق العام التكاملي</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* New user step highlight */}
        {isBrandNewUser && (
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-[#0B161C] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B6E72] dark:bg-[#0E7490] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="text-[#0F172A] dark:text-white font-bold">
                الخطوة الأولى: قم بزيارة كل مستشار لتقييم جانبه والإجابة عن أسئلته النوعية.
              </span>
            </div>
            <button
              type="button"
              onClick={onStartEvaluation}
              className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline flex items-center gap-1 self-start sm:self-center cursor-pointer"
            >
              <span>انطلق للتقييم الآن</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Section: Interactive Radar Life Wheel + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Radar Chart Centerpiece */}
        <div className="lg:col-span-7 bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center transition-colors">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-white flex items-center gap-2 transition-colors">
                <Compass className="w-5 h-5 text-[#0B6E72] dark:text-cyan-400" />
                <span>عجلة الحياة التفاعلية (Life Wheel)</span>
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 transition-colors">
                {isBrandNewUser
                  ? 'العجلة تبدأ الآن فارغة وستمتلئ تلقائياً مع تقييم كل جانب من الجوانب الثمانية'
                  : 'انقر على أي زاوية لاستعراض تفاصيل الجانب أو الانتقال لاستشارة المستشار'}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-50 dark:bg-[#0B161C] text-[#0B6E72] dark:text-cyan-400 border border-slate-200/80 dark:border-slate-800">
              {completedCount}/8 مكتمل
            </span>
          </div>

          <RadarChart
            scores={scores}
            onSelectArea={(areaId) => setSelectedAreaId(areaId)}
            selectedAreaId={selectedAreaId}
            size={440}
            theme={theme}
          />
        </div>

        {/* Selected Area Deep Preview Box */}
        <div className="lg:col-span-5 bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5 transition-colors">
          {(() => {
            const activeArea = ADVISORS_LIST.find((a) => a.id === selectedAreaId) || ADVISORS_LIST[0];
            const isCompleted = completedAdvisors.includes(activeArea.id);
            const areaScore = scores[activeArea.id] || 0;
            const areaInsights = isCompleted ? extractInsightsFromAnswers(activeArea, areaScore, answers) : null;
            const areaGoals = goals[activeArea.id] || [];

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                      style={{ backgroundColor: `${activeArea.themeColor}15` }}
                    >
                      {activeArea.avatarSvg}
                    </div>
                    <div>
                      <h3 className="font-black text-[#0F172A] dark:text-white text-base transition-colors">
                        {activeArea.title}
                      </h3>
                      <p className="text-xs font-semibold" style={{ color: activeArea.themeColor }}>
                        {activeArea.name} ({activeArea.badge})
                      </p>
                    </div>
                  </div>

                  <div className="text-left" dir="ltr">
                    <span
                      className="text-2xl font-black tabular-nums"
                      style={{ color: activeArea.themeColor }}
                    >
                      {isCompleted ? areaScore.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-slate-400"> / 10</span>
                  </div>
                </div>

                {/* State: Not yet evaluated */}
                {!isCompleted ? (
                  <div className="bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-[#0B6E72] dark:text-cyan-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">لم يتم تقييم هذا الجانب بعد</h4>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
                        أجب عن الأسئلة الخاصة بـ {activeArea.name} لاكتشاف نقاط قوتك وحساب درجتك
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                      className="py-2.5 px-5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>بدء تقييم {activeArea.title}</span>
                    </button>
                  </div>
                ) : (
                  /* Strengths & Challenges */
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        نقاط القوة المستخلصة:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#334155] dark:text-slate-300">
                        {(areaInsights?.strengths || []).map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-amber-700 dark:text-[#FBBF24] flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-[#FBBF24]" />
                        التحديات ونقاط التطوير:
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#334155] dark:text-slate-300">
                        {(areaInsights?.challenges || []).map((ch, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{ch}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Goals */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
                      أهداف هذا الجانب ({areaGoals.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddGoalFor(showAddGoalFor === activeArea.id ? null : activeArea.id)}
                      className="text-[11px] font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة هدف</span>
                    </button>
                  </div>

                  {showAddGoalFor === activeArea.id && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newGoalInput[activeArea.id] || ''}
                        onChange={(e) =>
                          setNewGoalInput((prev) => ({ ...prev, [activeArea.id]: e.target.value }))
                        }
                        placeholder="اكتب هدفاً عملياً جديداً..."
                        className="flex-1 bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGoalSubmit(activeArea.id)}
                        className="px-3 py-1.5 bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        حفظ
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {areaGoals.length === 0 ? (
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 italic">لا توجد أهداف مضافة بعد لهذا الجانب.</p>
                    ) : (
                      areaGoals.map((goal, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-slate-50 dark:bg-[#0B161C] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-[#334155] dark:text-slate-300"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span>{goal}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(activeArea.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: activeArea.themeColor }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>استشارة {activeArea.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                    className="py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ClipboardEdit className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400" />
                    <span>{isCompleted ? 'تعديل الإجابات' : 'بدء التقييم'}</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 8 Area Cards Grid (Score, Strengths, Challenges, Goals) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0F172A] dark:text-white transition-colors">
              بطاقات مجالات الحياة الثمانية
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 transition-colors">
              استعراض مفصل لكل مجال مع درجاته ومواطن قوته وتحدياته وأهدافه المعتمدة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ADVISORS_LIST.map((advisor) => {
            const isCompleted = completedAdvisors.includes(advisor.id);
            const score = scores[advisor.id] || 0;
            const areaInsights = isCompleted ? extractInsightsFromAnswers(advisor, score, answers) : null;
            const areaGoals = goals[advisor.id] || [];

            return (
              <div
                key={advisor.id}
                className="bg-white dark:bg-[#112028] border border-slate-200/90 hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-cyan-800/50 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-all duration-300 h-full relative overflow-hidden group"
              >
                {/* Accent Top Line */}
                <div
                  className="absolute top-0 right-0 left-0 h-1.5"
                  style={{ backgroundColor: advisor.themeColor }}
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5 dark:border-white/10"
                        style={{ backgroundColor: `${advisor.themeColor}15` }}
                      >
                        {advisor.avatarSvg}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-white transition-colors">
                          {advisor.title}
                        </h3>
                        <p className="text-[11px] font-semibold" style={{ color: advisor.themeColor }}>
                          {advisor.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-left" dir="ltr">
                      <span className="text-xl font-black tabular-nums" style={{ color: advisor.themeColor }}>
                        {isCompleted ? score.toFixed(1) : '--'}
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400"> / 10</span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0B161C] rounded-full mt-3 overflow-hidden border border-slate-200/60 dark:border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: isCompleted ? `${(score / 10) * 100}%` : '0%',
                        backgroundColor: advisor.themeColor,
                      }}
                    />
                  </div>
                </div>

                {/* Strengths & Challenges OR Not Yet Evaluated Prompt */}
                <div className="space-y-3 text-[11px] flex-1 flex flex-col justify-between">
                  {!isCompleted ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B161C] border border-slate-200/80 dark:border-slate-800 text-[#64748B] dark:text-slate-400 text-center space-y-1">
                      <span className="font-bold text-[#0F172A] dark:text-white block">بانتظار تقييمك</span>
                      <p className="text-[10px] text-[#64748B] dark:text-slate-400">لم تجب عن أسئلة هذا البُعد بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                          نقاط القوة:
                        </span>
                        <p className="text-[#334155] dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {areaInsights?.strengths?.[0] || 'وعي جيد بطبيعة هذا الجانب'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-amber-700 dark:text-[#FBBF24] block mb-0.5">
                          التحديات:
                        </span>
                        <p className="text-[#334155] dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {areaInsights?.challenges?.[0] || 'تثبيت خطة أسبوعية واضحة'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Goals Count Pill */}
                  <div className="pt-1">
                    <span className="text-[#64748B] dark:text-slate-400 block mb-1">
                      الأهداف المعتمدة ({areaGoals.length}):
                    </span>
                    {areaGoals.length === 0 ? (
                      <span className="text-[10px] text-[#94a3b8] dark:text-slate-500 italic">لا توجد أهداف بعد</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {areaGoals.slice(0, 2).map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-[#0B161C] text-[#334155] dark:text-slate-300 text-[10px] border border-slate-200/80 dark:border-slate-800 line-clamp-1 block max-w-full"
                            title={g}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Aligned to Bottom Across Cards) */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(advisor.id)}
                    className="flex-1 py-2 px-3 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: advisor.themeColor }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>استشارة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(advisor.id)}
                    className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold flex items-center justify-center transition-all cursor-pointer"
                    title={isCompleted ? 'تعديل الإجابات' : 'بدء التقييم'}
                  >
                    <ClipboardEdit className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly and Weekly Longitudinal Analytics Component */}
      <YearlyAndWeeklyAnalytics theme={theme} />
    </div>
  );
};
