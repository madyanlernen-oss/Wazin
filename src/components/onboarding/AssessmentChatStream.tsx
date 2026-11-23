import React from 'react';
import { User, X, Sparkles, Undo2, Pencil } from 'lucide-react';
import { FormattedChatMessage } from '../FormattedChatMessage';
import { CrisisSupportCard, isCrisisMessage } from '../CrisisSupportCard';
import { AdvisorConfig } from '../../types/lifeBalance';
import { EvaluationChatMessage } from './clientIntelligence';

interface AssessmentChatStreamProps {
  messages: EvaluationChatMessage[];
  currentAdvisor: AdvisorConfig;
  isAdvisorReplying: boolean;
  isCompleted: boolean;
  isPrivacyDismissed: boolean;
  onDismissPrivacy: () => void;
  onUndoLastAnswer: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const AssessmentChatStream: React.FC<AssessmentChatStreamProps> = ({
  messages,
  currentAdvisor,
  isAdvisorReplying,
  isCompleted,
  isPrivacyDismissed,
  onDismissPrivacy,
  onUndoLastAnswer,
  messagesEndRef,
}) => {
  const lastUserMsgId = [...messages].reverse().find((m) => m.sender === 'user')?.id;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F7F6F2]/60 dark:bg-[#071318]/90 transition-colors">
      {!isPrivacyDismissed && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 select-none transition-colors">
          <span className="leading-relaxed">
            رسائلك تُرسل مؤقتاً إلى مزوّد الذكاء الاصطناعي لتوليد الرد، ويُحفظ تقدمك على جهازك. لا تكتب بيانات شخصية حساسة.
          </span>
          <button
            type="button"
            onClick={onDismissPrivacy}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="إغلاق التنبيه"
            title="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {messages.map((msg) => {
        const isAdvisor = msg.sender === 'advisor';
        return (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${isAdvisor ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs ${
                isAdvisor
                  ? 'border-black/5 dark:border-white/10'
                  : 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white border-transparent'
              }`}
              style={isAdvisor ? { backgroundColor: `${currentAdvisor.themeColor}20` } : {}}
            >
              {isAdvisor ? currentAdvisor.avatarSvg : <User className="w-4 h-4" />}
            </div>

            <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
              <div
                className={`p-4 rounded-2xl shadow-xs border ${
                  isAdvisor
                    ? 'bg-white dark:bg-[#0E1D24] border-[#E2E8F0] dark:border-[#1E343F] text-[#0F172A] dark:text-[#F1F5F9] rounded-tr-xs'
                    : 'bg-[#0F6E6E] dark:bg-[#0891B2] border-transparent text-white rounded-tl-xs'
                }`}
              >
                {/* Render Formatted Bold text without raw ** markers */}
                <FormattedChatMessage text={msg.text} isAdvisor={isAdvisor} />

                <span
                  className={`block text-[10px] mt-2 font-mono ${
                    isAdvisor ? 'text-[#64748B] dark:text-[#94A3B8]' : 'text-emerald-100/75'
                  }`}
                  dir="ltr"
                >
                  {msg.timestamp}
                </span>

                {/* Undo & Edit actions for last user message */}
                {!isAdvisor && msg.id === lastUserMsgId && !isCompleted && !isAdvisorReplying && (
                  <div className="flex items-center gap-1.5 justify-end pt-1.5 border-t border-white/20 mt-2">
                    <button
                      type="button"
                      onClick={onUndoLastAnswer}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
                      title="تراجع عن الرسالة وحذف رد المستشار وإعادة النص لخانة الإدخال"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>تراجع</span>
                    </button>
                    <button
                      type="button"
                      onClick={onUndoLastAnswer}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
                      title="تعديل الرسالة وحذف رد المستشار وإعادة النص لخانة الإدخال"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Render Crisis Support Card if crisis response detected */}
              {isAdvisor && (msg.isCrisis || isCrisisMessage(msg.text)) && (
                <CrisisSupportCard />
              )}
            </div>
          </div>
        );
      })}

      {isAdvisorReplying && (
        <div className="flex gap-3 max-w-3xl mr-auto items-center animate-pulse">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-xs"
            style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
          >
            {currentAdvisor.avatarSvg}
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#334155] dark:text-[#CBD5E1] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE] animate-spin" />
            <span>{currentAdvisor.name} يستمع إليك ويصيغ تشخيصه الطبي بعناية...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
