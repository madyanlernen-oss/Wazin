import React from 'react';

interface TadbeerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const TadbeerEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none flex-shrink-0 ${className}`}
    >
      {/* 4 Cardinal Petals (Teal: #1b605b) */}
      {/* Top */}
      <rect x="44" y="8" width="12" height="26" rx="6" fill="#1b605b" />
      {/* Bottom */}
      <rect x="44" y="66" width="12" height="26" rx="6" fill="#1b605b" />
      {/* Left */}
      <rect x="8" y="44" width="26" height="12" rx="6" fill="#1b605b" />
      {/* Right */}
      <rect x="66" y="44" width="26" height="12" rx="6" fill="#1b605b" />

      {/* 4 Diagonal Petals (Warm Gold: #bd9240) */}
      {/* Top-Right (45 deg) */}
      <g transform="rotate(45 50 50)">
        <rect x="44" y="10" width="12" height="24" rx="6" fill="#bd9240" />
      </g>
      {/* Bottom-Right (135 deg) */}
      <g transform="rotate(135 50 50)">
        <rect x="44" y="10" width="12" height="24" rx="6" fill="#bd9240" />
      </g>
      {/* Bottom-Left (225 deg) */}
      <g transform="rotate(225 50 50)">
        <rect x="44" y="10" width="12" height="24" rx="6" fill="#bd9240" />
      </g>
      {/* Top-Left (315 deg) */}
      <g transform="rotate(315 50 50)">
        <rect x="44" y="10" width="12" height="24" rx="6" fill="#bd9240" />
      </g>

      {/* Center Concentric Circles */}
      <circle cx="50" cy="50" r="11" fill="#fcfaf6" stroke="#1b605b" strokeWidth="3" />
      <circle cx="50" cy="50" r="4" fill="#bd9240" />
    </svg>
  );
};

export const TadbeerLogo: React.FC<TadbeerLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const pixelSizes = {
    sm: 32,
    md: 42,
    lg: 56,
    xl: 72,
  };

  const currentPx = pixelSizes[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem container */}
      <div className="relative flex items-center justify-center p-1 rounded-2xl bg-white border border-[#eae3d5] shadow-sm">
        <TadbeerEmblem size={currentPx} />
      </div>

      {showText && (
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-[#1b605b] font-['Tajawal'] ${
                size === 'sm'
                  ? 'text-lg'
                  : size === 'md'
                  ? 'text-2xl'
                  : size === 'lg'
                  ? 'text-3xl'
                  : 'text-4xl'
              }`}
            >
              تدبير
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1b605b]/10 text-[#1b605b] border border-[#1b605b]/20">
              توازن الحياة
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#b88d3b] tracking-wide">
            توازن حياتك بوعي
          </span>
        </div>
      )}
    </div>
  );
};
