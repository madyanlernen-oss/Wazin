import React, { useState, useEffect } from 'react';
import { User, X, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types/lifeBalance';

interface UserContextModalProps {
  isOpen: boolean;
  isContextCompleted: boolean;
  userProfile?: UserProfile | null;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

export const UserContextModal: React.FC<UserContextModalProps> = ({
  isOpen,
  isContextCompleted,
  userProfile,
  onClose,
  onSave,
}) => {
  const [workStatusInput, setWorkStatusInput] = useState(
    userProfile?.employmentStatus || userProfile?.workStatus || ''
  );
  const [ageGroupInput, setAgeGroupInput] = useState(userProfile?.ageGroup || '');
  const [hasDependentsInput, setHasDependentsInput] = useState(userProfile?.hasDependents || '');
  const [incomeSourceInput, setIncomeSourceInput] = useState(userProfile?.incomeSource || '');
  const [incomeStabilityInput, setIncomeStabilityInput] = useState(userProfile?.incomeStability || '');
  const [contextError, setContextError] = useState('');

  useEffect(() => {
    if (userProfile) {
      setWorkStatusInput(userProfile.employmentStatus || userProfile.workStatus || '');
      setAgeGroupInput(userProfile.ageGroup || '');
      setHasDependentsInput(userProfile.hasDependents || '');
      setIncomeSourceInput(userProfile.incomeSource || '');
      setIncomeStabilityInput(userProfile.incomeStability || '');
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const isStudentInput = workStatusInput === 'طالب جامعي' || workStatusInput.includes('طالب');
  const isEmployeeOrBusinessInput =
    workStatusInput === 'موظف' ||
    workStatusInput === 'صاحب عمل/مستقل' ||
    workStatusInput === 'صاحب عمل' ||
    workStatusInput === 'مستقل' ||
    workStatusInput.includes('صاحب عمل') ||
    workStatusInput.includes('مستقل');

  const handleSave = () => {
    if (!workStatusInput.trim()) {
      setContextError('يرجى اختيار حالة العمل لإكمال التسجيل وتخصيص استشاراتك.');
      return;
    }
    if (!ageGroupInput.trim()) {
      setContextError('يرجى اختيار الفئة العمرية.');
      return;
    }
    if (!hasDependentsInput.trim()) {
      setContextError('يرجى تحديد ما إذا كان لديك معالون.');
      return;
    }
    if (isStudentInput && !incomeSourceInput.trim()) {
      setContextError('يرجى اختيار مصدر دخلك الأساسي كطالب لإكمال تخصيص خطتك.');
      return;
    }
    if (isEmployeeOrBusinessInput && !incomeStabilityInput.trim()) {
      setContextError('يرجى تحديد ما إذا كان دخلك ثابتاً أم متغيراً.');
      return;
    }

    setContextError('');
    onSave({
      employmentStatus: workStatusInput.trim(),
      workStatus: workStatusInput.trim(),
      ageGroup: ageGroupInput.trim(),
      hasDependents: hasDependentsInput.trim(),
      incomeSource: isStudentInput ? incomeSourceInput.trim() : undefined,
      incomeStability: isEmployeeOrBusinessInput ? incomeStabilityInput.trim() : undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0B161C] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-right animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-cyan-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                  سياق المستفيد وخلفيته الحياتية
                </h3>
                {!isContextCompleted ? (
                  <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    إلزامي
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-teal-500/10 text-[#0F6E6E] dark:text-cyan-400 border border-teal-500/20">
                    تأكيد السياق للتقييم
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                تساعد مستشاري وزان في تفصيل نصائح وأسئلة واقعية تراعي قدراتك وميزانيتك
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0"
            aria-label={!isContextCompleted ? 'إغلاق والعودة للصفحة السابقة' : 'إغلاق النافذة'}
            title={!isContextCompleted ? 'إغلاق والعودة للصفحة السابقة' : 'إغلاق النافذة'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {contextError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{contextError}</span>
          </div>
        )}

        <div className="space-y-4.5 max-h-[70vh] overflow-y-auto px-1 scrollbar-none">
          {/* 1. Work Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-white">
                حالة العمل <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-bold">انقر للتحديد السريع</span>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'طالب جامعي 🎓', val: 'طالب جامعي' },
                { label: 'موظف 💼', val: 'موظف' },
                { label: 'صاحب عمل/مستقل 🚀', val: 'صاحب عمل/مستقل' },
                { label: 'باحث عن عمل 🔍', val: 'باحث عن عمل' },
                { label: 'متقاعد 🌿', val: 'متقاعد' },
                { label: 'غير ذلك ✨', val: 'غير ذلك' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => {
                    setWorkStatusInput(item.val);
                    setContextError('');
                  }}
                  className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border text-center flex items-center justify-center gap-1 ${
                    workStatusInput === item.val
                      ? 'bg-[#0F6E6E] text-white border-[#0F6E6E] shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E]/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional 1: Student Income Source */}
          {isStudentInput && (
            <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 space-y-2 animate-fadeIn">
              <label className="block text-xs sm:text-sm font-black text-[#0F6E6E] dark:text-cyan-300">
                مصدر دخلك الأساسي كطالب <span className="text-rose-500">*</span>
              </label>

              {/* Student Quick Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'مكافأة جامعية/منحة 🏛️', val: 'مكافأة جامعية/منحة' },
                  { label: 'مصروف من الأسرة 👨‍👩‍👦', val: 'مصروف من الأسرة' },
                  { label: 'عمل جزئي ⏳', val: 'عمل جزئي' },
                  { label: 'غير ذلك 💳', val: 'غير ذلك' },
                ].map((sItem) => (
                  <button
                    key={sItem.val}
                    type="button"
                    onClick={() => {
                      setIncomeSourceInput(sItem.val);
                      setContextError('');
                    }}
                    className={`p-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                      incomeSourceInput === sItem.val
                        ? 'bg-[#0F6E6E] text-white border-[#0F6E6E] shadow-xs'
                        : 'bg-white dark:bg-[#102033] text-teal-900 dark:text-cyan-200 border-teal-300 dark:border-cyan-800 hover:border-[#0F6E6E]'
                    }`}
                  >
                    {sItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional 2: Employee / Business Income Stability */}
          {isEmployeeOrBusinessInput && (
            <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 space-y-2 animate-fadeIn">
              <label className="block text-xs sm:text-sm font-black text-[#0F6E6E] dark:text-cyan-300">
                هل دخلك ثابت؟ <span className="text-rose-500">*</span>
              </label>

              {/* Stability Quick Chips */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'نعم (دخل ثابت شهري) 🔒', val: 'نعم (دخل ثابت)' },
                  { label: 'لا (دخل متغير/عمولات) 📊', val: 'لا (دخل متغير)' },
                ].map((stItem) => (
                  <button
                    key={stItem.val}
                    type="button"
                    onClick={() => {
                      setIncomeStabilityInput(stItem.val);
                      setContextError('');
                    }}
                    className={`p-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                      incomeStabilityInput === stItem.val
                        ? 'bg-[#0F6E6E] text-white border-[#0F6E6E] shadow-xs'
                        : 'bg-white dark:bg-[#102033] text-teal-900 dark:text-cyan-200 border-teal-300 dark:border-cyan-800 hover:border-[#0F6E6E]'
                    }`}
                  >
                    {stItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Age Group */}
          <div>
            <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-white mb-2">
              الفئة العمرية <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'أقل من 20 سنة',
                '20 - 29 سنة',
                '30 - 39 سنة',
                '40 - 49 سنة',
                '50 سنة فأكثر',
              ].map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => {
                    setAgeGroupInput(ag);
                    setContextError('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    ageGroupInput === ag
                      ? 'bg-[#0F6E6E] text-white border-[#0F6E6E]'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E]'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Has Dependents */}
          <div>
            <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-white mb-2">
              هل لديك معالون؟ (أسرة أو أطفال) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'لا (بدون معالين) 👤', val: 'لا' },
                { label: 'نعم (أسرة أو أطفال) 👨‍👩‍👧‍👦', val: 'نعم' },
              ].map((dep) => (
                <button
                  key={dep.val}
                  type="button"
                  onClick={() => {
                    setHasDependentsInput(dep.val);
                    setContextError('');
                  }}
                  className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                    hasDependentsInput === dep.val
                      ? 'bg-[#0F6E6E] text-white border-[#0F6E6E]'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#0F6E6E]'
                  }`}
                >
                  {dep.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {!isContextCompleted ? 'إلغاء والعودة' : 'إغلاق ومتابعة التقييم'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-black bg-[#0F6E6E] hover:bg-[#0b5454] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-teal-900/10 flex-1 sm:flex-initial text-center"
          >
            {isContextCompleted ? 'حفظ التعديلات واعتماد السياق' : 'حفظ ومتابعة التقييم'}
          </button>
        </div>
      </div>
    </div>
  );
};
