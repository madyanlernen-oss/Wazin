import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  MessageSquare,
  ClipboardEdit,
  ArrowLeft,
  ChevronRight,
  Plus,
  Compass,
  CheckCircle,
  Play,
  HelpCircle,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { RadarChart } from '../components/RadarChart';
import { YearlyAndWeeklyAnalytics } from '../components/YearlyAndWeeklyAnalytics';
import { AdvisorConfig, LifeAreaId, UserProfile } from '../types/lifeBalance';
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
    <div className="min-h-[calc(100vh-4.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8 bg-[#FAF7F2]">
      {/* Welcome & Overall Balance Banner */}
      <div className="relative overflow-hidden bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#1b605b]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#bd9240]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF7F2] border border-[#ded7c8] text-xs font-bold text-[#1b605b]">
              <span>{isBrandNewUser ? 'حساب جديد' : 'لوحة التحكم'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b605b]"></span>
              <span className="text-[#1b605b] font-extrabold">{getDiagnosisLabel()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#1d2e2b]">
              مرحباً بك، {userProfile?.name || 'صديقنا'} 👋
            </h1>

            <p className="text-xs sm:text-sm text-[#536561] max-w-2xl leading-relaxed">
              {isBrandNewUser
                ? 'أنت في بداية رحلتك مع وازن. لم تقم بأي تقييم حتى الآن. انقر على الزر لبدء جولة التقييم مع المستشارين ورسم عجلة حياتك الخاصة.'
                : 'هنا تجتمع أبعاد حياتك الثمانية بنظام وازن. انقر على أي مجال في عجلة الحياة لاستعراض بطاقته أو المتابعة في التقييم.'}
            </p>
          </div>

          {/* Action Trigger Box */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-4 flex items-center gap-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#1b605b]/20 flex items-center justify-center shadow-xs">
                <span className="text-2xl font-black text-[#1b605b]">
                  {isBrandNewUser ? '0/8' : averageBalanceScore}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#7a8c88] block font-semibold">
                  {isBrandNewUser ? 'إنجاز التقييم' : 'مؤشر التوازن العام'}
                </span>
                <span className="text-xs font-bold text-[#1b605b]">
                  {isBrandNewUser ? 'بانتظار البدء' : `${balancePercentage}% اكتمال المنظومة`}
                </span>
              </div>
            </div>

            {isBrandNewUser ? (
              <button
                onClick={onStartEvaluation}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#1b605b] hover:bg-[#16504c] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1b605b]/20 hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>ابدأ رحلة تقييم مجالات حياتك (0/8)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNavigateToDirectorSummary}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#1b605b] hover:bg-[#16504c] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#1b605b]/20 hover:shadow-lg transition-all hover:scale-[1.02] group"
              >
                <Sparkles className="w-4 h-4 text-[#ffd67a]" />
                <span>تقرير المنسق العام التكاملي</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* New user step highlight */}
        {isBrandNewUser && (
          <div className="mt-6 pt-5 border-t border-[#f0eae0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#FAF7F2] p-4 rounded-2xl border border-[#ded7c8]">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#1b605b] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="text-[#1d2e2b] font-bold">
                الخطوة الأولى: قم بزيارة كل مستشار لتقييم جانبه والإجابة عن أسئلته النوعية.
              </span>
            </div>
            <button
              onClick={onStartEvaluation}
              className="text-xs font-bold text-[#1b605b] hover:underline flex items-center gap-1 self-start sm:self-center"
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
        <div className="lg:col-span-7 bg-white border border-[#eae3d5] rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-black text-[#1d2e2b] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1b605b]" />
                <span>عجلة الحياة التفاعلية (Life Wheel)</span>
              </h2>
              <p className="text-xs text-[#536561]">
                {isBrandNewUser
                  ? 'العجلة تبدأ الآن فارغة وستمتلئ تلقائياً مع تقييم كل جانب من الجوانب الثمانية'
                  : 'انقر على أي زاوية لاستعراض تفاصيل الجانب أو الانتقال لاستشارة المستشار'}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#1b605b] border border-[#ded7c8]">
              {completedCount}/8 مكتمل
            </span>
          </div>

          <RadarChart
            scores={scores}
            onSelectArea={(areaId) => setSelectedAreaId(areaId)}
            selectedAreaId={selectedAreaId}
            size={440}
          />
        </div>

        {/* Selected Area Deep Preview Box */}
        <div className="lg:col-span-5 bg-white border border-[#eae3d5] rounded-3xl p-6 shadow-xs space-y-5">
          {(() => {
            const activeArea = ADVISORS_LIST.find((a) => a.id === selectedAreaId) || ADVISORS_LIST[0];
            const isCompleted = completedAdvisors.includes(activeArea.id);
            const areaScore = scores[activeArea.id] || 0;
            const areaInsights = isCompleted ? extractInsightsFromAnswers(activeArea, areaScore, answers) : null;
            const areaGoals = goals[activeArea.id] || [];

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#f0eae0]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5"
                      style={{ backgroundColor: `${activeArea.themeColor}15` }}
                    >
                      {activeArea.avatarSvg}
                    </div>
                    <div>
                      <h3 className="font-black text-[#1d2e2b] text-base">{activeArea.title}</h3>
                      <p className="text-xs font-semibold" style={{ color: activeArea.themeColor }}>
                        {activeArea.name} ({activeArea.badge})
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span
                      className="text-2xl font-black"
                      style={{ color: activeArea.themeColor }}
                    >
                      {isCompleted ? areaScore.toFixed(1) : '--'}
                    </span>
                    <span className="text-xs text-[#7a8c88]"> / 10</span>
                  </div>
                </div>

                {/* State: Not yet evaluated */}
                {!isCompleted ? (
                  <div className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-5 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ded7c8] flex items-center justify-center mx-auto text-[#1b605b]">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1d2e2b]">لم يتم تقييم هذا الجانب بعد</h4>
                      <p className="text-[11px] text-[#536561] mt-1">
                        أجب عن الأسئلة الخاصة بـ {activeArea.name} لاكتشاف نقاط قوتك وحساب درجتك
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                      className="py-2.5 px-5 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>بدء تقييم {activeArea.title}</span>
                    </button>
                  </div>
                ) : (
                  /* Strengths & Challenges */
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        نقاط القوة المستخلصة:
                      </span>
                      <ul className="space-y-1 text-xs text-[#2c3d39]">
                        {(areaInsights?.strengths || []).map((str, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 mt-0.5">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        التحديات ونقاط الضعف:
                      </span>
                      <ul className="space-y-1 text-xs text-[#2c3d39]">
                        {(areaInsights?.challenges || []).map((ch, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>{ch}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Goals */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1d2e2b] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#1b605b]" />
                      أهداف هذا الجانب ({areaGoals.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddGoalFor(showAddGoalFor === activeArea.id ? null : activeArea.id)}
                      className="text-[11px] font-bold text-[#1b605b] hover:text-[#16504c] flex items-center gap-1"
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
                        className="flex-1 bg-white border border-[#ded7c8] rounded-xl px-3 py-1.5 text-xs text-[#1d2e2b] placeholder-[#8a9995] focus:outline-none focus:border-[#1b605b]"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGoalSubmit(activeArea.id)}
                        className="px-3 py-1.5 bg-[#1b605b] hover:bg-[#16504c] text-white rounded-xl text-xs font-bold shadow-xs"
                      >
                        حفظ
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {areaGoals.length === 0 ? (
                      <p className="text-[11px] text-[#7a8c88] italic">لا توجد أهداف مضافة بعد لهذا الجانب.</p>
                    ) : (
                      areaGoals.map((goal, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#eae3d5] text-xs text-[#2c3d39]"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-[#1b605b] mt-0.5 flex-shrink-0" />
                          <span>{goal}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#f0eae0] flex gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(activeArea.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all hover:opacity-90"
                    style={{ backgroundColor: activeArea.themeColor }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>استشارة {activeArea.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(activeArea.id)}
                    className="py-2.5 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#f3ede1] text-[#2c3d39] border border-[#ded7c8] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ClipboardEdit className="w-4 h-4 text-[#1b605b]" />
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
            <h2 className="text-xl font-black text-[#1d2e2b]">بطاقات مجالات الحياة الثمانية</h2>
            <p className="text-xs text-[#536561]">
              استعراض مفصل لكل مجال مع درجاته ومواطن قوته وأهدافه المعتمدة
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
                className="bg-white border border-[#eae3d5] hover:border-[#ded7c8] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden"
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
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-black/5"
                        style={{ backgroundColor: `${advisor.themeColor}15` }}
                      >
                        {advisor.avatarSvg}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#1d2e2b]">{advisor.title}</h3>
                        <p className="text-[11px] font-semibold" style={{ color: advisor.themeColor }}>
                          {advisor.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xl font-black" style={{ color: advisor.themeColor }}>
                        {isCompleted ? score.toFixed(1) : '--'}
                      </span>
                      <span className="text-[10px] text-[#7a8c88]"> /10</span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full h-1.5 bg-[#FAF7F2] rounded-full mt-3 overflow-hidden border border-[#eae3d5]">
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
                <div className="space-y-3 text-[11px] flex-1">
                  {!isCompleted ? (
                    <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#eae3d5] text-[#536561] text-center space-y-1">
                      <span className="font-bold text-[#1d2e2b] block">بانتظار تقييمك</span>
                      <p className="text-[10px] text-[#7a8c88]">لم تجب عن أسئلة هذا البُعد بعد</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-bold text-emerald-700 block mb-0.5">
                          أبرز القوة:
                        </span>
                        <p className="text-[#536561] line-clamp-2">
                          {areaInsights?.strengths?.[0] || 'وعي جيد بطبيعة هذا الجانب'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-amber-800 block mb-0.5">
                          التحدي الأبرز:
                        </span>
                        <p className="text-[#536561] line-clamp-2">
                          {areaInsights?.challenges?.[0] || 'تثبيت خطة أسبوعية واضحة'}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Goals Count Pill */}
                  <div className="pt-1">
                    <span className="text-[#7a8c88] block mb-1">
                      الأهداف المعتمدة ({areaGoals.length}):
                    </span>
                    {areaGoals.length === 0 ? (
                      <span className="text-[10px] text-[#8a9995] italic">لا توجد أهداف بعد</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {areaGoals.slice(0, 2).map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#FAF7F2] text-[#2c3d39] text-[10px] border border-[#ded7c8] line-clamp-1 block max-w-full"
                            title={g}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#f0eae0] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAdvisorChat(advisor.id)}
                    className="flex-1 py-2 px-3 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-90"
                    style={{ backgroundColor: advisor.themeColor }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>استشارة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditAdvisorEvaluation(advisor.id)}
                    className="py-2 px-3 rounded-xl bg-[#FAF7F2] hover:bg-[#f3ede1] text-[#536561] border border-[#ded7c8] text-[11px] font-semibold flex items-center justify-center transition-all"
                    title={isCompleted ? 'تعديل الإجابات' : 'بدء التقييم'}
                  >
                    <ClipboardEdit className="w-3.5 h-3.5 text-[#1b605b]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly and Weekly Longitudinal Analytics Component */}
      <YearlyAndWeeklyAnalytics />
    </div>
  );
};
