import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F8F7] dark:bg-[#071318] flex items-center justify-center p-4 font-sans text-right transition-colors" dir="rtl">
          <div className="bg-white dark:bg-[#112028] border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 transition-colors">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-[#FBBF24]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">نعتذر، حدث خطأ غير متوقع</h2>
              <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                تم التقاط الخطأ بأمان للحفاظ على استقرار التطبيق وحماية بياناتك. يمكنك إعادة تحميل الصفحة للعودة فوراً.
              </p>
              {this.state.error?.message && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[11px] text-rose-800 dark:text-rose-300 text-left font-mono break-all" dir="ltr">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0B6E72] hover:bg-[#09575A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحديث الصفحة</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0B161C] dark:hover:bg-[#162734] text-[#334155] dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
