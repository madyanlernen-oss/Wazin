import React from 'react';
import { CheckCircle2, ArrowLeft, X } from 'lucide-react';

interface ChatToastProps {
  toastMessage: string | null;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  onNavigateToGoalsMatrix?: () => void;
}

export const ChatToast: React.FC<ChatToastProps> = ({
  toastMessage,
  onClose,
  actionLabel,
  onAction,
  onNavigateToGoalsMatrix,
}) => {
  if (!toastMessage) return null;

  const handleActionClick = onAction || onNavigateToGoalsMatrix;
  const resolvedLabel = actionLabel || 'فتح المصفوفة';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 start-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#064E3B] text-white shadow-2xl border border-emerald-500/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-md"
    >
      <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
      <span className="text-xs font-bold leading-relaxed flex-1">
        {toastMessage}
      </span>
      {handleActionClick && (
        <button
          type="button"
          onClick={handleActionClick}
          className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-[11px] font-black text-emerald-100 hover:text-white transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs"
        >
          <span>{resolvedLabel}</span>
          <ArrowLeft className="w-3 h-3" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/60 transition-all flex-shrink-0 cursor-pointer"
        aria-label="إغلاق الإشعار"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
