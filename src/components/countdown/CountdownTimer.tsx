'use client';

import { useState, useEffect, Fragment } from 'react';

interface CountdownTimerProps {
  targetTime: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'minimal' | 'featured';
  onComplete?: () => void;
  showLabels?: boolean;
  showDays?: boolean;
}

/* ── Size-specific class mappings ── */
const SIZES = {
  sm: {
    tile: 'min-w-[48px] h-[48px]',
    digit: 'text-2xl',
    label: 'text-[10px] mt-1',
    dot: 'w-[3px] h-[3px]',
    dotCol: 'h-[48px] gap-1',
    gap: 'gap-2',
    pad: 'p-3',
    live: 'text-lg',
  },
  md: {
    tile: 'min-w-[68px] h-[64px]',
    digit: 'text-4xl',
    label: 'text-[11px] mt-1.5',
    dot: 'w-1 h-1',
    dotCol: 'h-[64px] gap-1.5',
    gap: 'gap-3',
    pad: 'p-4',
    live: 'text-2xl',
  },
  lg: {
    tile: 'min-w-[80px] md:min-w-[96px] h-[80px] md:h-[96px]',
    digit: 'text-5xl md:text-6xl',
    label: 'text-xs mt-2',
    dot: 'w-1 md:w-1.5 h-1 md:h-1.5',
    dotCol: 'h-[80px] md:h-[96px] gap-2',
    gap: 'gap-3 md:gap-4',
    pad: 'p-5 md:p-6',
    live: 'text-3xl',
  },
};

/* ── Variant style resolver ── */
function getVariantStyles(variant: string, isUrgent: boolean) {
  // Featured: bold gold tiles for marketing/landing pages
  if (variant === 'featured') {
    return {
      container: '',
      tile: 'bg-gradient-to-b from-[#C9A962] to-[#9F7B2C] border border-[#D4B85A]/30 shadow-[0_4px_12px_-2px_rgba(184,149,63,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
      digit: 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]',
      label: 'text-neutral-500',
      dot: 'bg-[#B8953F]',
      showBadge: false,
      glow: false,
    };
  }

  // Urgent (auto or explicit): warm gold tint with glow
  if (variant === 'urgent' || isUrgent) {
    return {
      container: 'bg-gradient-to-b from-[#B8953F]/[0.03] to-[#B8953F]/[0.08] border border-[#B8953F]/20',
      tile: 'bg-gradient-to-b from-[#FCF9F1] to-[#F5EDD8] border border-[#B8953F]/25 shadow-[0_2px_6px_-1px_rgba(184,149,63,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]',
      digit: 'text-[#7A6425]',
      label: 'text-[#B8953F]/60',
      dot: 'bg-[#B8953F]',
      showBadge: true,
      glow: true,
    };
  }

  // Minimal: no container, flat tiles
  if (variant === 'minimal') {
    return {
      container: '',
      tile: 'bg-[#F5F5F0] border border-[#E8E5DE]',
      digit: 'text-neutral-800',
      label: 'text-neutral-400',
      dot: 'bg-neutral-300',
      showBadge: false,
      glow: false,
    };
  }

  // Default: refined cream tiles with depth
  return {
    container: 'bg-white/70 backdrop-blur-sm border border-[#E8E5DE]/80',
    tile: 'bg-gradient-to-b from-white to-[#F8F7F3] border border-[#E8E5DE] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]',
    digit: 'text-[#2A2A2A]',
    label: 'text-neutral-400',
    dot: 'bg-neutral-300',
    showBadge: false,
    glow: false,
  };
}

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

  const styles = getVariantStyles(variant, isUrgent);
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
      <style>{CSS_KEYFRAMES}</style>
      <div className={`rounded-xl ${s.pad} ${styles.container} ${styles.glow ? 'cd-glow' : ''}`}>
        {/* Urgent badge */}
        {styles.showBadge && (
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

        {/* Timer tiles */}
        <div className={`flex items-start justify-center ${s.gap}`}>
          {segments.map((seg, i) => (
            <Fragment key={seg.label}>
              {/* Digit tile */}
              <div className="flex flex-col items-center">
                <div className={`${s.tile} ${styles.tile} rounded-lg flex items-center justify-center`}>
                  <span
                    key={seg.value}
                    className={`${s.digit} ${styles.digit} font-mono font-bold tabular-nums cd-digit`}
                  >
                    {String(seg.value).padStart(2, '0')}
                  </span>
                </div>
                {showLabels && (
                  <span className={`${s.label} ${styles.label} font-medium tracking-wider`}>
                    {seg.label}
                  </span>
                )}
              </div>

              {/* Pulsing separator dots */}
              {i < segments.length - 1 && (
                <div className={`${s.dotCol} flex flex-col items-center justify-center`}>
                  <div className={`${s.dot} rounded-full ${styles.dot} cd-dot`} />
                  <div
                    className={`${s.dot} rounded-full ${styles.dot} cd-dot`}
                    style={{ animationDelay: '150ms' }}
                  />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Animations ── */
const CSS_KEYFRAMES = `
@keyframes cd-digit-enter {
  from { opacity: 0.35; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cd-dot-pulse {
  0%, 100% { opacity: 0.2; transform: scale(0.75); }
  50%      { opacity: 0.85; transform: scale(1); }
}
@keyframes cd-container-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(184,149,63,0); }
  50%      { box-shadow: 0 0 32px -6px rgba(184,149,63,0.14); }
}
.cd-digit { animation: cd-digit-enter 300ms cubic-bezier(0.22, 0.61, 0.36, 1); }
.cd-dot   { animation: cd-dot-pulse 1.2s ease-in-out infinite; }
.cd-glow  { animation: cd-container-glow 2.5s ease-in-out infinite; }
`;
