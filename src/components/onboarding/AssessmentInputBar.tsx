import React from 'react';
import {
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  Sparkles,
  Square,
  Send,
  Lightbulb,
} from 'lucide-react';
import { VoiceInput } from '../VoiceInput';
import { AdvisorConfig, LifeAreaId } from '../../types/lifeBalance';
import { StationAssessmentConfig } from '../../data/assessmentQuestions';
import { StationDynamicInsights } from './clientIntelligence';

interface AssessmentInputBarProps {
  inputText: string;
  isAdvisorReplying: boolean;
  isCompleted: boolean;
  stationTurnCount: number;
  currentAdvisor: AdvisorConfig;
  stationNumber: number;
  currentActiveInsights: StationDynamicInsights;
  currentStationConfig: StationAssessmentConfig;
  currentAdvisorIndex: number;
  offeredScore?: number | null;
  isChoiceDismissed?: boolean;
  onAdoptScoreAndComplete?: (score: number) => void;
  onContinueDialogue?: () => void;
  onChangeInput: (text: string) => void;
  onSendAnswer: (overrideText?: string) => void;
  onStopAnswer: (e: React.MouseEvent) => void;
  onResetAdvisor: () => void;
  onGoToNextAdvisor: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
}

export const AssessmentInputBar: React.FC<AssessmentInputBarProps> = ({
  inputText,
  isAdvisorReplying,
  isCompleted,
  stationTurnCount,
  currentAdvisor,
  stationNumber,
  currentActiveInsights,
  currentStationConfig,
  currentAdvisorIndex,
  offeredScore,
  isChoiceDismissed,
  onAdoptScoreAndComplete,
  onContinueDialogue,
  onChangeInput,
  onSendAnswer,
  onStopAnswer,
  onResetAdvisor,
  onGoToNextAdvisor,
  onNavigateToAdvisorChat,
}) => {
  return (
    <div className="border-t border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">
      {/* Completion Status Bar when evaluated */}
      {isCompleted && (
        <div className="px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-200/90 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
              <span>تم رصد تقييم المحطة {stationNumber} من 8 بنجاح</span>
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                ({Number(currentActiveInsights.score > 0 ? currentActiveInsights.score : 7).toFixed(1)} من 10)
              </span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200">
              معتمد وموثق 🔒
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetAdvisor}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-[#162734] text-emerald-900 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="إعادة بدء التقييم لهذا الجانب"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة التقييم</span>
            </button>
            {onNavigateToAdvisorChat && (
              <button
                type="button"
                onClick={() => onNavigateToAdvisorChat(currentAdvisor.id)}
                className="px-2.5 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>غرفة الاستشارة</span>
              </button>
            )}
            <button
              type="button"
              onClick={onGoToNextAdvisor}
              className="px-3 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>المحطة التالية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Explicit Adopt Score & Continue Action Bar (زرّان واضحان: اعتماد التقييم / الاستمرار في الحوار) */}
      {!isCompleted && !isChoiceDismissed && offeredScore !== undefined && offeredScore !== null && offeredScore > 0 && (
        <div
          dir="rtl"
          className="px-5 sm:px-6 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/70 dark:via-cyan-950/50 dark:to-emerald-950/70 border-b border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between gap-3 flex-wrap transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0 ms-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600 dark:bg-emerald-400" />
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 flex-wrap">
              <span>التقييم المقترح من المستشار:</span>
              <span dir="ltr" className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-emerald-200/90 dark:bg-emerald-900/90 text-emerald-950 dark:text-emerald-100 font-black shadow-xs">
                {offeredScore.toFixed(1)} / 10
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              disabled={isAdvisorReplying}
              onClick={() => {
                if (onContinueDialogue) {
                  onContinueDialogue();
                } else {
                  onSendAnswer('أرغب في الاستمرار في الحوار ومناقشة تفاصيل إضافية');
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>💬 الاستمرار في الحوار</span>
            </button>
            <button
              type="button"
              disabled={isAdvisorReplying}
              onClick={() => {
                if (onAdoptScoreAndComplete) {
                  onAdoptScoreAndComplete(offeredScore);
                } else {
                  onSendAnswer(`اعتمد التقييم بدرجة ${offeredScore}`);
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#22D3EE] dark:hover:bg-cyan-300 text-white dark:text-[#071318] text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>اعتماد التقييم</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Choices bar */}
      <div
        dir="rtl"
        className="px-5 sm:px-6 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors space-y-2"
      >
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 pe-2">
          <span className="text-[11px] font-black text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
            <span>اختر تقييمك (من 1 إلى 10):</span>
          </span>

          {/* 1 to 10 Rating Pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pe-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isAdvisorReplying}
                onClick={() => onSendAnswer(`تقييمي: ${num} من 10`)}
                className="min-w-[34px] sm:min-w-[38px] min-h-[34px] sm:min-h-[38px] px-2 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] hover:bg-emerald-50/50 dark:hover:bg-cyan-950/30 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer font-mono flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 disabled:opacity-40 disabled:pointer-events-none"
                dir="ltr"
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Clinical & Rapid Context Responses - Wrapped cleanly so no chip is ever clipped on the left */}
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Domain-specific rapid input shortcuts */}
            {currentAdvisor.id === 'financial' && (
              <>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('أنا طالب وأعتمد على المكافأة وبدون ديون لكن أواجه عجزاً نهاية الشهر')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  🎓 طالب جامعي بدون ديون
                </button>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('سأجرب اقتطاع 30 ريالاً كصمام أمان شهري')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  💡 ادخار 30 ريال كصمام أمان
                </button>
              </>
            )}

            {currentAdvisor.id === 'spiritual' && (
              <>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('أشعر بالتشتت بسبب الهاتف ومواقع التواصل ولا أجد خلوة هادئة')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  🌿 تشتت بالهاتف وضيق بالوقت
                </button>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('ممكن نصف ساعة يومياً مشي هادئ وتأمل بعيداً عن الهاتف')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  ⏱️ نصف ساعة يومياً مشي وتأمل
                </button>
              </>
            )}

            {currentAdvisor.id === 'health' && (
              <>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('أعاني من قلة النوم وإجهاد الشاشات وأنام ساعات متقطعة')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  😴 تذبذب النوم وإجهاد الشاشات
                </button>
                <button
                  type="button"
                  disabled={isAdvisorReplying}
                  onClick={() => onSendAnswer('سألتزم بـ 20 دقيقة مشي يومي وشرب لترين ماء')}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-[#0F6E6E] dark:text-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  🏃 20 دقيقة مشي وشرب الماء
                </button>
              </>
            )}

            {(currentStationConfig.consultation?.suggestedResponses || currentStationConfig.initialDiagnostic?.suggestedResponses || []).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isAdvisorReplying}
                onClick={() => onSendAnswer(chip)}
                className="flex-shrink-0 px-3 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-[11px] font-semibold transition-all shadow-xs hover:bg-[#F7F6F2] dark:hover:bg-[#162734] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {chip}
              </button>
            ))}
        </div>
      </div>

      {/* Input Bar: Text + Mic + Send */}
      <div className="p-3 sm:p-4 bg-white dark:bg-[#0E1D24] transition-colors">
        <div className="flex items-center gap-2">
          {/* Mic Button for Voice Dictation */}
          <VoiceInput
            currentValue={inputText}
            onTranscript={(transcript) => onChangeInput(transcript)}
            disabled={isAdvisorReplying}
            showStatusBadge={true}
            resetKey={currentAdvisorIndex}
          />

          {/* Free Text Input in dedicated Form for Enter key support */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isAdvisorReplying && inputText.trim()) {
                onSendAnswer();
              }
            }}
            className="flex-1"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => onChangeInput(e.target.value)}
              placeholder={
                isCompleted
                  ? 'اكتب استشارتك أو سؤالك للمستشار بحرية...'
                  : (currentStationConfig.consultation?.placeholder || currentStationConfig.initialDiagnostic?.placeholder || 'صف حالك ورضاك في هذا الجانب بصراحة...')
              }
              className="w-full bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0F6E6E] dark:focus:border-[#22D3EE] focus:ring-1 focus:ring-[#0F6E6E] dark:focus:ring-[#22D3EE] transition-all"
              dir="rtl"
              disabled={isAdvisorReplying}
            />
          </form>

          {/* Send or Stop Button completely outside the form to prevent accidental submission */}
          {isAdvisorReplying ? (
            <button
              type="button"
              onClick={onStopAnswer}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="relative z-20 pointer-events-auto h-12 px-3.5 sm:px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center justify-center gap-1.5 transition-all shadow-md flex-shrink-0 cursor-pointer font-bold text-xs select-none"
              title="إيقاف انتظار الرد واسترجاع رسالتك"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>إيقاف ⏹</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!inputText.trim() || isAdvisorReplying}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSendAnswer();
              }}
              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: currentAdvisor.themeColor || '#0F6E6E' }}
              title="إرسال"
            >
              <Send className="w-5 h-5 -rotate-90" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#334155] dark:text-[#CBD5E1] px-1">
          <span className="flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
            <span>حوار استشاري أسبوعي: يتم احتساب درجة البعد وتأكيد اكتمال المحطة تلقائياً من خلال الحوار الفعلي مع المستشار.</span>
          </span>
        </div>
      </div>
    </div>
  );
};
