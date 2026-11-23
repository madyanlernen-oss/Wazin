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
              <span>تم رصد تقييم المحطة</span>
              <span dir="ltr" className="font-mono font-bold">
                ({stationNumber} / 8)
              </span>
              <span dir="ltr" className="font-mono font-bold">
                ({currentActiveInsights.score > 0 ? currentActiveInsights.score : 7} / 10)
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

      {/* Socratic Interactive Consensus & Depth Controls (Only visible after at least 5 diagnostic inquiries) */}
      {!isCompleted && stationTurnCount >= 5 && (
        <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-2 flex-wrap transition-colors">
          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>المستشار جاهز لتقديم التشخيص، أو التعمق أكثر بحسب رغبتك:</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSendAnswer('أريد التعمق أكثر وسؤالك عن جوانب أخرى')}
              className="px-3 py-1 rounded-xl bg-white dark:bg-[#0E1D24] border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>🔍 أريد التعمق أكثر</span>
            </button>
            <button
              type="button"
              onClick={() => onSendAnswer('اعتمد التقييم')}
              className="px-3.5 py-1 rounded-xl bg-[#0F6E6E] hover:bg-[#0A4B4B] dark:bg-[#22D3EE] dark:hover:bg-cyan-300 text-white dark:text-[#071318] text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>✅ اعتمد التقييم</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Choices bar */}
      <div className="px-4 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex-shrink-0 transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <span className="text-[11px] font-black text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
            <span>اختر تقييمك (من 1 إلى 10):</span>
          </span>

          {/* 1 to 10 Rating Pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isAdvisorReplying}
                onClick={() => onSendAnswer(`تقييمي: ${num} من 10`)}
                className="min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] hover:bg-emerald-50/50 dark:hover:bg-cyan-950/30 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer font-mono flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 disabled:opacity-40 disabled:pointer-events-none"
                dir="ltr"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Suggested Clinical Responses */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
