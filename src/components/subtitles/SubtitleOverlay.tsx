'use client';

import { useMemo } from 'react';
import type { WebinarSubtitleCue } from '@/lib/types';

interface SubtitleOverlayProps {
  currentTime: number;
  cues?: WebinarSubtitleCue[];
}

function findActiveCue(cues: WebinarSubtitleCue[], currentTime: number): WebinarSubtitleCue | null {
  let left = 0;
  let right = cues.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cue = cues[mid];
    if (currentTime < cue.start) {
      right = mid - 1;
      continue;
    }
    if (currentTime > cue.end) {
      left = mid + 1;
      continue;
    }
    return cue;
  }

  return null;
}

export default function SubtitleOverlay({ currentTime, cues = [] }: SubtitleOverlayProps) {
  const normalizedCues = useMemo(
    () => [...cues].sort((a, b) => a.start - b.start || a.end - b.end),
    [cues],
  );

  const activeCue = useMemo(
    () => findActiveCue(normalizedCues, currentTime),
    [normalizedCues, currentTime],
  );

  if (!activeCue || activeCue.lines.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 md:bottom-8 z-40 flex justify-center px-4">
      <div className="max-w-[92%] md:max-w-[80%] bg-gradient-to-t from-black/70 to-black/20 rounded-md px-4 py-2 md:px-6 md:py-3">
        {activeCue.lines.map((line, index) => (
          <p
            key={`${activeCue.id}-${index}`}
            className="text-center text-white text-base md:text-xl lg:text-2xl font-semibold leading-tight tracking-[0.01em]"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.75)',
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
