'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from './CountdownTimer';

interface PersistentCountdownProps {
  targetTime?: string;  // ISO datetime
}

/**
 * A persistent countdown that shows time remaining to the next evergreen slot.
 * When the target is past, falls back to 24h from now so there is ALWAYS an
 * active countdown visible (creates perpetual urgency).
 *
 * Delegates all rendering to CountdownTimer with variant="featured".
 */
export default function PersistentCountdown({ targetTime }: PersistentCountdownProps) {
  const getNextTarget = useCallback((): Date => {
    if (targetTime) {
      const t = new Date(targetTime);
      if (t > new Date()) return t;
    }

    // Fallback: 24 hours from now
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }, [targetTime]);

  const [target, setTarget] = useState<Date>(() => getNextTarget());

  // Re-calculate target when props change
  useEffect(() => {
    setTarget(getNextTarget());
  }, [getNextTarget]);

  const handleComplete = useCallback(() => {
    // Auto-advance to next target
    const next = getNextTarget();
    if (next.getTime() !== target.getTime()) {
      setTarget(next);
    }
  }, [getNextTarget, target]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-lg md:text-xl font-semibold text-neutral-700 mb-5">
        距离讲座开始还有...
      </p>
      <CountdownTimer
        targetTime={target.toISOString()}
        size="lg"
        variant="featured"
        showDays={true}
        showLabels={true}
        onComplete={handleComplete}
      />
    </div>
  );
}
