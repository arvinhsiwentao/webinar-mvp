'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatRoom, { ChatMessage } from '@/components/chat/ChatRoom';
import CTAOverlay from '@/components/cta/CTAOverlay';
import { Webinar, Session, CTAEvent } from '@/lib/types';

// Dynamically import VideoPlayer to avoid SSR issues with video.js
const VideoPlayer = dynamic(() => import('@/components/video/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-800 flex items-center justify-center rounded-lg">
      <span className="text-gray-400">Loading video player...</span>
    </div>
  ),
});

export default function LiveRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session');
  const userName = searchParams.get('name') || '觀眾';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Viewer count (simulated)
  const [viewerCount, setViewerCount] = useState(247);

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        
        const foundSession = data.webinar.sessions.find((s: Session) => s.id === sessionId);
        setSession(foundSession || data.webinar.sessions[0]);
      } catch {
        console.error('Failed to fetch webinar');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId, sessionId]);

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
  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!session) return;
      try {
        await fetch(`/api/webinar/${webinarId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            name: msg.name,
            message: msg.message,
            timestamp: msg.timestamp,
          }),
        });
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [webinarId, session]
  );

  // Handle CTA clicks
  const handleCTAClick = useCallback((cta: CTAEvent) => {
    console.log('CTA clicked:', cta.buttonText);
    // Track analytics here if needed
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!webinar || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">找不到直播</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] md:max-w-none">
              {webinar.title}
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Video info */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">{webinar.title}</h2>
              <p className="text-gray-400 text-sm">
                主講人: {webinar.speakerName}
                {webinar.speakerTitle && ` | ${webinar.speakerTitle}`}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>⏱️ {formatTime(currentTime)}</span>
                <span>📊 {isPlaying ? '播放中' : '暫停'}</span>
              </div>
            </div>

            {/* Speaker Info (Mobile) */}
            <div className="lg:hidden bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {webinar.speakerImage && (
                  <img
                    src={webinar.speakerImage}
                    alt={webinar.speakerName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{webinar.speakerName}</h3>
                  {webinar.speakerTitle && (
                    <p className="text-sm text-gray-400">{webinar.speakerTitle}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat section */}
          <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
            <ChatRoom
              currentTime={currentTime}
              autoMessages={webinar.autoChat}
              timeVariance={3}
              userName={userName}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Webinar MVP. 請勿錄影或截圖分享。</p>
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
