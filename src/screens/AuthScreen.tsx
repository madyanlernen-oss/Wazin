import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Check,
  KeyRound,
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import { getStoredUsers, saveStoredUser } from '../utils/storage';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onQuickDemoLogin: () => void;
  onCancel: () => void;
  initialMode?: 'login' | 'signup';
  theme?: 'light' | 'dark';
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24">
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
  onQuickDemoLogin,
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

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedUsers = getStoredUsers();

  // Handle Standard Login
  const handleLoginSubmit = (e: React.FormEvent) => {
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

    const found = savedUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === identifier) ||
        u.name.toLowerCase() === identifier ||
        (identifier === 'demo' && (u.email?.toLowerCase() === 'demo@wazan.ai' || u.name === 'demo' || u.name === 'سعود المنصور')) ||
        (identifier === 'wazan' && (u.email?.toLowerCase() === 'demo@wazan.ai' || u.name === 'demo' || u.name === 'سعود المنصور'))
    );

    if (found) {
      if (found.password && found.password !== pass) {
        setError('كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg(`أهلاً بك مجدداً يا ${found.name}! جاري الدخول...`);
      setTimeout(() => {
        onLoginSuccess(found);
      }, 500);
    } else {
      // Create new profile seamlessly
      const newProfile: UserProfile = {
        name: emailOrName.trim(),
        email: emailOrName.includes('@') ? emailOrName.trim() : `${emailOrName.trim()}@wazan.ai`,
        password: pass,
        ageGroup: '25 - 34 سنة',
        currentFocus: 'تحقيق التوازن الشامل',
        registeredAt: new Date().toISOString(),
      };
      saveStoredUser(newProfile);
      setSuccessMsg(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${newProfile.name}.`);
      setTimeout(() => {
        onLoginSuccess(newProfile);
      }, 500);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = (customEmail?: string, customName?: string) => {
    setError(null);
    setShowGoogleModal(false);
    setIsSubmitting(true);

    const email = customEmail || 'madyanlernen@gmail.com';
    const name = customName || 'مدين';

    const googleUser: UserProfile = {
      name,
      email,
      password: 'google_authenticated',
      ageGroup: '25 - 34 سنة',
      currentFocus: 'تحقيق التوازن الشامل وتحديد الأولويات',
      registeredAt: new Date().toISOString(),
    };

    saveStoredUser(googleUser);
    setSuccessMsg(`تم تسجيل الدخول بنجاح عبر حساب Google: ${email}`);

    setTimeout(() => {
      onLoginSuccess(googleUser);
    }, 600);
  };

  // Handle Register New Account
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = signupName.trim();
    const email = signupEmail.trim();
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
    if (!pass || pass.length < 3) {
      setError('يرجى إدخال كلمة مرور تتكون من 3 خانات على الأقل.');
      return;
    }

    setIsSubmitting(true);

    const newProfile: UserProfile = {
      name,
      email,
      password: pass,
      ageGroup: '25 - 34 سنة',
      currentFocus: 'تحقيق التوازن الشامل وتحديد الأولويات',
      registeredAt: new Date().toISOString(),
    };

    saveStoredUser(newProfile);
    setSuccessMsg(`تم إنشاء حسابك في وازن بنجاح! أهلاً بك يا ${name}.`);

    setTimeout(() => {
      onLoginSuccess(newProfile);
    }, 600);
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return;
    }
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] p-4 sm:p-6 lg:p-8 py-10 relative overflow-hidden bg-[#E6ECEB] dark:bg-[#07111c] flex items-center justify-center transition-colors duration-300">
      {/* Subtle Ambient Mesh Halos matching landing palette */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity"
        style={{
          background: isDark
            ? `
              radial-gradient(circle 600px at 20% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 70%),
              radial-gradient(circle 600px at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 70%)
            `
            : `
              radial-gradient(circle 600px at 15% 15%, rgba(188, 226, 224, 0.45) 0%, transparent 70%),
              radial-gradient(circle 600px at 85% 85%, rgba(224, 216, 238, 0.45) 0%, transparent 70%)
            `,
        }}
      />

      <div className="max-w-md w-full mx-auto relative z-10 space-y-6">
        {/* Minimal, Focused Header without Duplicate Logo Stack */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-[#eae3d5] dark:border-slate-800 text-xs font-bold text-[#0A757E] dark:text-cyan-400 shadow-xs backdrop-blur-md">
            <span>🔐</span>
            <span>{mode === 'login' ? 'بوابة الدخول الآمنة' : 'إنشاء حساب جديد'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#092226] dark:text-white transition-colors">
            {mode === 'login' ? 'مرحباً بك في وازن' : 'ابدأ رحلة توازنك مع وازن'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5a6e69] dark:text-slate-400 leading-relaxed transition-colors">
            {mode === 'login'
              ? 'سجّل دخولك لمتابعة تقييم مجالات حياتك واستشارة خبرائك الذكيين'
              : 'أنشئ حسابك خلال دقيقة واحدة لتشخيص أبعادك الثمانية'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-950/5 dark:shadow-black/40 backdrop-blur-md transition-colors">
          {/* 1-Click Google Button (Clean Arabic Label with Aligned Icon) */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-[#FAF7F2] dark:bg-[#102033] dark:hover:bg-[#162a42] text-[#092226] dark:text-white border border-[#ded7c8] dark:border-slate-700 hover:border-[#0A757E] dark:hover:border-cyan-500/50 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm group cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
              <span>المتابعة باستخدام Google</span>
            </button>

            {/* Subtle Clean Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-[#eae3d5] dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#0c1827] px-3 text-[11px] font-semibold text-[#8a9995] dark:text-slate-500 absolute transition-colors">
                أو بالبريد الإلكتروني
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[#0A757E] dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Focused Form: LOGIN */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#092226] dark:text-white mb-1.5 transition-colors">
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني أو اسم المستخدم"
                    className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0A757E] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-[#8d9f9a] dark:text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#092226] dark:text-white transition-colors">
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotSubmitted(false);
                      setForgotEmail('');
                    }}
                    className="text-[11px] font-bold text-[#0A757E] dark:text-cyan-400 hover:underline transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0A757E] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#8d9f9a] dark:text-slate-500 hover:text-[#0A757E] dark:hover:text-cyan-400"
                    aria-label="إظهار أو إخفاء كلمة المرور"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5a6e69] dark:text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#ded7c8] dark:border-slate-700 text-[#0A757E] focus:ring-[#0A757E]"
                  />
                  <span>تذكرني في هذا الجهاز</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-[#0A757E] hover:bg-[#075359] dark:bg-gradient-to-r dark:from-cyan-600 dark:to-teal-600 dark:hover:from-cyan-500 dark:hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-[#0A757E]/20 dark:shadow-cyan-900/40 border border-white/20 dark:border-cyan-400/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-200 dark:text-cyan-300" />
                <span>تسجيل الدخول</span>
              </button>
            </form>
          ) : (
            /* Focused Form: REGISTER */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#092226] dark:text-white mb-1.5 transition-colors">
                  الاسم الكريم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="مثال: يوسف، سارة، مدين..."
                    className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0A757E] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <User className="w-4 h-4 text-[#8d9f9a] dark:text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#092226] dark:text-white mb-1.5 transition-colors">
                  البريد الإلكتروني <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0A757E] transition-all pl-10"
                    dir="rtl"
                  />
                  <Mail className="w-4 h-4 text-[#8d9f9a] dark:text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#092226] dark:text-white mb-1.5 transition-colors">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="اختر كلمة مرور آمنة"
                    className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400 focus:ring-1 focus:ring-[#0A757E] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#8d9f9a] dark:text-slate-500 hover:text-[#0A757E] dark:hover:text-cyan-400"
                    aria-label="إظهار أو إخفاء كلمة المرور"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-[#0A757E] hover:bg-[#075359] dark:bg-gradient-to-r dark:from-cyan-600 dark:to-teal-600 dark:hover:from-cyan-500 dark:hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-[#0A757E]/20 dark:shadow-cyan-900/40 border border-white/20 dark:border-cyan-400/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-cyan-200 dark:text-cyan-300" />
                <span>إنشاء الحساب وبدء التقييم</span>
              </button>
            </form>
          )}

          {/* Polite, Clean Bottom Toggle Link (Clarifying Sign-In vs. Sign-Up) */}
          <div className="mt-6 pt-4 border-t border-[#eae3d5] dark:border-slate-800 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#5a6e69] dark:text-slate-400">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-bold text-[#0A757E] dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#5a6e69] dark:text-slate-400">
                لديك حساب بالفعل؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-[#0A757E] dark:text-cyan-400 hover:underline cursor-pointer"
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
            className="text-xs text-[#7a8c88] dark:text-slate-400 hover:text-[#0A757E] dark:hover:text-cyan-400 font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>العودة للصفحة الرئيسية</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div className="text-[11px] text-[#7a8c88] dark:text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A757E] dark:text-cyan-400" />
            <span>بياناتك وتفضيلاتك مشفرة ومحفوظة بأمان محلياً</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eae3d5] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0A757E] dark:text-cyan-400" />
                <span className="font-extrabold text-sm text-[#092226] dark:text-white">
                  استعادة كلمة المرور
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-xs font-bold text-[#7a8c88] hover:text-[#092226] dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[#0A757E] dark:text-emerald-300 text-xs font-bold space-y-2">
                <p>تم إرسال تعليمات إعادة التعيين إلى بريدك الإلكتروني.</p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-2 py-2 rounded-xl bg-[#0A757E] text-white text-xs font-bold"
                >
                  حسناً، فهمت
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور فوراً:
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#fbf9f5] dark:bg-[#102033] border border-[#ded7c8] dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-[#092226] dark:text-white placeholder-[#8d9f9a] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A757E] dark:focus:border-cyan-400"
                  dir="rtl"
                  autoFocus
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#0A757E] hover:bg-[#075359] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
                  >
                    إرسال الرابط
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-[#ded7c8] dark:border-slate-700 text-[#7a8c88] text-xs font-bold hover:bg-[#FAF7F2] dark:hover:bg-slate-800"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Google Sign-In Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eae3d5] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GoogleIcon className="w-5 h-5" />
                <span className="font-extrabold text-sm text-[#092226] dark:text-white">
                  المتابعة باستخدام Google
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs font-bold text-[#7a8c88] hover:text-[#092226] dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed">
              اختر حساب Google الخاص بك للمتابعة الفورية إلى منصة وازن:
            </p>

            {/* Google Accounts List */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSignIn('madyanlernen@gmail.com', 'مدين')}
                className="w-full p-3 rounded-2xl border border-[#ded7c8] dark:border-slate-700 hover:border-[#0A757E] dark:hover:border-cyan-400 bg-[#FAF7F2] dark:bg-[#102033] hover:bg-white dark:hover:bg-[#162a42] flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40">
                    م
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-[#092226] dark:text-white">مدين</span>
                    <span className="block text-[11px] text-[#7a8c88] dark:text-slate-400" dir="ltr">madyanlernen@gmail.com</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-[#0A757E] dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSignIn('user@gmail.com', 'مستخدم جديد')}
                className="w-full p-3 rounded-2xl border border-[#ded7c8] dark:border-slate-700 hover:border-[#0A757E] dark:hover:border-cyan-400 bg-white dark:bg-[#0c1827] hover:bg-[#FAF7F2] dark:hover:bg-[#102033] flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
                    G
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-[#092226] dark:text-white">استخدام حساب Google آخر</span>
                    <span className="block text-[10px] text-[#7a8c88] dark:text-slate-400">ربط فوري وآمن</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-[#7a8c88] dark:text-slate-400 hover:text-[#092226] dark:hover:text-white font-bold"
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
