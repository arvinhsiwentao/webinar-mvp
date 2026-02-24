'use client';

import { useState } from 'react';

interface UnmuteOverlayProps {
  onUnmute: () => void;
  visible: boolean;
}

export default function UnmuteOverlay({ onUnmute, visible }: UnmuteOverlayProps) {
  const [fading, setFading] = useState(false);

  if (!visible && !fading) return null;

  const handleClick = () => {
    setFading(true);
    onUnmute();
    setTimeout(() => setFading(false), 500);
  };

  return (
    <button
      onClick={handleClick}
      className={`absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="点击取消静音"
    >
      <div className="flex flex-col items-center gap-3 text-white">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
        <span className="text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full">
          点击取消静音 🔊
        </span>
      </div>
    </button>
  );
}
