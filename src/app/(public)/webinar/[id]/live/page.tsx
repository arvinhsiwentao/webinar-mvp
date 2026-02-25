'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatRoom, { ChatMessage } from '@/components/chat/ChatRoom';
import CTAOverlay from '@/components/cta/CTAOverlay';
import SubtitleOverlay from '@/components/subtitles/SubtitleOverlay';
import SidebarTabs from '@/components/sidebar/SidebarTabs';
import InfoTab from '@/components/sidebar/InfoTab';
import ViewersTab from '@/components/sidebar/ViewersTab';
import OffersTab from '@/components/sidebar/OffersTab';
import UnmuteOverlay from '@/components/video/UnmuteOverlay';
import PreShowOverlay from '@/components/video/PreShowOverlay';
import { Webinar, CTAEvent } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { track } from '@/lib/tracking';
import { formatElapsedTime } from '@/lib/utils';
import { calculateLateJoinPosition } from '@/lib/evergreen';
import { useViewerSimulator } from '@/lib/viewer-simulator';
import type Player from 'video.js/dist/types/player';

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
  const userName = searchParams.get('name') || '观众';
  const slotTime = searchParams.get('slot');
  const isReplay = searchParams.get('replay') === 'true';

  // Compute once on mount — must not recalculate on re-renders or it
  // changes `initialTime`, causing VideoPlayer to dispose/recreate the player.
  const [lateJoinSeconds] = useState(() =>
    isReplay ? 0 : (slotTime ? calculateLateJoinPosition(slotTime) : 0)
  );

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventPhase, setEventPhase] = useState<'loading' | 'pre_event' | 'pre_show' | 'live' | 'ended'>('loading');
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const playerInstanceRef = useRef<Player | null>(null);

  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract unique auto-chat sender names for viewer sync
  const autoChatNames = useMemo(() => {
    if (!webinar?.autoChat) return [];
    return [...new Set(webinar.autoChat.map(m => m.name))];
  }, [webinar]);

  // Simulated viewer list (replaces old formula)
  const { viewers, viewerCount } = useViewerSimulator({
    peakTarget: webinar?.viewerPeakTarget ?? webinar?.viewerBaseCount ?? 60,
    rampMinutes: webinar?.viewerRampMinutes ?? 15,
    videoDurationSec: (webinar?.duration ?? 60) * 60,
    currentTimeSec: currentTime,
    isPlaying,
    autoChatNames,
    hostName: webinar?.speakerName,
    userName,
    initialTimeSec: lateJoinSeconds,
  });

  // Tracking milestones
  const trackedMilestones = useRef<Set<number>>(new Set());

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);

        // Compute event phase
        if (isReplay) {
          setEventPhase('live');
        } else {
          const startTimeStr = slotTime;
          if (startTimeStr) {
            const startMs = new Date(startTimeStr).getTime();
            const now = Date.now();
            const minutesUntil = (startMs - now) / (1000 * 60);

            if (minutesUntil > 30) {
              // Too early — redirect to lobby
              const slotParam = slotTime ? `&slot=${encodeURIComponent(slotTime)}` : '';
              router.replace(`/webinar/${webinarId}/lobby?name=${encodeURIComponent(userName)}${slotParam}`);
              return;
            } else if (minutesUntil > 0) {
              setEventPhase('pre_show');
            } else {
              setEventPhase('live');
            }
          } else {
            setEventPhase('live'); // fallback for missing start time
          }
        }
      } catch {
        console.error('Failed to fetch webinar');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId]);

  // Auto-transition from pre_show to live when start time arrives
  useEffect(() => {
    if (eventPhase !== 'pre_show') return;
    if (!slotTime) return;

    const checkPhase = () => {
      const now = Date.now();
      const startMs = new Date(slotTime).getTime();
      if (now >= startMs) {
        setEventPhase('live');
      }
    };

    const interval = setInterval(checkPhase, 1000);
    return () => clearInterval(interval);
  }, [eventPhase, slotTime]);

  // Resume playback when tab returns to foreground (background tabs block autoplay)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;

      // If still in pre_show but start time has passed, transition immediately
      if (eventPhase === 'pre_show' && slotTime) {
        const now = Date.now();
        const startMs = new Date(slotTime).getTime();
        if (now >= startMs) {
          setEventPhase('live');
          return;
        }
      }

      // If live but video is paused, try to resume playback
      if (eventPhase === 'live') {
        const player = playerInstanceRef.current;
        if (!player || player.isDisposed() || !player.paused()) return;

        // Try unmuted play first (user just switched to tab = user gesture context)
        player.muted(false);
        const playPromise = player.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(() => {
            setIsMuted(false);
            setAutoplayBlocked(false);
          }).catch(() => {
            // Unmuted play blocked — fall back to muted
            player.muted(true);
            setIsMuted(true);
            const mutedPromise = player.play();
            if (mutedPromise && typeof mutedPromise.then === 'function') {
              mutedPromise.then(() => {
                setAutoplayBlocked(false);
              }).catch(() => {
                setAutoplayBlocked(true);
              });
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [eventPhase, slotTime]);

  useEffect(() => {
    track('webinar_join', { webinarId });
  }, [webinarId]);

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
          router.push(`/webinar/${webinarId}/end?name=${encodeURIComponent(userName)}`);
        }, 2000);
      }
    },
    [webinarId, router, userName]
  );

  // Handle user chat messages
  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      try {
        await fetch(`/api/webinar/${webinarId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: msg.name,
            message: msg.message,
            timestamp: msg.timestamp,
          }),
        });
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [webinarId]
  );

  // Handle unmute from overlay
  const handleUnmute = useCallback(() => {
    if (playerInstanceRef.current) {
      playerInstanceRef.current.muted(false);
    }
    setIsMuted(false);
  }, []);

  // Expose player instance for unmute control
  const handlePlayerReady = useCallback((player: Player) => {
    playerInstanceRef.current = player;

    if (!isReplay) {
      // Detect if autoplay fell back to muted (browser policy blocked unmuted play)
      const onPlaying = () => {
        if (player.muted()) {
          setIsMuted(true);
        }
        player.off('playing', onPlaying);
      };
      player.on('playing', onPlaying);

      // Detect total autoplay failure — if video hasn't started playing within 3 seconds
      const timeout = setTimeout(() => {
        if (player.paused()) {
          setAutoplayBlocked(true);
        }
      }, 3000);

      player.on('play', () => {
        clearTimeout(timeout);
        setAutoplayBlocked(false);
      });
    }
  }, [isReplay]);

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

  if (!webinar) {
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
            <Badge variant="live" pulse={eventPhase === 'live'}>
              {eventPhase === 'pre_show' ? 'STARTING SOON' : 'LIVE'}
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
              {eventPhase === 'pre_show' ? (
                <PreShowOverlay
                  targetTime={slotTime || ''}
                  title={webinar.title}
                  speakerName={webinar.speakerName}
                  promoImage={webinar.promoImageUrl}
                  speakerImage={webinar.speakerAvatar || webinar.speakerImage}
                  onCountdownComplete={() => setEventPhase('live')}
                />
              ) : (
                <>
                  <VideoPlayer
                    src={webinar.videoUrl}
                    autoPlay={isReplay ? false : true}
                    livestreamMode={!isReplay}
                    onPlaybackEvent={handlePlaybackEvent}
                    onPlayerReady={handlePlayerReady}
                    initialTime={lateJoinSeconds}
                  />
                  {/* Unmute overlay (only in livestream mode, not replay) */}
                  {!isReplay && (
                    <UnmuteOverlay
                      visible={isMuted}
                      onUnmute={handleUnmute}
                    />
                  )}
                  {/* Autoplay blocked fallback */}
                  {autoplayBlocked && !isReplay && eventPhase === 'live' && (
                    <button
                      onClick={() => {
                        playerInstanceRef.current?.play();
                        setAutoplayBlocked(false);
                      }}
                      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 cursor-pointer"
                      aria-label="点击开始直播"
                    >
                      <div className="flex flex-col items-center gap-3 text-white">
                        <div className="w-20 h-20 rounded-full bg-[#B8953F] flex items-center justify-center">
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">点击开始直播</span>
                      </div>
                    </button>
                  )}
                </>
              )}
              <SubtitleOverlay currentTime={currentTime} cues={webinar.subtitleCues} />
              {/* On-video CTA overlays */}
              <CTAOverlay
                currentTime={currentTime}
                ctaEvents={(webinar.ctaEvents || []).filter(c => c.position === 'on_video')}
                onCTAClick={handleCTAClick}
                onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText })}
                position="on_video"
              />
            </div>

            {/* Below-video CTA overlays */}
            <CTAOverlay
              currentTime={currentTime}
              ctaEvents={(webinar.ctaEvents || []).filter(c => c.position !== 'on_video')}
              onCTAClick={handleCTAClick}
              onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText })}
              position="below_video"
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
                    {isReplay && <span>⏱️ {formatElapsedTime(currentTime)}</span>}
                    {isReplay && (
                      <span className={`px-2 py-0.5 rounded text-xs ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-neutral-200 text-neutral-500'}`}>
                        {isPlaying ? '播放中' : '暂停'}
                      </span>
                    )}
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

          {/* Sidebar with tabs */}
          <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
            <SidebarTabs
              defaultTab="chat"
              tabs={[
                {
                  id: 'info',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
                  label: '简介',
                  content: (
                    <InfoTab
                      title={webinar.title}
                      speakerName={webinar.speakerName}
                      speakerTitle={webinar.speakerTitle}
                      speakerImage={webinar.speakerAvatar || webinar.speakerImage}
                      description={webinar.sidebarDescription}
                      promoImageUrl={webinar.promoImageUrl}
                    />
                  ),
                },
                {
                  id: 'viewers',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
                  label: '观众',
                  content: (
                    <ViewersTab
                      viewers={viewers}
                      hostName={webinar.speakerName}
                      hostAvatar={webinar.speakerAvatar || webinar.speakerImage}
                      userName={userName}
                    />
                  ),
                },
                {
                  id: 'chat',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                  label: '聊天',
                  content: (
                    <ChatRoom
                      currentTime={currentTime}
                      autoMessages={webinar.autoChat || []}
                      timeVariance={3}
                      userName={userName}
                      webinarId={webinarId}
                      onSendMessage={handleSendMessage}
                      initialTime={lateJoinSeconds}
                      sessionStartTime={slotTime || undefined}
                      viewers={viewers}
                    />
                  ),
                },
                {
                  id: 'offers',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
                  label: '优惠',
                  content: (
                    <OffersTab
                      ctaEvents={webinar.ctaEvents || []}
                      currentTime={currentTime}
                      onOfferClick={handleCTAClick}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-4 py-6 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-400 text-sm flex items-center justify-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            请勿录影或截图分享
          </p>
          <p className="text-neutral-400 text-xs mt-2">
            © 2026 {webinar.speakerName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
