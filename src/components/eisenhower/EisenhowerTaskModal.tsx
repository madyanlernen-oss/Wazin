import React from 'react';
import { Edit3, Plus, X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ADVISORS_LIST } from '../../data/advisorsData';
import {
  EisenhowerGoalItem,
  EisenhowerQuadrant,
  GoalTimeframe,
  LifeAreaId,
} from '../../types/lifeBalance';
import { EisenhowerSuggestionItem } from '../../utils/eisenhowerAgent';

interface EisenhowerTaskModalProps {
  showAddModal: boolean;
  onCloseAddModal: () => void;
  onSubmitGoal: (e: React.FormEvent) => void;
  editingGoal: EisenhowerGoalItem | null;
  editingSuggestion: EisenhowerSuggestionItem | null;
  newTitle: string;
  onChangeNewTitle: (val: string) => void;
  newQuadrant: EisenhowerQuadrant;
  onChangeNewQuadrant: (val: EisenhowerQuadrant) => void;
  activeTimeframe: GoalTimeframe;
  onChangeActiveTimeframe: (val: GoalTimeframe) => void;
  newAreaId: LifeAreaId;
  onChangeNewAreaId: (val: LifeAreaId) => void;

  goalToDelete: EisenhowerGoalItem | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;

  showResetGoalsConfirm: boolean;
  onCancelReset: () => void;
  onConfirmReset: () => void;

  notificationToast: { message: string; type: 'success' | 'info' } | null;
}

export const EisenhowerTaskModal: React.FC<EisenhowerTaskModalProps> = ({
  showAddModal,
  onCloseAddModal,
  onSubmitGoal,
  editingGoal,
  editingSuggestion,
  newTitle,
  onChangeNewTitle,
  newQuadrant,
  onChangeNewQuadrant,
  activeTimeframe,
  onChangeActiveTimeframe,
  newAreaId,
  onChangeNewAreaId,
  goalToDelete,
  onCancelDelete,
  onConfirmDelete,
  showResetGoalsConfirm,
  onCancelReset,
  onConfirmReset,
  notificationToast,
}) => {
  return (
    <>
      {/* Add / Customize Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0B6E72]/15 dark:bg-cyan-950/70 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/50 flex items-center justify-center flex-shrink-0">
                  {editingGoal || editingSuggestion ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                    {editingGoal
                      ? 'تعديل الهدف في مصفوفة أيزنهاور'
                      : editingSuggestion
                      ? 'تخصيص اقتراح وكيل أهدافي 11'
                      : 'إضافة هدف جديد لمصفوفة أيزنهاور'}
                  </h3>
                  {editingGoal && editingGoal.advisorName && (
                    <p className="text-[11px] text-[#0B6E72] dark:text-cyan-300 font-bold mt-0.5">
                      توجيه المستشار: {editingGoal.advisorName}
                    </p>
                  )}
                  {editingSuggestion && (
                    <p className="text-[11px] text-[#0B6E72] dark:text-cyan-300 font-bold mt-0.5">
                      مستخلص من: {editingSuggestion.sourceAgentName} • {editingSuggestion.sourceTypeLabel}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseAddModal}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmitGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  نص الهدف أو الخطة العملية:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => onChangeNewTitle(e.target.value)}
                  placeholder="مثال: قراءة 20 صفحة يومياً، تثبيت موعد النوم..."
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400"
                  dir="rtl"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  المربع المستهدف في مصفوفة أيزنهاور:
                </label>
                <select
                  value={newQuadrant}
                  onChange={(e) => onChangeNewQuadrant(e.target.value as EisenhowerQuadrant)}
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer"
                >
                  <option value="q1_urgent_important">1 - مهم وعاجل (نفّذ الآن)</option>
                  <option value="q2_important_not_urgent">2 - مهم وغير عاجل (جدول له - وقود التوازن)</option>
                  <option value="q3_urgent_not_important">3 - غير مهم وعاجل (فوّضه)</option>
                  <option value="q4_not_urgent_not_important">4 - غير مهم وغير عاجل (احذفه أو قلله)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  النطاق الزمني:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'daily', label: 'يومية' },
                    { id: 'weekly', label: 'أسبوعية' },
                    { id: 'monthly', label: 'شهرية' },
                    { id: 'yearly', label: 'سنوية' },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => onChangeActiveTimeframe(tf.id as GoalTimeframe)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                        activeTimeframe === tf.id
                          ? 'bg-[#0B6E72] dark:bg-[#0E7490] text-white border-transparent shadow-2xs'
                          : 'bg-slate-50 dark:bg-[#102033] border-slate-200 dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:border-[#0B6E72]/40'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                  المجال المرتبط بالهدف:
                </label>
                <select
                  value={newAreaId}
                  onChange={(e) => onChangeNewAreaId(e.target.value as LifeAreaId)}
                  className="w-full bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 cursor-pointer"
                >
                  {ADVISORS_LIST.map((adv) => (
                    <option key={adv.id} value={adv.id}>
                      {adv.avatarSvg} {adv.title} ({adv.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
                >
                  {editingGoal
                    ? 'تحديث وحفظ الهدف'
                    : editingSuggestion
                    ? 'حفظ وطرح الهدف في المصفوفة'
                    : 'حفظ الهدف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Goal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                تأكيد حذف الهدف
              </h3>
            </div>

            <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الهدف:{' '}
              <strong className="text-[#0F172A] dark:text-white block mt-1 p-2 rounded-xl bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-800">
                "{goalToDelete.title}"
              </strong>
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancelDelete}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                نعم، احذف الهدف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset All Goals to Defaults */}
      {showResetGoalsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[#0F172A] dark:text-white">
                تأكيد إعادة تعيين الأهداف
              </h3>
            </div>

            <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في استعادة قائمة الأهداف النموذجية الأولية؟ سيتم استبدال أي أهداف مخصصة قمت بإضافتها بالأهداف النموذجية المتوازنة.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancelReset}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onConfirmReset}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                نعم، استعد الأهداف الافتراضية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {notificationToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className="bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-black border border-slate-700 dark:border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{notificationToast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};
