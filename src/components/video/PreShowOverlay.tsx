'use client';

import CountdownTimer from '@/components/countdown/CountdownTimer';
import { Badge } from '@/components/ui';

interface PreShowOverlayProps {
  targetTime: string;
  title: string;
  speakerName: string;
  promoImage?: string;
  speakerImage?: string;
  onCountdownComplete: () => void;
}

export default function PreShowOverlay({
  targetTime,
  title,
  speakerName,
  promoImage,
  speakerImage,
  onCountdownComplete,
}: PreShowOverlayProps) {
  const backgroundImage = promoImage || speakerImage;

  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/60" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 text-center text-white px-6 max-w-lg">
        <Badge variant="gold" className="mb-4">
          即将开始
        </Badge>

        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {title}
        </h2>

        <p className="text-white/60 text-sm mb-6">
          讲者：{speakerName}
        </p>

        <div className="mb-4">
          <CountdownTimer
            targetTime={targetTime}
            size="lg"
            variant="urgent"
            showDays={false}
            showLabels={true}
            onComplete={onCountdownComplete}
          />
        </div>

        <p className="text-white/40 text-xs">
          直播开始后将自动播放
        </p>
      </div>
    </div>
  );
}
