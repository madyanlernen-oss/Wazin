import React, { useState } from 'react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeAreaId } from '../types/lifeBalance';

interface RadarChartProps {
  scores: Record<LifeAreaId, number>;
  onSelectArea?: (areaId: LifeAreaId) => void;
  selectedAreaId?: LifeAreaId | null;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  scores,
  onSelectArea,
  selectedAreaId,
  size = 460,
}) => {
  const [hoveredArea, setHoveredArea] = useState<LifeAreaId | null>(null);

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
            <stop offset="0%" stopColor="#1b605b" stopOpacity="0.08" />
            <stop offset="65%" stopColor="#bd9240" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
          </radialGradient>

          {/* Polygon fill with Tadbeer signature teal & gold */}
          <linearGradient id="polygonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1b605b" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#25827b" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#bd9240" stopOpacity="0.45" />
          </linearGradient>

          {/* Subtle soft shadow filter for node elements */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1b605b" floodOpacity="0.25" />
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

        {/* Concentric rings with soothing beige tones */}
        {levels.map((lvl) => {
          const r = (lvl / 10) * radius;
          return (
            <g key={`ring-${lvl}`}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={lvl === 10 ? '#d4cbbe' : '#e8e2d5'}
                strokeWidth={lvl === 10 ? '1.5' : '1'}
                strokeDasharray={lvl === 10 ? 'none' : '3 3'}
              />
              <text
                x={center}
                y={center - r + 11}
                textAnchor="middle"
                className="fill-[#8a9995] text-[10px] font-sans font-medium select-none pointer-events-none"
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
              stroke={isSelected ? advisor.themeColor : '#e2dacb'}
              strokeWidth={isSelected ? '2' : '1'}
              className="transition-all duration-300"
            />
          );
        })}

        {/* User Balance Polygon */}
        <polygon
          points={points}
          fill="url(#polygonGrad)"
          stroke="#1b605b"
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
                stroke="#ffffff"
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
                fill={isSelected || isHovered ? '#faf7f2' : '#ffffff'}
                stroke={isSelected || isHovered ? advisor.themeColor : '#eae3d5'}
                strokeWidth={isSelected || isHovered ? '2' : '1'}
                className="transition-colors duration-200 drop-shadow-xs"
              />
              <text
                x={x}
                y={y - 2}
                textAnchor="middle"
                className="text-[11px] font-bold fill-[#1d2e2b] select-none pointer-events-none"
              >
                {advisor.avatarSvg} {advisor.title.split(' ')[0]} {advisor.title.split(' ')[1] || ''}
              </text>
              <text
                x={x}
                y={y + 11}
                textAnchor="middle"
                className="text-[10px] font-black select-none pointer-events-none"
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
          fill="#ffffff"
          stroke="#1b605b"
          strokeWidth="2.5"
          className="shadow-sm"
        />
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          className="text-[14px] font-black fill-[#1b605b] select-none pointer-events-none"
        >
          {averageScore}
        </text>
        <text
          x={center}
          y={center + 11}
          textAnchor="middle"
          className="text-[8.5px] font-bold fill-[#7a8c88] select-none pointer-events-none"
        >
          المعدل
        </text>
      </svg>

      {/* Interactive Helper Hint */}
      <div className="mt-3 text-xs text-[#536561] flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#eae3d5] shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#1b605b] animate-pulse"></span>
        <span>انقر على أي زاوية في العجلة لاستكشاف تفاصيل المجال أو استشارة المستشار</span>
      </div>
    </div>
  );
};
