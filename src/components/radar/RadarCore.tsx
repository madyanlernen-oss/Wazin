import React, { useState, useId } from 'react';
import { LIFE_DOMAINS, LifeDomainItem } from '../../data/lifeDomains';
import { LifeAreaId } from '../../types/lifeBalance';

export interface RadarSeriesItem {
  id: string;
  name: string;
  color: string;
  scores: Record<LifeAreaId, number>;
  averageScore?: number;
}

export interface RadarCoreProps {
  series: RadarSeriesItem[];
  selectedAreaId?: LifeAreaId | null;
  onSelectArea?: (areaId: LifeAreaId) => void;
  size?: number;
  theme?: 'light' | 'dark';
  variant: 'single' | 'compare';
}

/**
 * Pure coordinate calculation helper.
 * Supports both signatures for full backward compatibility:
 * 1) getRadarCoordinates(center, radius, angleStep, index, value)
 * 2) getRadarCoordinates(index, value, center, radius, angleStep)
 */
export function getRadarCoordinates(
  center: number,
  radius: number,
  angleStep: number,
  index: number,
  value: number
): { x: number; y: number; angle: number };
export function getRadarCoordinates(
  index: number,
  value: number,
  center: number,
  radius: number,
  angleStep: number
): { x: number; y: number; angle: number };
export function getRadarCoordinates(
  arg1: number,
  arg2: number,
  arg3: number,
  arg4?: number,
  arg5?: number
): { x: number; y: number; angle: number } {
  let center: number;
  let radius: number;
  let angleStep: number;
  let index: number;
  let value: number;

  if (arg1 <= 10 && arg3 > 10 && arg4 !== undefined && arg5 !== undefined) {
    index = arg1;
    value = arg2;
    center = arg3;
    radius = arg4;
    angleStep = arg5;
  } else {
    center = arg1;
    radius = arg2;
    angleStep = arg3;
    index = arg4 ?? 0;
    value = arg5 ?? 0;
  }

  const angle = index * angleStep - Math.PI / 2;
  const r = (value / 10) * radius;
  const x = center + r * Math.cos(angle);
  const y = center + r * Math.sin(angle);
  return { x, y, angle };
}

export const RadarCore: React.FC<RadarCoreProps> = ({
  series,
  selectedAreaId,
  onSelectArea,
  size = 460,
  theme = 'light',
  variant,
}) => {
  const [hoveredArea, setHoveredArea] = useState<LifeAreaId | null>(null);
  const isDark = theme === 'dark';

  const filterId = useId();
  const ambientGradId = useId();
  const polyGradId = useId();
  const titleId = useId();
  const descId = useId();

  // Empty state handling
  if (!series || series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] w-full rounded-3xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
        <p className="text-sm font-bold text-[#64748B] dark:text-[#94A3B8]">
          لا توجد بيانات للمقارنة بعد
        </p>
      </div>
    );
  }

  // 8 life domains strictly
  const domains = LIFE_DOMAINS;
  const totalAreas = domains.length;
  const angleStep = (Math.PI * 2) / totalAreas;

  // Geometry dimensions
  const baseSize = 460;
  const center = baseSize / 2;
  const radius = (baseSize - 110) / 2;
  const levels = [2, 4, 6, 8, 10];

  // Latest series is the active reference
  const latestSeries = series[series.length - 1];

  // Calculate average for rated areas only (score > 0)
  const ratedScores = domains
    .map((d) => latestSeries?.scores[d.id])
    .filter((s): s is number => typeof s === 'number' && s > 0);

  const centerAvgText =
    latestSeries && ratedScores.length > 0
      ? (ratedScores.reduce((acc, curr) => acc + curr, 0) / ratedScores.length).toFixed(1)
      : latestSeries?.averageScore !== undefined && latestSeries.averageScore > 0
      ? latestSeries.averageScore.toFixed(1)
      : '—';

  // Contrast helper for scores: strongColor in light mode, high-contrast color / lighter tint in dark mode
  const getScoreTextColor = (domain: LifeDomainItem) => {
    if (!isDark) return domain.strongColor;
    if (domain.id === 'career') return '#818cf8'; // indigo-400 (>5.9:1 on dark)
    if (domain.id === 'personal') return '#a78bfa'; // violet-400 (>6.5:1 on dark)
    return domain.color;
  };

  // Keyboard navigation across the 8 domains with roving tabindex
  const handleKeyDown = (e: React.KeyboardEvent, index: number, domainId: LifeAreaId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectArea?.(domainId);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % domains.length;
      const nextDomain = domains[nextIndex];
      onSelectArea?.(nextDomain.id);
      const el = document.getElementById(`radar-domain-${nextDomain.id}`);
      el?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + domains.length) % domains.length;
      const prevDomain = domains[prevIndex];
      onSelectArea?.(prevDomain.id);
      const el = document.getElementById(`radar-domain-${prevDomain.id}`);
      el?.focus();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none w-full">
      {/* Screen-reader accessible data table */}
      <div className="sr-only">
        <table>
          <caption>
            {variant === 'single'
              ? 'درجات توازن الحياة في أبعاد الحياة الثمانية'
              : 'مقارنة درجات أبعاد الحياة عبر الفترات المحددة'}
          </caption>
          <thead>
            <tr>
              <th scope="col">البُعد</th>
              {series.map((s) => (
                <th key={s.id} scope="col">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.id}>
                <th scope="row">{domain.name}</th>
                {series.map((s) => {
                  const sc = s.scores[domain.id];
                  return (
                    <td key={`${s.id}-${domain.id}`}>
                      {sc !== undefined && sc > 0 ? `${sc.toFixed(1)} من 10` : 'غير مقيّم'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SVG Canvas with wide viewBox padding to prevent edge badge clipping */}
      <svg
        viewBox="-60 -30 580 520"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="w-full h-auto overflow-visible select-none drop-shadow-md"
        style={{ maxWidth: size }}
      >
        <title id={titleId}>
          {variant === 'single'
            ? 'مخطط التوازن الراداري لأبعاد الحياة'
            : 'مخطط المقارنة الراداري المتراكب لأبعاد الحياة'}
        </title>
        <desc id={descId}>
          {variant === 'single'
            ? `يعرض درجات توازن الحياة في 8 أبعاد، بمتوسط تقييم ${centerAvgText} من 10.`
            : `يعرض مقارنة أبعاد الحياة عبر ${series.length} فترات زمنية، بمتوسط تقييم حالي ${centerAvgText} من 10.`}
        </desc>

        <defs>
          {variant === 'single' && (
            <>
              {/* Soothing warm ambient glow for single chart */}
              <radialGradient id={ambientGradId} cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor={isDark ? '#06b6d4' : '#0B6E72'}
                  stopOpacity={isDark ? '0.12' : '0.08'}
                />
                <stop
                  offset="65%"
                  stopColor={isDark ? '#a855f7' : '#8A5A00'}
                  stopOpacity={isDark ? '0.08' : '0.04'}
                />
                <stop
                  offset="100%"
                  stopColor={isDark ? '#071318' : '#FAFDFD'}
                  stopOpacity="0"
                />
              </radialGradient>

              {/* Polygon fill with Wazan signature teal & amber */}
              <linearGradient id={polyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={isDark ? '#0891B2' : '#0B6E72'}
                  stopOpacity={isDark ? '0.55' : '0.45'}
                />
                <stop
                  offset="60%"
                  stopColor={isDark ? '#06B6D4' : '#14B8A6'}
                  stopOpacity={isDark ? '0.45' : '0.38'}
                />
                <stop
                  offset="100%"
                  stopColor={isDark ? '#8B5CF6' : '#8A5A00'}
                  stopOpacity={isDark ? '0.50' : '0.40'}
                />
              </linearGradient>

              {/* Soft glow drop shadow */}
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="3"
                  floodColor={isDark ? '#06b6d4' : '#0B6E72'}
                  floodOpacity={isDark ? '0.45' : '0.25'}
                />
              </filter>
            </>
          )}

          {variant === 'compare' && (
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor={isDark ? '#06b6d4' : '#0B6E72'}
                floodOpacity={isDark ? '0.35' : '0.15'}
              />
            </filter>
          )}
        </defs>

        {/* Outer Circular Ambient Halo */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill={variant === 'single' ? `url(#${ambientGradId})` : isDark ? '#071318' : '#FAF7F2'}
          className={
            variant === 'single'
              ? 'motion-safe:transition-all motion-safe:duration-700'
              : 'motion-safe:transition-colors motion-safe:duration-300'
          }
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
                stroke={
                  isDark
                    ? lvl === 10
                      ? '#223847'
                      : '#162733'
                    : lvl === 10
                    ? '#cbd5e1'
                    : '#e2e8f0'
                }
                strokeWidth={lvl === 10 ? '1.5' : '1'}
                strokeDasharray={lvl === 10 ? undefined : '3 3'}
              />
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

        {/* Radial Axis Lines */}
        {domains.map((domain, index) => {
          const { x, y } = getRadarCoordinates(center, radius, angleStep, index, 10);
          const isSelected = selectedAreaId === domain.id || hoveredArea === domain.id;
          return (
            <line
              key={`axis-${domain.id}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={
                isSelected
                  ? isDark
                    ? '#22D3EE'
                    : domain.color
                  : isDark
                  ? '#1a2c38'
                  : '#e2e8f0'
              }
              strokeWidth={isSelected ? '2' : '1'}
              strokeDasharray={variant === 'compare' && !isSelected ? '2 2' : undefined}
              className="motion-safe:transition-all motion-safe:duration-300 pointer-events-none"
            />
          );
        })}

        {/* SINGLE VARIANT: User Balance Polygon */}
        {variant === 'single' && latestSeries && (
          <polygon
            points={domains
              .map((domain, aIdx) => {
                const raw = latestSeries.scores[domain.id];
                const sc = raw !== undefined && raw > 0 ? Math.max(1, Math.min(10, raw)) : 0;
                const { x, y } = getRadarCoordinates(center, radius, angleStep, aIdx, sc);
                return `${x},${y}`;
              })
              .join(' ')}
            fill={`url(#${polyGradId})`}
            stroke={isDark ? '#22D3EE' : '#0B6E72'}
            strokeWidth="2.5"
            filter={`url(#${filterId})`}
            className="motion-safe:transition-all motion-safe:duration-500 opacity-95 hover:opacity-100 pointer-events-none"
          />
        )}

        {/* COMPARE VARIANT: Overlapping Polygons for each period */}
        {variant === 'compare' &&
          series.map((period, pIdx) => {
            const isLatest = pIdx === series.length - 1;
            const points = domains
              .map((domain, aIdx) => {
                const raw = period.scores[domain.id];
                const sc = raw !== undefined && raw > 0 ? Math.max(1, Math.min(10, raw)) : 0;
                const { x, y } = getRadarCoordinates(center, radius, angleStep, aIdx, sc);
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

                {/* Data points along period polygon */}
                {domains.map((domain, aIdx) => {
                  const raw = period.scores[domain.id];
                  const isUnrated = raw === undefined || raw === null || raw <= 0;
                  const sc = isUnrated ? 0 : Math.max(1, Math.min(10, raw));
                  const { x, y } = getRadarCoordinates(center, radius, angleStep, aIdx, sc);
                  const isAreaSelected = selectedAreaId === domain.id;

                  return (
                    <circle
                      key={`pt-${period.id}-${domain.id}`}
                      cx={x}
                      cy={y}
                      r={isAreaSelected ? 5.5 : isLatest ? 4 : 3}
                      fill={isUnrated ? (isDark ? '#071318' : '#FAFDFD') : period.color}
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

        {/* Center Balance Hub Circle */}
        <circle
          cx={center}
          cy={center}
          r={26}
          fill={isDark ? '#0E1D24' : '#ffffff'}
          stroke={isDark ? (variant === 'single' ? '#22D3EE' : '#0891B2') : '#0B6E72'}
          strokeWidth="2.5"
        />
        {/* Center average score (isolated LTR) */}
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isDark ? (variant === 'single' ? '#22D3EE' : '#F1F5F9') : '#0B6E72'}
          fontSize="14"
          fontWeight="900"
          direction="ltr"
          style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
          className="font-mono select-none pointer-events-none"
        >
          {centerAvgText}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isDark ? '#94A3B8' : '#64748B'}
          fontSize="11"
          fontWeight="bold"
          className="select-none pointer-events-none"
        >
          {variant === 'single' ? 'المعدل' : 'الحالي'}
        </text>

        {/* Unified Interactive Group per domain (Combines full sector slice + vertex node + outer badge) */}
        {domains.map((domain, index) => {
          const { x: axisX, y: axisY, angle } = getRadarCoordinates(center, radius, angleStep, index, 10);
          const isSelected = selectedAreaId === domain.id;
          const isHovered = hoveredArea === domain.id;

          // 45-degree annular sector wedge covering the entire slice from center hub to perimeter
          const rInner = 28;
          const rOuter = radius + 15;
          const startAngle = angle - angleStep / 2;
          const endAngle = angle + angleStep / 2;

          const p1x = center + rInner * Math.cos(startAngle);
          const p1y = center + rInner * Math.sin(startAngle);
          const p2x = center + rOuter * Math.cos(startAngle);
          const p2y = center + rOuter * Math.sin(startAngle);
          const p3x = center + rOuter * Math.cos(endAngle);
          const p3y = center + rOuter * Math.sin(endAngle);
          const p4x = center + rInner * Math.cos(endAngle);
          const p4y = center + rInner * Math.sin(endAngle);

          const sectorPath = `M ${p1x} ${p1y} L ${p2x} ${p2y} A ${rOuter} ${rOuter} 0 0 1 ${p3x} ${p3y} L ${p4x} ${p4y} A ${rInner} ${rInner} 0 0 0 ${p1x} ${p1y} Z`;

          const offsetDistance = 38;
          const badgeX = axisX + Math.cos(angle) * offsetDistance;
          const badgeY = axisY + Math.sin(angle) * offsetDistance;

          const rawVal = latestSeries?.scores[domain.id];
          const isUnrated = rawVal === undefined || rawVal === null || rawVal <= 0;
          const currentVal = isUnrated ? 0 : Math.max(1, Math.min(10, rawVal));
          const { x: nodeX, y: nodeY } = getRadarCoordinates(center, radius, angleStep, index, currentVal);

          const isRovingActive = selectedAreaId ? selectedAreaId === domain.id : index === 0;

          return (
            <g
              key={`domain-${domain.id}`}
              id={`radar-domain-${domain.id}`}
              role="button"
              tabIndex={isRovingActive ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={`${domain.name}، ${currentVal > 0 ? `${currentVal.toFixed(1)} من 10` : 'غير مقيّم'}`}
              className="cursor-pointer group outline-none"
              onClick={() => onSelectArea?.(domain.id)}
              onMouseEnter={() => setHoveredArea(domain.id)}
              onMouseLeave={() => setHoveredArea(null)}
              onKeyDown={(e) => handleKeyDown(e, index, domain.id)}
            >
              {/* Full Sector Slice Area (Interactive Wedge covering the whole dimension sector) */}
              <path
                d={sectorPath}
                fill={domain.color}
                fillOpacity={
                  isSelected
                    ? isDark
                      ? 0.18
                      : 0.12
                    : isHovered
                    ? isDark
                      ? 0.10
                      : 0.06
                    : 0
                }
                stroke={
                  isSelected
                    ? isDark
                      ? '#22D3EE'
                      : domain.color
                    : isHovered
                    ? `${domain.color}60`
                    : 'transparent'
                }
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0}
                strokeDasharray={isSelected ? '4 3' : undefined}
                className="motion-safe:transition-all motion-safe:duration-200 cursor-pointer"
                style={{ pointerEvents: 'all' }}
              />

              {/* Single variant vertex data marker & halo */}
              {variant === 'single' && (
                <g className="pointer-events-auto">
                  {(isHovered || isSelected) && (
                    <circle
                      cx={nodeX}
                      cy={nodeY}
                      r="14"
                      fill={domain.color}
                      fillOpacity="0.25"
                      className="motion-safe:animate-ping"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                  )}
                  <circle
                    cx={nodeX}
                    cy={nodeY}
                    r={isHovered || isSelected ? 7.5 : 5}
                    fill={isUnrated ? (isDark ? '#071318' : '#FAFDFD') : domain.color}
                    stroke={isUnrated ? domain.color : isDark ? '#112028' : '#ffffff'}
                    strokeWidth="2.5"
                    strokeDasharray={isUnrated ? '2 2' : undefined}
                    className="motion-safe:transition-all motion-safe:duration-300"
                  />
                </g>
              )}

              {/* Invisible SVG hit-test rect behind the badge for reliable cross-browser click capture */}
              <rect
                x={badgeX - 60}
                y={badgeY - 26}
                width={120}
                height={54}
                rx={16}
                fill="transparent"
                className="cursor-pointer"
                style={{ pointerEvents: 'all' }}
              />

              {/* Perimeter badge with foreignObject */}
              <foreignObject
                x={badgeX - 60}
                y={badgeY - 26}
                width={120}
                height={54}
                className="overflow-visible pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArea?.(domain.id);
                  }}
                  onMouseEnter={() => setHoveredArea(domain.id)}
                  onMouseLeave={() => setHoveredArea(null)}
                  className={`w-full h-full flex flex-col items-center justify-center p-1.5 rounded-2xl motion-safe:transition-all motion-safe:duration-200 border text-center select-none cursor-pointer hover:scale-105 active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-[#0B6E72] dark:group-focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] shadow-lg shadow-[#0B6E72]/20 dark:shadow-[0_8px_25px_-4px_rgba(34,211,238,0.35)] ring-2 ring-[#0B6E72] dark:ring-[#22D3EE] border-[#0B6E72] dark:border-[#22D3EE] scale-[1.04]'
                      : isHovered
                      ? 'bg-white dark:bg-[#0E1D24] text-[#0F172A] dark:text-[#F1F5F9] border-slate-300 dark:border-slate-600 ring-1 ring-slate-300 dark:ring-slate-700 shadow-sm'
                      : !selectedAreaId && index === 0
                      ? 'bg-white/95 dark:bg-[#0E1D24]/95 text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E343F] ring-1 ring-teal-400/40 dark:ring-cyan-400/40 motion-safe:animate-pulse'
                      : 'bg-white/95 dark:bg-[#0E1D24]/95 text-[#334155] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E343F]'
                  }`}
                  style={{
                    borderColor: isSelected
                      ? isDark
                        ? '#22D3EE'
                        : '#0B6E72'
                      : `${domain.color}50`,
                  }}
                >
                  {/* Domain Icon & Name */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs" aria-hidden="true">
                      {domain.icon}
                    </span>
                    <span className="text-xs font-black leading-none truncate max-w-[88px]">
                      {domain.name}
                    </span>
                  </div>

                  {/* Isolated score or '—' */}
                  <div className="flex items-center gap-1 mt-0.5" dir="ltr">
                    <span
                      className="text-xs font-extrabold"
                      style={{ color: getScoreTextColor(domain) }}
                    >
                      <span dir="ltr" className="[unicode-bidi:isolate] font-mono">
                        {currentVal > 0 ? `${currentVal.toFixed(1)} / 10` : '—'}
                      </span>
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Helper hint for single variant */}
      {variant === 'single' && (
        <div className="mt-3 text-xs text-[#334155] dark:text-slate-300 flex items-center gap-2 bg-white dark:bg-[#112028] px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#0B6E72] dark:bg-cyan-400 motion-safe:animate-pulse"></span>
          <span>اختر أي مجال لاستكشاف تفاصيله أو استشارة مستشاره (أو استخدم الأسهم للتنقل)</span>
        </div>
      )}

      {/* Comprehensive Legend for compare variant */}
      {variant === 'compare' && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
          {series.map((period, pIdx) => {
            const isLatest = pIdx === series.length - 1;
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
      )}
    </div>
  );
};
