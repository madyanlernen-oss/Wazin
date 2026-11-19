import React, { useState, useId } from 'react';
import { LIFE_DOMAINS, LifeDomainItem } from '../data/lifeDomains';
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

// 16. Pure coordinate calculation helper at module level
export const getRadarCoordinates = (
  index: number,
  value: number,
  center: number,
  radius: number,
  angleStep: number
) => {
  const angle = index * angleStep - Math.PI / 2;
  const r = (value / 10) * radius;
  const x = center + r * Math.cos(angle);
  const y = center + r * Math.sin(angle);
  return { x, y, angle };
};

export const OverlappingRadarChart: React.FC<OverlappingRadarChartProps> = ({
  periods,
  selectedAreaId,
  onSelectArea,
  size = 460,
  theme = 'light',
}) => {
  const [hoveredArea, setHoveredArea] = useState<LifeAreaId | null>(null);
  const isDark = theme === 'dark';

  // 6 & 9. Unique accessible IDs for SVG filters and ARIA descriptions
  const filterId = useId();
  const titleId = useId();
  const descId = useId();

  // 8. Empty state rendering
  if (!periods || periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] w-full rounded-3xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
        <p className="text-sm font-bold text-[#64748B] dark:text-[#94A3B8]">
          لا توجد بيانات للمقارنة بعد
        </p>
      </div>
    );
  }

  // 7. Use LIFE_DOMAINS strictly (guarantees the 8 life dimensions only, excluding integrators)
  const domains = LIFE_DOMAINS;
  const totalAreas = domains.length;
  const angleStep = (Math.PI * 2) / totalAreas;

  // Geometry dimensions
  const baseSize = 460;
  const center = baseSize / 2;
  const radius = (baseSize - 110) / 2;

  // Concentric circle levels: 2, 4, 6, 8, 10
  const levels = [2, 4, 6, 8, 10];
  const latest = periods[periods.length - 1];

  // 2. Safe average score calculation
  const centerAvgText = latest && latest.averageScore > 0 ? latest.averageScore.toFixed(1) : '—';

  // 12. Contrast helper: strongColor on Light mode; verified color on Dark mode
  const getScoreTextColor = (domain: LifeDomainItem) => {
    if (!isDark) return domain.strongColor;
    if (domain.id === 'career') return '#a78bfa'; // WCAG 2.2 AA compliant against #0E1D24 (>6.1:1)
    return domain.color;
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none w-full">
      {/* 10. Accessible screen-reader table representation */}
      <div className="sr-only">
        <table>
          <caption>مقارنة درجات أبعاد الحياة عبر الفترات المحددة</caption>
          <thead>
            <tr>
              <th scope="col">البُعد</th>
              {periods.map((p) => (
                <th key={p.id} scope="col">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.id}>
                <th scope="row">{domain.name}</th>
                {periods.map((p) => {
                  const sc = p.scores[domain.id];
                  return (
                    <td key={`${p.id}-${domain.id}`}>
                      {sc !== undefined && sc > 0 ? `${sc} من 10` : 'غير مقيّم'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3 & 9. Responsive SVG with wide viewBox padding to prevent edge badge clipping */}
      <svg
        viewBox="-60 -30 580 520"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="w-full h-auto overflow-visible select-none drop-shadow-md"
        style={{ maxWidth: size }}
      >
        <title id={titleId}>مخطط المقارنة الراداري المتراكب لأبعاد الحياة</title>
        <desc id={descId}>
          {latest
            ? `يعرض مقارنة أبعاد الحياة عبر ${periods.length} فترات زمنية، بمتوسط تقييم حالي ${latest.averageScore.toFixed(1)} من 10.`
            : 'يعرض مقارنة أبعاد الحياة عبر فترات زمنية متعددة.'}
        </desc>

        <defs>
          {/* 6. Dynamic useId glow filter for the latest polygon */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor={isDark ? '#06b6d4' : '#0B6E72'}
              floodOpacity={isDark ? '0.35' : '0.15'}
            />
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
              {/* 11. Raised font size to 11 and improved light mode contrast to #475569 */}
              <text
                x={center + 4}
                y={center - r + 11}
                fill={isDark ? '#94A3B8' : '#475569'}
                fontSize="11"
                fontWeight="bold"
                className="select-none pointer-events-none"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Axis lines */}
        {domains.map((domain, index) => {
          const { x, y } = getRadarCoordinates(index, 10, center, radius, angleStep);
          const isSelected = selectedAreaId === domain.id;
          return (
            <line
              key={`axis-${domain.id}`}
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
          const isLatest = pIdx === periods.length - 1;

          // 1. Draw points with 0 for unrated/0 values (draws to center)
          const points = domains
            .map((domain, aIdx) => {
              const rawScore = period.scores[domain.id];
              const sc = rawScore !== undefined && rawScore > 0 ? Math.max(1, Math.min(10, rawScore)) : 0;
              const { x, y } = getRadarCoordinates(aIdx, sc, center, radius, angleStep);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <g key={`period-poly-${period.id}`}>
              <polygon
                points={points}
                fill={period.color}
                fillOpacity={isLatest ? 0.35 : 0.15}
                stroke={period.color}
                strokeWidth={isLatest ? 2.5 : 1.8}
                strokeDasharray={isLatest ? undefined : '4 3'}
                filter={isLatest ? `url(#${filterId})` : undefined}
                className="motion-safe:transition-all motion-safe:duration-500"
              />

              {/* 1 & 14. Data points on polygon with hollow markers for unrated domains */}
              {domains.map((domain, aIdx) => {
                const rawScore = period.scores[domain.id];
                const isUnrated = rawScore === undefined || rawScore === null || rawScore <= 0;
                const sc = isUnrated ? 0 : Math.max(1, Math.min(10, rawScore));
                const { x, y } = getRadarCoordinates(aIdx, sc, center, radius, angleStep);
                const isAreaSelected = selectedAreaId === domain.id;

                return (
                  <circle
                    key={`pt-${period.id}-${domain.id}`}
                    cx={x}
                    cy={y}
                    r={isAreaSelected ? 5.5 : isLatest ? 4 : 3}
                    fill={isUnrated ? (isDark ? '#071318' : '#FAF7F2') : period.color}
                    stroke={period.color}
                    strokeWidth={isUnrated ? 2 : 1.5}
                    strokeDasharray={isUnrated ? '2 2' : undefined}
                    className="motion-safe:transition-all motion-safe:duration-300"
                  />
                );
              })}
            </g>
          );
        })}

        {/* 6. Center Balance Hub (removed invalid shadow-sm attribute) */}
        <circle
          cx={center}
          cy={center}
          r={26}
          fill={isDark ? '#0E1D24' : '#ffffff'}
          stroke={isDark ? '#0891B2' : '#0B6E72'}
          strokeWidth="2"
        />

        {/* 2. Direction-safe center average score */}
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isDark ? '#F1F5F9' : '#0F172A'}
          fontSize="13"
          fontWeight="900"
          direction="ltr"
          unicodeBidi="isolate"
          className="font-mono select-none"
        >
          {centerAvgText}
        </text>

        {/* 11. Raised font size of "الحالي" to 11 */}
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isDark ? '#94A3B8' : '#475569'}
          fontSize="11"
          fontWeight="bold"
          className="select-none"
        >
          الحالي
        </text>

        {/* 4 & 5. Outer Interactive Badges for the 8 Domains */}
        {domains.map((domain, index) => {
          const { x, y, angle } = getRadarCoordinates(index, 10, center, radius, angleStep);
          const isSelected = selectedAreaId === domain.id;
          const isHovered = hoveredArea === domain.id;

          const offsetDistance = 38;
          const badgeX = x + Math.cos(angle) * offsetDistance;
          const badgeY = y + Math.sin(angle) * offsetDistance;

          const rawVal = latest?.scores[domain.id];
          const currentVal = rawVal !== undefined && rawVal > 0 ? rawVal : 0;

          return (
            <foreignObject
              key={`badge-${domain.id}`}
              x={badgeX - 60}
              y={badgeY - 26}
              width={120}
              height={54}
              className="overflow-visible"
            >
              {/* 3 & 5. Keyboard accessible button without transform scale for Safari compatibility */}
              <button
                type="button"
                onClick={() => onSelectArea(domain.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectArea(domain.id);
                  }
                }}
                onMouseEnter={() => setHoveredArea(domain.id)}
                onMouseLeave={() => setHoveredArea(null)}
                aria-pressed={isSelected}
                aria-label={`${domain.name}، ${currentVal > 0 ? `${currentVal} من 10` : 'غير مقيّم'}`}
                className={`w-full h-full flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all duration-200 border text-center shadow-xs select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 ${
                  isSelected
                    ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] shadow-md ring-2 ring-[#0F6E6E] dark:ring-[#22D3EE] border-[#0F6E6E] dark:border-[#22D3EE]'
                    : isHovered
                    ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] border-slate-300 dark:border-slate-600 ring-1 ring-slate-300 dark:ring-slate-700'
                    : 'bg-white/95 dark:bg-[#0E1D24]/95 text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E343F]'
                }`}
                style={{
                  borderColor: isSelected
                    ? isDark
                      ? '#22D3EE'
                      : '#0F6E6E'
                    : `${domain.color}50`,
                }}
              >
                {/* 4 & 11. Domain icon and name (text-xs) */}
                <div className="flex items-center gap-1">
                  <span className="text-xs" aria-hidden="true">
                    {domain.icon}
                  </span>
                  <span className="text-xs font-black leading-none truncate max-w-[88px]">
                    {domain.name}
                  </span>
                </div>

                {/* 1, 11, 12 & 13. Isolated score number (text-xs) or "—" for unrated */}
                <div className="flex items-center gap-1 mt-0.5" dir="ltr">
                  <span
                    className="text-xs font-extrabold"
                    style={{ color: getScoreTextColor(domain) }}
                  >
                    <span dir="ltr" className="[unicode-bidi:isolate] font-mono">
                      {currentVal > 0 ? `${currentVal} / 10` : '—'}
                    </span>
                  </span>
                </div>
              </button>
            </foreignObject>
          );
        })}
      </svg>

      {/* 15. Comprehensive Legend displaying Period Name, Color, and Line Style */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
        {periods.map((period, pIdx) => {
          const isLatest = pIdx === periods.length - 1;
          return (
            <div key={`legend-${period.id}`} className="flex items-center gap-1.5">
              <span
                className="w-5 h-0 border-t-2"
                style={{
                  borderColor: period.color,
                  borderStyle: isLatest ? 'solid' : 'dashed',
                }}
                aria-hidden="true"
              />
              <span className="font-bold text-[#334155] dark:text-slate-300">
                {period.name}
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                ({isLatest ? 'خط متصل' : 'متقطع'})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
