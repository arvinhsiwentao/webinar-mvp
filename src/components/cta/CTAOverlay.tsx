'use client';

import { useState, useEffect, useRef } from 'react';
import { CTAEvent } from '@/lib/types';

export type { CTAEvent };

export interface CTAOverlayProps {
  /** Current video playback time in seconds */
  currentTime: number;
  /** CTA configurations */
  ctaEvents: CTAEvent[];
  /** Called when user clicks the CTA button */
  onCTAClick?: (cta: CTAEvent) => void;
  /** Called when a CTA becomes visible */
  onCTAView?: (cta: CTAEvent) => void;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function CTAOverlay({ currentTime, ctaEvents, onCTAClick, onCTAView }: CTAOverlayProps) {
  const [activeCTA, setActiveCTA] = useState<CTAEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const prevActive = useRef<CTAEvent | null>(null);

  // Determine which CTA (if any) should be active based on current video time
  useEffect(() => {
    let matched: CTAEvent | null = null;
    for (const cta of ctaEvents) {
      if (currentTime >= cta.showAtSec && currentTime < cta.hideAtSec) {
        matched = cta;
        break;
      }
    }

    if (matched !== prevActive.current) {
      prevActive.current = matched;
      setActiveCTA(matched);
      // Animate in
      if (matched) {
        onCTAView?.(matched);
        requestAnimationFrame(() => setVisible(true));
      } else {
        setVisible(false);
      }
    }
  }, [currentTime, ctaEvents, onCTAView]);

  if (!activeCTA) return null;

  const remainingSec = activeCTA.hideAtSec - currentTime;

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-5 shadow-2xl border border-orange-400/30 max-w-lg mx-auto">
        {/* Promo text */}
        {activeCTA.promoText && (
          <p className="text-white text-center text-sm mb-3 font-medium">
            {activeCTA.promoText}
          </p>
        )}

        {/* Countdown */}
        {activeCTA.showCountdown && remainingSec > 0 && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-orange-200 text-xs">Limited time remaining</span>
            <span className="bg-black/30 text-white font-mono text-lg px-3 py-1 rounded-md">
              {formatCountdown(remainingSec)}
            </span>
          </div>
        )}

        {/* CTA button */}
        <a
          href={activeCTA.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onCTAClick?.(activeCTA)}
          className="block w-full text-center bg-white text-red-600 font-bold text-lg py-3 px-6 rounded-lg hover:bg-neutral-100 transition-colors shadow-md"
        >
          {activeCTA.buttonText}
        </a>
      </div>
    </div>
  );
}
