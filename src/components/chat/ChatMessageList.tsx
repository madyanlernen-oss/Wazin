import React from 'react';
import {
  User,
  Sparkles,
  Check,
  Plus,
  Lightbulb,
  Loader2,
  Undo2,
  Pencil,
} from 'lucide-react';
import { FormattedChatMessage, isolateNumbersInText } from '../FormattedChatMessage';
import { CrisisSupportCard, isCrisisMessage } from '../CrisisSupportCard';
import { AdvisorConfig, ChatMessage } from '../../types/lifeBalance';
import { AiModelMode } from './types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentAdvisor: AdvisorConfig;
  isLoading: boolean;
  aiMode: AiModelMode;
  addedGoals: Record<string, boolean>;
  onAddActionToGoals: (actionText: string) => void;
  onUndoLastExchange: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  currentAdvisor,
  isLoading,
  aiMode,
  addedGoals,
  onAddActionToGoals,
  onUndoLastExchange,
  messagesEndRef,
}) => {
  const lastUserMsgId = [...messages].reverse().find((m) => m.sender === 'user')?.id;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F7F6F2]/50 dark:bg-[#071318]/90 transition-colors">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';

        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                isUser
                  ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white'
                  : 'border border-black/5 dark:border-white/10'
              }`}
              style={!isUser ? { backgroundColor: `${currentAdvisor.themeColor}15` } : {}}
            >
              {isUser ? <User className="w-4 h-4" /> : currentAdvisor.avatarSvg}
            </div>

            {/* Bubble */}
            <div className="max-w-[85%] sm:max-w-[75%] space-y-3">
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0F6E6E] dark:bg-[#0891B2] text-white rounded-tr-none shadow-xs'
                    : 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#1E343F] rounded-tl-none shadow-xs'
                }`}
              >
                <FormattedChatMessage text={msg.content} isAdvisor={!isUser} />
                {!isUser && msg.source === 'local-fallback' && (
                  <div className="mt-1.5 flex items-center">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                      رد احتياطي
                    </span>
                  </div>
                )}
                <span className="text-[10px] opacity-60 block mt-2 text-left" dir="ltr">
                  {msg.timestamp}
                </span>

                {/* Undo & Edit actions for the last user message */}
                {isUser && msg.id === lastUserMsgId && !isLoading && (
                  <div className="flex items-center gap-1.5 justify-end pt-1.5 border-t border-white/20 mt-2">
                    <button
                      type="button"
                      onClick={onUndoLastExchange}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
                      title="تراجع عن الرسالة وحذف رد المستشار وإعادة النص لخانة الكتابة"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>تراجع</span>
                    </button>
                    <button
                      type="button"
                      onClick={onUndoLastExchange}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
                      title="تعديل الرسالة وحذف رد المستشار وإعادة النص لخانة الكتابة"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Render Crisis Support Card if crisis response detected */}
              {!isUser && (msg.isCrisis || isCrisisMessage(msg.content)) && (
                <CrisisSupportCard />
              )}

              {/* Actionable Steps suggested by advisor */}
              {!isUser && msg.actionSteps && msg.actionSteps.length > 0 && (
                <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-3.5 space-y-2 shadow-xs transition-colors">
                  <span className="text-[11px] font-bold text-[#0F6E6E] dark:text-[#22D3EE] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#bd9240]" />
                    خطوات عملية مقترحة من المستشار:
                  </span>
                  <div className="space-y-1.5">
                    {msg.actionSteps.map((step, sIdx) => {
                      const isAdded = addedGoals[step];
                      return (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] text-xs text-[#0F172A] dark:text-[#F1F5F9]"
                        >
                          <span>{isolateNumbersInText(step)}</span>
                          <button
                            type="button"
                            onClick={() => onAddActionToGoals(step)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all flex-shrink-0 shadow-xs cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-700 text-white'
                                : 'bg-white dark:bg-[#0E1D24] text-[#0F6E6E] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-[#1E343F] hover:bg-[#F7F6F2] dark:hover:bg-[#162734]'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>أُضيفت لمصفوفة أيزنهاور</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>إضافة إلى المربع الثاني بمصفوفة أيزنهاور</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reflection Question */}
              {!isUser && msg.reflectionQuestion && (
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-3 text-xs text-[#8A5A00] dark:text-[#FBBF24] flex items-start gap-2 shadow-xs">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-[#8A5A00] dark:text-[#FBBF24] block mb-0.5">
                      سؤال للتأمل الذاتي:
                    </span>
                    <span>{isolateNumbersInText(msg.reflectionQuestion)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3 items-start text-xs text-[#475569] dark:text-[#94A3B8]">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
          >
            {currentAdvisor.avatarSvg}
          </div>
          <div className="bg-white dark:bg-[#0E1D24] p-3.5 rounded-2xl rounded-tl-none border border-[#E2E8F0] dark:border-[#1E343F] shadow-sm space-y-2.5 max-w-[85%] sm:max-w-[70%]">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0" />
              <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                {aiMode === 'fast' && `${currentAdvisor.name} يصيغ لك نصيحة فورية سريعة ⚡...`}
                {aiMode === 'deep' && `${currentAdvisor.name} يفكك استشارتك بعمق وتحليل استراتيجي 🧠...`}
                {aiMode === 'balanced' && `${currentAdvisor.name} يفكر في استشارتك بعناية ⚖️...`}
              </span>
            </div>
            {/* Subtle pulsing skeleton lines to lower perceived wait time */}
            <div className="space-y-1.5 pt-0.5">
              <div className="h-2 rounded bg-slate-200/90 dark:bg-slate-700/60 animate-pulse w-48 sm:w-60" />
              <div className="h-2 rounded bg-slate-200/90 dark:bg-slate-700/60 animate-pulse w-32 sm:w-40" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
