'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import { getVideoSourceType } from '@/lib/utils';

const FULLSCREEN_EXPAND_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const FULLSCREEN_COMPRESS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

const TIMEUPDATE_EMIT_INTERVAL_SEC = 0.1;

export interface PlaybackEvent {
  type: 'play' | 'pause' | 'timeupdate' | 'ended' | 'ready';
  currentTime: number;
  duration: number;
}

export interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  onPlaybackEvent?: (event: PlaybackEvent) => void;
  initialTime?: number;  // seconds — seek to this position on load (late join)
  livestreamMode?: boolean;   // hides controls, enables muted autoplay
  onPlayerReady?: (player: Player) => void;  // exposes Video.js player instance
  slotTime?: string;  // ISO timestamp — wall-clock anchor for DVR seek limiting
}

export default function VideoPlayer({
  src,
  autoPlay = false,
  onPlaybackEvent,
  initialTime,
  livestreamMode = false,
  onPlayerReady,
  slotTime,
}: VideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastReportedTime = useRef(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const emitEvent = useCallback(
    (type: PlaybackEvent['type'], player: Player) => {
      onPlaybackEvent?.({
        type,
        currentTime: player.currentTime() ?? 0,
        duration: player.duration() ?? 0,
      });
    },
    [onPlaybackEvent],
  );

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-fluid');
    // playsinline prevents iOS from auto-entering native fullscreen on play
    if (livestreamMode) {
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('webkit-playsinline', '');
    }
    videoRef.current.appendChild(videoElement);

    const sourceType = getVideoSourceType(src);

    const playerOptions: Record<string, unknown> = {
      controls: true,
      autoplay: livestreamMode ? 'any' : autoPlay,
      preload: 'auto',
      fluid: true,
      playbackRates: [], // no speed options
      controlBar: livestreamMode
        ? {
            progressControl: false,
            remainingTimeDisplay: false,
            playbackRateMenuButton: false,
            durationDisplay: false,
            timeDivider: false,
            currentTimeDisplay: true,
            fullscreenToggle: false, // replaced by custom container-based fullscreen
          }
        : {
            progressControl: true,
            remainingTimeDisplay: false,
            playbackRateMenuButton: false,
          },
      sources: [{ src, type: sourceType }],
    };

    const player = videojs(videoElement, playerOptions);
    playerRef.current = player;

    let isAdjustingTime = false; // reentrancy guard — prevents stack overflow
    const setAdjusting = (value: boolean) => {
      isAdjustingTime = value;
      if (value) {
        // Deferred reset as safety net — clears guard even if seeking event fires async
        setTimeout(() => { isAdjustingTime = false; }, 50);
      }
    };

    // Wall-clock tracking for DVR seek limiting
    const SESSION_KEY = `webinar-wall-clock-${slotTime || 'default'}-${src}`;
    let wallClockStartMs: number;
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
    if (stored) {
      wallClockStartMs = parseInt(stored, 10);
    } else if (slotTime) {
      wallClockStartMs = new Date(slotTime).getTime();
      sessionStorage.setItem(SESSION_KEY, String(wallClockStartMs));
    } else {
      wallClockStartMs = Date.now();
      sessionStorage.setItem(SESSION_KEY, String(wallClockStartMs));
    }

    const getLiveWall = (duration: number): number => {
      const elapsed = (Date.now() - wallClockStartMs) / 1000;
      return Math.min(Math.max(0, elapsed), duration);
    };

    // Late join: seek to initial position once metadata is loaded
    if (initialTime && initialTime > 0) {
      player.on('loadedmetadata', () => {
        setAdjusting(true);
        player.currentTime(initialTime);
        isAdjustingTime = false;
      });
    }

    // DVR seek limiting for livestream mode
    if (livestreamMode) {
      player.on('seeking', () => {
        if (isAdjustingTime) return;
        const duration = player.duration() ?? 0;
        if (duration <= 0) return;
        const seekTarget = player.currentTime() ?? 0;
        const liveWall = getLiveWall(duration);
        if (seekTarget > liveWall + 0.5) {
          setAdjusting(true);
          player.currentTime(liveWall);
          isAdjustingTime = false;
        }
      });

    }

    // Keyboard handling
    player.on('keydown', (e: KeyboardEvent) => {
      if (livestreamMode) {
        // Block all seek keys — real livestreams have no rewind or fast-forward
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      // Replay mode: no key blocking at all
    });

    player.on('ready', () => {
      emitEvent('ready', player);
      onPlayerReady?.(player);

      // Disable Picture-in-Picture in livestream mode — browser PiP shows
      // native controls (progress bar + total duration) that expose pre-recorded video
      if (livestreamMode) {
        const videoEl = player.tech({ IWillNotUseThisInPlugins: true })?.el() as HTMLVideoElement | undefined;
        if (videoEl) {
          videoEl.disablePictureInPicture = true;
        }
        // Hide Video.js PiP button if present
        const pipButton = (player as any).controlBar?.getChild('pictureInPictureToggle');
        if (pipButton) {
          pipButton.hide();
        }
      }

      // Inject red LIVE pill into control bar (livestream mode only)
      if (livestreamMode) {
        const controlBar = (player as any).controlBar;
        if (controlBar) {
          const livePill = document.createElement('div');
          livePill.className = 'vjs-live-pill';
          livePill.innerHTML = '<span class="vjs-live-dot"></span> LIVE';
          // Insert after currentTimeDisplay
          const currentTimeEl = controlBar.getChild('currentTimeDisplay')?.el();
          if (currentTimeEl?.nextSibling) {
            controlBar.el().insertBefore(livePill, currentTimeEl.nextSibling);
          } else {
            controlBar.el().appendChild(livePill);
          }

          // Custom fullscreen button — fullscreens the wrapper div, not <video>
          const fsBtn = document.createElement('button');
          fsBtn.className = 'vjs-custom-fullscreen-btn vjs-control vjs-button';
          fsBtn.setAttribute('type', 'button');
          fsBtn.setAttribute('aria-label', '全屏');
          fsBtn.innerHTML = FULLSCREEN_EXPAND_SVG;
          controlBar.el().appendChild(fsBtn);

          const wrapper = wrapperRef.current;

          const updateFsIcon = (active: boolean) => {
            fsBtn.innerHTML = active ? FULLSCREEN_COMPRESS_SVG : FULLSCREEN_EXPAND_SVG;
            setIsFullscreen(active);
          };

          const exitCssFullscreen = () => {
            wrapper?.classList.remove('vjs-css-fullscreen');
            updateFsIcon(false);
            try { screen.orientation.unlock(); } catch { /* unsupported */ }
          };

          const enterFullscreen = async () => {
            if (!wrapper) return;
            try {
              await wrapper.requestFullscreen();
              try { await (screen.orientation as any).lock('landscape'); } catch { /* unsupported on iOS */ }
            } catch {
              // Fullscreen API failed (older iOS) — CSS fallback
              wrapper.classList.add('vjs-css-fullscreen');
              updateFsIcon(true);
              try { await (screen.orientation as any).lock('landscape'); } catch { /* unsupported */ }
              // Push history state so back button exits fullscreen instead of navigating
              history.pushState({ cssFullscreen: true }, '');
            }
          };

          const exitFullscreen = async () => {
            if (document.fullscreenElement) {
              await document.exitFullscreen();
            } else {
              exitCssFullscreen();
            }
          };

          fsBtn.addEventListener('click', () => {
            const isFs = !!document.fullscreenElement || wrapper?.classList.contains('vjs-css-fullscreen');
            if (isFs) {
              exitFullscreen();
            } else {
              enterFullscreen();
            }
          });

          // Sync state when exiting fullscreen via native gesture (e.g., Android back, Escape)
          const onFsChange = () => {
            const active = !!document.fullscreenElement;
            updateFsIcon(active);
            if (!active) {
              try { screen.orientation.unlock(); } catch { /* unsupported */ }
            }
          };
          document.addEventListener('fullscreenchange', onFsChange);

          // Exit CSS fullscreen on back button
          const onPopState = (e: PopStateEvent) => {
            if (wrapper?.classList.contains('vjs-css-fullscreen')) {
              e.preventDefault();
              exitCssFullscreen();
            }
          };
          window.addEventListener('popstate', onPopState);

          // Store cleanup refs on the player for disposal
          (player as any).__fsCleanup = () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            window.removeEventListener('popstate', onPopState);
            // Exit fullscreen if player is disposed while fullscreen
            if (document.fullscreenElement === wrapper) {
              document.exitFullscreen().catch(() => {});
            }
            exitCssFullscreen();
          };
        }
      }
    });
    player.on('play', () => emitEvent('play', player));
    player.on('pause', () => {
      emitEvent('pause', player);
    });
    player.on('ended', () => emitEvent('ended', player));

    player.on('timeupdate', () => {
      const current = player.currentTime() ?? 0;
      if (Math.abs(current - lastReportedTime.current) >= TIMEUPDATE_EMIT_INTERVAL_SEC) {
        lastReportedTime.current = current;
        emitEvent('timeupdate', player);
      }
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        // Clean up fullscreen event listeners
        (playerRef.current as any).__fsCleanup?.();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, autoPlay, emitEvent, initialTime, livestreamMode, onPlayerReady, slotTime]);

  return (
    <div
      ref={wrapperRef}
      className={`video-player-wrapper ${livestreamMode ? 'livestream-mode' : ''}`}
      onContextMenu={livestreamMode ? (e) => e.preventDefault() : undefined}
    >
      <div ref={videoRef} data-vjs-player />
      <style jsx>{`
        .video-player-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        .video-player-wrapper :global(.video-js) {
          width: 100%;
          height: 100%;
        }
        .video-player-wrapper :global(.vjs-current-time) {
          display: block !important;
          padding: 0 4px;
        }
        .video-player-wrapper :global(.vjs-duration),
        .video-player-wrapper :global(.vjs-time-divider) {
          display: block !important;
          padding: 0 4px;
        }
        /* Livestream mode: hide duration and divider */
        .video-player-wrapper.livestream-mode :global(.vjs-duration),
        .video-player-wrapper.livestream-mode :global(.vjs-time-divider) {
          display: none !important;
        }
        /* LIVE pill in control bar */
        .video-player-wrapper :global(.vjs-live-pill) {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #cc0000;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: 8px;
          line-height: 1;
          align-self: center;
          cursor: default;
          user-select: none;
        }
        .video-player-wrapper :global(.vjs-live-dot) {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          animation: live-pulse 1.5s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        /* Custom fullscreen button in control bar */
        .video-player-wrapper :global(.vjs-custom-fullscreen-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          color: #fff;
          padding: 6px;
          margin-left: auto;
          opacity: 0.85;
          transition: opacity 0.15s;
        }
        .video-player-wrapper :global(.vjs-custom-fullscreen-btn:hover) {
          opacity: 1;
        }
        /* CSS fullscreen fallback (older iOS that lacks Fullscreen API on divs) */
        .video-player-wrapper:global(.vjs-css-fullscreen) {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          border-radius: 0 !important;
          width: 100% !important;
          height: 100% !important;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left);
          background: #000 !important;
        }
        .video-player-wrapper:global(.vjs-css-fullscreen) :global(.video-js) {
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
