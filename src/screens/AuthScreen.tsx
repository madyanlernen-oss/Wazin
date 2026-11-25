import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Check,
  KeyRound,
  Sparkles,
  Zap,
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import {
  getStoredUsers,
  saveStoredUser,
  hashPassword,
  saveUserCredential,
  verifyUserPassword,
} from '../utils/storage';
import { DEMO_USER_PROFILE } from '../utils/demoMode';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onActivateDemo?: () => void;
  onCancel: () => void;
  initialMode?: 'login' | 'signup';
  theme?: 'light' | 'dark';
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onActivateDemo,
  onCancel,
  initialMode = 'login',
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  // Mode: focused 'login' or 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states: Login (clean, empty by default)
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Form states: Simple Register
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupWorkStatus, setSignupWorkStatus] = useState('');
  const [signupAgeGroup, setSignupAgeGroup] = useState('');
  const [signupHasDependents, setSignupHasDependents] = useState('');
  const [signupIncomeSource, setSignupIncomeSource] = useState('');
  const [signupIncomeStability, setSignupIncomeStability] = useState('');

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Modal Escape key handler
  useEffect(() => {
    if (!showForgotModal && !showGoogleModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowForgotModal(false);
        setShowGoogleModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal, showGoogleModal]);

  const savedUsers = getStoredUsers();

  // Quick 1-click fill for the official Demo account
  const handleQuickDemoFill = () => {
    setEmailOrName('demo@wazan.com');
    setPassword('123456');
    setError(null);
  };

  // Handle Standard Login with Strict Verification
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = emailOrName.trim().toLowerCase();
    const pass = password.trim();

    if (!identifier) {
      setError('يرجى إدخال اسم المستخدم أو البريد الإلكتروني.');
      return;
    }
    if (!pass) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    setIsSubmitting(true);

    const isDemoIdentifier =
      identifier === 'demo' ||
      identifier === 'wazan' ||
      identifier === 'demo@wazan.com' ||
      identifier === 'demo@wazan.ai' ||
      identifier === 'سعود المنصور';

    if (isDemoIdentifier) {
      if (pass !== '123456') {
        setError('كلمة المرور غير صحيحة للحساب التجريبي (كلمة المرور الافتراضية: 123456).');
        setIsSubmitting(false);
        return;
      }
      const demoAccount: UserProfile = {
        name: 'سعود المنصور',
        email: 'demo@wazan.com',
        hasPassword: true,
        ageGroup: '',
        employmentStatus: undefined,
        workStatus: undefined,
        hasDependents: undefined,
        currentFocus: 'تحقيق التوازن الشامل والارتقاء بالأداء المهني والصحي',
        registeredAt: '2026-01-01T00:00:00.000Z',
      };
      setSuccessMsg('أهلاً بك يا سعود المنصور! جاري الدخول بالحساب التجريبي...');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onLoginSuccess(demoAccount);
      }, 400);
      return;
    }

    const currentUsers = getStoredUsers();
    const found = currentUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === identifier) ||
        u.name.toLowerCase() === identifier
    );

    // ⛔ حماية صارمة: منع الدخول التلقائي؛ إذا لم يكن الحساب مسجلاً يُرفض الطلب فوراً
    if (!found) {
      setError('بيانات الدخول غير صحيحة. لم يتم العثور على حساب مسجل بهذا البريد أو الاسم. يرجى التأكد من البيانات أو النقر على "إنشاء حساب جديد" بالأسفل.');
      setIsSubmitting(false);
      return;
    }

    // التحقق الفعلي من كلمة المرور
    const isPasswordValid = await verifyUserPassword(identifier, pass);
    if (!isPasswordValid) {
      setError('كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.');
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg(`أهلاً بك مجدداً يا ${found.name}! جاري الدخول...`);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onLoginSuccess(found);
    }, 500);
  };

  // Handle Google Sign In simulation (Prototype)
  const handleGoogleSignIn = (customEmail?: string, customName?: string) => {
    setError(null);
    setShowGoogleModal(false);
    setIsSubmitting(true);

    const email = customEmail || 'demo.google@wazan.test';
    const name = customName || 'مستخدم Google تجريبي';

    const googleUser: UserProfile = {
      name,
      email,
      hasPassword: false,
      ageGroup: '25 - 34 سنة',
      currentFocus: 'تحقيق التوازن الشامل وتحديد الأولويات',
      registeredAt: new Date().toISOString(),
    };

    saveStoredUser(googleUser);
    setSuccessMsg(`تم تسجيل الدخول بنجاح عبر حساب Google: ${email}`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onLoginSuccess(googleUser);
    }, 600);
  };

  // Handle Register New Account with Password Hash Storage
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    const pass = signupPassword.trim();

    if (!name) {
      setError('يرجى إدخال اسمك الكريم.');
      return;
    }
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('يرجى إدخال بريد إلكتروني صحيح (مثال: user@example.com).');
      return;
    }
    if (!pass || pass.length < 4) {
      setError('يرجى إدخال كلمة مرور تتكون من 4 خانات على الأقل.');
      return;
    }

    // التحقق الصارم من إلزامية حقول سياق المستفيد
    if (!signupWorkStatus || !signupWorkStatus.trim()) {
      setError('يرجى اختيار حالة العمل لإكمال التسجيل وتخصيص استشاراتك.');
      return;
    }
    if (!signupAgeGroup || !signupAgeGroup.trim()) {
      setError('يرجى اختيار الفئة العمرية لإكمال التسجيل وتخصيص استشاراتك.');
      return;
    }
    if (!signupHasDependents || !signupHasDependents.trim()) {
      setError('يرجى الإجابة عن سؤال المعالين لإكمال التسجيل وتخصيص استشاراتك.');
      return;
    }

    const isStudent = signupWorkStatus === 'طالب جامعي' || signupWorkStatus.includes('طالب');
    const isEmployeeOrBusiness =
      signupWorkStatus === 'موظف' ||
      signupWorkStatus === 'صاحب عمل/مستقل' ||
      signupWorkStatus.includes('صاحب عمل') ||
      signupWorkStatus.includes('مستقل');

    if (isStudent && !signupIncomeSource.trim()) {
      setError('يرجى اختيار مصدر دخلك الأساسي كطالب لإكمال التسجيل بدقة.');
      return;
    }
    if (isEmployeeOrBusiness && !signupIncomeStability.trim()) {
      setError('يرجى تحديد ما إذا كان دخلك ثابتاً أم متغيراً لإكمال خطتك بدقة.');
      return;
    }

    setIsSubmitting(true);

    const currentUsers = getStoredUsers();
    const existing = currentUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === email) ||
        u.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      setError('يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني أو الاسم. يرجى تسجيل الدخول بدلاً من ذلك.');
      setIsSubmitting(false);
      return;
    }

    // تشفير وحفظ بيانات الاعتماد
    const pwdHash = await hashPassword(pass);
    saveUserCredential(email, pwdHash);
    saveUserCredential(name.toLowerCase(), pwdHash);

    const newProfile: UserProfile = {
      name,
      email,
      hasPassword: true,
      ageGroup: signupAgeGroup,
      employmentStatus: signupWorkStatus,
      workStatus: signupWorkStatus,
      hasDependents: signupHasDependents,
      incomeSource: isStudent ? signupIncomeSource.trim() : undefined,
      incomeStability: isEmployeeOrBusiness ? signupIncomeStability.trim() : undefined,
      currentFocus: 'تحقيق التوازن الشامل وتحديد الأولويات',
      registeredAt: new Date().toISOString(),
    };

    saveStoredUser(newProfile);
    setSuccessMsg(`تم إنشاء حسابك في وزان بنجاح! أهلاً بك يا ${name}.`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onLoginSuccess(newProfile);
    }, 600);
  };

  // Handle Forgot Password Submit simulation
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return;
    }
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] p-4 sm:p-6 lg:p-8 py-10 relative overflow-hidden bg-[#F4F8F7] dark:bg-[#07111c] flex items-center justify-center transition-colors duration-300">
      {/* Subtle Ambient Mesh Halos matching landing palette */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity"
        aria-hidden="true"
        style={{
          background: isDark
            ? `
              radial-gradient(circle 600px at 20% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 70%),
              radial-gradient(circle 600px at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 70%)
            `
            : `
              radial-gradient(circle 600px at 15% 15%, rgba(11, 110, 114, 0.08) 0%, transparent 70%),
              radial-gradient(circle 600px at 85% 85%, rgba(147, 112, 190, 0.08) 0%, transparent 70%)
            `,
        }}
      />

      <div className="max-w-md w-full mx-auto relative z-10 space-y-6">
        {/* Minimal, Focused Header without Duplicate Logo Stack */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#0B6E72] dark:text-cyan-400 shadow-xs backdrop-blur-md">
            <span>{mode === 'login' ? 'بوابة الدخول التجريبية' : 'إنشاء حساب جديد'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white transition-colors">
            {mode === 'login' ? 'مرحباً بك في وزان' : 'ابدأ رحلة توازنك مع وزان'}
          </h1>
          <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-400 leading-relaxed transition-colors">
            {mode === 'login'
              ? 'سجّل دخولك لمتابعة تقييم مجالات حياتك واستشارة خبرائك الذكيين'
              : 'أنشئ حسابك خلال دقيقة واحدة لتشخيص أبعادك الثمانية'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/92 dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-md transition-colors">

          {/* Prominent Demo Mode Instant Access for Evaluators */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-teal-500/10 dark:from-amber-950/40 dark:via-amber-905/30 dark:to-teal-950/30 border border-amber-300 dark:border-amber-700/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <Zap className="w-4 h-4 fill-current text-amber-500 animate-pulse" />
                <span>خاص بلجان التحكيم والتقييم السريع ⚡</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold">
                بدون تسجيل
              </span>
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-300 leading-relaxed">
              تصفح فوري للمنصة بحساب تجريبي متكامل (سعود المنصور) يضم بيانات مكتملة عبر الجوانب الثمانية ومصفوفة أيزنهاور وخطة 30 يوماً.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onActivateDemo) {
                  onActivateDemo();
                } else {
                  onLoginSuccess(DEMO_USER_PROFILE);
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>تجربة فورية بحساب تجريبي (وضع المحكّمين)</span>
            </button>
          </div>

          {/* 1-Click Google Button (Clean Arabic Label with Aligned Icon) */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 dark:bg-[#102033] dark:hover:bg-[#162a42] text-[#0F172A] dark:text-white border border-slate-200 dark:border-slate-700 hover:border-[#0B6E72] dark:hover:border-cyan-500/50 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
            >
              <GoogleIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
              <span>المتابعة باستخدام Google</span>
            </button>

            {/* Subtle Clean Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" aria-hidden="true" />
              <span className="bg-white dark:bg-[#0c1827] px-3 text-xs font-semibold text-[#64748B] dark:text-slate-400 absolute transition-colors">
                أو بالبريد الإلكتروني
              </span>
            </div>
          </div>

          {/* Error Message with role="alert" */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[#0B6E72] dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Focused Form: LOGIN */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Quick Demo Fill Helper Banner (Password line removed per requirement 6) */}
              <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-[#112028] border border-teal-200/90 dark:border-teal-900/60 flex items-center justify-between gap-3 text-xs transition-colors">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 font-black text-[#0B6E72] dark:text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                    <span>حساب التجربة الجاهز:</span>
                  </div>
                  <div className="text-xs text-[#475569] dark:text-slate-300 mt-1 flex flex-wrap items-center gap-2" dir="ltr">
                    <span className="font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-slate-700">demo@wazan.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="px-3 py-1.5 rounded-xl bg-[#0B6E72] hover:bg-[#085255] dark:bg-[#0891B2] text-white text-xs font-black transition-all shadow-xs flex-shrink-0 cursor-pointer hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
                  title="تعبئة بيانات الحساب التجريبي بنقرة واحدة"
                >
                  تعبئة تلقائية ⚡
                </button>
              </div>

              <div>
                <label
                  htmlFor="auth-login-identifier"
                  className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1.5 transition-colors"
                >
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    id="auth-login-identifier"
                    type="text"
                    autoComplete="username"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني أو اسم المستخدم"
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-login-password"
                    className="block text-xs font-bold text-[#0F172A] dark:text-white transition-colors"
                  >
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotSubmitted(false);
                      setForgotEmail('');
                    }}
                    className="text-xs font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md px-1"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="auth-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#64748B] dark:text-slate-400 hover:text-[#0B6E72] dark:hover:text-cyan-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md"
                    aria-label="إظهار أو إخفاء كلمة المرور"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#0B6E72] focus:ring-[#0B6E72]"
                  />
                  <span>تذكرني في هذا الجهاز</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-black text-xs sm:text-sm shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-900/40 border border-teal-600/30 dark:border-cyan-400/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
              >
                <LogIn className="w-4 h-4 text-cyan-200 dark:text-cyan-300" aria-hidden="true" />
                <span>تسجيل الدخول</span>
              </button>
            </form>
          ) : (
            /* Focused Form: REGISTER */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-signup-name"
                  className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1.5 transition-colors"
                >
                  الاسم الكريم
                </label>
                <div className="relative">
                  <input
                    id="auth-signup-name"
                    type="text"
                    autoComplete="name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="مثال: يوسف، سارة، أحمد..."
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <User className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-signup-email"
                  className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1.5 transition-colors"
                >
                  البريد الإلكتروني <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="auth-signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all pl-10"
                    dir="rtl"
                  />
                  <Mail className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-signup-password"
                  className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1.5 transition-colors"
                >
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="auth-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="اختر كلمة مرور"
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#64748B] dark:text-slate-400 hover:text-[#0B6E72] dark:hover:text-cyan-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md"
                    aria-label="إظهار أو إخفاء كلمة المرور"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mandatory User Context Fields for Tailored Advice */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B6E72] dark:text-cyan-400 flex items-center gap-1">
                    <span>سياق المستفيد لتخصيص الاستشارات (إلزامي)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    لتفصيل خطتك بدقة
                  </span>
                </div>

                {/* 1. Work Status */}
                <div>
                  <label
                    htmlFor="auth-signup-work"
                    className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1"
                  >
                    حالة العمل <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="auth-signup-work"
                    required
                    value={signupWorkStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignupWorkStatus(val);
                      if (val !== 'طالب جامعي' && !val.includes('طالب')) {
                        setSignupIncomeSource('');
                      }
                      if (val !== 'موظف' && val !== 'صاحب عمل/مستقل' && !val.includes('صاحب عمل') && !val.includes('مستقل')) {
                        setSignupIncomeStability('');
                      }
                    }}
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all cursor-pointer"
                    dir="rtl"
                  >
                    <option value="">اختر حالة العمل...</option>
                    <option value="طالب جامعي">طالب جامعي</option>
                    <option value="موظف">موظف</option>
                    <option value="صاحب عمل/مستقل">صاحب عمل/مستقل</option>
                    <option value="متقاعد">متقاعد</option>
                    <option value="باحث عن عمل">باحث عن عمل</option>
                    <option value="غير ذلك">غير ذلك</option>
                  </select>
                </div>

                {/* Conditional Field: Student Primary Income Source */}
                {(signupWorkStatus === 'طالب جامعي' || signupWorkStatus.includes('طالب')) && (
                  <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-cyan-950/30 border border-teal-200/80 dark:border-cyan-900/40 animate-fadeIn">
                    <label
                      htmlFor="auth-signup-income-source"
                      className="block text-xs font-bold text-[#0B6E72] dark:text-cyan-300 mb-1"
                    >
                      مصدر دخلك الأساسي كطالب <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="auth-signup-income-source"
                      required
                      value={signupIncomeSource}
                      onChange={(e) => setSignupIncomeSource(e.target.value)}
                      className="w-full bg-white dark:bg-[#102033] border border-teal-300 dark:border-cyan-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all cursor-pointer font-medium"
                      dir="rtl"
                    >
                      <option value="">اختر مصدر الدخل الأساسي...</option>
                      <option value="مصروف من الأسرة">مصروف من الأسرة</option>
                      <option value="مكافأة جامعية/منحة">مكافأة جامعية/منحة</option>
                      <option value="عمل جزئي">عمل جزئي</option>
                      <option value="غير ذلك">غير ذلك</option>
                    </select>
                  </div>
                )}

                {/* Conditional Field: Employee / Business Owner Income Stability */}
                {(signupWorkStatus === 'موظف' ||
                  signupWorkStatus === 'صاحب عمل/مستقل' ||
                  signupWorkStatus.includes('صاحب عمل') ||
                  signupWorkStatus.includes('مستقل')) && (
                  <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-cyan-950/30 border border-teal-200/80 dark:border-cyan-900/40 animate-fadeIn">
                    <label
                      htmlFor="auth-signup-income-stability"
                      className="block text-xs font-bold text-[#0B6E72] dark:text-cyan-300 mb-1"
                    >
                      هل دخلك ثابت؟ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="auth-signup-income-stability"
                      required
                      value={signupIncomeStability}
                      onChange={(e) => setSignupIncomeStability(e.target.value)}
                      className="w-full bg-white dark:bg-[#102033] border border-teal-300 dark:border-cyan-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all cursor-pointer font-medium"
                      dir="rtl"
                    >
                      <option value="">اختر طبيعة الدخل...</option>
                      <option value="نعم (دخل ثابت)">نعم (دخل ثابت)</option>
                      <option value="لا (دخل متغير)">لا (دخل متغير)</option>
                    </select>
                  </div>
                )}

                {/* 2. Age Group */}
                <div>
                  <label
                    htmlFor="auth-signup-age"
                    className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1"
                  >
                    الفئة العمرية <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="auth-signup-age"
                    required
                    value={signupAgeGroup}
                    onChange={(e) => setSignupAgeGroup(e.target.value)}
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all cursor-pointer"
                    dir="rtl"
                  >
                    <option value="">اختر الفئة العمرية...</option>
                    <option value="أقل من 20 سنة">أقل من 20 سنة</option>
                    <option value="20 - 29 سنة">20 - 29 سنة</option>
                    <option value="30 - 39 سنة">30 - 39 سنة</option>
                    <option value="40 - 49 سنة">40 - 49 سنة</option>
                    <option value="50 سنة فأكثر">50 سنة فأكثر</option>
                  </select>
                </div>

                {/* 3. Has Dependents */}
                <div>
                  <label
                    htmlFor="auth-signup-dependents"
                    className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1"
                  >
                    هل لديك معالون؟ (أسرة أو أطفال) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="auth-signup-dependents"
                    required
                    value={signupHasDependents}
                    onChange={(e) => setSignupHasDependents(e.target.value)}
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0B6E72] transition-all cursor-pointer"
                    dir="rtl"
                  >
                    <option value="">اختر الإجابة...</option>
                    <option value="نعم">نعم</option>
                    <option value="لا">لا</option>
                  </select>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-black text-xs sm:text-sm shadow-md shadow-[#0B6E72]/20 dark:shadow-cyan-900/40 border border-teal-600/30 dark:border-cyan-400/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
              >
                <UserPlus className="w-4 h-4 text-cyan-200 dark:text-cyan-300" aria-hidden="true" />
                <span>إنشاء الحساب وبدء التقييم</span>
              </button>
            </form>
          )}

          {/* Bottom Toggle Link */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#334155] dark:text-slate-400">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md px-1"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#334155] dark:text-slate-400">
                لديك حساب بالفعل؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-[#0B6E72] dark:text-cyan-400 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md px-1"
                >
                  تسجيل الدخول
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Navigation Back & Security Note */}
        <div className="space-y-3 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#334155] dark:text-slate-400 hover:text-[#0B6E72] dark:hover:text-cyan-400 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md px-2 py-1"
          >
            <span>العودة للصفحة الرئيسية</span>
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* 2. Honest Prototype Privacy Note */}
          <div className="text-xs text-[#64748B] dark:text-slate-400 flex items-center justify-center gap-1.5 text-center px-4">
            <ShieldCheck className="w-4 h-4 text-[#0A757E] dark:text-cyan-400 flex-shrink-0" aria-hidden="true" />
            <span>بيانات حسابك وكلمة المرور مشفرة ومحمية محلياً على هذا الجهاز.</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (Accessible Dialog with Escape listener) */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-modal-title"
            className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-right space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0B6E72] dark:text-cyan-400" aria-hidden="true" />
                <h2 id="forgot-modal-title" className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                  استعادة كلمة المرور
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md"
                aria-label="إغلاق النافذة"
              >
                ✕
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[#0B6E72] dark:text-emerald-300 text-xs font-bold space-y-3">
                <p>هذه محاكاة: لم يُرسل أي بريد فعلياً.</p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] text-white text-xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] focus-visible:ring-offset-2"
                >
                  حسناً، فهمت
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-[#334155] dark:text-slate-400 leading-relaxed">
                  هذه محاكاة تجريبية لاستعادة كلمة المرور (لا يتم إرسال بريد إلكتروني فعلياً): أدخل بريدك لإتمام المحاكاة:
                </p>
                <div>
                  <label htmlFor="auth-forgot-email" className="sr-only">
                    البريد الإلكتروني
                  </label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#F8FAFA] dark:bg-[#102033] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#0B6E72] dark:focus:border-cyan-400"
                    dir="rtl"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] dark:bg-[#0E7490] dark:hover:bg-[#0891B2] text-white font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
                  >
                    إرسال الرابط التجريبي
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-[#334155] dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Google Sign-In Selector Modal (Accessible Dialog with Escape listener) */}
      {showGoogleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-modal-title"
            className="bg-white dark:bg-[#0c1827] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-right space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GoogleIcon className="w-5 h-5" />
                <h2 id="google-modal-title" className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                  المتابعة باستخدام Google
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md"
                aria-label="إغلاق النافذة"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#334155] dark:text-slate-400 leading-relaxed">
              محاكاة تسجيل الدخول عبر Google (لا يتصل فعلياً بحساب Google):
            </p>

            {/* Google Accounts List */}
            <div className="space-y-2">
              <button
                type="button"
                autoFocus
                onClick={() => handleGoogleSignIn('demo.google@wazan.test', 'مستخدم Google تجريبي')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#0B6E72] dark:hover:border-cyan-400 bg-[#F8FAFA] dark:bg-[#102033] hover:bg-white dark:hover:bg-[#162a42] flex items-center justify-between transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40">
                    ج
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-[#0F172A] dark:text-white">مستخدم Google تجريبي</span>
                    <span className="block text-xs text-[#64748B] dark:text-slate-400" dir="ltr">demo.google@wazan.test</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-[#0B6E72] dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSignIn('user.demo@wazan.test', 'مستخدم تجريبي آخر')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#0B6E72] dark:hover:border-cyan-400 bg-white dark:bg-[#0c1827] hover:bg-[#F8FAFA] dark:hover:bg-[#102033] flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
                    G
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-[#0F172A] dark:text-white">استخدام حساب Google تجريبي آخر</span>
                    <span className="block text-xs text-[#64748B] dark:text-slate-400">حساب تجريبي</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-[#334155] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] rounded-md px-2 py-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
