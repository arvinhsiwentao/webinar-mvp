'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatRoom, { ChatMessage } from '@/components/chat/ChatRoom';
import CTAOverlay from '@/components/cta/CTAOverlay';
import { Webinar, Session, CTAEvent } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { track } from '@/lib/tracking';

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

export default function LiveRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session');
  const userName = searchParams.get('name') || '观众';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Viewer count (simulated)
  const [realViewerCount, setRealViewerCount] = useState(1);

  // Computed viewer count using configurable formula
  const viewerCount = useMemo(() => {
    const base = webinar?.viewerBaseCount ?? 100;
    const multiplier = webinar?.viewerMultiplier ?? 3;
    const calculated = (realViewerCount * multiplier) + base;
    const variance = calculated * 0.05; // ±5%
    const random = (Math.random() * 2 - 1) * variance;
    return Math.round(calculated + random);
  }, [realViewerCount, webinar]);

  // Tracking milestones
  const trackedMilestones = useRef<Set<number>>(new Set());

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

  useEffect(() => {
    track('webinar_join', { webinarId });
  }, [webinarId]);

  // Simulate viewer count fluctuation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setRealViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle video playback events
  const handlePlaybackEvent = useCallback(
    (event: { type: string; currentTime: number; duration: number }) => {
      if (event.type === 'timeupdate') {
        setCurrentTime(event.currentTime);
        if (event.duration > 0) {
          const percent = Math.floor((event.currentTime / event.duration) * 100);
          [25, 50, 75, 100].forEach(milestone => {
            if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
              trackedMilestones.current.add(milestone);
              track('video_progress', { webinarId, percent: milestone });
            }
          });
        }
      }
      if (event.type === 'play') {
        setIsPlaying(true);
      }
      if (event.type === 'pause') {
        setIsPlaying(false);
      }
      if (event.type === 'ended') {
        setIsPlaying(false);
        track('webinar_leave', { webinarId, reason: 'ended' });
        // Redirect to end page after short delay
        setTimeout(() => {
          router.push(`/webinar/${webinarId}/end?session=${session?.id}&name=${encodeURIComponent(userName)}`);
        }, 2000);
      }
    },
    [webinarId, router, session, userName]
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
    track('cta_click', { webinarId, buttonText: cta.buttonText, url: cta.url });
  }, [webinarId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">加载直播中...</p>
        </div>
      </div>
    );
  }

  if (!webinar || !session) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center text-neutral-900">
          <h1 className="text-2xl font-bold mb-4">找不到直播</h1>
          <Button variant="ghost" onClick={() => router.push('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">
      {/* Header */}
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
              LIVE
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-neutral-500 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <span>{viewerCount.toLocaleString()} 正在观看</span>
          </div>
        </div>
      </header>

      {/* Main content */}
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
              onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText })}
            />

            {/* Video info card */}
            <div className="bg-white/80 border border-neutral-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">{webinar.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    {(webinar.speakerAvatar || webinar.speakerImage) && (
                      <img
                        src={webinar.speakerAvatar || webinar.speakerImage}
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
                      {isPlaying ? '播放中' : '暂停'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Speaker Info */}
            <div className="lg:hidden bg-white/80 border border-neutral-200 rounded-lg p-5">
              <div className="flex items-center gap-4">
                {(webinar.speakerAvatar || webinar.speakerImage) && (
                  <img
                    src={webinar.speakerAvatar || webinar.speakerImage}
                    alt={webinar.speakerName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#B8953F]/30"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg">{webinar.speakerName}</h3>
                  {webinar.speakerTitle && (
                    <p className="text-sm text-[#B8953F]">{webinar.speakerTitle}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat section */}
          <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
            <div className="h-full bg-white/80 border border-neutral-200 rounded-lg overflow-hidden">
              <ChatRoom
                currentTime={currentTime}
                autoMessages={webinar.autoChat}
                timeVariance={3}
                userName={userName}
                webinarId={webinarId}
                sessionId={session?.id}
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
            🔒 请勿录影或截图分享
          </p>
          <p className="text-neutral-400 text-xs mt-2">
            © 2026 {webinar.speakerName}. All rights reserved.
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
