'use client';

import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import { getVideoSourceType } from '@/lib/utils';

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
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastReportedTime = useRef(-1);

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
    videoRef.current.appendChild(videoElement);

    const sourceType = getVideoSourceType(src);

    const playerOptions: Record<string, unknown> = {
      controls: true,
      autoplay: livestreamMode ? 'any' : autoPlay,
      preload: 'auto',
      fluid: true,
      playbackRates: [], // no speed options
      controlBar: {
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

      // Update live-wall CSS variable
      player.on('timeupdate', () => {
        if (isAdjustingTime) return;
        const duration = player.duration() ?? 0;
        if (duration <= 0) return;
        const liveWall = getLiveWall(duration);
        const pct = (liveWall / duration) * 100;
        const el = player.el();
        if (el) {
          (el as HTMLElement).style.setProperty('--live-wall-pct', `${pct}%`);
        }
      });
    }

    // Keyboard handling
    player.on('keydown', (e: KeyboardEvent) => {
      if (livestreamMode) {
        const current = player.currentTime() ?? 0;
        const duration = player.duration() ?? 0;
        const liveWall = getLiveWall(duration);

        if (e.key === 'ArrowRight') {
          const target = current + 5;
          if (target > liveWall) {
            e.preventDefault();
            e.stopPropagation();
            if (current < liveWall - 1) {
              setAdjusting(true);
              player.currentTime(liveWall);
              isAdjustingTime = false;
            }
          }
        } else if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          e.stopPropagation();
        }
        // Space and ArrowLeft are allowed (default Video.js behavior)
      }
      // Replay mode: no key blocking at all
    });

    player.on('ready', () => {
      emitEvent('ready', player);
      onPlayerReady?.(player);

      // SeekBar mouse override for livestream mode
      if (livestreamMode) {
        const seekBar = (player as any).controlBar?.progressControl?.seekBar;
        if (seekBar) {
          const originalHandleMouseMove = seekBar.handleMouseMove.bind(seekBar);
          seekBar.handleMouseMove = function(event: MouseEvent) {
            const duration = player.duration() ?? 0;
            if (duration <= 0) return originalHandleMouseMove(event);
            const liveWall = getLiveWall(duration);
            const rect = (this.el() as HTMLElement).getBoundingClientRect();
            const x = event.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, x / rect.width));
            const targetTime = fraction * duration;
            if (targetTime > liveWall) {
              setAdjusting(true);
              player.currentTime(liveWall);
              isAdjustingTime = false;
              return;
            }
            return originalHandleMouseMove(event);
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
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, autoPlay, emitEvent, initialTime, livestreamMode, onPlayerReady, slotTime]);

  return (
    <div
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
        .video-player-wrapper :global(.vjs-current-time),
        .video-player-wrapper :global(.vjs-duration) {
          display: block !important;
          padding: 0 4px;
        }
        .video-player-wrapper :global(.vjs-time-divider) {
          display: block !important;
        }
        /* Live wall: dark overlay beyond live wall position */
        .video-player-wrapper.livestream-mode :global(.vjs-progress-holder)::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: var(--live-wall-pct, 100%);
          right: 0;
          background: rgba(0, 0, 0, 0.5);
          pointer-events: none;
          z-index: 1;
        }
        /* Gold accent for played portion */
        .video-player-wrapper.livestream-mode :global(.vjs-play-progress) {
          background: #B8953F !important;
        }
        /* Live wall marker line */
        .video-player-wrapper.livestream-mode :global(.vjs-progress-holder)::before {
          content: '';
          position: absolute;
          top: -2px;
          bottom: -2px;
          left: var(--live-wall-pct, 100%);
          width: 2px;
          background: #B8953F;
          z-index: 2;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
