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
} from 'lucide-react';
import { UserProfile } from '../types/lifeBalance';
import { getStoredUsers, saveStoredUser } from '../utils/storage';
import { TadbeerLogo } from '../components/TadbeerLogo';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onQuickDemoLogin: () => void;
  onCancel: () => void;
  initialMode?: 'login' | 'signup';
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
}) => {
  // 3 Distinct options as requested:
  // 1- 'login' (تسجيل الدخول)
  // 2- 'google' (تسجيل الدخول عبر قوقل)
  // 3- 'signup' (تسجيل حساب جديد)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialMode);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states: Login
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Form states: Simple Register
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedUsers = getStoredUsers();

  // Option 1: Standard Login
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
        (identifier === 'demo' && u.email?.toLowerCase() === 'demo@tadbeer.ai')
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
      // Instant creation & login
      const newProfile: UserProfile = {
        name: emailOrName.trim(),
        email: emailOrName.includes('@') ? emailOrName.trim() : `${emailOrName.trim()}@tadbeer.ai`,
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

  // Option 2: Google Sign In
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

  // Option 3: Register New Account
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
      setError('يرجى إدخال البريد الإلكتروني (البريد الإلكتروني مطلوب).');
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
    setSuccessMsg(`تم إنشاء حسابك في تدبير بنجاح! أهلاً بك يا ${name}.`);

    setTimeout(() => {
      onLoginSuccess(newProfile);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] p-4 sm:p-6 lg:p-8 py-10 relative overflow-hidden bg-[#FAF7F2] flex items-center justify-center">
      {/* Subtle Warm Decorative Halos */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-[#1b605b]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-[#bd9240]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-6 space-y-2 text-center">
          <TadbeerLogo size="xl" showText={true} className="justify-center" />
          <p className="text-xs text-[#5a6e69] mt-2">
            بوابة الدخول لمنظومة التوازن وعجلة الحياة
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#1b605b]/5">
          {/* Header Description */}
          <div className="text-center mb-5 pb-3 border-b border-[#eae3d5]">
            <h2 className="text-xl font-black text-[#1d2e2b]">مرحباً بك في تدبير</h2>
            <p className="text-xs text-[#5a6e69] mt-1">
              اختر الطريقة المناسبة لك للمتابعة أو إنشاء حسابك
            </p>
          </div>

          {/* 3 Main Choice Tabs / Switcher */}
          <div className="grid grid-cols-2 rounded-2xl bg-[#FAF7F2] p-1.5 mb-5 border border-[#eae3d5]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
              }}
              className={`py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'login'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#5a6e69] hover:text-[#1b605b]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>1. تسجيل الدخول</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'signup'
                  ? 'bg-[#1b605b] text-white shadow-xs'
                  : 'text-[#5a6e69] hover:text-[#1b605b]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>3. تسجيل حساب جديد</span>
            </button>
          </div>

          {/* Option 2: Sign in with Google (Prominent 1-Click Button) */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#1d2e2b] border border-[#ded7c8] hover:border-[#1b605b] text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm group"
            >
              <GoogleIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
              <span>2. تسجيل الدخول عبر قوقل (Google)</span>
            </button>

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#eae3d5] w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-[#8a9995] absolute">
                أو بالبريد وكلمة المرور
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1b605b] text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Form: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1.5">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    placeholder="أدخل اسمك أو بريدك الإلكتروني"
                    className="w-full bg-[#fbf9f5] border border-[#ded7c8] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8d9f9a] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-[#8d9f9a] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1d2e2b]">
                    كلمة المرور
                  </label>
                  <span className="text-[11px] text-[#7a8c88]">
                    (أدخل أي كلمة مرور للبدء)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#fbf9f5] border border-[#ded7c8] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8d9f9a] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#8d9f9a] hover:text-[#1b605b]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5a6e69] pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#ded7c8] text-[#1b605b] focus:ring-[#1b605b]"
                  />
                  <span>تذكرني في هذا الجهاز</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1b605b]/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول والمتابعة</span>
              </button>
            </form>
          )}

          {/* 3. Form: REGISTER NEW ACCOUNT */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1.5">
                  الاسم الكريم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="مثال: يوسف، سارة، مدين..."
                    className="w-full bg-[#fbf9f5] border border-[#ded7c8] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8d9f9a] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all pl-10"
                    dir="rtl"
                    autoFocus
                  />
                  <User className="w-4 h-4 text-[#8d9f9a] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1.5">
                  البريد الإلكتروني <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#fbf9f5] border border-[#ded7c8] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8d9f9a] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all pl-10"
                    dir="rtl"
                  />
                  <Mail className="w-4 h-4 text-[#8d9f9a] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d2e2b] mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="اختر كلمة مرور آمنة"
                    className="w-full bg-[#fbf9f5] border border-[#ded7c8] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1d2e2b] placeholder-[#8d9f9a] focus:outline-none focus:border-[#1b605b] focus:ring-1 focus:ring-[#1b605b] transition-all pl-10"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3.5 text-[#8d9f9a] hover:text-[#1b605b]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1b605b] hover:bg-[#16504c] text-white font-black text-xs sm:text-sm shadow-md shadow-[#1b605b]/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء الحساب وبدء التقييم</span>
              </button>
            </form>
          )}


          {/* Footer Back Link */}
          <div className="mt-5 pt-3 border-t border-[#eae3d5] text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[#5a6e69] hover:text-[#1b605b] font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <span>العودة للصفحة الرئيسية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-4 text-center text-[11px] text-[#6b7d79] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1b605b]" />
          <span>بياناتك محفوظة بأمان على جهازك وفق أعلى معايير الخصوصية</span>
        </div>
      </div>

      {/* Google Sign-In Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eae3d5]">
              <div className="flex items-center gap-2">
                <GoogleIcon className="w-6 h-6" />
                <span className="font-extrabold text-sm text-[#1d2e2b]">
                  تسجيل الدخول عبر Google
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs font-bold text-[#7a8c88] hover:text-[#1d2e2b] p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#536561] leading-relaxed">
              اختر حساب Google الخاص بك للمتابعة الفورية إلى منصة تدبير:
            </p>

            {/* Google Accounts List */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSignIn('madyanlernen@gmail.com', 'مدين')}
                className="w-full p-3 rounded-2xl border border-[#ded7c8] hover:border-[#1b605b] bg-[#FAF7F2] hover:bg-white flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center border border-emerald-200">
                    م
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-[#1d2e2b]">مدين</span>
                    <span className="block text-[11px] text-[#7a8c88]" dir="ltr">madyanlernen@gmail.com</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-[#1b605b] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSignIn('user@gmail.com', 'مستخدم جديد')}
                className="w-full p-3 rounded-2xl border border-[#ded7c8] hover:border-[#1b605b] bg-white hover:bg-[#FAF7F2] flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center border border-blue-200">
                    G
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-[#1d2e2b]">استخدام حساب Google آخر</span>
                    <span className="block text-[10px] text-[#7a8c88]">ربط فوري وآمن</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-[#7a8c88] hover:text-[#1d2e2b] font-bold"
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
