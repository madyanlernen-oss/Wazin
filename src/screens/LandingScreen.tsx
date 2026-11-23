import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Users,
  BarChart3,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize,
  AlertCircle,
  Loader2,
  ArrowUp,
  Check,
} from 'lucide-react';
import { ADVISORS_LIST } from '../data/advisorsData';
import { LifeDimensionsGuide } from '../components/LifeDimensionsGuide';

interface LandingScreenProps {
  onLoadSample?: () => void;
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
  theme?: 'light' | 'dark';
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoadSample: _onLoadSample,
  onNavigateToAuth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const NAV_SECTIONS = [
    { id: 'hero', label: 'الرئيسية' },
    { id: 'video', label: 'الفيديو' },
    { id: 'model', label: 'النموذج' },
    { id: 'wheel', label: 'العجلة' },
    { id: 'scale', label: 'المقياس' },
    { id: 'advisors', label: 'المستشارون' },
    { id: 'features', label: 'المميزات' },
  ];

  const [activeSection, setActiveSection] = useState<string>('hero');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const navButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Smooth scroll handler respecting prefers-reduced-motion
  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  // Back to top handler respecting prefers-reduced-motion
  const handleScrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  // Scroll-Spy with IntersectionObserver & Back-to-Top scroll trigger
  useEffect(() => {
    const sectionIds = ['hero', 'video', 'model', 'wheel', 'scale', 'advisors', 'features'];

    const handleWindowScroll = () => {
      setShowBackToTop(window.scrollY > 600);

      // Fast reset to 'hero' when scrolled back near top
      if (window.scrollY < 180) {
        setActiveSection('hero');
        return;
      }

      // Activate last section 'features' when near the very bottom
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) {
        setActiveSection('features');
        return;
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    handleWindowScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        if (window.scrollY < 180) {
          setActiveSection('hero');
          return;
        }

        // Find which section top is closest to sticky header offset (120px = 72px header + 48px sticky bar)
        let bestSection = '';
        let minDistance = Infinity;

        sectionIds.forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 240 && rect.bottom >= 120) {
              const dist = Math.abs(rect.top - 120);
              if (dist < minDistance) {
                minDistance = dist;
                bestSection = id;
              }
            }
          }
        });

        if (bestSection) {
          setActiveSection(bestSection);
        } else {
          const intersecting = entries.find((e) => e.isIntersecting);
          if (intersecting && intersecting.target.id) {
            setActiveSection(intersecting.target.id);
          }
        }
      },
      {
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0, 0.2, 0.5, 0.8],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  // Auto center active tab in horizontal scrollable bar on mobile
  useEffect(() => {
    const container = navContainerRef.current;
    const activeBtn = navButtonRefs.current[activeSection];
    if (!container || !activeBtn) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    const btnCenter = btnRect.left + btnRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const offsetDiff = btnCenter - containerCenter;

    if (Math.abs(offsetDiff) > 8) {
      container.scrollBy({
        left: offsetDiff,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [activeSection]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState('1080p HD');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const formatVideoTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isTogglingRef = useRef(false);

  const handleTogglePlay = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Prevent double invocation in the same event tick from bubbling or double clicks
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 200);

    if (!videoRef.current) return;

    if (videoRef.current.paused || videoRef.current.ended) {
      setVideoError(false);
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasStartedPlaying(true);
          })
          .catch((err) => {
            console.warn('Video play interrupted, attempting muted playback:', err);
            // Some browsers require muted autoplay on first interaction
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setHasStartedPlaying(true);
                })
                .catch((err2) => {
                  console.error('Video play failed even when muted:', err2);
                  setIsPlaying(false);
                });
            } else {
              setIsPlaying(false);
            }
          });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const container = videoRef.current.parentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (container && container.requestFullscreen) {
      container.requestFullscreen().catch(() => {
        videoRef.current?.requestFullscreen().catch(() => {});
      });
    } else if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleRetryVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoError(false);
    setIsVideoLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasStartedPlaying(true);
          setIsVideoLoading(false);
        })
        .catch(() => {
          setIsVideoLoading(false);
        });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] pb-28 overflow-x-clip bg-[#F4F8F7] dark:bg-[#07111c] transition-colors duration-300">
      {/* Sticky Sub-Navigation Bar */}
      <nav
        aria-label="أقسام الصفحة الرئيسية"
        className="sticky top-[72px] z-30 bg-white/85 dark:bg-[#07111c]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors"
        dir="rtl"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-2 sm:gap-4">
          {/* Scrollable Links row on mobile / flex on desktop */}
          <div
            ref={navContainerRef}
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0 py-1"
          >
            {NAV_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  ref={(el) => {
                    navButtonRefs.current[section.id] = el;
                  }}
                  type="button"
                  onClick={() => handleScrollToSection(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative flex items-center justify-center px-3.5 sm:px-4 py-2 min-h-[40px] text-xs sm:text-sm font-extrabold transition-all duration-200 rounded-xl cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400 ${
                    isActive
                      ? 'text-[#0F6E6E] dark:text-[#22D3EE] font-black'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{section.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3/5 min-w-[20px] max-w-[42px] h-[2.5px] rounded-full bg-[#0F6E6E] dark:bg-[#22D3EE] transition-all shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick CTA on the left (end in RTL) */}
          <button
            type="button"
            onClick={() => onNavigateToAuth('login')}
            className="min-h-[40px] min-w-[40px] px-3 sm:px-4 py-1.5 rounded-full bg-[#0F6E6E] hover:bg-[#0B5454] dark:bg-[#0891B2] dark:hover:bg-[#0E7490] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
            title="تسجيل الدخول / ابدأ الآن"
            aria-label="ابدأ الآن وتسجيل الدخول"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" aria-hidden="true" />
            <span className="hidden sm:inline">ابدأ الآن</span>
          </button>
        </div>
      </nav>

      {/* 4-Corner Rich Ambient Mesh Gradient with Ultra-Slow Ambient Drift Animation (Airy Light & Deep Dark) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 animate-ambient-drift"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 65% 50% at 50% 36%, rgba(10, 22, 38, 0.95) 0%, rgba(7, 17, 28, 0.88) 35%, rgba(5, 12, 22, 0.45) 65%, transparent 85%),
              radial-gradient(circle 850px at 0% 0%, #062329 0%, #0a3640 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, #23143c 0%, #2e1a50 32%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, #2e1420 0%, #3d1b2b 32%, transparent 68%),
              radial-gradient(circle 850px at 100% 68%, #091728 0%, #0e223d 36%, transparent 72%)
            `
            : `
              radial-gradient(ellipse 70% 55% at 50% 36%, #FAFDFD 0%, #F0F6F5 45%, rgba(240, 246, 245, 0.65) 75%, transparent 100%),
              radial-gradient(circle 850px at 0% 0%, rgba(11, 110, 114, 0.10) 0%, rgba(11, 110, 114, 0.04) 35%, transparent 68%),
              radial-gradient(circle 850px at 100% 0%, rgba(147, 112, 190, 0.10) 0%, rgba(147, 112, 190, 0.04) 35%, transparent 68%),
              radial-gradient(circle 850px at 0% 68%, rgba(20, 184, 166, 0.07) 0%, transparent 65%),
              radial-gradient(circle 850px at 100% 68%, rgba(126, 108, 150, 0.07) 0%, transparent 65%)
            `,
        }}
      />

      {/* Hero Ambient Wrapper with Glowing Central Halo and Orbital Wireframe Rings */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-16">
        {/* Main Centerpiece Frame with Generous Breathing Room */}
        <div id="hero" className="scroll-mt-36 relative max-w-4xl mx-auto pt-8 pb-14 px-6 sm:px-14 lg:px-16 text-center">
          {/* Luminous Oval Halo & Delicate Concentric Orbital Wireframes (SVG) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center animate-hero-float">
            {/* Central Glassmorphic Frame (88%-92% Soft Ivory/White in Light Mode for WCAG AA Clarity) */}
            <div
              className={`w-full h-full max-w-3xl rounded-[3rem] border transition-all duration-500 ${
                isDark
                  ? 'border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md'
                  : 'border-slate-200/90 shadow-[0_16px_45px_rgba(15,23,42,0.05),inset_0_1px_2px_rgba(255,255,255,0.95)] backdrop-blur-md'
              }`}
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.90)',
              }}
            />

            {/* Overlapping Orbital Rings with Ambient Counter-Rotation & Subtle Twinkling Stars */}
            <svg
              className="absolute w-[120%] h-[130%] max-w-5xl pointer-events-none"
              viewBox="0 0 900 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Orbit 1: Dashed Teal Ring - Rotating Clockwise (65s cycle) */}
              <g className="animate-orbit-cw">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="420"
                  ry="210"
                  stroke={isDark ? "rgba(34, 211, 238, 0.28)" : "rgba(11, 110, 114, 0.22)"}
                  strokeWidth="1.2"
                  strokeDasharray="4 6"
                />
              </g>

              {/* Mid Orbit 2: Solid Purple/Lavender Ring - Counter-Rotating (52s cycle) */}
              <g className="animate-orbit-ccw">
                <g transform="rotate(-6 450 250)">
                  <ellipse
                    cx="450"
                    cy="250"
                    rx="390"
                    ry="190"
                    stroke={isDark ? "rgba(168, 85, 247, 0.28)" : "rgba(139, 92, 246, 0.22)"}
                    strokeWidth="1.5"
                  />
                </g>
              </g>

              {/* Inner Orbit 3: Subtle Guide Ring */}
              <g transform="rotate(8 450 250)">
                <ellipse
                  cx="450"
                  cy="250"
                  rx="350"
                  ry="170"
                  stroke={isDark ? "rgba(0, 229, 255, 0.24)" : "rgba(10, 117, 126, 0.18)"}
                  strokeWidth="1"
                  strokeDasharray="8 8"
                />
              </g>

              {/* 5-6 Subtle Twinkling Micro-Stars along outer orbital paths (far from central text) */}
              {/* Micro-Star 1: Upper-left outer orbit */}
              <g className="animate-star-1" transform="translate(130, 150)">
                <circle cx="0" cy="0" r="2.2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 2: Upper-right outer orbit */}
              <g className="animate-star-2" transform="translate(770, 135)">
                <circle cx="0" cy="0" r="2.4" fill={isDark ? "#c084fc" : "#8b5cf6"} />
                <circle cx="0" cy="0" r="5.5" fill={isDark ? "rgba(192,132,252,0.2)" : "rgba(139,92,246,0.12)"} />
              </g>

              {/* Micro-Star 3: Far-right mid orbit */}
              <g className="animate-star-3" transform="translate(830, 260)">
                <circle cx="0" cy="0" r="2" fill={isDark ? "#38bdf8" : "#0B6E72"} />
                <circle cx="0" cy="0" r="4.5" fill={isDark ? "rgba(56,189,248,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 4: Far-left lower orbit */}
              <g className="animate-star-4" transform="translate(80, 310)">
                <circle cx="0" cy="0" r="2.2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Micro-Star 5: Top-center outer arch */}
              <g className="animate-star-5" transform="translate(280, 75)">
                <circle cx="0" cy="0" r="1.8" fill={isDark ? "#c084fc" : "#8b5cf6"} />
                <circle cx="0" cy="0" r="4" fill={isDark ? "rgba(192,132,252,0.2)" : "rgba(139,92,246,0.12)"} />
              </g>

              {/* Micro-Star 6: Lower-right outer edge */}
              <g className="animate-star-6" transform="translate(630, 425)">
                <circle cx="0" cy="0" r="2" fill={isDark ? "#22d3ee" : "#0B6E72"} />
                <circle cx="0" cy="0" r="4.5" fill={isDark ? "rgba(34,211,238,0.2)" : "rgba(11,110,114,0.12)"} />
              </g>

              {/* Breathing & Rotating Multi-Ray Accent Sparkle */}
              <g className="animate-sparkle-breathing">
                <g transform="translate(730, 370)">
                  <circle
                    cx="0"
                    cy="0"
                    r="20"
                    fill={isDark ? "rgba(34, 211, 238, 0.16)" : "rgba(11, 110, 114, 0.12)"}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill={isDark ? "#ffffff" : "#0B6E72"}
                    opacity="0.95"
                    filter={isDark ? "drop-shadow(0 0 8px rgba(34, 211, 238, 0.65))" : "drop-shadow(0 0 8px rgba(11, 110, 114, 0.4))"}
                  />
                  <line
                    x1="-30"
                    y1="0"
                    x2="30"
                    y2="0"
                    stroke={isDark ? "#ffffff" : "#0B6E72"}
                    strokeWidth="2.2"
                    opacity={isDark ? 0.85 : 0.9}
                  />
                  <line
                    x1="0"
                    y1="-30"
                    x2="0"
                    y2="30"
                    stroke={isDark ? "#ffffff" : "#0B6E72"}
                    strokeWidth="2.2"
                    opacity={isDark ? 0.85 : 0.9}
                  />
                  <line
                    x1="-18"
                    y1="-18"
                    x2="18"
                    y2="18"
                    stroke={isDark ? "rgba(34, 211, 238, 0.65)" : "rgba(11, 110, 114, 0.65)"}
                    strokeWidth="1.5"
                  />
                  <line
                    x1="18"
                    y1="-18"
                    x2="-18"
                    y2="18"
                    stroke={isDark ? "rgba(34, 211, 238, 0.65)" : "rgba(11, 110, 114, 0.65)"}
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            </svg>
          </div>

          {/* Foreground Hero Content (Completely static, crisp, and high-contrast) */}
          <div className="relative z-10 space-y-7">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-900/75 border border-[#0F6E6E]/25 dark:border-cyan-500/30 shadow-xs text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-cyan-100 transition-colors backdrop-blur-md">
              <span className="flex h-2 w-2 relative" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F6E6E] dark:bg-cyan-400"></span>
              </span>
              <span>نظام الذكاء الاصطناعي الأول لتناغم مجالات الحياة الثمانية</span>
            </div>

            {/* Centerpiece Bold Headlines (Deep Slate #0F172A & Rich Petrol Emerald #0F6E6E) */}
            <div className="space-y-3 pt-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] dark:text-white leading-[1.25] sm:leading-[1.2] transition-colors">
                لا تعش في جانب واحد..
              </h1>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F6E6E] dark:text-[#22D3EE] leading-[1.25] sm:leading-[1.2] transition-colors">
                وازن حياتك كاملة
              </h2>
            </div>

            {/* Legible Body Paragraph with High Contrast */}
            <p className="text-base sm:text-lg lg:text-xl text-[#1E293B] dark:text-slate-100 leading-relaxed max-w-2xl mx-auto font-medium pt-2 transition-colors">
              منصة ذكية متخصصة تعيد رسم بوصلتك الحياتية بوعي. يرافقك المستشارون الذكيون في كل جانب وفق معايير نوعية، ليرسموا لك "عجلة الحياة" ويزودوك بخطة عمل تكاملية تجمع بين النجاح والسكينة.
            </p>

            {/* Primary Hero Conversion CTA Button */}
            <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateToAuth('signup')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-[#0F6E6E] hover:bg-[#0B5454] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-base sm:text-lg font-black shadow-xl shadow-[#0F6E6E]/25 hover:shadow-2xl hover:shadow-[#0F6E6E]/40 dark:shadow-cyan-950/60 dark:hover:shadow-cyan-900/70 border border-teal-500/40 dark:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-95 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F6E6E]/30 dark:focus-visible:ring-cyan-400/40"
              >
                {/* Shimmer sweep effect */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                <span>ابدأ فحص اتزانك التفاعلي مجاناً</span>
                <span className="text-xl leading-none font-bold transition-transform duration-300 group-hover:-translate-x-1.5" aria-hidden="true">&larr;</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explainer Video Slot (حاوية الفيديو التوضيحي التعريفي لمنصة وزان) */}
        <div id="video" className="scroll-mt-36 relative max-w-4xl mx-auto space-y-5 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-cyan-500/25 text-xs font-bold text-[#0B6E72] dark:text-cyan-300 shadow-xs backdrop-blur-md">
              <span className="text-[#8A5A00] dark:text-amber-400">🎬</span>
              <span>فيديو تعريفي لمنظومة وزان</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              شاهد كيف تُعيد "وزان" ترتيب بوصلتك الحياتية في دقائق
            </h3>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              جولة مرئية تستعرض رحلتك من التقييم الأسبوعي مع المستشارين الثمانية إلى لوحة تحكم عجلة الحياة ومصفوفة التركيز اليومي.
            </p>
          </div>

          {/* Video Player Frame Container with Design System Rounded Corners and Dark Glass Frame */}
          <div className="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-slate-200/90 dark:border-teal-500/25 bg-[#0c1419] backdrop-blur-md shadow-2xl transition-all duration-500 group">
            {/* 16:9 Aspect Ratio Frame */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#0c1419]">
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                src="/videos/wazan.mp4"
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover cursor-pointer z-0"
                onPlay={() => {
                  setIsPlaying(true);
                  setHasStartedPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setHasStartedPlaying(false);
                }}
                onWaiting={() => setIsVideoLoading(true)}
                onPlaying={() => setIsVideoLoading(false)}
                onCanPlay={() => setIsVideoLoading(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
                onError={() => {
                  setVideoError(true);
                  setIsVideoLoading(false);
                  setIsPlaying(false);
                }}
                onClick={handleTogglePlay}
                aria-label="الفيديو التعريفي لمنظومة وزان"
              />

              {/* 4. Cinematic Subtle Vignette & Gradient Overlay on Hover (#0c1419 aesthetic) */}
              <div
                className="absolute inset-0 pointer-events-none z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    'radial-gradient(ellipse 95% 85% at 50% 50%, rgba(12, 20, 25, 0.1) 0%, rgba(12, 20, 25, 0.45) 60%, rgba(12, 20, 25, 0.92) 100%)',
                }}
                aria-hidden="true"
              />

              {/* Loading State Overlay */}
              {isVideoLoading && !videoError && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c1419]/60 backdrop-blur-xs pointer-events-none animate-fadeIn">
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#0c1419]/90 border border-[#14b8a6]/30 text-white text-xs font-bold shadow-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-[#14b8a6]" />
                    <span>جارٍ تحميل المقطع...</span>
                  </div>
                </div>
              )}

              {/* Fallback Error State Overlay */}
              {videoError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[#0c1419]/95 backdrop-blur-md text-white text-center space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-inner">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">تعذّر تشغيل الفيديو مؤقتاً</h4>
                    <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                      قد يكون ذلك بسبب ضعف الاتصال بالشبكة. يمكنك إعادة المحاولة الآن.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryVideo}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0B5454] text-white text-xs font-bold transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة المحاولة</span>
                  </button>
                </div>
              )}

              {/* 1 & 2. Video Thumbnail Cover (Before Play): Text Lifted Up + Clear Breathing Room + Glowing Play Button */}
              {!hasStartedPlaying && !videoError && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#0c1419]/85 via-[#0c1419]/70 to-[#0c1419]/90 backdrop-blur-[2px] transition-all duration-300 cursor-pointer"
                  onClick={handleTogglePlay}
                >
                  {/* Lifted Headline with clear breathing room */}
                  <div className="text-center space-y-1.5 sm:space-y-2 mb-5 sm:mb-8 pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14b8a6]/15 border border-[#14b8a6]/30 text-[#14b8a6] text-[11px] sm:text-xs font-bold shadow-xs backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-[#14b8a6]" />
                      <span>عرض تقديمي تفاعلي</span>
                    </div>
                    <h4 className="text-xl sm:text-3xl font-black text-white leading-snug drop-shadow-md">
                      لا تعش في جانب واحد..{' '}
                      <span className="text-[#14b8a6] drop-shadow-[0_0_14px_rgba(20,184,166,0.55)]">
                        وازن حياتك كاملة
                      </span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300/90 font-medium max-w-md mx-auto leading-relaxed drop-shadow-xs">
                      شاهد كيف يعيد الذكاء الاصطناعي ضبط تناغم مجالاتك الحياتية خطوة بخطوة
                    </p>
                  </div>

                  {/* Central Glowing Play Button with pulse ring & smooth hover scale */}
                  <div className="relative flex items-center justify-center pointer-events-auto">
                    {/* Outer Ping Ring */}
                    <span
                      className="absolute -inset-4 sm:-inset-5 rounded-full bg-[#14b8a6]/25 animate-ping pointer-events-none"
                      aria-hidden="true"
                    />
                    {/* Outer Breathing Pulse Ring */}
                    <span
                      className="absolute -inset-2.5 sm:-inset-3.5 rounded-full border border-[#14b8a6]/50 animate-pulse pointer-events-none"
                      aria-hidden="true"
                    />
                    {/* The Play Button */}
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#0F6E6E] via-[#14b8a6] to-[#2dd4bf] text-white flex items-center justify-center shadow-[0_0_35px_rgba(20,184,166,0.65)] hover:shadow-[0_0_60px_rgba(20,184,166,0.95)] hover:scale-110 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14b8a6] cursor-pointer min-h-[44px] min-w-[44px]"
                      aria-label="تشغيل الفيديو التعريفي"
                      title="تشغيل الفيديو التعريفي"
                    >
                      <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover:scale-105 transition-transform drop-shadow pointer-events-none" />
                    </button>
                  </div>

                  {/* Hint below button */}
                  <span className="mt-4 text-[11px] font-bold text-slate-400/90 tracking-wide pointer-events-none">
                    انقر للمشاهدة
                  </span>
                </div>
              )}

              {/* Paused State Overlay (Clean, no text overlaying frame, only the centered glowing play button) */}
              {hasStartedPlaying && !isPlaying && !videoError && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-[#0c1419]/40 backdrop-blur-[1px] transition-all duration-300 cursor-pointer"
                  onClick={handleTogglePlay}
                >
                  <div className="relative flex items-center justify-center pointer-events-auto">
                    {/* Outer Ping Ring */}
                    <span
                      className="absolute -inset-4 sm:-inset-5 rounded-full bg-[#14b8a6]/25 animate-ping pointer-events-none"
                      aria-hidden="true"
                    />
                    {/* Outer Breathing Pulse Ring */}
                    <span
                      className="absolute -inset-2.5 sm:-inset-3.5 rounded-full border border-[#14b8a6]/50 animate-pulse pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#0F6E6E] via-[#14b8a6] to-[#2dd4bf] text-white flex items-center justify-center shadow-[0_0_35px_rgba(20,184,166,0.65)] hover:shadow-[0_0_60px_rgba(20,184,166,0.95)] hover:scale-110 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14b8a6] cursor-pointer min-h-[44px] min-w-[44px]"
                      aria-label="استئناف تشغيل الفيديو"
                      title="استئناف التشغيل"
                    >
                      <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover:scale-105 transition-transform drop-shadow pointer-events-none" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Player Bottom Control Bar with Frosted Glass & Progress Bar */}
              <div
                className="absolute bottom-0 inset-x-0 bg-[#0c1419]/85 dark:bg-[#0c1419]/95 backdrop-blur-md border-t border-white/10 flex flex-col text-white text-xs z-20 transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Interactive Progress Bar with Scrubber */}
                <div
                  className="group/progress relative w-full h-2 cursor-pointer py-1 flex items-center px-0 -mt-1 select-none"
                  onClick={handleSeek}
                  role="slider"
                  aria-label="شريط تقدم الفيديو"
                  aria-valuemin={0}
                  aria-valuemax={duration || 100}
                  aria-valuenow={currentTime}
                  dir="ltr"
                >
                  {/* Background Track */}
                  <div className="w-full h-1 group-hover/progress:h-2 rounded-full bg-white/20 transition-all duration-150 relative overflow-hidden">
                    {/* Filled Progress */}
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 via-[#14b8a6] to-cyan-400 rounded-full transition-[width] duration-75 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Scrubber Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#14b8a6] shadow-[0_0_10px_rgba(20,184,166,0.95)] opacity-0 group-hover/progress:opacity-100 transition-opacity duration-150 pointer-events-none -ml-1.5"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                {/* Controls & Metadata Row */}
                <div className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  {/* Left / Right (in RTL): Play/Pause, Mute, Title */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-white hover:text-[#14b8a6] hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] cursor-pointer"
                      aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                      title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-white hover:text-[#14b8a6] hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] cursor-pointer"
                      aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                      title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Video Title */}
                    <div className="flex items-center gap-1.5 font-bold truncate">
                      <span className="w-2 h-2 rounded-full bg-[#14b8a6] animate-ping flex-shrink-0" />
                      <span className="text-white/95 text-xs truncate">تجربة وزان: التناغم الحياتي بالذكاء الاصطناعي</span>
                    </div>
                  </div>

                  {/* Time, 1080p HD Quality Selector, Fullscreen */}
                  <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-semibold text-slate-200">
                    {/* Time Display */}
                    <span
                      className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-xs border border-white/10 flex items-center gap-1 font-mono text-xs font-bold text-white select-none"
                      dir="ltr"
                    >
                      <span>{formatVideoTime(currentTime)}</span>
                      <span className="text-white/40">/</span>
                      <span className="text-white/70">{formatVideoTime(duration || 20)}</span>
                    </span>

                    {/* Quality Badge & Menu (1080p HD) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="px-2.5 py-1 rounded-md bg-[#14b8a6]/20 hover:bg-[#14b8a6]/30 text-teal-200 border border-[#14b8a6]/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
                        aria-label="تحديد دقة الفيديو"
                        title="دقة الفيديو"
                      >
                        <span>{selectedQuality}</span>
                        <span className="text-[9px] opacity-70">▼</span>
                      </button>

                      {/* Quality Menu Dropdown */}
                      {showQualityMenu && (
                        <div
                          className="absolute bottom-full mb-2 end-0 py-1.5 px-1 bg-[#0c1419]/95 border border-[#14b8a6]/30 rounded-xl shadow-2xl backdrop-blur-xl z-30 min-w-[125px] space-y-0.5 animate-fadeIn"
                          dir="rtl"
                        >
                          {['1080p HD', '720p HD', '480p', 'تلقائي (Auto)'].map((q) => {
                            const isSelected =
                              selectedQuality === q || (q.startsWith('تلقائي') && selectedQuality === 'تلقائي');
                            return (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setSelectedQuality(q.replace(' (Auto)', ''));
                                  setShowQualityMenu(false);
                                }}
                                className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-[#14b8a6]/25 text-teal-300'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span>{q}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#14b8a6]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] cursor-pointer"
                      aria-label="ملء الشاشة"
                      title="ملء الشاشة"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Eight Dimensions of Life Educational Guide (ماهية نموذج أبعاد الحياة الثمانية) */}
        <div>
          <LifeDimensionsGuide onNavigateToAuth={onNavigateToAuth} theme={theme} />
        </div>

        {/* 8 Advisors Section */}
        <div id="advisors" className="scroll-mt-36 pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-[#0F172A] dark:text-white transition-colors">المستشارون الثمانية وعوالم التوازن</h2>
            <p className="text-sm text-[#334155] dark:text-slate-400 mt-1 transition-colors">
              لكل جانب من جوانب حياتك مستشار خبير بهويته ومنهجه المخصص لمساعدتك
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADVISORS_LIST.map((advisor) => (
              <div
                key={advisor.id}
                className="group relative bg-white dark:bg-[#0c1827] hover:bg-[#F8FAFA] dark:hover:bg-[#102033] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-cyan-800/50 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs border border-black/5 dark:border-white/10"
                    style={{ backgroundColor: `${advisor.themeColor}15` }}
                  >
                    {advisor.avatarSvg}
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: advisor.themeColor,
                      borderColor: `${advisor.themeColor}35`,
                      backgroundColor: `${advisor.themeColor}10`,
                    }}
                  >
                    {advisor.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-extrabold text-[#0F172A] dark:text-white text-base transition-colors">{advisor.name}</h3>
                  <p className="text-xs font-semibold" style={{ color: advisor.themeColor }}>
                    {advisor.title}
                  </p>
                  <p className="text-xs text-[#334155] dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed transition-colors">
                    {advisor.role}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-500">
                  <span>مستشار ذكي متخصص</span>
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="text-[#0B6E72] dark:text-cyan-400 font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-1 cursor-pointer"
                  >
                    <span>ابدأ الآن</span>
                    <span>&larr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="scroll-mt-36 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 dark:bg-cyan-950/50 text-[#1b605b] dark:text-cyan-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">عجلة الحياة برادار تفاعلي</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              رسم بياني راداري متقدم يوضح لك فورياً أين مواطن قوتك، وأين تكمن الفجوات التي تستنزف
              طاقتك دون أن تشعر.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#bd9240]/10 dark:bg-amber-950/50 text-[#bd9240] dark:text-amber-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">استشارة تفاعلية حية لكل جانب</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              غرفة استشارة مستقلة مع كل مستشار، يعرف إجاباتك ودرجاتك وأهدافك ويقترح عليك خطوات
              إجرائية فورية.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1827] border border-[#eae3d5] dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#1b605b]/10 dark:bg-cyan-950/50 text-[#1b605b] dark:text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-[#1d2e2b] dark:text-white text-base transition-colors">تقرير المنسق العام التكاملي</h4>
            <p className="text-xs text-[#536561] dark:text-slate-400 leading-relaxed transition-colors">
              تحليل بالذكاء الاصطناعي لكيفية تأثير المجالات على بعضها، واكتشاف العادات المحورية
              التي ترفع عدة جوانب دفعة واحدة.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="العودة لأعلى الصفحة"
          title="العودة لأعلى الصفحة"
          className="fixed left-6 bottom-6 z-40 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white/95 dark:bg-[#0c1827]/95 hover:bg-white dark:hover:bg-[#102033] text-[#0F6E6E] dark:text-[#22D3EE] border border-slate-200/90 dark:border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer animate-fadeIn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E6E] dark:focus-visible:ring-cyan-400"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
