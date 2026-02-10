'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ChatRoom, { AutoChatMessage, ChatMessage } from '@/components/chat/ChatRoom';
import CTAOverlay from '@/components/cta/CTAOverlay';
import { CTAEvent } from '@/lib/types';

// Dynamically import VideoPlayer to avoid SSR issues with video.js
const VideoPlayer = dynamic(() => import('@/components/video/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-800 flex items-center justify-center rounded-lg">
      <span className="text-gray-400">Loading video player...</span>
    </div>
  ),
});

// Test HLS video URL (Big Buck Bunny)
const TEST_VIDEO_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Auto-chat test messages
const AUTO_MESSAGES: AutoChatMessage[] = [
  { timeSec: 3, name: 'Alex', message: '開始了！🎉' },
  { timeSec: 8, name: '小美', message: '期待這堂課很久了' },
  { timeSec: 15, name: 'David', message: '筆記中 📝' },
  { timeSec: 22, name: '阿明', message: '畫面很清楚！' },
  { timeSec: 30, name: 'Emma', message: '+1 這觀點很棒' },
  { timeSec: 40, name: 'Kevin', message: '講得太好了 👏' },
  { timeSec: 50, name: '小芳', message: '這個概念很新穎' },
  { timeSec: 60, name: 'Jason', message: '終於等到這堂課了' },
  { timeSec: 75, name: 'Linda', message: '想問哪裡可以購買？' },
  { timeSec: 90, name: 'Mike', message: '優惠連結出來了！' },
  { timeSec: 100, name: '小雨', message: '已購買 ✅' },
];

// CTA events configuration
const CTA_EVENTS: CTAEvent[] = [
  {
    id: 'demo-cta-1',
    showAtSec: 80,
    hideAtSec: 180,
    buttonText: '🔥 立即購買限時優惠',
    url: 'https://example.com/checkout',
    promoText: '原價 $9,900 → 直播限定 $4,900 (50% OFF)',
    showCountdown: true,
  },
];

export default function DemoPage() {
  const [currentTime, setCurrentTime] = useState(0);
  const [viewerCount, setViewerCount] = useState(247);
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulate fluctuating viewer count
  const updateViewerCount = useCallback(() => {
    setViewerCount((prev) => {
      const delta = Math.floor(Math.random() * 10) - 3; // -3 to +6
      return Math.max(200, prev + delta);
    });
  }, []);

  // Handle video playback events
  const handlePlaybackEvent = useCallback(
    (event: { type: string; currentTime: number; duration: number }) => {
      if (event.type === 'timeupdate') {
        setCurrentTime(event.currentTime);
      }
      if (event.type === 'play') {
        setIsPlaying(true);
        // Start viewer count fluctuation
        const interval = setInterval(updateViewerCount, 3000);
        return () => clearInterval(interval);
      }
      if (event.type === 'pause' || event.type === 'ended') {
        setIsPlaying(false);
      }
    },
    [updateViewerCount],
  );

  // Handle user chat messages
  const handleSendMessage = useCallback((msg: ChatMessage) => {
    console.log('User sent message:', msg);
  }, []);

  // Handle CTA clicks
  const handleCTAClick = useCallback((cta: CTAEvent) => {
    console.log('CTA clicked:', cta.buttonText);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Webinar MVP Demo</h1>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <span>{viewerCount.toLocaleString()} watching</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video + CTA section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className="relative">
              <VideoPlayer
                src={TEST_VIDEO_URL}
                autoPlay={false}
                onPlaybackEvent={handlePlaybackEvent}
              />
            </div>

            {/* CTA Overlay */}
            <CTAOverlay
              currentTime={currentTime}
              ctaEvents={CTA_EVENTS}
              onCTAClick={handleCTAClick}
            />

            {/* Video info */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">
                AIC 雙風口機遇講座 - 2026年最新趨勢分析
              </h2>
              <p className="text-gray-400 text-sm">
                主講人: 王大明 | 直播時間: 90 分鐘
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>⏱️ 播放時間: {formatTime(currentTime)}</span>
                <span>📊 狀態: {isPlaying ? '播放中' : '暫停'}</span>
              </div>
            </div>
          </div>

          {/* Chat section */}
          <div className="lg:col-span-1 h-[600px]">
            <ChatRoom
              currentTime={currentTime}
              autoMessages={AUTO_MESSAGES}
              timeVariance={3}
              userName="觀眾"
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>Webinar MVP Demo - 模擬直播功能展示</p>
          <p className="mt-1">
            功能: 影片播放 ✅ | 自動聊天 ✅ | CTA 限時優惠 ✅ | 觀看人數 ✅
          </p>
        </div>
      </footer>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
