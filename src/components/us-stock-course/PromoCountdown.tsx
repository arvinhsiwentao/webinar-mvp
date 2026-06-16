'use client';

import { useEffect, useState } from 'react';

// Everyone starts at 2 天 8 时 12 分 45 秒 on first visit.
const DURATION_MS = ((2 * 24 + 8) * 60 * 60 + 12 * 60 + 45) * 1000;
const STORAGE_KEY = 'us-stock-promo-deadline';

/**
 * Promo countdown shown in the nav. The deadline is stored on first visit, so a
 * returning visitor continues from where they left off. Once it hits zero it just
 * restarts a fresh cycle — there's no real "price goes back up" mechanism behind
 * it, so an expired timer would only look broken. Restarting keeps the urgency.
 */
export default function PromoCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Start a fresh promo cycle and persist its deadline.
    const startFresh = () => {
      const deadline = Date.now() + DURATION_MS;
      try { localStorage.setItem(STORAGE_KEY, String(deadline)); } catch { /* ignore */ }
      return deadline;
    };

    let deadline = 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      deadline = stored ? parseInt(stored, 10) : 0;
      // Missing, invalid, or already expired → begin a new cycle.
      if (!deadline || Number.isNaN(deadline) || deadline <= Date.now()) {
        deadline = startFresh();
      }
    } catch {
      deadline = Date.now() + DURATION_MS;
    }

    const tick = () => {
      let rem = deadline - Date.now();
      if (rem <= 0) {
        // Hit zero — loop straight into a new cycle instead of freezing at 00:00:00.
        deadline = startFresh();
        rem = deadline - Date.now();
      }
      setRemaining(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null; // avoid SSR/client mismatch on first paint

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[#ef4444]/[0.1] border border-[#ef4444]/35 px-2.5 md:px-3.5 py-1 md:py-1.5 backdrop-blur-sm text-[#ef4444] font-bold whitespace-nowrap shadow-[0_0_14px_rgba(239,68,68,0.18)]">
      <span aria-hidden className="text-xs md:text-sm">⏰</span>
      <span className="text-[10px] md:text-sm leading-none">优惠倒数</span>
      <span className="text-xs md:text-base tabular-nums leading-none tracking-wide">
        {days}天 {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}
