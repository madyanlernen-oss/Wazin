import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  SkipForward,
  Sparkles,
  ChevronRight,
  Award,
  Check,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { AdvisorConfig, LifeAreaId } from '../types/lifeBalance';
import { calculateScoreForAdvisor, extractInsightsFromAnswers } from '../utils/storage';

interface OnboardingScreenProps {
  initialAdvisorId?: LifeAreaId;
  answers: Record<string, any>;
  onSaveAnswer: (advisorId: LifeAreaId, questionId: string, value: any) => void;
  onFinishAdvisor: (advisorId: LifeAreaId, score: number) => void;
  onCompleteAll: () => void;
  completedAdvisors: LifeAreaId[];
  onNavigateToDashboard: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialAdvisorId = 'spiritual',
  answers,
  onSaveAnswer,
  onFinishAdvisor,
  onCompleteAll,
  completedAdvisors,
  onNavigateToDashboard,
}) => {
  const [currentAdvisorIndex, setCurrentAdvisorIndex] = useState(() => {
    const idx = ADVISORS_LIST.findIndex((a) => a.id === initialAdvisorId);
    return idx >= 0 ? idx : 0;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [autoSaveFeedback, setAutoSaveFeedback] = useState(false);

  const currentAdvisor: AdvisorConfig = ADVISORS_LIST[currentAdvisorIndex];
  const currentQuestion = currentAdvisor.questions[currentQuestionIndex];
  const answerKey = `${currentAdvisor.id}_${currentQuestion.id}`;
  const currentValue = answers[answerKey];

  // Temporary local state for current question value before confirming
  const [localValue, setLocalValue] = useState<any>(currentValue);

  // Sync localValue whenever question changes
  useEffect(() => {
    setLocalValue(answers[`${currentAdvisor.id}_${currentAdvisor.questions[currentQuestionIndex].id}`]);
  }, [currentAdvisorIndex, currentQuestionIndex, answers, currentAdvisor]);

  // Overall journey progress (8 advisors * 8 questions = 64 total questions)
  const totalCompletedQuestions = Object.keys(answers).length;
  const overallProgressPercent = Math.min(100, (totalCompletedQuestions / 64) * 100);

  // Current advisor question progress
  const advisorProgressPercent = ((currentQuestionIndex + 1) / 8) * 100;

  // Auto-save whenever localValue changes
  const handleSelectValue = (val: any) => {
    setLocalValue(val);
    onSaveAnswer(currentAdvisor.id, currentQuestion.id, val);

    // Show quick subtle auto-save toast
    setAutoSaveFeedback(true);
    setTimeout(() => setAutoSaveFeedback(false), 1200);
  };

  // Toggle for multi-select
  const handleToggleMultiSelect = (optionId: string) => {
    const currentList: string[] = Array.isArray(localValue) ? localValue : [];
    let updated: string[];
    if (currentList.includes(optionId)) {
      updated = currentList.filter((item) => item !== optionId);
    } else {
      updated = [...currentList, optionId];
    }
    handleSelectValue(updated);
  };

  // Navigate to Next Question or Next Advisor
  const handleNext = () => {
    if (localValue !== undefined) {
      onSaveAnswer(currentAdvisor.id, currentQuestion.id, localValue);
    }

    if (currentQuestionIndex < 7) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Completed all 8 questions for this advisor
      const calculatedScore = calculateScoreForAdvisor(currentAdvisor, {
        ...answers,
        [`${currentAdvisor.id}_${currentQuestion.id}`]: localValue,
      });

      onFinishAdvisor(currentAdvisor.id, calculatedScore);

      // Trigger Confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });

      setShowCelebration(true);
    }
  };

  // Navigate to Previous Question
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentAdvisorIndex > 0) {
      setCurrentAdvisorIndex((prev) => prev - 1);
      setCurrentQuestionIndex(7);
    }
  };

  // Skip question with default average
  const handleSkip = () => {
    let defaultValue: any = 5;
    if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      defaultValue = currentQuestion.options[0]?.id;
    } else if (currentQuestion.type === 'multi_select') {
      defaultValue = [];
    } else if (currentQuestion.type === 'open_text') {
      defaultValue = 'تم التخطي - سأعود لها لاحقاً';
    }

    handleSelectValue(defaultValue);
    handleNext();
  };

  // Proceed to next advisor after celebration modal
  const handleContinueAfterCelebration = () => {
    setShowCelebration(false);
    if (currentAdvisorIndex < ADVISORS_LIST.length - 1) {
      setCurrentAdvisorIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      // Completed all 8 advisors!
      onCompleteAll();
    }
  };

  // Current advisor computed score preview
  const currentAdvisorScore = calculateScoreForAdvisor(currentAdvisor, answers);
  const insights = extractInsightsFromAnswers(currentAdvisor, currentAdvisorScore, answers);

  return (
    <div className="min-h-[calc(100vh-4.5rem)] max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 bg-[#FAF7F2]">
      {/* Top Advisor Stepper Bar */}
      <div className="bg-white border border-[#eae3d5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#536561]">رحلة تقييم المجالات:</span>
            <span className="text-xs font-black text-[#1b605b]">
              {currentAdvisorIndex + 1} من 8
            </span>
          </div>
          <div className="text-[11px] font-semibold text-[#7a8c88]">
            الإنجاز الإجمالي: {Math.round(overallProgressPercent)}%
          </div>
        </div>

        {/* Advisor Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ADVISORS_LIST.map((advisor, index) => {
            const isCompleted = completedAdvisors.includes(advisor.id);
            const isCurrent = index === currentAdvisorIndex;

            return (
              <button
                key={advisor.id}
                onClick={() => {
                  setCurrentAdvisorIndex(index);
                  setCurrentQuestionIndex(0);
                  setShowCelebration(false);
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isCurrent
                    ? 'bg-[#1b605b] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#FAF7F2] text-[#536561] border-[#eae3d5] hover:text-[#1d2e2b]'
                }`}
                style={isCurrent ? { borderColor: '#1b605b' } : {}}
              >
                <span>{advisor.avatarSvg}</span>
                <span className="hidden sm:inline">{advisor.title.split(' ')[0]} {advisor.title.split(' ')[1] || ''}</span>
                {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Advisor Stage */}
      <div className="relative bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Advisor Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#f0eae0]">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border border-black/5 relative"
              style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
            >
              {currentAdvisor.avatarSvg}
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: currentAdvisor.themeColor }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#1d2e2b]">{currentAdvisor.name}</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: currentAdvisor.themeColor,
                    borderColor: `${currentAdvisor.themeColor}35`,
                    backgroundColor: `${currentAdvisor.themeColor}10`,
                  }}
                >
                  {currentAdvisor.badge}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#536561] mt-0.5">
                {currentAdvisor.role}
              </p>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {autoSaveFeedback ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                تم الحفظ تلقائياً
              </span>
            ) : (
              <span className="text-[11px] text-[#7a8c88] flex items-center gap-1">
                <Check className="w-3 h-3 text-[#7a8c88]" />
                حفظ مستمر محلي
              </span>
            )}
          </div>
        </div>

        {/* Advisor Tagline Quote */}
        <div className="my-4 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#eae3d5] text-xs italic text-[#536561] flex items-center gap-2">
          <span className="text-base select-none">💬</span>
          <span>"{currentAdvisor.tagline}"</span>
        </div>

        {/* Question Progress Bar */}
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-[#1d2e2b]">
              السؤال {currentQuestionIndex + 1} من 8
            </span>
            <span style={{ color: currentAdvisor.themeColor }}>
              {Math.round(advisorProgressPercent)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#eae3d5]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${advisorProgressPercent}%`,
                backgroundColor: currentAdvisor.themeColor,
              }}
            />
          </div>
        </div>

        {/* The Question Prompt */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xl sm:text-2xl font-black text-[#1d2e2b] leading-snug">
            {currentQuestion.title}
          </h3>
          {currentQuestion.description && (
            <p className="text-xs sm:text-sm text-[#536561] leading-relaxed">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Dynamic Question Type Input */}
        <div className="min-h-[200px] mb-8">
          {/* 1. Rating (1 - 10) */}
          {currentQuestion.type === 'rating' && (
            <div className="space-y-6">
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = localValue === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectValue(num)}
                      className={`h-14 sm:h-16 rounded-xl font-black text-base sm:text-lg flex flex-col items-center justify-center transition-all duration-200 border ${
                        isSelected
                          ? 'text-white shadow-md scale-105 border-white'
                          : 'bg-[#FAF7F2] text-[#1d2e2b] border-[#ded7c8] hover:border-[#bd9240] hover:bg-white'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: currentAdvisor.themeColor,
                              boxShadow: `0 4px 14px -2px ${currentAdvisor.themeColor}50`,
                            }
                          : {}
                      }
                    >
                      <span>{num}</span>
                      <span className="text-[9px] opacity-75 font-normal">
                        {num === 1 ? 'أدنى' : num === 10 ? 'أعلى' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rating Scale Labels */}
              {currentQuestion.ratingLabels && (
                <div className="flex items-center justify-between text-xs text-[#536561] px-1 pt-1 border-t border-[#f0eae0]">
                  <span className="text-rose-600 font-semibold">
                    1: {currentQuestion.ratingLabels.low}
                  </span>
                  {currentQuestion.ratingLabels.mid && (
                    <span className="text-amber-700 font-semibold hidden sm:inline">
                      5: {currentQuestion.ratingLabels.mid}
                    </span>
                  )}
                  <span className="text-emerald-700 font-semibold">
                    10: {currentQuestion.ratingLabels.high}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Multiple Choice */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = localValue === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectValue(option.id)}
                    className={`text-right p-4 rounded-2xl transition-all duration-200 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#FAF7F2] text-[#1d2e2b] shadow-xs'
                        : 'bg-white text-[#2c3d39] border-[#ded7c8] hover:border-[#bd9240] hover:bg-[#FAF7F2]'
                    }`}
                    style={isSelected ? { borderColor: currentAdvisor.themeColor } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-transparent text-white'
                            : 'border-[#ded7c8] bg-transparent'
                        }`}
                        style={isSelected ? { backgroundColor: currentAdvisor.themeColor } : {}}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-bold">{option.label}</span>
                    </div>

                    {isSelected && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${currentAdvisor.themeColor}15`,
                          color: currentAdvisor.themeColor,
                        }}
                      >
                        اختيارك
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Open Text */}
          {currentQuestion.type === 'open_text' && (
            <div className="space-y-3">
              <textarea
                rows={5}
                value={typeof localValue === 'string' ? localValue : ''}
                onChange={(e) => handleSelectValue(e.target.value)}
                placeholder={currentQuestion.placeholder || 'اكتب رؤيتك أو تفاصيل تجربتك هنا بكل حرية...'}
                className="w-full bg-[#FAF7F2] border border-[#ded7c8] rounded-2xl p-4 text-sm text-[#1d2e2b] placeholder-[#8a9995] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all leading-relaxed"
                dir="rtl"
              />
              <p className="text-[11px] text-[#7a8c88]">
                ملاحظة: تُستخدم هذه الإجابة لتحليل التحديات الخاصة بك وتقديم خطة موجهة في استشارة المستشار والمنسق العام.
              </p>
            </div>
          )}

          {/* 4. Multi-Select Goals */}
          {currentQuestion.type === 'multi_select' && currentQuestion.options && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((option) => {
                  const isChecked = Array.isArray(localValue) && localValue.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleToggleMultiSelect(option.id)}
                      className={`text-right p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                        isChecked
                          ? 'bg-[#FAF7F2] text-[#1d2e2b] shadow-xs'
                          : 'bg-white text-[#2c3d39] border-[#ded7c8] hover:border-[#bd9240]'
                      }`}
                      style={isChecked ? { borderColor: currentAdvisor.themeColor } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'border-transparent text-white'
                              : 'border-[#ded7c8] bg-transparent'
                          }`}
                          style={isChecked ? { backgroundColor: currentAdvisor.themeColor } : {}}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-semibold">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-[#7a8c88] flex items-center justify-between">
                <span>يمكنك اختيار هدف واحد أو أكثر</span>
                <span className="text-[#1b605b] font-bold">
                  المحدد: {Array.isArray(localValue) ? localValue.length : 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-[#f0eae0] gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentAdvisorIndex === 0 && currentQuestionIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#ded7c8] hover:bg-[#FAF7F2] text-[#536561] text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Skip button */}
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-[#7a8c88] hover:text-[#1d2e2b] text-xs font-bold hover:bg-[#FAF7F2] transition-all"
            >
              <span>تخطي</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Next / Confirm button */}
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-sm transition-all hover:opacity-95"
              style={{
                backgroundColor: currentAdvisor.themeColor,
                boxShadow: `0 3px 10px -2px ${currentAdvisor.themeColor}50`,
              }}
            >
              <span>
                {currentQuestionIndex === 7 ? 'تأكيد وحساب النتيجة' : 'التالي'}
              </span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Celebration Modal when an Advisor's 8 questions are completed */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-center space-y-6">
            <div
              className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xs border border-black/5"
              style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
            >
              {currentAdvisor.avatarSvg}
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full mb-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                اكتمل تقييم الجانب بنجاح
              </div>
              <h3 className="text-2xl font-black text-[#1d2e2b]">
                أحسنت! أنهيت جولة {currentAdvisor.name}
              </h3>
              <p className="text-xs text-[#536561] mt-1">
                تم تحليل إجاباتك ورصد نتيجتك في {currentAdvisor.title}
              </p>
            </div>

            {/* Score Showcase */}
            <div className="bg-[#FAF7F2] border border-[#eae3d5] rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[11px] text-[#7a8c88] block">درجة الجانب</span>
                <span
                  className="text-3xl font-black"
                  style={{ color: currentAdvisor.themeColor }}
                >
                  {currentAdvisorScore} <span className="text-base text-[#7a8c88]">/ 10</span>
                </span>
              </div>
              <div className="h-10 w-px bg-[#ded7c8]" />
              <div>
                <span className="text-[11px] text-[#7a8c88] block">المستوى التقديري</span>
                <span className="text-sm font-extrabold text-[#1d2e2b]">
                  {currentAdvisorScore >= 8
                    ? 'ممتاز ومتألق 🌟'
                    : currentAdvisorScore >= 6
                    ? 'جيد وواعد 🚀'
                    : 'يحتاج عناية وتركيز 💡'}
                </span>
              </div>
            </div>

            {/* Quick Strengths and Challenges bullets */}
            <div className="text-right space-y-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#eae3d5] text-xs">
              <div>
                <span className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  أبرز مواطن القوة:
                </span>
                <ul className="list-disc list-inside text-[#2c3d39] space-y-0.5">
                  {insights.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  فرص التحسين:
                </span>
                <ul className="list-disc list-inside text-[#2c3d39] space-y-0.5">
                  {insights.challenges.map((ch, i) => (
                    <li key={i}>{ch}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Continue CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#2c3d39] border border-[#ded7c8] text-xs font-bold transition-all shadow-xs"
              >
                معاينة لوحة التحكم والعجلة
              </button>
              <button
                type="button"
                onClick={handleContinueAfterCelebration}
                className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-xs transition-all hover:opacity-95"
                style={{
                  backgroundColor: currentAdvisor.themeColor,
                }}
              >
                {currentAdvisorIndex < ADVISORS_LIST.length - 1
                  ? 'المستشار التالي &larr;'
                  : 'عرض النتائج المتكاملة 🎉'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
