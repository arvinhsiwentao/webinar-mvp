'use client';

import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { isYouTubeUrl, getVideoSourceType } from '@/lib/utils';

const SEEK_FORWARD_TOLERANCE_SEC = 2;
const SEEK_REWIND_TOLERANCE_SEC = 1;
const TIMEUPDATE_EMIT_INTERVAL_SEC = 0.1;
const BLOCKED_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

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
}

export default function VideoPlayer({
  src,
  autoPlay = false,
  onPlaybackEvent,
  initialTime,
  livestreamMode = false,
  onPlayerReady,
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

    const isYT = isYouTubeUrl(src);
    const sourceType = getVideoSourceType(src);

    const playerOptions: Record<string, unknown> = {
      controls: !livestreamMode,
      autoplay: livestreamMode ? 'muted' : autoPlay,
      preload: 'auto',
      fluid: true,
      playbackRates: [], // no speed options
      controlBar: {
        progressControl: false, // disable seeking via progress bar
        remainingTimeDisplay: false,
        playbackRateMenuButton: false,
      },
      sources: [{ src, type: sourceType }],
    };

    if (livestreamMode) {
      playerOptions.muted = true;
    }

    if (isYT) {
      playerOptions.techOrder = ['youtube'];
      playerOptions.youtube = {
        ytControls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
      };
    }

    const player = videojs(videoElement, playerOptions);
    playerRef.current = player;

    player.on('keydown', (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    let allowedTime = initialTime && initialTime > 0 ? initialTime : 0;
    let isAdjustingTime = false; // reentrancy guard — prevents stack overflow

    // Late join: seek to initial position once metadata is loaded
    if (initialTime && initialTime > 0) {
      player.on('loadedmetadata', () => {
        isAdjustingTime = true;
        player.currentTime(initialTime);
        isAdjustingTime = false;
      });
    }

    player.on('timeupdate', () => {
      if (isAdjustingTime) return;

      const current = player.currentTime() ?? 0;
      if (current > allowedTime + SEEK_FORWARD_TOLERANCE_SEC) {
        isAdjustingTime = true;
        player.currentTime(allowedTime);
        isAdjustingTime = false;
      } else if (current > allowedTime) {
        allowedTime = current;
      }
      if (current < allowedTime - SEEK_REWIND_TOLERANCE_SEC) {
        isAdjustingTime = true;
        player.currentTime(allowedTime);
        isAdjustingTime = false;
      }
    });

    player.on('ready', () => {
      emitEvent('ready', player);
      onPlayerReady?.(player);
    });
    player.on('play', () => emitEvent('play', player));
    player.on('pause', () => emitEvent('pause', player));
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
  }, [src, autoPlay, emitEvent, initialTime, livestreamMode, onPlayerReady]);

  return (
    <div className={`video-player-wrapper ${livestreamMode ? 'livestream-mode' : ''}`}>
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
        .video-player-wrapper :global(.vjs-progress-control) {
          display: none !important;
        }
        .video-player-wrapper :global(.vjs-current-time),
        .video-player-wrapper :global(.vjs-duration) {
          display: block !important;
          padding: 0 4px;
        }
        .video-player-wrapper :global(.vjs-time-divider) {
          display: block !important;
        }
        .video-player-wrapper.livestream-mode :global(.vjs-big-play-button) {
          display: none !important;
        }
        .video-player-wrapper.livestream-mode :global(.vjs-control-bar) {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
