import React from 'react';
import {
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { AdvisorConfig, LifeAreaId } from '../../types/lifeBalance';
import { isolateNumbersInText } from '../FormattedChatMessage';
import { StationDynamicInsights } from './clientIntelligence';

interface StationCelebrationModalProps {
  isOpen: boolean;
  currentAdvisor: AdvisorConfig;
  stationNumber: number;
  completedAdvisorsCount: number;
  currentActiveInsights: StationDynamicInsights;
  onGoToNextAdvisor: () => void;
  onNavigateToAdvisorChat?: (advisorId: LifeAreaId) => void;
  onClose: () => void;
}

export const StationCelebrationModal: React.FC<StationCelebrationModalProps> = ({
  isOpen,
  currentAdvisor,
  stationNumber,
  completedAdvisorsCount,
  currentActiveInsights,
  onGoToNextAdvisor,
  onNavigateToAdvisorChat,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#0E1D24] border border-[#E2E8F0] dark:border-[#1E343F] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-center space-y-6 transition-colors">
        <div
          className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xs border border-black/5 dark:border-white/10"
          style={{ backgroundColor: `${currentAdvisor.themeColor}20` }}
        >
          {currentAdvisor.avatarSvg}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="flex items-center gap-1">
              <span>اكتمل تقييم المحطة</span>
              <span dir="ltr" className="font-mono">
                {stationNumber} / 8
              </span>
              <span>بنجاح</span>
            </span>
          </div>
          <h3 className="text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
            أحسنت! أنهيت محطة {currentAdvisor.name}
          </h3>
          <p className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-1">
            تم اعتماد نتيجتك التقديرية في {currentAdvisor.title} وتوثيق توصيتك الذهبية
          </p>
        </div>

        {/* Score Showcase */}
        <div className="bg-[#F7F6F2] dark:bg-[#071318] border border-[#E2E8F0] dark:border-[#1E343F] rounded-2xl p-4 flex items-center justify-around">
          <div>
            <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] block">درجة الجانب</span>
            <span
              className="text-3xl font-black font-mono"
              style={{ color: currentAdvisor.themeColor }}
              dir="ltr"
            >
              {Number(currentActiveInsights.score > 0 ? currentActiveInsights.score : 7.5).toFixed(1)}{' '}
              <span className="text-base text-[#64748B] dark:text-[#94A3B8]">/ 10</span>
            </span>
          </div>
          <div className="h-10 w-px bg-[#E2E8F0] dark:bg-[#1E343F]" />
          <div>
            <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1] block">المستوى التقديري</span>
            <span className="text-sm font-extrabold text-[#0F172A] dark:text-[#F1F5F9]">
              {currentActiveInsights.score >= 8
                ? 'ممتاز ومتألق 🌟'
                : currentActiveInsights.score >= 6
                ? 'جيد وواعد 🚀'
                : 'يحتاج عناية وتركيز 💡'}
            </span>
          </div>
        </div>

        {/* Quick Strengths and Challenges bullets */}
        <div className="text-right space-y-3 bg-[#F7F6F2] dark:bg-[#071318] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E343F] text-xs">
          <div>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              أبرز مواطن القوة:
            </span>
            <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-1">
              {currentActiveInsights.strengths.slice(0, 3).map((str, i) => (
                <li key={i}>{isolateNumbersInText(str.replace(/\*\*/g, ''))}</li>
              ))}
            </ul>
          </div>

          <div>
            <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              فرص التحسين:
            </span>
            <ul className="list-disc list-inside text-[#0F172A] dark:text-[#F1F5F9] space-y-1">
              {currentActiveInsights.challenges.slice(0, 3).map((ch, i) => (
                <li key={i}>{isolateNumbersInText(ch.replace(/\*\*/g, ''))}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Continue CTA */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {onNavigateToAdvisorChat && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToAdvisorChat(currentAdvisor.id);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-[#0E1D24] hover:bg-[#F7F6F2] dark:hover:bg-[#162734] text-[#0F172A] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#1E343F] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>حوار مفتوح مع المستشار</span>
            </button>
          )}
          <button
            type="button"
            onClick={onGoToNextAdvisor}
            className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-xs transition-all hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: currentAdvisor.themeColor,
            }}
          >
            <span>
              {completedAdvisorsCount >= 7 || stationNumber === 8
                ? '🎉 عرض خريطتي المتكاملة (الداشبورد)'
                : 'المحطة التالية ←'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
