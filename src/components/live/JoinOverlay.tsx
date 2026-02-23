'use client';

import { useState, useEffect } from 'react';

interface JoinOverlayProps {
  onJoin: () => void;
  speakerName?: string;
}

export default function JoinOverlay({ onJoin, speakerName }: JoinOverlayProps) {
  const [ready, setReady] = useState(false);

  // Simulate connection delay (2-3 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-neutral-900 flex items-center justify-center">
      <div className="text-center px-6">
        {!ready ? (
          <>
            <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white text-lg font-medium mb-2">
              正在连接到线上讲座……
            </p>
            <p className="text-neutral-400 text-sm">
              {speakerName ? `${speakerName} 的直播即将开始` : '请稍候'}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-lg font-medium mb-2">
              讲座可以观看了
            </p>
            <p className="text-neutral-400 text-sm mb-6">
              请现在加入
            </p>
            <button
              onClick={onJoin}
              className="bg-[#B8953F] hover:bg-[#A6842F] text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              加入讲座
            </button>
          </>
        )}
      </div>
    </div>
  );
}
