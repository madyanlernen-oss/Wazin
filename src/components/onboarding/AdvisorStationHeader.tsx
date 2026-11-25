import React from 'react';
import {
  CheckCircle2,
  ChevronDown,
  User,
  Check,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  X,
  Stethoscope,
} from 'lucide-react';
import { AdvisorConfig } from '../../types/lifeBalance';
import { AI_MODES, AiModelMode } from '../../screens/AdvisorChatScreen';

interface AdvisorStationHeaderProps {
  currentAdvisor: AdvisorConfig;
  stationNumber: number;
  progressPercent: number;
  isCompleted: boolean;
  aiMode: AiModelMode;
  showModeDropdown: boolean;
  isContextCompleted: boolean;
  isBannerDismissed: boolean;
  onToggleModeDropdown: () => void;
  onSelectAiMode: (mode: AiModelMode) => void;
  onOpenContextModal: () => void;
  onDismissBanner: () => void;
  onReopenStation: () => void;
  onStartNewWeeklyAssessment?: () => void;
}

export const AdvisorStationHeader: React.FC<AdvisorStationHeaderProps> = ({
  currentAdvisor,
  stationNumber,
  progressPercent,
  isCompleted,
  aiMode,
  showModeDropdown,
  isContextCompleted,
  isBannerDismissed,
  onToggleModeDropdown,
  onSelectAiMode,
  onOpenContextModal,
  onDismissBanner,
  onReopenStation,
  onStartNewWeeklyAssessment,
}) => {
  const currentModeConfig = AI_MODES.find((m) => m.id === aiMode) || AI_MODES[1];

  return (
    <>
      {/* Advisor Header Bar */}
      <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between bg-white dark:bg-[#0E1D24] flex-shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 relative"
            style={{ backgroundColor: `${currentAdvisor.themeColor}15` }}
          >
            {currentAdvisor.avatarSvg}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0E1D24]"
              style={{ backgroundColor: currentAdvisor.themeColor }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {currentAdvisor.name}
              </h2>
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
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />
                  تم التقييم بنجاح
                </span>
              )}
            </div>
            <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-0.5">{currentAdvisor.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Model Mode Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={onToggleModeDropdown}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-xs hover:shadow-sm cursor-pointer"
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
              <ChevronDown className={`w-3 h-3 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showModeDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={onToggleModeDropdown} />
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#0E1D24] rounded-2xl border border-[#E2E8F0] dark:border-[#1E343F] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-[#E2E8F0] dark:border-[#1E343F] mb-1">
                    <span className="text-[11px] font-black text-[#0F172A] dark:text-[#F1F5F9] block">
                      مستوى تفكير الذكاء الاصطناعي
                    </span>
                    <span className="text-[9px] text-[#334155] dark:text-[#CBD5E1]">
                      اختر سرعة وعمق التحليل أثناء الحوار
                    </span>
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
                            onToggleModeDropdown();
                          }}
                          className={`w-full text-right p-2 rounded-xl transition-all flex items-start gap-2 border cursor-pointer ${
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
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                                {mode.title}
                              </span>
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                              >
                                {mode.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#334155] dark:text-[#CBD5E1] leading-tight mt-0.5">
                              {mode.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Context Button (سياق المستفيد) */}
          <button
            type="button"
            onClick={onOpenContextModal}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 min-h-[44px] rounded-2xl border-2 transition-all shadow-xs cursor-pointer text-xs sm:text-sm font-bold ${
              isContextCompleted
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/70 text-emerald-800 dark:text-emerald-200 hover:border-emerald-500'
                : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/70 text-amber-900 dark:text-amber-200 hover:border-amber-500'
            }`}
            title="تخصيص سياق المستفيد (حالة العمل، الفئة العمرية، المعالون)"
          >
            <User className="w-4 h-4 text-[#0F6E6E] dark:text-[#22D3EE] flex-shrink-0" />
            <span className="font-extrabold whitespace-nowrap">سياق المستفيد</span>
            {isContextCompleted ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-black">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">مكتمل</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] sm:text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <span>غير مكتمل</span>
              </span>
            )}
          </button>

          {/* Reopen station button if completed */}
          {isCompleted && (
            <button
              type="button"
              onClick={onReopenStation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1D24] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="إعادة فتح هذه المحطة وإلغاء اعتمادها لإعادة التقييم"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
              <span className="hidden sm:inline">إعادة فتح المحطة</span>
              <span className="sm:hidden">إعادة فتح</span>
            </button>
          )}

          {/* Start New Weekly Assessment button */}
          {onStartNewWeeklyAssessment && (
            <button
              type="button"
              onClick={onStartNewWeeklyAssessment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F6F2] dark:bg-[#162734] border border-[#CBD5E1] dark:border-[#1E343F] hover:border-[#0F6E6E] dark:hover:border-[#22D3EE] text-[#0F172A] dark:text-[#F1F5F9] text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="بدء دورة تقييم أسبوعي جديدة لكافة الأبعاد"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0F6E6E] dark:text-[#22D3EE]" />
              <span className="hidden sm:inline">بدء تقييم أسبوعي جديد</span>
              <span className="sm:hidden">تقييم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Dismissible Context Prompt Banner (يظهر عند أول دخول إذا كانت الحقول فارغة ولم يغلق من قبل) */}
      {!isBannerDismissed && !isContextCompleted && (
        <div className="bg-gradient-to-r from-amber-50 via-teal-50/50 to-emerald-50 dark:from-[#112429] dark:via-[#0E1D24] dark:to-[#0B1A20] border-b border-amber-200/80 dark:border-amber-800/40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fadeIn transition-colors flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <span className="font-black text-[#0F6E6E] dark:text-cyan-300 block sm:inline">
                خصّص نصائحك في 10 ثوانٍ:
              </span>{' '}
              <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                حدد حالة عملك ومعاليك لتفصيل توجيهات المستشارين بدقة تناسب ميزانيتك وظروفك الواقعية.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onOpenContextModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0b5454] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>تخصيص الآن</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onDismissBanner}
              aria-label="إغلاق هذا التنبيه"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Assessment Progress Bar */}
      <div className="px-6 py-2.5 bg-[#F7F6F2] dark:bg-[#0B161C] border-b border-[#E2E8F0] dark:border-[#1E343F] flex items-center justify-between gap-4 text-xs flex-shrink-0 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-[#0F6E6E] dark:text-[#22D3EE] text-xs flex-shrink-0 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>المحطة</span>{' '}
            (<span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-mono">
              {stationNumber} / 8
            </span>)
            :<span>{currentAdvisor.title}</span>
          </span>
          <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] hidden sm:inline truncate">
            استشارة سريرية تفاعلية • تشخيص واقعك وبناء توازنك بدقة
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-24 sm:w-36 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#0F6E6E] dark:bg-[#22D3EE] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] font-mono" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {progressPercent}%
          </span>
        </div>
      </div>
    </>
  );
};
