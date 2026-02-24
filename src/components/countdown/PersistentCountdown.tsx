'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/lib/types';

interface PersistentCountdownProps {
  sessions: Session[];
}

/**
 * A persistent countdown that always shows time remaining to the next session.
 * When all sessions are past, it projects session times-of-day onto future dates
 * so there is ALWAYS an active countdown visible (creates perpetual urgency).
 */
export default function PersistentCountdown({ sessions }: PersistentCountdownProps) {
  const getNextTarget = useCallback((): Date => {
    const now = new Date();

    // 1. Try to find a real future session
    const futureSessions = sessions
      .map(s => new Date(s.startTime))
      .filter(d => d > now)
      .sort((a, b) => a.getTime() - b.getTime());

    if (futureSessions.length > 0) {
      return futureSessions[0];
    }

    // 2. All sessions are past — use rolling schedule
    // Extract unique times-of-day from sessions, project onto today/tomorrow
    const timesOfDay = sessions.map(s => {
      const d = new Date(s.startTime);
      return { hours: d.getHours(), minutes: d.getMinutes() };
    });

    // Remove duplicates
    const uniqueTimes = timesOfDay.filter(
      (t, i, arr) => arr.findIndex(u => u.hours === t.hours && u.minutes === t.minutes) === i
    );

    // Sort by time of day
    uniqueTimes.sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));

    // Project onto today and tomorrow, find nearest future
    const candidates: Date[] = [];
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      for (const time of uniqueTimes) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(time.hours, time.minutes, 0, 0);
        if (candidate > now) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.getTime() - b.getTime());
      return candidates[0];
    }

    // Fallback: 24 hours from now (should never reach here)
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }, [sessions]);

  const [target, setTarget] = useState<Date>(() => getNextTarget());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target.getTime() - now);
      const totalSeconds = Math.floor(diff / 1000);

      if (totalSeconds <= 0) {
        // Auto-advance to next session
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
      <div className="w-14 h-14 md:w-16 md:h-16 bg-[#B8953F] flex items-center justify-center">
        <span className="text-xl md:text-2xl font-bold text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[11px] md:text-xs text-neutral-500 mt-1.5 tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <p className="text-base md:text-lg text-neutral-600 mb-3">
        距离讲座开始还有...
      </p>
      <div className="flex items-start justify-center gap-2.5 md:gap-3">
        <TimeBlock value={timeLeft.days} label="天" />
        <TimeBlock value={timeLeft.hours} label="时" />
        <TimeBlock value={timeLeft.minutes} label="分" />
        <TimeBlock value={timeLeft.seconds} label="秒" />
      </div>
    </div>
  );
}
