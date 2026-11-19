import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
  showStatusBadge?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  className = '',
  disabled = false,
  showStatusBadge = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('جاهز للاستماع');
  const recognitionRef = useRef<any>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (disabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText('متصفحك لا يدعم التعرف الصوتي (استخدم Chrome أو Edge)');
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setStatusText('جاهز للاستماع');
      }, 3500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setStatusText('جاهز للاستماع');
      return;
    }

    try {
      // Re-create instance each time to prevent InvalidStateError in Web Speech API
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText('جارٍ الاستماع والتحدث باللغة العربية...');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += chunk;
          } else {
            interimTranscript += chunk;
          }
        }

        const textToUse = finalTranscript || interimTranscript;
        if (textToUse) {
          setStatusText(textToUse);
          onTranscript(textToUse);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        setIsListening(false);
        setStatusText(event?.error === 'not-allowed' ? 'تم رفض إذن الميكروفون' : 'حدث خطأ في التقاط الصوت');
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatusText('جاهز للاستماع');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setStatusText('تعذر تشغيل الميكروفون');
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-shrink-0">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'إيقاف التسجيل الصوتي' : 'تحدث بالصوت (تحويل الصوت إلى نص)'}
        className={
          className ||
          `w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
              : 'bg-slate-50 dark:bg-[#102033] border border-slate-200 dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:text-[#0B6E72] dark:hover:text-cyan-400 hover:border-[#0B6E72] dark:hover:border-cyan-500'
          } ${disabled ? 'opacity-40 pointer-events-none' : ''}`
        }
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {showStatusBadge && isListening && (
        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-300 animate-pulse px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
          {statusText}
        </span>
      )}
    </div>
  );
};
