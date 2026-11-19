import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      // Save previously focused element to return focus upon close
      triggerElementRef.current = document.activeElement as HTMLElement;

      if (!dialog.open) {
        dialog.showModal();
        // Shift initial focus to the safe Cancel button
        requestAnimationFrame(() => {
          cancelBtnRef.current?.focus();
        });
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      // Return focus to trigger button
      triggerElementRef.current?.focus();
    }
  }, [open]);

  // Handle native Escape key cancellation
  const handleNativeCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    onCancel();
  };

  // Close when clicking directly on backdrop (outside the inner modal box)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onCancel();
    }
  };

  if (!open) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleNativeCancel}
      onClick={handleBackdropClick}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 m-auto p-4 bg-transparent border-none max-w-sm w-full outline-none backdrop:bg-black/60 backdrop:backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white dark:bg-[#112028] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl text-right space-y-4">
        {/* Variant Icon */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
            isDanger
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400'
              : isWarning
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-[#FBBF24]'
              : 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/50 text-[#0B6E72] dark:text-cyan-400'
          }`}
        >
          {isDanger ? (
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          ) : isWarning ? (
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Info className="w-6 h-6" aria-hidden="true" />
          )}
        </div>

        {/* Text Details */}
        <div className="text-center space-y-1.5">
          <h3
            id="confirm-dialog-title"
            className="text-base font-black text-[#0F172A] dark:text-white"
          >
            {title}
          </h3>
          <p
            id="confirm-dialog-desc"
            className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          {/* Safe Cancel Button (Initial Focus) */}
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B161C] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
          >
            {cancelLabel}
          </button>

          {/* Destructive / Confirm Action Button */}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#0B6E72] hover:bg-[#09575A] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
