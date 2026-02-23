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
    <div className="w-full aspect-video bg-white flex items-center justify-center rounded-lg border border-neutral-200">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-neutral-400">加载播放器中...</span>
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
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center text-neutral-900">
          <h1 className="text-2xl font-bold mb-4">找不到 Webinar 资料</h1>
          <Button variant="ghost" onClick={() => window.location.href = '/admin'}>
            前往后台设置
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">
      {/* Header - 与 Live Room 统一风格 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-[#B8953F] rounded flex items-center justify-center">
                <span className="font-serif text-[#B8953F] text-sm">M</span>
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
            <div className="flex items-center gap-2 text-neutral-500 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              <span>{viewerCount.toLocaleString()} watching</span>
            </div>
            <a
              href="/admin"
              className="text-neutral-500 hover:text-neutral-900 text-sm hidden md:inline"
            >
              ⚙️ 后台
            </a>
          </div>
        </div>
      </header>

      {/* Main content - 与 Live Room 统一结构 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video + CTA section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player Container */}
            <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-white">
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

            {/* Video info card - 与 Live Room 统一 */}
            <div className="bg-white/80 border border-neutral-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">{webinar.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    {webinar.speakerImage && (
                      <img
                        src={webinar.speakerImage}
                        alt={webinar.speakerName}
                        className="w-10 h-10 rounded-full object-cover border border-[#E8E5DE]"
                      />
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">{webinar.speakerName}</p>
                      {webinar.speakerTitle && (
                        <p className="text-neutral-400 text-xs">{webinar.speakerTitle}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span>⏱️ {formatTime(currentTime)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-neutral-200 text-neutral-500'}`}>
                      {isPlaying ? '播放中' : '暫停'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo 功能說明 */}
            <div className="bg-[#B8953F]/8 border border-[#B8953F]/30 rounded-lg p-4">
              <p className="text-[#B8953F] text-sm font-medium mb-2">🎯 Demo 模式</p>
              <p className="text-neutral-500 text-xs">
                这是测试页面。播放视频后，自动聊天消息和 CTA 会依照时间触发。
                正式直播请从首页报名进入。
              </p>
            </div>
          </div>

          {/* Chat section */}
          <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
            <div className="h-full bg-white/80 border border-neutral-200 rounded-lg overflow-hidden">
              <ChatRoom
                currentTime={currentTime}
                autoMessages={webinar.autoChat}
                timeVariance={3}
                userName="Demo 观众"
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-4 py-6 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-400 text-sm">
            Webinar Demo — 功能测试页面
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-neutral-400">
            <span>✅ 视频播放</span>
            <span>✅ 自动聊天</span>
            <span>✅ CTA 触发</span>
            <span>✅ 观看人数</span>
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
