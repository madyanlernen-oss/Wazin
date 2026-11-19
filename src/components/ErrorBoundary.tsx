import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showClearConfirm: boolean;
}

const STORAGE_PREFIX = 'wazan_'; // عدّلها حسب مفاتيحك الفعلية

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, showClearConfirm: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    // إرسال صامت للسجل؛ لا يجب أن يفشل هو نفسه
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          time: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* تجاهل */
    }
  }

  private handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, showClearConfirm: false });
  };

  private handleReload = () => window.location.reload();

  private handleGoHome = () => window.location.assign('/');

  private handleClearData = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* التخزين قد يكون محجوباً */
    }
    window.location.assign('/');
  };

  public render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { error, showClearConfirm } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div
        role="alert"
        dir="rtl"
        className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] flex items-center justify-center p-4 text-right transition-colors"
      >
        <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-[#FBBF24]">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#0F172A] dark:text-white">
              نعتذر، حدث خطأ غير متوقع
            </h2>
            <p className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
              تم التقاط الخطأ بأمان للحفاظ على استقرار التطبيق. جرّب المحاولة مرة أخرى، وإن تكرر الخطأ فأعد تحميل الصفحة.
            </p>

            {error?.message && (
              <details className="text-start">
                <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  تفاصيل تقنية
                </summary>
                {isDev ? (
                  <div
                    dir="ltr"
                    className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 text-left font-mono break-all"
                  >
                    {error.message}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    تم تسجيل الخطأ تلقائياً لمراجعته.
                  </p>
                )}
              </details>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="py-3 px-4 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>حاول مرة أخرى</span>
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>إعادة تحميل</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>الرئيسية</span>
              </button>
            </div>

            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => this.setState({ showClearConfirm: true })}
                className="text-xs text-slate-500 dark:text-slate-400 underline cursor-pointer"
              >
                المشكلة تتكرر؟ مسح البيانات المحلية
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 space-y-2">
                <p className="text-xs text-rose-800 dark:text-rose-300">
                  سيحذف هذا تقييماتك وأهدافك المحفوظة على هذا الجهاز. هل أنت متأكد؟
                </p>
                <button
                  type="button"
                  onClick={this.handleClearData}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>نعم، امسح وأعد التشغيل</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
