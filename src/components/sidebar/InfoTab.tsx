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
    <div className="h-full overflow-y-auto p-4 space-y-4 text-white">
      {/* Promo image */}
      {promoImageUrl && (
        <div className="relative w-full aspect-video rounded overflow-hidden">
          <Image src={promoImageUrl} alt={title} fill className="object-cover" />
        </div>
      )}

      {/* Speaker info */}
      <div className="flex items-center gap-3">
        {speakerImage && (
          <img
            src={speakerImage}
            alt={speakerName}
            className="w-10 h-10 rounded-full object-cover border border-neutral-600"
          />
        )}
        <div>
          <p className="font-semibold text-sm">{speakerName}</p>
          {speakerTitle && (
            <p className="text-xs text-neutral-400">{speakerTitle}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-neutral-300 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
