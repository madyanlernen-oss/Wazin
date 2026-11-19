import React, { useState } from 'react';

export interface WazanLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const WazanEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none flex-shrink-0 ${className}`}
      >
        <circle cx="50" cy="50" r="46" fill="#0d1b2a" stroke="#00e5ff" strokeWidth="3" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="#bd9240" strokeWidth="4" />
        <circle cx="50" cy="6" fill="#00e5ff" />
      </svg>
    );
  }

  return (
    <img
      src="/assets/wazan_logo.jpg"
      alt="شعار وازن"
      width={size}
      height={size}
      onError={() => setImgError(true)}
      className={`select-none flex-shrink-0 rounded-xl object-cover shadow-xs border border-white/10 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

export const WazanLogo: React.FC<WazanLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const pixelSizes = {
    sm: 32,
    md: 42,
    lg: 54,
    xl: 70,
  };

  const currentPx = pixelSizes[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem container */}
      <div className="relative flex items-center justify-center p-0.5 rounded-2xl bg-[#0b1726] border border-[#1b605b]/30 dark:border-cyan-500/40 shadow-md shadow-cyan-950/20 overflow-hidden">
        <WazanEmblem size={currentPx} />
      </div>

      {showText && (
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-[#0B6E72] dark:text-cyan-400 font-['Tajawal'] ${
                size === 'sm'
                  ? 'text-lg'
                  : size === 'md'
                  ? 'text-2xl'
                  : size === 'lg'
                  ? 'text-3xl'
                  : 'text-4xl'
              }`}
            >
              وازن
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B6E72]/10 dark:bg-cyan-950/60 text-[#0B6E72] dark:text-cyan-300 border border-[#0B6E72]/20 dark:border-cyan-800/40">
              توازن الحياة
            </span>
          </div>
          <span className="text-xs font-bold text-[#8A5A00] dark:text-amber-300 tracking-wide">
            توازن حياتك بوعي
          </span>
        </div>
      )}
    </div>
  );
};
