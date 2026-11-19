import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowLeft,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { LifeAreaId } from '../types/lifeBalance';

export interface InteractiveWheelDomain {
  id: LifeAreaId;
  name: string; // Crisp Arabic label for wheel segment
  title: string; // Full Arabic domain title
  advisorName: string;
  advisorRole: string;
  avatarSvg: string;
  themeColor: string;
  gradientColors: [string, string];
  glowColor: string;
  description: string;
  keystoneHabit: string;
}

export const WHEEL_DOMAINS: InteractiveWheelDomain[] = [
  {
    id: 'spiritual',
    name: 'الجانب الروحي',
    title: 'الجانب الروحي والسكينة',
    advisorName: 'د. سفيان الروحي',
    advisorRole: 'مستشار الصفاء الإيماني والسلام الداخلي',
    avatarSvg: '🕌',
    themeColor: '#10b981',
    gradientColors: ['#34d399', '#059669'],
    glowColor: 'rgba(16, 185, 129, 0.45)',
    description: 'يرسخ السلام الداخلي وصفاء القلب ويعيد بوصلتك إلى السكينة وحضور القلب وسط صخب وتحديات الحياة.',
    keystoneHabit: 'المحافظة على ورد يومي من الصلاة والذكر بتدبر',
  },
  {
    id: 'health',
    name: 'الجانب الصحي',
    title: 'الجانب الصحي والبدني',
    advisorName: 'د. ريان الصحي',
    advisorRole: 'أخصائي الطاقة الحيوية والطب الوقائي',
    avatarSvg: '🌿',
    themeColor: '#22c55e',
    gradientColors: ['#4ade80', '#16a34a'],
    glowColor: 'rgba(34, 197, 94, 0.45)',
    description: 'يمنحك الحيوية اليومية، النوم العميق، والتغذية السليمة لحماية جسدك ليكون قادراً على تحقيق كل طموحاتك.',
    keystoneHabit: 'نوم منتظم 7-8 ساعات و20 دقيقة حركة يومية',
  },
  {
    id: 'career',
    name: 'الجانب المهني',
    title: 'الجانب المهني والوظيفي',
    advisorName: 'م. طارق المهني',
    advisorRole: 'مستشار التطور الوظيفي والإنتاجية',
    avatarSvg: '💼',
    themeColor: '#8b5cf6',
    gradientColors: ['#a78bfa', '#7c3aed'],
    glowColor: 'rgba(139, 92, 246, 0.45)',
    description: 'يوجه نموك المهني نحو صناعة أثر ملموس وزيادة قيمتك في سوق العمل بإنتاجية نوعية دون احتراق.',
    keystoneHabit: 'تخصيص ساعتين يومياً للمهام العميقة وتطوير المهارات',
  },
  {
    id: 'financial',
    name: 'الجانب المالي',
    title: 'الجانب المالي والاستقلال',
    advisorName: 'أ. كمال المالي',
    advisorRole: 'مستشار التخطيط المالي وتنمية الأصول',
    avatarSvg: '💎',
    themeColor: '#0ea5e9',
    gradientColors: ['#38bdf8', '#0284c7'],
    glowColor: 'rgba(14, 165, 233, 0.45)',
    description: 'يبني استقلالك المالي وصندوق أمانك، ويحول الإنفاق العشوائي إلى استثمار واعٍ ومستقبل مستقر.',
    keystoneHabit: 'ادخار 15% من الدخل وضبط النفقات العاطفية',
  },
  {
    id: 'learning',
    name: 'الجانب التعليمي',
    title: 'الجانب التعليمي والمعرفي',
    advisorName: 'بروفيسور زياد المعرفي',
    advisorRole: 'مستشار التعلم المستمر وإدارة المعرفة',
    avatarSvg: '📚',
    themeColor: '#f59e0b',
    gradientColors: ['#fbbf24', '#d97706'],
    glowColor: 'rgba(245, 158, 11, 0.45)',
    description: 'يغذي عقلك بالقراءة واكتساب المهارات الاستراتيجية ليواكب تغيرات العصر بوعي متجدد مستمر.',
    keystoneHabit: 'قراءة 20 صفحة يومياً من كتاب نوعي ومفيد',
  },
  {
    id: 'family',
    name: 'الجانب الأسري',
    title: 'الجانب الأسري والعائلي',
    advisorName: 'د. مريم الأسرية',
    advisorRole: 'استشارية الترابط الأسري والذكاء العاطفي',
    avatarSvg: '🏡',
    themeColor: '#f97316',
    gradientColors: ['#fb923c', '#ea580c'],
    glowColor: 'rgba(249, 115, 22, 0.45)',
    description: 'يصنع دفء البيت والملاذ الآمن، ويعمق الحوار والإنصات الحقيقي بين أفراد الأسرة دون هواتف.',
    keystoneHabit: 'جلسة عائلية يومية دافئة بدون شاشات ومشتتات',
  },
  {
    id: 'social',
    name: 'الجانب الاجتماعي',
    title: 'الجانب الاجتماعي والعلاقات',
    advisorName: 'أ. سامي الاجتماعي',
    advisorRole: 'مستشار الذكاء الاجتماعي وبناء العلاقات',
    avatarSvg: '🤝',
    themeColor: '#14b8a6',
    gradientColors: ['#2dd4bf', '#0d9488'],
    glowColor: 'rgba(20, 184, 166, 0.45)',
    description: 'ينتقي لك علاقات داعمة ومحفزة تنمّي إنسانيتك وتبعدك عن العلاقات المستنزفة لطاقتك ووقتك.',
    keystoneHabit: 'التواصل الأسبوعي مع صديق ملهم وصادق',
  },
  {
    id: 'personal',
    name: 'الجانب الشخصي',
    title: 'الجانب الشخصي والوعي بالذات',
    advisorName: 'د. ليلى الذاتية',
    advisorRole: 'أخصائية التوازن النفسي وبناء العادات',
    avatarSvg: '✨',
    themeColor: '#ec4899',
    gradientColors: ['#f472b6', '#db2777'],
    glowColor: 'rgba(236, 72, 153, 0.45)',
    description: 'يعزز تقديرك لذاتك وفهمك لمشاعرك، ويمنحك مساحة خاصة للاسترخاء وبناء العادات الصغيرة الراسخة.',
    keystoneHabit: 'خلوة يومية 15 دقيقة للتأمل وتفريغ الذهن',
  },
];

interface InteractiveLifeWheelProps {
  onNavigateToAuth?: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

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

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Directional gesture intent tracking (preserves native vertical page scroll)
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startAngle: number;
    currentRotation: number;
    hasDeterminedIntent: boolean;
    isIntentRotation: boolean;
    lastTime: number;
    velocity: number;
  }>({
    startX: 0,
    startY: 0,
    startAngle: 0,
    currentRotation: 0,
    hasDeterminedIntent: false,
    isIntentRotation: false,
    lastTime: 0,
    velocity: 0,
  });

  const animFrameRef = useRef<number | null>(null);

  const activeDomain = WHEEL_DOMAINS[selectedIndex] || WHEEL_DOMAINS[0];

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

  // Rotate smoothly to target index with shortest-arc settling
  const rotateToIndex = useCallback((index: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setSelectedIndex(index);

    const targetAngle = -index * 45;
    const startAngle = rotationAngle;

    // Calculate shortest rotational delta (avoiding sudden jumps or reverse full spins)
    let diff = (targetAngle - startAngle) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const finalTarget = startAngle + diff;

    const startTime = performance.now();
    const duration = 460; // ms

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Clean cubic ease-out for calm, smooth settling
      const ease = 1 - Math.pow(1 - progress, 3);
      setRotationAngle(startAngle + diff * ease);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRotationAngle(finalTarget);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [rotationAngle]);

  // Navigate next / prev
  const handlePrev = useCallback(() => {
    const nextIdx = (selectedIndex - 1 + 8) % 8;
    rotateToIndex(nextIdx);
  }, [selectedIndex, rotateToIndex]);

  const handleNext = useCallback(() => {
    const nextIdx = (selectedIndex + 1) % 8;
    rotateToIndex(nextIdx);
  }, [selectedIndex, rotateToIndex]);

  // Playful Roulette Spin Animation with smooth deceleration
  const handlePlayfulSpin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const randomIndex = Math.floor(Math.random() * 8);
    const extraSpins = 2 + Math.floor(Math.random() * 2); // 2 to 3 full rotations
    const targetAngle = -(extraSpins * 360 + randomIndex * 45);

    const startAngle = rotationAngle;
    const diff = targetAngle - startAngle;
    const startTime = performance.now();
    const duration = 1800; // 1.8s playful deceleration

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quintic ease out for authentic roulette spin feeling
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = startAngle + diff * ease;
      setRotationAngle(current);

      // Dynamically update active index during spin
      const normalized = ((-Math.round(current / 45) % 8) + 8) % 8;
      setSelectedIndex(normalized);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRotationAngle(targetAngle);
        setSelectedIndex(randomIndex);
        setIsSpinning(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, rotationAngle]);

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

    const startAngle = getPointerAngle(e.clientX, e.clientY);
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startAngle,
      currentRotation: rotationAngle,
      hasDeterminedIntent: false,
      isIntentRotation: false,
      lastTime: performance.now(),
      velocity: 0,
    };
    // Do NOT capture pointer immediately here: allows native vertical scrolling to proceed
    // without interference if the user's initial touch movement is vertical!
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isSpinning) return;
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

      const now = performance.now();
      const dt = now - g.lastTime;
      if (dt > 0) {
        g.velocity = delta / dt;
      }
      g.lastTime = now;

      const newRot = g.currentRotation + delta;
      setRotationAngle(newRot);

      const activeIdx = ((-Math.round(newRot / 45) % 8) + 8) % 8;
      setSelectedIndex(activeIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
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

      // Settle cleanly on the nearest segment
      const nearestIdx = ((-Math.round(rotationAngle / 45) % 8) + 8) % 8;
      rotateToIndex(nearestIdx);
    }
  };

  // Keyboard navigation & accessibility controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      rotateToIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      rotateToIndex(7);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlayfulSpin();
    }
  };

  // Cleanup anim frame
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Geometry constants
  const size = 520;
  const center = size / 2;
  const rInner = 92;
  const rOuter = 236;
  const segmentAngle = 45;
  const halfSegment = segmentAngle / 2;
  const gap = 1.6; // deg

  // Pre-calculate segments
  const segments = useMemo(() => {
    return WHEEL_DOMAINS.map((domain, index) => {
      // In SVG: 0deg is 12 o'clock (top) in our coordinate system
      const baseAngle = index * segmentAngle;
      const startAngle = baseAngle - halfSegment + gap / 2;
      const endAngle = baseAngle + halfSegment - gap / 2;
      const midAngle = baseAngle;

      const path = describeDonutArc(center, center, rInner, rOuter, startAngle, endAngle);

      // Icon position (further out)
      const iconPos = polarToCartesian(center, center, rOuter - 38, midAngle);
      // Label position (closer in)
      const labelPos = polarToCartesian(center, center, rInner + 48, midAngle);

      // Text rotation to ensure Arabic is always right-side up and readable
      let textRot = midAngle;
      if (textRot > 90 && textRot < 270) {
        textRot += 180;
      }

      return {
        domain,
        index,
        path,
        iconPos,
        labelPos,
        textRot,
        midAngle,
      };
    });
  }, [center, rInner, rOuter]);

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white dark:bg-[#0c1827] transition-all duration-300 select-none p-5 sm:p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
      role="region"
      aria-label="عجلة أبعاد الحياة التفاعلية"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Ambient Radial Orbital Glow (Clean Centered Frame, No Side Duplicates) */}
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
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: activeDomain.themeColor }} />
            <span className="text-xs font-black tracking-wider text-[#0B6E72] dark:text-cyan-400">
              العجلة التفاعلية المتكاملة (Interactive Life Wheel)
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-white">
            استكشف أبعادك الثمانية وحرّك العجلة بلمستك
          </h3>
          <p className="text-xs text-[#334155] dark:text-slate-400 mt-0.5">
            اسحب العجلة، انقر على أي بعد، أو استخدم أزرار التحكم لتدوير متناغم وسلس
          </p>
        </div>

        {/* Playful Controls Bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFA] dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0B6E72] dark:hover:border-cyan-400 hover:text-[#0B6E72] dark:hover:text-cyan-300 transition-all shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
            title="البُعد السابق (سهم يمين)"
            aria-label="الانتقال إلى البُعد السابق"
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
            <Sparkles className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'جاري الدوران...' : 'استكشف عشوائياً'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFA] dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-[#0B6E72] dark:hover:border-cyan-400 hover:text-[#0B6E72] dark:hover:text-cyan-300 transition-all shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E72] dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c1827]"
            title="البُعد التالي (سهم يسار)"
            aria-label="الانتقال إلى البُعد التالي"
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
            <span className="text-[10px] font-black mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 dark:bg-white text-white dark:text-slate-900 shadow-xs">
              البُعد المختار
            </span>
          </div>

          {/* SVG Container with touch-action: pan-y to NEVER block vertical page scrolling */}
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            {/* Concentric Decorative Rings */}
            <div
              className="absolute inset-0 rounded-full border border-dashed border-slate-200/80 dark:border-slate-700/60 pointer-events-none animate-spin"
              style={{ animationDuration: '90s' }}
            />
            <div
              className="absolute inset-4 rounded-full border border-slate-200/50 dark:border-slate-800/60 pointer-events-none"
            />

            <svg
              ref={svgRef}
              viewBox={`0 0 ${size} ${size}`}
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
                {/* Dynamic Gradients for all 8 segments */}
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

              {/* Rotatable Group containing all 8 segments and labels */}
              <g
                transform={`rotate(${rotationAngle} ${center} ${center})`}
                style={{
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                {segments.map(({ domain, index, path, iconPos, labelPos, textRot, midAngle }) => {
                  const isSelected = index === selectedIndex;
                  const isFocused = index === focusedIndex;

                  return (
                    <g
                      key={domain.id}
                      onClick={() => rotateToIndex(index)}
                      className="cursor-pointer transition-transform duration-300 group outline-none focus:outline-none"
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`${domain.title} (${domain.advisorName}) - اضغط للتحديد والتدوير`}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          rotateToIndex(index);
                        }
                      }}
                    >
                      {/* Segment Arc Wedge */}
                      <path
                        d={path}
                        fill={`url(#grad_${domain.id})`}
                        stroke={isFocused ? (isDark ? '#22D3EE' : '#0B6E72') : (isDark ? '#0c1827' : '#FFFFFF')}
                        strokeWidth={isFocused ? '4.5' : (isSelected ? '4' : '2')}
                        opacity={isSelected ? 1 : (isFocused ? 0.95 : 0.82)}
                        filter={isSelected ? 'url(#activeGlow)' : undefined}
                        className="transition-all duration-300 hover:opacity-100 hover:brightness-105"
                      />

                      {/* Segment Emoji / Icon */}
                      <text
                        x={iconPos.x}
                        y={iconPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isSelected ? '24' : '20'}
                        className="select-none pointer-events-none transition-all duration-300"
                        transform={`rotate(${isSelected ? 0 : 0} ${iconPos.x} ${iconPos.y})`}
                      >
                        {domain.avatarSvg}
                      </text>

                      {/* Pure Arabic Domain Label */}
                      <g
                        transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${textRot - midAngle})`}
                        className="pointer-events-none"
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          className="font-['Tajawal',sans-serif] font-black select-none text-[12px] sm:text-[13px] drop-shadow-md"
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
                {/* Center Outer Border Ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={rInner - 2}
                  fill={isDark ? '#0c1827' : '#FFFFFF'}
                  stroke={isCenterFocused ? (isDark ? '#22D3EE' : '#0B6E72') : activeDomain.themeColor}
                  strokeWidth={isCenterFocused ? '5' : '3.5'}
                  className="transition-all duration-300 shadow-lg"
                />

                {/* Inner Subtle Radial Glow */}
                <circle
                  cx={center}
                  cy={center}
                  r={rInner - 12}
                  fill={isDark ? '#11202f' : '#F4F8F7'}
                  className="transition-colors duration-300"
                />

                {/* Center Arabic Text Hierarchy */}
                <text
                  x={center}
                  y={center - 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="22"
                  className="select-none"
                >
                  ⚖️
                </text>

                <text
                  x={center}
                  y={center + 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDark ? '#F8FAFC' : '#0F172A'}
                  className="font-['Tajawal',sans-serif] font-black text-sm select-none"
                  style={{ fontWeight: 900 }}
                >
                  عجلة الحياة
                </text>

                <text
                  x={center}
                  y={center + 24}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={activeDomain.themeColor}
                  className="font-['Tajawal',sans-serif] font-bold text-[11px] select-none"
                  style={{ fontWeight: 800 }}
                >
                  توازن متناغم
                </text>
              </g>
            </svg>
          </div>

          <span className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-3 font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0B6E72] dark:text-cyan-400" />
            <span>يمكنك سحب العجلة دائرياً للتنقل، أو النقر على أي بُعد لتحديده</span>
          </span>
        </div>

        {/* Selected Domain Showcase Card (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className="rounded-3xl p-6 border transition-all duration-300 shadow-sm relative overflow-hidden bg-white dark:bg-[#0c1827]"
            style={{
              borderColor: `${activeDomain.themeColor}40`,
              boxShadow: `0 10px 30px -10px ${activeDomain.glowColor}`,
            }}
          >
            {/* Top Badge & Number */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                  style={{ backgroundColor: `${activeDomain.themeColor}15` }}
                >
                  {activeDomain.avatarSvg}
                </div>
                <div>
                  <span
                    className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border"
                    style={{
                      color: activeDomain.themeColor,
                      borderColor: `${activeDomain.themeColor}35`,
                      backgroundColor: `${activeDomain.themeColor}10`,
                    }}
                  >
                    البُعد {selectedIndex + 1} من 8
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white mt-0.5">
                    {activeDomain.title}
                  </h4>
                </div>
              </div>

              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: activeDomain.themeColor }}
              />
            </div>

            {/* Advisor Role */}
            <div className="p-3 rounded-2xl bg-[#F8FAFA] dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-xs mb-3 space-y-0.5">
              <span className="text-[10px] font-extrabold text-[#475569] dark:text-[#94A3B8] block">المستشار المخصص:</span>
              <p className="font-black text-[#0F172A] dark:text-slate-200">
                {activeDomain.advisorName}
              </p>
              <p className="text-[11px] text-[#0B6E72] dark:text-cyan-400 font-semibold">
                {activeDomain.advisorRole}
              </p>
            </div>

            {/* Core Contribution to Holistic Balance */}
            <div className="space-y-1.5 mb-4 text-right">
              <span className="text-[11px] font-extrabold text-[#0B6E72] dark:text-cyan-400 block">
                أثره في التوازن الشامل:
              </span>
              <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed font-normal">
                {activeDomain.description}
              </p>
            </div>

            {/* Keystone Habit */}
            <div className="p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-0.5">
                  العادة المحورية المقترحة:
                </strong>
                <span className="text-[11.5px] leading-relaxed font-medium">
                  {activeDomain.keystoneHabit}
                </span>
              </div>
            </div>

            {/* Action CTA: Enter Login / Evaluation */}
            {onNavigateToAuth ? (
              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                className="w-full py-3 px-4 rounded-2xl text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] cursor-pointer"
                style={{ backgroundColor: activeDomain.themeColor }}
              >
                <span>ابدأ تشخيص وتقييم هذا البُعد</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-center text-[11px] text-[#475569] dark:text-[#94A3B8] font-bold">
                تكامل هذا البُعد مع الأبعاد السبعة الأخرى يصنع عجلة حياة تدور بثقة وسلام
              </div>
            )}
          </div>

          {/* Quick Domain Indicator Pills */}
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
                      : 'border-slate-200/70 dark:border-slate-800 bg-[#F8FAFA] dark:bg-slate-900/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  <span className="text-base block">{domain.avatarSvg}</span>
                  <span
                    className="text-[9.5px] font-black truncate block mt-0.5"
                    style={{ color: isItemActive ? domain.themeColor : undefined }}
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
