'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from './CountdownTimer';

interface PersistentCountdownProps {
  targetTime?: string;  // ISO datetime (legacy, ignored if slots provided)
  slots?: Array<{ slotTime: string; type: string }>;
}

/**
 * A persistent countdown that shows time remaining to the next evergreen slot.
 * Accepts an array of slots and automatically advances to the next future slot
 * when the current one expires. Falls back to 24h only if no future slots exist.
 *
 * Delegates all rendering to CountdownTimer with variant="featured".
 */
export default function PersistentCountdown({ targetTime, slots }: PersistentCountdownProps) {
  const getNextTarget = useCallback((): Date => {
    const now = new Date();

    // Find the first future slot from the slots array
    if (slots && slots.length > 0) {
      for (const slot of slots) {
        const t = new Date(slot.slotTime);
        if (t > now) return t;
      }
    }

    // Legacy: single targetTime prop
    if (targetTime) {
      const t = new Date(targetTime);
      if (t > now) return t;
    }

    // Fallback: 24 hours from now
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }, [targetTime, slots]);

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
