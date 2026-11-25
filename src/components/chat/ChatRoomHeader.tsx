import React, { useState } from 'react';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import { AdvisorConfig } from '../../types/lifeBalance';
import { AiModelMode, AI_MODES } from './types';

interface ChatRoomHeaderProps {
  currentAdvisor: AdvisorConfig;
  currentScore: number;
  aiMode: AiModelMode;
  onSelectAiMode: (mode: AiModelMode) => void;
  onReevaluateAdvisor?: () => void;
}

export const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  currentAdvisor,
  currentScore,
  aiMode,
  onSelectAiMode,
  onReevaluateAdvisor,
}) => {
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  return (
    <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1E343F] bg-[#F7F6F2] dark:bg-[#0B161C] flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10 relative"
          style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
        >
          {currentAdvisor.avatarSvg}
          <span
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0B161C]"
            style={{ backgroundColor: currentAdvisor.themeColor }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">{currentAdvisor.name}</h3>
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
          <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">{currentAdvisor.role}</p>
        </div>
      </div>

      {/* Header Right Side: AI Model Mode Selector & Score Tag */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* AI Model Mode Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm cursor-pointer"
            style={{
              backgroundColor: currentModeConfig.bgColor,
              borderColor: `${currentModeConfig.color}40`,
              color: currentModeConfig.color,
            }}
            title="تغيير نمط تفكير الذكاء الاصطناعي"
          >
            <currentModeConfig.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-black">{currentModeConfig.title}</span>
            <span className="sm:hidden font-black">{currentModeConfig.shortTitle}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showModeDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowModeDropdown(false)}
              />
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0E1D24] rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E343F] mb-1">
                  <span className="text-[11px] font-black text-[#0F172A] dark:text-[#F1F5F9] block">مستوى تفكير المستشار الذكي</span>
                  <span className="text-[10px] text-[#475569] dark:text-[#94A3B8]">اختر نمط الإجابة والتحليل المناسب لاحتياجك</span>
                </div>

                <div className="space-y-1">
                  {AI_MODES.map((mode) => {
                    const isSelected = mode.id === aiMode;
                    const IconComponent = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          onSelectAiMode(mode.id);
                          setShowModeDropdown(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl transition-all flex items-start gap-2.5 border cursor-pointer ${
                          isSelected
                            ? 'border-[#0F6E6E] dark:border-[#22D3EE] shadow-xs'
                            : 'border-transparent hover:bg-[#F7F6F2] dark:hover:bg-[#162734]'
                        }`}
                        style={isSelected ? { backgroundColor: mode.bgColor } : {}}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${mode.color}15`, color: mode.color }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">{mode.title}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                            >
                              {mode.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] leading-tight mt-1">{mode.desc}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current Score Tag with proper LTR format & Re-evaluate action */}
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-[#0E1D24] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-left shadow-xs transition-colors">
            <span className="text-[9px] sm:text-[10px] text-[#64748B] dark:text-[#94A3B8] block text-right font-sans">درجتك</span>
            <span dir="ltr" style={{ color: currentAdvisor.themeColor, unicodeBidi: 'isolate' }} className="text-xs sm:text-sm font-black font-mono block">
              {currentScore.toFixed(1)} / 10
            </span>
          </div>
          {onReevaluateAdvisor && (
            <button
              type="button"
              onClick={onReevaluateAdvisor}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F6E6E] dark:hover:text-[#22D3EE] text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              title="بدء جلسة إعادة تقييم جديدة معزولة لهذا الجانب"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة التقييم</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
