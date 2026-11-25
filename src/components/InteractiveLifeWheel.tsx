import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowLeft,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { WHEEL_DOMAINS, InteractiveWheelDomain } from '../data/wheelDomains';

interface InteractiveLifeWheelProps {
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

// C2 & C3: Geometry constants & helpers moved outside component at module level
const WHEEL_SIZE = 520;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const R_INNER = 92;
const R_OUTER = 236;
const SEGMENT_GAP = 1.6; // deg
const TOTAL_DOMAINS = WHEEL_DOMAINS.length;
const SEGMENT_ANGLE = 360 / TOTAL_DOMAINS;
const HALF_SEGMENT = SEGMENT_ANGLE / 2;

// Helper to calculate polar coordinates
const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

// Helper to describe donut segment path
const describeDonutArc = (
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) => {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${arcSweep} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${arcSweep} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
};

interface WheelSegmentData {
  domain: InteractiveWheelDomain;
  index: number;
  path: string;
  iconPos: { x: number; y: number };
  labelPos: { x: number; y: number };
  midAngle: number;
}

// C2: Pre-calculated segments at module level (no useMemo needed)
const WHEEL_SEGMENTS: WheelSegmentData[] = WHEEL_DOMAINS.map((domain, index) => {
  const baseAngle = index * SEGMENT_ANGLE;
  const startAngle = baseAngle - HALF_SEGMENT + SEGMENT_GAP / 2;
  const endAngle = baseAngle + HALF_SEGMENT - SEGMENT_GAP / 2;
  const midAngle = baseAngle;

  const path = describeDonutArc(WHEEL_CENTER, WHEEL_CENTER, R_INNER, R_OUTER, startAngle, endAngle);
  const iconPos = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, R_OUTER - 38, midAngle);
  const labelPos = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, R_INNER + 48, midAngle);

  return {
    domain,
    index,
    path,
    iconPos,
    labelPos,
    midAngle,
  };
});

// B2: Read prefers-reduced-motion with SSR guard
const getPrefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
};

export const InteractiveLifeWheel: React.FC<InteractiveLifeWheelProps> = ({
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Keyboard accessibility focus tracking
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isCenterFocused, setIsCenterFocused] = useState(false);

  // A7: rotationRef and setRotation helper to avoid stale state in closures
  const rotationRef = useRef(0);
  const setRotation = useCallback((deg: number) => {
    rotationRef.current = deg;
    setRotationAngle(deg);
  }, []);

  // A1: isPressedRef ensures wheel moves ONLY on active drag, never on mouse hover
  const isPressedRef = useRef(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // C4: Removed unused velocity and lastTime from gestureRef
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startAngle: number;
    currentRotation: number;
    hasDeterminedIntent: boolean;
    isIntentRotation: boolean;
  }>({
    startX: 0,
    startY: 0,
    startAngle: 0,
    currentRotation: 0,
    hasDeterminedIntent: false,
    isIntentRotation: false,
  });

  const animFrameRef = useRef<number | null>(null);

  const activeDomain = WHEEL_DOMAINS[selectedIndex] || WHEEL_DOMAINS[0];

  // B1: Contrast helper - strongColor on Light, verified themeColor / lighter tint on Dark (WCAG 2.2 AA 4.5:1+)
  const getAccentColor = useCallback(
    (domain: InteractiveWheelDomain) => {
      if (!isDark) return domain.strongColor;
      if (domain.id === 'career') return '#818cf8'; // indigo-400 achieves 5.99:1 on dark #0c1827 / 6.37:1 on #07111c
      if (domain.id === 'personal') return '#a78bfa'; // violet-400 achieves 6.56:1 on dark #0c1827 / 6.98:1 on #07111c
      return domain.themeColor;
    },
    [isDark]
  );

  // Rotate smoothly to target index with shortest-arc settling
  const rotateToIndex = useCallback(
    (index: number) => {
      // A2: Cancel playful spin state immediately so wheel never freezes if clicked during spin
      setIsSpinning(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setSelectedIndex(index);

      const targetAngle = -index * SEGMENT_ANGLE;
      const startAngle = rotationRef.current; // A7: Read rotationRef.current

      // Calculate shortest rotational delta (avoiding sudden jumps or reverse full spins)
      let diff = (targetAngle - startAngle) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const finalTarget = startAngle + diff;

      // B2: If reduced motion requested, jump directly without animation
      if (getPrefersReducedMotion()) {
        setRotation(finalTarget);
        return;
      }

      const startTime = performance.now();
      const duration = 460; // ms

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Clean cubic ease-out for calm, smooth settling
        const ease = 1 - Math.pow(1 - progress, 3);
        setRotation(startAngle + diff * ease);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setRotation(finalTarget);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [setRotation]
  );

  // Navigate next / prev in domain order
  const handlePrev = useCallback(() => {
    const nextIdx = (selectedIndex - 1 + TOTAL_DOMAINS) % TOTAL_DOMAINS;
    rotateToIndex(nextIdx);
  }, [selectedIndex, rotateToIndex]);

  const handleNext = useCallback(() => {
    const nextIdx = (selectedIndex + 1) % TOTAL_DOMAINS;
    rotateToIndex(nextIdx);
  }, [selectedIndex, rotateToIndex]);

  // A5: Playful Roulette Spin Animation with smooth forward deceleration
  const handlePlayfulSpin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const randomIndex = Math.floor(Math.random() * TOTAL_DOMAINS);
    const extraSpins = 2 + Math.floor(Math.random() * 2); // 2 to 3 full rotations
    const desiredAngle = -randomIndex * SEGMENT_ANGLE;

    // Compute relative to current rotation, normalizing forward delta into (-360, 0]
    const currentAngle = rotationRef.current;
    let forwardDelta = (desiredAngle - currentAngle) % 360;
    if (forwardDelta > 0) forwardDelta -= 360;
    if (forwardDelta <= -360) forwardDelta += 360;

    const targetAngle = currentAngle + forwardDelta - extraSpins * 360;
    const diff = targetAngle - currentAngle;

    // B2: Jump directly when reduced motion is preferred
    if (getPrefersReducedMotion()) {
      setRotation(targetAngle);
      setSelectedIndex(randomIndex);
      setIsSpinning(false);
      return;
    }

    const startTime = performance.now();
    const duration = 1800; // 1.8s playful deceleration

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quintic ease out for authentic roulette spin feeling
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = currentAngle + diff * ease;
      setRotation(current);

      // Dynamically update active index during spin
      const normalized = ((-Math.round(current / SEGMENT_ANGLE) % TOTAL_DOMAINS) + TOTAL_DOMAINS) % TOTAL_DOMAINS;
      setSelectedIndex(normalized);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(targetAngle);
        setSelectedIndex(randomIndex);
        setIsSpinning(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, setRotation]);

  // Pointer drag angle calculation
  const getPointerAngle = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isSpinning) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    // A1: Mark pressed as active
    isPressedRef.current = true;

    const startAngle = getPointerAngle(e.clientX, e.clientY);
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startAngle,
      currentRotation: rotationRef.current, // A7: Use rotationRef.current
      hasDeterminedIntent: false,
      isIntentRotation: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // A1: Stop early if not pressed or already spinning
    if (!isPressedRef.current || isSpinning) return;
    const g = gestureRef.current;

    // 1. Initial intent detection (preserves native vertical page scroll)
    if (!g.hasDeterminedIntent) {
      const dx = Math.abs(e.clientX - g.startX);
      const dy = Math.abs(e.clientY - g.startY);
      const distance = Math.hypot(dx, dy);

      // Still within tiny movement threshold
      if (distance < 7) return;

      // If vertical movement is dominant (dy > dx * 1.25), yield to native page scroll
      if (dy > dx * 1.25) {
        g.hasDeterminedIntent = true;
        g.isIntentRotation = false;
        return;
      }

      // Horizontal or circular intent confirmed: lock into wheel rotation
      g.hasDeterminedIntent = true;
      g.isIntentRotation = true;
      setIsDragging(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    // 2. Track circular rotation smoothly
    if (g.isIntentRotation) {
      const currentAngle = getPointerAngle(e.clientX, e.clientY);
      let delta = currentAngle - g.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const newRot = g.currentRotation + delta;
      setRotation(newRot); // A7: Use setRotation

      const activeIdx = ((-Math.round(newRot / SEGMENT_ANGLE) % TOTAL_DOMAINS) + TOTAL_DOMAINS) % TOTAL_DOMAINS;
      setSelectedIndex(activeIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    // A1: Reset pressed flag
    isPressedRef.current = false;
    const g = gestureRef.current;
    const wasRotating = g.isIntentRotation;

    g.hasDeterminedIntent = false;
    g.isIntentRotation = false;

    if (wasRotating) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      // A7 & C3: Settle cleanly on the nearest segment using rotationRef.current
      const currentAngle = rotationRef.current;
      const nearestIdx = ((-Math.round(currentAngle / SEGMENT_ANGLE) % TOTAL_DOMAINS) + TOTAL_DOMAINS) % TOTAL_DOMAINS;
      rotateToIndex(nearestIdx);
    }
  };

  // A3 & A4: Keyboard navigation & RTL accessibility controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // A3: Ignore bubbled events from inner child buttons
    if (e.target !== e.currentTarget) return;

    // A4: RTL arrow keys: Left/Down = Next; Right/Up = Prev
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        handleNext();
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        handlePrev();
        break;
      case 'Home':
        e.preventDefault();
        rotateToIndex(0);
        break;
      case 'End':
        e.preventDefault();
        rotateToIndex(TOTAL_DOMAINS - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handlePlayfulSpin();
        break;
    }
  };

  // Cleanup anim frame
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white dark:bg-[#0c1827] transition-all duration-300 select-none p-5 sm:p-8 focus-visible:outline-none"
      role="region"
      aria-label="عجلة أبعاد الحياة التفاعلية"
    >
      {/* Ambient Radial Orbital Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-50 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle 380px at 50% 45%, ${activeDomain.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header / Instructions Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full motion-safe:animate-ping"
              style={{ backgroundColor: activeDomain.themeColor }}
            />
            <span className="text-xs font-black tracking-wider text-[#0B6E72] dark:text-cyan-400">
              عجلة الحياة التفاعلية المتكاملة
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">
            استكشف أبعادك الثمانية وحرّك العجلة بلمستك
          </h3>
          <p className="text-xs text-[#334155] dark:text-slate-400 mt-0.5">
            اسحب العجلة، انقر على أي بعد، أو استخدم أزرار التحكم لتدوير متناغم وسلس
          </p>
        </div>

        {/* Playful Controls Bar - A4: Button hints match RTL orientation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFA] dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0B6E72] dark:hover:border-cyan-400 hover:text-[#0B6E72] dark:hover:text-cyan-300 transition-all shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
            title="البُعد السابق (سهم يمين)"
            aria-label="الانتقال إلى البُعد السابق (سهم يمين)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePlayfulSpin}
            disabled={isSpinning}
            className="px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#0B6E72] hover:bg-[#085255] dark:bg-[#0891B2] dark:hover:bg-[#0e7490] text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
            title="تدوير عشوائي تفاعلي (Spin & Explore)"
            aria-label={isSpinning ? 'جاري دوران عجلة الحياة...' : 'تدوير عشوائي تفاعلي لعجلة الحياة'}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSpinning ? 'motion-safe:animate-spin' : ''}`} />
            <span>{isSpinning ? 'جاري الدوران...' : 'استكشف عشوائياً'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFA] dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0B6E72] dark:hover:border-cyan-400 hover:text-[#0B6E72] dark:hover:text-cyan-300 transition-all shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
            title="البُعد التالي (سهم يسار)"
            aria-label="الانتقال إلى البُعد التالي (سهم يسار)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Wheel & Summary Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Interactive SVG Wheel Canvas (7 Cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          {/* Top Indicator Pointer */}
          <div className="flex flex-col items-center -mb-3 z-20 pointer-events-none">
            <div
              className="w-3.5 h-3.5 rotate-45 rounded-xs transition-colors duration-300 shadow-md border-2 border-white dark:border-[#0c1827]"
              style={{ backgroundColor: activeDomain.themeColor }}
            />
            {/* B3: Raised font size from text-[10px] to text-xs */}
            <span className="text-xs font-black mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-900 shadow-xs">
              البُعد المختار
            </span>
          </div>

          {/* SVG Container with touch-action: pan-y to NEVER block vertical page scrolling */}
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            {/* Concentric Decorative Rings - B2: motion-safe:animate-spin */}
            <div
              className="absolute inset-0 rounded-full border border-dashed border-slate-200/80 dark:border-slate-700/60 pointer-events-none motion-safe:animate-spin"
              style={{ animationDuration: '90s' }}
            />
            <div className="absolute inset-4 rounded-full border border-slate-200/50 dark:border-slate-800/60 pointer-events-none" />

            <svg
              ref={svgRef}
              viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
              className="w-full h-full cursor-grab active:cursor-grabbing touch-pan-y select-none"
              style={{
                touchAction: 'pan-y', // Scroll-safe guarantee on mobile & touch displays
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <defs>
                {/* Dynamic Gradients with WCAG 2.2 AA compliant contrast */}
                {WHEEL_DOMAINS.map((domain) => (
                  <linearGradient
                    key={`grad_${domain.id}`}
                    id={`grad_${domain.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={domain.gradientColors[0]} />
                    <stop offset="100%" stopColor={domain.gradientColors[1]} />
                  </linearGradient>
                ))}

                {/* Outer Glow Filter for active segment */}
                <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* B3: Wheel group as single roving tabindex radiogroup */}
              <g
                role="radiogroup"
                aria-label="أبعاد عجلة الحياة الثمانية"
                aria-activedescendant={`wheel-segment-${activeDomain.id}`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (focusedIndex === null) setFocusedIndex(selectedIndex);
                }}
                onBlur={() => setFocusedIndex(null)}
                transform={`rotate(${rotationAngle} ${WHEEL_CENTER} ${WHEEL_CENTER})`}
                className="outline-none focus-visible:outline-none"
              >
                {WHEEL_SEGMENTS.map(({ domain, index, path, iconPos, labelPos }) => {
                  const isSelected = index === selectedIndex;
                  const isFocused = index === focusedIndex;

                  return (
                    <g
                      key={domain.id}
                      id={`wheel-segment-${domain.id}`}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${domain.title} (${domain.advisorName})`}
                      tabIndex={-1}
                      onClick={() => rotateToIndex(index)}
                      className="cursor-pointer transition-transform duration-300 group outline-none"
                    >
                      {/* Segment Arc Wedge - B1: Full opacity, distinct stroke & glow */}
                      <path
                        d={path}
                        fill={`url(#grad_${domain.id})`}
                        stroke={
                          isFocused
                            ? isDark
                              ? '#22D3EE'
                              : '#0B6E72'
                            : isSelected
                            ? isDark
                              ? '#38BDF8'
                              : '#FFFFFF'
                            : isDark
                            ? '#0c1827'
                            : '#FFFFFF'
                        }
                        strokeWidth={isSelected ? '4.5' : isFocused ? '3.5' : '2'}
                        filter={isSelected ? 'url(#activeGlow)' : undefined}
                        className="transition-all duration-300 hover:brightness-110"
                      />

                      {/* Segment Emoji / Icon - A6: Counter-rotate around own position so it stays upright */}
                      <text
                        x={iconPos.x}
                        y={iconPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isSelected ? '24' : '20'}
                        className="select-none pointer-events-none transition-all duration-300"
                        transform={`rotate(${-rotationAngle} ${iconPos.x} ${iconPos.y})`}
                        aria-hidden="true"
                      >
                        {domain.avatarSvg}
                      </text>

                      {/* Pure Arabic Domain Label - A6: Counter-rotate around own position so it stays horizontal */}
                      <g
                        transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${-rotationAngle})`}
                        className="pointer-events-none"
                      >
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          className="font-['Tajawal',sans-serif] font-black select-none text-xs sm:text-[13px] drop-shadow-md"
                          style={{
                            fontWeight: 900,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {domain.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* Center Hub: "عجلة الحياة — توازن متناغم" */}
              <g
                className="cursor-pointer outline-none focus:outline-none"
                onClick={handlePlayfulSpin}
                tabIndex={0}
                role="button"
                aria-label="مركز عجلة الحياة - توازن متناغم (انقر للتدوير العشوائي)"
                onFocus={() => setIsCenterFocused(true)}
                onBlur={() => setIsCenterFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePlayfulSpin();
                  }
                }}
              >
                {/* Center Outer Border Ring - C4: removed shadow-lg */}
                <circle
                  cx={WHEEL_CENTER}
                  cy={WHEEL_CENTER}
                  r={R_INNER - 2}
                  fill={isDark ? '#0c1827' : '#FFFFFF'}
                  stroke={isCenterFocused ? (isDark ? '#22D3EE' : '#0B6E72') : getAccentColor(activeDomain)}
                  strokeWidth={isCenterFocused ? '5' : '3.5'}
                  className="transition-all duration-300"
                />

                {/* Inner Subtle Radial Glow */}
                <circle
                  cx={WHEEL_CENTER}
                  cy={WHEEL_CENTER}
                  r={R_INNER - 12}
                  fill={isDark ? '#11202f' : '#F4F8F7'}
                  className="transition-colors duration-300"
                />

                {/* Center Arabic Text Hierarchy */}
                <text
                  x={WHEEL_CENTER}
                  y={WHEEL_CENTER - 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="22"
                  className="select-none"
                  aria-hidden="true"
                >
                  ⚖️
                </text>

                <text
                  x={WHEEL_CENTER}
                  y={WHEEL_CENTER + 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDark ? '#F8FAFC' : '#0F172A'}
                  className="font-['Tajawal',sans-serif] font-black text-sm select-none"
                  style={{ fontWeight: 900 }}
                >
                  عجلة الحياة
                </text>

                {/* B1 & B3: strongColor in Light mode, fontSize="12" (text-xs) */}
                <text
                  x={WHEEL_CENTER}
                  y={WHEEL_CENTER + 24}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={getAccentColor(activeDomain)}
                  className="font-['Tajawal',sans-serif] font-bold select-none"
                  fontSize="12"
                  style={{ fontWeight: 800 }}
                >
                  توازن متناغم
                </text>
              </g>
            </svg>
          </div>

          {/* B3: Raised font size from text-[11px] to text-xs */}
          <span className="text-xs text-[#475569] dark:text-[#94A3B8] mt-3 font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
            <span>يمكنك سحب العجلة دائرياً للتنقل، أو النقر على أي بُعد لتحديده</span>
          </span>
        </div>

        {/* Selected Domain Showcase Card - B3: aria-live="polite" */}
        <div className="lg:col-span-5 space-y-4" aria-live="polite" aria-atomic="true">
          <div
            className="rounded-3xl p-6 border transition-all duration-300 shadow-sm relative overflow-hidden bg-white dark:bg-[#0c1827]"
            style={{
              borderColor: `${getAccentColor(activeDomain)}40`,
              boxShadow: `0 10px 30px -10px ${activeDomain.glowColor}`,
            }}
          >
            {/* Top Badge & Number */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                  style={{ backgroundColor: `${getAccentColor(activeDomain)}15` }}
                  aria-hidden="true"
                >
                  {activeDomain.avatarSvg}
                </div>
                <div>
                  {/* B1 & B3: strongColor in Light mode, text-xs */}
                  <span
                    className="text-xs font-extrabold px-2.5 py-0.5 rounded-full border inline-block"
                    style={{
                      color: getAccentColor(activeDomain),
                      borderColor: `${getAccentColor(activeDomain)}35`,
                      backgroundColor: `${getAccentColor(activeDomain)}10`,
                    }}
                  >
                    البُعد {selectedIndex + 1} من {TOTAL_DOMAINS}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white mt-0.5">
                    {activeDomain.title}
                  </h4>
                </div>
              </div>

              {/* B2: motion-safe:animate-pulse */}
              <div
                className="w-3 h-3 rounded-full motion-safe:animate-pulse"
                style={{ backgroundColor: getAccentColor(activeDomain) }}
                aria-hidden="true"
              />
            </div>

            {/* Advisor Role - B3: text-xs */}
            <div className="p-3 rounded-2xl bg-[#F8FAFA] dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-xs mb-3 space-y-0.5">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#94A3B8] block">المستشار المخصص:</span>
              <p className="font-black text-[#0F172A] dark:text-slate-200">
                {activeDomain.advisorName}
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: getAccentColor(activeDomain) }}
              >
                {activeDomain.advisorRole}
              </p>
            </div>

            {/* Core Contribution to Holistic Balance - B3: text-xs */}
            <div className="space-y-1.5 mb-4 text-right">
              <span
                className="text-xs font-extrabold block"
                style={{ color: getAccentColor(activeDomain) }}
              >
                أثره في التوازن الشامل:
              </span>
              <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed font-normal">
                {activeDomain.description}
              </p>
            </div>

            {/* Keystone Habit - B3: text-xs */}
            <div className="p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-black text-emerald-800 dark:text-emerald-300 mb-0.5">
                  العادة المحورية المقترحة:
                </strong>
                <span className="text-xs leading-relaxed font-medium">
                  {activeDomain.keystoneHabit}
                </span>
              </div>
            </div>

            {/* Action CTA: Enter Login / Evaluation - B1: strongColor with white text */}
            {onNavigateToAuth ? (
              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                className="w-full py-3 px-4 rounded-2xl text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] cursor-pointer"
                style={{ backgroundColor: activeDomain.strongColor }}
              >
                <span>ابدأ تشخيص وتقييم هذا البُعد</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-center text-xs text-[#475569] dark:text-[#94A3B8] font-bold">
                تكامل هذا البُعد مع الأبعاد السبعة الأخرى يصنع عجلة حياة تدور بثقة وسلام
              </div>
            )}
          </div>

          {/* Quick Domain Indicator Pills - B3: text-xs, B1: getAccentColor */}
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="أبعاد عجلة الحياة الثمانية">
            {WHEEL_DOMAINS.map((domain, idx) => {
              const isItemActive = idx === selectedIndex;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => rotateToIndex(idx)}
                  aria-pressed={isItemActive}
                  aria-label={`${domain.title} - ${domain.advisorName}`}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0c1827] ${
                    isItemActive
                      ? 'border-[#0B6E72] dark:border-cyan-400 bg-white dark:bg-slate-800 shadow-xs'
                      : 'border-slate-200/70 dark:border-slate-800 bg-[#F8FAFA] dark:bg-slate-900/60 opacity-85 hover:opacity-100'
                  }`}
                >
                  <span className="text-base block" aria-hidden="true">{domain.avatarSvg}</span>
                  <span
                    className="text-xs font-black truncate block mt-0.5"
                    style={{ color: isItemActive ? getAccentColor(domain) : undefined }}
                  >
                    {domain.name.replace('الجانب ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
