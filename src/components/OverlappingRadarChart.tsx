import React, { useState } from 'react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeAreaId } from '../types/lifeBalance';

export interface ComparisonPeriod {
  id: string;
  name: string;
  color: string;
  scores: Record<LifeAreaId, number>;
  averageScore: number;
}

interface OverlappingRadarChartProps {
  periods: ComparisonPeriod[];
  selectedAreaId: LifeAreaId;
  onSelectArea: (areaId: LifeAreaId) => void;
  size?: number;
  theme?: 'light' | 'dark';
}

export const OverlappingRadarChart: React.FC<OverlappingRadarChartProps> = ({
  periods,
  selectedAreaId,
  onSelectArea,
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

  const getCoordinates = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none drop-shadow-md"
      >
        <defs>
          <filter id="overlapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={isDark ? '#06b6d4' : '#0B6E72'} floodOpacity={isDark ? '0.35' : '0.15'} />
          </filter>
        </defs>

        {/* Outer Circular Ambient Halo */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill={isDark ? '#071318' : '#FAF7F2'}
          className="transition-colors duration-300"
        />

        {/* Concentric rings */}
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
                strokeDasharray={lvl % 4 === 0 ? undefined : '3 3'}
              />
              <text
                x={center + 4}
                y={center - r + 11}
                fill={isDark ? '#94A3B8' : '#64748B'}
                fontSize="9"
                fontWeight="bold"
                className="select-none pointer-events-none"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Axis lines */}
        {ADVISORS_LIST.map((advisor, index) => {
          const { x, y } = getCoordinates(index, 10);
          const isSelected = selectedAreaId === advisor.id;
          return (
            <line
              key={`axis-${advisor.id}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={isSelected ? (isDark ? '#22D3EE' : '#0B6E72') : (isDark ? '#1a2c38' : '#e2e8f0')}
              strokeWidth={isSelected ? '2' : '1'}
              strokeDasharray={isSelected ? undefined : '2 2'}
            />
          );
        })}

        {/* OVERLAPPING POLYGONS for each selected period */}
        {periods.map((period, pIdx) => {
          const points = ADVISORS_LIST.map((adv, aIdx) => {
            const sc = Math.max(1, Math.min(10, period.scores[adv.id] || 0));
            const { x, y } = getCoordinates(aIdx, sc);
            return `${x},${y}`;
          }).join(' ');

          const isLatest = pIdx === periods.length - 1;

          return (
            <g key={`period-poly-${period.id}`}>
              <polygon
                points={points}
                fill={period.color}
                fillOpacity={isLatest ? 0.35 : 0.15}
                stroke={period.color}
                strokeWidth={isLatest ? 2.5 : 1.8}
                strokeDasharray={isLatest ? undefined : '4 3'}
                className="transition-all duration-500"
              />

              {/* Data points on polygon */}
              {ADVISORS_LIST.map((adv, aIdx) => {
                const sc = Math.max(1, Math.min(10, period.scores[adv.id] || 0));
                const { x, y } = getCoordinates(aIdx, sc);
                const isAreaSelected = selectedAreaId === adv.id;

                return (
                  <circle
                    key={`pt-${period.id}-${adv.id}`}
                    cx={x}
                    cy={y}
                    r={isAreaSelected ? 5.5 : isLatest ? 4 : 3}
                    fill={period.color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="transition-all duration-300"
                  />
                );
              })}
            </g>
          );
        })}

        {/* Center Balance Hub */}
        <circle
          cx={center}
          cy={center}
          r={26}
          fill={isDark ? '#0E1D24' : '#ffffff'}
          stroke={isDark ? '#0891B2' : '#0B6E72'}
          strokeWidth="2"
          className="shadow-sm"
        />
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          fill={isDark ? '#F1F5F9' : '#0F172A'}
          fontSize="13"
          fontWeight="900"
        >
          {periods[periods.length - 1]?.averageScore || '0.0'}
        </text>
        <text
          x={center}
          y={center + 11}
          textAnchor="middle"
          fill={isDark ? '#94A3B8' : '#64748B'}
          fontSize="8"
          fontWeight="bold"
        >
          الحالي
        </text>

        {/* Outer Interactive Badges for 8 Areas */}
        {ADVISORS_LIST.map((advisor, index) => {
          const { x, y, angle } = getCoordinates(index, 10);
          const isSelected = selectedAreaId === advisor.id;
          const isHovered = hoveredArea === advisor.id;

          const offsetDistance = 38;
          const badgeX = x + Math.cos(angle) * offsetDistance;
          const badgeY = y + Math.sin(angle) * offsetDistance;

          const currentVal = periods[periods.length - 1]?.scores[advisor.id] || 0;

          return (
            <g
              key={`badge-${advisor.id}`}
              onClick={() => onSelectArea(advisor.id)}
              onMouseEnter={() => setHoveredArea(advisor.id)}
              onMouseLeave={() => setHoveredArea(null)}
              className="cursor-pointer group transition-transform"
            >
              <foreignObject
                x={badgeX - 60}
                y={badgeY - 26}
                width={120}
                height={52}
                className="overflow-visible"
              >
                <div
                  className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all duration-200 border text-center shadow-xs select-none ${
                    isSelected
                      ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] scale-110 shadow-md ring-2 ring-[#0F6E6E] dark:ring-[#22D3EE]'
                      : isHovered
                      ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] scale-105'
                      : 'bg-white/95 dark:bg-[#0E1D24]/95 text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E343F]'
                  }`}
                  style={{
                    borderColor: isSelected ? (isDark ? '#22D3EE' : '#0F6E6E') : `${advisor.themeColor}50`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{advisor.avatarSvg}</span>
                    <span className="text-[11px] font-black leading-none truncate max-w-[85px]">
                      {advisor.title.split(' ')[0]} {advisor.title.split(' ')[1] || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5" dir="ltr">
                    <span
                      className="text-[10px] font-extrabold"
                      style={{ color: advisor.themeColor }}
                    >
                      {currentVal} / 10
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

