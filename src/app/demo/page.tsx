'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ChatRoom, { ChatMessage } from '@/components/chat/ChatRoom';
import CTAOverlay from '@/components/cta/CTAOverlay';
import { Webinar, CTAEvent } from '@/lib/types';
import { Badge, Button } from '@/components/ui';

// Dynamically import VideoPlayer to avoid SSR issues with video.js
const VideoPlayer = dynamic(() => import('@/components/video/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-900 flex items-center justify-center rounded-xl border border-gray-800">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-gray-500">載入播放器中...</span>
      </div>
    </div>
  ),
});

// Load webinar data from API for demo
const DEFAULT_WEBINAR_ID = '1';

export default function DemoPage() {
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Viewer count (simulated)
  const [viewerCount, setViewerCount] = useState(247);

  // Fetch webinar data
  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${DEFAULT_WEBINAR_ID}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
      } catch (err) {
        console.error('Failed to fetch webinar:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, []);

  // Simulate viewer count fluctuation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const delta = Math.floor(Math.random() * 10) - 3;
        return Math.max(200, prev + delta);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle video playback events
  const handlePlaybackEvent = useCallback(
    (event: { type: string; currentTime: number; duration: number }) => {
      if (event.type === 'timeupdate') {
        setCurrentTime(event.currentTime);
      }
      if (event.type === 'play') {
        setIsPlaying(true);
      }
      if (event.type === 'pause' || event.type === 'ended') {
        setIsPlaying(false);
      }
    },
    []
  );

  // Handle user chat messages
  const handleSendMessage = useCallback((msg: ChatMessage) => {
    console.log('User sent message:', msg);
  }, []);

  // Handle CTA clicks
  const handleCTAClick = useCallback((cta: CTAEvent) => {
    console.log('CTA clicked:', cta.buttonText);
    window.open(cta.url, '_blank');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">找不到 Webinar 資料</h1>
          <Button variant="ghost" onClick={() => window.location.href = '/admin'}>
            前往後台設定
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Header - 與 Live Room 統一風格 */}
      <header className="sticky top-0 z-50 bg-[#030303]/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-amber-500 rounded flex items-center justify-center">
                <span className="font-serif text-amber-500 text-sm">M</span>
              </div>
              <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-none">
                {webinar.title}
              </h1>
            </div>
            <Badge variant="live" pulse>
              DEMO
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              <span>{viewerCount.toLocaleString()} watching</span>
            </div>
            <a 
              href="/admin" 
              className="text-gray-400 hover:text-white text-sm hidden md:inline"
            >
              ⚙️ 後台
            </a>
          </div>
        </div>
      </header>

      {/* Main content - 與 Live Room 統一結構 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video + CTA section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player Container */}
            <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
              <VideoPlayer
                src={webinar.videoUrl}
                autoPlay={false}
                onPlaybackEvent={handlePlaybackEvent}
              />
            </div>

            {/* CTA Overlay */}
            <CTAOverlay
              currentTime={currentTime}
              ctaEvents={webinar.ctaEvents}
              onCTAClick={handleCTAClick}
            />

            {/* Video info card - 與 Live Room 統一 */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">{webinar.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {webinar.speakerImage && (
                      <img
                        src={webinar.speakerImage}
                        alt={webinar.speakerName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-700"
                      />
                    )}
                    <div>
                      <p className="font-medium text-white">{webinar.speakerName}</p>
                      {webinar.speakerTitle && (
                        <p className="text-gray-500 text-xs">{webinar.speakerTitle}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>⏱️ {formatTime(currentTime)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {isPlaying ? '播放中' : '暫停'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo 功能說明 */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 text-sm font-medium mb-2">🎯 Demo 模式</p>
              <p className="text-gray-400 text-xs">
                這是測試頁面。播放影片後，自動聊天訊息和 CTA 會依照時間觸發。
                正式直播請從首頁報名進入。
              </p>
            </div>
          </div>

          {/* Chat section */}
          <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
            <div className="h-full bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <ChatRoom
                currentTime={currentTime}
                autoMessages={webinar.autoChat}
                timeVariance={3}
                userName="Demo 觀眾"
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 py-6 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 text-sm">
            Webinar Demo — 功能測試頁面
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
            <span>✅ 影片播放</span>
            <span>✅ 自動聊天</span>
            <span>✅ CTA 觸發</span>
            <span>✅ 觀看人數</span>
          </div>
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
