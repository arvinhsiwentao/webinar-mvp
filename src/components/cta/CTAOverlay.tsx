'use client';

import { useState, useEffect, useRef } from 'react';
import { CTAEvent } from '@/lib/types';
import { formatCountdownMMSS } from '@/lib/utils';

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
  /** Where the CTA renders: on top of the video or below it */
  position?: 'on_video' | 'below_video';
}

export default function CTAOverlay({ currentTime, ctaEvents, onCTAClick, onCTAView, position = 'below_video' }: CTAOverlayProps) {
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
  const bgColor = activeCTA.color || '#B8953F';
  const isOnVideo = position === 'on_video';

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${isOnVideo ? 'absolute bottom-4 left-4 right-4 z-10' : ''}
      `}
    >
      <div
        className={`
          rounded-xl shadow-2xl
          ${isOnVideo
            ? 'bg-black/70 backdrop-blur-sm p-3'
            : 'p-5 max-w-lg mx-auto'
          }
        `}
        style={!isOnVideo ? { backgroundColor: bgColor } : undefined}
      >
        {/* Promo text */}
        {activeCTA.promoText && (
          <p className="text-white text-center text-sm mb-3 font-medium">
            {activeCTA.promoText}
          </p>
        )}

        {/* Secondary text */}
        {activeCTA.secondaryText && (
          <p className="text-white/80 text-center text-xs mb-3">
            {activeCTA.secondaryText}
          </p>
        )}

        {/* Countdown */}
        {activeCTA.showCountdown && remainingSec > 0 && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-white/70 text-xs">限时优惠</span>
            <span className="bg-black/30 text-white font-mono text-lg px-3 py-1 rounded-md">
              {formatCountdownMMSS(remainingSec)}
            </span>
          </div>
        )}

        {/* CTA button */}
        <a
          href={activeCTA.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onCTAClick?.(activeCTA)}
          className="block w-full text-center text-white font-bold text-lg py-3 px-6 rounded-lg hover:opacity-90 transition-opacity shadow-md"
          style={{ backgroundColor: bgColor }}
        >
          {activeCTA.buttonText}
        </a>
      </div>
    </div>
  );
}
