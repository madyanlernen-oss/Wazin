import React, { useState } from 'react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeAreaId } from '../types/lifeBalance';

interface RadarChartProps {
  scores: Record<LifeAreaId, number>;
  onSelectArea?: (areaId: LifeAreaId) => void;
  selectedAreaId?: LifeAreaId | null;
  size?: number;
  theme?: 'light' | 'dark';
}

export const RadarChart: React.FC<RadarChartProps> = ({
  scores,
  onSelectArea,
  selectedAreaId,
  size = 460,
  theme = 'light',
}) => {
  const [hoveredArea, setHoveredArea] = useState<LifeAreaId | null>(null);
  const isDark = theme === 'dark';

  const center = size / 2;
  const radius = (size - 110) / 2;
  const totalAreas = ADVISORS_LIST.length;
  const angleStep = (Math.PI * 2) / totalAreas;

  // Concentric circle levels: 2, 4, 6, 8, 10
  const levels = [2, 4, 6, 8, 10];

  // Helper to get coordinates
  const getCoordinates = (index: number, value: number) => {
    // Start from top (- PI / 2) and go clockwise
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Build the polygon points for user scores
  const points = ADVISORS_LIST.map((advisor, index) => {
    const score = Math.max(1, Math.min(10, scores[advisor.id] || 0));
    const { x, y } = getCoordinates(index, score);
    return `${x},${y}`;
  }).join(' ');

  // Calculate overall balance score (average out of 10)
  const scoreValues = ADVISORS_LIST.map((a) => scores[a.id] || 0);
  const averageScore = scoreValues.length
    ? (scoreValues.reduce((acc, curr) => acc + curr, 0) / scoreValues.length).toFixed(1)
    : '0.0';

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none drop-shadow-md"
      >
        <defs>
          {/* Soothing warm ambient glow */}
          <radialGradient id="radarAmbient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? '#06b6d4' : '#0B6E72'} stopOpacity={isDark ? '0.12' : '0.08'} />
            <stop offset="65%" stopColor={isDark ? '#a855f7' : '#8A5A00'} stopOpacity={isDark ? '0.08' : '0.04'} />
            <stop offset="100%" stopColor={isDark ? '#071318' : '#FAFDFD'} stopOpacity="0" />
          </radialGradient>

          {/* Polygon fill with Wazan signature teal & amber */}
          <linearGradient id="polygonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#0891B2' : '#0B6E72'} stopOpacity={isDark ? '0.55' : '0.45'} />
            <stop offset="60%" stopColor={isDark ? '#06B6D4' : '#14B8A6'} stopOpacity={isDark ? '0.45' : '0.38'} />
            <stop offset="100%" stopColor={isDark ? '#8B5CF6' : '#8A5A00'} stopOpacity={isDark ? '0.50' : '0.40'} />
          </linearGradient>

          {/* Subtle soft shadow filter for node elements */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={isDark ? '#06b6d4' : '#0B6E72'} floodOpacity={isDark ? '0.45' : '0.25'} />
          </filter>
        </defs>

        {/* Outer Circular Ambient Halo */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="url(#radarAmbient)"
          className="transition-all duration-700"
        />

        {/* Concentric rings with soothing tones */}
        {levels.map((lvl) => {
          const r = (lvl / 10) * radius;
          return (
            <g key={`ring-${lvl}`}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={isDark ? (lvl === 10 ? '#223847' : '#162733') : (lvl === 10 ? '#cbd5e1' : '#e2e8f0')}
                strokeWidth={lvl === 10 ? '1.5' : '1'}
                strokeDasharray={lvl === 10 ? 'none' : '3 3'}
              />
              <text
                x={center}
                y={center - r + 11}
                textAnchor="middle"
                className={`text-[10px] font-sans font-medium select-none pointer-events-none ${
                  isDark ? 'fill-slate-400' : 'fill-slate-500'
                }`}
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Radial Axes Lines */}
        {ADVISORS_LIST.map((advisor, index) => {
          const { x, y } = getCoordinates(index, 10);
          const isSelected = selectedAreaId === advisor.id || hoveredArea === advisor.id;
          return (
            <line
              key={`axis-${advisor.id}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={isSelected ? advisor.themeColor : (isDark ? '#1a2c38' : '#e2e8f0')}
              strokeWidth={isSelected ? '2' : '1'}
              className="transition-all duration-300"
            />
          );
        })}

        {/* User Balance Polygon */}
        <polygon
          points={points}
          fill="url(#polygonGrad)"
          stroke={isDark ? '#22d3ee' : '#0B6E72'}
          strokeWidth="2.5"
          filter="url(#softGlow)"
          className="transition-all duration-500 opacity-95 hover:opacity-100"
        />

        {/* Data Markers & Clickable Nodes */}
        {ADVISORS_LIST.map((advisor, index) => {
          const score = Math.max(1, Math.min(10, scores[advisor.id] || 0));
          const { x, y } = getCoordinates(index, score);
          const isHovered = hoveredArea === advisor.id;
          const isSelected = selectedAreaId === advisor.id;

          return (
            <g
              key={`node-${advisor.id}`}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredArea(advisor.id)}
              onMouseLeave={() => setHoveredArea(null)}
              onClick={() => onSelectArea?.(advisor.id)}
            >
              {(isHovered || isSelected) && (
                <circle
                  cx={x}
                  cy={y}
                  r="14"
                  fill={advisor.themeColor}
                  fillOpacity="0.25"
                  className="animate-ping"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={isHovered || isSelected ? '7.5' : '5'}
                fill={advisor.themeColor}
                stroke={isDark ? '#112028' : '#ffffff'}
                strokeWidth="2.5"
                className="transition-all duration-300 shadow-md"
              />
            </g>
          );
        })}

        {/* Perimeter Axis Labels with Advisor Emoji and Score */}
        {ADVISORS_LIST.map((advisor, index) => {
          const score = scores[advisor.id] || 0;
          const labelDist = 12.0;
          const { x, y } = getCoordinates(index, labelDist);
          const isHovered = hoveredArea === advisor.id;
          const isSelected = selectedAreaId === advisor.id;

          return (
            <g
              key={`label-${advisor.id}`}
              className="cursor-pointer transition-transform duration-300 hover:scale-105"
              onMouseEnter={() => setHoveredArea(advisor.id)}
              onMouseLeave={() => setHoveredArea(null)}
              onClick={() => onSelectArea?.(advisor.id)}
            >
              <rect
                x={x - 48}
                y={y - 18}
                width="96"
                height="36"
                rx="18"
                fill={
                  isDark
                    ? isSelected || isHovered
                      ? '#162835'
                      : '#112028'
                    : isSelected || isHovered
                    ? '#F0F6F5'
                    : '#ffffff'
                }
                stroke={isSelected || isHovered ? advisor.themeColor : (isDark ? '#223847' : '#e2e8f0')}
                strokeWidth={isSelected || isHovered ? '2' : '1'}
                className="transition-colors duration-200 drop-shadow-xs"
              />
              <text
                x={x}
                y={y - 2}
                textAnchor="middle"
                className={`text-[11px] font-bold select-none pointer-events-none ${
                  isDark ? 'fill-white' : 'fill-[#0F172A]'
                }`}
              >
                {advisor.avatarSvg} {advisor.title.split(' ')[0]} {advisor.title.split(' ')[1] || ''}
              </text>
              {/* Score isolated with direction="ltr" so it never flips to 10/8.5 in RTL */}
              <text
                x={x}
                y={y + 11}
                textAnchor="middle"
                direction="ltr"
                unicodeBidi="isolate"
                className="text-[10px] font-black select-none pointer-events-none tabular-nums"
                fill={advisor.themeColor}
              >
                {score.toFixed(1)} / 10
              </text>
            </g>
          );
        })}

        {/* Center Balance Hub Circle */}
        <circle
          cx={center}
          cy={center}
          r="26"
          fill={isDark ? '#112028' : '#ffffff'}
          stroke={isDark ? '#22d3ee' : '#0B6E72'}
          strokeWidth="2.5"
          className="shadow-sm"
        />
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          className={`text-[14px] font-black select-none pointer-events-none ${
            isDark ? 'fill-cyan-400' : 'fill-[#0B6E72]'
          }`}
        >
          {averageScore}
        </text>
        <text
          x={center}
          y={center + 11}
          textAnchor="middle"
          className={`text-[8.5px] font-bold select-none pointer-events-none ${
            isDark ? 'fill-slate-400' : 'fill-slate-500'
          }`}
        >
          المعدل
        </text>
      </svg>

      {/* Interactive Helper Hint */}
      <div className="mt-3 text-xs text-[#334155] dark:text-slate-300 flex items-center gap-2 bg-white dark:bg-[#112028] px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#0B6E72] dark:bg-cyan-400 animate-pulse"></span>
        <span>انقر على أي زاوية في العجلة لاستكشاف تفاصيل المجال أو استشارة المستشار</span>
      </div>
    </div>
  );
};
