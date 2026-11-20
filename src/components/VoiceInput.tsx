import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  className?: string;
  disabled?: boolean;
  showStatusBadge?: boolean;
  resetKey?: string | number;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  currentValue = '',
  className = '',
  disabled = false,
  showStatusBadge = true,
  resetKey,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const errorTimeoutRef = useRef<any>(null);

  // Safe abort helper
  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Safe stop helper (lets final result settle)
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      abortListening();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [abortListening]);

  // Clean up when station/advisor switches or when input becomes disabled
  useEffect(() => {
    if (isListening) {
      abortListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, disabled]);

  const toggleListening = () => {
    if (disabled) return;

    // Clear any previous error message
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setErrorMessage(null);

    // If currently listening, stop it cleanly
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setErrorMessage('المتصفح لا يدعم التعرف الصوتي (يرجى تجربة Chrome أو Edge)');
      errorTimeoutRef.current = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return;
    }

    try {
      // Capture the current input text to append new speech cleanly
      baseTextRef.current = (currentValue || '').trim();

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentSpoken = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (currentSpoken) {
          const base = baseTextRef.current;
          const combined = base ? `${base} ${currentSpoken}` : currentSpoken;
          onTranscript(combined);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error;
        console.warn('VoiceInput speech recognition error:', err);
        setIsListening(false);
        recognitionRef.current = null;

        let msg = 'حدث خطأ في التقاط الصوت، حاول مجدداً';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          msg = 'تم رفض إذن الميكروفون. يرجى تفعيله من إعدادات المتصفح.';
        } else if (err === 'no-speech') {
          msg = 'لم يتم رصد أي صوت، تحدث بصوت واضح وحاول مجدداً.';
        } else if (err === 'network') {
          msg = 'تعذر الاتصال بخدمة التعرف الصوتي، تحقق من اتصالك.';
        } else if (err === 'audio-capture') {
          msg = 'لم يتم العثور على ميكروفون صالح في جهازك.';
        }

        setErrorMessage(msg);
        errorTimeoutRef.current = setTimeout(() => {
          setErrorMessage(null);
        }, 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      recognitionRef.current = null;
      setErrorMessage('تعذر تشغيل الميكروفون، يرجى المحاولة ثانية');
      errorTimeoutRef.current = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="relative inline-flex items-center flex-shrink-0">
      {/* Floating Status / Error Feedback Badge (No layout displacement) */}
      {showStatusBadge && (isListening || errorMessage) && (
        <div
          role={errorMessage ? 'alert' : 'status'}
          aria-live={errorMessage ? 'assertive' : 'polite'}
          className={`absolute bottom-full mb-2.5 start-0 z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-lg backdrop-blur-md animate-fadeIn select-none pointer-events-none transition-all ${
            errorMessage
              ? 'bg-amber-50 dark:bg-amber-950/95 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 shadow-amber-900/10'
              : 'bg-rose-50 dark:bg-rose-950/95 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-700/80 shadow-rose-900/10'
          }`}
        >
          {errorMessage ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <span>جارٍ الاستماع... تحدث الآن</span>
            </>
          )}
        </div>
      )}

      {/* Touch-friendly, high-contrast Microphone Button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? 'إيقاف التسجيل الصوتي' : 'بدء الإدخال الصوتي باللغة العربية'}
        title={isListening ? 'إيقاف التسجيل الصوتي' : 'تحدث بالصوت (تحويل الصوت إلى نص)'}
        aria-pressed={isListening}
        className={
          className ||
          `w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827] ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 animate-pulse border border-rose-500'
              : 'bg-slate-100 hover:bg-slate-200/90 dark:bg-[#102033] dark:hover:bg-[#162a42] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0B6E72] dark:hover:text-cyan-300 hover:border-[#0B6E72] dark:hover:border-cyan-500'
          } ${disabled ? 'opacity-40 pointer-events-none' : ''}`
        }
      >
        {isListening ? (
          <MicOff className="w-5 h-5 animate-pulse" aria-hidden="true" />
        ) : (
          <Mic className="w-5 h-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};
