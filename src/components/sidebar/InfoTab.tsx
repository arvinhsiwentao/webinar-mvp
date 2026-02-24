'use client';

import Image from 'next/image';

interface InfoTabProps {
  title: string;
  speakerName: string;
  speakerTitle?: string;
  speakerImage?: string;
  description?: string;
  promoImageUrl?: string;
}

export default function InfoTab({
  title,
  speakerName,
  speakerTitle,
  speakerImage,
  description,
  promoImageUrl,
}: InfoTabProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-[#1A1A1A]">
      {/* Promo image */}
      {promoImageUrl && (
        <div className="relative w-full aspect-video rounded overflow-hidden border border-[#E8E5DE]">
          <Image src={promoImageUrl} alt={title} fill className="object-cover" />
        </div>
      )}

      {/* Speaker info */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-[#FAFAF7] border border-[#F0EDE6]">
        {speakerImage && (
          <img
            src={speakerImage}
            alt={speakerName}
            className="w-10 h-10 rounded-full object-cover border border-[#E8E5DE]"
          />
        )}
        <div>
          <p className="font-semibold text-sm text-[#1A1A1A]">{speakerName}</p>
          {speakerTitle && (
            <p className="text-xs text-[#6B6B6B]">{speakerTitle}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-[#1A1A1A]">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-[#6B6B6B] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
