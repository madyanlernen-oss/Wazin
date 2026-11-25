import React from 'react';
import { Send, Square } from 'lucide-react';
import { VoiceInput } from '../VoiceInput';
import { isolateNumbersInText } from '../FormattedChatMessage';
import { AdvisorConfig } from '../../types/lifeBalance';
import { AiModelMode, AI_MODES } from './types';

interface ChatPromptInputBarProps {
  currentAdvisor: AdvisorConfig;
  inputMessage: string;
  onChangeInputMessage: (val: string) => void;
  isLoading: boolean;
  aiMode: AiModelMode;
  onSelectAiMode: (mode: AiModelMode) => void;
  onSendMessage: (text?: string) => void;
  onStopMessage: (e?: React.SyntheticEvent) => void;
  quickSuggestions?: string[];
}

export const ChatPromptInputBar: React.FC<ChatPromptInputBarProps> = ({
  currentAdvisor,
  inputMessage,
  onChangeInputMessage,
  isLoading,
  aiMode,
  onSelectAiMode,
  onSendMessage,
  onStopMessage,
  quickSuggestions,
}) => {
  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];
  const activeChips =
    quickSuggestions && quickSuggestions.length > 0
      ? quickSuggestions
      : currentAdvisor.suggestedQuestions;

  return (
    <>
      {/* Suggested Questions Chips */}
      <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E343F] bg-[#F7F6F2] dark:bg-[#0B161C] flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs transition-colors">
        <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-bold flex-shrink-0">
          اقتراحات الرد:
        </span>
        {activeChips.map((qText, idx) => (
          <button
            key={`${idx}_${qText.slice(0, 14)}`}
            type="button"
            onClick={() => onSendMessage(qText)}
            disabled={isLoading}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] text-[11px] transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isolateNumbersInText(qText)}
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <div className="p-3 sm:p-4 border-t border-[#E2E8F0] dark:border-[#1E343F] bg-white dark:bg-[#0E1D24] space-y-2.5 transition-colors">
        {/* Quick AI Mode Selector Pill */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-bold">نمط التفكير:</span>
            <div className="inline-flex rounded-xl p-0.5 bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F]">
              {AI_MODES.map((m) => {
                const isSelected = m.id === aiMode;
                const IconC = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectAiMode(m.id)}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${isSelected
                      ? 'bg-white dark:bg-[#0E1D24] shadow-xs'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                      }`}
                    style={isSelected ? { color: m.color } : {}}
                    title={m.desc}
                  >
                    <IconC className="w-3 h-3" />
                    <span>{m.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] hidden md:inline font-medium">
            {currentModeConfig.desc}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <VoiceInput
            currentValue={inputMessage}
            onTranscript={(transcript) => onChangeInputMessage(transcript)}
            disabled={isLoading}
            showStatusBadge={true}
            resetKey={currentAdvisor.id}
          />

          {/* Free Text Input in dedicated Form for Enter key support */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoading) {
                onSendMessage();
              }
            }}
            className="flex-1"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => onChangeInputMessage(e.target.value)}
              placeholder={`اطرح سؤالك أو تحدث بصوتك مع ${currentAdvisor.name}...`}
              className="w-full bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0F6E6E] dark:focus:border-[#22D3EE] focus:ring-1 focus:ring-[#0F6E6E] dark:focus:ring-[#22D3EE] transition-all"
              dir="rtl"
              disabled={isLoading}
            />
          </form>

          {/* Send or Stop Button completely outside form */}
          {isLoading ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStopMessage(e);
              }}
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
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSendMessage();
              }}
              className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 hover:opacity-95 cursor-pointer ${!inputMessage.trim() ? 'opacity-65' : ''}`}
              style={{ backgroundColor: currentAdvisor.themeColor || '#0F6E6E' }}
              title="إرسال"
            >
              <Send className="w-5 h-5 -rotate-90" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
