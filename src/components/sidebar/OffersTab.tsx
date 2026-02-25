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
    <div className="h-full overflow-y-auto p-4 text-[#1A1A1A]">
      <h3 className="text-sm font-semibold mb-4 text-[#1A1A1A]">限时优惠</h3>

      {activeOffers.length === 0 && upcomingOffers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#6B6B6B] text-sm">暂无优惠</p>
          <p className="text-[#9CA3AF] text-xs mt-1">请继续观看讲座，限时优惠即将出现</p>
        </div>
      )}

      {/* Active offers */}
      {activeOffers.map((cta, idx) => (
        <div key={`active-${idx}`} className="mb-4 rounded-lg overflow-hidden border border-[#E8E5DE] bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#B8953F]/10 to-transparent px-3 py-1.5 border-b border-[#F0EDE6]">
            <span className="text-[10px] text-[#B8953F] font-bold uppercase tracking-wider">限时优惠</span>
          </div>
          <div className="p-4 space-y-3">
            {cta.promoText && (
              <p className="text-sm font-medium text-[#1A1A1A]">{cta.promoText}</p>
            )}
            {cta.secondaryText && (
              <p className="text-xs text-[#6B6B6B]">{cta.secondaryText}</p>
            )}
            <a
              href={cta.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOfferClick?.(cta)}
              className="block w-full text-center py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
              style={{ backgroundColor: cta.color || '#B8953F', color: 'white' }}
            >
              {cta.buttonText}
            </a>
          </div>
        </div>
      ))}

      {/* Upcoming offers teaser */}
      {upcomingOffers.length > 0 && activeOffers.length === 0 && (
        <div className="text-center py-8 border border-dashed border-[#E8E5DE] rounded-lg bg-[#FAFAF7]">
          <p className="text-[#6B6B6B] text-sm">🎁 限时优惠即将公布</p>
          <p className="text-[#9CA3AF] text-xs mt-1">请继续观看讲座</p>
        </div>
      )}
    </div>
  );
}
