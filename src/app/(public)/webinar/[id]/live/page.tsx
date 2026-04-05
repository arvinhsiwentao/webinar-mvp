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
import { trackGA4, DEFAULT_PRODUCT_PRICE } from '@/lib/analytics';
import { formatElapsedTime, getStoredUtmParams } from '@/lib/utils';
import { calculateLateJoinPosition } from '@/lib/evergreen';
import { useViewerSimulator } from '@/lib/viewer-simulator';
import { useVisibilityResume } from '@/hooks/useVisibilityResume';
import { usePlaybackTracking } from '@/hooks/usePlaybackTracking';
import FloatingFAQChat from '@/components/chat/FloatingFAQChat';
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

  // Track when each CTA became visible (for cta_visible_duration_sec)
  const ctaViewTimestamps = useRef<Map<string, number>>(new Map());
  // Track page load time (for session_watch_duration_sec)
  const sessionStartTime = useRef(Date.now());

  // Extract unique auto-chat sender names for viewer sync
  const autoChatNames = useMemo(() => {
    if (!webinar?.autoChat) return [];
    return [...new Set(webinar.autoChat.map(m => m.name))];
  }, [webinar]);

  // Simulated viewer list (replaces old formula)
  const { viewers, viewerCount } = useViewerSimulator({
    peakTarget: webinar?.viewerPeakTarget ?? 60,
    rampMinutes: webinar?.viewerRampMinutes ?? 15,
    videoDurationSec: (webinar?.duration ?? 60) * 60,
    currentTimeSec: currentTime,
    isPlaying,
    autoChatNames,
    hostName: webinar?.speakerName,
    userName,
    initialTimeSec: lateJoinSeconds,
  });

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
              const utmStr = new URLSearchParams(getStoredUtmParams()).toString();
              const utmParam = utmStr ? `&${utmStr}` : '';
              router.replace(`/webinar/${webinarId}/lobby?name=${encodeURIComponent(userName)}${slotParam}${utmParam}`);
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
  useVisibilityResume({
    eventPhase,
    slotTime,
    playerRef: playerInstanceRef,
    setEventPhase,
    setIsMuted,
    setAutoplayBlocked,
  });

  // Playback tracking (milestones, heartbeat, ended redirect)
  const { handlePlaybackEvent } = usePlaybackTracking({
    webinarId,
    userName,
    lateJoinSeconds,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
  });

  // Handle user chat messages
  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      trackGA4('c_chat_message', { webinar_id: webinarId, video_time_sec: Math.round(currentTime) });
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
    [webinarId, currentTime]
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

      // Detect total autoplay failure — only when tab is visible.
      // Background tabs always block autoplay, so checking there gives false positives.
      // The visibilitychange handler handles recovery when the user returns.
      const scheduleAutoplayCheck = () => {
        setTimeout(() => {
          if (!player.isDisposed() && player.paused()) {
            setAutoplayBlocked(true);
          }
        }, 3000);
      };

      if (document.visibilityState === 'visible') {
        scheduleAutoplayCheck();
      } else {
        // Tab is hidden — defer the check until tab becomes visible
        const onVisible = () => {
          if (document.visibilityState !== 'visible') return;
          document.removeEventListener('visibilitychange', onVisible);
          // Give the visibilitychange play handler time to attempt playback first
          setTimeout(() => {
            if (!player.isDisposed() && player.paused()) {
              scheduleAutoplayCheck();
            }
          }, 500);
        };
        document.addEventListener('visibilitychange', onVisible);
      }

      player.on('play', () => {
        setAutoplayBlocked(false);
      });
    }
  }, [isReplay]);

  // Handle CTA view/dismiss tracking
  const handleCTAView = useCallback((cta: CTAEvent) => {
    ctaViewTimestamps.current.set(cta.id, Date.now());
    trackGA4('c_cta_view', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) });
  }, [webinarId, currentTime]);

  const handleCTADismiss = useCallback((cta: CTAEvent) => {
    trackGA4('c_cta_dismiss', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) });
  }, [webinarId, currentTime]);

  // Handle CTA clicks
  const handleCTAClick = useCallback((cta: CTAEvent) => {
    const viewedAt = ctaViewTimestamps.current.get(cta.id);
    const visibleDuration = viewedAt ? Math.round((Date.now() - viewedAt) / 1000) : 0;
    trackGA4('c_cta_click', {
      webinar_id: webinarId,
      cta_id: cta.id,
      cta_type: cta.buttonText.slice(0, 100),
      video_time_sec: Math.round(currentTime),
      cta_position: cta.position || 'below_video',
      cta_visible_duration_sec: visibleDuration,
      session_watch_duration_sec: Math.round((Date.now() - sessionStartTime.current) / 1000),
    });

    trackGA4('begin_checkout', {
      currency: 'USD',
      value: DEFAULT_PRODUCT_PRICE,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: DEFAULT_PRODUCT_PRICE, quantity: 1 }],
      cta_id: cta.id,
      video_time_sec: Math.round(currentTime),
      source: 'live',
    });

    // Read email: localStorage first, URL param fallback
    let email = '';
    let userName = '';
    try {
      const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
      if (sticky) {
        const parsed = JSON.parse(sticky);
        email = parsed.email || '';
      }
    } catch { /* ignore */ }
    if (!email) {
      email = searchParams.get('email') || '';
    }

    // Get name from URL search params
    userName = searchParams.get('name') || '';

    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (userName) params.set('name', userName);
    params.set('source', 'live');

    // Append UTM attribution for cross-tab checkout
    const utmParams = getStoredUtmParams();
    for (const [key, value] of Object.entries(utmParams)) {
      params.set(key, value);
    }

    // Pass remaining countdown time if CTA has countdown
    if (cta.showCountdown && cta.hideAtSec) {
      const remaining = Math.max(0, Math.round(cta.hideAtSec - currentTime));
      if (remaining > 0) params.set('t', remaining.toString());
    }

    // Open checkout in new tab (preserves livestream)
    window.open(`/checkout/${webinarId}?${params.toString()}`, '_blank');
  }, [webinarId, searchParams, currentTime]);

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
                    slotTime={isReplay ? undefined : (slotTime || undefined)}
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
                onCTAView={handleCTAView}
                onCTADismiss={handleCTADismiss}
                position="on_video"
              />
            </div>

            {/* Below-video CTA overlays */}
            <CTAOverlay
              currentTime={currentTime}
              ctaEvents={(webinar.ctaEvents || []).filter(c => c.position !== 'on_video')}
              onCTAClick={handleCTAClick}
              onCTAView={handleCTAView}
              onCTADismiss={handleCTADismiss}
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

      {/* Floating FAQ Chatbot — appears when first CTA shows */}
      <FloatingFAQChat
        webinarId={webinarId}
        pageSource="live"
        showAfterSec={webinar.ctaEvents?.[0]?.showAtSec}
        currentTime={currentTime}
      />

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
