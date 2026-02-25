'use client';

import { useState, useEffect, useRef, Fragment } from 'react';

interface CountdownTimerProps {
  targetTime: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'minimal' | 'featured';
  onComplete?: () => void;
  showLabels?: boolean;
  showDays?: boolean;
}

/* ── Per-digit size tokens ── */
const SIZES = {
  sm: {
    card: 'w-[28px] h-[44px]',
    font: 'text-xl',
    label: 'text-[10px] mt-1',
    pairGap: 'gap-[3px]',
    dot: 'w-[3px] h-[3px]',
    dotCol: 'h-[44px] gap-1',
    segGap: 'gap-2',
    pad: 'p-3',
    live: 'text-lg',
  },
  md: {
    card: 'w-[36px] h-[58px]',
    font: 'text-3xl',
    label: 'text-[11px] mt-1.5',
    pairGap: 'gap-[3px]',
    dot: 'w-1 h-1',
    dotCol: 'h-[58px] gap-1.5',
    segGap: 'gap-3',
    pad: 'p-4',
    live: 'text-2xl',
  },
  lg: {
    card: 'w-[44px] h-[74px] md:w-[52px] md:h-[88px]',
    font: 'text-4xl md:text-5xl',
    label: 'text-xs mt-2',
    pairGap: 'gap-1',
    dot: 'w-1 md:w-1.5 h-1 md:h-1.5',
    dotCol: 'h-[74px] md:h-[88px] gap-2',
    segGap: 'gap-3 md:gap-4',
    pad: 'p-5 md:p-6',
    live: 'text-3xl',
  },
};

/* ── Variant styles split into upper / lower halves ── */
interface HalfStyles {
  upper: string;
  lower: string;
  digit: string;
  seam: string;
  shadow: string;
  label: string;
  dot: string;
  container: string;
  showBadge: boolean;
  glow: boolean;
}

function getVariantStyles(variant: string, isUrgent: boolean): HalfStyles {
  if (variant === 'featured') {
    return {
      upper: 'bg-gradient-to-b from-[#D4B85A] to-[#C4A44C] border-l border-r border-t border-[#D4B85A]/30',
      lower: 'bg-gradient-to-b from-[#B08A35] to-[#9F7B2C] border-l border-r border-b border-[#D4B85A]/30',
      digit: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
      seam: 'bg-[#8A6A20]/50',
      shadow: 'shadow-[0_4px_12px_-2px_rgba(184,149,63,0.3)]',
      label: 'text-neutral-500',
      dot: 'bg-[#B8953F]',
      container: '',
      showBadge: false,
      glow: false,
    };
  }

  if (variant === 'urgent' || isUrgent) {
    return {
      upper: 'bg-gradient-to-b from-[#FCF9F1] to-[#F7F0DC] border-l border-r border-t border-[#B8953F]/25',
      lower: 'bg-gradient-to-b from-[#F2E8CC] to-[#EDE0C0] border-l border-r border-b border-[#B8953F]/25',
      digit: 'text-[#7A6425]',
      seam: 'bg-[#B8953F]/20',
      shadow: 'shadow-[0_2px_6px_-1px_rgba(184,149,63,0.1)]',
      label: 'text-[#B8953F]/60',
      dot: 'bg-[#B8953F]',
      container: 'bg-gradient-to-b from-[#B8953F]/[0.03] to-[#B8953F]/[0.08] border border-[#B8953F]/20',
      showBadge: true,
      glow: true,
    };
  }

  if (variant === 'minimal') {
    return {
      upper: 'bg-[#F5F5F0] border-l border-r border-t border-[#E8E5DE]',
      lower: 'bg-[#EDEDEA] border-l border-r border-b border-[#E8E5DE]',
      digit: 'text-neutral-800',
      seam: 'bg-neutral-300/50',
      shadow: '',
      label: 'text-neutral-400',
      dot: 'bg-neutral-300',
      container: '',
      showBadge: false,
      glow: false,
    };
  }

  // Default
  return {
    upper: 'bg-gradient-to-b from-white to-[#FAFAF7] border-l border-r border-t border-[#E8E5DE]',
    lower: 'bg-gradient-to-b from-[#F4F3EF] to-[#EFEEE9] border-l border-r border-b border-[#E8E5DE]',
    digit: 'text-[#2A2A2A]',
    seam: 'bg-[#D8D5CE]/60',
    shadow: 'shadow-[0_2px_4px_-1px_rgba(0,0,0,0.04)]',
    label: 'text-neutral-400',
    dot: 'bg-neutral-300',
    container: 'bg-white/70 backdrop-blur-sm border border-[#E8E5DE]/80',
    showBadge: false,
    glow: false,
  };
}

/* ─────────────────────────────────────────────
   FlipDigit — single character with 3D flip
   ───────────────────────────────────────────── */
function FlipDigit({
  char,
  styles,
  sizeClass,
  fontClass,
}: {
  char: string;
  styles: HalfStyles;
  sizeClass: string;
  fontClass: string;
}) {
  const prevRef = useRef(char);
  const [flip, setFlip] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (char !== prevRef.current) {
      setFlip({ from: prevRef.current, to: char });
      prevRef.current = char;
      const t = setTimeout(() => setFlip(null), 650);
      return () => clearTimeout(t);
    }
  }, [char]);

  const isFlipping = flip !== null;
  const prevChar = flip?.from ?? char;

  return (
    <div className={`fc ${sizeClass} ${styles.shadow}`}>
      {/* Static upper half — always shows current digit */}
      <div className={`fc-half fc-upper ${styles.upper}`}>
        <div className={`fc-inner ${fontClass} ${styles.digit}`}>{char}</div>
      </div>

      {/* Static lower half — old digit during flip, current after */}
      <div className={`fc-half fc-lower ${styles.lower}`}>
        <div className={`fc-inner ${fontClass} ${styles.digit}`}>
          {isFlipping ? prevChar : char}
        </div>
      </div>

      {/* Center seam */}
      <div className={`fc-seam ${styles.seam}`} />

      {/* Animated flaps (mounted only during transition) */}
      {isFlipping && (
        <>
          {/* Top flap falls forward — old digit */}
          <div
            className={`fc-half fc-upper fc-flap-top ${styles.upper}`}
            key={`t-${flip.to}`}
          >
            <div className={`fc-inner ${fontClass} ${styles.digit}`}>{prevChar}</div>
            <div className="fc-shade-top" />
          </div>

          {/* Bottom flap lands — new digit */}
          <div
            className={`fc-half fc-lower fc-flap-bot ${styles.lower}`}
            key={`b-${flip.to}`}
          >
            <div className={`fc-inner ${fontClass} ${styles.digit}`}>{char}</div>
            <div className="fc-shade-bot" />
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CountdownTimer — main export (same public API)
   ───────────────────────────────────────────── */
export default function CountdownTimer({
  targetTime,
  size = 'md',
  variant = 'default',
  onComplete,
  showLabels = true,
  showDays = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0,
  });
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const diff = Math.max(0, target - now);
      const totalSeconds = Math.floor(diff / 1000);

      if (totalSeconds <= 0 && onComplete) onComplete();
      setIsUrgent(totalSeconds > 0 && totalSeconds < 30 * 60);

      return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        totalSeconds,
      };
    };

    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [targetTime, onComplete]);

  const vStyles = getVariantStyles(variant, isUrgent);
  const s = SIZES[size];

  /* ── Completed: live indicator ── */
  if (timeLeft.totalSeconds <= 0) {
    return (
      <div className={`rounded-xl ${s.pad} text-center`}>
        <span className="inline-flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className={`font-bold ${s.live} text-green-600`}>直播进行中</span>
        </span>
      </div>
    );
  }

  /* ── Build time segments ── */
  const segments: { value: number; label: string }[] = [];
  if (showDays && timeLeft.days > 0) segments.push({ value: timeLeft.days, label: '天' });
  segments.push(
    { value: timeLeft.hours, label: '时' },
    { value: timeLeft.minutes, label: '分' },
    { value: timeLeft.seconds, label: '秒' },
  );

  return (
    <>
      <style>{FLIP_CSS}</style>
      <div className={`rounded-xl ${s.pad} ${vStyles.container} ${vStyles.glow ? 'cd-glow' : ''}`}>
        {/* Urgent badge */}
        {vStyles.showBadge && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#B8953F] opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#B8953F]" />
            </span>
            <span className="text-[#B8953F] text-[11px] font-semibold tracking-widest">
              即将开始
            </span>
          </div>
        )}

        {/* Timer grid */}
        <div className={`flex items-start justify-center ${s.segGap}`}>
          {segments.map((seg, i) => {
            const digits = String(seg.value).padStart(2, '0');
            return (
              <Fragment key={seg.label}>
                {/* Digit pair */}
                <div className="flex flex-col items-center">
                  <div className={`flex ${s.pairGap}`}>
                    {digits.split('').map((ch, j) => (
                      <FlipDigit
                        key={`${seg.label}-${j}`}
                        char={ch}
                        styles={vStyles}
                        sizeClass={s.card}
                        fontClass={s.font}
                      />
                    ))}
                  </div>
                  {showLabels && (
                    <span className={`${s.label} ${vStyles.label} font-medium tracking-wider`}>
                      {seg.label}
                    </span>
                  )}
                </div>

                {/* Pulsing separator dots */}
                {i < segments.length - 1 && (
                  <div className={`${s.dotCol} flex flex-col items-center justify-center`}>
                    <div className={`${s.dot} rounded-full ${vStyles.dot} cd-dot`} />
                    <div
                      className={`${s.dot} rounded-full ${vStyles.dot} cd-dot`}
                      style={{ animationDelay: '150ms' }}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   CSS — 3D split-flap flip animation
   ═══════════════════════════════════════════════ */
const FLIP_CSS = `
/* ── Card container with 3D context ── */
.fc {
  position: relative;
  perspective: 300px;
  border-radius: 6px;
}

/* ── Shared half panel ── */
.fc-half {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
}

.fc-upper {
  top: 0;
  border-radius: 6px 6px 0 0;
}

.fc-lower {
  bottom: 0;
  border-radius: 0 0 6px 6px;
}

/* ── Digit text (spans full card height, clipped by half) ── */
.fc-inner {
  position: absolute;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-family: var(--font-mono), 'SF Mono', 'Cascadia Code', monospace;
  user-select: none;
  line-height: 1;
}

.fc-upper .fc-inner {
  top: 0;
  height: 200%;
}

.fc-lower .fc-inner {
  bottom: 0;
  height: 200%;
}

/* ── Center seam ── */
.fc-seam {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(50% - 0.5px);
  height: 1px;
  z-index: 10;
  pointer-events: none;
}

/* ═══ Animated flaps ═══ */

/* Top flap: old digit falling forward */
.fc-flap-top {
  z-index: 4;
  transform-origin: bottom center;
  animation: fc-flip-down 320ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
}

/* Bottom flap: new digit landing with slight overshoot */
.fc-flap-bot {
  z-index: 3;
  transform-origin: top center;
  transform: rotateX(90deg);
  animation: fc-flip-up 350ms cubic-bezier(0.15, 1.35, 0.5, 1) 280ms forwards;
}

/* ── Light/shadow overlays for 3D illusion ── */
.fc-shade-top {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.12) 100%);
  animation: fc-shade-in 320ms ease-in forwards;
  pointer-events: none;
  border-radius: 6px 6px 0 0;
}

.fc-shade-bot {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, transparent 20%, rgba(0,0,0,0.16) 100%);
  animation: fc-shade-out 350ms ease-out 280ms forwards;
  pointer-events: none;
  border-radius: 0 0 6px 6px;
}

/* ── Keyframes ── */
@keyframes fc-flip-down {
  0%   { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
}

@keyframes fc-flip-up {
  0%   { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

@keyframes fc-shade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes fc-shade-out {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}

/* ── Dot pulse + container glow (retained) ── */
@keyframes cd-dot-pulse {
  0%, 100% { opacity: 0.2; transform: scale(0.75); }
  50%      { opacity: 0.85; transform: scale(1); }
}
@keyframes cd-container-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(184,149,63,0); }
  50%      { box-shadow: 0 0 32px -6px rgba(184,149,63,0.14); }
}

.cd-dot  { animation: cd-dot-pulse 1.2s ease-in-out infinite; }
.cd-glow { animation: cd-container-glow 2.5s ease-in-out infinite; }
`;
