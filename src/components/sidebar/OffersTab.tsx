'use client';

import { CTAEvent } from '@/lib/types';

interface OffersTabProps {
  ctaEvents: CTAEvent[];
  currentTime: number;
  onOfferClick?: (cta: CTAEvent) => void;
}

export default function OffersTab({ ctaEvents, currentTime, onOfferClick }: OffersTabProps) {
  // Find currently active offers
  const activeOffers = ctaEvents.filter(
    cta => currentTime >= cta.showAtSec && currentTime <= cta.hideAtSec
  );

  // Find upcoming offers (not yet active)
  const upcomingOffers = ctaEvents.filter(
    cta => currentTime < cta.showAtSec
  );

  return (
    <div className="h-full overflow-y-auto p-4 text-white">
      <h3 className="text-sm font-semibold mb-4">限时优惠</h3>

      {activeOffers.length === 0 && upcomingOffers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-400 text-sm">暂无优惠</p>
          <p className="text-neutral-500 text-xs mt-1">请继续观看讲座，限时优惠即将出现</p>
        </div>
      )}

      {/* Active offers */}
      {activeOffers.map((cta, idx) => (
        <div key={`active-${idx}`} className="mb-4 rounded-lg overflow-hidden border border-neutral-600">
          <div className="bg-gradient-to-r from-[#B8953F]/20 to-transparent p-1">
            <span className="text-[10px] text-[#B8953F] font-bold uppercase px-2">限时优惠</span>
          </div>
          <div className="p-4 space-y-3">
            {cta.promoText && (
              <p className="text-sm font-medium text-neutral-200">{cta.promoText}</p>
            )}
            {cta.secondaryText && (
              <p className="text-xs text-neutral-400">{cta.secondaryText}</p>
            )}
            <a
              href={cta.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOfferClick?.(cta)}
              className="block w-full text-center py-2.5 rounded text-sm font-semibold transition-colors"
              style={{ backgroundColor: cta.color || '#B8953F', color: 'white' }}
            >
              {cta.buttonText}
            </a>
          </div>
        </div>
      ))}

      {/* Upcoming offers teaser */}
      {upcomingOffers.length > 0 && activeOffers.length === 0 && (
        <div className="text-center py-8 border border-dashed border-neutral-600 rounded-lg">
          <p className="text-neutral-400 text-sm">🎁 {upcomingOffers.length} 个限时优惠即将出现</p>
          <p className="text-neutral-500 text-xs mt-1">请继续观看讲座</p>
        </div>
      )}
    </div>
  );
}
