'use client';

import { useState, useEffect, useCallback } from 'react';

interface PersistentCountdownProps {
  targetTime?: string;
}

/**
 * A persistent countdown that always shows time remaining to the next slot.
 * When the target time passes, it falls back to 24 hours from now.
 */
export default function PersistentCountdown({ targetTime }: PersistentCountdownProps) {
  const getNextTarget = useCallback((): Date => {
    if (targetTime) {
      const t = new Date(targetTime);
      if (t > new Date()) return t;
    }
    // Fallback: 24 hours from now (should only happen if no slots available)
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }, [targetTime]);

  const [target, setTarget] = useState<Date>(() => getNextTarget());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target.getTime() - now);
      const totalSeconds = Math.floor(diff / 1000);

      if (totalSeconds <= 0) {
        // Auto-advance to next slot
        setTarget(getNextTarget());
        return;
      }

      setTimeLeft({
        days: Math.floor(totalSeconds / (24 * 60 * 60)),
        hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
        minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
        seconds: totalSeconds % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target, getNextTarget]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="w-[72px] h-[72px] md:w-[96px] md:h-[96px] bg-[#B8953F] rounded-md flex items-center justify-center">
        <span className="text-3xl md:text-5xl font-bold text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs md:text-sm text-neutral-500 mt-2 tracking-wider font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <p className="text-lg md:text-xl font-semibold text-neutral-700 mb-5">
        距离讲座开始还有...
      </p>
      <div className="flex items-start justify-center gap-3 md:gap-5">
        <TimeBlock value={timeLeft.days} label="天" />
        <TimeBlock value={timeLeft.hours} label="时" />
        <TimeBlock value={timeLeft.minutes} label="分" />
        <TimeBlock value={timeLeft.seconds} label="秒" />
      </div>
    </div>
  );
}
