'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetTime: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'minimal';
  onComplete?: () => void;
  showLabels?: boolean;
  showDays?: boolean;
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
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const diff = Math.max(0, target - now);
      const totalSeconds = Math.floor(diff / 1000);

      if (totalSeconds <= 0 && onComplete) {
        onComplete();
      }

      // Mark as urgent when less than 30 minutes
      setIsUrgent(totalSeconds > 0 && totalSeconds < 30 * 60);

      return {
        days: Math.floor(totalSeconds / (24 * 60 * 60)),
        hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
        minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
        seconds: totalSeconds % 60,
        totalSeconds,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete]);

  // Size classes
  const sizeClasses = {
    sm: 'text-xl px-2 py-1',
    md: 'text-3xl px-4 py-2',
    lg: 'text-5xl px-6 py-4',
  };

  const labelSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  // Variant classes
  const getVariantClasses = () => {
    if (variant === 'urgent' || isUrgent) {
      return {
        container: 'bg-[#B8953F]/5 border border-[#B8953F]/20',
        number: 'bg-[#B8953F]/10 text-[#B8953F]',
        label: 'text-[#B8953F]/70',
        separator: 'text-[#B8953F]/50',
      };
    }
    if (variant === 'minimal') {
      return {
        container: 'bg-transparent',
        number: 'bg-[#F5F5F0] text-neutral-800',
        label: 'text-neutral-500',
        separator: 'text-neutral-400',
      };
    }
    return {
      container: 'bg-white/80 backdrop-blur border border-[#E8E5DE]',
      number: 'bg-[#F5F5F0] text-neutral-800',
      label: 'text-neutral-500',
      separator: 'text-neutral-400',
    };
  };

  const classes = getVariantClasses();

  // If time is up
  if (timeLeft.totalSeconds <= 0) {
    return (
      <div className={`rounded-lg p-4 ${classes.container}`}>
        <div className="text-center">
          <span className={`font-bold ${sizeClasses[size]} text-green-600 animate-pulse`}>
            🎬 直播进行中！
          </span>
        </div>
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center">
      <div className={`${classes.number} rounded-lg font-mono font-bold ${sizeClasses[size]} min-w-[60px] ${size === 'lg' ? 'min-w-[80px]' : ''}`}>
        {String(value).padStart(2, '0')}
      </div>
      {showLabels && (
        <div className={`mt-1 ${classes.label} ${labelSizes[size]}`}>{label}</div>
      )}
    </div>
  );

  const Separator = () => (
    <span className={`${classes.separator} font-bold ${sizeClasses[size]} self-start mt-2`}>:</span>
  );

  return (
    <div className={`rounded-lg p-4 ${classes.container}`}>
      {/* Urgent badge */}
      {isUrgent && (
        <div className="text-center mb-3">
          <span className="inline-flex items-center gap-1.5 bg-[#B8953F]/10 text-[#B8953F] text-xs font-semibold px-3 py-1 rounded-full border border-[#B8953F]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8953F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8953F]" />
            </span>
            即将开始
          </span>
        </div>
      )}

      <div className="flex items-start justify-center gap-2">
        {showDays && timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days} label="天" />
            <Separator />
          </>
        )}
        <TimeBlock value={timeLeft.hours} label="时" />
        <Separator />
        <TimeBlock value={timeLeft.minutes} label="分" />
        <Separator />
        <TimeBlock value={timeLeft.seconds} label="秒" />
      </div>
    </div>
  );
}
